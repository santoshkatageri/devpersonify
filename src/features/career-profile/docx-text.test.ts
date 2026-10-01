import { strToU8, zipSync } from "fflate";
import { readWordParagraphs } from "./docx-text";
import { processResumeFile } from "./resume-processing";
const namespace = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const p = (text: string, props = "") => `<w:p>${props}<w:r><w:t>${text}</w:t></w:r></w:p>`;
const heading = (text: string) => p(text, '<w:pPr><w:pStyle w:val="Heading2"/></w:pPr>');
const bullet = (text: string) => p(text, '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>');
function bytes(body: string, extras: Record<string, Uint8Array> = {}) { return zipSync({ "word/document.xml": strToU8(`<w:document ${namespace}><w:body>${body}</w:body></w:document>`), ...extras }); }
async function process(body: string, extras: Record<string, Uint8Array> = {}) {
  const data = bytes(body, extras);
  const file = new File([data], "synthetic.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => data.buffer });
  return processResumeFile(file, "2026-10-01T00:00:00Z");
}
describe("structured Word resume input", () => {
  it("separates roles and degrees without requiring blank paragraphs and preserves dates and bullets", async () => {
    const result = await process(p("EXPERIENCE") + heading("Senior Engineer\t2022 – Present") + p("Example Company") + bullet("Built services across multiple regions.") + bullet("Improved reliability.") + heading("Engineer") + p("Earlier Company") + p("2020 - 2022") + bullet("Built tools.") + p("EDUCATION") + heading("MSc Computing") + p("Example University") + p("2018 - 2020") + heading("BSc Computing") + p("Earlier University") + p("2015 - 2018"));
    const experience = result.items.filter((item) => item.section === "experience");
    expect(experience).toHaveLength(2);
    expect(experience[0]).toMatchObject({title:"Senior Engineer",organization:"Example Company",startDate:"2022",endDate:"Present",description:"• Built services across multiple regions.\n• Improved reliability."});
    expect(experience[1]).toMatchObject({title:"Engineer",organization:"Earlier Company",startDate:"2020",endDate:"2022",description:"• Built tools."});
    expect(result.items.filter((item) => item.section === "education").map((item) => [item.title,item.organization])).toEqual([["MSc Computing","Example University"],["BSc Computing","Earlier University"]]);
    expect(result.items.every((item) => item.status === "PENDING")).toBe(true);
  });
  it("reads role/date table rows, run breaks, inherited lists, hyperlinks, and header contact text", async () => {
    const result = await process(p("EXPERIENCE") + `<w:tbl><w:tr><w:tc>${heading("Platform Engineer")}</w:tc><w:tc>${p("2021 - Present")}</w:tc></w:tr></w:tbl>` + p("Example Labs") + '<w:p><w:pPr><w:pStyle w:val="CustomBullet"/></w:pPr><w:r><w:t>Built</w:t><w:tab/><w:t>tools</w:t><w:br/><w:t>across teams.</w:t></w:r></w:p>' + p("LINKS") + '<w:p><w:hyperlink r:id="rLink"><w:r><w:t>Portfolio</w:t></w:r></w:hyperlink></w:p>', {
      "word/styles.xml": strToU8(`<w:styles ${namespace}><w:style w:styleId="CustomBullet"><w:basedOn w:val="ListBase"/></w:style><w:style w:styleId="ListBase"><w:pPr><w:numPr><w:numId w:val="2"/></w:numPr></w:pPr></w:style></w:styles>`),
      "word/header1.xml": strToU8(`<w:hdr ${namespace}>${p("developer@example.dev")}</w:hdr>`),
      "word/_rels/document.xml.rels": strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rLink" Target="https://example.dev/portfolio"/></Relationships>'),
    });
    expect(result.items.find((item) => item.section === "experience")).toMatchObject({title:"Platform Engineer",organization:"Example Labs",startDate:"2021",endDate:"Present",description:"• Built\ttools\nacross teams."});
    expect(result.items.find((item) => item.section === "professionalLinks")?.url).toBe("https://example.dev/portfolio");
    expect(result.document.text).toContain("developer@example.dev");
  });
  it("keeps paragraph content but excludes tracked deletions and never evaluates field instructions", () => {
    const paragraphs = readWordParagraphs(bytes('<w:p><w:r><w:t>Current role</w:t></w:r><w:del><w:r><w:t>Deleted role</w:t></w:r></w:del><w:r><w:instrText>INCLUDETEXT private-file</w:instrText></w:r></w:p>'));
    expect(paragraphs.map((item) => item.text).join(" ")).toContain("Current role");
    expect(paragraphs.map((item) => item.text).join(" ")).not.toMatch(/Deleted|INCLUDETEXT|private-file/);
  });
  it("does not mistake a narrative date in a list for employment dates", async () => {
    const result = await process(p("EXPERIENCE") + heading("Engineer") + p("Example") + bullet("Active contributor 2021–present across teams."));
    expect(result.items[0]?.description).toContain("2021–present");
    expect(result.items[0]?.startDate).toBe("");
    expect(result.items[0]?.endDate).toBe("");
  });
  it("rejects excessive XML expansion before unpacking and guides legacy Word users", async () => {
    expect(() => readWordParagraphs(bytes(p("x".repeat(2 * 1024 * 1024))))).toThrow(/too large/);
    await expect(processResumeFile(new File(["legacy"], "resume.doc"))).rejects.toThrow(/Save your Word resume as .docx/);
  });
});
