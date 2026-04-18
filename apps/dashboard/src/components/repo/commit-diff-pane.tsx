import type { SelectedLineRange } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/react";
import {
	forwardRef,
	memo,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
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

		useEffect(() => {
			const panel = diffPanelRef.current;
			if (!panel || visibleFiles.length === 0) return;

			const observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;

						const filename = entry.target.getAttribute("data-filename");
						if (filename) {
							onActiveFileChange(filename);
						}
					}
				},
				{
					root: panel,
					rootMargin: "-10% 0px -80% 0px",
					threshold: 0,
				},
			);

			for (const file of visibleFiles) {
				const element = document.getElementById(encodeFileId(file.filename));
				if (element) observer.observe(element);
			}

			return () => observer.disconnect();
		}, [onActiveFileChange, visibleFiles]);

		const [nearViewportFiles, setNearViewportFiles] = useState<Set<string>>(
			() => new Set(),
		);

		useEffect(() => {
			if (visibleFiles.length === 0 || nearViewportFiles.size > 0) return;
			setNearViewportFiles(
				new Set(visibleFiles.slice(0, 4).map((f) => f.filename)),
			);
		}, [visibleFiles, nearViewportFiles.size]);

		useEffect(() => {
			const panel = diffPanelRef.current;
			if (!panel || visibleFiles.length === 0) return;

			const observer = new IntersectionObserver(
				(entries) => {
					const newlyVisible: string[] = [];
					for (const entry of entries) {
						if (!entry.isIntersecting) continue;
						const filename = entry.target.getAttribute("data-filename");
						if (filename) {
							newlyVisible.push(filename);
							observer.unobserve(entry.target);
						}
					}
					if (newlyVisible.length > 0) {
						setNearViewportFiles((prev) => {
							const next = new Set(prev);
							for (const f of newlyVisible) next.add(f);
							return next;
						});
					}
				},
				{
					root: panel,
					rootMargin: "1500px 0px",
					threshold: 0,
				},
			);

			for (const file of visibleFiles) {
				if (nearViewportFiles.has(file.filename)) continue;
				const element = document.getElementById(encodeFileId(file.filename));
				if (element) observer.observe(element);
			}

			return () => observer.disconnect();
		}, [visibleFiles, nearViewportFiles]);

		if (files.length === 0) {
			return (
				<div className="flex h-full items-center justify-center py-20 text-sm text-muted-foreground">
					No files changed in this commit.
				</div>
			);
		}

		const noopStartComment = (
			_filename: string,
			_range: SelectedLineRange,
		) => {};
		const noopCancel = () => {};
		const noopAdd = (_comment: PendingComment) => {};
		const noopEdit = (_original: PendingComment, _newBody: string) => {};

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
							isNearViewport={nearViewportFiles.has(file.filename)}
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
