import { GitCommitIcon } from "@diffkit/icons";
import { cn } from "@diffkit/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const commitsLinkClassName =
	"-my-1 -mr-1 flex items-center gap-1 rounded-md px-2 py-1.5 font-medium text-foreground transition-colors hover:bg-surface-2";

export function buildCommitsLinkSplat(currentRef: string, path?: string) {
	return path ? `${currentRef}/${path}` : currentRef;
}

export function CommitsLink({
	owner,
	repo,
	currentRef,
	path,
	children = "History",
	"aria-label": ariaLabel = "View commits",
	className,
}: {
	owner: string;
	repo: string;
	currentRef: string;
	path?: string;
	children?: ReactNode;
	"aria-label"?: string;
	className?: string;
}) {
	return (
		<Link
			to="/$owner/$repo/commits/$"
			params={{
				owner,
				repo,
				_splat: buildCommitsLinkSplat(currentRef, path),
			}}
			aria-label={ariaLabel}
			className={cn(commitsLinkClassName, className)}
		>
			<GitCommitIcon size={14} />
			<span className="hidden sm:inline">{children}</span>
		</Link>
	);
}
