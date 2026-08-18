export type UsernameParseResult =
  | { ok: true; username: string }
  | { ok: false; message: string };

const GITHUB_USERNAME_PATTERN = /^(?!-)(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function parseGitHubUsername(input: string): UsernameParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: "Enter a GitHub username or profile URL." };

  let candidate = trimmed.replace(/^@/, "");
  const possibleUrl = /^https?:\/\//i.test(trimmed) ? trimmed : /^github\.com\//i.test(trimmed) ? `https://${trimmed}` : null;

  if (possibleUrl) {
    try {
      const url = new URL(possibleUrl);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      const parts = url.pathname.split("/").filter(Boolean);
      if (hostname !== "github.com" || parts.length !== 1) {
        return { ok: false, message: "Enter a GitHub profile URL, not a repository or another website." };
      }
      candidate = parts[0] ?? "";
    } catch {
      return { ok: false, message: "Enter a valid GitHub username or profile URL." };
    }
  }

  if (!GITHUB_USERNAME_PATTERN.test(candidate)) {
    return { ok: false, message: "GitHub usernames use 1–39 letters, numbers, or single hyphens." };
  }

  return { ok: true, username: candidate };
}
