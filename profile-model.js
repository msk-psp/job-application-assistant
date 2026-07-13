export const PROFILE_KEY = "resumeProfile";

export function hasProfileData(profile) {
  return Boolean(
    profile?.fullName
    || profile?.email
    || profile?.summary
    || profile?.experiences?.length
    || profile?.answers?.length
  );
}

export function profileFromResume(result, existing = {}) {
  const profile = { ...existing, profileVersion: 2 };
  for (const [key, value] of Object.entries(result.fields || {})) {
    if (value && !profile[key]) profile[key] = value;
  }
  if (!profile.experiences?.length && result.experiences?.length) {
    profile.experiences = result.experiences;
  }
  if (!profile.projects?.length && result.projects?.length) {
    profile.projects = result.projects;
  }
  if (!profile.education?.length && result.education?.length) {
    profile.education = result.education;
  }
  profile.experiences ||= [];
  profile.projects ||= [];
  profile.education ||= [];
  profile.answers ||= [];
  if (result.rawText) profile.resumeText = result.rawText;
  if (result.metadata) profile.importMetadata = result.metadata;
  return profile;
}

export function summarizeResumeImport(result) {
  return {
    fields: Object.values(result.fields || {}).filter(Boolean).length,
    experiences: result.experiences?.length || 0,
    projects: result.projects?.length || 0,
    education: result.education?.length || 0,
    skills: result.metadata?.skillCount || 0,
    characters: result.metadata?.characterCount || result.rawText?.length || 0
  };
}
