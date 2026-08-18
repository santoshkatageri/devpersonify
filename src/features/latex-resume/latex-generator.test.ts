import type { CareerEvidenceProfile, CareerRecord, EvidenceProvenance, EvidenceValue, SkillEvidence } from "../../domain/career-evidence-profile";
import { CLASSIC_TEMPLATE_ID, CLASSIC_TEMPLATE_VERSION } from "../../domain/latex-resume";
import { calculateResumeReadiness, escapeLatexContent, escapeLatexUrl, generateLatexResume, normalizeSafeHttpUrl } from "./latex-generator";
import { createLatexResumeConfiguration, moveResumeSection, moveSelectedContent, resetResumeOverride, setContentSelected, setResumeOverride, toggleResumeSection } from "./resume-configuration";
import { clearLatexResumeConfiguration, loadLatexResumeConfiguration, saveLatexResumeConfiguration } from "./resume-storage";

const now = "2026-08-18T00:00:00Z";
const source = (type: EvidenceProvenance, id: string) => ({ source: type, sourceId: id, observedAt: now });
const value = <T,>(id: string, data: T, type: EvidenceProvenance = "USER_PROVIDED"): EvidenceValue<T> => ({ id, value: data, provenance: [source(type, id)], updatedAt: now });
const record = (id: string, title: string, type: EvidenceProvenance = "RESUME_PROVIDED", overrides: Partial<CareerRecord> = {}): CareerRecord => ({ id, title, technologies: [], provenance: [source(type, id)], updatedAt: now, ...overrides });

function profile(mode: "empty" | "minimal" | "complete" = "complete"): CareerEvidenceProfile {
  const base: CareerEvidenceProfile = {
    schemaVersion: 1, id: "career:test", username: mode === "empty" ? "" : "developer", createdAt: now, updatedAt: now,
    identity: {}, careerDirection: {}, experience: [], education: [], skills: [], projects: [], certifications: [], achievements: [], professionalLinks: [], other: [],
    githubEvidence: { username: mode === "empty" ? "" : "developer", profileUrl: mode === "empty" ? "" : "https://github.com/developer", observedAt: now, repositories: [] },
    resumeReview: [], userProvided: [], derived: { comparisons: [], completeness: [], sourceCoverage: { github: "NONE", resume: "NONE", userProvided: "NONE", crossSourceSupport: 0, potentialGaps: 0 }, generatedAt: now },
    sectionPreferences: { headline: true, summary: true, experience: true, selectedProjects: true, skills: true, education: true, certifications: true, achievements: true, links: true },
  };
  if (mode === "empty") return base;
  base.identity.name = value("name", "Ananya José Rao", "USER_PROVIDED");
  base.identity.email = value("email", "ananya@example.com");
  base.identity.website = value("website", "https://example.com/profile?ref=resume&lang=en#work");
  base.careerDirection.professionalHeadline = value("headline", "Platform Engineer | C# & Cloud");
  if (mode === "minimal") return base;
  base.identity.location = value("location", "Bengaluru, India");
  base.careerDirection.shortIntroduction = value("summary", "Builds reliable systems with 99.9% uptime & clear ownership.");
  base.careerDirection.targetRole = value("target", "Senior Platform Engineer");
  base.experience = [record("exp1", "Senior Engineer", "RESUME_PROVIDED", { organization: "R&D {Labs} #1", startDate: "2022", endDate: "Present", description: "Improved reliability by 25%.\nManaged budget of $5 and C# services.", technologies: ["C#", "Kubernetes"] })];
  const skill1: SkillEvidence = { id: "skill1", name: "C#", normalizedName: "c#", provenance: [source("RESUME_PROVIDED", "skill1")], githubRepositoryIds: ["repo1"], updatedAt: now };
  const skill2: SkillEvidence = { id: "skill2", name: "TypeScript", normalizedName: "typescript", provenance: [source("RESUME_PROVIDED", "skill2")], githubRepositoryIds: [], updatedAt: now };
  base.skills = [skill1, skill2];
  base.githubEvidence.repositories = [{ repositoryId: "repo1", name: "weather_forecast", url: "https://github.com/developer/weather_forecast?tab=readme#usage", description: "Weather <Dashboard> | alerts & 100% local", language: "TypeScript", topics: ["weather"], pushedAt: now, isFork: false, selectedForPortfolio: true, selectedForShowcase: true, provenance: source("GITHUB_OBSERVED", "repo1") }];
  base.projects = [record("project2", "Resume Project", "RESUME_PROVIDED", { description: "A resume-provided project", url: "https://example.com/project" })];
  base.education = [record("edu1", "B.Tech — Computer Science", "RESUME_PROVIDED", { organization: "University & College", startDate: "2018", endDate: "2022" })];
  base.certifications = [record("cert1", "Cloud {Professional}")];
  base.achievements = [record("ach1", "Top 5%", "USER_PROVIDED", { description: "Awarded for R&D" })];
  base.professionalLinks = [record("link1", "Portfolio", "USER_PROVIDED", { url: "https://example.com/work?q=latex&view=all#top" })];
  return base;
}

