import type { GitHubRepositorySnapshot } from "../../domain/github";
import { scoreRepository, calculateAuditSummary } from "../github-audit/scoring-engine";
import type { GitHubAudit } from "../github-audit/run-audit";
import { createPreparationState, togglePortfolioSelection } from "../github-preparation/preparation";
import { canEditReviewItem, acceptReviewItem, addManualReviewItem, attachResume, clearGitHubEvidence, clearResumeEvidence, createCareerEvidenceProfile, editReviewItem, removeReviewItem, updateAcceptedRecord, updateProfileField } from "./career-profile";
import { processPastedResume } from "./resume-processing";
import { clearAllCareerDataStorage, clearGitHubCareerDataStorage, loadCareerProfile, saveCareerProfile } from "./career-profile-storage";

import { createLatexResumeConfiguration } from "../latex-resume/resume-configuration";
import { generateLatexResume } from "../latex-resume/latex-generator";
import { createGithubReadmeConfiguration } from "../github-readme/readme-configuration";
import { generateCareerGithubReadme } from "../github-readme/career-readme-generator";

const now = "2026-08-18T00:00:00Z";

function repository(): GitHubRepositorySnapshot {
  return {
    id: "github:repository:1", provider: "github", providerId: 1, owner: "developer", name: "platform-tool", fullName: "developer/platform-tool",
    url: "https://github.com/developer/platform-tool", description: "Developer platform API", isFork: false, isArchived: false, isTemplate: false,
    primaryLanguage: "TypeScript", topics: ["docker", "developer-tools"], stars: 5, forks: 1, openIssues: 0, defaultBranch: "main",
    createdAt: "2024-01-01T00:00:00Z", updatedAt: now, pushedAt: now, homepageUrl: "https://example.dev", licenseSpdxId: "MIT", hasReadme: true,
    evidence: { id: "github:repository:1", origin: "observed", source: "github", observedAt: now }, ownerAvatarUrl: "data:image/svg+xml,", sizeKb: 10,
    watchers: 5, hasIssuesEnabled: true, hasProjectsEnabled: true, hasWikiEnabled: false, visibility: "public", fetchedAt: now,
  };
}

function audit(): GitHubAudit {
  const repo = repository();
  const repositories = [{ repository: repo, result: scoreRepository(repo, now) }];
  return {
    auditAt: now,
    user: { login: "developer", id: 1, name: "Dev Person", avatarUrl: "data:image/svg+xml,", htmlUrl: "https://github.com/developer", bio: "Builder", location: "Remote", publicRepos: 1, followers: 1, following: 1, createdAt: now, updatedAt: now, fetchedAt: now },
    repositories,
    summary: calculateAuditSummary(repositories, now), warnings: [], fromCache: false,
  };
}

function baseProfile() {
  const preparation = togglePortfolioSelection(createPreparationState("developer", now), "github:repository:1", true, now);
  return createCareerEvidenceProfile(audit(), preparation, now);
}

