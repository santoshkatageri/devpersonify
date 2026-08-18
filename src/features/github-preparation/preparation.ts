import type { GitHubRepositorySnapshot, GitHubUserSnapshot } from "../../domain/github";
import type { RepositoryClassification } from "../../domain/scoring";
import type { ScoredRepository } from "../github-audit/scoring-engine";

export const PREPARATION_STORAGE_VERSION = 1 as const;

export type UserRepositoryDecision = "KEEP" | "SHOWCASE" | "ARCHIVE" | "REVIEW";
export type PortfolioCategory = "frontend" | "backend" | "cloud_infrastructure" | "systems" | "open_source" | "data_ml" | "general";
export type ForkAssessment = "POTENTIALLY_MEANINGFUL" | "LIKELY_LOW_VALUE" | "MANUAL_REVIEW";
export type ReadinessStatus = "READY" | "NEEDS_WORK" | "REVIEW";
export type ReadinessItemStatus = "observed" | "not_detected" | "unknown";

export interface RepositoryPreference {
  decision?: UserRepositoryDecision;
  selectedForShowcase: boolean;
  selectedForPortfolio: boolean;
  needsManualReview: boolean;
}

export interface ProfileInput {
  professionalHeadline: string;
  currentFocus: string;
  targetRoles: string;
  shortIntroduction: string;
  location: string;
  website: string;
  linkedinUrl: string;
  email: string;
  additionalSkills: string;
  preferredTechnologies: string;
}

export type ReadmeSectionKey = "introduction" | "whatIBuild" | "selectedProjects" | "technologies" | "openSource" | "contact";

export interface ReadmePreferences {
  introduction: boolean;
  whatIBuild: boolean;
  selectedProjects: boolean;
  technologies: boolean;
  openSource: boolean;
  contact: boolean;
}

export interface PreparationState {
  version: typeof PREPARATION_STORAGE_VERSION;
  username: string;
  updatedAt: string;
  repositories: Record<string, RepositoryPreference>;
  portfolioOrder: string[];
  profile: ProfileInput;
  readmeSections: ReadmePreferences;
}

export interface ReadinessItem {
  label: string;
  status: ReadinessItemStatus;
  evidence: string;
}

export interface PortfolioReadiness {
  status: ReadinessStatus;
  items: ReadinessItem[];
}

export interface ForkReview {
  assessment: ForkAssessment;
  explanation: string;
  signals: string[];
}

const emptyProfile: ProfileInput = {
  professionalHeadline: "",
  currentFocus: "",
  targetRoles: "",
  shortIntroduction: "",
  location: "",
  website: "",
  linkedinUrl: "",
  email: "",
  additionalSkills: "",
  preferredTechnologies: "",
};

export function createPreparationState(username: string, now = new Date().toISOString()): PreparationState {
  return {
    version: PREPARATION_STORAGE_VERSION,
    username,
    updatedAt: now,
    repositories: {},
    portfolioOrder: [],
    profile: { ...emptyProfile },
    readmeSections: { introduction: true, whatIBuild: true, selectedProjects: true, technologies: true, openSource: true, contact: true },
  };
}

export function defaultPreference(): RepositoryPreference {
  return { selectedForShowcase: false, selectedForPortfolio: false, needsManualReview: false };
}

export function getPreference(state: PreparationState, repositoryId: string): RepositoryPreference {
  return state.repositories[repositoryId] ?? defaultPreference();
}

export function setRepositoryDecision(state: PreparationState, repositoryId: string, decision: UserRepositoryDecision, now = new Date().toISOString()): PreparationState {
  const current = getPreference(state, repositoryId);
  const next = {
    ...current,
    decision,
    selectedForShowcase: decision === "SHOWCASE" ? true : current.selectedForShowcase,
    selectedForPortfolio: decision === "SHOWCASE" ? true : current.selectedForPortfolio,
    needsManualReview: decision === "REVIEW",
  };
  const portfolioOrder = next.selectedForPortfolio && !state.portfolioOrder.includes(repositoryId) ? [...state.portfolioOrder, repositoryId] : state.portfolioOrder;
  return { ...state, updatedAt: now, repositories: { ...state.repositories, [repositoryId]: next }, portfolioOrder };
}

