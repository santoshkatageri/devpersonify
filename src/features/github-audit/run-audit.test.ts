import type { GitHubRepositorySnapshot, GitHubUserSnapshot } from "../../domain/github";
import { fetchGitHubAuditSource, fetchReadmePresence } from "./github-api";
import { enrichRepositoryInAudit, runGitHubAudit } from "./run-audit";

vi.mock("./github-api", async (importOriginal) => ({
  ...await importOriginal<typeof import("./github-api")>(),
  fetchGitHubAuditSource: vi.fn(),
  fetchReadmePresence: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function seedAudit() {
  const now = new Date().toISOString();
  const user: GitHubUserSnapshot = { login: "demo", id: 1, avatarUrl: "", htmlUrl: "https://github.com/demo", publicRepos: 2, followers: 0, following: 0, createdAt: now, updatedAt: now, fetchedAt: now };
  const repositories: GitHubRepositorySnapshot[] = [1, 2].map((id) => ({
    id: `repo${id}`, provider: "github", providerId: id, owner: "demo", name: `repo${id}`, fullName: `demo/repo${id}`, url: `https://github.com/demo/repo${id}`,
    isFork: false, isArchived: true, isTemplate: false, topics: [], stars: 0, forks: 0, openIssues: 0, defaultBranch: "main", createdAt: now, updatedAt: now,
    evidence: { id: `repo${id}`, origin: "observed", source: "github", observedAt: now }, ownerAvatarUrl: "", sizeKb: 1, watchers: 0,
    hasIssuesEnabled: true, hasProjectsEnabled: false, hasWikiEnabled: false, visibility: "public", fetchedAt: now,
  }));
  vi.mocked(fetchGitHubAuditSource).mockResolvedValue({ user, repositories, warnings: [] });
  return runGitHubAudit("demo", { forceRefresh: true });
}

beforeEach(() => vi.clearAllMocks());

describe("on-demand README evidence", () => {
  it("shares an in-flight check across navigation and reuses its cached result", async () => {
    const audit = await seedAudit();
    const response = deferred<boolean>();
    vi.mocked(fetchReadmePresence).mockReturnValue(response.promise);
    const controller = new AbortController();
    const first = enrichRepositoryInAudit(audit, "repo1", controller.signal);
    controller.abort();
    const next = enrichRepositoryInAudit(audit, "repo1");
    expect(fetchReadmePresence).toHaveBeenCalledTimes(1);
    response.resolve(false);
    await Promise.all([first, next]);
    const revisited = await enrichRepositoryInAudit(audit, "repo1");
    expect(revisited.repositories[0]?.repository.hasReadme).toBe(false);
    expect(fetchReadmePresence).toHaveBeenCalledTimes(1);
  });

  it("merges concurrent checks instead of losing previously completed evidence", async () => {
    const audit = await seedAudit();
    const firstResponse = deferred<boolean>();
    const secondResponse = deferred<boolean>();
    vi.mocked(fetchReadmePresence).mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(secondResponse.promise);
    const first = enrichRepositoryInAudit(audit, "repo1");
    const second = enrichRepositoryInAudit(audit, "repo2");
    secondResponse.resolve(false);
    await second;
    firstResponse.resolve(true);
    const updated = await first;
    expect(updated.repositories.map(({ repository }) => repository.hasReadme)).toEqual([true, false]);
    expect((await runGitHubAudit("demo")).repositories.map(({ repository }) => repository.hasReadme)).toEqual([true, false]);
  });

  it("does not recreate browser data deleted while a check is pending", async () => {
    const audit = await seedAudit();
    const response = deferred<boolean>();
    vi.mocked(fetchReadmePresence).mockReturnValue(response.promise);
    const pending = enrichRepositoryInAudit(audit, "repo1");
    localStorage.clear();
    response.resolve(true);
    await pending;
    expect(localStorage.length).toBe(0);
  });

  it("does not overwrite a newer audit when an old check completes", async () => {
    const audit = await seedAudit();
    const response = deferred<boolean>();
    vi.mocked(fetchReadmePresence).mockReturnValue(response.promise);
    const pending = enrichRepositoryInAudit(audit, "repo1");
    const key = "devpersonify:audit:v1:demo";
    const newer = JSON.parse(localStorage.getItem(key)!);
    newer.savedAt = new Date(Date.now() + 1000).toISOString();
    localStorage.setItem(key, JSON.stringify(newer));
    response.resolve(true);
    await pending;
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(newer);
  });
});
