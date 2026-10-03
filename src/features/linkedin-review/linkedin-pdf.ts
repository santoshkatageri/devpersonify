import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { pdfTextColumns } from "../career-profile/resume-processing";
import { emptyLinkedInSections, LINKEDIN_TEXT_LIMIT, type LinkedInSectionKey, type LinkedInSections } from "./linkedin-sections";

export const LINKEDIN_PDF_MAX_BYTES = 5 * 1024 * 1024;
export const LINKEDIN_PDF_MAX_PAGES = 20;
export interface LinkedInPdfImport {
  sections: LinkedInSections;
  text: string;
  unmapped: string;
  pages: number;
}
type Column = { left: number; text: string };
const headings: Record<string, LinkedInSectionKey> = {
  headline: "headline", header: "headline", summary: "about", about: "about", "professional summary": "about",
  experience: "experience", "work experience": "experience", "professional experience": "experience",
  education: "education", "academic background": "education", "top skills": "skills", skills: "skills",
  contact: "contact", "contact info": "contact", "contact information": "contact",
  certifications: "certifications", "licenses & certifications": "certifications",
  "licenses and certifications": "certifications", recommendations: "endorsements", endorsements: "endorsements",
  projects: "featured", featured: "featured", posts: "posts", activity: "posts",
};
const extraHeadings = /^(languages|honors\s*[-–—]\s*awards|honors(?: and| &)? awards|publications|patents|volunteer experience|volunteering|organizations|interests|courses|test scores)$/i;
// Normalize headings only: keep the person's spelling, punctuation and spacing
// in extracted content unchanged. Counts occur in copied profile headings.
const normalizeHeading = (line: string) => line.normalize("NFKC").trim().replace(/:$/, "").replace(/\s*\(\d+\)$/, "").replace(/\s+/g, " ").trim().toLowerCase();
const clean = (text: string) => text.replaceAll("\u0000", "").replace(/\r\n?/g, "\n").split("\n").filter((line) => !/^\s*Page\s+\d+\s+of\s+\d+\s*$/i.test(line)).join("\n").trim();

/** Fixed English heading rules. Keep sidebar and main-column continuations separate. */
export function mapLinkedInPdfPages(pages: Column[][]): LinkedInPdfImport {
  const sections = emptyLinkedInSections();
  // Coordinates identify already-separated columns regardless of their order;
  // never mutate the caller's page/column order.
  const first = pages.find((page) => page.some((column) => clean(column.text)))?.slice().sort((a, b) => a.left - b.left);
  // Only recognize the export layout when there are two columns and explicit
  // sidebar headings. Unknown layouts retain their text for manual review.
  const twoColumns = first?.length === 2 && clean(first[0]!.text).split("\n").some((line) => ["contact", "contact info", "contact information", "top skills"].includes(normalizeHeading(line)))
    && first[1]!.left - first[0]!.left > 80;
  const streams: Array<{ text: string; header: boolean }> = [];
  if (twoColumns && pages.every((page) => page.every((column) =>
    Math.min(Math.abs(column.left - first[0]!.left), Math.abs(column.left - first[1]!.left)) < 25))) {
    for (let side = 0; side < 2; side++) streams.push({
      text: pages.flatMap((page) => page.filter((column) => Math.abs(column.left - first[side]!.left) < 25).map((column) => clean(column.text))).join("\n\n"),
      header: side === 1,
    });
  } else streams.push({ text: pages.flatMap((page) => page.map((column) => clean(column.text))).join("\n\n"), header: false });
  const unmapped: string[] = [];
  for (const stream of streams) {
    let key: LinkedInSectionKey | null = stream.header ? "headline" : null;
    for (const line of stream.text.split("\n")) {
      const heading = normalizeHeading(line);
      if (headings[heading]) key = headings[heading];
      else if (extraHeadings.test(heading)) { key = null; unmapped.push(line); }
      else if (key) sections[key] += `${sections[key] ? "\n" : ""}${line}`;
      else unmapped.push(line);
    }
  }
  for (const key of Object.keys(sections) as LinkedInSectionKey[]) sections[key] = sections[key].trim();
  return { sections, text: streams.map((stream) => stream.text).join("\n\n"), unmapped: unmapped.join("\n").trim(), pages: pages.length };
}

/** No inference, OCR, remote requests, or profile persistence. */
export async function parseLinkedInPdf(file: File): Promise<LinkedInPdfImport> {
  if (!/\.pdf$/i.test(file.name) || (file.type && !["application/pdf", "application/octet-stream"].includes(file.type))) throw new Error("Choose a LinkedIn profile PDF (.pdf).");
  if (file.size > LINKEDIN_PDF_MAX_BYTES) throw new Error("Choose a PDF smaller than 5 MB, or paste the sections you want reviewed.");
  if (!file.size) throw new Error("This PDF is empty. Export your profile again.");
  const data = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(data.slice(0, 1024)).includes("%PDF-")) throw new Error("This file does not contain a readable PDF. Export your profile again.");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (typeof Worker !== "undefined") pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const task = pdfjs.getDocument({ data, isEvalSupported: false, useWorkerFetch: false });
  try {
    const document = await task.promise;
    if (document.numPages > LINKEDIN_PDF_MAX_PAGES) throw new Error("This PDF exceeds 20 pages. Paste the sections you want reviewed instead.");
    const pages: Column[][] = [];
    let characters = 0;
    for (let n = 1; n <= document.numPages; n++) {
      const page = await document.getPage(n);
      const content = await page.getTextContent();
      const columns = pdfTextColumns(content.items, page.getViewport({ scale: 1 }).width);
      characters += columns.reduce((sum, column) => sum + column.text.length, 0);
      if (characters > LINKEDIN_TEXT_LIMIT) throw new Error("This PDF exceeds 30,000 characters. Paste a smaller selection instead.");
      pages.push(columns);
      page.cleanup();
    }
    const result = mapLinkedInPdfPages(pages);
    if (!result.text.trim()) throw new Error("No selectable text was found. Scanned PDFs are not supported; copy your profile text instead.");
    if (result.text.length > LINKEDIN_TEXT_LIMIT) throw new Error("This PDF exceeds 30,000 characters. Paste a smaller selection instead.");
    return result;
  } catch (error) {
    if (error instanceof Error && /^(This PDF|No selectable)/.test(error.message)) throw error;
    throw new Error("This PDF could not be read. Use an unlocked LinkedIn export, or paste your profile text.");
  } finally { await task.destroy(); }
}
