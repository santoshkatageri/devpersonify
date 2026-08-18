import type { GitHubRepositorySnapshot } from "../../domain/github";
import { calculateAuditSummary, scoreRepository } from "./scoring-engine";

const auditAt = "2026-08-18T00:00:00.000Z";

function repository(overrides: Partial<GitHubRepositorySnapshot> = {}): GitHubRepositorySnapshot {
  return {
    id: "github:repository:1",
    provider: "github",
    providerId: 1,
    owner: "developer",
    name: "evidence-project",
    fullName: "developer/evidence-project",
    url: "https://github.com/developer/evidence-project",
    description: "A well documented public project with a clear purpose and useful implementation details.",
    isFork: false,
    isArchived: false,
    isTemplate: false,
    primaryLanguage: "TypeScript",
    topics: ["typescript", "developer-tools", "portfolio"],
    stars: 12,
    forks: 3,
    openIssues: 1,
    defaultBranch: "main",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2026-08-10T00:00:00Z",
    pushedAt: "2026-08-10T00:00:00Z",
    homepageUrl: "https://example.dev",
    licenseSpdxId: "MIT",
    hasReadme: true,
    evidence: { id: "github:repository:1", origin: "observed", source: "github", sourceUrl: "https://github.com/developer/evidence-project", observedAt: auditAt },
    ownerAvatarUrl: "https://avatars.example/1",
    sizeKb: 100,
    watchers: 12,
    hasIssuesEnabled: true,
    hasProjectsEnabled: true,
    hasWikiEnabled: false,
    visibility: "public",
    fetchedAt: auditAt,
    ...overrides,
  };
}

describe("repository scoring", () => {
  it("is deterministic and produces a showcase candidate from strong known evidence", () => {
    const first = scoreRepository(repository(), auditAt);
    const second = scoreRepository(repository(), auditAt);
    expect(first).toEqual(second);
    expect(first.classification).toBe("SHOWCASE");
    expect(first.score).toBeGreaterThanOrEqual(70);
    expect(first.reasons.length).toBeGreaterThan(8);
  });

  it("marks unfetched evidence unknown instead of scoring it as missing", () => {
    const repo = repository();
    delete repo.hasReadme;
    const result = scoreRepository(repo, auditAt);
    expect(result.unknownSignals).toContain("readme_presence");
    expect(result.reasons.some((reason) => reason.signal === "readme_presence")).toBe(false);
    expect(result.availablePositivePoints).toBeLessThan(100);
  });

  it("uses classification precedence for forks and archived repositories", () => {
    expect(scoreRepository(repository({ isFork: true }), auditAt).classification).toBe("FORK_REVIEW");
    expect(scoreRepository(repository({ isArchived: true }), auditAt).classification).toBe("ARCHIVE");
  });

  it("preserves historical review for older engaged repositories without making stars an automatic showcase", () => {
    const historical = repository({ pushedAt: "2020-01-01T00:00:00Z", stars: 120, forks: 20, hasReadme: false });
    delete historical.description;
    delete historical.homepageUrl;
    historical.topics = [];
    const result = scoreRepository(historical, auditAt);
    expect(result.classification).toBe("REVIEW");
    expect(result.classificationReason).toMatch(/historical relevance/i);
  });

  it("still recommends archive for old low-engagement repositories with weak evidence", () => {
    const oldLowSignal = repository({ pushedAt: "2020-01-01T00:00:00Z", stars: 0, forks: 0, hasReadme: false });
    delete oldLowSignal.description;
    delete oldLowSignal.homepageUrl;
    delete oldLowSignal.licenseSpdxId;
    oldLowSignal.topics = [];
    expect(scoreRepository(oldLowSignal, auditAt).classification).toBe("ARCHIVE");
  });

  it("recommends cleanup for a recent repository with weak public metadata", () => {
    const repo = repository({ topics: [], stars: 0, forks: 0, hasReadme: false });
    delete repo.description;
    delete repo.homepageUrl;
    delete repo.licenseSpdxId;
    const result = scoreRepository(repo, auditAt);
    expect(result.classification).toBe("CLEANUP");
    expect(result.classificationReason).toMatch(/gaps/i);
  });

  it("calculates portfolio summary counts and explanation coverage", () => {
    const repositories = [repository(), repository({ id: "github:repository:2", providerId: 2, name: "fork", fullName: "developer/fork", isFork: true })].map((item) => ({ repository: item, result: scoreRepository(item, auditAt) }));
    const summary = calculateAuditSummary(repositories, auditAt);
    expect(summary.repositoryCount).toBe(2);
    expect(summary.originalCount).toBe(1);
    expect(summary.forkCount).toBe(1);
    expect(summary.classifications.SHOWCASE).toBe(1);
    expect(summary.classifications.FORK_REVIEW).toBe(1);
    expect(summary.explanationCoverage).toBeGreaterThan(50);
  });
});
