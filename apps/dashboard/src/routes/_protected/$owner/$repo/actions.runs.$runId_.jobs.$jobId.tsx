import { createFileRoute } from "@tanstack/react-router";
import { WorkflowJobPage } from "#/components/workflows/workflow-job-page";
import {
	githubViewerQueryOptions,
	githubWorkflowJobLogsQueryOptions,
	githubWorkflowRunJobsQueryOptions,
	githubWorkflowRunQueryOptions,
} from "#/lib/github.query";
import { buildSeo, formatPageTitle } from "#/lib/seo";

export const Route = createFileRoute(
	"/_protected/$owner/$repo/actions/runs/$runId_/jobs/$jobId",
)({
	ssr: false,
	loader: ({ context, params }) => {
		const runId = Number(params.runId);
		const jobId = Number(params.jobId);
		const scope = { userId: context.user.id };
		const runInput = { owner: params.owner, repo: params.repo, runId };

		void context.queryClient.prefetchQuery(
			githubWorkflowRunQueryOptions(scope, runInput),
		);
		void context.queryClient.prefetchQuery(
			githubWorkflowRunJobsQueryOptions(scope, runInput),
		);
		void context.queryClient.prefetchQuery(
			githubWorkflowJobLogsQueryOptions(scope, {
				owner: params.owner,
				repo: params.repo,
				jobId,
			}),
		);
		void context.queryClient.prefetchQuery(githubViewerQueryOptions(scope));

		const jobsKey = githubWorkflowRunJobsQueryOptions(scope, runInput).queryKey;
		const cachedJobs = context.queryClient.getQueryData(jobsKey);
		const cachedJob = cachedJobs?.find((j) => j.id === jobId) ?? null;
		return {
			jobName: cachedJob?.name ?? null,
		};
	},
	head: ({ match, params }) =>
		buildSeo({
			path: match.pathname,
			title: formatPageTitle(
				match.loaderData?.jobName ?? `Job #${params.jobId}`,
			),
			description: `Workflow job #${params.jobId} in ${params.owner}/${params.repo}.`,
			robots: "noindex",
		}),
	component: WorkflowJobPage,
});
