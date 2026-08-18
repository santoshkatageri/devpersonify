import type { RepositoryClassification } from "../../domain/scoring";
import type { ScoredRepository } from "./scoring-engine";

export type RepositoryFilter = RepositoryClassification | "ALL";
export type RepositorySort = "score" | "updated" | "stars" | "name" | "classification";

export interface RepositoryViewState {
  filter: RepositoryFilter;
  sort: RepositorySort;
  query: string;
}

const filters = new Set<RepositoryFilter>(["ALL", "SHOWCASE", "KEEP", "ARCHIVE", "FORK_REVIEW", "REVIEW", "CLEANUP"]);
const sorts = new Set<RepositorySort>(["score", "updated", "stars", "name", "classification"]);

export function repositoryViewFromParams(params: URLSearchParams, defaultSort: RepositorySort = "score"): RepositoryViewState {
  const filterValue = params.get("filter") as RepositoryFilter | null;
  const sortValue = params.get("sort") as RepositorySort | null;
  return { filter: filterValue && filters.has(filterValue) ? filterValue : "ALL", sort: sortValue && sorts.has(sortValue) ? sortValue : defaultSort, query: params.get("q") ?? "" };
}

export function repositoryViewToParams(state: RepositoryViewState, existing = new URLSearchParams()): URLSearchParams {
  const params = new URLSearchParams(existing);
  if (state.filter === "ALL") params.delete("filter"); else params.set("filter", state.filter);
  if (state.sort === "score") params.delete("sort"); else params.set("sort", state.sort);
  if (state.query.trim()) params.set("q", state.query); else params.delete("q");
  return params;
}

export function applyRepositoryView(repositories: ScoredRepository[], state: RepositoryViewState): ScoredRepository[] {
  const query = state.query.trim().toLowerCase();
  return repositories
    .filter(({ result }) => state.filter === "ALL" || result.classification === state.filter)
    .filter(({ repository }) => !query || repository.name.toLowerCase().includes(query) || repository.fullName.toLowerCase().includes(query) || repository.description?.toLowerCase().includes(query))
    .sort((a, b) => {
      if (state.sort === "score") return b.result.score - a.result.score || a.repository.name.localeCompare(b.repository.name);
      if (state.sort === "updated") return Date.parse(b.repository.pushedAt ?? b.repository.updatedAt) - Date.parse(a.repository.pushedAt ?? a.repository.updatedAt) || a.repository.name.localeCompare(b.repository.name);
      if (state.sort === "stars") return b.repository.stars - a.repository.stars || b.result.score - a.result.score || a.repository.name.localeCompare(b.repository.name);
      if (state.sort === "classification") return a.result.classification.localeCompare(b.result.classification) || b.result.score - a.result.score || a.repository.name.localeCompare(b.repository.name);
      return a.repository.name.localeCompare(b.repository.name);
    });
}
