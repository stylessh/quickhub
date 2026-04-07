import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getAuth } from "./auth";
import { getGitHubClient } from "./github";
import type {
	GitHubActor,
	GitHubLabel,
	IssueDetail,
	IssueSummary,
	MyIssuesResult,
	MyPullsResult,
	PullDetail,
	PullSummary,
	RepositoryRef,
	UserRepoSummary,
} from "./github.types";

type GitHubClient = Awaited<ReturnType<typeof getGitHubClient>>;
type SearchItem = Awaited<
	ReturnType<GitHubClient["rest"]["search"]["issuesAndPullRequests"]>
>["data"]["items"][number];
type AuthenticatedUserRepo = Awaited<
	ReturnType<GitHubClient["rest"]["repos"]["listForAuthenticatedUser"]>
>["data"][number];
type RepoPullDetail = Awaited<
	ReturnType<GitHubClient["rest"]["pulls"]["get"]>
>["data"];
type RepoIssueDetail = Awaited<
	ReturnType<GitHubClient["rest"]["issues"]["get"]>
>["data"];
type AuthenticatedUser = Awaited<
	ReturnType<GitHubClient["rest"]["users"]["getAuthenticated"]>
>["data"];

type RepoState = "all" | "closed" | "open";
type PullSort = "created" | "long-running" | "popularity" | "updated";
type IssueSort = "comments" | "created" | "updated";

type GitHubApiUser = {
	login?: string;
	avatar_url?: string;
	html_url?: string;
	type?: string;
};

type GitHubApiLabel = {
	name?: string | null;
	color?: string | null;
	description?: string | null;
};

type PullSearchRole =
	| "all"
	| "assigned"
	| "author"
	| "involved"
	| "mentioned"
	| "review-requested";

type IssueSearchRole = "all" | "assigned" | "author" | "mentioned";

type PullsFromUserInput = {
	username?: string;
	state?: RepoState;
	page?: number;
	perPage?: number;
	role?: PullSearchRole;
	owner?: string;
	repo?: string;
};

type IssuesFromUserInput = {
	username?: string;
	state?: RepoState;
	page?: number;
	perPage?: number;
	role?: IssueSearchRole;
	owner?: string;
	repo?: string;
};

type PullsFromRepoInput = {
	owner: string;
	repo: string;
	state?: RepoState;
	page?: number;
	perPage?: number;
	sort?: PullSort;
	direction?: "asc" | "desc";
};

type PullFromRepoInput = {
	owner: string;
	repo: string;
	pullNumber: number;
};

type IssuesFromRepoInput = {
	owner: string;
	repo: string;
	state?: RepoState;
	page?: number;
	perPage?: number;
	sort?: IssueSort;
	direction?: "asc" | "desc";
};

type IssueFromRepoInput = {
	owner: string;
	repo: string;
	issueNumber: number;
};

function clampPerPage(value: number | undefined, fallback = 30) {
	if (!Number.isFinite(value)) {
		return fallback;
	}

	return Math.min(Math.max(Math.trunc(value ?? fallback), 1), 100);
}

function clampPage(value: number | undefined) {
	if (!Number.isFinite(value)) {
		return 1;
	}

	return Math.max(Math.trunc(value ?? 1), 1);
}

function buildRepositoryRef(
	owner: string,
	repo: string,
	url?: string | null,
): RepositoryRef {
	return {
		name: repo,
		owner,
		fullName: `${owner}/${repo}`,
		url: url ?? `https://github.com/${owner}/${repo}`,
	};
}

function parseRepositoryRef(
	repositoryUrl?: string | null,
): RepositoryRef | null {
	if (!repositoryUrl) {
		return null;
	}

	const match = repositoryUrl.match(/repos\/([^/]+)\/([^/]+)$/);
	if (!match) {
		return null;
	}

	return buildRepositoryRef(
		match[1],
		match[2],
		`https://github.com/${match[1]}/${match[2]}`,
	);
}

