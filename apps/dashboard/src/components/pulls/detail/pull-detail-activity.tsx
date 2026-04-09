import { GitCommitIcon } from "@diffkit/icons";
import { Markdown } from "@diffkit/ui/components/markdown";
import { Skeleton } from "@diffkit/ui/components/skeleton";
import { cn } from "@diffkit/ui/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	DetailActivityHeader,
	DetailCommentBox,
} from "#/components/details/detail-activity";
import { formatRelativeTime } from "#/lib/format-relative-time";
import { updatePullBranch } from "#/lib/github.functions";
import type {
	PullComment,
	PullCommit,
	PullDetail,
	PullStatus,
} from "#/lib/github.types";

export function PullDetailActivitySection({
	comments,
	commits,
	isFetching,
	status,
	pr,
	owner,
	repo,
	pullNumber,
}: {
	comments?: PullComment[];
	commits?: PullCommit[];
	isFetching: boolean;
	status: PullStatus | null;
	pr: PullDetail;
	owner: string;
	repo: string;
	pullNumber: number;
}) {
	return (
		<div className="flex flex-col">
			<DetailActivityHeader
				title="Activity"
				count={
					comments && commits ? comments.length + commits.length : undefined
				}
			/>

			{isFetching && !comments && (
				<div className="flex items-center justify-center py-8">
					<svg
						className="size-4 animate-spin text-muted-foreground"
						viewBox="0 0 16 16"
						fill="none"
						aria-hidden="true"
					>
						<circle
							cx="8"
							cy="8"
							r="6.5"
							stroke="currentColor"
							strokeWidth="2"
							opacity="0.25"
						/>
						<path
							d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						/>
					</svg>
				</div>
			)}

			{comments && commits && comments.length === 0 && commits.length === 0 && (
				<p className="py-4 text-sm text-muted-foreground">No activity yet.</p>
			)}

			<ActivityTimeline comments={comments ?? []} commits={commits ?? []} />

			{!pr.isMerged && pr.state !== "closed" && (
				<div className="mt-6">
					{status ? (
						<MergeStatusCard
							status={status}
							owner={owner}
							repo={repo}
							pullNumber={pullNumber}
						/>
					) : (
						<MergeStatusSkeleton />
					)}
				</div>
			)}

			<div className="mt-6">
				<DetailCommentBox />
			</div>
		</div>
	);
}

function MergeStatusCard({
	status,
	owner,
	repo,
	pullNumber,
}: {
	status: PullStatus;
	owner: string;
	repo: string;
	pullNumber: number;
}) {
	const {
		checks,
		reviews,
		mergeable,
		mergeableState,
		behindBy,
		baseRefName,
		canUpdateBranch,
	} = status;
	const [isUpdating, setIsUpdating] = useState(false);

	const approvedReviews = reviews.filter(
		(review) => review.state === "APPROVED",
	);
	const changesRequested = reviews.filter(
		(review) => review.state === "CHANGES_REQUESTED",
	);
	const pendingReviewers = reviews.filter(
		(review) => review.state === "PENDING",
	);

	const hasReviewIssue =
		changesRequested.length > 0 || pendingReviewers.length > 0;
	const allChecksPassed =
		checks.total > 0 && checks.failed === 0 && checks.pending === 0;
	const hasCheckFailures = checks.failed > 0;
	const hasChecksPending = checks.pending > 0;
	const isBehind = behindBy !== null && behindBy > 0;
	const isMergeBlocked = mergeableState === "blocked" || mergeable === false;

	return (
		<div className="flex flex-col rounded-lg border">
			<StatusRow
				icon={
					changesRequested.length > 0 ? (
						<StatusDot color="text-red-500" />
					) : approvedReviews.length > 0 && !hasReviewIssue ? (
						<StatusDot color="text-green-500" />
					) : (
						<StatusDot color="text-yellow-500" />
					)
				}
				title={
					changesRequested.length > 0
						? "Changes requested"
						: approvedReviews.length > 0
							? `${approvedReviews.length} approving review${approvedReviews.length > 1 ? "s" : ""}`
							: "Review required"
				}
				description={
					changesRequested.length > 0
						? `${changesRequested.map((review) => review.author?.login).join(", ")} requested changes`
						: approvedReviews.length > 0 && !hasReviewIssue
							? "All required reviews have been provided"
							: "Code owner review required by reviewers with write access."
				}
			/>

			{checks.total > 0 && (
				<StatusRow
					icon={
						allChecksPassed ? (
							<StatusDot color="text-green-500" />
						) : hasCheckFailures ? (
							<StatusDot color="text-red-500" />
						) : (
							<StatusDot color="text-yellow-500" />
						)
					}
					title={
						allChecksPassed
							? "All checks have passed"
							: hasCheckFailures
								? `${checks.failed} failing check${checks.failed > 1 ? "s" : ""}`
								: `${checks.pending} pending check${checks.pending > 1 ? "s" : ""}`
					}
					description={
						`${checks.skipped > 0 ? `${checks.skipped} skipped, ` : ""}${checks.passed} successful check${checks.passed !== 1 ? "s" : ""}` +
						(hasChecksPending ? `, ${checks.pending} pending` : "") +
						(hasCheckFailures ? `, ${checks.failed} failing` : "")
					}
				/>
			)}

			{isBehind && (
				<StatusRow
					icon={<StatusDot color="text-yellow-500" />}
					title="This branch is out-of-date with the base branch"
					description={`Merge the latest changes from ${baseRefName} into this branch.`}
					action={
						canUpdateBranch ? (
							<UpdateBranchButton
								owner={owner}
								repo={repo}
								pullNumber={pullNumber}
								isUpdating={isUpdating}
								setIsUpdating={setIsUpdating}
							/>
						) : undefined
					}
				/>
			)}

			<StatusRow
				icon={
					isMergeBlocked ? (
						<StatusDot color="text-yellow-500" />
					) : (
						<StatusDot color="text-green-500" />
					)
				}
				title={isMergeBlocked ? "Merging is blocked" : "Ready to merge"}
				description={
					isMergeBlocked
						? "All required conditions have not been met."
						: "All required conditions have been satisfied."
				}
				isLast
			/>
		</div>
	);
}

