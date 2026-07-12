const PROFILE_KEY = "resumeProfile";
let currentSuggestions = [];

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToPage(message) {
  const tab = await activeTab();
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    return chrome.tabs.sendMessage(tab.id, message);
  }
}

function renderSuggestions(suggestions) {
  const container = document.getElementById("suggestions");
  container.replaceChildren();
  for (const [index, suggestion] of suggestions.entries()) {
    const item = document.createElement("label");
    item.className = "suggestion";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.index = String(index);
    const detail = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = suggestion.label;
    const value = document.createElement("p");
    value.textContent = suggestion.value;
    detail.append(title, value);
    item.append(checkbox, detail);
    container.append(item);
  }
}

async function scanForm() {
  const status = document.getElementById("status");
  const stored = await chrome.storage.local.get(PROFILE_KEY);
  const profile = stored[PROFILE_KEY] || {};
  if (!profile.fullName && !profile.email && !profile.summary) {
    document.getElementById("profile-warning").hidden = false;
    status.textContent = "Resume profile is empty.";
    return;
  }
  try {
    const response = await sendToPage({ type: "SCAN_FORM", profile });
    currentSuggestions = response.suggestions;
    renderSuggestions(currentSuggestions);
    document.getElementById("fill").disabled = currentSuggestions.length === 0;
    status.textContent = currentSuggestions.length
      ? `${currentSuggestions.length} matching fields found. Review before filling.`
      : "No matching fields found on this page.";
  } catch (error) {
    status.textContent = "This page cannot be inspected. Reload it after installing the extension.";
  }
}

async function fillSelected() {
  const selected = Array.from(document.querySelectorAll(".suggestion input:checked"))
    .map((checkbox) => currentSuggestions[Number(checkbox.dataset.index)]);
  const response = await sendToPage({ type: "FILL_FIELDS", suggestions: selected });
  document.getElementById("status").textContent = `${response.filled} fields filled. Review the page before submitting.`;
}

document.getElementById("settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("scan").addEventListener("click", scanForm);
document.getElementById("fill").addEventListener("click", fillSelected);

sendToPage({ type: "PAGE_INFO" })
  .then((response) => { document.getElementById("site-label").textContent = response.platform; })
  .catch(() => { document.getElementById("site-label").textContent = "Unsupported browser page"; });

chrome.storage.local.get(PROFILE_KEY).then((stored) => {
  document.getElementById("profile-warning").hidden = Boolean(stored[PROFILE_KEY]);
});
