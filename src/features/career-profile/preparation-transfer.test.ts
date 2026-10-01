import { createPreparationState, togglePortfolioSelection } from "../github-preparation/preparation";
import { createCareerEvidenceProfile, refreshCareerPreparation, updateProfileField, attachResume, acceptReviewItem } from "./career-profile";
import { processPastedResume } from "./resume-processing";
import { scoreRepository, calculateAuditSummary } from "../github-audit/scoring-engine";
import type { GitHubAudit } from "../github-audit/run-audit";
import type { GitHubRepositorySnapshot } from "../../domain/github";
import { createGithubReadmeConfiguration } from "../github-readme/readme-configuration";
import { generateCareerGithubReadme } from "../github-readme/career-readme-generator";
const now = "2026-09-01T00:00:00Z";
const later = "2026-09-02T00:00:00Z";
function audit(): GitHubAudit {
  const repositories = ["alpha", "beta"].map((name, index) => {
    const repository: GitHubRepositorySnapshot = {
      id: name, provider: "github", providerId: index, owner: "demo", name, fullName: `demo/${name}`, url: `https://github.com/demo/${name}`,
      description: `${name} tooling`, isFork: false, isArchived: false, isTemplate: false, primaryLanguage: "TypeScript", topics: [], stars: 10,
      forks: 0, openIssues: 0, defaultBranch: "main", createdAt: now, updatedAt: now, pushedAt: now, hasReadme: true,
      evidence: { id: name, origin: "observed", source: "github", observedAt: now }, ownerAvatarUrl: "", sizeKb: 10, watchers: 1,
      hasIssuesEnabled: true, hasProjectsEnabled: false, hasWikiEnabled: false, visibility: "public", fetchedAt: now,
    };
    return { repository, result: scoreRepository(repository, now) };
  });
  return { auditAt: now, user: { login: "demo", id: 1, name: "Demo", avatarUrl: "", htmlUrl: "https://github.com/demo", location: "Remote", publicRepos: 2, followers: 0, following: 0, createdAt: now, updatedAt: now, fetchedAt: now }, repositories, summary: calculateAuditSummary(repositories, now), warnings: [], fromCache: false };
}

describe("preparation to career handoff", () => {
  it("carries entered context and only chosen projects in portfolio order into outputs", () => {
    let prep = togglePortfolioSelection(togglePortfolioSelection(createPreparationState("demo", now), "beta", true, now), "alpha", true, now);
    prep = { ...prep, profile: { ...prep.profile, professionalHeadline: "Platform engineer", currentFocus: "Reliable systems", targetRoles: "SRE", shortIntroduction: "I build tools", location: "Bengaluru", website: "https://example.dev", linkedinUrl: "https://linkedin.com/in/demo", email: "demo@example.dev", additionalSkills: "Terraform, Python, python", preferredTechnologies: "Go, Kubernetes" } };
    const profile = createCareerEvidenceProfile(audit(), prep, now);
    expect(profile.githubEvidence.repositories.map((repo) => repo.name)).toEqual(["beta", "alpha"]);
    expect(profile.careerDirection.professionalHeadline?.value).toBe("Platform engineer");
    expect(profile.careerDirection.careerDirection?.value).toBe("Reliable systems");
    expect(profile.careerDirection.targetRole?.value).toBe("SRE");
    expect(profile.careerDirection.preferredTechnologies?.value).toEqual(["Go", "Kubernetes"]);
    expect(profile.identity.email?.value).toBe("demo@example.dev");
    expect(profile.skills.map((skill) => skill.name)).toEqual(["Terraform", "Python"]);
    expect(profile.skills[0]?.provenance[0]?.source).toBe("USER_PROVIDED");
    const readme = generateCareerGithubReadme(profile, createGithubReadmeConfiguration(profile));
    expect(readme).toContain("Platform engineer");
    expect(readme).toContain("I build tools");
    expect(readme.indexOf("beta")).toBeLessThan(readme.indexOf("alpha"));
  });
  it("preserves career edits and accepted evidence while applying changed preparation, including deselect-all", () => {
    let prep = togglePortfolioSelection(createPreparationState("demo", now), "alpha", true, now);
    prep.profile = { ...prep.profile, professionalHeadline: "Original", shortIntroduction: "Original intro", additionalSkills: "Terraform, Python" };
    let profile = createCareerEvidenceProfile(audit(), prep, now);
    profile = updateProfileField(profile, "careerDirection", "professionalHeadline", "Career correction", now);
    const resume = processPastedResume("SKILLS\nPython\n\nEXPERIENCE\nEngineer\nExample\n2022 - Present\nBuilt useful tools", now);
    profile = attachResume(profile, resume.document, resume.items, now);
    for (const item of profile.resumeReview) profile = acceptReviewItem(profile, item.id, now);
    const original = structuredClone(profile);
    prep = togglePortfolioSelection(prep, "alpha", false, later);
    prep.profile = { ...prep.profile, professionalHeadline: "Changed upstream", shortIntroduction: "New intro", additionalSkills: "Go" };
    const next = refreshCareerPreparation(profile, audit(), prep, later);
    expect(profile).toEqual(original);
    expect(next.githubEvidence.repositories).toEqual([]);
    expect(next.careerDirection.professionalHeadline?.value).toBe("Career correction");
    expect(next.careerDirection.shortIntroduction?.value).toBe("New intro");
    expect(next.skills.map((skill) => skill.name)).toEqual(["Python", "Go"]);
    expect(next.skills[0]?.provenance).toHaveLength(1);
    expect(next.experience).toEqual(profile.experience);
    expect(next.resumeReview).toEqual(profile.resumeReview);
    prep.profile.shortIntroduction = "";
    expect(refreshCareerPreparation(next, audit(), prep, later).careerDirection.shortIntroduction).toBeUndefined();
    expect(() => refreshCareerPreparation(next, audit(), { ...prep, username: "another" }, later)).toThrow(/same GitHub account/);
  });
  it("does not silently select showcase recommendations when nothing is selected", () => {
    expect(createCareerEvidenceProfile(audit(), createPreparationState("demo", now), now).githubEvidence.repositories).toEqual([]);
  });
});
