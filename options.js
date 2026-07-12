import * as pdfjsLib from "./vendor/pdfjs/build/pdf.mjs";
import { extractResumeFields } from "./resume-parser.js";

const PROFILE_KEY = "resumeProfile";
const MAX_PDF_SIZE = 15 * 1024 * 1024;
const MAX_PDF_PAGES = 50;
const fields = [
  "fullName", "email", "phone", "location", "linkedin", "portfolio", "github",
  "currentCompany", "currentTitle", "yearsExperience", "expectedSalary",
  "availableDate", "skills", "summary", "motivation", "culture", "strengths",
  "collaboration"
];
const importLabels = {
  fullName: "이름",
  email: "이메일",
  phone: "전화번호",
  location: "거주지",
  linkedin: "LinkedIn",
  portfolio: "포트폴리오",
  github: "GitHub",
  skills: "기술",
  summary: "경력 요약"
};

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
  "vendor/pdfjs/build/pdf.worker.mjs"
);

async function loadProfile() {
  const stored = await chrome.storage.local.get(PROFILE_KEY);
  const profile = stored[PROFILE_KEY] || {};
  for (const field of fields) {
    document.getElementById(field).value = profile[field] || "";
  }
}

async function saveProfile() {
  const profile = Object.fromEntries(
    fields.map((field) => [field, document.getElementById(field).value.trim()])
  );
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
  const status = document.getElementById("save-status");
  status.textContent = "Saved locally";
  window.setTimeout(() => { status.textContent = ""; }, 1800);
}

async function extractPdfText(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: chrome.runtime.getURL("vendor/pdfjs/web/cmaps/"),
    cMapPacked: true,
    isEvalSupported: false,
    standardFontDataUrl: chrome.runtime.getURL("vendor/pdfjs/web/standard_fonts/")
  });
  const document = await loadingTask.promise;
  const pages = [];
  try {
    if (document.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF는 ${MAX_PDF_PAGES}페이지 이하여야 합니다.`);
    }
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : " ";
      }
      pages.push(pageText.replace(/[ \t]+\n/g, "\n").trim());
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }
  return pages.filter(Boolean).join("\n\n");
}

function renderImportPreview(result) {
  const container = document.getElementById("import-fields");
  container.replaceChildren();
  const entries = Object.entries(result.fields).filter(([, value]) => value);
  for (const [key, value] of entries) {
    const row = document.createElement("label");
    row.className = "import-field";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !document.getElementById(key).value.trim();
    checkbox.dataset.profileField = key;
    const label = document.createElement("span");
    label.textContent = importLabels[key];
    const editor = document.createElement("textarea");
    editor.value = value;
    editor.dataset.importValue = key;
    editor.rows = key === "summary" ? 5 : 2;
    row.append(checkbox, label, editor);
    container.append(row);
  }
  document.getElementById("raw-resume-text").value = result.rawText;
  document.getElementById("import-preview").hidden = false;
}

async function importResume() {
  const input = document.getElementById("resume-file");
  const status = document.getElementById("import-status");
  const extractButton = document.getElementById("extract-resume");
  const file = input.files?.[0];
  document.getElementById("import-preview").hidden = true;
  if (!file) {
    status.textContent = "PDF 파일을 선택하세요.";
    return;
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    status.textContent = "PDF 파일만 가져올 수 있습니다.";
    return;
  }
  if (file.size > MAX_PDF_SIZE) {
    status.textContent = "PDF 크기는 15MB 이하여야 합니다.";
    return;
  }

  status.textContent = "PDF에서 텍스트를 추출하고 있습니다...";
  extractButton.disabled = true;
  try {
    const text = await extractPdfText(file);
    if (text.replace(/\s/g, "").length < 30) {
      throw new Error("텍스트를 찾지 못했습니다. 이미지로 스캔된 PDF는 아직 지원하지 않습니다.");
    }
    const result = extractResumeFields(text);
    renderImportPreview(result);
    status.textContent = `${file.name}에서 ${Object.keys(result.fields).length}개 항목을 찾았습니다.`;
  } catch (error) {
    console.error(error);
    status.textContent = error?.name === "PasswordException"
      ? "암호로 보호된 PDF는 가져올 수 없습니다."
      : `PDF를 읽지 못했습니다: ${error.message || "알 수 없는 오류"}`;
  } finally {
    extractButton.disabled = false;
  }
}

function mergeResume() {
  const selected = document.querySelectorAll("[data-profile-field]:checked");
  for (const checkbox of selected) {
    const key = checkbox.dataset.profileField;
    const imported = document.querySelector(`[data-import-value="${key}"]`).value.trim();
    document.getElementById(key).value = imported;
  }
  document.getElementById("import-status").textContent =
    `${selected.length}개 항목을 프로필에 반영했습니다. 내용을 확인한 뒤 저장하세요.`;
}

document.getElementById("save").addEventListener("click", saveProfile);
document.getElementById("extract-resume").addEventListener("click", importResume);
document.getElementById("merge-resume").addEventListener("click", mergeResume);
loadProfile();