function mapActor(user: GitHubApiUser | null | undefined): GitHubActor | null {
	if (!user?.login) {
		return null;
	}

	return {
		login: user.login,
		avatarUrl: user.avatar_url ?? "",
		url: user.html_url ?? `https://github.com/${user.login}`,
		type: user.type ?? "User",
	};
}

function mapLabel(
	label: string | GitHubApiLabel | null | undefined,
): GitHubLabel | null {
	if (!label || typeof label === "string" || !label.name) {
		return null;
	}

	return {
		name: label.name,
		color: label.color ?? "000000",
		description: label.description ?? null,
	};
}

function mapLabels(labels: Array<string | GitHubApiLabel> | null | undefined) {
	return (labels ?? [])
		.map((label) => mapLabel(label))
		.filter((label): label is GitHubLabel => Boolean(label));
}

function mapPullSummary(
	pull: {
		id: number;
		number: number;
		title: string;
		state: string;
		draft?: boolean | null;
		created_at: string;
		updated_at: string;
		closed_at: string | null;
		merged_at?: string | null;
		html_url: string;
		comments?: number;
		user?: GitHubApiUser | null;
		labels?: Array<string | GitHubApiLabel> | null;
	},
	repository: RepositoryRef,
): PullSummary {
	return {
		id: pull.id,
		number: pull.number,
		title: pull.title,
		state: pull.state,
		isDraft: "draft" in pull ? Boolean(pull.draft) : false,
		createdAt: pull.created_at,
		updatedAt: pull.updated_at,
		closedAt: pull.closed_at ?? null,
		mergedAt:
			"merged_at" in pull && typeof pull.merged_at === "string"
				? pull.merged_at
				: null,
		comments: pull.comments ?? 0,
		url: pull.html_url,
		author: mapActor(pull.user),
		labels: mapLabels(pull.labels),
		repository,
	};
}

function mapPullDetail(
	pull: RepoPullDetail,
	repository: RepositoryRef,
): PullDetail {
	return {
		...mapPullSummary(pull, repository),
		body: pull.body ?? "",
		additions: pull.additions,
		deletions: pull.deletions,
		changedFiles: pull.changed_files,
		commits: pull.commits,
		reviewComments: pull.review_comments,
		headRefName: pull.head.ref,
		headSha: pull.head.sha,
		baseRefName: pull.base.ref,
		isMerged: pull.merged,
		mergeable: pull.mergeable,
		mergeableState:
			typeof pull.mergeable_state === "string" ? pull.mergeable_state : null,
		requestedReviewers: (pull.requested_reviewers ?? [])
			.map((reviewer) => mapActor(reviewer))
			.filter((reviewer): reviewer is GitHubActor => Boolean(reviewer)),
	};
}

function mapIssueSummary(
	issue: {
		id: number;
		number: number;
		title: string;
		state: string;
		state_reason?: string | null;
		created_at: string;
		updated_at: string;
		closed_at: string | null;
		comments: number;
		html_url: string;
		user?: GitHubApiUser | null;
		labels?: Array<string | GitHubApiLabel> | null;
	},
	repository: RepositoryRef,
): IssueSummary {
	return {
		id: issue.id,
		number: issue.number,
		title: issue.title,
		state: issue.state,
		stateReason:
			"state_reason" in issue && typeof issue.state_reason === "string"
				? issue.state_reason
				: null,
		createdAt: issue.created_at,
		updatedAt: issue.updated_at,
		closedAt: issue.closed_at ?? null,
		comments: issue.comments,
		url: issue.html_url,
		author: mapActor(issue.user),
		labels: mapLabels(issue.labels),
		repository,
	};
}

function mapIssueDetail(
	issue: RepoIssueDetail,
	repository: RepositoryRef,
): IssueDetail {
	return {
		...mapIssueSummary(issue, repository),
		body: issue.body ?? "",
		assignees: (issue.assignees ?? [])
			.map((assignee) => mapActor(assignee))
			.filter((assignee): assignee is GitHubActor => Boolean(assignee)),
		milestone: issue.milestone
			? {
					title: issue.milestone.title,
					description: issue.milestone.description ?? null,
					dueOn: issue.milestone.due_on ?? null,
				}
			: null,
	};
}

