import { IssuesIcon } from "@diffkit/icons";
import { Markdown } from "@diffkit/ui/components/markdown";
import { cn } from "@diffkit/ui/lib/utils";
import { DetailPageTitle } from "#/components/details/detail-page";
import { formatRelativeTime } from "#/lib/format-relative-time";
import type { IssueDetail } from "#/lib/github.types";

type IssueStateConfig = {
	color: string;
	label: string;
	badgeClass: string;
};

export function getIssueStateConfig(issue: IssueDetail): IssueStateConfig {
	if (issue.state === "closed") {
		if (issue.stateReason === "not_planned") {
			return {
				color: "text-muted-foreground",
				label: "Closed",
				badgeClass: "bg-muted text-muted-foreground",
			};
		}
		return {
			color: "text-purple-500",
			label: "Closed",
			badgeClass: "bg-purple-500/10 text-purple-500",
		};
	}
	return {
		color: "text-green-500",
		label: "Open",
		badgeClass: "bg-green-500/10 text-green-500",
	};
}

export function IssueDetailHeader({
	owner,
	repo,
	issue,
}: {
	owner: string;
	repo: string;
	issue: IssueDetail;
}) {
	const stateConfig = getIssueStateConfig(issue);

	return (
		<>
			<DetailPageTitle
				collectionHref="/issues"
				collectionLabel="Issues"
				owner={owner}
				repo={repo}
				number={issue.number}
				icon={IssuesIcon}
				iconClassName={stateConfig.color}
				title={issue.title}
				subtitle={
					<div className="flex flex-wrap items-center gap-2">
						<span
							className={cn(
								"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
								stateConfig.badgeClass,
							)}
						>
							{stateConfig.label}
						</span>
						{issue.author && (
							<span className="flex items-center gap-1.5 text-sm text-muted-foreground">
								<img
									src={issue.author.avatarUrl}
									alt={issue.author.login}
									className="size-4 rounded-full border border-border"
								/>
								<span className="font-medium text-foreground">
									{issue.author.login}
								</span>
								<span>opened {formatRelativeTime(issue.createdAt)}</span>
							</span>
						)}
					</div>
				}
			/>

			{issue.body ? (
				<div className="rounded-lg border bg-surface-0 p-5">
					<Markdown>{issue.body}</Markdown>
				</div>
			) : (
				<div className="rounded-lg border bg-surface-0 p-5">
					<p className="text-sm italic text-muted-foreground">
						No description provided.
					</p>
				</div>
			)}
		</>
	);
}
