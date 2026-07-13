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
    email: "applicant@example.com",
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