function StatusRow({
	icon,
	title,
	description,
	action,
	isLast,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	action?: React.ReactNode;
	isLast?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-start gap-3 px-4 py-3",
				!isLast && "border-b border-border/50",
			)}
		>
			<div className="mt-0.5 shrink-0">{icon}</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<p className="text-sm font-medium">{title}</p>
				<p className="text-xs text-muted-foreground">{description}</p>
			</div>
			{action && <div className="shrink-0">{action}</div>}
		</div>
	);
}

function StatusDot({ color }: { color: string }) {
	return (
		<div className={cn("flex size-4 items-center justify-center", color)}>
			<div className="size-2 rounded-full bg-current" />
		</div>
	);
}

function MergeStatusSkeleton() {
	return (
		<div className="flex flex-col rounded-lg border">
			{[0, 1, 2].map((item) => (
				<div
					key={item}
					className={cn(
						"flex items-start gap-3 px-4 py-3",
						item < 2 && "border-b border-border/50",
					)}
				>
					<Skeleton className="mt-0.5 size-4 rounded-full" />
					<div className="flex flex-1 flex-col gap-1.5">
						<Skeleton className="h-3.5 w-48" />
						<Skeleton className="h-3 w-72" />
					</div>
				</div>
			))}
		</div>
	);
}

function UpdateBranchButton({
	owner,
	repo,
	pullNumber,
	isUpdating,
	setIsUpdating,
}: {
	owner: string;
	repo: string;
	pullNumber: number;
	isUpdating: boolean;
	setIsUpdating: (value: boolean) => void;
}) {
	const queryClient = useQueryClient();

	const handleUpdate = async () => {
		setIsUpdating(true);
		try {
			const success = await updatePullBranch({
				data: { owner, repo, pullNumber },
			});
			if (success) {
				await queryClient.invalidateQueries({
					queryKey: ["github"],
				});
			}
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<button
			type="button"
			disabled={isUpdating}
			onClick={() => {
				void handleUpdate();
			}}
			className="rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground disabled:opacity-50"
		>
			{isUpdating ? "Updating…" : "Update branch"}
		</button>
	);
}

type TimelineItem =
	| { type: "comment"; date: string; data: PullComment }
	| { type: "commit"; date: string; data: PullCommit };

function ActivityTimeline({
	comments,
	commits,
}: {
	comments: PullComment[];
	commits: PullCommit[];
}) {
	const items: TimelineItem[] = [
		...comments.map((comment) => ({
			type: "comment" as const,
			date: comment.createdAt,
			data: comment,
		})),
		...commits.map((commit) => ({
			type: "commit" as const,
			date: commit.createdAt,
			data: commit,
		})),
	].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	if (items.length === 0) return null;

	return (
		<div className="relative flex flex-col pl-8 before:absolute before:left-4 before:top-0 before:h-full before:w-px before:bg-[linear-gradient(to_bottom,var(--color-border)_80%,transparent)]">
			{items.map((item, index) => {
				const previousType = index > 0 ? items[index - 1].type : null;
				const nextType =
					index < items.length - 1 ? items[index + 1].type : null;
				const isConsecutiveCommit =
					item.type === "commit" && previousType === "commit";
				const isLastInCommitRun =
					item.type === "commit" && nextType !== "commit";

				if (item.type === "comment") {
					const comment = item.data;
					return (
						<div
							key={`comment-${comment.id}`}
							className={cn("flex flex-col gap-1 py-5", index === 0 && "pt-5")}
						>
							<div className="flex items-center gap-1.5">
								{comment.author ? (
									<img
										src={comment.author.avatarUrl}
										alt={comment.author.login}
										className="size-4 rounded-full border border-border"
									/>
								) : (
									<div className="size-4 rounded-full bg-surface-2" />
								)}
								<span className="text-xs font-medium">
									{comment.author?.login ?? "Unknown"}
								</span>
								<span className="text-xs text-muted-foreground">
									{formatRelativeTime(comment.createdAt)}
								</span>
							</div>
							<Markdown className="text-muted-foreground">
								{comment.body}
							</Markdown>
						</div>
					);
				}

				const commit = item.data;
				const firstLine = commit.message.split("\n")[0];
				return (
					<div
						key={`commit-${commit.sha}`}
						className={cn(
							"flex items-center gap-1.5",
							index === 0 ? "pt-5" : isConsecutiveCommit ? "pt-2" : "pt-5",
							isLastInCommitRun ? "pb-5" : "pb-2",
						)}
					>
						<div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface-1">
							<GitCommitIcon
								size={12}
								strokeWidth={2}
								className="text-muted-foreground"
							/>
						</div>
						{commit.author ? (
							<img
								src={commit.author.avatarUrl}
								alt={commit.author.login}
								className="size-5 shrink-0 rounded-full border border-border"
							/>
						) : (
							<div className="size-5 shrink-0 rounded-full bg-surface-2" />
						)}
						<span className="min-w-0 truncate text-sm">{firstLine}</span>
						<code className="ml-auto shrink-0 rounded bg-surface-1 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
							{commit.sha.slice(0, 7)}
						</code>
						<span className="shrink-0 text-xs text-muted-foreground">
							{formatRelativeTime(commit.createdAt)}
						</span>
					</div>
				);
			})}
		</div>
	);
}
