import * as pdfjsLib from "./vendor/pdfjs/build/pdf.mjs";
import { MAX_PDF_PAGES, validatePdfFile } from "./pdf-file.js";
import { extractResumeFields } from "./resume-parser.js";

export { validatePdfFile } from "./pdf-file.js";

export async function extractPdfResume(file) {
  validatePdfFile(file);
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
    "vendor/pdfjs/build/pdf.worker.mjs"
  );
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: chrome.runtime.getURL("vendor/pdfjs/web/cmaps/"),
    cMapPacked: true,
    isEvalSupported: false,
    standardFontDataUrl: chrome.runtime.getURL("vendor/pdfjs/web/standard_fonts/")
  });
  const pdf = await loadingTask.promise;
  const pages = [];
  try {
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF는 ${MAX_PDF_PAGES}페이지 이하여야 합니다.`);
    }
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : " ";
      }
      pages.push(pageText.replace(/[ \t]+\n/g, "\n").trim());
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
  const text = pages.filter(Boolean).join("\n\n");
  if (text.replace(/\s/g, "").length < 30) {
    throw new Error("텍스트를 찾지 못했습니다. 이미지로 스캔된 PDF는 아직 지원하지 않습니다.");
  }
  return extractResumeFields(text);
}
