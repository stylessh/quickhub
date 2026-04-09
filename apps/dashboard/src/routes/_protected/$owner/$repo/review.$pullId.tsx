import { createFileRoute } from "@tanstack/react-router";
import { ReviewPage } from "#/components/pulls/review/review-page";
import {
	githubPullFilesQueryOptions,
	githubPullPageQueryOptions,
	githubPullReviewCommentsQueryOptions,
} from "#/lib/github.query";
import { buildSeo, formatPageTitle, summarizeText } from "#/lib/seo";

export const Route = createFileRoute("/_protected/$owner/$repo/review/$pullId")(
	{
		loader: async ({ context, params }) => {
			const pullNumber = Number(params.pullId);
			const scope = { userId: context.user.id };
			const input = { owner: params.owner, repo: params.repo, pullNumber };
			const pageOptions = githubPullPageQueryOptions(scope, input);
			const filesOptions = githubPullFilesQueryOptions(scope, input);
			const commentsOptions = githubPullReviewCommentsQueryOptions(
				scope,
				input,
			);

			const pageData =
				context.queryClient.getQueryData(pageOptions.queryKey) ??
				(await context.queryClient.ensureQueryData(pageOptions));

			if (
				context.queryClient.getQueryData(filesOptions.queryKey) === undefined
			) {
				await context.queryClient.ensureQueryData(filesOptions);
			}

			if (
				context.queryClient.getQueryData(commentsOptions.queryKey) === undefined
			) {
				await context.queryClient.ensureQueryData(commentsOptions);
			}

			return pageData;
		},
		head: ({ loaderData, match, params }) => {
			const pull = loaderData?.detail;
			const title = pull
				? formatPageTitle(`Review PR #${pull.number}: ${pull.title}`)
				: formatPageTitle(`Review PR #${params.pullId}`);

			return buildSeo({
				path: match.pathname,
				title,
				description: pull
					? summarizeText(
							pull.body,
							`Private code review workspace for pull request #${pull.number} in ${params.owner}/${params.repo}.`,
						)
					: `Private code review workspace for pull request #${params.pullId} in ${params.owner}/${params.repo}.`,
				robots: "noindex",
			});
		},
		component: ReviewPage,
	},
);
