/** Hide the install chip for 30 days after dismiss; then show again if extension still missing. */
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

const STORAGE_KEY_AT = "diffkit-extension-prompt-dismissed-at";
/** Legacy boolean dismiss — migrated on read */
const LEGACY_STORAGE_KEY = "diffkit-extension-prompt-dismissed";

function readDismissedAtMs(): number | null {
	try {
		const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
		if (legacy === "1") {
			localStorage.removeItem(LEGACY_STORAGE_KEY);
			return null;
		}

		const raw = localStorage.getItem(STORAGE_KEY_AT);
		if (!raw) {
			return null;
		}
		const n = Number(raw);
		if (!Number.isFinite(n) || n <= 0) {
			return null;
		}
		return n;
	} catch {
		return null;
	}
}

/**
 * Whether to show the “install extension” prompt.
 * When extension is present, never show.
 * When dismissed, hide until 30 days after that timestamp.
 */
export function shouldShowExtensionInstallPrompt(
	isExtensionPresent: boolean,
): boolean {
	if (isExtensionPresent) {
		return false;
	}
	const dismissedAt = readDismissedAtMs();
	if (dismissedAt === null) {
		return true;
	}
	return Date.now() - dismissedAt >= COOLDOWN_MS;
}

export function recordExtensionInstallPromptDismissed(): void {
	try {
		localStorage.setItem(STORAGE_KEY_AT, String(Date.now()));
		localStorage.removeItem(LEGACY_STORAGE_KEY);
	} catch {
		// ignore
	}
}
