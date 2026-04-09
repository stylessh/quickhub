import { Markdown } from "@diffkit/ui/components/markdown";
import { cn } from "@diffkit/ui/lib/utils";
import {
	DetailActivityHeader,
	DetailCommentBox,
} from "#/components/details/detail-activity";
import { formatRelativeTime } from "#/lib/format-relative-time";
import type { IssueComment } from "#/lib/github.types";

export function IssueDetailActivitySection({
	comments,
	isFetching,
}: {
	comments?: IssueComment[];
	isFetching: boolean;
}) {
	return (
		<div className="flex flex-col">
			<DetailActivityHeader title="Activity" count={comments?.length} />

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

			{comments && comments.length === 0 && (
				<p className="py-4 text-sm text-muted-foreground">No comments yet.</p>
			)}

			{comments && comments.length > 0 && (
				<div className="relative flex flex-col pl-8 before:absolute before:left-4 before:top-0 before:h-full before:w-px before:bg-[linear-gradient(to_bottom,var(--color-border)_80%,transparent)]">
					{comments.map((comment, index) => (
						<div
							key={comment.id}
							className={cn("flex flex-col gap-1 py-4", index === 0 && "pt-5")}
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
					))}
				</div>
			)}

			<div className="mt-6">
				<DetailCommentBox />
			</div>
		</div>
	);
}