export function togglePortfolioSelection(state: PreparationState, repositoryId: string, selected: boolean, now = new Date().toISOString()): PreparationState {
  const current = getPreference(state, repositoryId);
  return {
    ...state,
    updatedAt: now,
    repositories: { ...state.repositories, [repositoryId]: { ...current, selectedForPortfolio: selected } },
    portfolioOrder: selected ? (state.portfolioOrder.includes(repositoryId) ? state.portfolioOrder : [...state.portfolioOrder, repositoryId]) : state.portfolioOrder.filter((id) => id !== repositoryId),
  };
}

export function toggleManualReview(state: PreparationState, repositoryId: string, selected: boolean, now = new Date().toISOString()): PreparationState {
  const current = getPreference(state, repositoryId);
  return { ...state, updatedAt: now, repositories: { ...state.repositories, [repositoryId]: { ...current, needsManualReview: selected } } };
}

export function toggleShowcaseSelection(state: PreparationState, repositoryId: string, selected: boolean, now = new Date().toISOString()): PreparationState {
  const current = getPreference(state, repositoryId);
  const portfolioOrder = selected && !state.portfolioOrder.includes(repositoryId) ? [...state.portfolioOrder, repositoryId] : state.portfolioOrder;
  return {
    ...state,
    updatedAt: now,
    repositories: { ...state.repositories, [repositoryId]: { ...current, selectedForShowcase: selected, selectedForPortfolio: selected || current.selectedForPortfolio } },
    portfolioOrder,
  };
}

export function movePortfolioItem(state: PreparationState, repositoryId: string, direction: -1 | 1, now = new Date().toISOString()): PreparationState {
  const index = state.portfolioOrder.indexOf(repositoryId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.portfolioOrder.length) return state;
  const portfolioOrder = [...state.portfolioOrder];
  [portfolioOrder[index], portfolioOrder[nextIndex]] = [portfolioOrder[nextIndex]!, portfolioOrder[index]!];
  return { ...state, updatedAt: now, portfolioOrder };
}

function searchableMetadata(repository: GitHubRepositorySnapshot): string {
  return [repository.name, repository.description ?? "", repository.primaryLanguage ?? "", ...repository.topics].join(" ").toLowerCase();
}

export function inferPortfolioCategories(repository: GitHubRepositorySnapshot): Array<{ category: PortfolioCategory; explanation: string }> {
  const text = searchableMetadata(repository);
  const matches: Array<{ category: PortfolioCategory; explanation: string }> = [];
  const add = (category: PortfolioCategory, keywords: string[]) => {
    const observed = keywords.filter((keyword) => text.includes(keyword));
    if (observed.length) matches.push({ category, explanation: `Appears relevant from public metadata: ${observed.slice(0, 3).join(", ")}.` });
  };
  add("frontend", ["frontend", "front-end", "ui", "css", "web-component", "react", "vue", "angular", "svelte"]);
  add("backend", ["backend", "back-end", "api", "server", "microservice", "rest-api", "graphql"]);
  add("cloud_infrastructure", ["cloud", "devops", "infrastructure", "kubernetes", "docker", "terraform", "aws", "azure", "gcp"]);
  add("systems", ["systems", "kernel", "compiler", "embedded", "operating-system", "rust", "c++"]);
  add("data_ml", ["data-engineering", "machine-learning", "deep-learning", "dataset", "pytorch", "tensorflow", "kaggle"]);
  if (repository.isFork) matches.push({ category: "open_source", explanation: "Fork status suggests possible open-source relevance, but contribution depth requires manual review." });
  return matches.length ? matches : [{ category: "general", explanation: "Public metadata does not support a more specific project category." }];
}

function daysSince(value: string | undefined, auditAt: string): number | null {
  if (!value) return null;
  const start = Date.parse(value);
  const end = Date.parse(auditAt);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.floor((end - start) / 86_400_000) : null;
}

export function assessFork(repository: GitHubRepositorySnapshot, auditAt: string): ForkReview | null {
  if (!repository.isFork) return null;
  const activityDays = daysSince(repository.pushedAt, auditAt);
  const meaningfulSignals = [repository.description && repository.description.length >= 40 ? "useful description" : null, repository.topics.length > 0 ? "repository topics" : null, repository.stars >= 3 ? "public stars" : null, activityDays !== null && activityDays <= 365 ? "recent public activity" : null].filter((value): value is string => Boolean(value));
  const lowSignals = [!repository.description ? "description not detected" : null, repository.topics.length === 0 ? "topics not detected" : null, repository.stars === 0 && repository.forks === 0 ? "no repository-level public engagement detected" : null, activityDays !== null && activityDays > 730 ? "no recent public push activity" : null].filter((value): value is string => Boolean(value));
  if (meaningfulSignals.length >= 3) return { assessment: "POTENTIALLY_MEANINGFUL", explanation: "This fork has several public signals that may justify portfolio review. Fork status does not reveal contribution depth.", signals: meaningfulSignals };
  if (lowSignals.length >= 3) return { assessment: "LIKELY_LOW_VALUE", explanation: "This fork currently exposes limited public portfolio context. Review it manually before deciding whether it should stay prominent.", signals: lowSignals };
  return { assessment: "MANUAL_REVIEW", explanation: "Available metadata is insufficient to judge this fork. Fork status alone does not determine portfolio value.", signals: [...meaningfulSignals, ...lowSignals] };
}

