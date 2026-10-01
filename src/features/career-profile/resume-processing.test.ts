import { strToU8, zipSync } from "fflate";
import { extractResumeItems, joinPdfPages, pdfTextColumns, MAX_RESUME_FILE_BYTES, processPastedResume, processResumeFile, ResumeProcessingError } from "./resume-processing";

function blobBytes(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

function fileWithArrayBuffer(parts: BlobPart[], name: string, type: string): File {
  const file = new File(parts, name, { type });
  const chunks = parts.map((part) => {
    if (typeof part === "string") return new TextEncoder().encode(part);
    if (part instanceof ArrayBuffer || Object.prototype.toString.call(part) === "[object ArrayBuffer]") return new Uint8Array(part as ArrayBuffer);
    if (ArrayBuffer.isView(part)) return new Uint8Array(part.buffer as ArrayBuffer, part.byteOffset, part.byteLength);
    return new Uint8Array();
  });
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
  let offset = 0;
  chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  Object.defineProperty(file, "arrayBuffer", { value: async () => blobBytes(bytes) });
  return file;
}

function minimalPdf(text: string): Uint8Array {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function validDocx(text: string): Uint8Array {
  return zipSync({
    "[Content_Types].xml": strToU8("<?xml version=\"1.0\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"></Types>"),
    "word/document.xml": strToU8(`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`),
  });
}

const resumeText = `EXPERIENCE
Software Engineer
Example Company
2022 - Present
Built developer tools.

EDUCATION
B.Tech Computer Science
Example University
2018 - 2022

SKILLS
TypeScript, React, AWS

PROJECTS
Evidence Platform
Public project description
https://example.dev/project

CERTIFICATIONS
Cloud Certificate

ACHIEVEMENTS
Community award

LINKS
https://example.dev`;

describe("local resume processing", () => {
  it("processes pasted resume text and extracts reviewable sections", () => {
    const result = processPastedResume(resumeText, "2026-08-18T00:00:00Z");
    expect(result.document.fileType).toBe("PASTED_TEXT");
    expect(result.document.private).toBe(true);
    expect(result.items.some((item) => item.section === "experience")).toBe(true);
    expect(result.items.filter((item) => item.section === "skills").map((item) => item.title)).toEqual(["TypeScript", "React", "AWS"]);
    expect(result.items.every((item) => item.status === "PENDING" && item.provenance.source === "RESUME_PROVIDED")).toBe(true);
  });

  it("retains description bullet boundaries for later export without adding markers to titles", () => {
    const items = extractResumeItems("EXPERIENCE\n• Platform Engineer\nExample Company\n2022 - Present\n• Built services across\nmultiple regions.\n• Reduced latency.", "resume:synthetic");
    expect(items[0]?.title).toBe("Platform Engineer");
    expect(items[0]?.description).toBe("• Built services across\nmultiple regions.\n• Reduced latency.");
  });

  it("processes a valid UTF-8 TXT file", async () => {
    const result = await processResumeFile(fileWithArrayBuffer([resumeText], "resume.txt", "text/plain"));
    expect(result.document.fileType).toBe("TXT");
    expect(result.items.length).toBeGreaterThan(5);
  });

  it("processes a valid DOCX file locally", async () => {
    const result = await processResumeFile(fileWithArrayBuffer([blobBytes(validDocx("SKILLS\nTypeScript, Go"))], "resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
    expect(result.document.fileType).toBe("DOCX");
    expect(result.document.text).toContain("SKILLS");
  });

  it("processes a valid text PDF locally", async () => {
    const result = await processResumeFile(fileWithArrayBuffer([blobBytes(minimalPdf("SKILLS TypeScript"))], "resume.pdf", "application/pdf"));
    expect(result.document.fileType).toBe("PDF");
    expect(result.document.text).toContain("SKILLS TypeScript");
  });

  it("preserves PDF line endings, adjacent text fragments, and paragraph spacing", () => {
    const item = (str: string, x: number, y: number, hasEOL = false) => ({ str, transform: [10, 0, 0, 10, x, y], width: str.length * 5, height: 10, hasEOL });
    const columns = pdfTextColumns([
      item("EXPERIENCE", 40, 700, true),
      item("Software", 40, 680), item(" Engineer", 80, 680, true),
      item("Example Company", 40, 667, true),
      item("2022 - Present", 40, 654, true),
      item("Built reliable services.", 40, 641, true),
      item("Platform Engineer", 40, 615, true),
      item("Another Company", 40, 602, true),
      item("2020 - 2022", 40, 589, true),
      item("Shipped a platform.", 40, 576, true),
    ], 600);
    const text = joinPdfPages([columns]);
    expect(text).toContain("Software Engineer\nExample Company");
    expect(text).toContain("Built reliable services.\n\nPlatform Engineer");
    const jobs = extractResumeItems(text, "resume:synthetic");
    expect(jobs).toHaveLength(2);
    expect(jobs.map((job) => job.title)).toEqual(["Software Engineer", "Platform Engineer"]);
    expect(jobs.every((job) => job.section === "experience")).toBe(true);
    expect(jobs[0]?.startDate).toBe("2022");
  });

  it("uses geometry for PDFs without EOL markers and does not add spaces inside words", () => {
    const item = (str: string, x: number, y: number) => ({ str, transform: [10, 0, 0, 10, x, y], width: str.length * 5, height: 10, hasEOL: false });
    const columns = pdfTextColumns([item("SKILLS", 40, 700), item("Type", 40, 685), item("Script", 60, 685), item("React", 95, 685)], 600);
    expect(columns[0]?.text).toBe("SKILLS\nTypeScript React");
  });

  it("keeps two-column PDF continuations together across pages", () => {
    const item = (str: string, x: number, y: number) => ({ str, transform: [10, 0, 0, 10, x, y], width: str.length * 5, height: 10, hasEOL: true });
    const first = pdfTextColumns([
      item("EXPERIENCE", 40, 700), item("Software Engineer", 40, 685),
      item("Example Company", 40, 670), item("Built tools.", 40, 655),
      item("SKILLS", 370, 700), item("TypeScript, React", 370, 685),
      item("EDUCATION", 370, 500), item("Computer Science", 370, 485),
      item("Example University", 370, 470),
    ], 600);
    const second = pdfTextColumns([
      item("Improved reliability.", 40, 700), item("PROJECTS", 40, 500), item("Demo Platform", 40, 485),
      item("CERTIFICATIONS", 370, 700), item("Cloud Certificate", 370, 685),
    ], 600);
    expect(first).toHaveLength(2);
    const text = joinPdfPages([first, second]);
    expect(text.indexOf("Improved reliability.")).toBeLessThan(text.indexOf("SKILLS"));
    expect(text).toContain("Built tools.\nImproved reliability.");
    const items = extractResumeItems(text, "resume:synthetic");
    expect(items.filter((entry) => entry.section === "experience")).toHaveLength(1);
    expect(items.find((entry) => entry.section === "experience")?.description).toContain("Improved reliability.");
    expect(items.some((entry) => entry.section === "skills" && entry.title === "TypeScript")).toBe(true);
    expect(items.some((entry) => entry.section === "education" && entry.title === "Computer Science")).toBe(true);
    expect(items.filter((entry) => entry.section === "education").some((entry) => entry.description.includes("Improved reliability"))).toBe(false);
  });

  it("recognizes only whole section headings, not words in descriptions", () => {
    const items = extractResumeItems("EXPERIENCE\nSoftware Engineer\nExample Company\nExperience building developer tools\nImproved employment workflows\nTechnical skills include testing\n\nKEY ACHIEVEMENTS\nCommunity award\n\nFOCUS AREAS\nReliability", "resume:synthetic");
    expect(items[0]?.description).toContain("Experience building developer tools");
    expect(items[0]?.description).toContain("Technical skills include testing");
    expect(items.some((entry) => entry.section === "skills")).toBe(false);
    expect(items.find((entry) => entry.section === "achievements")?.title).toBe("Community award");
    expect(items.find((entry) => entry.section === "other")?.title).toBe("Reliability");
  });

  it("retains substantive experience sentences containing date ranges", () => {
    const items = extractResumeItems("EXPERIENCE\nSoftware Engineer\nExample Company\n2020 - 2024\nMaintained the library during 2021–present and mentored contributors.\nDelivered tools from Jan 2022 to Dec 2023 for the team.", "resume:synthetic");
    expect(items[0]?.description).toBe("Maintained the library during 2021–present and mentored contributors.\nDelivered tools from Jan 2022 to Dec 2023 for the team.");
    expect(items[0]?.startDate).toBe("2020");
    expect(items[0]?.endDate).toBe("2024");
  });

  it("rejects unsupported, oversized, empty, and malformed files with typed failures", async () => {
    await expect(processResumeFile(fileWithArrayBuffer(["resume"], "resume.rtf", "application/rtf"))).rejects.toMatchObject({ code: "UNSUPPORTED_FILE" });
    const oversized = fileWithArrayBuffer([new Uint8Array(MAX_RESUME_FILE_BYTES + 1)], "resume.txt", "text/plain");
    await expect(processResumeFile(oversized)).rejects.toMatchObject({ code: "OVERSIZED_FILE" });
    await expect(processResumeFile(fileWithArrayBuffer([], "empty.txt", "text/plain"))).rejects.toMatchObject({ code: "EMPTY_DOCUMENT" });
    await expect(processResumeFile(fileWithArrayBuffer(["not a zip"], "broken.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))).rejects.toMatchObject({ code: "MALFORMED_FILE" });
    await expect(processResumeFile(fileWithArrayBuffer(["not a pdf"], "broken.pdf", "application/pdf"))).rejects.toBeInstanceOf(ResumeProcessingError);
  });

  it("keeps malicious resume content as text review evidence", () => {
    const items = extractResumeItems("PROJECTS\n<script>alert(1)</script>\n[job](javascript:alert(1))", "resume:test");
    expect(items[0]?.title).toBe("<script>alert(1)</script>");
    expect(items[0]?.description).toContain("javascript:alert");
  });

  it("rejects empty pasted text", () => {
    expect(() => processPastedResume("  \n ")).toThrowError(ResumeProcessingError);
  });
});
