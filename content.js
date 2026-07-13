(() => {
  const scanner = globalThis.JobAssistantScanner;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PAGE_INFO") {
      const adapter = scanner.adapterForPage();
      sendResponse({ platform: adapter.name, platformId: adapter.id, url: location.href });
      return;
    }
    if (message.type === "SCAN_FORM") {
      scanner.scanWhenReady(message.profile).then(({ adapter, manualActions, suggestions }) => {
        sendResponse({ suggestions, manualActions, platform: adapter.name });
      });
      return true;
    }
    if (message.type === "FILL_FIELDS") {
      sendResponse({ filled: scanner.fill(message.suggestions) });
      return;
    }
    if (message.type === "HIGHLIGHT_FIELDS") {
      scanner.highlight(message.fieldIds);
      sendResponse({ highlighted: message.fieldIds.length });
    }
  });
})();
