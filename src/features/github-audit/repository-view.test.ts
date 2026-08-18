import type { GitHubRepositorySnapshot } from "../../domain/github";
import { scoreRepository, type ScoredRepository } from "./scoring-engine";
import { applyRepositoryView, repositoryViewFromParams, repositoryViewToParams } from "./repository-view";

const now = "2026-08-18T00:00:00Z";
function item(id: number, name: string, stars: number, description = "Useful project description with enough public context."): ScoredRepository {
  const repository: GitHubRepositorySnapshot = { id: `repo${id}`, provider: "github", providerId: id, owner: "developer", name, fullName: `developer/${name}`, url: `https://github.com/developer/${name}`, description, isFork: false, isArchived: false, isTemplate: false, primaryLanguage: "TypeScript", topics: ["tools"], stars, forks: 0, openIssues: 0, defaultBranch: "main", createdAt: "2024-01-01T00:00:00Z", updatedAt: now, pushedAt: now, evidence: { id: `repo${id}`, origin: "observed", source: "github", observedAt: now }, ownerAvatarUrl: "data:image/svg+xml,", sizeKb: 1, watchers: stars, hasIssuesEnabled: true, hasProjectsEnabled: true, hasWikiEnabled: false, visibility: "public", fetchedAt: now };
  return { repository, result: scoreRepository(repository, now) };
}

describe("repository list/detail view state", () => {
  const repositories = [item(1, "zeta-project", 1), item(2, "alpha-project", 10), item(3, "other", 3, "Miscellaneous utility with public context.")];
  it("round-trips search, filter, and sort through URL parameters", () => {
    const params = repositoryViewToParams({ filter: "KEEP", sort: "name", query: "project" });
    expect(repositoryViewFromParams(params)).toEqual({ filter: "KEEP", sort: "name", query: "project" });
  });
  it("navigates the current searched/sorted set rather than the whole collection", () => {
    const visible = applyRepositoryView(repositories, { filter: "ALL", sort: "name", query: "project" });
    expect(visible.map(({ repository }) => repository.name)).toEqual(["alpha-project", "zeta-project"]);
    expect(visible.some(({ repository }) => repository.name === "other")).toBe(false);
  });
  it("uses stable tie breakers", () => {
    const visible = applyRepositoryView(repositories, { filter: "ALL", sort: "stars", query: "" });
    expect(visible.map(({ repository }) => repository.name)).toEqual(["alpha-project", "other", "zeta-project"]);
  });
});
