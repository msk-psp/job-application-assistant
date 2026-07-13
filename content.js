(() => {
  const core = globalThis.JobAssistantCore;
  const adapter = globalThis.JobAssistantAdapters.forHost(location.hostname);

  function fieldText(element) {
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

  function scan(profile) {
    const elements = Array.from(document.querySelectorAll("input, textarea, select"));
    return elements.flatMap((element, index) => {
      const type = (element.type || "").toLowerCase();
      if (element.disabled || element.readOnly || ["hidden", "submit", "button", "file", "password", "checkbox", "radio"].includes(type)) return [];
      const labels = fieldText(element);
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

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PAGE_INFO") {
      sendResponse({ platform: adapter.name, platformId: adapter.id, url: location.href });
      return;
    }
    if (message.type === "SCAN_FORM") {
      sendResponse({ suggestions: scan(message.profile), platform: adapter.name });
      return;
    }
    if (message.type === "FILL_FIELDS") {
      let filled = 0;
      for (const suggestion of message.suggestions) {
        const element = document.querySelector(`[data-jaa-field-id="${suggestion.fieldId}"]`);
        if (element && setNativeValue(element, suggestion.value)) filled += 1;
      }
      sendResponse({ filled });
    }
  });
})();
