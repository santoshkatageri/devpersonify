import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./app";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

const userDto = {
  login: "octocat", id: 1, name: "Octo Cat", avatar_url: "https://avatars.example/1", html_url: "https://github.com/octocat",
  bio: "A test profile", company: null, blog: "", location: "Internet", public_repos: 1, followers: 10, following: 2,
  created_at: "2011-01-25T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
};
const repositoryDto = {
  id: 10, name: "hello-world", full_name: "octocat/hello-world", owner: { login: "octocat", avatar_url: "https://avatars.example/1" },
  html_url: "https://github.com/octocat/hello-world", description: "A public example repository with a clear and useful description.",
  fork: false, archived: false, is_template: false, language: "TypeScript", topics: ["example", "typescript"], stargazers_count: 4,
  forks_count: 1, watchers_count: 4, open_issues_count: 0, default_branch: "main", created_at: "2024-01-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z", pushed_at: "2026-08-01T00:00:00Z", homepage: null,
  license: { spdx_id: "MIT" }, size: 100, has_issues: true, has_projects: true, has_wiki: false, visibility: "public",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-ratelimit-limit": "60", "x-ratelimit-remaining": "50", "x-ratelimit-reset": "1800000000" } });
}

describe("DevPersonify routes", () => {
  it("renders the refined landing page and links to the audit entry", async () => {
    const user = userEvent.setup();
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1, name: /your work already tells a story/i })).toBeInTheDocument();
    expect(screen.getByText(/illustrative output · example values/i)).toBeInTheDocument();
    expect(screen.getAllByText("Available")).toHaveLength(6);
    expect(screen.queryByText(/planned|future/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "We would love to hear what worked well." })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /Write feedback/i })[0]!);
    expect(screen.getByRole("dialog", { name: "Help shape DevPersonify" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Feedback" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close feedback" }));
    await user.click(screen.getAllByRole("link", { name: /analyze my github/i })[0]!);
    expect(await screen.findByRole("heading", { level: 1, name: /see what your public work communicates/i })).toBeInTheDocument();
  });

  it("links shipped landing capabilities to existing contextual workflows when local career context exists", () => {
    localStorage.setItem("devpersonify:career-evidence:v1:developer", JSON.stringify({ username: "developer", updatedAt: "2026-08-18T00:00:00Z" }));
    renderAt("/");
    expect(screen.getByRole("link", { name: /Open GitHub profile/i })).toHaveAttribute("href", "/audit/developer/prepare");
    expect(screen.getByRole("link", { name: /Open career profile/i })).toHaveAttribute("href", "/career/developer?step=preview");
    expect(screen.getByRole("link", { name: /Build README/i })).toHaveAttribute("href", "/career/developer/readme");
    expect(screen.getByRole("link", { name: /Open Resume Studio/i })).toHaveAttribute("href", "/career/developer/resume");
  });

  it("validates an invalid GitHub username before a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderAt("/audit");
    await user.type(screen.getByLabelText(/github username/i), "not a valid username!");
    await user.click(screen.getByRole("button", { name: /start audit/i }));
    expect(screen.getByText(/github usernames use/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads a real audit-shaped response and opens repository evidence", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/users/octocat")) return response(userDto);
      if (url.includes("/users/octocat/repos")) return response([repositoryDto]);
      if (url.endsWith("/readme")) return response({ message: "Not Found" }, 404);
      return response({ message: "Not Found" }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderAt("/audit/octocat");

    expect(await screen.findByRole("heading", { level: 1, name: "Octo Cat" })).toBeInTheDocument();
    expect(screen.getAllByText("hello-world").length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("link", { name: /hello-world/i })[0]!);
    expect(await screen.findByRole("heading", { level: 1, name: "hello-world" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Complete evidence trace" })).toBeInTheDocument();
    expect(screen.getAllByText(/unknown is not absent/i).length).toBeGreaterThan(0);
  });

  it("renders a recovery page for unknown routes", () => {
    renderAt("/not-a-page");
    expect(screen.getByRole("heading", { level: 1, name: /this page is not part/i })).toBeInTheDocument();
  });
});
