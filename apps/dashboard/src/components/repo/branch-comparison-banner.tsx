import { GitCompareIcon, GitPullRequestIcon } from "@diffkit/icons";
import {
	Callout,
	CalloutAction,
	CalloutContent,
} from "@diffkit/ui/components/callout";
import { Skeleton } from "@diffkit/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	type GitHubQueryScope,
	githubBranchComparisonQueryOptions,
} from "#/lib/github.query";

export function BranchComparisonBanner({
	owner,
	repo,
	scope,
	currentBranch,
	defaultBranch,
}: {
	owner: string;
	repo: string;
	scope: GitHubQueryScope;
	currentBranch: string;
	defaultBranch: string;
}) {
	const comparisonQuery = useQuery({
		...githubBranchComparisonQueryOptions(scope, {
			owner,
			repo,
			base: defaultBranch,
			head: currentBranch,
		}),
		enabled: currentBranch !== defaultBranch,
	});

	if (comparisonQuery.isPending) {
		return (
			<Callout variant="default">
				<CalloutContent>
					<Skeleton className="h-4 w-64 rounded" />
				</CalloutContent>
			</Callout>
		);
	}

	const comparison = comparisonQuery.data;
	if (!comparison) return null;

	const { aheadBy, behindBy } = comparison;
	if (aheadBy === 0 && behindBy === 0) return null;

	const compareUrl = `/${owner}/${repo}/compare/${defaultBranch}...${currentBranch}`;
	const createPrUrl = `${compareUrl}?expand=1`;

	return (
		<Callout variant="default">
			<CalloutContent className="flex-wrap text-muted-foreground">
				<span>This branch is</span>
				{aheadBy > 0 && (
					<a
						href={compareUrl}
						className="font-medium text-primary hover:underline"
					>
						{aheadBy} {aheadBy === 1 ? "commit" : "commits"} ahead
					</a>
				)}
				{aheadBy > 0 && behindBy > 0 && <span>of and</span>}
				{aheadBy === 0 && behindBy > 0 && <span>of</span>}
				{behindBy > 0 && (
					<a
						href={compareUrl}
						className="font-medium text-primary hover:underline"
					>
						{behindBy} {behindBy === 1 ? "commit" : "commits"} behind
					</a>
				)}
				<code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
					{defaultBranch}
				</code>
				<span>.</span>
			</CalloutContent>
			<CalloutAction className="flex items-center gap-3">
				<a
					href={compareUrl}
					aria-label="Open compare view"
					className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
				>
					<GitCompareIcon size={14} />
				</a>
				{aheadBy > 0 && (
					<a
						href={createPrUrl}
						className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity hover:opacity-90"
					>
						<GitPullRequestIcon size={13} />
						Create pull request
					</a>
				)}
			</CalloutAction>
		</Callout>
	);
}
