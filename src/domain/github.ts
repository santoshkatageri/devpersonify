import type { ISODateTime, RepositoryEvidence } from "./developer-profile";

export interface GitHubUserSnapshot {
  login: string;
  id: number;
  name?: string;
  avatarUrl: string;
  htmlUrl: string;
  bio?: string;
  company?: string;
  blog?: string;
  location?: string;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  fetchedAt: ISODateTime;
}

export interface GitHubRepositorySnapshot extends RepositoryEvidence {
  ownerAvatarUrl: string;
  sizeKb: number;
  watchers: number;
  subscribers?: number;
  hasIssuesEnabled: boolean;
  hasProjectsEnabled: boolean;
  hasWikiEnabled: boolean;
  visibility: "public";
  fetchedAt: ISODateTime;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  resetAt: ISODateTime;
  resource: "core";
}

export interface GitHubAuditInput {
  username: string;
  fetchedAt: ISODateTime;
  user: GitHubUserSnapshot;
  repositories: GitHubRepositorySnapshot[];
  rateLimit?: GitHubRateLimit;
}

export type GitHubApiErrorCode =
  | "INVALID_USERNAME"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "MALFORMED_RESPONSE"
  | "GITHUB_UNAVAILABLE";

export interface GitHubApiError {
  code: GitHubApiErrorCode;
  message: string;
  retryAt?: ISODateTime;
  status?: number;
}
