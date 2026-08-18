import type { GitHubApiErrorCode, GitHubRateLimit, GitHubRepositorySnapshot, GitHubUserSnapshot } from "../../domain/github";

const API_ROOT = "https://api.github.com";
const API_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};
const MAX_PAGES = 50;
const REQUEST_TIMEOUT_MS = 20_000;

export class GitHubClientError extends Error {
  constructor(
    public readonly code: GitHubApiErrorCode,
    message: string,
    public readonly status?: number,
    public readonly retryAt?: string,
  ) {
    super(message);
    this.name = "GitHubClientError";
  }
}

interface GitHubUserDto {
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

interface GitHubRepositoryDto {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string };
  html_url: string;
  description: string | null;
  fork: boolean;
  archived: boolean;
  is_template: boolean;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  homepage: string | null;
  license: { spdx_id: string | null } | null;
  size: number;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  visibility: string;
}

export interface GitHubAuditSource {
  user: GitHubUserSnapshot;
  repositories: GitHubRepositorySnapshot[];
  rateLimit?: GitHubRateLimit;
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isValidUserDto(value: unknown): value is GitHubUserDto {
  if (!isRecord(value)) return false;
  return typeof value.login === "string" && typeof value.id === "number" && isStringOrNull(value.name) &&
    typeof value.avatar_url === "string" && typeof value.html_url === "string" && isStringOrNull(value.bio) &&
    isStringOrNull(value.company) && isStringOrNull(value.blog) && isStringOrNull(value.location) &&
    typeof value.public_repos === "number" && typeof value.followers === "number" && typeof value.following === "number" &&
    typeof value.created_at === "string" && typeof value.updated_at === "string";
}

function isValidRepositoryDto(value: unknown): value is GitHubRepositoryDto {
  if (!isRecord(value) || !isRecord(value.owner)) return false;
  const nullableStrings = [value.description, value.language, value.pushed_at, value.homepage];
  return typeof value.id === "number" && typeof value.name === "string" && typeof value.full_name === "string" &&
    typeof value.owner.login === "string" && typeof value.owner.avatar_url === "string" && typeof value.html_url === "string" &&
    nullableStrings.every(isStringOrNull) && typeof value.fork === "boolean" && typeof value.archived === "boolean" &&
    typeof value.is_template === "boolean" && (value.topics === undefined || (Array.isArray(value.topics) && value.topics.every((topic) => typeof topic === "string"))) &&
    [value.stargazers_count, value.forks_count, value.watchers_count, value.open_issues_count, value.size].every((item) => typeof item === "number") &&
    typeof value.default_branch === "string" && typeof value.created_at === "string" && typeof value.updated_at === "string" &&
    (value.license === null || (isRecord(value.license) && isStringOrNull(value.license.spdx_id))) &&
    typeof value.has_issues === "boolean" && typeof value.has_projects === "boolean" && typeof value.has_wiki === "boolean" && typeof value.visibility === "string";
}

function rateLimitFromHeaders(headers: Headers): GitHubRateLimit | undefined {
  const limit = Number(headers.get("x-ratelimit-limit"));
  const remaining = Number(headers.get("x-ratelimit-remaining"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (![limit, remaining, reset].every(Number.isFinite)) return undefined;
  return { limit, remaining, resetAt: new Date(reset * 1000).toISOString(), resource: "core" };
}

function nextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match?.[2] === "next") return match[1] ?? null;
  }
  return null;
}

function createRequestSignal(parentSignal?: AbortSignal): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      window.clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", abort);
    },
  };
}

async function request(url: string, signal?: AbortSignal): Promise<Response> {
  const requestSignal = createRequestSignal(signal);
  try {
    const response = await fetch(url, { headers: API_HEADERS, signal: requestSignal.signal });
    if (response.ok) return response;

    let apiMessage = "";
    try {
      const body: unknown = await response.json();
      if (isRecord(body) && typeof body.message === "string") apiMessage = body.message;
    } catch {
      // The status and headers remain sufficient for an actionable error.
    }

    const rateLimit = rateLimitFromHeaders(response.headers);
    const isRateLimited = response.status === 429 || (response.status === 403 && (rateLimit?.remaining === 0 || /rate limit/i.test(apiMessage)));
    if (isRateLimited) {
      throw new GitHubClientError("RATE_LIMITED", "GitHub's public API limit has been reached. Try again after the reset time.", response.status, rateLimit?.resetAt);
    }
    if (response.status === 404) throw new GitHubClientError("NOT_FOUND", "That GitHub user was not found.", 404);
    if (response.status >= 500) throw new GitHubClientError("GITHUB_UNAVAILABLE", "GitHub is temporarily unavailable. Try again shortly.", response.status);
    throw new GitHubClientError("NETWORK_ERROR", apiMessage || "GitHub could not complete the request.", response.status);
  } catch (error) {
    if (error instanceof GitHubClientError) throw error;
    if (signal?.aborted) throw error;
    const timedOut = requestSignal.signal.aborted;
    throw new GitHubClientError("NETWORK_ERROR", timedOut ? "GitHub took too long to respond. Please try again." : "Could not reach GitHub. Check your connection and try again.");
  } finally {
    requestSignal.dispose();
  }
}

