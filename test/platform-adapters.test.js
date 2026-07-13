import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function contextWithScripts() {
  const context = {};
  context.globalThis = context;
  for (const path of ["../matching-core.js", "../platform-adapters.js"]) {
    vm.runInNewContext(readFileSync(new URL(path, import.meta.url), "utf8"), context);
  }
  return context;
}

test("platform fixtures select the expected adapter and profile field", () => {
  const context = contextWithScripts();
  const fixtures = JSON.parse(readFileSync(new URL("./fixtures/platform-forms.json", import.meta.url)));
  const profile = {
    fullName: "테스트 지원자",
    email: "applicant@example.com",
    phone: "010-1234-5678",
    portfolio: "https://example.com",
    experiences: [{
      company: "Example Corp",
      title: "MLOps Engineer",
      startDate: "2020-01",
      current: true
    }]
  };

  for (const fixture of fixtures) {
    const adapter = context.JobAssistantAdapters.forHost(fixture.host);
    const match = context.JobAssistantCore.matchField(fixture.label, profile, adapter.aliases);
    assert.equal(adapter.id, fixture.platform, fixture.host);
    assert.equal(match?.key, fixture.expectedKey, fixture.label);
    if (fixture.platform !== "generic") assert.equal(match?.source, "platform");
  }
});

test("Greeting semantic markers detect custom career domains", () => {
  const context = contextWithScripts();
  const adapter = context.JobAssistantAdapters.forPage("careers.example.com", {
    greeting: true
  });

  assert.equal(adapter.id, "greeting");
});
