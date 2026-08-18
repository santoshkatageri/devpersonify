import { parseGitHubUsername } from "./github-username";

describe("parseGitHubUsername", () => {
  it.each([
    ["santoshkatageri", "santoshkatageri"],
    ["github.com/santoshkatageri", "santoshkatageri"],
    ["https://github.com/santoshkatageri", "santoshkatageri"],
    ["https://www.github.com/octocat/", "octocat"],
    ["@octocat", "octocat"],
  ])("normalizes %s", (input, expected) => {
    expect(parseGitHubUsername(input)).toEqual({ ok: true, username: expected });
  });

  it.each(["", "-invalid", "invalid-", "two--hyphens", "has spaces", "https://gitlab.com/octocat", "github.com/user/repo"])("rejects %s", (input) => {
    expect(parseGitHubUsername(input).ok).toBe(false);
  });
});