async function getSession() {
	const request = getRequest();
	const auth = getAuth();
	return auth.api.getSession({ headers: request.headers });
}

async function getGitHubContext() {
	const session = await getSession();
	if (!session) {
		return null;
	}

	return {
		session,
		octokit: await getGitHubClient(session.user.id),
	};
}

async function getViewer(octokit: GitHubClient): Promise<AuthenticatedUser> {
	const { data } = await octokit.rest.users.getAuthenticated();
	return data;
}

async function resolveUsername(octokit: GitHubClient, username?: string) {
	if (username) {
		return username;
	}

	const viewer = await getViewer(octokit);
	return viewer.login;
}

function buildUserSearchQuery({
	itemType,
	role,
	state,
	username,
	owner,
	repo,
}: {
	itemType: "issue" | "pr";
	role: IssueSearchRole | PullSearchRole;
	state: RepoState;
	username: string;
	owner?: string;
	repo?: string;
}) {
	const stateFilter = state === "all" ? "" : ` is:${state}`;
	const scopeFilter = owner && repo ? ` repo:${owner}/${repo}` : "";
	const roleFilter =
		role === "all"
			? ` involves:${username}`
			: role === "assigned"
				? ` assignee:${username}`
				: role === "mentioned"
					? ` mentions:${username}`
					: role === "review-requested"
						? ` user-review-requested:${username}`
						: role === "involved"
							? ` involves:${username}`
							: ` author:${username}`;

	return `is:${itemType}${stateFilter}${scopeFilter}${roleFilter} archived:false`;
}

function identityValidator<TInput>(data: TInput) {
	return data;
}

export const getGitHubViewer = createServerFn({ method: "GET" }).handler(
	async () => {
		const context = await getGitHubContext();
		if (!context) {
			return null;
		}

		const viewer = await getViewer(context.octokit);

		return {
			id: viewer.id,
			login: viewer.login,
			name: viewer.name,
			avatarUrl: viewer.avatar_url,
			url: viewer.html_url,
		};
	},
);

export const getUserRepos = createServerFn({ method: "GET" }).handler(
	async (): Promise<UserRepoSummary[]> => {
		const context = await getGitHubContext();
		if (!context) {
			return [];
		}

		const { data } = await context.octokit.rest.repos.listForAuthenticatedUser({
			sort: "updated",
			per_page: 10,
		});

		return data.map(
			(repo: AuthenticatedUserRepo): UserRepoSummary => ({
				id: repo.id,
				name: repo.name,
				fullName: repo.full_name,
				description: repo.description,
				stars: repo.stargazers_count,
				language: repo.language,
				updatedAt: repo.updated_at,
				isPrivate: repo.private,
				url: repo.html_url,
				owner: repo.owner.login,
			}),
		);
	},
);

