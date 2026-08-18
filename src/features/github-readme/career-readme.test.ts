import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { createCareerEvidenceProfile, clearResumeEvidence, deriveCareerEvidence } from "../career-profile/career-profile";
import type { GitHubAudit } from "../github-audit/run-audit";
import { calculateAuditSummary, scoreRepository } from "../github-audit/scoring-engine";
import type { GitHubRepositorySnapshot } from "../../domain/github";
import { createPreparationState, togglePortfolioSelection } from "../github-preparation/preparation";
import { generateCareerGithubReadme } from "./career-readme-generator";
import { createGithubReadmeConfiguration, moveReadmeProject, reconcileGithubReadmeConfiguration, setReadmePresentation, setReadmeProjectSelected, setReadmeSection } from "./readme-configuration";
import { clearGithubReadmeConfiguration, loadGithubReadmeConfiguration, saveGithubReadmeConfiguration } from "./readme-storage";
import { createLatexResumeConfiguration, setResumeOverride } from "../latex-resume/resume-configuration";
import { clearLatexResumeConfiguration, loadLatexResumeConfiguration, saveLatexResumeConfiguration } from "../latex-resume/resume-storage";

const now = "2026-08-18T00:00:00Z";
function repo(id: number, name: string, language: string): GitHubRepositorySnapshot { return { id: `repo${id}`, provider: "github", providerId: id, owner: "developer", name, fullName: `developer/${name}`, url: `https://github.com/developer/${name}`, description: `${name} | useful & safe`, isFork: id === 2, isArchived: false, isTemplate: false, primaryLanguage: language, topics: ["tools"], stars: 2, forks: 0, openIssues: 0, defaultBranch: "main", createdAt: "2024-01-01T00:00:00Z", updatedAt: now, pushedAt: now, evidence: { id: `repo${id}`, origin: "observed", source: "github", observedAt: now }, ownerAvatarUrl: "data:image/svg+xml,", sizeKb: 1, watchers: 2, hasIssuesEnabled: true, hasProjectsEnabled: true, hasWikiEnabled: false, visibility: "public", fetchedAt: now }; }
function career(): CareerEvidenceProfile {
  const repositories = [repo(1, "weather_forecast", "TypeScript"), repo(2, "open-source", "Go")].map((repository) => ({ repository, result: scoreRepository(repository, now) }));
  const audit: GitHubAudit = { auditAt: now, user: { login: "developer", id: 1, name: "Dev & Person", avatarUrl: "data:image/svg+xml,", htmlUrl: "https://github.com/developer", bio: "Builder | maintainer", publicRepos: 2, followers: 1, following: 1, createdAt: now, updatedAt: now, fetchedAt: now }, repositories, summary: calculateAuditSummary(repositories, now), warnings: [], fromCache: false };
  let preparation = createPreparationState("developer", now); preparation = togglePortfolioSelection(preparation, "repo1", true, now); preparation = togglePortfolioSelection(preparation, "repo2", true, now);
  const profile = createCareerEvidenceProfile(audit, preparation, now);
  profile.careerDirection.professionalHeadline = { id: "headline", value: "Platform Engineer", provenance: [{ source: "USER_PROVIDED", sourceId: "headline", observedAt: now }], updatedAt: now };
  return profile;
}

describe("Career Evidence Profile GitHub README output", () => {
  it("generates deterministic valid Markdown with safe bold links, pipes, underscores, and provenance-backed evidence", () => {
    const profile = career(); const config = createGithubReadmeConfiguration(profile, now);
    const first = generateCareerGithubReadme(profile, config); const second = generateCareerGithubReadme(profile, config);
    expect(first).toBe(second);
    expect(first).toContain("# Hi, I'm Dev &amp; Person");
    expect(first).toContain("- **[weather_forecast](https://github.com/developer/weather_forecast)** — weather_forecast | useful &amp; safe");
    expect(first).not.toContain("weather\\_forecast");
    expect(first).toContain("## Open source");
  });

  it("keeps project selection/order, section visibility, and presentation output-specific", () => {
    const profile = career();
    profile.resumeEvidence = { id: "resume:test", fileType: "PASTED_TEXT", text: "Private resume evidence", importedAt: now, sizeBytes: 23, private: true };
    const canonicalBio = profile.githubEvidence.bio; const canonicalResume = profile.resumeEvidence.text;
    let config = createGithubReadmeConfiguration(profile, now);
    config = setReadmeProjectSelected(config, "repo2", false, now);
    config = moveReadmeProject(config, "repo1", 1, now);
    config = setReadmeSection(config, "openSource", false, now);
    config = setReadmePresentation(config, "shortIntroduction", "README-specific introduction", now);
    const markdown = generateCareerGithubReadme(profile, config);
    expect(markdown).toContain("README-specific introduction");
    expect(markdown).not.toContain("## Open source");
    expect(profile.githubEvidence.bio).toBe(canonicalBio);
    expect(profile.resumeEvidence.text).toBe(canonicalResume);
  });

  it("persists README and resume configurations independently", () => {
    const profile = career();
    const readme = setReadmePresentation(createGithubReadmeConfiguration(profile, now), "currentFocus", "README focus", now);
    const resume = setResumeOverride(createLatexResumeConfiguration(profile, now), "summary", "Resume summary", now);
    expect(saveGithubReadmeConfiguration(readme)).toBe(true); expect(saveLatexResumeConfiguration(resume)).toBe(true);
    expect(loadGithubReadmeConfiguration("developer")?.presentation.currentFocus).toBe("README focus");
    expect(loadLatexResumeConfiguration("developer")?.overrides.summary?.value).toBe("Resume summary");
    clearLatexResumeConfiguration("developer");
    expect(loadGithubReadmeConfiguration("developer")?.presentation.currentFocus).toBe("README focus");
    saveLatexResumeConfiguration(resume);
    clearGithubReadmeConfiguration("developer");
    expect(loadGithubReadmeConfiguration("developer")).toBeNull();
    expect(loadLatexResumeConfiguration("developer")?.overrides.summary?.value).toBe("Resume summary");
  });

  it("clearing resume evidence does not clear README configuration", () => {
    let profile = career();
    const readme = createGithubReadmeConfiguration(profile, now); saveGithubReadmeConfiguration(readme);
    profile = clearResumeEvidence(profile, now);
    expect(profile.resumeEvidence).toBeUndefined();
    expect(loadGithubReadmeConfiguration("developer")).not.toBeNull();
  });

  it("career profile updates reconcile without wiping either output configuration", () => {
    let profile = career();
    const readme = setReadmePresentation(createGithubReadmeConfiguration(profile, now), "professionalHeadline", "README headline", now);
    const resume = setResumeOverride(createLatexResumeConfiguration(profile, now), "header:profile:headline", "Resume headline", now);
    saveGithubReadmeConfiguration(readme); saveLatexResumeConfiguration(resume);
    profile = deriveCareerEvidence({ ...profile, updatedAt: "2026-08-19T00:00:00Z" }, "2026-08-19T00:00:00Z");
    const reconciled = reconcileGithubReadmeConfiguration(loadGithubReadmeConfiguration("developer")!, profile);
    expect(reconciled.presentation.professionalHeadline).toBe("README headline");
    expect(loadLatexResumeConfiguration("developer")?.overrides["header:profile:headline"]?.value).toBe("Resume headline");
  });
});
