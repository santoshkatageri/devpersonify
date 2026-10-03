import { readWordParagraphs, type WordParagraph } from "./docx-text";
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
  [/^(?:(?:work|professional)\s+experience|experience|employment|employment history|work history)$/i, "experience"],
  [/^(?:education|academic background)$/i, "education"],
  [/^(?:(?:technical\s+)?skills|technologies|tech stack)$/i, "skills"],
  [/^(?:(?:selected|personal)\s+projects|projects)$/i, "projects"],
  [/^(?:certifications?|licenses?)$/i, "certifications"],
  [/^(?:(?:key\s+)?achievements?|awards?|honors?|accomplishments)$/i, "achievements"],
  [/^(?:(?:professional\s+)?links|profiles|contact)$/i, "professionalLinks"],
  [/^(?:(?:professional\s+)?summary|profile|objective|focus areas|references|interests|languages)$/i, "other"],
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

type PdfTextItem = { str: string; transform: number[]; width: number; height: number; hasEOL: boolean };
type PdfColumn = { left: number; text: string };

/** Keep the PDF's content order: sorting every item by Y interleaves resume columns. */
export function pdfTextColumns(items: Array<PdfTextItem | object>, pageWidth: number): PdfColumn[] {
  const columns: PdfTextItem[][] = [[]];
  let previous: PdfTextItem | undefined;
  for (const item of items) {
    if (!("str" in item) || !("transform" in item)) continue;
    const textItem = item as PdfTextItem;
    if (textItem.str.trim()) {
      // A large jump up and right marks a separately painted sidebar/column.
      if (previous && textItem.transform[5]! - previous.transform[5]! > Math.max(40, previous.height * 4)
        && textItem.transform[4]! - previous.transform[4]! > pageWidth * 0.2) columns.push([]);
      previous = textItem;
    }
    columns[columns.length - 1]!.push(textItem);
  }
  return columns.filter((column) => column.some((item) => item.str.trim())).map((column) => {
    const left = Math.min(...column.filter((item) => item.str.trim()).map((item) => item.transform[4]!));
    const lines: Array<{ text: string; x: number; y: number; height: number }> = [];
    let line: typeof lines[number] | undefined;
    let right = 0;
    const flush = () => { if (line?.text.trim()) lines.push(line); line = undefined; };
    for (const item of column) {
      const x = item.transform[4]!;
      const y = item.transform[5]!;
      if (item.str.trim()) {
        if (line && Math.abs(y - line.y) > Math.max(item.height, line.height, 1) * 0.65) flush();
        if (!line) line = { text: "", x, y, height: item.height };
        const needsSpace = line.text && !/\s$/.test(line.text) && !/^\s/.test(item.str)
          && x - right > Math.max(item.height, line.height, 1) * 0.12;
        line.text += (needsSpace ? " " : "") + item.str;
        line.height = Math.max(line.height, item.height);
        right = x + item.width;
      } else if (line && item.str) line.text += " ";
      if (item.hasEOL) flush();
    }
    flush();
    return { left, text: lines.map((current, index) => {
      const before = lines[index - 1];
      const paragraphBreak = before && before.y - current.y > Math.max(before.height, current.height, 1) * 1.7
        && current.x <= left + Math.max(current.height, 1) * 0.4;
      return (paragraphBreak ? "\n" : "") + current.text.trim();
    }).join("\n") };
  });
}

export function joinPdfPages(pages: PdfColumn[][]): string {
  // When the same one or two columns continue, finish each column first.
  // This keeps a main-column job from being appended to a sidebar's education.
  // A page boundary alone is not a new paragraph/job; preserve paragraph
  // boundaries from the actual text instead of adding another blank line.
  const first = pages[0];
  const continuedColumns = first && [1, 2].includes(first.length) && pages.every((page) => page.length === first.length
    && page.every((column, index) => Math.abs(column.left - first[index]!.left) < 20));
  return continuedColumns
    ? first.map((_, index) => pages.map((page) => page[index]!.text).join("\n")).join("\n\n")
    : pages.map((page) => page.map((column) => column.text).join("\n\n")).join("\n\n");
}

