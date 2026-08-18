import type { GitHubRepositorySnapshot, GitHubUserSnapshot } from "../../domain/github";
import { scoreRepository, type ScoredRepository } from "../github-audit/scoring-engine";
import {
  assessFork,
  createPreparationState,
  generateProfileReadme,
  getPreference,
  inferPortfolioCategories,
  movePortfolioItem,
  portfolioReadiness,
  profileCompleteness,
  recommendDiversePortfolio,
  setRepositoryDecision,
  togglePortfolioSelection,
} from "./preparation";
import { loadPreparationState, savePreparationState } from "./preparation-storage";

const auditAt = "2026-08-18T00:00:00.000Z";

function repo(id: number, name: string, overrides: Partial<GitHubRepositorySnapshot> = {}): GitHubRepositorySnapshot {
  return {
    id: `github:repository:${id}`, provider: "github", providerId: id, owner: "developer", name, fullName: `developer/${name}`,
    url: `https://github.com/developer/${name}`, description: "A documented public project with clear repository context and useful details.",
    isFork: false, isArchived: false, isTemplate: false, primaryLanguage: "TypeScript", topics: ["api", "developer-tools"], stars: 5, forks: 1,
    openIssues: 0, defaultBranch: "main", createdAt: "2024-01-01T00:00:00Z", updatedAt: "2026-08-01T00:00:00Z", pushedAt: "2026-08-01T00:00:00Z",
    homepageUrl: "https://example.dev", licenseSpdxId: "MIT", hasReadme: true,
    evidence: { id: `github:repository:${id}`, origin: "observed", source: "github", observedAt: auditAt }, ownerAvatarUrl: "data:image/svg+xml,",
    sizeKb: 10, watchers: 5, hasIssuesEnabled: true, hasProjectsEnabled: true, hasWikiEnabled: false, visibility: "public", fetchedAt: auditAt,
    ...overrides,
  };
}

function scored(items: GitHubRepositorySnapshot[]): ScoredRepository[] {
  return items.map((repository) => ({ repository, result: scoreRepository(repository, auditAt) }));
}

const user: GitHubUserSnapshot = {
  login: "developer", id: 1, name: "Dev *Name*", avatarUrl: "data:image/svg+xml,", htmlUrl: "https://github.com/developer", bio: "Builds useful tools.",
  publicRepos: 2, followers: 1, following: 1, createdAt: "2020-01-01T00:00:00Z", updatedAt: auditAt, fetchedAt: auditAt,
};

