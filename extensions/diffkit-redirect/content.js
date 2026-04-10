(async function runRedirect() {
  const shared = globalThis.DiffKitRedirect;
  if (!shared) {
    return;
  }

  try {
    const config = await shared.getConfig();
    if (!config.enabled) {
      return;
    }

    const redirect = shared.findRedirect(window.location.href, config.rules);
    if (!redirect) {
      return;
    }

    window.location.replace(redirect.targetUrl);
  } catch (error) {
    console.error("DiffKit: failed to evaluate redirect.", error);
  }
})();
