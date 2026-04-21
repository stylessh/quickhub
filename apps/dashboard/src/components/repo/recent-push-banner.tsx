import { GitBranchIcon, GitPullRequestIcon } from "@diffkit/icons";
import {
	Callout,
	CalloutAction,
	CalloutContent,
} from "@diffkit/ui/components/callout";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { formatRelativeTime } from "#/lib/format-relative-time";
import {
	type GitHubQueryScope,
	githubQueryKeys,
	githubRecentPushableBranchQueryOptions,
} from "#/lib/github.query";
import { githubRevalidationSignalKeys } from "#/lib/github-revalidation";
import { useGitHubSignalStream } from "#/lib/use-github-signal-stream";

export function RecentPushBanner({
	owner,
	repo,
	scope,
	defaultBranch,
}: {
	owner: string;
	repo: string;
	scope: GitHubQueryScope;
	defaultBranch: string;
}) {
	const recentQuery = useQuery(
		githubRecentPushableBranchQueryOptions(scope, { owner, repo }),
	);

	const webhookRefreshTargets = useMemo(
		() => [
			{
				queryKey: githubQueryKeys.repo.recentPushableBranch(scope, {
					owner,
					repo,
				}),
				signalKeys: [
					githubRevalidationSignalKeys.repoCode({ owner, repo }),
					githubRevalidationSignalKeys.repoMeta({ owner, repo }),
				],
			},
		],
		[owner, repo, scope],
	);
	useGitHubSignalStream(webhookRefreshTargets);

	const recent = recentQuery.data;
	if (!recent) return null;

	const createPrUrl = `/${owner}/${repo}/compare/${defaultBranch}...${recent.branch}?expand=1`;

	return (
		<Callout variant="warning">
			<CalloutContent>
				<GitBranchIcon size={15} strokeWidth={2} />
				<span className="font-medium">{recent.branch}</span>
				<span className="text-yellow-600/80 dark:text-yellow-400/80">
					had recent pushes {formatRelativeTime(recent.pushedAt)}
				</span>
			</CalloutContent>
			<CalloutAction>
				<a
					href={createPrUrl}
					className="inline-flex items-center gap-1.5 rounded-md bg-yellow-400 px-3 py-1 text-xs font-medium text-neutral-900 transition-colors hover:bg-yellow-400/90 dark:bg-yellow-500 dark:text-neutral-950 dark:hover:bg-yellow-500/90"
				>
					<GitPullRequestIcon size={13} strokeWidth={2} />
					Compare & pull request
				</a>
			</CalloutAction>
		</Callout>
	);
}
