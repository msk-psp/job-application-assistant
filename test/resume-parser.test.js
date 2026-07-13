import assert from "node:assert/strict";
import test from "node:test";

import { extractResumeFields } from "../resume-parser.js";

test("extracts Korean contact details, links, and skills", () => {
  const result = extractResumeFields(`
이름: 김민수
이메일: minsoo@example.com
연락처: 010-1234-5678
거주지: 서울특별시
https://github.com/minsoo
https://linkedin.com/in/minsoo

MLOps Engineer
Python, Kubernetes, MLflow, Ray, Airflow
  `);

  assert.equal(result.fields.fullName, "김민수");
  assert.equal(result.fields.email, "minsoo@example.com");
  assert.equal(result.fields.phone, "010-1234-5678");
  assert.equal(result.fields.location, "서울특별시");
  assert.equal(result.fields.github, "https://github.com/minsoo");
  assert.equal(result.fields.linkedin, "https://linkedin.com/in/minsoo");
  assert.equal(result.fields.skills, "Airflow, Kubernetes, MLflow, Python, Ray");
});

test("does not classify social profile URLs as a portfolio", () => {
  const result = extractResumeFields(`
Jane Kim
jane@example.com
https://linkedin.com/in/janekim
https://github.com/janekim
  `);

  assert.equal(result.fields.fullName, "Jane Kim");
  assert.equal(result.fields.portfolio, undefined);
});

test("extracts dated experience and project candidates from sections", () => {
  const result = extractResumeFields(`
김민수
경력
Example Corp / MLOps Engineer 2021.03 - 현재
MLflow와 Kubernetes 기반 플랫폼 운영
배포 시간을 50% 단축

프로젝트
Lakehouse Platform / Tech Lead 2023.01 - 2024.06
DataHub와 Airflow 통합
  `);

  assert.equal(result.experiences.length, 1);
  assert.equal(result.experiences[0].company, "Example Corp");
  assert.equal(result.experiences[0].title, "MLOps Engineer");
  assert.equal(result.experiences[0].startDate, "2021-03");
  assert.equal(result.experiences[0].current, true);
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].name, "Lakehouse Platform");
});

test("preserves full text and expands explicit skills and education sections", () => {
  const result = extractResumeFields(`
김민수
기술 스택
Python, Kubernetes, Argo CD, Helm

학력 사항
Example University / Computer Science 2015.03 - 2019.02
Bachelor of Science
  `);

  assert.match(result.fields.skills, /Argo CD/);
  assert.match(result.fields.skills, /Helm/);
  assert.equal(result.education.length, 1);
  assert.equal(result.education[0].school, "Example University");
  assert.ok(result.rawText.includes("Bachelor of Science"));
  assert.ok(result.metadata.characterCount > 30);
  assert.ok(result.metadata.skillCount >= 4);
});
