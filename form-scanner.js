(() => {
  const core = globalThis.JobAssistantCore;

  function adapterForPage() {
    if (location.protocol === "chrome-extension:" && location.pathname.endsWith("/test-form.html")) {
      return {
        id: "test",
        name: "안전한 테스트 폼",
        containerSelectors: ["fieldset", "section", ".field-grid"],
        aliases: []
      };
    }
    return globalThis.JobAssistantAdapters.forPage(location.hostname, {
      greeting: Boolean(document.querySelector("[data-scope='field'][data-part='root']"))
    });
  }

  function fieldText(element, adapter) {
    const labels = element.labels ? Array.from(element.labels).map((label) => label.innerText) : [];
    const labelledBy = (element.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.innerText || "");
    const container = adapter.containerSelectors
      .map((selector) => element.closest(selector))
      .find(Boolean);
    const context = container?.innerText?.slice(0, 500) || "";
    const direct = [
      ...labels,
      ...labelledBy,
      element.getAttribute("aria-label"),
      element.placeholder,
      element.name,
      element.id
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    return { direct, context: context.replace(/\s+/g, " ").trim() };
  }

  function manualFileActions() {
    return Array.from(document.querySelectorAll("input[type='file']")).map((input, index) => {
      let current = input.parentElement;
      let label = "파일";
      for (let level = 1; current && level <= 7; level += 1, current = current.parentElement) {
        const text = current.innerText?.replace(/\s+/g, " ").trim() || "";
        if (/포트폴리오|portfolio/i.test(text)) {
          label = "포트폴리오";
          break;
        }
        if (/이력서|resume|curriculum vitae/i.test(text)) {
          label = "이력서";
          break;
        }
      }
      return { id: `manual-file-${index}`, label, reason: "browserFileSelection" };
    });
  }

  function scan(profile) {
    const adapter = adapterForPage();
    const elements = Array.from(document.querySelectorAll("input, textarea, select"));
    const suggestions = elements.flatMap((element, index) => {
      const type = (element.type || "").toLowerCase();
      if (element.disabled || element.readOnly || ["hidden", "submit", "button", "file", "password", "checkbox", "radio"].includes(type)) return [];
      const labels = fieldText(element, adapter);
      const match = core.matchField(labels.direct, profile, adapter.aliases)
        || core.matchField(labels.context, profile, adapter.aliases);
      if (!match) return [];
      const fieldId = `jaa-${index}`;
      element.dataset.jaaFieldId = fieldId;
      return [{
        fieldId,
        key: match.key,
        label: (labels.direct || labels.context).slice(0, 180) || match.key,
        value: match.value,
        confidence: core.confidence(match.score),
        score: match.score,
        source: match.source,
        platform: adapter.id
      }];
    });
    return { adapter, manualActions: manualFileActions(), suggestions };
  }

  async function scanWhenReady(profile, attempts = 6, delayMs = 300) {
    let result = scan(profile);
    for (let attempt = 1; !result.suggestions.length && attempt < attempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      result = scan(profile);
    }
    return result;
  }

  function ensureHighlightStyles() {
    if (document.getElementById("job-assistant-highlight-styles")) return;
    const style = document.createElement("style");
    style.id = "job-assistant-highlight-styles";
    style.textContent = `
      [data-jaa-highlight="selected"] {
        outline: 3px solid #16805b !important;
        outline-offset: 2px !important;
        background-color: rgba(22, 128, 91, 0.08) !important;
      }
      [data-jaa-highlight="filled"] {
        outline: 3px solid #16805b !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 5px rgba(22, 128, 91, 0.16) !important;
      }
    `;
    document.documentElement.append(style);
  }

  function highlight(fieldIds) {
    ensureHighlightStyles();
    const selected = new Set(fieldIds);
    for (const element of document.querySelectorAll("[data-jaa-field-id]")) {
      if (element.dataset.jaaHighlight !== "filled") {
        if (selected.has(element.dataset.jaaFieldId)) {
          element.dataset.jaaHighlight = "selected";
        } else {
          delete element.dataset.jaaHighlight;
        }
      }
    }
  }

  function setNativeValue(element, value) {
    if (element.tagName === "SELECT") {
      const normalized = value.toLowerCase();
      const option = Array.from(element.options).find((item) =>
        item.value === value || item.text.trim().toLowerCase() === normalized
      );
      if (!option) return false;
      element.value = option.value;
    } else {
      const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    return true;
  }

  function fill(suggestions) {
    let filled = 0;
    for (const suggestion of suggestions) {
      const element = document.querySelector(`[data-jaa-field-id="${suggestion.fieldId}"]`);
      if (element && setNativeValue(element, suggestion.value)) {
        element.dataset.jaaHighlight = "filled";
        filled += 1;
      }
    }
    return filled;
  }

  globalThis.JobAssistantScanner = {
    adapterForPage,
    fieldText,
    fill,
    highlight,
    manualFileActions,
    scan,
    scanWhenReady
  };
})();