function optionalText(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeUser(dto: GitHubUserDto, fetchedAt: string): GitHubUserSnapshot {
  const name = optionalText(dto.name);
  const bio = optionalText(dto.bio);
  const company = optionalText(dto.company);
  const blog = optionalText(dto.blog);
  const location = optionalText(dto.location);
  return {
    login: dto.login,
    id: dto.id,
    avatarUrl: dto.avatar_url,
    htmlUrl: dto.html_url,
    publicRepos: dto.public_repos,
    followers: dto.followers,
    following: dto.following,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    fetchedAt,
    ...(name ? { name } : {}),
    ...(bio ? { bio } : {}),
    ...(company ? { company } : {}),
    ...(blog ? { blog } : {}),
    ...(location ? { location } : {}),
  };
}

function normalizeRepository(dto: GitHubRepositoryDto, fetchedAt: string): GitHubRepositorySnapshot {
  const evidenceId = `github:repository:${dto.id}`;
  const description = optionalText(dto.description);
  const language = optionalText(dto.language);
  const pushedAt = optionalText(dto.pushed_at);
  const homepageUrl = optionalText(dto.homepage);
  const licenseSpdxId = optionalText(dto.license?.spdx_id ?? null);
  return {
    id: evidenceId,
    provider: "github",
    providerId: dto.id,
    owner: dto.owner.login,
    name: dto.name,
    fullName: dto.full_name,
    url: dto.html_url,
    isFork: dto.fork,
    isArchived: dto.archived,
    isTemplate: dto.is_template,
    topics: [...new Set(dto.topics ?? [])],
    stars: dto.stargazers_count,
    forks: dto.forks_count,
    openIssues: dto.open_issues_count,
    defaultBranch: dto.default_branch,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    evidence: { id: evidenceId, origin: "observed", source: "github", sourceUrl: dto.html_url, observedAt: fetchedAt },
    ownerAvatarUrl: dto.owner.avatar_url,
    sizeKb: dto.size,
    watchers: dto.watchers_count,
    hasIssuesEnabled: dto.has_issues,
    hasProjectsEnabled: dto.has_projects,
    hasWikiEnabled: dto.has_wiki,
    visibility: "public",
    fetchedAt,
    ...(description ? { description } : {}),
    ...(language ? { primaryLanguage: language } : {}),
    ...(pushedAt ? { pushedAt } : {}),
    ...(homepageUrl ? { homepageUrl } : {}),
    ...(licenseSpdxId ? { licenseSpdxId } : {}),
  };
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new GitHubClientError("MALFORMED_RESPONSE", "GitHub returned a response that could not be read.", response.status);
  }
}

export async function fetchGitHubAuditSource(username: string, signal?: AbortSignal): Promise<GitHubAuditSource> {
  const fetchedAt = new Date().toISOString();
  const userResponse = await request(`${API_ROOT}/users/${encodeURIComponent(username)}`, signal);
  const userBody = await parseJson(userResponse);
  if (!isValidUserDto(userBody)) throw new GitHubClientError("MALFORMED_RESPONSE", "GitHub returned an unexpected user profile response.");

  const repositories: GitHubRepositorySnapshot[] = [];
  const warnings: string[] = [];
  let pageUrl: string | null = `${API_ROOT}/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&direction=desc&per_page=100&page=1`;
  let pages = 0;
  let latestRateLimit = rateLimitFromHeaders(userResponse.headers);

  while (pageUrl && pages < MAX_PAGES) {
    const repositoryResponse = await request(pageUrl, signal);
    latestRateLimit = rateLimitFromHeaders(repositoryResponse.headers) ?? latestRateLimit;
    const body = await parseJson(repositoryResponse);
    if (!Array.isArray(body) || !body.every(isValidRepositoryDto)) {
      throw new GitHubClientError("MALFORMED_RESPONSE", "GitHub returned an unexpected repository response.");
    }
    repositories.push(...body.map((repository) => normalizeRepository(repository, fetchedAt)));
    pageUrl = nextPageUrl(repositoryResponse.headers.get("link"));
    pages += 1;
  }

  if (pageUrl) warnings.push("The account exceeds the 5,000-repository safety limit. This audit contains partial results.");

  return {
    user: normalizeUser(userBody, fetchedAt),
    repositories,
    warnings,
    ...(latestRateLimit ? { rateLimit: latestRateLimit } : {}),
  };
}

export async function fetchReadmePresence(repository: GitHubRepositorySnapshot, signal?: AbortSignal): Promise<boolean | undefined> {
  try {
    await request(`${API_ROOT}/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/readme`, signal);
    return true;
  } catch (error) {
    if (error instanceof GitHubClientError && error.code === "NOT_FOUND") return false;
    if (error instanceof GitHubClientError && error.code === "RATE_LIMITED") throw error;
    return undefined;
  }
}
