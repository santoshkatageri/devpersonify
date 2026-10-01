import { strFromU8, unzipSync } from "fflate";
import type { CareerEvidenceProfile, CareerRecord, EvidenceValue } from "../../domain/career-evidence-profile";
import { buildDocxResumeModel, DOCX_MIME_TYPE, generateDocxResume } from "./docx-generator";
import { calculateResumeReadiness, generateLatexResume } from "./latex-generator";
import { createLatexResumeConfiguration, moveResumeSection, moveSelectedContent, setContentSelected, setResumeOverride, toggleResumeSection } from "./resume-configuration";

const now = "2026-08-18T00:00:00Z";
const source = (type: "GITHUB_OBSERVED" | "RESUME_PROVIDED" | "USER_PROVIDED", id: string) => ({ source: type, sourceId: id, observedAt: now });
const value = <T,>(id: string, data: T): EvidenceValue<T> => ({ id, value: data, provenance: [source("USER_PROVIDED", id)], updatedAt: now });
const record = (id: string, title: string, extra: Partial<CareerRecord> = {}): CareerRecord => ({ id, title, technologies: [], provenance: [source("RESUME_PROVIDED", id)], updatedAt: now, ...extra });

function career(mode: "empty" | "minimal" | "complete" = "complete"): CareerEvidenceProfile {
  const profile: CareerEvidenceProfile = { schemaVersion: 1, id: "career:docx", username: mode === "empty" ? "" : "developer", createdAt: now, updatedAt: now, identity: {}, careerDirection: {}, experience: [], education: [], skills: [], projects: [], certifications: [], achievements: [], professionalLinks: [], other: [], githubEvidence: { username: mode === "empty" ? "" : "developer", profileUrl: mode === "empty" ? "" : "https://github.com/developer", observedAt: now, repositories: [] }, resumeReview: [], userProvided: [], derived: { comparisons: [], completeness: [], sourceCoverage: { github: "NONE", resume: "NONE", userProvided: "NONE", crossSourceSupport: 0, potentialGaps: 0 }, generatedAt: now }, sectionPreferences: { headline: true, summary: true, experience: true, selectedProjects: true, skills: true, education: true, certifications: true, achievements: true, links: true } };
  if (mode === "empty") return profile;
  profile.identity.name = value("name", "Ananya José Rao");
  profile.identity.website = value("website", "https://example.dev/profile?q=word&lang=en#work");
  profile.careerDirection.professionalHeadline = value("headline", "Platform Engineer | C# & Cloud");
  if (mode === "minimal") return profile;
  profile.careerDirection.shortIntroduction = value("summary", "Evidence-backed summary & safe <script>alert(1)</script>");
  profile.experience = [record("exp1", "Senior Engineer", { organization: "R&D Labs", startDate: "2022", endDate: "Present", description: "Improved reliability by 25%.\nBuilt C# services.", technologies: ["C#", "Kubernetes"] })];
  profile.skills = [{ id: "skill1", name: "TypeScript", normalizedName: "typescript", provenance: [source("RESUME_PROVIDED", "skill1")], githubRepositoryIds: ["repo1"], updatedAt: now }, { id: "skill2", name: "C#", normalizedName: "c#", provenance: [source("USER_PROVIDED", "skill2")], githubRepositoryIds: [], updatedAt: now }];
  profile.githubEvidence.repositories = [{ repositoryId: "repo1", name: "weather_forecast", url: "https://github.com/developer/weather_forecast", description: "Weather dashboard | local", language: "TypeScript", topics: [], isFork: false, selectedForPortfolio: true, selectedForShowcase: true, provenance: source("GITHUB_OBSERVED", "repo1") }, { repositoryId: "repo2", name: "unsafe", url: "javascript:alert(1)", description: "Unsafe URL project", topics: [], isFork: false, selectedForPortfolio: true, selectedForShowcase: false, provenance: source("GITHUB_OBSERVED", "repo2") }];
  profile.education = [record("edu1", "B.Tech — Computer Science", { organization: "University & College" })];
  profile.certifications = [record("cert1", "Cloud Professional")];
  profile.achievements = [record("ach1", "Top 5%", { description: "Awarded for impact" })];
  return profile;
}

function documentXml(bytes: Uint8Array) { const files = unzipSync(bytes); return { files, xml: strFromU8(files["word/document.xml"]!) }; }