export const getMyPulls = createServerFn({ method: "GET" }).handler(
	async (): Promise<MyPullsResult> => {
		const context = await getGitHubContext();
		if (!context) {
			return {
				reviewRequested: [],
				assigned: [],
				authored: [],
				mentioned: [],
				involved: [],
			};
		}

		const viewer = await getViewer(context.octokit);
		const perPage = 30;

		const [reviewRequested, assigned, authored, mentioned, involved] =
			await Promise.all([
				context.octokit.rest.search.issuesAndPullRequests({
					q: buildUserSearchQuery({
						itemType: "pr",
						role: "review-requested",
						state: "open",
						username: viewer.login,
					}),
					per_page: perPage,
					sort: "updated",
					order: "desc",
				}),
				context.octokit.rest.search.issuesAndPullRequests({
					q: buildUserSearchQuery({
						itemType: "pr",
						role: "assigned",
						state: "open",
						username: viewer.login,
					}),
					per_page: perPage,
					sort: "updated",
					order: "desc",
				}),
				context.octokit.rest.search.issuesAndPullRequests({
					q: buildUserSearchQuery({
						itemType: "pr",
						role: "author",
						state: "open",
						username: viewer.login,
					}),
					per_page: perPage,
					sort: "updated",
					order: "desc",
				}),
				context.octokit.rest.search.issuesAndPullRequests({
					q: buildUserSearchQuery({
						itemType: "pr",
						role: "mentioned",
						state: "open",
						username: viewer.login,
					}),
					per_page: perPage,
					sort: "updated",
					order: "desc",
				}),
				context.octokit.rest.search.issuesAndPullRequests({
					q: buildUserSearchQuery({
						itemType: "pr",
						role: "involved",
						state: "open",
						username: viewer.login,
					}),
					per_page: perPage,
					sort: "updated",
					order: "desc",
				}),
			]);

		const mapItems = (items: SearchItem[]) =>
			items
				.map((item) => {
					const repository = parseRepositoryRef(item.repository_url);
					if (!repository) {
						return null;
					}

					return mapPullSummary(item, repository);
				})
				.filter((item): item is PullSummary => Boolean(item));

		return {
			reviewRequested: mapItems(reviewRequested.data.items),
			assigned: mapItems(assigned.data.items),
			authored: mapItems(authored.data.items),
			mentioned: mapItems(mentioned.data.items),
			involved: mapItems(involved.data.items),
		};
	},
);

export const getPullsFromUser = createServerFn({ method: "GET" })
	.inputValidator(identityValidator<PullsFromUserInput>)
	.handler(async ({ data }): Promise<PullSummary[]> => {
		const context = await getGitHubContext();
		if (!context) {
			return [];
		}

		const username = await resolveUsername(context.octokit, data.username);
		const { items } = (
			await context.octokit.rest.search.issuesAndPullRequests({
				q: buildUserSearchQuery({
					itemType: "pr",
					role: data.role ?? "author",
					state: data.state ?? "open",
					username,
					owner: data.owner,
					repo: data.repo,
				}),
				page: clampPage(data.page),
				per_page: clampPerPage(data.perPage),
				sort: "updated",
				order: "desc",
			})
		).data;

		return items
			.map((item) => {
				const repository = parseRepositoryRef(item.repository_url);
				if (!repository) {
					return null;
				}

				return mapPullSummary(item, repository);
			})
			.filter((item): item is PullSummary => Boolean(item));
	});

export const getPullsFromRepo = createServerFn({ method: "GET" })
	.inputValidator(identityValidator<PullsFromRepoInput>)
	.handler(async ({ data }): Promise<PullSummary[]> => {
		const context = await getGitHubContext();
		if (!context) {
			return [];
		}

		const repository = buildRepositoryRef(data.owner, data.repo);
		const { data: pulls } = await context.octokit.rest.pulls.list({
			owner: data.owner,
			repo: data.repo,
			state: data.state ?? "open",
			page: clampPage(data.page),
			per_page: clampPerPage(data.perPage),
			sort: data.sort ?? "updated",
			direction: data.direction ?? "desc",
		});

		return pulls.map((pull) => mapPullSummary(pull, repository));
	});

export const getPullFromRepo = createServerFn({ method: "GET" })
	.inputValidator(identityValidator<PullFromRepoInput>)
	.handler(async ({ data }): Promise<PullDetail | null> => {
		const context = await getGitHubContext();
		if (!context) {
			return null;
		}

		const { data: pull } = await context.octokit.rest.pulls.get({
			owner: data.owner,
			repo: data.repo,
			pull_number: data.pullNumber,
		});

		return mapPullDetail(pull, buildRepositoryRef(data.owner, data.repo));
	});

