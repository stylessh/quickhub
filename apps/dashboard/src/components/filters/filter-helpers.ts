import { FolderLibraryIcon, UserCircleIcon } from "@diffkit/icons";
import { createElement } from "react";
import type {
	FilterableItem,
	FilterDefinition,
	FilterOption,
} from "./use-list-filters";

/**
 * Build a sorted list of unique repository options from a list of items.
 */
export function extractRepoOptions(items: FilterableItem[]): FilterOption[] {
	const repos = new Map<string, string>();
	for (const item of items) {
		const name = item.repository.fullName;
		if (!repos.has(name)) repos.set(name, name);
	}
	return [...repos.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([value, label]) => ({ value, label }));
}

/**
 * Build a sorted list of unique author options (with avatar icons) from a
 * list of items. Items without an author are ignored.
 */
export function extractAuthorOptions(items: FilterableItem[]): FilterOption[] {
	const authors = new Map<string, { login: string; avatarUrl: string }>();
	for (const item of items) {
		if (item.author && !authors.has(item.author.login)) {
			authors.set(item.author.login, item.author);
		}
	}
	return [...authors.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([login, author]) => ({
			value: login,
			label: login,
			icon: createElement("img", {
				src: author.avatarUrl,
				alt: login,
				className: "size-4 rounded-full",
			}),
		}));
}

/** Reusable repository filter definition (for global/cross-repo lists). */
export const repoFilterDef: FilterDefinition = {
	id: "repo",
	label: "Repository",
	icon: FolderLibraryIcon,
	extractOptions: extractRepoOptions,
	match: (item, values) => values.has(item.repository.fullName),
};

/** Reusable author filter definition. */
export const authorFilterDef: FilterDefinition = {
	id: "author",
	label: "Author",
	icon: UserCircleIcon,
	extractOptions: extractAuthorOptions,
	match: (item, values) =>
		item.author ? values.has(item.author.login) : false,
};
