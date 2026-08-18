import type { GitHubRepositorySnapshot } from "../../domain/github";
import { scoreRepository, calculateAuditSummary } from "../github-audit/scoring-engine";
import type { GitHubAudit } from "../github-audit/run-audit";
import { createPreparationState, togglePortfolioSelection } from "../github-preparation/preparation";
import { acceptReviewItem, addManualReviewItem, attachResume, clearGitHubEvidence, clearResumeEvidence, createCareerEvidenceProfile, editReviewItem, removeReviewItem, updateAcceptedRecord, updateProfileField } from "./career-profile";
import { processPastedResume } from "./resume-processing";
import { clearAllCareerDataStorage, clearGitHubCareerDataStorage, loadCareerProfile, saveCareerProfile } from "./career-profile-storage";

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
