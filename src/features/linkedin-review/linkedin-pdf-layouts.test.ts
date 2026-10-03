import { mapLinkedInPdfPages, parseLinkedInPdf } from "./linkedin-pdf";

type Line = [x: number, y: number, text: string];

/** Minimal, anonymized PDF byte fixtures exercise PDF.js as well as mapping. */
function documentFile(pages: Line[][]): File {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${4 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  pages.forEach((lines, index) => {
    const stream = lines.map(([x, y, text]) => `BT /F1 12 Tf ${x} ${y} Td (${text.replace(/[\\()]/g, "\\$&")}) Tj ET`).join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const file = new File([pdf], "synthetic-profile.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new TextEncoder().encode(pdf).buffer });
  return file;
}

it("extracts a three-page PDF with two independent continuations and a later main-only page", async () => {
  const result = await parseLinkedInPdf(documentFile([
    [[22, 740, "CONTACT:"], [22, 725, "https://example.test"], [22, 690, "Top Skills (3):"], [22, 675, "C++"], [22, 660, "C#"],
      [224, 740, "Alex Example"], [224, 725, "Platform Engineer"], [224, 690, "Summary"], [224, 675, "Builds developer tools."], [224, 640, "Experience"], [224, 625, "Example Company"], [224, 610, "2021 - Present"], [224, 595, "Maintains services."], [400, 20, "Page 1 of 3"]],
    [[22, 740, "TypeScript"], [22, 700, "Languages"], [22, 685, "English"], [22, 650, "Certifications"], [22, 635, "Cloud Certificate"],
      [224, 740, "Improves incident response."], [224, 710, "Education"], [224, 695, "Example University"], [400, 20, "Page 2 of 3"]],
    [[224, 740, "Computer Science"], [224, 700, "Publications"], [224, 685, "A paper about systems"], [400, 20, "Page 3 of 3"]],
  ]));
  expect(result.pages).toBe(3);
  expect(result.sections.headline).toBe("Alex Example\nPlatform Engineer");
  expect(result.sections.skills.split(/\n+/)).toEqual(["C++", "C#", "TypeScript"]);
  expect(result.sections.experience).toContain("Improves incident response.");
  expect(result.sections.education).toContain("Computer Science");
  expect(result.sections.education).not.toContain("paper");
  expect(result.sections.experience).not.toContain("TypeScript");
  expect(result.unmapped).toContain("Languages\nEnglish");
  expect(result.unmapped).toContain("A paper about systems");
  expect(result.text).not.toMatch(/Page \d of/);
});

it("extracts a single-column PDF without inventing a header or losing unknown sections", async () => {
  const result = await parseLinkedInPdf(documentFile([
    [[40, 740, "Alex Example"], [40, 720, "Unlabelled profile introduction"], [40, 680, "Professional Summary:"], [40, 665, "Builds reliable systems."], [40, 620, "Work Experience:"], [40, 605, "Example Company"], [40, 590, "2022 - Present"]],
    [[40, 740, "Delivered a service migration."], [40, 700, "Academic Background:"], [40, 685, "Example University"], [40, 650, "Volunteering"], [40, 635, "Community mentoring"]],
  ]));
  expect(result.sections.headline).toBe("");
  expect(result.unmapped).toContain("Unlabelled profile introduction");
  expect(result.sections.about).toBe("Builds reliable systems.");
  expect(result.sections.experience).toContain("Delivered a service migration.");
  expect(result.sections.education).toBe("Example University");
  expect(result.unmapped).toContain("Community mentoring");
});

it("recognizes normalized English headings while preserving literal content", () => {
  const result = mapLinkedInPdfPages([[{ left: 40, text: "Summary：\rBuilds Skills: products.\r\nTOP\u00a0SKILLS (2):\nC++\nC#\nLicenses   & Certifications:\nCloud Certificate\nHonors — Awards:\nCommunity Award\nRecommendations (1)\nThoughtful colleague" }]]);
  expect(result.sections.about).toBe("Builds Skills: products.");
  expect(result.sections.skills).toBe("C++\nC#");
  expect(result.sections.certifications).toBe("Cloud Certificate");
  expect(result.sections.endorsements).toBe("Thoughtful colleague");
  expect(result.unmapped).toBe("Honors — Awards:\nCommunity Award");
  expect(result.text).toContain("Licenses   & Certifications:");
});

it("matches already-separated columns by coordinates without mutating their order", () => {
  const pages = [[], [{ left: 224, text: "Alex Example\nEngineer\nSummary\nFirst paragraph" }, { left: 22, text: "Contact Info:\nhttps://example.test\nTop Skills:\nTypeScript" }], [{ left: 230, text: "Summary continuation" }, { left: 28, text: "Go\nLanguages\nEnglish" }]];
  const original = structuredClone(pages);
  const result = mapLinkedInPdfPages(pages);
  expect(result.sections.headline).toBe("Alex Example\nEngineer");
  expect(result.sections.about).toContain("Summary continuation");
  expect(result.sections.skills).toMatch(/TypeScript\s+Go/);
  expect(result.unmapped).toContain("English");
  expect(pages).toEqual(original);
  expect(mapLinkedInPdfPages(pages)).toEqual(result);
});

it("preserves all text in unfamiliar layouts and does not guess an implicit header", () => {
  const pages = [[{ left: 22, text: "Contact\nhttps://example.test" }, { left: 224, text: "Unlabelled name\nSummary\nMy story" }], [{ left: 70, text: "Unexpected shifted column\nPatents\nAn invention" }]];
  const result = mapLinkedInPdfPages(pages);
  expect(result.sections.headline).toBe("");
  for (const phrase of ["Unlabelled name", "My story", "Unexpected shifted column", "An invention"]) expect(result.text).toContain(phrase);
  expect(result.unmapped).toContain("Patents\nAn invention");
});
