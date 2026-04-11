import { getRequest } from "@tanstack/react-start/server";
import type { Octokit as OctokitType } from "octokit";

const GITHUB_READ_RETRY_COUNT = 1;
export const GITHUB_REQUEST_TIMEOUT_MS = 12_000;

type GitHubRequestOptions = Parameters<
	OctokitType["hook"]["before"]
>[1] extends (options: infer Options) => unknown
	? Options & {
			method?: string;
			request?: {
				retries?: number;
				signal?: AbortSignal;
			};
		}
	: never;

function isSafeGitHubRetryMethod(method: string | undefined) {
	return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

function createGitHubRequestTimeoutSignal(
	requestSignal: AbortSignal | undefined,
) {
	const timeoutSignal = AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS);
	if (!requestSignal) {
		return timeoutSignal;
	}

	return AbortSignal.any([requestSignal, timeoutSignal]);
}

/**
 * Returns the incoming HTTP request's abort signal when available.
 * When the client navigates away the signal fires, letting us cancel
 * in-flight GitHub requests instead of running them to completion.
 */
function getIncomingRequestSignal(): AbortSignal | undefined {
	try {
		return getRequest().signal;
	} catch {
		return undefined;
	}
}

export function configureGitHubRequestPolicies(octokit: OctokitType) {
	octokit.hook.before("request", (options: GitHubRequestOptions) => {
		const requestOptions = options.request ?? {};
		options.request = requestOptions;
		requestOptions.retries = isSafeGitHubRetryMethod(options.method)
			? GITHUB_READ_RETRY_COUNT
			: 0;
		requestOptions.signal ??= createGitHubRequestTimeoutSignal(
			getIncomingRequestSignal(),
		);
	});
}
