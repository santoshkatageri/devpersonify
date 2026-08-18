export const REPOSITORY_SCORE_VERSION = "repo-v1.1" as const;
export const PORTFOLIO_HEALTH_VERSION = "portfolio-v1" as const;

export type RepositoryClassification =
  | "SHOWCASE"
  | "KEEP"
  | "ARCHIVE"
  | "FORK_REVIEW"
  | "REVIEW"
  | "CLEANUP";

export type ScoreSignalKey =
  | "original_repository"
  | "recent_push"
  | "repository_maturity"
  | "stars"
  | "forks"
  | "description_quality"
  | "readme_presence"
  | "license_presence"
  | "topics_presence"
  | "release_activity"
  | "issues_activity"
  | "pull_request_activity"
  | "project_completeness"
  | "archived_repository"
  | "fork_repository"
  | "stale_repository";

export interface ScoreReason {
  signal: ScoreSignalKey;
  points: number;
  observedValue: string | number | boolean | null;
  explanation: string;
}

export interface RepositoryScore {
  version: typeof REPOSITORY_SCORE_VERSION;
  repositoryId: string;
  auditAt: string;
  score: number;
  availablePositivePoints: number;
  classification: RepositoryClassification;
  classificationReason: string;
  confidence: "high" | "medium" | "low";
  reasons: ScoreReason[];
  unknownSignals: ScoreSignalKey[];
  warnings: string[];
}

export interface PortfolioHealthBreakdown {
  showcaseQuality: number;
  documentationCoverage: number;
  metadataCoverage: number;
  maintenanceHealth: number;
  portfolioFocus: number;
}

export interface PortfolioHealthScore {
  version: typeof PORTFOLIO_HEALTH_VERSION;
  score: number;
  breakdown: PortfolioHealthBreakdown;
  explanations: string[];
}

/** Stable, reviewable configuration. See docs/scoring.md for rule semantics. */
export const REPOSITORY_SCORE_WEIGHTS = {
  originalRepository: 8,
  recentPushMax: 18,
  repositoryMaturityMax: 5,
  starsMax: 7,
  forksMax: 3,
  descriptionQualityMax: 10,
  readmePresence: 15,
  licensePresence: 5,
  topicsPresenceMax: 7,
  releaseActivity: 5,
  issuesActivityMax: 3,
  pullRequestActivityMax: 4,
  projectCompletenessMax: 10,
  archivedPenalty: -35,
  forkPenalty: -20,
  stalePenaltyMax: -10,
} as const;

export const CLASSIFICATION_THRESHOLDS = {
  showcaseMinimum: 70,
  keepMinimum: 50,
  cleanupMinimum: 30,
} as const;
