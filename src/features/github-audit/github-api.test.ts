import { fetchGitHubAuditSource, GitHubClientError } from "./github-api";

const userDto = {
  login: "octocat", id: 1, name: "Octo Cat", avatar_url: "https://avatars.example/1", html_url: "https://github.com/octocat",
  bio: null, company: null, blog: "", location: null, public_repos: 2, followers: 10, following: 2,
  created_at: "2011-01-25T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};

function repositoryDto(id: number) {
  return {
    id, name: `repo-${id}`, full_name: `octocat/repo-${id}`, owner: { login: "octocat", avatar_url: "https://avatars.example/1" },
    html_url: `https://github.com/octocat/repo-${id}`, description: id === 1 ? "A useful repository description for public evidence." : null,
    fork: false, archived: false, is_template: false, language: "TypeScript", topics: ["testing"], stargazers_count: id,
    forks_count: 0, watchers_count: id, open_issues_count: 0, default_branch: "main", created_at: "2024-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z", pushed_at: "2026-01-01T00:00:00Z", homepage: null,
    license: { spdx_id: "MIT" }, size: 100, has_issues: true, has_projects: true, has_wiki: false, visibility: "public",
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, ...init, headers: { "content-type": "application/json", "x-ratelimit-limit": "60", "x-ratelimit-remaining": "55", "x-ratelimit-reset": "1800000000", ...init.headers } });
}

describe("GitHub public API client", () => {
  it("fetches a user and follows Link pagination", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(userDto))
      .mockResolvedValueOnce(jsonResponse([repositoryDto(1)], { headers: { link: '<https://api.github.com/users/octocat/repos?page=2>; rel="next"', "x-ratelimit-limit": "60", "x-ratelimit-remaining": "54", "x-ratelimit-reset": "1800000000" } }))
      .mockResolvedValueOnce(jsonResponse([repositoryDto(2)]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGitHubAuditSource("octocat");
    expect(result.user.login).toBe("octocat");
    expect(result.repositories).toHaveLength(2);
    expect(result.repositories[0]).toMatchObject({ name: "repo-1", primaryLanguage: "TypeScript", visibility: "public" });
    expect(result.repositories[0]).not.toHaveProperty("hasReadme");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("maps 404 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Not Found" }, { status: 404 })));
    await expect(fetchGitHubAuditSource("missing-user")).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("maps rate-limit responses with a reset time", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "API rate limit exceeded" }, { status: 403, headers: { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1800000000" } })));
    await expect(fetchGitHubAuditSource("octocat")).rejects.toMatchObject({ code: "RATE_LIMITED", retryAt: new Date(1800000000 * 1000).toISOString() });
  });

  it("rejects malformed external data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ login: "missing-required-fields" })));
    await expect(fetchGitHubAuditSource("octocat")).rejects.toBeInstanceOf(GitHubClientError);
    await expect(fetchGitHubAuditSource("octocat")).rejects.toMatchObject({ code: "MALFORMED_RESPONSE" });
  });
});
