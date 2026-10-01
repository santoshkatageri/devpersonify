import { strToU8, zipSync } from "fflate";
import type { CareerEvidenceProfile, CareerRecord } from "../../domain/career-evidence-profile";
import type { LatexResumeConfiguration, ResumeSectionKey } from "../../domain/latex-resume";
import { isValidResumeContact, normalizeSafeHttpUrl, resolveResumeContent } from "./latex-generator";
import { resumeDescriptionParagraphs, resumeRecordParagraphs } from "./resume-paragraphs";
import { presentationValue } from "./resume-configuration";

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface DocxResumeEntry {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  description: string[];
  technologies: string;
  url: string;
}

export interface DocxResumeSection {
  key: ResumeSectionKey;
  title: string;
  paragraphs: string[];
  entries: DocxResumeEntry[];
}

export interface DocxResumeModel {
  name: string;
  headline: string;
  contact: Array<{ label: string; value: string; url: string }>;
  sections: DocxResumeSection[];
}

const xmlEscape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const splitDescription = resumeDescriptionParagraphs;
const dateRange = (record: CareerRecord) => [record.startDate, record.endDate].filter(Boolean).join(" – ");

function resolvedRecord(record: CareerRecord, type: string, config: LatexResumeConfiguration, profile: CareerEvidenceProfile): DocxResumeEntry {
  return {
    id: record.id,
    title: presentationValue(config, `${type}:${record.id}:title`, record.title),
    subtitle: presentationValue(config, `${type}:${record.id}:organization`, record.organization ?? ""),
    meta: dateRange(record),
    description: resumeRecordParagraphs(profile, config, type, record),
    technologies: presentationValue(config, `${type}:${record.id}:technologies`, record.technologies.join(", ")),
    url: normalizeSafeHttpUrl(record.url ?? "") ?? "",
  };
}

