export const MAX_PDF_SIZE = 15 * 1024 * 1024;
export const MAX_PDF_PAGES = 50;

export function validatePdfFile(file) {
  if (!file) throw new Error("PDF 파일을 선택하세요.");
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("PDF 파일만 가져올 수 있습니다.");
  }
  if (file.size > MAX_PDF_SIZE) throw new Error("PDF 크기는 15MB 이하여야 합니다.");
}
