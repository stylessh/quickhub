import type { RepoBranch } from "#/lib/github.types";

/**
 * Parse a compare splat like "main...feature" or "main...org:feature"
 * into { base, head }. Returns null when the format is invalid.
 */
export function parseCompareRef(
	splat: string,
): { base: string; head: string } | null {
	if (!splat) return null;
	const sep = splat.indexOf("...");
	if (sep <= 0 || sep >= splat.length - 3) return null;
	const base = splat.slice(0, sep);
	const head = splat.slice(sep + 3);
	if (!base || !head) return null;
	return { base, head };
}

/**
 * Parse a splat string like "main/src/lib/foo.ts" into { ref, path }.
 *
 * Strategy:
 * 1. If branches are available, find the longest branch name that matches a prefix.
 * 2. Otherwise, check if defaultBranch is a prefix.
 * 3. Fallback: treat the first segment as the ref.
 */
export function parseRepoRef(
	splat: string,
	options: {
		branches?: RepoBranch[];
		defaultBranch?: string;
	} = {},
): { ref: string; path: string } {
	if (!splat) {
		return { ref: options.defaultBranch ?? "main", path: "" };
	}

	const { branches, defaultBranch } = options;

	// Try matching against known branches (longest match first)
	if (branches && branches.length > 0) {
		const sortedBranches = [...branches].sort(
			(a, b) => b.name.length - a.name.length,
		);
		for (const branch of sortedBranches) {
			if (splat === branch.name) {
				return { ref: branch.name, path: "" };
			}
			if (splat.startsWith(`${branch.name}/`)) {
				return {
					ref: branch.name,
					path: splat.slice(branch.name.length + 1),
				};
			}
		}
	}

	// Try default branch
	if (defaultBranch) {
		if (splat === defaultBranch) {
			return { ref: defaultBranch, path: "" };
		}
		if (splat.startsWith(`${defaultBranch}/`)) {
			return {
				ref: defaultBranch,
				path: splat.slice(defaultBranch.length + 1),
			};
		}
	}

	// Fallback: first segment is the ref
	const slashIndex = splat.indexOf("/");
	if (slashIndex === -1) {
		return { ref: splat, path: "" };
	}
	return {
		ref: splat.slice(0, slashIndex),
		path: splat.slice(slashIndex + 1),
	};
}
