import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { reviewLinkedInText } from "./linkedin-review";

const profile = {
  identity: {}, professionalLinks: [],
  careerDirection: { professionalHeadline: { value: "Platform Engineer" }, shortIntroduction: { value: "Building reliable developer tools" } },
  experience: [{ title: "Senior Engineer" }],
  skills: [{ name: "TypeScript" }, { name: "Kubernetes" }],
  projects: [{ title: "Developer Portal" }],
  githubEvidence: { repositories: [{ name: "service-api", selectedForPortfolio: true }] },
} as unknown as CareerEvidenceProfile;

describe("manual LinkedIn review", () => {
  it("finds exact normalized phrases and leaves other evidence for review", () => {
    const results = reviewLinkedInText(profile, "Platform engineer. Senior Engineer at Example. TypeScript. Developer Portal.");
    expect(results.find((item) => item.label === "Platform Engineer")?.found).toBe(true);
    expect(results.find((item) => item.label === "Kubernetes")?.found).toBe(false);
    expect(results.find((item) => item.label === "service-api")?.found).toBe(false);
  });

  it("keeps C, C++, and C# distinct instead of reporting false support", () => {
    const symbols = { ...profile, skills: ["C", "C++", "C#"].map((name) => ({ name })) } as CareerEvidenceProfile;
    const results = reviewLinkedInText(symbols, "I build services in C#.").filter((item) => item.kind === "skill");
    expect(results.map(({ label, found }) => [label, found])).toEqual([["C", false], ["C++", false], ["C#", true]]);
  });
});

import { emptyLinkedInSections, formatLinkedInReview, reviewLinkedInSections, splitLinkedInPaste } from "./linkedin-sections";
import { parseLinkedInProfileUrl } from "./linkedin-profile-url";

describe("section-by-section LinkedIn review", () => {
  it("compares evidence only in its supplied section and treats absent sections as unknown", () => {
    const sections = { ...emptyLinkedInSections(), skills: "TypeScript", posts: "Senior Engineer. Kubernetes." };
    const report = reviewLinkedInSections(profile, sections);
    expect(report.supplied).toBe(2);
    expect(report.sections.find((item) => item.key === "experience")?.matches).toEqual([]);
    expect(report.sections.find((item) => item.key === "skills")?.matches.find((item) => item.label === "Kubernetes")?.found).toBe(false);
    expect(report.sections.find((item) => item.key === "posts")?.observations.join(" ")).toContain("have not been assessed");
    expect(formatLinkedInReview(report, "demo")).toContain("Unprovided sections are unknown");
  });

  it("uses explicit headings, combines summary/About, and does not guess a headline", () => {
    const text = "Someone\nPlatform Engineer\nAbout\nFirst paragraph\nSummary:\nMore about me\nExperience\nSenior Engineer\nEducation\nComputer Science\nSkills (2)\nTypeScript\nKubernetes";
    const sections = splitLinkedInPaste(text);
    expect(sections.headline).toBe("");
    expect(sections.about).toBe("First paragraph\nMore about me");
    expect(sections.education).toBe("Computer Science");
    expect(reviewLinkedInSections(profile, text).phrases.find((item) => item.label === "Platform Engineer")?.found).toBe(true);
  });

  it("reports education and credential references without verifying them", () => {
    const withEducation = { ...profile, education: [{ title: "BSc Computer Science", organization: "Example University", startDate: "2020", endDate: "2024" }], certifications: [{ title: "Example Cloud Credential", organization: "Example Org" }] } as CareerEvidenceProfile;
    const report = reviewLinkedInSections(withEducation, { ...emptyLinkedInSections(), education: "BSc Computer Science at Example University", certifications: "Example Cloud Credential" });
    expect(report.sections.find((item) => item.key === "education")?.matches.every((item) => item.found)).toBe(true);
    expect(report.sections.find((item) => item.key === "education")?.reference).toEqual(["BSc Computer Science · Example University · 2020 – 2024"]);
    expect(report.sections.find((item) => item.key === "certifications")?.observations.join(" ")).toContain("No year");
  });

  it("finds repeated skills while keeping punctuation-bearing skills distinct", () => {
    const report = reviewLinkedInSections(profile, { ...emptyLinkedInSections(), skills: "TypeScript, typescript, C, C++, C#" });
    expect(report.sections.find((item) => item.key === "skills")?.observations).toContain("Repeated entries in your list: typescript. Consider consolidating them.");
  });

  it("does not demand every repository or pending resume item on LinkedIn", () => {
    const candidate = { ...profile, githubEvidence: { repositories: [{ name: "selected", selectedForPortfolio: true }, { name: "unselected", selectedForPortfolio: false }] }, resumeReview: [{ title: "Unaccepted claim", status: "PENDING" }] } as unknown as CareerEvidenceProfile;
    const report = reviewLinkedInSections(candidate, { ...emptyLinkedInSections(), featured: "Some project", endorsements: "Two endorsements" });
    const labels = report.phrases.map((item) => item.label);
    expect(labels).toContain("selected");
    expect(labels).not.toContain("unselected");
    expect(labels).not.toContain("Unaccepted claim");
    expect(report.sections.find((item) => item.key === "endorsements")?.observations.join(" ")).toContain("Manual review only");
  });
});

describe("LinkedIn profile link validation", () => {
  it.each(["santoshkatageri", "@santoshkatageri", "linkedin.com/in/santoshkatageri", "https://www.linkedin.com/in/santoshkatageri/?trk=test", "https://in.linkedin.com/in/santoshkatageri"]) ("normalizes %s without making a network request", (input) => {
    expect(parseLinkedInProfileUrl(input)).toEqual({ ok: true, username: "santoshkatageri", url: "https://www.linkedin.com/in/santoshkatageri" });
  });
  it.each(["https://linkedin.com.evil.test/in/demo", "https://evil.test/in/demo", "https://www.linkedin.com/company/demo", "https://user:pass@linkedin.com/in/demo", "javascript:alert(1)", "https://linkedin.com/in/demo/posts", "https://linkedin.com/in/a%2Fb", "not a username", ""]) ("rejects unsafe or non-profile input: %s", (input) => {
    expect(parseLinkedInProfileUrl(input).ok).toBe(false);
  });
});