export function portfolioReadiness(repository: GitHubRepositorySnapshot, auditAt: string): PortfolioReadiness {
  const activityDays = daysSince(repository.pushedAt, auditAt);
  const items: ReadinessItem[] = [
    { label: "Description", status: repository.description ? "observed" : "not_detected", evidence: repository.description ? "Public repository description observed." : "Description not detected in public metadata." },
    { label: "README", status: repository.hasReadme === true ? "observed" : repository.hasReadme === false ? "not_detected" : "unknown", evidence: repository.hasReadme === true ? "README confirmed by a targeted public request." : repository.hasReadme === false ? "README not detected on the default branch." : "README was not checked; unknown is not absent." },
    { label: "License", status: repository.licenseSpdxId && repository.licenseSpdxId !== "NOASSERTION" ? "observed" : "not_detected", evidence: repository.licenseSpdxId ? `Observed license: ${repository.licenseSpdxId}.` : "Recognized license not detected in listing metadata." },
    { label: "Demo or homepage", status: repository.homepageUrl ? "observed" : "not_detected", evidence: repository.homepageUrl ? `Public homepage observed: ${repository.homepageUrl}` : "Demo/homepage URL not detected in public metadata." },
    { label: "Topics", status: repository.topics.length ? "observed" : "not_detected", evidence: repository.topics.length ? `${repository.topics.length} public topic${repository.topics.length === 1 ? "" : "s"} observed.` : "Repository topics not detected." },
    { label: "Screenshots", status: "unknown", evidence: "README content was not inspected for screenshots." },
    { label: "Recent activity", status: activityDays !== null && activityDays <= 365 ? "observed" : activityDays === null ? "unknown" : "not_detected", evidence: activityDays === null ? "Public push date unavailable." : activityDays <= 365 ? `Public push activity observed ${activityDays} days before the audit.` : `No public push activity detected in the last year (${activityDays} days).` },
    { label: "Original repository", status: repository.isFork ? "not_detected" : "observed", evidence: repository.isFork ? "This repository is a fork; contribution depth requires manual review." : "Repository is not marked as a fork." },
  ];
  const observed = items.filter((item) => item.status === "observed").length;
  const notDetected = items.filter((item) => item.status === "not_detected").length;
  const status: ReadinessStatus = repository.isFork || repository.hasReadme === undefined ? "REVIEW" : observed >= 6 && notDetected <= 1 ? "READY" : "NEEDS_WORK";
  return { status, items };
}

export function recommendDiversePortfolio(repositories: ScoredRepository[], auditAt: string, maximum = 6): string[] {
  const candidates = repositories
    .filter(({ repository, result }) => !repository.isArchived && (!repository.isFork || assessFork(repository, auditAt)?.assessment === "POTENTIALLY_MEANINGFUL") && result.classification !== "ARCHIVE")
    .sort((a, b) => b.result.score - a.result.score || Date.parse(b.repository.pushedAt ?? "") - Date.parse(a.repository.pushedAt ?? ""));
  const selected: string[] = [];
  const covered = new Set<PortfolioCategory>();
  for (const item of candidates) {
    const categories = inferPortfolioCategories(item.repository).map(({ category }) => category);
    if (categories.some((category) => !covered.has(category))) {
      selected.push(item.repository.id);
      categories.forEach((category) => covered.add(category));
    }
    if (selected.length === maximum) return selected;
  }
  for (const item of candidates) {
    if (!selected.includes(item.repository.id)) selected.push(item.repository.id);
    if (selected.length === maximum) break;
  }
  return selected;
}

export function displayComputedRecommendation(classification: RepositoryClassification): string {
  return classification === "FORK_REVIEW" ? "Fork review" : classification.charAt(0) + classification.slice(1).toLowerCase();
}

