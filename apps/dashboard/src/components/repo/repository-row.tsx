import { SquareLock02Icon, StarIcon, ViewIcon } from "@diffkit/icons";
import { Link } from "@tanstack/react-router";
import { Fragment, memo, type ReactNode } from "react";
import { RepoCommitSparkline } from "#/components/repo/repo-commit-sparkline";
import { formatRelativeTime } from "#/lib/format-relative-time";
import type { GitHubQueryScope } from "#/lib/github.query";
import type { UserRepoSummary } from "#/lib/github.types";

const languageColors: Record<string, string> = {
	Astro: "#ff5a03",
	CSS: "#563d7c",
	Go: "#00add8",
	HTML: "#e34c26",
	JavaScript: "#f1e05a",
	MDX: "#fcb32c",
	Python: "#3572a5",
	Rust: "#dea584",
	Shell: "#89e051",
	Swift: "#f05138",
	TypeScript: "#3178c6",
};

const visibilityAria: Record<UserRepoSummary["visibility"], string> = {
	public: "Public repository",
	private: "Private repository",
	internal: "Internal repository",
};

function VisibilityBadge({
	visibility,
}: {
	visibility: UserRepoSummary["visibility"];
}) {
	const label = visibilityAria[visibility];
	const Icon = visibility === "public" ? ViewIcon : SquareLock02Icon;

	return (
		<span
			role="img"
			className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted-foreground"
			aria-label={label}
			title={label}
		>
			<Icon size={14} strokeWidth={2} aria-hidden />
		</span>
	);
}

export const RepositoryRow = memo(function RepositoryRow({
	repo,
	scope,
}: {
	repo: UserRepoSummary;
	scope: GitHubQueryScope;
}) {
	const metaEntries: { key: string; node: ReactNode }[] = [];
	if (repo.language) {
		metaEntries.push({
			key: "lang",
			node: (
				<span className="flex shrink-0 items-center gap-1">
					<span
						className="inline-block size-2 shrink-0 rounded-full"
						style={{
							backgroundColor: languageColors[repo.language] ?? "var(--muted)",
						}}
					/>
					{repo.language}
				</span>
			),
		});
	}
	if (repo.updatedAt) {
		metaEntries.push({
			key: "time",
			node: (
				<span className="shrink-0">{formatRelativeTime(repo.updatedAt)}</span>
			),
		});
	}
	if (repo.stars > 0) {
		metaEntries.push({
			key: "stars",
			node: (
				<span className="flex shrink-0 items-center gap-1 tabular-nums">
					<StarIcon size={13} strokeWidth={2} />
					{formatCount(repo.stars)}
				</span>
			),
		});
	}

	return (
		<Link
			to="/$owner/$repo"
			params={{ owner: repo.owner, repo: repo.name }}
			className="grid w-full grid-cols-1 items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-surface-2 md:grid-cols-[minmax(10rem,22%)_minmax(0,1fr)_minmax(10rem,auto)_11rem] md:gap-y-1"
		>
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex min-w-0 max-w-full items-center gap-x-2">
					<p className="min-w-0 truncate text-sm font-medium">
						{repo.fullName}
					</p>
					<VisibilityBadge visibility={repo.visibility} />
				</div>
			</div>
			<div className="min-w-0">
				{repo.description ? (
					<p className="line-clamp-2 text-xs leading-snug break-words text-muted-foreground md:max-w-none">
						{repo.description}
					</p>
				) : (
					<span className="text-xs text-muted-foreground/40">—</span>
				)}
			</div>
			{metaEntries.length > 0 ? (
				<div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground md:justify-end">
					{metaEntries.map((entry, index) => (
						<Fragment key={entry.key}>
							{index > 0 ? (
								<span className="shrink-0 text-muted-foreground/60">·</span>
							) : null}
							{entry.node}
						</Fragment>
					))}
				</div>
			) : (
				<div className="md:text-right">
					<span className="text-xs text-muted-foreground/40">—</span>
				</div>
			)}
			<div className="flex items-start justify-end">
				<RepoCommitSparkline
					scope={scope}
					owner={repo.owner}
					repo={repo.name}
				/>
			</div>
		</Link>
	);
});

function formatCount(count: number): string {
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
	}
	return count.toString();
}
