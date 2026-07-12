const PROFILE_KEY = "resumeProfile";
const fields = [
  "fullName", "email", "phone", "location", "linkedin", "portfolio", "github",
  "currentCompany", "currentTitle", "yearsExperience", "expectedSalary",
  "availableDate", "skills", "summary", "motivation", "culture", "strengths",
  "collaboration"
];

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

document.getElementById("save").addEventListener("click", saveProfile);
loadProfile();
