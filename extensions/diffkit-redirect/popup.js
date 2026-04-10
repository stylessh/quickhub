(async function initPopup() {
  const shared = globalThis.DiffKitRedirect;
  const toggle = document.getElementById("enabled-toggle");
  const ruleList = document.getElementById("rule-list");
  const statusCopy = document.getElementById("status-copy");

  function getRuleLabel(rule) {
    if (rule.label) {
      return rule.label;
    }

    if (rule.description) {
      return rule.description;
    }

    return rule.id
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function getRuleDescription(rule) {
    if (rule.enabled) {
      return "Enabled";
    }

    return "Disabled";
  }

  function renderRuleList(config) {
    ruleList.textContent = "";

    if (config.rules.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = "No redirect rules available yet.";
      ruleList.append(emptyState);
      return;
    }

    for (const rule of config.rules) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rule-toggle";
      button.dataset.ruleId = rule.id;
      button.setAttribute("aria-pressed", String(rule.enabled));

      const label = document.createElement("span");
      label.className = "rule-copy";

      const title = document.createElement("span");
      title.className = "rule-title";
      title.textContent = getRuleLabel(rule);

      const description = document.createElement("span");
      description.className = "rule-description";
      description.textContent = getRuleDescription(rule);

      label.append(title, description);
      button.append(label);
      ruleList.append(button);
    }
  }

  function renderStatus(config) {
    const activeRules = config.rules.filter((rule) => rule.enabled).length;
    const totalRules = config.rules.length;

    if (!config.enabled) {
      statusCopy.textContent = `Master off. ${activeRules} of ${totalRules} rules selected.`;
      return;
    }

    statusCopy.textContent = `${activeRules} of ${totalRules} redirects active.`;
  }

  async function render() {
    const config = await shared.getConfig();
    toggle.checked = config.enabled;
    renderRuleList(config);
    renderStatus(config);
  }

  try {
    await render();
  } catch {
    statusCopy.textContent = "Failed to load extension state";
  }

  toggle.addEventListener("change", async () => {
    const config = await shared.getConfig();
    const nextConfig = {
      enabled: toggle.checked,
      rules: config.rules,
    };

    const result = await shared.saveConfig(nextConfig);
    if (!result.ok) {
      statusCopy.textContent = result.errors.join(" ");
      return;
    }

    await render();
  });

  ruleList.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest(".rule-toggle");
    if (!button) {
      return;
    }

    const config = await shared.getConfig();
    const nextRules = config.rules.map((rule) =>
      rule.id === button.dataset.ruleId
        ? {
            ...rule,
            enabled: !rule.enabled,
          }
        : rule
    );

    const result = await shared.saveConfig({
      enabled: config.enabled,
      rules: nextRules,
    });

    if (!result.ok) {
      statusCopy.textContent = result.errors.join(" ");
      return;
    }

    await render();
  });
})();
