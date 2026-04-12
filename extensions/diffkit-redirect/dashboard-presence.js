/**
 * Runs on DiffKit web app origins so the site can detect the extension via DOM
 * (`data-diffkit-extension` on <html>). Content scripts cannot share `window`
 * with the page, but DOM attributes are visible to the app.
 */
(function markDiffKitExtensionPresent() {
  try {
    document.documentElement.dataset.diffkitExtension = "1";
  } catch {
    // ignore
  }
})();