describe("Phase 3 preparation rules", () => {
  it("keeps computed recommendations separate from user decisions", () => {
    const repository = repo(1, "old-project", { isArchived: true });
    const computed = scoreRepository(repository, auditAt);
    const state = setRepositoryDecision(createPreparationState("developer", auditAt), repository.id, "KEEP", auditAt);
    expect(computed.classification).toBe("ARCHIVE");
    expect(getPreference(state, repository.id).decision).toBe("KEEP");
  });

  it("selects, removes, and reorders portfolio projects", () => {
    let state = createPreparationState("developer", auditAt);
    state = togglePortfolioSelection(state, "one", true, auditAt);
    state = togglePortfolioSelection(state, "two", true, auditAt);
    state = movePortfolioItem(state, "two", -1, auditAt);
    expect(state.portfolioOrder).toEqual(["two", "one"]);
    state = togglePortfolioSelection(state, "two", false, auditAt);
    expect(state.portfolioOrder).toEqual(["one"]);
  });

  it("persists decisions, order, profile fields, and README preferences locally", () => {
    let state = setRepositoryDecision(createPreparationState("developer", auditAt), "repo", "SHOWCASE", auditAt);
    state = { ...state, profile: { ...state.profile, professionalHeadline: "Platform engineer" }, readmeSections: { ...state.readmeSections, openSource: false } };
    expect(savePreparationState(state)).toBe(true);
    const restored = loadPreparationState("developer");
    expect(restored.repositories.repo?.decision).toBe("SHOWCASE");
    expect(restored.portfolioOrder).toContain("repo");
    expect(restored.profile.professionalHeadline).toBe("Platform engineer");
    expect(restored.readmeSections.openSource).toBe(false);
  });

  it("infers relevance conservatively and creates a diverse shortlist", () => {
    const frontend = repo(1, "ui-components", { description: "Frontend UI components and CSS patterns for a public web project.", topics: ["frontend", "ui"] });
    const backend = repo(2, "api-service", { description: "Backend API service with public documentation and examples.", topics: ["api", "backend"] });
    const cloud = repo(3, "infra-platform", { description: "Infrastructure project using Terraform and Kubernetes workflows.", topics: ["terraform", "kubernetes"] });
    expect(inferPortfolioCategories(frontend)[0]?.category).toBe("frontend");
    const recommendations = recommendDiversePortfolio(scored([frontend, backend, cloud]), auditAt, 3);
    expect(new Set(recommendations).size).toBe(3);
  });

  it("does not treat all forks as bad", () => {
    const meaningful = repo(1, "useful-fork", { isFork: true, stars: 8, topics: ["open-source", "api"], pushedAt: "2026-08-01T00:00:00Z" });
    const sparse = repo(2, "old-fork", { isFork: true, stars: 0, forks: 0, topics: [], pushedAt: "2020-01-01T00:00:00Z" });
    delete sparse.description;
    expect(assessFork(meaningful, auditAt)?.assessment).toBe("POTENTIALLY_MEANINGFUL");
    expect(assessFork(sparse, auditAt)?.assessment).toBe("LIKELY_LOW_VALUE");
  });

  it("reports readiness using observed, not-detected, and unknown evidence", () => {
    const repository = repo(1, "readiness");
    delete repository.hasReadme;
    delete repository.homepageUrl;
    const readiness = portfolioReadiness(repository, auditAt);
    expect(readiness.status).toBe("REVIEW");
    expect(readiness.items.find((item) => item.label === "README")?.status).toBe("unknown");
    expect(readiness.items.find((item) => item.label === "Demo or homepage")?.evidence).toMatch(/not detected/i);
  });

  it("generates valid Markdown syntax while escaping untrusted content at the content boundary", () => {
    const repository = repo(1, "weather_forecast", { description: "Weather Forecast | useful <script>alert('x')</script> dashboard" });
    let state = togglePortfolioSelection(createPreparationState("developer", auditAt), repository.id, true, auditAt);
    state = {
      ...state,
      profile: {
        ...state.profile,
        professionalHeadline: "Software Developer | AI & Automation *Enthusiast*",
        currentFocus: "Reliable APIs",
        shortIntroduction: "Building [useful] tools <img src=x onerror=alert(1)>",
        location: "Remote | [Worldwide]",
        website: "https://example.dev/profile?from=github",
        additionalSkills: "Go, PostgreSQL",
      },
    };
    const markdown = generateProfileReadme(state, user, scored([repository]));
    expect(markdown).toContain("# Hi, I'm Dev \\*Name\\*");
    expect(markdown).toContain("**Software Developer | AI &amp; Automation \\*Enthusiast\\***");
    expect(markdown).toContain("- **[weather_forecast](https://github.com/developer/weather_forecast)** — Weather Forecast | useful &lt;script&gt;");
    expect(markdown).not.toContain("weather\\_forecast");
    expect(markdown).not.toContain("\\|");
    expect(markdown).toContain("[Website](https://example.dev/profile?from=github)");
    expect(markdown).toContain("Location: Remote | \\[Worldwide\\]");
    expect(markdown).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("years of experience");
    expect(generateProfileReadme(state, user, scored([repository]))).toBe(markdown);
  });

  it("calculates transparent optional-field completeness", () => {
    const state = createPreparationState("developer", auditAt);
    expect(profileCompleteness(state.profile)).toEqual({ score: 0, missing: expect.arrayContaining(["professional headline", "current focus"]) });
  });
});