describe("browser-local DOCX resume generation", () => {
  it.each(["empty", "minimal", "complete"] as const)("creates a real DOCX package for a %s profile", (mode) => {
    const profile = career(mode); const generated = generateDocxResume(profile, createLatexResumeConfiguration(profile, now));
    expect(generated.bytes[0]).toBe(0x50); expect(generated.bytes[1]).toBe(0x4b);
    expect(generated.mimeType).toBe(DOCX_MIME_TYPE);
    expect(generated.filename).toBe(`${profile.username}-resume.docx`);
    const { files, xml } = documentXml(generated.bytes);
    expect(files["[Content_Types].xml"]).toBeDefined(); expect(files["word/styles.xml"]).toBeDefined(); expect(files["word/_rels/document.xml.rels"]).toBeDefined();
    expect(new DOMParser().parseFromString(xml, "application/xml").querySelector("parsererror")).toBeNull();
  });

  it("uses the same configured sections, selections, ordering, and presentation overrides as LaTeX", () => {
    const profile = career(); let config = createLatexResumeConfiguration(profile, now);
    config = toggleResumeSection(config, "certifications", false, now);
    config = setContentSelected(config, "projects", "repo2", false, now);
    config = moveSelectedContent(config, "skills", "skill2", -1, now);
    for (let index = 0; index < 3; index += 1) config = moveResumeSection(config, "skills", -1, now);
    config = setResumeOverride(config, "summary", "Word and LaTeX shared summary", now);
    config = setResumeOverride(config, "projects:repo1:description", "Shared project presentation", now);
    const model = buildDocxResumeModel(profile, config); const latex = generateLatexResume(profile, config); const xml = documentXml(generateDocxResume(profile, config).bytes).xml;
    expect(model.sections.map((section) => section.key)).toEqual(latex.includedSections.filter((key) => key !== "header"));
    expect(model.sections.find((section) => section.key === "skills")?.paragraphs[0]).toContain("C#, TypeScript");
    expect(xml).toContain("Word and LaTeX shared summary"); expect(xml).toContain("Shared project presentation");
    expect(xml).not.toContain("Cloud Professional"); expect(xml).not.toContain("Unsafe URL project");
    expect(xml.indexOf("SKILLS")).toBeLessThan(xml.indexOf("EXPERIENCE"));
  });

  it("preserves Unicode and special characters as safe XML text", () => {
    const xml = documentXml(generateDocxResume(career(), createLatexResumeConfiguration(career(), now)).bytes).xml;
    expect(xml).toContain("Ananya José Rao");
    expect(xml).toContain("Platform Engineer | C# &amp; Cloud");
    expect(xml).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(xml).toContain("weather_forecast");
    expect(xml).not.toContain("javascript:alert(1)");
    expect(new DOMParser().parseFromString(xml, "application/xml").querySelector("script")).toBeNull();
  });

  it("keeps PDF paragraphs consistent between Word and LaTeX while honoring presentation edits", () => {
    const profile = career();
    const description = "Built APIs across\nseveral regions.\nReduced a semi-\nmanual process.";
    profile.experience[0]!.description = description;
    profile.resumeEvidence = { id: "resume:pdf", fileType: "PDF", text: "EXPERIENCE\nEngineer\nExample Company\n• Built APIs across\nseveral regions.\n• Reduced a semi-\nmanual process.", importedAt: now, sizeBytes: 100, private: true };
    const config = createLatexResumeConfiguration(profile, now);
    const model = buildDocxResumeModel(profile, config);
    expect(model.sections.find((section) => section.key === "experience")?.entries[0]?.description).toEqual(["Built APIs across several regions.", "Reduced a semi-manual process."]);
    expect(generateLatexResume(profile, config).source).toContain("\\item Built APIs across several regions.");
    expect(generateLatexResume(profile, config).source).toContain("\\item Reduced a semi-manual process.");
    const edited = setResumeOverride(config, "experience:exp1:description", "Built APIs across\nseveral regions.", now);
    expect(buildDocxResumeModel(profile, edited).sections.find((section) => section.key === "experience")?.entries[0]?.description).toEqual(["Built APIs across", "several regions."]);
    expect(profile.experience[0]!.description).toBe(description);
  });

  it("does not mark invalid contact links ready or include them in Word", () => {
    const profile = career("minimal");
    profile.githubEvidence.profileUrl = "";
    profile.identity.website = value("website", "javascript:alert(1)");
    profile.identity.email = value("email", "not-an-email");
    const config = createLatexResumeConfiguration(profile, now);
    expect(calculateResumeReadiness(profile, config).find((item) => item.key === "contact")?.ready).toBe(false);
    expect(buildDocxResumeModel(profile, config).contact).toEqual([]);
    expect(documentXml(generateDocxResume(profile, config).bytes).xml).not.toContain("not-an-email");
  });

  it("provides portable font defaults and keeps resume headings and bullet paragraphs together", () => {
    const profile = career();
    const { files, xml } = documentXml(generateDocxResume(profile, createLatexResumeConfiguration(profile, now)).bytes);
    const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const document = new DOMParser().parseFromString(xml, "application/xml");
    const styles = new DOMParser().parseFromString(strFromU8(files["word/styles.xml"]!), "application/xml");
    const runs = Array.from(document.getElementsByTagNameNS(ns, "r"));
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((run) => run.getElementsByTagNameNS(ns, "rFonts")[0]?.getAttributeNS(ns, "ascii") === "Arial")).toBe(true);
    expect(styles.getElementsByTagNameNS(ns, "docDefaults")).toHaveLength(1);
    const style = (id: string) => Array.from(styles.getElementsByTagNameNS(ns, "style")).find((item) => item.getAttributeNS(ns, "styleId") === id)!;
    expect(style("Bullet").getElementsByTagNameNS(ns, "keepLines")).toHaveLength(1);
    expect(style("EntryTitle").getElementsByTagNameNS(ns, "keepNext")).toHaveLength(1);
    expect(style("EntrySubtitle").getElementsByTagNameNS(ns, "keepNext")).toHaveLength(1);
  });

  it("does not mutate canonical evidence", () => {
    const profile = career(); const before = JSON.stringify(profile);
    let config = createLatexResumeConfiguration(profile, now); config = setResumeOverride(config, "experience:exp1:title", "Resume-only title", now);
    expect(buildDocxResumeModel(profile, config).sections.find((section) => section.key === "experience")?.entries[0]?.title).toBe("Resume-only title");
    expect(JSON.stringify(profile)).toBe(before);
  });
});
