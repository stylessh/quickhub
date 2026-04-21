import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { ComparePage } from "#/components/compare/compare-page";
import {
	githubCompareDetailQueryOptions,
	githubRepoOverviewQueryOptions,
	githubViewerQueryOptions,
} from "#/lib/github.query";
import { parseCompareRef } from "#/lib/parse-repo-ref";
import { buildSeo, formatPageTitle } from "#/lib/seo";

type CompareSearch = {
	expand?: 1;
};

export const Route = createFileRoute("/_protected/$owner/$repo/compare/$")({
	ssr: false,
	validateSearch: (search: Record<string, unknown>): CompareSearch => ({
		expand: search.expand === 1 || search.expand === "1" ? 1 : undefined,
	}),
	loader: ({ context, params }) => {
		const splat = params._splat ?? "";
		const parsed = parseCompareRef(splat);
		if (!parsed) {
			throw redirect({
				to: "/$owner/$repo",
				params: { owner: params.owner, repo: params.repo },
			});
		}

		const scope = { userId: context.user.id };
		void context.queryClient.prefetchQuery(
			githubRepoOverviewQueryOptions(scope, {
				owner: params.owner,
				repo: params.repo,
			}),
		);
		void context.queryClient.prefetchQuery(githubViewerQueryOptions(scope));
		void context.queryClient.prefetchQuery(
			githubCompareDetailQueryOptions(scope, {
				owner: params.owner,
				repo: params.repo,
				base: parsed.base,
				head: parsed.head,
			}),
		);

		return parsed;
	},
	head: ({ match, params }) =>
		buildSeo({
			path: match.pathname,
			title: formatPageTitle(
				match.loaderData
					? `Compare ${match.loaderData.base}...${match.loaderData.head} — ${params.owner}/${params.repo}`
					: `Compare — ${params.owner}/${params.repo}`,
			),
			description: `Compare changes and open a pull request in ${params.owner}/${params.repo}.`,
			robots: "noindex",
		}),
	component: CompareRoute,
});

function CompareRoute() {
	const { user } = Route.useRouteContext();
	const { owner, repo } = Route.useParams();
	const { base, head } = Route.useLoaderData();
	const { expand } = Route.useSearch();
	const scope = useMemo(() => ({ userId: user.id }), [user.id]);

	return (
		<ComparePage
			owner={owner}
			repo={repo}
			base={base}
			head={head}
			scope={scope}
			showForm={expand === 1}
		/>
	);
}
