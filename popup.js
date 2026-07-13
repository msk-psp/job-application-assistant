import { extractPdfResume, validatePdfFile } from "./pdf-import.js";
import { hasProfileData, PROFILE_KEY, profileFromResume } from "./profile-model.js";

let currentProfile = null;
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
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["matching-core.js", "platform-adapters.js", "content.js"]
    });
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
    checkbox.checked = suggestion.confidence !== "low";
    checkbox.dataset.index = String(index);
    const detail = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = suggestion.label;
    const confidence = document.createElement("small");
    confidence.className = `confidence confidence-${suggestion.confidence}`;
    confidence.textContent = { high: "높은 신뢰도", medium: "보통 신뢰도", low: "낮은 신뢰도" }[suggestion.confidence];
    const value = document.createElement("p");
    value.textContent = suggestion.value;
    detail.append(title, confidence, value);
    item.append(checkbox, detail);
    container.append(item);
  }
}

async function scanForm() {
  const status = document.getElementById("status");
  if (!hasProfileData(currentProfile)) return;
  status.textContent = "현재 페이지를 확인하고 있습니다...";
  try {
    const response = await sendToPage({ type: "SCAN_FORM", profile: currentProfile });
    currentSuggestions = response.suggestions;
    renderSuggestions(currentSuggestions);
    document.getElementById("fill").disabled = currentSuggestions.length === 0;
    status.textContent = currentSuggestions.length
      ? `${currentSuggestions.length}개 항목을 찾았습니다. 내용을 확인한 뒤 입력하세요.`
      : "입력할 항목을 찾지 못했습니다. 테스트 폼에서 먼저 확인할 수 있습니다.";
  } catch (error) {
    status.textContent = "이 페이지에는 접근할 수 없습니다. 페이지를 새로고침하거나 테스트 폼을 사용하세요.";
  }
}

async function quickImport() {
  const file = document.getElementById("quick-resume-file").files?.[0];
  const status = document.getElementById("status");
  const button = document.getElementById("quick-import");
  try {
    validatePdfFile(file);
  } catch (error) {
    status.textContent = error.message;
    return;
  }
  button.disabled = true;
  status.textContent = "PDF 이력서에서 프로필을 만들고 있습니다...";
  try {
    const result = await extractPdfResume(file);
    currentProfile = profileFromResume(result, currentProfile || {});
    await chrome.storage.local.set({ [PROFILE_KEY]: currentProfile });
    document.getElementById("onboarding").hidden = true;
    document.getElementById("ready").hidden = false;
    status.textContent = "프로필을 만들었습니다. 현재 페이지를 확인합니다.";
    await scanForm();
  } catch (error) {
    console.error(error);
    status.textContent = error?.name === "PasswordException"
      ? "암호로 보호된 PDF는 가져올 수 없습니다."
      : `PDF를 읽지 못했습니다: ${error.message || "알 수 없는 오류"}`;
  } finally {
    button.disabled = false;
  }
}

async function fillSelected() {
  const selected = Array.from(document.querySelectorAll(".suggestion input:checked"))
    .map((checkbox) => currentSuggestions[Number(checkbox.dataset.index)]);
  if (!selected.length) {
    document.getElementById("status").textContent = "입력할 항목을 하나 이상 선택하세요.";
    return;
  }
  const response = await sendToPage({ type: "FILL_FIELDS", suggestions: selected });
  document.getElementById("status").textContent = `${response.filled}개 항목을 입력했습니다. 제출 전 반드시 확인하세요.`;
}

async function initialize() {
  const stored = await chrome.storage.local.get(PROFILE_KEY);
  currentProfile = stored[PROFILE_KEY] || {};
  const ready = hasProfileData(currentProfile);
  document.getElementById("onboarding").hidden = ready;
  document.getElementById("ready").hidden = !ready;
  try {
    const page = await sendToPage({ type: "PAGE_INFO" });
    document.getElementById("site-label").textContent = page.platform;
  } catch (error) {
    document.getElementById("site-label").textContent = "접근할 수 없는 페이지";
  }
  if (ready) await scanForm();
}

document.getElementById("quick-import").addEventListener("click", quickImport);
document.getElementById("scan").addEventListener("click", scanForm);
document.getElementById("fill").addEventListener("click", fillSelected);
document.getElementById("settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("edit-profile").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("open-test").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("test-form.html") });
});

initialize();
