import { RequestError } from "octokit";

function stringifyGitHubApiMessage(data: unknown): string {
	if (!data || typeof data !== "object") {
		return "";
	}

	const record = data as Record<string, unknown>;
	const message = record.message;
	return typeof message === "string" ? message : "";
}

export function compactGitHubErrorMessage(error: RequestError): string {
	const bodyMessage = stringifyGitHubApiMessage(error.response?.data);
	return `${error.message} ${bodyMessage}`.trim();
}

/**
 * GitHub returns 401 "Bad credentials" (and related OAuth errors) when the
 * GitHub App user-to-server token, OAuth client credentials, or JWT/app key
 * material no longer matches what GitHub expects — including after permission
 * changes that require the account owner to approve the installation again.
 */
export function shouldReauthorizeGitHubApp(error: unknown): boolean {
	if (error instanceof RequestError) {
		const status = error.status;
		const combined = compactGitHubErrorMessage(error).toLowerCase();

		if (status === 401) {
			return true;
		}

		if (status === 403) {
			// Keep resource-scope 403s on the existing "configure access" path.
			if (combined.includes("not accessible by integration")) {
				return false;
			}

			if (
				combined.includes("suspended") ||
				combined.includes("new permissions") ||
				combined.includes("additional permissions") ||
				combined.includes("must be granted") ||
				(combined.includes("permission") && combined.includes("pending"))
			) {
				return true;
			}
		}

		if (
			status === 422 &&
			combined.includes("installation") &&
			(combined.includes("suspend") || combined.includes("permission"))
		) {
			return true;
		}
	}

	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (message.includes("bad credentials")) {
			return true;
		}

		if (message.includes("docs.github.com/rest")) {
			return true;
		}

		if (message.includes("github app user token request failed")) {
			if (
				message.includes("incorrect_client_credentials") ||
				message.includes("bad_refresh_token") ||
				message.includes("invalid_grant") ||
				message.includes("refresh_token") ||
				message.includes("expired")
			) {
				return true;
			}
		}
	}

	return false;
}
