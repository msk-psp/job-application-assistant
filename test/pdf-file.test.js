import assert from "node:assert/strict";
import test from "node:test";

import { MAX_PDF_SIZE, validatePdfFile } from "../pdf-file.js";

test("accepts PDF MIME type and PDF filename fallback", () => {
  assert.doesNotThrow(() => validatePdfFile({ name: "resume.bin", type: "application/pdf", size: 10 }));
  assert.doesNotThrow(() => validatePdfFile({ name: "resume.PDF", type: "", size: 10 }));
});

test("rejects missing, unsupported, and oversized files", () => {
  assert.throws(() => validatePdfFile(), /선택/);
  assert.throws(() => validatePdfFile({ name: "resume.docx", type: "application/octet-stream", size: 10 }), /PDF/);
  assert.throws(() => validatePdfFile({ name: "resume.pdf", type: "application/pdf", size: MAX_PDF_SIZE + 1 }), /15MB/);
});
