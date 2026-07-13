import { extractPdfResume, validatePdfFile } from "./pdf-import.js";

const PROFILE_KEY = "resumeProfile";
const fields = [
  "fullName", "email", "phone", "location", "linkedin", "portfolio", "github",
  "currentCompany", "currentTitle", "yearsExperience", "expectedSalary",
  "availableDate", "skills", "summary", "motivation", "culture", "strengths",
  "collaboration"
];
const importLabels = {
  fullName: "이름", email: "이메일", phone: "전화번호", location: "거주지",
  linkedin: "LinkedIn", portfolio: "포트폴리오", github: "GitHub",
  skills: "기술", summary: "경력 요약"
};
const legacyAnswers = {
  motivation: "지원 동기 또는 이직 사유",
  culture: "선호하는 조직 문화",
  strengths: "업무상 강점",
  collaboration: "협업 방식 또는 갈등 해결"
};
let pendingImport = null;

function createInput(labelText, field, value = "", options = {}) {
  const label = document.createElement("label");
  if (options.wide) label.className = "wide";
  const text = document.createTextNode(labelText);
  const input = options.multiline ? document.createElement("textarea") : document.createElement("input");
  input.dataset.itemField = field;
  input.value = value || "";
  if (options.type) input.type = options.type;
  if (options.multiline) input.rows = options.rows || 3;
  label.append(text, input);
  return label;
}

function removeButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "remove-item";
  button.title = "항목 삭제";
  button.setAttribute("aria-label", "항목 삭제");
  button.textContent = "×";
  button.addEventListener("click", () => button.closest(".repeat-item").remove());
  return button;
}

function addExperience(value = {}) {
  const item = document.createElement("div");
  item.className = "repeat-item";
  item.dataset.repeatKind = "experience";
  const grid = document.createElement("div");
  grid.className = "repeat-item-grid";
  const currentLabel = document.createElement("label");
  currentLabel.className = "inline-check";
  const current = document.createElement("input");
  current.type = "checkbox";
  current.dataset.itemField = "current";
  current.checked = Boolean(value.current);
  currentLabel.append(current, document.createTextNode("현재 재직 중"));
  grid.append(
    createInput("회사", "company", value.company),
    createInput("직책", "title", value.title),
    createInput("시작일", "startDate", value.startDate, { type: "month" }),
    createInput("종료일", "endDate", value.endDate, { type: "month" }),
    currentLabel,
    createInput("담당 업무", "description", value.description, { multiline: true, wide: true }),
    createInput("주요 성과", "achievements", value.achievements, { multiline: true, wide: true })
  );
  item.append(removeButton(), grid);
  document.getElementById("experience-list").append(item);
}

function addProject(value = {}) {
  const item = document.createElement("div");
  item.className = "repeat-item";
  item.dataset.repeatKind = "project";
  const grid = document.createElement("div");
  grid.className = "repeat-item-grid";
  grid.append(
    createInput("프로젝트명", "name", value.name),
    createInput("역할", "role", value.role),
    createInput("기간", "period", value.period),
    createInput("기술", "technologies", value.technologies),
    createInput("설명", "description", value.description, { multiline: true, wide: true }),
    createInput("성과", "outcomes", value.outcomes, { multiline: true, wide: true })
  );
  item.append(removeButton(), grid);
  document.getElementById("project-list").append(item);
}

function addAnswer(value = {}) {
  const item = document.createElement("div");
  item.className = "repeat-item";
  item.dataset.repeatKind = "answer";
  const grid = document.createElement("div");
  grid.className = "repeat-item-grid";
  const categoryLabel = document.createElement("label");
  categoryLabel.append(document.createTextNode("분류"));
  const category = document.createElement("select");
  category.dataset.itemField = "category";
  for (const [key, text] of Object.entries({ motivation: "지원 동기", culture: "조직 문화", strengths: "강점", collaboration: "협업", other: "기타" })) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = text;
    option.selected = (value.category || "other") === key;
    category.append(option);
  }
  categoryLabel.append(category);
  grid.append(
    categoryLabel,
    createInput("태그", "tags", value.tags),
    createInput("실제 질문", "question", value.question, { multiline: true, wide: true, rows: 2 }),
    createInput("검토된 답변", "answer", value.answer, { multiline: true, wide: true, rows: 5 })
  );
  item.append(removeButton(), grid);
  document.getElementById("answer-list").append(item);
}

function collectItems(kind) {
  return Array.from(document.querySelectorAll(`[data-repeat-kind="${kind}"]`)).map((item) => {
    const result = {};
    for (const input of item.querySelectorAll("[data-item-field]")) {
      result[input.dataset.itemField] = input.type === "checkbox" ? input.checked : input.value.trim();
    }
    return result;
  }).filter((item) => Object.entries(item).some(
    ([key, value]) => !["current", "category"].includes(key) && value
  ));
}

