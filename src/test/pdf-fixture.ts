/** Synthetic PDF only; never include a person's profile in test fixtures. */
export function profilePdfFixture(): Uint8Array {
  const lines: Array<[number, number, string]> = [
    [22, 740, "Contact"], [22, 720, "https://example.test"], [22, 680, "Top Skills"], [22, 660, "TypeScript"],
    [22, 620, "Languages"], [22, 600, "English"], [22, 560, "Certifications"], [22, 540, "Cloud Certificate"],
    [22, 500, "Honors-Awards"], [22, 480, "Community Award"],
    [224, 740, "Example Developer"], [224, 720, "Platform Engineer"], [224, 680, "Summary"], [224, 660, "Private PDF draft sentence."],
    [224, 620, "Experience"], [224, 600, "Example Company"], [224, 580, "2022 - Present"],
    [224, 540, "Education"], [224, 520, "Example University"], [400, 20, "Page 1 of 1"],
  ];
  const stream = lines.map(([x, y, text]) => `BT /F1 12 Tf ${x} ${y} Td (${text}) Tj ET`).join("\n");
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
