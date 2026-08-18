import { strFromU8, unzipSync } from "fflate";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import type { CareerSection, ResumeDocumentEvidence, ResumeReviewItem } from "../../domain/career-evidence-profile";

export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;

export type ResumeProcessingErrorCode = "UNSUPPORTED_FILE" | "OVERSIZED_FILE" | "EMPTY_DOCUMENT" | "MALFORMED_FILE" | "PARSING_FAILED";

export class ResumeProcessingError extends Error {
  constructor(public readonly code: ResumeProcessingErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ResumeProcessingError";
  }
}

const supportedExtensions = new Set(["pdf", "docx", "txt"]);
const supportedMimeTypes: Record<string, string[]> = {
  pdf: ["application/pdf", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream", "application/zip"],
  txt: ["text/plain", "application/octet-stream"],
};
const headingMap: Array<[RegExp, CareerSection]> = [
  [/^(work\s+)?experience|employment|professional experience$/i, "experience"],
  [/^education|academic background$/i, "education"],
  [/^(technical\s+)?skills|technologies|tech stack$/i, "skills"],
  [/^(selected\s+)?projects|personal projects$/i, "projects"],
  [/^certifications?|licenses?$/i, "certifications"],
  [/^achievements?|awards?|honors?$/i, "achievements"],
  [/^(professional\s+)?links|profiles|contact$/i, "professionalLinks"],
];

function extension(fileName: string): string {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

function normalizeText(text: string): string {
  return text.replaceAll("\u0000", "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").replace(/[ \t]+\n/g, "\n").trim();
}

function ensureText(text: string): string {
  const normalized = normalizeText(text);
  if (!normalized) throw new ResumeProcessingError("EMPTY_DOCUMENT", "No readable resume text was found. Paste the resume text instead.");
  return normalized;
}

async function parsePdf(data: Uint8Array): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (typeof Worker !== "undefined") pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const document = await pdfjs.getDocument({ data, isEvalSupported: false, useWorkerFetch: false }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => "str" in item ? item.str : "").filter(Boolean).join(" "));
    }
    await document.destroy();
    return ensureText(pages.join("\n\n"));
  } catch (error) {
    if (error instanceof ResumeProcessingError) throw error;
    throw new ResumeProcessingError("MALFORMED_FILE", "The PDF could not be read locally. Use the paste-text fallback.", { cause: error });
  }
}

function parseDocx(data: Uint8Array): string {
  try {
    const files = unzipSync(data);
    const documentXml = files["word/document.xml"];
    if (!documentXml) throw new Error("Missing document.xml");
    const xml = new DOMParser().parseFromString(strFromU8(documentXml), "application/xml");
    if (xml.querySelector("parsererror")) throw new Error("Invalid document XML");
    const paragraphs = [...xml.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "p")].map((paragraph) =>
      [...paragraph.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "t")].map((node) => node.textContent ?? "").join(""),
    );
    return ensureText(paragraphs.join("\n"));
  } catch (error) {
    if (error instanceof ResumeProcessingError) throw error;
    throw new ResumeProcessingError("MALFORMED_FILE", "The DOCX file could not be read locally. Use the paste-text fallback.");
  }
}

function parseTxt(data: Uint8Array): string {
  try {
    return ensureText(new TextDecoder("utf-8", { fatal: true }).decode(data));
  } catch (error) {
    if (error instanceof ResumeProcessingError) throw error;
    throw new ResumeProcessingError("MALFORMED_FILE", "The TXT file is not valid UTF-8. Save it as UTF-8 or paste the text.");
  }
}

