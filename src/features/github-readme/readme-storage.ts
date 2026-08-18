import { GITHUB_README_CONFIG_VERSION, type GithubReadmeConfiguration } from "../../domain/github-readme";

const PREFIX = "devpersonify:github-readme:v1:";
const key = (username: string) => `${PREFIX}${username.toLowerCase()}`;

export function saveGithubReadmeConfiguration(config: GithubReadmeConfiguration): boolean {
  try { localStorage.setItem(key(config.username), JSON.stringify(config)); return true; } catch { return false; }
}

export function loadGithubReadmeConfiguration(username: string): GithubReadmeConfiguration | null {
  try {
    const raw = localStorage.getItem(key(username));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const config = value as Partial<GithubReadmeConfiguration>;
    if (config.schemaVersion !== GITHUB_README_CONFIG_VERSION || config.username?.toLowerCase() !== username.toLowerCase() || !Array.isArray(config.selectedProjectIds) || !Array.isArray(config.projectOrder) || !config.sections || !config.presentation) return null;
    return config as GithubReadmeConfiguration;
  } catch { return null; }
}

export function clearGithubReadmeConfiguration(username: string): void { localStorage.removeItem(key(username)); }