async function parsePdf(data: Uint8Array): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    if (typeof Worker !== "undefined") pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const document = await pdfjs.getDocument({ data, isEvalSupported: false, useWorkerFetch: false }).promise;
    const pages: PdfColumn[][] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(pdfTextColumns(content.items, page.getViewport({ scale: 1 }).width));
    }
    await document.destroy();
    return ensureText(joinPdfPages(pages));
  } catch (error) {
    if (error instanceof ResumeProcessingError) throw error;
    throw new ResumeProcessingError("MALFORMED_FILE", "The PDF could not be read locally. Use the paste-text fallback.", { cause: error });
  }
}

function parseDocx(data: Uint8Array): string {
  try {
    const paragraphs = readWordParagraphs(data);
    const output: string[] = [];
    let section: CareerSection = "other";
    let block: WordParagraph[] = [];
    const flush = () => {
      if (!block.length) return;
      if (section === "experience" || section === "education") {
        // Keep metadata separate from descriptions, including dates beside a
        // title in a tab stop or a table cell.
        const dates: string[] = [];
        const lines = block.flatMap((paragraph, index) => {
          if (index > 2 || paragraph.list) return [paragraph.text];
          const match = paragraph.text.match(dateRangePattern);
          if (!match || !(match[0].trim() === paragraph.text.trim() || (index < 2 && paragraph.text.length < 180 && paragraph.text.trim().endsWith(match[0])))) return [paragraph.text];
          dates.push(match[0]);
          const text = paragraph.text.replace(match[0], "").replace(/^[\s|–—-]+|[\s|–—-]+$/g, "");
          return text ? [text] : [];
        });
        output.push(...lines.slice(0, 2), ...dates, ...lines.slice(2), "");
      } else output.push(...block.map((item) => item.text), "");
      block = [];
    };
    paragraphs.forEach((paragraph, index) => {
      const heading = sectionForHeading(paragraph.text);
      if (heading) { flush(); section = heading; output.push(paragraph.text); return; }
      if (!paragraph.text) { flush(); return; }
      const hasDescription = block.some((item) => item.list);
      const hasDates = block.some((item) => dateRangePattern.test(item.text));
      const next = paragraphs[index + 1];
      const datedEntry = dateRangePattern.test(paragraph.text) || Boolean(next && !next.list && dateRangePattern.test(next.text));
      const recordSection = ["experience", "education", "projects", "certifications", "achievements"].includes(section);
      if (recordSection && block.length && !paragraph.list && (paragraph.entryHeading || ((hasDescription || hasDates) && (datedEntry || (paragraph.bold && hasDescription))))) flush();
      block.push(paragraph);
    });
    flush();
    return ensureText(output.join("\n"));
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
  if (!supportedExtensions.has(fileExtension) || (file.type && !supportedMimeTypes[fileExtension]?.includes(file.type.toLowerCase()))) throw new ResumeProcessingError("UNSUPPORTED_FILE", fileExtension === "doc" ? "Older .doc files are not supported. Save your Word resume as .docx and try again." : "Use a Word (.docx) resume for best results. PDF and UTF-8 TXT are also supported.");
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
    } else block.push(line.trim());
  }
  if (block.length) blocks.push(block);
  return blocks;
}

const dateRangePattern = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(19|20)\d{2}\s*(?:-|–|—|to)\s*(((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(19|20)\d{2}|present|current)/i;

function dateRange(value: string): { startDate: string; endDate: string } {
  const match = value.match(dateRangePattern);
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
      const isDateLine = (line: string) => line.match(dateRangePattern)?.[0].trim() === line.trim();
      const range = dateRange(block.filter((line, index) => (index < 2 && !/^[•●▪◦*-]\s/.test(line)) || isDateLine(line)).join("\n"));
      const organization = (section === "experience" || section === "education") && block[1] && !/^[•●▪◦*-]\s/.test(block[1]) && !isDateLine(block[1]) ? block[1] : "";
      const url = combined.match(/https?:\/\/[^\s)]+/i)?.[0] ?? (section === "professionalLinks" ? combined.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "" : "");
      items.push(reviewItem(section, sourceId, now, {
        title: (block[0] ?? "").replace(/^[•●▪◦*-]\s*/, ""),
        organization,
        description: section === "experience" || section === "education" ? block.slice(organization ? 2 : 1).filter((line) => {
          const rangeMatch = line.match(dateRangePattern);
          return !rangeMatch || rangeMatch[0].trim() !== line.trim();
        }).join("\n") : block.slice(1).join("\n"),
        startDate: range.startDate, endDate: range.endDate, url,
      }));
    }
  }
  return items;
}
