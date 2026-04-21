import type { SelectedLineRange } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/react";
import {
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";
import { ReviewFileDiffBlock } from "#/components/pulls/review/review-file-diff-block";
import type {
	ActiveCommentForm,
	PendingComment,
} from "#/components/pulls/review/review-types";
import { encodeFileId } from "#/components/pulls/review/review-utils";
import type { PullFile, PullReviewComment } from "#/lib/github.types";

const INITIAL_VISIBLE_COUNT = 12;
const LOAD_MORE_CHUNK = 12;
const SCROLL_TARGET_BUFFER = 6;
const EMPTY_ANNOTATIONS: DiffLineAnnotation<PullReviewComment>[] = [];
const EMPTY_PENDING_COMMENTS: PendingComment[] = [];
const EMPTY_REPLIES = new Map<number, PullReviewComment[]>();
const NOOP_COMMENT_FORM: ActiveCommentForm | null = null;
// Hoist noop callbacks to module scope so their identity is stable across
// renders. Inline arrow props bust ReviewFileDiffBlock's memo on every render.
const noopStartComment = (_filename: string, _range: SelectedLineRange) => {};
const noopCancel = () => {};
const noopAdd = (_comment: PendingComment) => {};
const noopEdit = (_original: PendingComment, _newBody: string) => {};

export type CommitDiffPaneHandle = {
	scrollToFile: (filename: string) => void;
};

type CommitDiffPaneProps = {
	files: PullFile[];
	diffStyle: "unified" | "split";
	onActiveFileChange: (filename: string) => void;
};

export const CommitDiffPane = memo(
	forwardRef<CommitDiffPaneHandle, CommitDiffPaneProps>(function CommitDiffPane(
		{ files, diffStyle, onActiveFileChange },
		ref,
	) {
		const diffPanelRef = useRef<HTMLDivElement>(null);
		const loadMoreRef = useRef<HTMLDivElement>(null);
		const [visibleCount, setVisibleCount] = useState(() =>
			Math.min(files.length, INITIAL_VISIBLE_COUNT),
		);
		const [scrollTarget, setScrollTarget] = useState<string | null>(null);

		useEffect(() => {
			setVisibleCount((previous) =>
				Math.min(
					files.length,
					Math.max(files.length === 0 ? 0 : INITIAL_VISIBLE_COUNT, previous),
				),
			);
		}, [files.length]);

		const revealFile = useCallback(
			(filename: string) => {
				const targetIndex = files.findIndex(
					(file) => file.filename === filename,
				);
				if (targetIndex === -1) {
					setScrollTarget(filename);
					return;
				}

				setScrollTarget(filename);
				setVisibleCount((previous) =>
					Math.min(
						files.length,
						Math.max(previous, targetIndex + 1 + SCROLL_TARGET_BUFFER),
					),
				);
			},
			[files],
		);

		const handleHash = useCallback(() => {
			if (typeof window === "undefined") return;

			const hash = window.location.hash.slice(1);
			if (!hash) return;

			setScrollTarget(hash);
		}, []);

		useImperativeHandle(
			ref,
			() => ({
				scrollToFile: revealFile,
			}),
			[revealFile],
		);

		useEffect(() => {
			handleHash();
			window.addEventListener("hashchange", handleHash);

			return () => window.removeEventListener("hashchange", handleHash);
		}, [handleHash]);

		useEffect(() => {
			if (!scrollTarget) return;

			const targetIndex = files.findIndex(
				(file) =>
					file.filename === scrollTarget ||
					encodeFileId(file.filename) === scrollTarget,
			);

			if (targetIndex !== -1) {
				const needed = targetIndex + 1 + SCROLL_TARGET_BUFFER;
				if (needed > visibleCount) {
					setVisibleCount(Math.min(files.length, needed));
					return;
				}
			}

			const frameId = requestAnimationFrame(() => {
				const encodedId = encodeFileId(scrollTarget);
				const element =
					document.getElementById(encodedId) ??
					document.getElementById(scrollTarget);
				if (!element) {
					setScrollTarget(null);
					return;
				}

				element.scrollIntoView({ block: "start" });
				const filename = element.getAttribute("data-filename");
				if (filename) {
					onActiveFileChange(filename);
					const hash = `#${encodeFileId(filename)}`;
					if (window.location.hash !== hash) {
						history.replaceState(null, "", hash);
					}
				}
				setScrollTarget(null);
			});
			return () => cancelAnimationFrame(frameId);
		}, [files, onActiveFileChange, scrollTarget, visibleCount]);

		useEffect(() => {
			const panel = diffPanelRef.current;
			const sentinel = loadMoreRef.current;
			if (!panel || !sentinel || visibleCount >= files.length) {
				return;
			}

			const observer = new IntersectionObserver(
				(entries) => {
					if (!entries[0]?.isIntersecting) return;

					if (visibleCount < files.length) {
						setVisibleCount((previous) =>
							Math.min(files.length, previous + LOAD_MORE_CHUNK),
						);
					}
				},
				{
					root: panel,
					rootMargin: "3000px 0px",
					threshold: 0,
				},
			);

			observer.observe(sentinel);
			return () => observer.disconnect();
		}, [files.length, visibleCount]);

		const visibleFiles = useMemo(
			() => files.slice(0, visibleCount),
			[files, visibleCount],
		);

		// Same observer-stability pattern as ReviewDiffPane: observers live in
		// refs so they survive state updates; otherwise listing the state they
		// write in the effect's deps tears them down on every scroll tick and
		// opens a race where files that scroll into view are never re-observed.
		const nearViewportRef = useRef<Set<string>>(new Set());
		const [, bumpNearViewport] = useReducer((n: number) => n + 1, 0);
		const nearViewportObserverRef = useRef<IntersectionObserver | null>(null);
		const activeFileObserverRef = useRef<IntersectionObserver | null>(null);
		const onActiveFileChangeRef = useRef(onActiveFileChange);

		useEffect(() => {
			onActiveFileChangeRef.current = onActiveFileChange;
		}, [onActiveFileChange]);

		useEffect(() => {
			const panel = diffPanelRef.current;
			if (!panel) return;

			const nearObserver = new IntersectionObserver(
				(entries) => {
					let changed = false;
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;
						const filename = entry.target.getAttribute("data-filename");
						if (filename && !nearViewportRef.current.has(filename)) {
							nearViewportRef.current.add(filename);
							nearObserver.unobserve(entry.target);
							changed = true;
						}
					}
					if (changed) bumpNearViewport();
				},
				{
					root: panel,
					rootMargin: "1500px 0px",
					threshold: 0,
				},
			);

			const activeObserver = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;
						const filename = entry.target.getAttribute("data-filename");
						if (filename) onActiveFileChangeRef.current(filename);
					}
				},
				{
					root: panel,
					rootMargin: "-10% 0px -80% 0px",
					threshold: 0,
				},
			);

			nearViewportObserverRef.current = nearObserver;
			activeFileObserverRef.current = activeObserver;

			return () => {
				nearObserver.disconnect();
				activeObserver.disconnect();
				nearViewportObserverRef.current = null;
				activeFileObserverRef.current = null;
			};
		}, []);

		useEffect(() => {
			if (visibleFiles.length === 0 || nearViewportRef.current.size > 0) {
				return;
			}
			for (const file of visibleFiles.slice(0, 4)) {
				nearViewportRef.current.add(file.filename);
			}
			bumpNearViewport();
		}, [visibleFiles]);

		useEffect(() => {
			const nearObserver = nearViewportObserverRef.current;
			const activeObserver = activeFileObserverRef.current;
			if (!nearObserver || !activeObserver) return;

			for (const file of visibleFiles) {
				const element = document.getElementById(encodeFileId(file.filename));
				if (!element) continue;
				activeObserver.observe(element);
				if (!nearViewportRef.current.has(file.filename)) {
					nearObserver.observe(element);
				}
			}
		}, [visibleFiles]);

		if (files.length === 0) {
			return (
				<div className="flex h-full items-center justify-center py-20 text-sm text-muted-foreground">
					No files changed in this commit.
				</div>
			);
		}

		return (
			<div ref={diffPanelRef} className="h-full overflow-auto">
				<div className="flex flex-col gap-4 p-4">
					{visibleFiles.map((file) => (
						<ReviewFileDiffBlock
							key={file.filename}
							readOnly
							id={encodeFileId(file.filename)}
							file={file}
							diffStyle={diffStyle}
							isNearViewport={nearViewportRef.current.has(file.filename)}
							annotations={EMPTY_ANNOTATIONS}
							repliesByCommentId={EMPTY_REPLIES}
							owner=""
							repo=""
							pullNumber={0}
							pendingComments={EMPTY_PENDING_COMMENTS}
							activeCommentForm={NOOP_COMMENT_FORM}
							selectedLines={null}
							onGutterClick={noopStartComment}
							onCancelComment={noopCancel}
							onAddComment={noopAdd}
							onEditComment={noopEdit}
						/>
					))}

					{visibleCount < files.length && (
						<div ref={loadMoreRef} className="h-8" />
					)}
				</div>
			</div>
		);
	}),
);

CommitDiffPane.displayName = "CommitDiffPane";
