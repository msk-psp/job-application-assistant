import assert from "node:assert/strict";
import test from "node:test";

import { hasProfileData, profileFromResume } from "../profile-model.js";

test("creates a versioned profile from an imported resume", () => {
  const profile = profileFromResume({
    fields: { fullName: "김민수", email: "minsoo@example.com" },
    experiences: [{ company: "Example Corp", current: true }],
    projects: [{ name: "MLOps Platform" }]
  });

  assert.equal(profile.profileVersion, 2);
  assert.equal(profile.fullName, "김민수");
  assert.equal(profile.experiences.length, 1);
  assert.equal(profile.projects.length, 1);
  assert.deepEqual(profile.answers, []);
  assert.equal(hasProfileData(profile), true);
});

test("quick import does not overwrite existing reviewed fields", () => {
  const profile = profileFromResume(
    { fields: { fullName: "PDF Name", email: "new@example.com" }, experiences: [], projects: [] },
    { fullName: "Reviewed Name", email: "reviewed@example.com", answers: [{ answer: "Reviewed" }] }
  );

  assert.equal(profile.fullName, "Reviewed Name");
  assert.equal(profile.email, "reviewed@example.com");
  assert.equal(profile.answers.length, 1);
});
