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
