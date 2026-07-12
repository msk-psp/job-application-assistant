(() => {
const FIELD_RULES = [
  { key: "fullName", patterns: [/full.?name/i, /name/i, /성명/, /이름/] },
  { key: "email", patterns: [/e-?mail/i, /이메일/] },
  { key: "phone", patterns: [/phone/i, /mobile/i, /telephone/i, /휴대폰/, /연락처/, /전화번호/] },
  { key: "location", patterns: [/location/i, /address/i, /거주지/, /주소/] },
  { key: "linkedin", patterns: [/linkedin/i] },
  { key: "github", patterns: [/github/i] },
  { key: "portfolio", patterns: [/portfolio/i, /website/i, /포트폴리오/] },
  { key: "currentCompany", patterns: [/current.?company/i, /현.*회사/, /재직.*회사/] },
  { key: "currentTitle", patterns: [/current.?title/i, /job.?title/i, /직책/, /직급/] },
  { key: "yearsExperience", patterns: [/years?.*experience/i, /경력.*년/, /총.*경력/] },
  { key: "expectedSalary", patterns: [/expected.?salary/i, /희망.*연봉/] },
  { key: "availableDate", patterns: [/start.?date/i, /available/i, /입사.*가능/] },
  { key: "skills", patterns: [/skills?/i, /기술.*스택/, /보유.*기술/] },
  { key: "summary", patterns: [/career.?summary/i, /professional.?summary/i, /경력.*요약/, /자기소개/] },
  { key: "motivation", patterns: [/why.*(join|apply|role)/i, /motivation/i, /지원.*동기/, /이직.*사유/] },
  { key: "culture", patterns: [/culture/i, /environment/i, /조직.*문화/, /선호.*문화/, /업무.*환경/] },
  { key: "strengths", patterns: [/strength/i, /장점/, /강점/] },
  { key: "collaboration", patterns: [/collaboration/i, /teamwork/i, /협업/, /갈등.*해결/] }
];

function platformName() {
  const host = location.hostname;
  if (host.includes("saramin")) return "Saramin";
  if (host.includes("wanted")) return "Wanted";
  if (host.includes("rememberapp")) return "Remember";
  if (host.includes("linkedin")) return "LinkedIn";
  return host;
}

function fieldText(element) {
  const labels = element.labels ? Array.from(element.labels).map((label) => label.innerText) : [];
  const labelledBy = (element.getAttribute("aria-labelledby") || "")
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.innerText || "");
  return [
    ...labels,
    ...labelledBy,
    element.getAttribute("aria-label"),
    element.placeholder,
    element.name,
    element.id
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function profileKeyFor(text) {
  return FIELD_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(text)))?.key;
}

function scan(profile) {
  const elements = Array.from(document.querySelectorAll("input, textarea, select"));
  return elements.flatMap((element, index) => {
    const type = (element.type || "").toLowerCase();
    if (element.disabled || element.readOnly || ["hidden", "submit", "button", "file", "password", "checkbox", "radio"].includes(type)) {
      return [];
    }
    const label = fieldText(element);
    const key = profileKeyFor(label);
    const value = key ? profile[key] : "";
    if (!key || !value) return [];
    const fieldId = `jaa-${index}`;
    element.dataset.jaaFieldId = fieldId;
    return [{ fieldId, key, label: label || key, value }];
  });
}

function setNativeValue(element, value) {
  if (element.tagName === "SELECT") {
    const option = Array.from(element.options).find((item) =>
      item.value === value || item.text.trim().toLowerCase() === value.toLowerCase()
    );
    if (!option) return false;
    element.value = option.value;
  } else {
    const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(element, value);
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PAGE_INFO") {
    sendResponse({ platform: platformName(), url: location.href });
    return;
  }
  if (message.type === "SCAN_FORM") {
    sendResponse({ suggestions: scan(message.profile), platform: platformName() });
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