export function buildDocxResumeModel(profile: CareerEvidenceProfile, config: LatexResumeConfiguration): DocxResumeModel {
  const content = resolveResumeContent(profile, config);
  const sections: DocxResumeSection[] = [];
  const add = (key: ResumeSectionKey, title: string, paragraphs: string[] = [], entries: DocxResumeEntry[] = []) => { if (paragraphs.length || entries.length) sections.push({ key, title, paragraphs, entries }); };
  for (const section of config.sections) {
    if (!section.enabled || section.key === "header") continue;
    if (section.key === "summary") add(section.key, "Summary", content.summary ? [content.summary] : []);
    if (section.key === "experience") add(section.key, "Experience", [], content.experience.map((item) => resolvedRecord(item, "experience", config, profile)));
    if (section.key === "skills") add(section.key, "Skills", content.skills.length ? [`${presentationValue(config, "skills:groupLabel", "Technical Skills")}: ${content.skills.map((skill) => presentationValue(config, `skills:${skill.id}:name`, skill.name)).join(", ")}`] : []);
    if (section.key === "projects") add(section.key, "Selected Projects", [], content.projects.map((project) => ({ id: project.id, title: project.title, subtitle: project.technologies.join(", "), meta: "", description: splitDescription(project.description), technologies: "", url: normalizeSafeHttpUrl(project.url) ?? "" })));
    if (section.key === "education") add(section.key, "Education", [], content.education.map((item) => resolvedRecord(item, "education", config, profile)));
    if (section.key === "certifications") add(section.key, "Certifications", [], content.certifications.map((item) => resolvedRecord(item, "certifications", config, profile)));
    if (section.key === "achievements") add(section.key, "Achievements", [], content.achievements.map((item) => resolvedRecord(item, "achievements", config, profile)));
    if (section.key === "openSource") add(section.key, "Open Source", [], content.openSource.map((project) => ({ id: project.id, title: project.title, subtitle: project.technologies.join(", "), meta: "", description: splitDescription(project.description), technologies: "", url: normalizeSafeHttpUrl(project.url) ?? "" })));
    if (section.key === "links") add(section.key, "Links", [], content.links.flatMap((link) => {
      if (link.label === "Email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link.value)) return [{ id: link.id, title: `Email: ${link.value}`, subtitle: "", meta: "", description: [], technologies: "", url: "" }];
      const url = normalizeSafeHttpUrl(link.value);
      return url ? [{ id: link.id, title: link.label, subtitle: "", meta: "", description: [], technologies: "", url }] : [];
    }));
  }
  const headerEnabled = config.sections.find((section) => section.key === "header")?.enabled ?? false;
  return {
    name: headerEnabled ? content.name : "",
    headline: headerEnabled ? content.headline : "",
    contact: headerEnabled ? [
      ...(content.location ? [{ label: "Location", value: content.location, url: "" }] : []),
      ...content.links.filter(isValidResumeContact).map((link) => ({ label: link.label, value: link.value, url: normalizeSafeHttpUrl(link.value) ?? "" })),
    ] : [],
    sections,
  };
}

function run(text: string, options: { bold?: boolean; italic?: boolean; size?: number; color?: string } = {}) {
  const properties = ['<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/>', `<w:sz w:val="${options.size ?? 22}"/><w:szCs w:val="${options.size ?? 22}"/>`, options.bold ? "<w:b/>" : "", options.italic ? "<w:i/>" : "", options.color ? `<w:color w:val="${options.color}"/>` : ""].join("");
  return `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ""}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function paragraph(content: string, style = "Normal", align = "left", spacingAfter = 80) {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/><w:jc w:val="${align}"/><w:spacing w:after="${spacingAfter}"/></w:pPr>${content}</w:p>`;
}

export function generateDocxResume(profile: CareerEvidenceProfile, config: LatexResumeConfiguration): { bytes: Uint8Array; model: DocxResumeModel; mimeType: typeof DOCX_MIME_TYPE; filename: string } {
  const model = buildDocxResumeModel(profile, config);
  const relationships: string[] = [];
  let relationshipIndex = 2;
  const hyperlink = (url: string, label: string, bold = false) => {
    if (!url) return run(label, { bold, color: "1F3BA3" });
    const id = `rId${relationshipIndex++}`;
    relationships.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xmlEscape(url)}" TargetMode="External"/>`);
    return `<w:hyperlink r:id="${id}">${run(label, { bold, color: "1F3BA3" })}</w:hyperlink>`;
  };
  const body: string[] = [];
  if (model.name) body.push(paragraph(run(model.name, { bold: true, size: 34 }), "Title", "center", 20));
  if (model.headline) body.push(paragraph(run(model.headline, { size: 22, color: "404A5A" }), "Subtitle", "center", 30));
  if (model.contact.length) body.push(paragraph(model.contact.map((item, index) => `${index ? run("  |  ", { color: "777777" }) : ""}${item.url ? hyperlink(item.url, item.label) : run(item.value)}`).join(""), "Contact", "center", 140));
  for (const section of model.sections) {
    body.push(paragraph(run(section.title.toUpperCase(), { bold: true, size: 22 }), "Heading1", "left", 60));
    section.paragraphs.forEach((text) => body.push(paragraph(run(text), "Normal", "left", 80)));
    section.entries.forEach((entry) => {
      const title = entry.url ? hyperlink(entry.url, entry.title, true) : run(entry.title, { bold: true });
      const right = entry.meta ? run(`  ${entry.meta}`, { color: "555555" }) : "";
      body.push(paragraph(`${title}${right}`, "EntryTitle", "left", 20));
      if (entry.subtitle) body.push(paragraph(run(entry.subtitle, { italic: true, color: "404A5A" }), "EntrySubtitle", "left", 60));
      entry.description.forEach((text) => body.push(paragraph(run(`• ${text}`), "Bullet", "left", 60)));
      if (entry.technologies) body.push(paragraph(run(`Technologies: ${entry.technologies}`, { italic: true, color: "555555" }), "EntryMeta", "left", 60));
    });
  }
  body.push("<w:sectPr><w:pgSz w:w=\"12240\" w:h=\"15840\"/><w:pgMar w:top=\"936\" w:right=\"936\" w:bottom=\"936\" w:left=\"936\" w:header=\"360\" w:footer=\"360\" w:gutter=\"0\"/></w:sectPr>");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join("")}</w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:widowControl/><w:spacing w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Contact"><w:name w:val="Contact"/><w:basedOn w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="60"/><w:pBdr><w:bottom w:val="single" w:sz="4" w:color="7B8794"/></w:pBdr></w:pPr></w:style><w:style w:type="paragraph" w:styleId="EntryTitle"><w:name w:val="Entry Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="EntrySubtitle"><w:name w:val="Entry Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="EntryMeta"><w:name w:val="Entry Meta"/><w:basedOn w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:keepLines/><w:ind w:left="360" w:hanging="180"/></w:pPr></w:style></w:styles>`;
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${relationships.join("")}</Relationships>`;
  const bytes = zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
    "word/document.xml": strToU8(documentXml),
    "word/styles.xml": strToU8(stylesXml),
    "word/_rels/document.xml.rels": strToU8(relsXml),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Evidence-backed resume</dc:title><dc:creator>DevPersonify</dc:creator></cp:coreProperties>`),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>DevPersonify</Application></Properties>`),
  }, { level: 6 });
  return { bytes, model, mimeType: DOCX_MIME_TYPE, filename: `${profile.username}-resume.docx` };
}