describe("canonical career evidence profile", () => {
  it("preserves GitHub, resume, user, and derived provenance", () => {
    let profile = baseProfile();
    expect(profile.githubEvidence.repositories).toHaveLength(1);
    expect(profile.githubEvidence.repositories[0]?.provenance.source).toBe("GITHUB_OBSERVED");

    const resume = processPastedResume("SKILLS\nTypeScript, AWS\n\nPROJECTS\nOther Project\nResume description", now);
    profile = attachResume(profile, resume.document, resume.items, now);
    for (const item of profile.resumeReview.filter((candidate) => candidate.section === "skills")) profile = acceptReviewItem(profile, item.id, now);
    expect(profile.skills.every((skill) => skill.provenance.some((source) => source.source === "RESUME_PROVIDED"))).toBe(true);

    profile = updateProfileField(profile, "careerDirection", "targetRole", "Platform Engineer", now);
    expect(profile.careerDirection.targetRole?.provenance[0]?.source).toBe("USER_PROVIDED");
    expect(profile.derived.comparisons.every((comparison) => comparison.provenance.source === "DERIVED")).toBe(true);
  });

  it("compares resume and selected GitHub evidence without treating non-detection as absence", () => {
    let profile = baseProfile();
    const resume = processPastedResume("SKILLS\nTypeScript, AWS", now);
    profile = attachResume(profile, resume.document, resume.items, now);
    profile.resumeReview.filter((item) => item.section === "skills").forEach((item) => { profile = acceptReviewItem(profile, item.id, now); });
    const typescript = profile.derived.comparisons.find((item) => item.subject === "TypeScript");
    const aws = profile.derived.comparisons.find((item) => item.subject === "AWS");
    const docker = profile.derived.comparisons.find((item) => item.subject === "docker");
    expect(typescript?.result).toBe("MULTIPLE_SOURCE_SUPPORT");
    expect(aws).toMatchObject({ result: "RESUME_ONLY", explanation: expect.stringMatching(/public GitHub evidence was not detected/i) });
    expect(aws?.explanation).not.toMatch(/false|don't know|does not know/i);
    expect(docker?.result).toBe("GITHUB_ONLY");
    expect(profile.derived.comparisons.some((item) => item.result === "POTENTIAL_RESUME_OPPORTUNITY")).toBe(true);
  });

  it("changes edited resume extraction provenance to user-provided and supports structured record edits", () => {
    let profile = baseProfile();
    const resume = processPastedResume("EXPERIENCE\nEngineer\nExample Co\n2022 - Present\nBuilt tools", now);
    profile = attachResume(profile, resume.document, resume.items, now);
    const item = profile.resumeReview.find((candidate) => candidate.section === "experience")!;
    profile = editReviewItem(profile, item.id, { title: "Senior Engineer", technologies: ["TypeScript"] }, now);
    expect(profile.resumeReview.find((candidate) => candidate.id === item.id)?.provenance.source).toBe("USER_PROVIDED");
    profile = acceptReviewItem(profile, item.id, now);
    const record = profile.experience[0]!;
    profile = updateAcceptedRecord(profile, "experience", record.id, { organization: "Corrected Company" }, now);
    expect(profile.experience[0]).toMatchObject({ organization: "Corrected Company", provenance: [{ source: "USER_PROVIDED" }] });
  });

  it("supports manual additions and removal during evidence review", () => {
    let profile = addManualReviewItem(baseProfile(), "certifications", now);
    const manual = profile.resumeReview[0]!;
    expect(manual.provenance.source).toBe("USER_PROVIDED");
    profile = removeReviewItem(profile, manual.id, now);
    expect(profile.resumeReview).toHaveLength(0);
  });

  it("updates accepted review records in exports, preserving selections and removing only that item", () => {
    const resume = processPastedResume("EXPERIENCE\nEngineer\nExample Co\n2022 - Present\nBuilt tools\n\nPROJECTS\nOriginal Project\nProject details", now);
    let profile = attachResume(baseProfile(), resume.document, resume.items, now);
    for (const item of profile.resumeReview) profile = acceptReviewItem(profile, item.id, now);
    const project = profile.resumeReview.find((item) => item.section === "projects")!;
    const recordId = profile.projects[0]!.id;
    const config = createLatexResumeConfiguration(profile, now);
    profile = editReviewItem(profile, project.id, { title: "Corrected Project", url: "https://example.dev/project" }, now);
    expect(profile.projects[0]).toMatchObject({ id: recordId, title: "Corrected Project", url: "https://example.dev/project", provenance: [{ source: "USER_PROVIDED", sourceId: project.id }] });
    expect(generateLatexResume(profile, config).source).toContain("Corrected Project");
    expect(generateLatexResume(profile, config).source).not.toContain("Original Project");
    profile = removeReviewItem(profile, project.id, now);
    expect(profile.projects).toHaveLength(0);
    expect(profile.experience).toHaveLength(1);
    expect(generateLatexResume(profile, config).source).not.toContain("Corrected Project");
  });

  it("renames accepted skills in README/resume without losing independent shared evidence", () => {
    const resume = processPastedResume("SKILLS\nTypeScript, AWS", now);
    let profile = attachResume(baseProfile(), resume.document, resume.items, now);
    for (const item of profile.resumeReview) profile = acceptReviewItem(profile, item.id, now);
    const aws = profile.resumeReview.find((item) => item.title === "AWS")!;
    const originalId = profile.skills.find((skill) => skill.name === "AWS")!.id;
    const config = createLatexResumeConfiguration(profile, now);
    profile = editReviewItem(profile, aws.id, { title: "Azure" }, now);
    expect(profile.skills.find((skill) => skill.id === originalId)?.name).toBe("Azure");
    expect(generateLatexResume(profile, config).source).toContain("Azure");
    expect(generateCareerGithubReadme(profile, createGithubReadmeConfiguration(profile, now))).not.toContain("AWS");
    const typescript = profile.resumeReview.find((item) => item.title === "TypeScript")!;
    const skill = profile.skills.find((item) => item.name === "TypeScript")!;
    skill.provenance.push({ source: "USER_PROVIDED", sourceId: "preparation:additionalSkills", observedAt: now });
    profile = removeReviewItem(profile, typescript.id, now);
    expect(profile.skills.find((item) => item.name === "TypeScript")?.provenance).toEqual([{ source: "USER_PROVIDED", sourceId: "preparation:additionalSkills", observedAt: now }]);
    profile = editReviewItem(profile, aws.id, { title: "TypeScript" }, now);
    expect(profile.skills).toHaveLength(1);
    expect(profile.skills[0]?.provenance).toHaveLength(2);
    profile = removeReviewItem(profile, aws.id, now);
    expect(profile.skills[0]?.provenance).toHaveLength(1);
  });

  it("syncs profile record edits back to review and does not accept an empty skill", () => {
    const resume = processPastedResume("EXPERIENCE\nEngineer\nExample Co\n2022 - Present\nBuilt tools", now);
    let profile = attachResume(baseProfile(), resume.document, resume.items, now);
    const review = profile.resumeReview[0]!;
    profile = acceptReviewItem(profile, review.id, now);
    profile = updateAcceptedRecord(profile, "experience", profile.experience[0]!.id, { title: "Principal Engineer" }, now);
    expect(profile.resumeReview[0]).toMatchObject({ title: "Principal Engineer", acceptedRecordId: profile.experience[0]!.id });
    profile = editReviewItem(profile, review.id, { organization: "New Company" }, now);
    expect(profile.experience).toHaveLength(1);
    expect(profile.experience[0]).toMatchObject({ title: "Principal Engineer", organization: "New Company" });
    profile = addManualReviewItem(profile, "skills", now);
    const empty = profile.resumeReview.at(-1)!;
    expect(acceptReviewItem(profile, empty.id, now)).toBe(profile);
  });

  it("supports legacy exact matches while refusing ambiguous independently edited evidence", () => {
    const resume = processPastedResume("EXPERIENCE\nEngineer\nExample Co\n2022 - Present\nBuilt tools", now);
    let profile = attachResume(baseProfile(), resume.document, resume.items, now);
    const original = profile.resumeReview[0]!;
    profile = acceptReviewItem(profile, original.id, now);
    delete profile.resumeReview[0]!.acceptedRecordId;
    profile.resumeReview[0]!.provenance = original.provenance;
    profile.experience[0]!.provenance = [original.provenance];
    const legacy = structuredClone(profile);
    profile = editReviewItem(profile, original.id, { title: "Senior Engineer" }, now);
    expect(profile.experience[0]?.title).toBe("Senior Engineer");
    expect(profile.resumeReview[0]?.acceptedRecordId).toBe(profile.experience[0]?.id);
    legacy.experience[0]!.title = "Independently corrected title";
    expect(canEditReviewItem(legacy, legacy.resumeReview[0]!)).toBe(false);
    expect(removeReviewItem(legacy, original.id, now)).toBe(legacy);
    expect(editReviewItem(legacy, original.id, { title: "Overwrite" }, now)).toBe(legacy);
  });

  it("keeps resume coverage partial until every extracted item is reviewed", () => {
    const resume = processPastedResume("SKILLS\nTypeScript, AWS, Docker, SQL, Python, Linux", now);
    let profile = attachResume(baseProfile(), resume.document, resume.items, now);
    for (const item of profile.resumeReview.slice(0, 5)) profile = acceptReviewItem(profile, item.id, now);
    expect(profile.derived.sourceCoverage.resume).toBe("PARTIAL");
    profile = acceptReviewItem(profile, profile.resumeReview[5]!.id, now);
    expect(profile.derived.sourceCoverage.resume).toBe("COMPLETE");
  });

  it("describes user-provided skill sources truthfully with and without GitHub support", () => {
    let profile = addManualReviewItem(baseProfile(), "skills", now);
    const manual = profile.resumeReview[0]!;
    profile = editReviewItem(profile, manual.id, { title: "AWS" }, now);
    profile = acceptReviewItem(profile, manual.id, now);
    expect(profile.derived.comparisons.find((item) => item.subject === "AWS")).toMatchObject({ result: "USER_ONLY", explanation: expect.stringContaining("information you provided") });
    expect(profile.derived.comparisons.find((item) => item.subject === "AWS")?.explanation).not.toContain("resume");
    profile = editReviewItem(profile, manual.id, { title: "TypeScript" }, now);
    expect(profile.derived.comparisons.find((item) => item.subject === "TypeScript")).toMatchObject({ result: "MULTIPLE_SOURCE_SUPPORT", explanation: expect.stringContaining("information you provided") });
    expect(profile.derived.sourceCoverage.resume).toBe("NONE");
  });

  it("persists locally and clears resume, GitHub, and all career data independently", () => {
    let profile = baseProfile();
    const resume = processPastedResume("SKILLS\nTypeScript", now);
    profile = attachResume(profile, resume.document, resume.items, now);
    expect(saveCareerProfile(profile)).toBe(true);
    expect(loadCareerProfile("developer")?.resumeEvidence?.text).toContain("TypeScript");

    profile = clearResumeEvidence(profile, now);
    expect(profile.resumeEvidence).toBeUndefined();
    expect(profile.githubEvidence.username).toBe("developer");
    profile = clearGitHubEvidence(profile, now);
    expect(profile.githubEvidence.repositories).toHaveLength(0);

    saveCareerProfile(profile);
    localStorage.setItem("devpersonify:preparation:v1:developer", "test");
    localStorage.setItem("devpersonify:audit:v1:developer", "test");
    clearGitHubCareerDataStorage("developer");
    expect(localStorage.getItem("devpersonify:preparation:v1:developer")).toBeNull();
    expect(localStorage.getItem("devpersonify:audit:v1:developer")).toBeNull();
    expect(loadCareerProfile("developer")).not.toBeNull();
    localStorage.setItem("devpersonify:preparation:v1:developer", "test");
    localStorage.setItem("devpersonify:audit:v1:developer", "test");
    localStorage.setItem("devpersonify:github-readme:v1:developer", "test");
    localStorage.setItem("devpersonify:latex-resume:v1:developer", "test");
    clearAllCareerDataStorage("developer");
    expect(loadCareerProfile("developer")).toBeNull();
    expect(localStorage.getItem("devpersonify:preparation:v1:developer")).toBeNull();
    expect(localStorage.getItem("devpersonify:audit:v1:developer")).toBeNull();
    expect(localStorage.getItem("devpersonify:github-readme:v1:developer")).toBeNull();
    expect(localStorage.getItem("devpersonify:latex-resume:v1:developer")).toBeNull();
  });
});
