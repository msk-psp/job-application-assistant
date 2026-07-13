import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadScript(path, context = {}) {
  context.globalThis = context;
  vm.runInNewContext(readFileSync(new URL(path, import.meta.url), "utf8"), context);
  return context;
}

test("structured current experience overrides legacy current fields", () => {
  const { JobAssistantCore: core } = loadScript("../matching-core.js");
  const profile = {
    currentCompany: "Old Company",
    currentTitle: "Old Title",
    experiences: [{ company: "Current Company", title: "MLOps Engineer", current: true }]
  };

  assert.equal(core.profileValue(profile, "currentCompany"), "Current Company");
  assert.equal(core.profileValue(profile, "currentTitle"), "MLOps Engineer");
});

test("recommends a reviewed answer for a related culture question", () => {
  const { JobAssistantCore: core } = loadScript("../matching-core.js");
  const profile = {
    answers: [{
      category: "culture",
      question: "어떤 조직 문화를 선호하나요?",
      tags: "피드백 자율성",
      answer: "목표가 명확하고 피드백을 공개적으로 주고받는 문화를 선호합니다."
    }]
  };

  const match = core.matchField("선호하는 조직 문화와 업무 환경을 작성해 주세요", profile);
  assert.equal(match.key, "answer");
  assert.equal(match.source, "answerBank");
  assert.notEqual(core.confidence(match.score), "low");
});

test("low confidence answers are identified explicitly", () => {
  const { JobAssistantCore: core } = loadScript("../matching-core.js");
  assert.equal(core.confidence(0.4), "low");
  assert.equal(core.confidence(0.7), "medium");
  assert.equal(core.confidence(0.9), "high");
});