export const getMyIssues = createServerFn({ method: "GET" }).handler(
	async (): Promise<MyIssuesResult> => {
		const context = await getGitHubContext();
		if (!context) {
			return {
				assigned: [],
				authored: [],
				mentioned: [],
			};
		}

		const viewer = await getViewer(context.octokit);
		const perPage = 30;

		const [assigned, authored, mentioned] = await Promise.all([
			context.octokit.rest.search.issuesAndPullRequests({
				q: buildUserSearchQuery({
					itemType: "issue",
					role: "assigned",
					state: "open",
					username: viewer.login,
				}),
				per_page: perPage,
				sort: "updated",
				order: "desc",
			}),
			context.octokit.rest.search.issuesAndPullRequests({
				q: buildUserSearchQuery({
					itemType: "issue",
					role: "author",
					state: "open",
					username: viewer.login,
				}),
				per_page: perPage,
				sort: "updated",
				order: "desc",
			}),
			context.octokit.rest.search.issuesAndPullRequests({
				q: buildUserSearchQuery({
					itemType: "issue",
					role: "mentioned",
					state: "open",
					username: viewer.login,
				}),
				per_page: perPage,
				sort: "updated",
				order: "desc",
			}),
		]);

		const mapItems = (items: SearchItem[]) =>
			items
				.map((item) => {
					const repository = parseRepositoryRef(item.repository_url);
					if (!repository) {
						return null;
					}

					return mapIssueSummary(item, repository);
				})
				.filter((item): item is IssueSummary => Boolean(item));

		return {
			assigned: mapItems(assigned.data.items),
			authored: mapItems(authored.data.items),
			mentioned: mapItems(mentioned.data.items),
		};
	},
);

export const getIssuesFromUser = createServerFn({ method: "GET" })
	.inputValidator(identityValidator<IssuesFromUserInput>)
	.handler(async ({ data }): Promise<IssueSummary[]> => {
		const context = await getGitHubContext();
		if (!context) {
			return [];
		}

		const username = await resolveUsername(context.octokit, data.username);
		const { items } = (
			await context.octokit.rest.search.issuesAndPullRequests({
				q: buildUserSearchQuery({
					itemType: "issue",
					role: data.role ?? "author",
					state: data.state ?? "open",
					username,
					owner: data.owner,
					repo: data.repo,
				}),
				page: clampPage(data.page),
				per_page: clampPerPage(data.perPage),
				sort: "updated",
				order: "desc",
			})
		).data;

		return items
			.map((item) => {
				const repository = parseRepositoryRef(item.repository_url);
				if (!repository) {
					return null;
				}

				return mapIssueSummary(item, repository);
			})
			.filter((item): item is IssueSummary => Boolean(item));
	});

export const getIssuesFromRepo = createServerFn({ method: "GET" })
	.inputValidator(identityValidator<IssuesFromRepoInput>)
	.handler(async ({ data }): Promise<IssueSummary[]> => {
		const context = await getGitHubContext();
		if (!context) {
			return [];
		}

		const repository = buildRepositoryRef(data.owner, data.repo);
		const { data: issues } = await context.octokit.rest.issues.listForRepo({
			owner: data.owner,
			repo: data.repo,
			state: data.state ?? "open",
			page: clampPage(data.page),
			per_page: clampPerPage(data.perPage),
			sort: data.sort ?? "updated",
			direction: data.direction ?? "desc",
		});

		return issues
			.filter((issue) => !issue.pull_request)
			.map((issue) => mapIssueSummary(issue, repository));
	});

export const getIssueFromRepo = createServerFn({ method: "GET" })
	.inputValidator(identityValidator<IssueFromRepoInput>)
	.handler(async ({ data }): Promise<IssueDetail | null> => {
		const context = await getGitHubContext();
		if (!context) {
			return null;
		}

		const { data: issue } = await context.octokit.rest.issues.get({
			owner: data.owner,
			repo: data.repo,
			issue_number: data.issueNumber,
		});

		if (issue.pull_request) {
			return null;
		}

		return mapIssueDetail(issue, buildRepositoryRef(data.owner, data.repo));
	});
