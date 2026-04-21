import { GitCompareIcon, GitPullRequestIcon } from "@diffkit/icons";
import { Link } from "@tanstack/react-router";
import type { CompareDetail } from "#/lib/github.functions";

export function CompareHeader({
	owner,
	repo,
	base,
	head,
	compare,
}: {
	owner: string;
	repo: string;
	base: string;
	head: string;
	compare: CompareDetail;
}) {
	const { aheadBy, behindBy, status } = compare;
	const canPr = aheadBy > 0;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Link
					to="/$owner/$repo"
					params={{ owner, repo }}
					className="transition-colors hover:text-foreground"
				>
					{owner}/{repo}
				</Link>
				<span>/</span>
				<span>Compare</span>
			</div>

			<div className="flex items-center gap-3">
				<div className="shrink-0 text-primary">
					<GitPullRequestIcon size={20} strokeWidth={2} />
				</div>
				<h1 className="text-xl font-semibold tracking-tight">
					Open a pull request
				</h1>
			</div>

			<div className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-1 px-4 py-2.5 text-sm">
				<GitCompareIcon
					size={15}
					strokeWidth={2}
					className="shrink-0 text-muted-foreground"
				/>
				<span className="text-muted-foreground">base:</span>
				<code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
					{base}
				</code>
				<span className="text-muted-foreground">←</span>
				<span className="text-muted-foreground">compare:</span>
				<code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
					{head}
				</code>
				<span className="ml-auto flex items-center gap-3 text-muted-foreground">
					{canPr ? (
						<span className="flex items-center gap-1">
							<span className="tabular-nums font-medium text-foreground">
								{aheadBy}
							</span>
							{aheadBy === 1 ? "commit" : "commits"} ahead
						</span>
					) : null}
					{aheadBy > 0 && behindBy > 0 ? (
						<span className="text-muted-foreground/50">·</span>
					) : null}
					{behindBy > 0 ? (
						<span className="flex items-center gap-1">
							<span className="tabular-nums font-medium text-foreground">
								{behindBy}
							</span>
							{behindBy === 1 ? "commit" : "commits"} behind
						</span>
					) : null}
					{status === "identical" ? <span>Branches are identical</span> : null}
				</span>
			</div>
		</div>
	);
}
