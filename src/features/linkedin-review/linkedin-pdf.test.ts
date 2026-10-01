import { mapLinkedInPdfPages, parseLinkedInPdf } from "./linkedin-pdf";
import { profilePdfFixture } from "../../test/pdf-fixture";
function file(bytes: Uint8Array, name = "profile.pdf") {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const result = new File([buffer], name, { type: "application/pdf" });
  Object.defineProperty(result, "arrayBuffer", { value: async () => buffer.slice(0) });
  return result;
}
it("keeps sidebar sections separate from main text continuing across pages", () => {
  const pages = [[{ left: 22, text: "Contact\nwebsite\nTop Skills\nTypeScript\nLanguages\nEnglish\nCertifications\nCloud\nHonors-Awards\nAward" }, { left: 224, text: "Example\nEngineer\nSummary\nStart summary\nPage 1 of 3" }], [{ left: 224, text: "Continue summary\nExperience\nCompany\nPage 2 of 3" }], [{ left: 224, text: "Continue role\nEducation\nUniversity\nPage 3 of 3" }]];
  const result = mapLinkedInPdfPages(pages);
  expect(result.sections.headline).toBe("Example\nEngineer");
  expect(result.sections.about).toContain("Continue summary");
  expect(result.sections.experience).toContain("Continue role");
  expect(result.sections.skills).toBe("TypeScript");
  expect(result.sections.certifications).toBe("Cloud");
  expect(result.sections.education).toBe("University");
  expect(result.unmapped).toContain("Languages\nEnglish");
  expect(result.unmapped).toContain("Honors-Awards\nAward");
  expect(result.text).not.toContain("Page 1 of");
  expect(result.sections.posts).toBe("");
  expect(mapLinkedInPdfPages(pages)).toEqual(result);
});
it("preserves unknown layout text without guessing a header", () => {
  const result = mapLinkedInPdfPages([[{ left: 40, text: "Unlabelled introduction\nSummary\nMy story\nPublications\nMy paper" }]]);
  expect(result.unmapped).toContain("Unlabelled introduction");
  expect(result.unmapped).toContain("My paper");
  expect(result.sections.headline).toBe("");
  expect(result.sections.about).toBe("My story");
});
it("extracts an actual PDF byte stream deterministically", async () => {
  const first = await parseLinkedInPdf(file(profilePdfFixture()));
  expect(first).toEqual(await parseLinkedInPdf(file(profilePdfFixture())));
  expect(Object.values(first.sections).filter(Boolean)).toHaveLength(7);
  expect(first.sections.about).toBe("Private PDF draft sentence.");
  expect(first.sections.skills).toBe("TypeScript");
  expect(first.unmapped).toContain("Community Award");
});
it("rejects invalid, empty, oversized, and broken files without partial results", async () => {
  await expect(parseLinkedInPdf(file(new Uint8Array(), "profile.pdf"))).rejects.toThrow("empty");
  await expect(parseLinkedInPdf(file(profilePdfFixture(), "profile.docx"))).rejects.toThrow("Choose a LinkedIn");
  await expect(parseLinkedInPdf(file(new Uint8Array(5 * 1024 * 1024 + 1)))).rejects.toThrow("5 MB");
  await expect(parseLinkedInPdf(file(new TextEncoder().encode("not a PDF")))).rejects.toThrow("readable PDF");
  await expect(parseLinkedInPdf(file(new TextEncoder().encode("%PDF-1.4\nbroken")))).rejects.toThrow("could not be read");
});
