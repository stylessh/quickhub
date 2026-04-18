import { createFileRoute } from "@tanstack/react-router";
import { CommitPage } from "#/components/repo/commit-page";
import { githubRepoCommitQueryOptions } from "#/lib/github.query";
import { buildSeo, formatPageTitle } from "#/lib/seo";

export const Route = createFileRoute("/_protected/$owner/$repo/commit/$sha")({
	ssr: false,
	loader: ({ context, params }) => {
		const scope = { userId: context.user.id };
		const input = { owner: params.owner, repo: params.repo, sha: params.sha };
		void context.queryClient.prefetchQuery(
			githubRepoCommitQueryOptions(scope, input),
		);
		return {};
	},
	head: ({ match, params }) =>
		buildSeo({
			path: match.pathname,
			title: formatPageTitle(
				`Commit ${params.sha.slice(0, 7)} · ${params.owner}/${params.repo}`,
			),
			description: `View commit ${params.sha} in ${params.owner}/${params.repo}.`,
			robots: "noindex",
		}),
	component: CommitPage,
});
