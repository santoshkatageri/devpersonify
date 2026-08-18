/**
 * Internal-only QA fixture runner. Never import from production code.
 * Output uses anonymous labels and contains aggregate metrics only.
 */
import type { GitHubRepositorySnapshot } from "../../src/domain/github";
import { calculateAuditSummary, scoreRepository, type ScoredRepository } from "../../src/features/github-audit/scoring-engine";
import { assessFork, createPreparationState, inferPortfolioCategories, portfolioReadiness, profileCompleteness, recommendDiversePortfolio } from "../../src/features/github-preparation/preparation";

const fixtures = [
  ["Profile A", "santoshkatageri"],
  ["Profile B", "bradtraversy"],
  ["Profile C", "developernrk"],
  ["Profile D", "torvalds"],
] as const;

function nextLink(value: string | null): string | null {
  if (!value) return null;
  for (const part of value.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match?.[2] === "next") return match[1] ?? null;
  }
  return null;
}

function optional(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: Record<string, any>, auditAt: string): GitHubRepositorySnapshot {
  const id = `github:repository:${raw.id}`;
  const description = optional(raw.description);
  const primaryLanguage = optional(raw.language);
  const pushedAt = optional(raw.pushed_at);
  const homepageUrl = optional(raw.homepage);
  const licenseSpdxId = optional(raw.license?.spdx_id);
  return {
    id, provider: "github", providerId: raw.id, owner: raw.owner.login, name: raw.name, fullName: raw.full_name, url: raw.html_url,
    isFork: raw.fork, isArchived: raw.archived, isTemplate: raw.is_template, topics: Array.isArray(raw.topics) ? raw.topics : [], stars: raw.stargazers_count,
    forks: raw.forks_count, openIssues: raw.open_issues_count, defaultBranch: raw.default_branch, createdAt: raw.created_at, updatedAt: raw.updated_at,
    evidence: { id, origin: "observed", source: "github", sourceUrl: raw.html_url, observedAt: auditAt }, ownerAvatarUrl: raw.owner.avatar_url,
    sizeKb: raw.size, watchers: raw.watchers_count, hasIssuesEnabled: raw.has_issues, hasProjectsEnabled: raw.has_projects, hasWikiEnabled: raw.has_wiki,
    visibility: "public", fetchedAt: auditAt,
    ...(description ? { description } : {}), ...(primaryLanguage ? { primaryLanguage } : {}), ...(pushedAt ? { pushedAt } : {}),
    ...(homepageUrl ? { homepageUrl } : {}), ...(licenseSpdxId ? { licenseSpdxId } : {}),
  };
}

function daysSince(value: string | undefined, auditAt: string): number | null {
  if (!value) return null;
  const start = Date.parse(value); const end = Date.parse(auditAt);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.floor((end - start) / 86_400_000) : null;
}