export function escapeMarkdownContent(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/([\\`*])/g, "\\$1")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replace(/\r?\n+/g, " ")
    .trim();
}

function safeUrl(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.match(/^https?:\/\//i) ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function csv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function generateProfileReadme(state: PreparationState, user: GitHubUserSnapshot, repositories: ScoredRepository[]): string {
  const selected = state.portfolioOrder.map((id) => repositories.find(({ repository }) => repository.id === id)).filter((item): item is ScoredRepository => Boolean(item));
  const profile = state.profile;
  const sections: string[] = [];
  const displayName = escapeMarkdownContent(user.name ?? user.login);
  sections.push(`# Hi, I'm ${displayName}`);
  if (profile.professionalHeadline) sections.push(`**${escapeMarkdownContent(profile.professionalHeadline)}**`);
  if (profile.targetRoles) sections.push(`**Target roles:** ${csv(profile.targetRoles).map(escapeMarkdownContent).join(", ")}`);

  if (state.readmeSections.introduction) {
    const introduction = profile.shortIntroduction || user.bio || "";
    if (introduction) sections.push(`## Introduction\n\n${escapeMarkdownContent(introduction)}`);
  }
  if (state.readmeSections.whatIBuild && profile.currentFocus) sections.push(`## What I build\n\n${escapeMarkdownContent(profile.currentFocus)}`);
  if (state.readmeSections.selectedProjects && selected.length) {
    const lines = selected.map(({ repository }) => {
      const description = repository.description ? ` — ${escapeMarkdownContent(repository.description)}` : "";
      const repositoryUrl = safeUrl(repository.url);
      const name = escapeMarkdownContent(repository.name);
      return repositoryUrl ? `- **[${name}](${repositoryUrl})**${description}` : `- **${name}**${description}`;
    });
    sections.push(`## Selected projects\n\n${lines.join("\n")}`);
  }
  if (state.readmeSections.technologies) {
    const observedLanguages = [...new Set(selected.map(({ repository }) => repository.primaryLanguage).filter((value): value is string => Boolean(value)))];
    const provided = [...csv(profile.preferredTechnologies), ...csv(profile.additionalSkills)];
    const lines: string[] = [];
    if (observedLanguages.length) lines.push(`- **Observed in selected GitHub repositories:** ${observedLanguages.map(escapeMarkdownContent).join(", ")}`);
    if (provided.length) lines.push(`- **Provided by me:** ${[...new Set(provided)].map(escapeMarkdownContent).join(", ")}`);
    if (lines.length) sections.push(`## Technologies\n\n${lines.join("\n")}`);
  }
  if (state.readmeSections.openSource) {
    const forks = selected.filter(({ repository }) => repository.isFork);
    if (forks.length) sections.push(`## Open source\n\n${forks.map(({ repository }) => {
      const repositoryUrl = safeUrl(repository.url);
      const name = escapeMarkdownContent(repository.name);
      return repositoryUrl ? `- [${name}](${repositoryUrl}) — selected fork; contribution context should be reviewed manually.` : `- ${name} — selected fork; contribution context should be reviewed manually.`;
    }).join("\n")}`);
  }
  if (state.readmeSections.contact) {
    const contact: string[] = [];
    const website = safeUrl(profile.website || user.blog || "");
    const linkedin = safeUrl(profile.linkedinUrl);
    if (website) contact.push(`- [Website](${website})`);
    if (linkedin) contact.push(`- [LinkedIn](${linkedin})`);
    if (profile.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) contact.push(`- Email: ${escapeMarkdownContent(profile.email)}`);
    const location = profile.location || user.location;
    if (location) contact.push(`- Location: ${escapeMarkdownContent(location)}`);
    if (contact.length) sections.push(`## Contact\n\n${contact.join("\n")}`);
  }
  return `${sections.join("\n\n")}\n`;
}

export function profileCompleteness(profile: ProfileInput): { score: number; missing: string[] } {
  const fields: Array<[keyof ProfileInput, string]> = [
    ["professionalHeadline", "professional headline"], ["currentFocus", "current focus"], ["targetRoles", "target roles"], ["shortIntroduction", "short introduction"],
    ["location", "location"], ["website", "website"], ["linkedinUrl", "LinkedIn URL"], ["email", "email"],
  ];
  const complete = fields.filter(([key]) => profile[key].trim()).length;
  return { score: Math.round((complete / fields.length) * 100), missing: fields.filter(([key]) => !profile[key].trim()).map(([, label]) => label) };
}
