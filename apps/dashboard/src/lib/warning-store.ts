import { useSyncExternalStore } from "react";

export interface WarningAction {
	label: string;
	href: string;
}

export interface Warning {
	id: string;
	message: string;
	dismissible?: boolean;
	action?: WarningAction;
}

let warnings: Warning[] = [];
const listeners = new Set<() => void>();

function emitChange() {
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function getSnapshot() {
	return warnings;
}

export function addWarning(warning: Warning) {
	if (warnings.some((w) => w.id === warning.id)) return;
	warnings = [...warnings, warning];
	emitChange();
}

export function removeWarning(id: string) {
	warnings = warnings.filter((w) => w.id !== id);
	emitChange();
}

export function useWarnings() {
	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Check a MutationResult for permission errors and surface a warning.
 * Call this client-side after a mutation returns.
 */
export function checkPermissionWarning(
	result: { ok: boolean; error?: string; installUrl?: string },
	repo: string,
) {
	if (
		!result.ok &&
		result.error &&
		result.error.includes("Insufficient permissions")
	) {
		addWarning({
			id: `permissions:${repo}`,
			message: `Your GitHub App may not have sufficient permissions for ${repo}.`,
			dismissible: true,
			action: result.installUrl
				? {
						label: "Configure access",
						href: result.installUrl,
					}
				: undefined,
		});
	}
}
