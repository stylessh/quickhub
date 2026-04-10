(async function initOptions() {
  const shared = globalThis.DiffKitRedirect;
  const enabledToggle = document.getElementById("enabled-toggle");
  const rulesEditor = document.getElementById("rules-editor");
  const saveButton = document.getElementById("save-button");
  const resetButton = document.getElementById("reset-button");
  const saveStatus = document.getElementById("save-status");

  function setStatus(message, tone) {
    saveStatus.textContent = message;
    saveStatus.dataset.tone = tone || "";
  }

  async function loadConfig() {
    const config = await shared.getConfig();
    enabledToggle.checked = config.enabled;
    rulesEditor.value = JSON.stringify(config.rules, null, 2);

    if (config.validationErrors.length > 0) {
      setStatus(config.validationErrors.join(" "), "error");
      return;
    }

    setStatus("", "");
  }

  async function saveConfig() {
    let parsedRules;
    try {
      parsedRules = JSON.parse(rulesEditor.value);
    } catch {
      setStatus("Rules must be valid JSON.", "error");
      return;
    }

    const result = await shared.saveConfig({
      enabled: enabledToggle.checked,
      rules: parsedRules,
    });

    if (!result.ok) {
      setStatus(result.errors.join(" "), "error");
      return;
    }

    setStatus("Rules saved.", "success");
    await loadConfig();
  }

  saveButton.addEventListener("click", saveConfig);

  resetButton.addEventListener("click", () => {
    rulesEditor.value = JSON.stringify(shared.getDefaultRules(), null, 2);
    setStatus("Defaults restored in the editor. Save to apply them.", "");
  });

  await loadConfig();
})();