function migrateAnswers(profile) {
  if (Array.isArray(profile.answers) && profile.answers.length) return profile.answers;
  return Object.entries(legacyAnswers).flatMap(([category, question]) => profile[category]
    ? [{ category, question, answer: profile[category], tags: "" }]
    : []);
}

async function loadProfile() {
  const stored = await chrome.storage.local.get(PROFILE_KEY);
  const profile = stored[PROFILE_KEY] || {};
  for (const field of fields) document.getElementById(field).value = profile[field] || "";
  const experiences = Array.isArray(profile.experiences) && profile.experiences.length
    ? profile.experiences
    : profile.currentCompany || profile.currentTitle
      ? [{ company: profile.currentCompany, title: profile.currentTitle, current: true }]
      : [];
  experiences.forEach(addExperience);
  (profile.projects || []).forEach(addProject);
  migrateAnswers(profile).forEach(addAnswer);
}

async function saveProfile() {
  const profile = Object.fromEntries(fields.map((field) => [field, document.getElementById(field).value.trim()]));
  Object.assign(profile, {
    profileVersion: 2,
    experiences: collectItems("experience"),
    projects: collectItems("project"),
    answers: collectItems("answer")
  });
  await chrome.storage.local.set({ [PROFILE_KEY]: profile });
  const status = document.getElementById("save-status");
  status.textContent = "로컬에 저장했습니다";
  window.setTimeout(() => { status.textContent = ""; }, 1800);
}

function importRow(labelText, value, attributes = {}) {
  const row = document.createElement("label");
  row.className = "import-field";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  Object.assign(checkbox.dataset, attributes);
  checkbox.checked = attributes.profileField
    ? !document.getElementById(attributes.profileField).value.trim()
    : true;
  const label = document.createElement("span");
  label.textContent = labelText;
  const editor = document.createElement("textarea");
  editor.value = value;
  if (attributes.profileField) editor.dataset.importValue = attributes.profileField;
  editor.readOnly = Boolean(attributes.importCollection);
  row.append(checkbox, label, editor);
  return row;
}

function renderImportPreview(result) {
  pendingImport = result;
  const container = document.getElementById("import-fields");
  container.replaceChildren();
  for (const [key, value] of Object.entries(result.fields).filter(([, value]) => value)) {
    container.append(importRow(importLabels[key], value, { profileField: key }));
  }
  result.experiences.forEach((item, index) => container.append(importRow(
    `경력 후보 ${index + 1}`,
    [item.company, item.title, item.period, item.description].filter(Boolean).join("\n"),
    { importCollection: "experiences", importIndex: String(index) }
  )));
  result.projects.forEach((item, index) => container.append(importRow(
    `프로젝트 후보 ${index + 1}`,
    [item.name, item.role, item.period, item.description].filter(Boolean).join("\n"),
    { importCollection: "projects", importIndex: String(index) }
  )));
  document.getElementById("raw-resume-text").value = result.rawText;
  document.getElementById("import-preview").hidden = false;
}

async function importResume() {
  const input = document.getElementById("resume-file");
  const status = document.getElementById("import-status");
  const extractButton = document.getElementById("extract-resume");
  const file = input.files?.[0];
  document.getElementById("import-preview").hidden = true;
  try {
    validatePdfFile(file);
  } catch (error) {
    status.textContent = error.message;
    return;
  }
  status.textContent = "PDF에서 텍스트를 추출하고 있습니다...";
  extractButton.disabled = true;
  try {
    const result = await extractPdfResume(file);
    renderImportPreview(result);
    const count = Object.keys(result.fields).length + result.experiences.length + result.projects.length;
    status.textContent = `${file.name}에서 ${count}개 항목을 찾았습니다.`;
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
  const selectedFields = document.querySelectorAll("[data-profile-field]:checked");
  for (const checkbox of selectedFields) {
    const key = checkbox.dataset.profileField;
    document.getElementById(key).value = document.querySelector(`[data-import-value="${key}"]`).value.trim();
  }
  const selectedCollections = document.querySelectorAll("[data-import-collection]:checked");
  for (const checkbox of selectedCollections) {
    const item = pendingImport[checkbox.dataset.importCollection][Number(checkbox.dataset.importIndex)];
    checkbox.dataset.importCollection === "experiences" ? addExperience(item) : addProject(item);
  }
  const count = selectedFields.length + selectedCollections.length;
  document.getElementById("import-status").textContent = `${count}개 항목을 반영했습니다. 내용을 확인한 뒤 저장하세요.`;
}

document.getElementById("save").addEventListener("click", saveProfile);
document.getElementById("extract-resume").addEventListener("click", importResume);
document.getElementById("merge-resume").addEventListener("click", mergeResume);
document.getElementById("add-experience").addEventListener("click", () => addExperience());
document.getElementById("add-project").addEventListener("click", () => addProject());
document.getElementById("add-answer").addEventListener("click", () => addAnswer());
loadProfile();