describe("LaTeX content escaping", () => {
  it.each([
    ["A&B", "A\\&B"], ["100%", "100\\%"], ["$5", "\\$5"], ["C#", "C\\#"], ["weather_forecast", "weather\\_forecast"],
    ["{value}", "\\{value\\}"], ["a~b", "a\\textasciitilde{}b"], ["x^2", "x\\textasciicircum{}2"], ["a\\b", "a\\textbackslash{}b"],
    ["<tag>", "\\textless{}tag\\textgreater{}"], ["a|b", "a\\textbar{}b"], ["a–b—c•d", "a--b---c\\textbullet{}d"],
  ])("escapes %s at the content boundary", (input, expected) => expect(escapeLatexContent(input)).toBe(expected));

  it("preserves Unicode, accented characters, Indian names, apostrophes, and quotation marks", () => {
    expect(escapeLatexContent("Ananya José Rao's “Résumé” — नमस्ते")).toBe("Ananya José Rao's “Résumé” --- नमस्ते");
  });
});

describe("safe LaTeX URL handling", () => {
  it("supports HTTP/HTTPS query parameters and fragments", () => {
    expect(escapeLatexUrl("https://example.com/path?q=a&lang=en#work")).toBe("https://example.com/path?q=a\\&lang=en\\#work");
    expect(normalizeSafeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  it.each(["javascript:alert(1)", "data:text/html,test", "vbscript:msgbox(1)", "not a url", ""])("rejects unsafe or malformed URL %s", (url) => {
    expect(normalizeSafeHttpUrl(url)).toBeNull();
    expect(escapeLatexUrl(url)).toBeNull();
  });
});

describe("deterministic LaTeX resume generation", () => {
  it("generates the same readable document for identical profile and configuration", () => {
    const career = profile();
    const config = createLatexResumeConfiguration(career, now);
    const first = generateLatexResume(career, config);
    const second = generateLatexResume(career, config);
    expect(first).toEqual(second);
    expect(first.source).toContain("\\documentclass[10pt,letterpaper]{article}");
    expect(first.source).toContain(`Template: ${CLASSIC_TEMPLATE_ID} v${CLASSIC_TEMPLATE_VERSION}`);
    expect(first.source).toContain("\\end{document}");
  });

  it("handles empty and minimal profiles by omitting empty sections", () => {
    const empty = profile("empty");
    const emptyResult = generateLatexResume(empty, createLatexResumeConfiguration(empty, now));
    expect(emptyResult.source).toContain("\\begin{document}");
    expect(emptyResult.includedSections).toEqual([]);
    expect(emptyResult.omittedEmptySections).toContain("experience");
    const minimal = profile("minimal");
    const minimalResult = generateLatexResume(minimal, createLatexResumeConfiguration(minimal, now));
    expect(minimalResult.includedSections).toContain("header");
    expect(minimalResult.includedSections).not.toContain("experience");
  });

  it("renders a complete evidence profile with escaped content and safe links", () => {
    const career = profile();
    const result = generateLatexResume(career, createLatexResumeConfiguration(career, now));
    expect(result.source).toContain("Platform Engineer \\textbar{} C\\# \\& Cloud");
    expect(result.source).toContain("R\\&D \\{Labs\\} \\#1");
    expect(result.source).toContain("weather\\_forecast");
    expect(result.source).toContain("25\\%");
    expect(result.source).toContain("\\$5");
    expect(result.source).toContain("Ananya José Rao");
    expect(result.source).toContain("\\href{https://github.com/developer/weather\\_forecast?tab=readme\\#usage}");
  });

  it("respects section enablement and ordering", () => {
    const career = profile();
    let config = createLatexResumeConfiguration(career, now);
    config = toggleResumeSection(config, "summary", false, now);
    for (let index = 0; index < 3; index += 1) config = moveResumeSection(config, "skills", -1, now);
    const result = generateLatexResume(career, config);
    expect(result.source).not.toContain("\\section{Summary}");
    expect(result.source.indexOf("\\section{Skills}")).toBeLessThan(result.source.indexOf("\\section{Experience}"));
  });

  it("reorders selected content without changing canonical profile order", () => {
    const career = profile();
    let config = createLatexResumeConfiguration(career, now);
    config = moveSelectedContent(config, "projects", "repo1", -1, now);
    const result = generateLatexResume(career, config);
    expect(result.source.indexOf("weather\\_forecast")).toBeLessThan(result.source.indexOf("Resume Project"));
    expect(career.projects[0]?.title).toBe("Resume Project");
  });

  it("respects project, experience, skill, education, certification, achievement, and link selections", () => {
    const career = profile();
    let config = createLatexResumeConfiguration(career, now);
    for (const [type, id] of [["projects", "repo1"], ["experience", "exp1"], ["skills", "skill1"], ["education", "edu1"], ["certifications", "cert1"], ["achievements", "ach1"], ["links", "link1"]] as const) config = setContentSelected(config, type, id, false, now);
    const result = generateLatexResume(career, config);
    expect(result.source).not.toContain("weather\\_forecast");
    expect(result.source).not.toContain("Senior Engineer");
    expect(result.source).not.toContain("C\\#,");
    expect(result.source).not.toContain("University");
    expect(result.source).not.toContain("Cloud \\{Professional\\}");
    expect(result.source).not.toContain("Top 5\\%");
    expect(result.source).not.toContain("work?q=latex");
  });

  it("keeps resume presentation overrides separate and resettable", () => {
    const career = profile();
    const canonical = career.githubEvidence.repositories[0]!.description;
    let config = createLatexResumeConfiguration(career, now);
    config = setResumeOverride(config, "projects:repo1:description", "Short resume wording & impact", now);
    expect(config.overrides["projects:repo1:description"]?.source).toBe("USER_PROVIDED");
    expect(generateLatexResume(career, config).source).toContain("Short resume wording \\& impact");
    expect(career.githubEvidence.repositories[0]!.description).toBe(canonical);
    config = resetResumeOverride(config, "projects:repo1:description", now);
    expect(generateLatexResume(career, config).source).toContain("Weather \\textless{}Dashboard\\textgreater{}");
  });

  it("omits unsafe selected URLs and explains the omission", () => {
    const career = profile("minimal");
    career.professionalLinks = [record("unsafe-link", "Unsafe", "USER_PROVIDED", { url: "javascript:alert(1)" })];
    const result = generateLatexResume(career, createLatexResumeConfiguration(career, now));
    expect(result.source).not.toContain("javascript:alert");
    expect(result.warnings).toEqual([expect.stringMatching(/unsafe protocol/i)]);
  });

  it("neutralizes malicious LaTeX and HTML-like content without executing it", () => {
    const career = profile("minimal");
    career.careerDirection.shortIntroduction = value("bad", "<script>alert(1)</script> \\end{document} \\input{evil} #1 $x");
    const result = generateLatexResume(career, createLatexResumeConfiguration(career, now));
    expect(result.source).toContain("\\textless{}script\\textgreater{}");
    expect(result.source).toContain("\\textbackslash{}end\\{document\\}");
    expect(result.source.match(/\\end\{document\}/g)).toHaveLength(1);
    expect(result.source).not.toContain("\\input{evil}");
  });

  it("handles very long descriptions deterministically", () => {
    const career = profile();
    career.experience[0]!.description = `Long & safe ${"x".repeat(10_000)}`;
    const config = createLatexResumeConfiguration(career, now);
    const source = generateLatexResume(career, config).source;
    expect(source.length).toBeGreaterThan(10_000);
    expect(source).toContain("Long \\& safe");
  });

  it("produces transparent non-blocking readiness", () => {
    const minimal = profile("minimal");
    const readiness = calculateResumeReadiness(minimal, createLatexResumeConfiguration(minimal, now));
    expect(readiness.find((item) => item.key === "name")?.ready).toBe(true);
    expect(readiness.find((item) => item.key === "education")).toMatchObject({ ready: false, optional: true });
    expect(readiness.find((item) => item.key === "targetRole")?.explanation).toMatch(/not been specified/i);
  });

  it("persists, restores, and clears the versioned configuration", () => {
    const career = profile();
    let config = createLatexResumeConfiguration(career, now);
    config = setResumeOverride(config, "summary", "Resume summary", now);
    expect(saveLatexResumeConfiguration(config)).toBe(true);
    expect(loadLatexResumeConfiguration("developer")?.overrides.summary?.value).toBe("Resume summary");
    clearLatexResumeConfiguration("developer");
    expect(loadLatexResumeConfiguration("developer")).toBeNull();
  });
});
