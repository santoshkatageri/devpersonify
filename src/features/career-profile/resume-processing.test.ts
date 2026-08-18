import { strToU8, zipSync } from "fflate";
import { extractResumeItems, MAX_RESUME_FILE_BYTES, processPastedResume, processResumeFile, ResumeProcessingError } from "./resume-processing";

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
