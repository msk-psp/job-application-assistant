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
  profile.experiences ||= [];
  profile.projects ||= [];
  profile.answers ||= [];
  return profile;
}