export async function processResumeFile(file: File, now = new Date().toISOString()): Promise<{ document: ResumeDocumentEvidence; items: ResumeReviewItem[] }> {
  const fileExtension = extension(file.name);
  if (!supportedExtensions.has(fileExtension) || (file.type && !supportedMimeTypes[fileExtension]?.includes(file.type.toLowerCase()))) throw new ResumeProcessingError("UNSUPPORTED_FILE", "Supported resume files are PDF, DOCX, and UTF-8 TXT.");
  if (file.size > MAX_RESUME_FILE_BYTES) throw new ResumeProcessingError("OVERSIZED_FILE", "Resume files must be 5 MB or smaller.");
  if (file.size === 0) throw new ResumeProcessingError("EMPTY_DOCUMENT", "The selected file is empty. Choose another file or paste the resume text.");
  const data = new Uint8Array(await file.arrayBuffer());
  const text = fileExtension === "pdf" ? await parsePdf(data) : fileExtension === "docx" ? parseDocx(data) : parseTxt(data);
  const type = fileExtension.toUpperCase() as "PDF" | "DOCX" | "TXT";
  const document: ResumeDocumentEvidence = { id: `resume:${crypto.randomUUID()}`, fileName: file.name, fileType: type, text, importedAt: now, sizeBytes: file.size, private: true };
  return { document, items: extractResumeItems(text, document.id, now) };
}

export function processPastedResume(text: string, now = new Date().toISOString()): { document: ResumeDocumentEvidence; items: ResumeReviewItem[] } {
  const normalized = ensureText(text);
  const document: ResumeDocumentEvidence = { id: `resume:${crypto.randomUUID()}`, fileType: "PASTED_TEXT", text: normalized, importedAt: now, sizeBytes: new Blob([normalized]).size, private: true };
  return { document, items: extractResumeItems(normalized, document.id, now) };
}

function sectionForHeading(line: string): CareerSection | null {
  const normalized = line.replace(/[:\-–—]+$/, "").trim();
  return headingMap.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let block: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      if (block.length) blocks.push(block);
      block = [];
    } else block.push(line.replace(/^[•●▪◦*-]\s*/, "").trim());
  }
  if (block.length) blocks.push(block);
  return blocks;
}

function dateRange(value: string): { startDate: string; endDate: string } {
  const match = value.match(/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(19|20)\d{2}\s*(?:-|–|—|to)\s*(((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(19|20)\d{2}|present|current)/i);
  if (!match) return { startDate: "", endDate: "" };
  const parts = match[0].split(/\s*(?:-|–|—|to)\s*/i);
  return { startDate: parts[0] ?? "", endDate: parts[1] ?? "" };
}

function reviewItem(section: CareerSection, sourceId: string, now: string, values: Partial<ResumeReviewItem>): ResumeReviewItem {
  return {
    id: `review:${crypto.randomUUID()}`, section, title: "", organization: "", description: "", startDate: "", endDate: "", technologies: [], url: "", status: "PENDING",
    provenance: { source: "RESUME_PROVIDED", sourceId, observedAt: now, note: "Deterministically extracted; requires user review" },
    ...values,
  };
}

export function extractResumeItems(text: string, sourceId: string, now = new Date().toISOString()): ResumeReviewItem[] {
  const lines = normalizeText(text).split("\n");
  const sections = new Map<CareerSection, string[]>();
  let current: CareerSection = "other";
  for (const rawLine of lines) {
    const heading = sectionForHeading(rawLine.trim());
    if (heading) { current = heading; if (!sections.has(current)) sections.set(current, []); }
    else sections.set(current, [...(sections.get(current) ?? []), rawLine]);
  }
  const items: ResumeReviewItem[] = [];
  for (const [section, sectionLines] of sections) {
    if (section === "skills") {
      const skills = sectionLines.join(",").split(/[,;|•\n]+/).map((value) => value.trim()).filter(Boolean);
      skills.forEach((skill) => items.push(reviewItem(section, sourceId, now, { title: skill })));
      continue;
    }
    const blocks = splitBlocks(sectionLines);
    for (const block of blocks) {
      const combined = block.join("\n").trim();
      if (!combined) continue;
      const range = dateRange(combined);
      const url = combined.match(/https?:\/\/[^\s)]+/i)?.[0] ?? (section === "professionalLinks" ? combined.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "" : "");
      items.push(reviewItem(section, sourceId, now, {
        title: block[0] ?? "",
        organization: section === "experience" || section === "education" ? block[1] ?? "" : "",
        description: section === "experience" || section === "education" ? block.slice(2).filter((line) => !dateRange(line).startDate).join("\n") : block.slice(1).join("\n"),
        startDate: range.startDate, endDate: range.endDate, url,
      }));
    }
  }
  return items;
}