async function fetchRepositories(username: string) {
  const auditAt = new Date().toISOString();
  const requestLog: Array<{ method: string; kind: string }> = [];
  const errors: string[] = [];
  const repositories: GitHubRepositorySnapshot[] = [];
  let remaining: string | null = null;
  let url: string | null = `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&direction=desc&per_page=100&page=1`;
  while (url) {
    requestLog.push({ method: "GET", kind: "repository-list" });
    const response = await fetch(url, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
    remaining = response.headers.get("x-ratelimit-remaining");
    if (!response.ok) {
      errors.push(`Direct GitHub API status ${response.status}; internal QA mirror fallback used`);
      repositories.length = 0;
      for (let page = 1; page <= 50; page += 1) {
        requestLog.push({ method: "GET", kind: "internal-qa-mirror-list" });
        const sourceUrl = `http://api.github.com/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&direction=desc&per_page=100&page=${page}`;
        const mirror = await fetch(`https://r.jina.ai/${sourceUrl}`);
        if (!mirror.ok) throw new Error(`Internal QA mirror status ${mirror.status}`);
        const text = await mirror.text();
        const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
        const payload = fenced?.[1] ?? text.split("Markdown Content:\n")[1]?.trim();
        if (!payload) throw new Error("Internal QA mirror returned an unexpected shape");
        const raw: unknown = JSON.parse(payload);
        if (!Array.isArray(raw)) throw new Error("Internal QA mirror repository payload was not an array");
        repositories.push(...raw.map((item) => normalize(item, auditAt)));
        if (raw.length < 100) break;
      }
      url = null;
      continue;
    }
    const raw: unknown = await response.json();
    if (!Array.isArray(raw)) { errors.push("Unexpected repository-list shape"); break; }
    repositories.push(...raw.map((item) => normalize(item, auditAt)));
    url = nextLink(response.headers.get("link"));
  }
  return { auditAt, repositories, requestLog, errors, remaining };
}

async function confirmLikelyReadmes(items: ScoredRepository[], maximum = 6): Promise<{ repositories: GitHubRepositorySnapshot[]; probes: number }> {
  const targets = items.filter(({ repository, result }) => !repository.isFork && !repository.isArchived && result.score >= 55).sort((a, b) => b.result.score - a.result.score).slice(0, maximum);
  const found = new Set<string>();
  let probes = 0;
  for (const { repository } of targets) {
    probes += 1;
    try {
      const url = `https://raw.githubusercontent.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/${encodeURIComponent(repository.defaultBranch)}/README.md`;
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (response.ok) found.add(repository.id);
    } catch {
      // A failed QA-only probe stays unknown; it is never converted to README absence.
    }
  }
  return { repositories: items.map(({ repository }) => found.has(repository.id) ? { ...repository, hasReadme: true } : repository), probes };
}

for (const [label, username] of fixtures) {
  const started = performance.now();
  try {
    const source = await fetchRepositories(username);
    const base = source.repositories.map((repository) => ({ repository, result: scoreRepository(repository, source.auditAt) }));
    const readmes = await confirmLikelyReadmes(base);
    const scored = readmes.repositories.map((repository) => ({ repository, result: scoreRepository(repository, source.auditAt) }));
    const summary = calculateAuditSummary(scored, source.auditAt);
    const suggestions = recommendDiversePortfolio(scored, source.auditAt);
    const categories = [...new Set(suggestions.flatMap((id) => {
      const item = scored.find(({ repository }) => repository.id === id);
      return item ? inferPortfolioCategories(item.repository).map((value) => value.category) : [];
    }))];
    const readiness = { READY: 0, NEEDS_WORK: 0, REVIEW: 0 };
    scored.forEach(({ repository }) => { readiness[portfolioReadiness(repository, source.auditAt).status] += 1; });
    const forkAssessments = { POTENTIALLY_MEANINGFUL: 0, LIKELY_LOW_VALUE: 0, MANUAL_REVIEW: 0 };
    scored.forEach(({ repository }) => { const result = assessFork(repository, source.auditAt); if (result) forkAssessments[result.assessment] += 1; });
    const oldSignificantArchive = scored.filter(({ repository, result }) => {
      const days = daysSince(repository.pushedAt, source.auditAt);
      return !repository.isFork && days !== null && days > 730 && (repository.stars >= 10 || repository.forks >= 5) && result.classification === "ARCHIVE";
    }).length;
    const highStar = scored.filter(({ repository }) => repository.stars >= 50);
    const recentWeak = scored.filter(({ repository }) => {
      const days = daysSince(repository.pushedAt, source.auditAt);
      return !repository.isFork && days !== null && days <= 90 && !repository.description && repository.topics.length === 0;
    });
    const output = {
      label,
      aggregate: {
        repositoryCount: scored.length, originals: summary.originalCount, forks: summary.forkCount,
        archivedRepositories: scored.filter(({ repository }) => repository.isArchived).length, activeRepositories: summary.activeCount,
        showcaseCandidates: summary.classifications.SHOWCASE, keepCandidates: summary.classifications.KEEP, archiveCandidates: summary.classifications.ARCHIVE,
        forkReviewCandidates: summary.classifications.FORK_REVIEW, manualReviewCandidates: summary.classifications.REVIEW,
        cleanupCandidates: summary.classifications.CLEANUP, portfolioHealth: summary.portfolio.score, evidenceCoverage: summary.explanationCoverage,
      },
      readiness,
      forkAssessments,
      portfolio: { suggestedCount: suggestions.length, categoryCount: categories.length, categories },
      profileCompleteness: profileCompleteness(createPreparationState("qa").profile),
      biasChecks: {
        highStarRepositories: highStar.length, highStarShowcase: highStar.filter(({ result }) => result.classification === "SHOWCASE").length,
        oldSignificantClassifiedArchive: oldSignificantArchive, recentWeakRepositories: recentWeak.length,
        recentWeakShowcase: recentWeak.filter(({ result }) => result.classification === "SHOWCASE").length,
      },
      api: { requestCount: source.requestLog.length, requestTypes: source.requestLog, qaOnlyReadmeHeadProbes: readmes.probes, remaining: source.remaining },
      errors: source.errors,
      durationMs: Math.round(performance.now() - started),
    };
    console.log(JSON.stringify(output));
  } catch (error) {
    console.log(JSON.stringify({ label, errors: [error instanceof Error ? error.message : "Unknown regression runner error"], durationMs: Math.round(performance.now() - started) }));
  }
}
