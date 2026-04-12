/**
 * The DiffKit browser extension sets `data-diffkit-extension="1"` on `<html>` via
 * `extensions/diffkit-redirect/dashboard-presence.js` (content script on the
 * dashboard origin). Page JS cannot read the extension isolated world; DOM only.
 */
export function isDiffKitExtensionPresent(): boolean {
	if (typeof document === "undefined") {
		return false;
	}
	return document.documentElement.dataset.diffkitExtension === "1";
}
