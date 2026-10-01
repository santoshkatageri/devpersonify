import type { GitHubRepositorySnapshot, GitHubUserSnapshot } from "../../domain/github";
import type { GitHubRateLimit } from "../../domain/github";
import { fetchGitHubAuditSource, fetchReadmePresence, GitHubClientError } from "./github-api";
import { calculateAuditSummary, scoreRepository, type AuditSummary, type ScoredRepository } from "./scoring-engine";

const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_PREFIX = "devpersonify:audit:v1:";
const MAX_AUTOMATIC_README_CHECKS = 6;
const pendingReadmeChecks = new Map<string, Promise<GitHubAudit>>();

interface CachedAudit {
  savedAt: string;
  user: GitHubUserSnapshot;
  repositories: GitHubRepositorySnapshot[];
  rateLimit?: GitHubRateLimit;
  warnings: string[];
}

export interface GitHubAudit {
  auditAt: string;
  user: GitHubUserSnapshot;
  repositories: ScoredRepository[];
  summary: AuditSummary;
  rateLimit?: GitHubRateLimit;
  warnings: string[];
  fromCache: boolean;
}

function cacheKey(username: string): string {
  return `${CACHE_PREFIX}${username.toLowerCase()}`;
}

function readCache(username: string): CachedAudit | null {
  try {
    const value = localStorage.getItem(cacheKey(username));
    if (!value) return null;
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || !("savedAt" in parsed) || typeof parsed.savedAt !== "string") return null;
    if (Date.now() - Date.parse(parsed.savedAt) > CACHE_TTL_MS) return null;
    return parsed as CachedAudit;
  } catch {
    return null;
  }
}

function writeCache(username: string, value: CachedAudit): void {
  try {
    localStorage.setItem(cacheKey(username), JSON.stringify(value));
  } catch {
    // Audits still work when browser storage is unavailable or full.
  }
}

function buildAudit(cache: CachedAudit, fromCache: boolean): GitHubAudit {
  const auditAt = cache.savedAt;
  const repositories = cache.repositories.map((repository) => ({ repository, result: scoreRepository(repository, auditAt) }));
  return {
    auditAt,
    user: cache.user,
    repositories,
    summary: calculateAuditSummary(repositories, auditAt),
    warnings: cache.warnings,
    fromCache,
    ...(cache.rateLimit ? { rateLimit: cache.rateLimit } : {}),
  };
}

export async function enrichRepositoryInAudit(audit: GitHubAudit, repositoryId: string, signal?: AbortSignal): Promise<GitHubAudit> {
  if (signal?.aborted) return audit;
  const cached = readCache(audit.user.login);
  const latest = cached?.savedAt === audit.auditAt ? buildAudit(cached, audit.fromCache) : audit;
  const target = latest.repositories.find(({ repository }) => repository.id === repositoryId)?.repository;
  if (!target || target.hasReadme !== undefined) return latest;
  const key = `${audit.user.login.toLowerCase()}:${audit.auditAt}:${repositoryId}`;
  const pending = pendingReadmeChecks.get(key);
  if (pending) return pending;

  // Navigation cancels the caller's UI update, not this shared, bounded public
  // request. Back/forward can reuse it instead of spending another API request.
  const check = (async () => {
    const hasReadme = await fetchReadmePresence(target);
    if (hasReadme === undefined) return latest;
    const currentCache = readCache(audit.user.login);
    const sameSnapshot = currentCache?.savedAt === audit.auditAt;
    const current = sameSnapshot ? buildAudit(currentCache, audit.fromCache) : latest;
    const normalizedRepositories = current.repositories.map(({ repository }) => repository.id === repositoryId ? { ...repository, hasReadme } : repository);
    const repositories = normalizedRepositories.map((repository) => ({ repository, result: scoreRepository(repository, audit.auditAt) }));
    const updated = { ...current, repositories, summary: calculateAuditSummary(repositories, audit.auditAt) };
    // Merge concurrent repository checks, but never revive deleted data or
    // overwrite a newer forced audit with an older request's result.
    if (sameSnapshot) writeCache(audit.user.login, { ...currentCache, repositories: normalizedRepositories });
    return updated;
  })().finally(() => pendingReadmeChecks.delete(key));
  pendingReadmeChecks.set(key, check);
  return check;
}

export async function runGitHubAudit(
  username: string,
  options: { signal?: AbortSignal; onAnalyzing?: () => void; forceRefresh?: boolean } = {},
): Promise<GitHubAudit> {
  if (!options.forceRefresh) {
    const cached = readCache(username);
    if (cached) return buildAudit(cached, true);
  }

  const source = await fetchGitHubAuditSource(username, options.signal);
  options.onAnalyzing?.();
  const auditAt = source.user.fetchedAt;
  const baseScores = source.repositories.map((repository) => ({ repository, result: scoreRepository(repository, auditAt) }));
  const requestBudget = source.rateLimit ? Math.max(0, source.rateLimit.remaining - 3) : 3;
  const candidateCount = Math.min(MAX_AUTOMATIC_README_CHECKS, requestBudget);
  const candidates = baseScores
    .filter(({ repository, result }) => !repository.isFork && !repository.isArchived && repository.hasReadme === undefined && result.score >= 55)
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, candidateCount);
  const candidateIds = new Set(candidates.map(({ repository }) => repository.id));
  const enriched = new Map<string, boolean>();
  const warnings = [...source.warnings];

  for (const { repository } of candidates) {
    if (options.signal?.aborted) throw options.signal.reason;
    try {
      const hasReadme = await fetchReadmePresence(repository, options.signal);
      if (hasReadme !== undefined) enriched.set(repository.id, hasReadme);
    } catch (error) {
      if (error instanceof GitHubClientError && error.code === "RATE_LIMITED") {
        warnings.push("README checks stopped because the public GitHub rate limit was reached. Remaining README evidence stays unknown.");
        break;
      }
      throw error;
    }
  }

  const repositories = source.repositories.map((repository) => {
    if (!candidateIds.has(repository.id) || !enriched.has(repository.id)) return repository;
    return { ...repository, hasReadme: enriched.get(repository.id)! };
  });
  if (repositories.some((repository) => repository.hasReadme === undefined)) {
    warnings.push(`README, release, issue, and pull-request details were not fetched for every repository. Unknown is not absent.`);
  }

  const cached: CachedAudit = {
    savedAt: auditAt,
    user: source.user,
    repositories,
    warnings,
    ...(source.rateLimit ? { rateLimit: source.rateLimit } : {}),
  };
  writeCache(username, cached);
  return buildAudit(cached, false);
}
