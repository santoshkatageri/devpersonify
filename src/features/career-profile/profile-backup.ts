import { CAREER_EVIDENCE_SCHEMA_VERSION, type CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { deriveCareerEvidence } from "./career-profile";
import { parseGitHubUsername } from "../github-audit/github-username";

const BACKUP_KIND = "devpersonify-career-profile";
export const MAX_PROFILE_BACKUP_BYTES = 8 * 1024 * 1024;
const sections = ["experience", "education", "skills", "projects", "certifications", "achievements", "professionalLinks", "other"];
const preferenceKeys = ["headline", "summary", "experience", "selectedProjects", "skills", "education", "certifications", "achievements", "links"];

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string { return typeof value === "string"; }
function optionalText(value: unknown): boolean { return value === undefined || text(value); }
function texts(value: unknown): value is string[] { return Array.isArray(value) && value.every(text); }
function source(value: unknown): boolean {
  return object(value) && ["GITHUB_OBSERVED", "RESUME_PROVIDED", "USER_PROVIDED", "DERIVED"].includes(String(value.source)) &&
    text(value.sourceId) && text(value.observedAt) && optionalText(value.note);
}
function sources(value: unknown): boolean { return Array.isArray(value) && value.every(source); }
function evidence(value: unknown, list = false): boolean {
  return object(value) && text(value.id) && (list ? texts(value.value) : text(value.value)) &&
    sources(value.provenance) && text(value.updatedAt);
}
function evidenceFields(value: unknown, keys: string[], listKey?: string): boolean {
  return object(value) && Object.entries(value).every(([key, item]) => keys.includes(key) && evidence(item, key === listKey));
}
function careerRecords(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => object(item) && text(item.id) && text(item.title) &&
    optionalText(item.organization) && optionalText(item.description) && optionalText(item.startDate) &&
    optionalText(item.endDate) && optionalText(item.url) && texts(item.technologies) &&
    sources(item.provenance) && text(item.updatedAt));
}
function validProfile(profile: Record<string, unknown>): boolean {
  const github = profile.githubEvidence;
  const resume = profile.resumeEvidence;
  const preferences = profile.sectionPreferences;
  return text(profile.id) && text(profile.createdAt) && text(profile.updatedAt) &&
    evidenceFields(profile.identity, ["name", "location", "email", "website", "linkedin", "otherInformation"]) &&
    evidenceFields(profile.careerDirection, ["professionalHeadline", "currentRole", "targetRole", "careerDirection", "shortIntroduction", "yearsOfExperience", "preferredTechnologies"], "preferredTechnologies") &&
    object(github) && text(github.username) && text(github.profileUrl) && text(github.observedAt) &&
    optionalText(github.displayName) && optionalText(github.bio) && optionalText(github.location) &&
    optionalText(github.website) && Array.isArray(github.repositories) &&
    github.repositories.every((item) => object(item) && text(item.repositoryId) && text(item.name) &&
      text(item.url) && optionalText(item.description) && optionalText(item.language) &&
      optionalText(item.pushedAt) && texts(item.topics) && typeof item.isFork === "boolean" &&
      typeof item.selectedForPortfolio === "boolean" && typeof item.selectedForShowcase === "boolean" &&
      source(item.provenance)) &&
    (resume === undefined || (object(resume) && text(resume.id) && optionalText(resume.fileName) &&
      ["PDF", "DOCX", "TXT", "PASTED_TEXT"].includes(String(resume.fileType)) && text(resume.text) &&
      text(resume.importedAt) && typeof resume.sizeBytes === "number" && Number.isFinite(resume.sizeBytes) &&
      resume.sizeBytes >= 0 && resume.private === true)) &&
    Array.isArray(profile.resumeReview) && profile.resumeReview.every((item) => object(item) &&
      text(item.id) && sections.includes(String(item.section)) && text(item.title) &&
      text(item.organization) && text(item.description) && text(item.startDate) &&
      text(item.endDate) && text(item.url) && texts(item.technologies) &&
      ["PENDING", "ACCEPTED"].includes(String(item.status)) && source(item.provenance)) &&
    careerRecords(profile.experience) && careerRecords(profile.education) &&
    careerRecords(profile.projects) && careerRecords(profile.certifications) &&
    careerRecords(profile.achievements) && careerRecords(profile.professionalLinks) &&
    careerRecords(profile.other) && Array.isArray(profile.skills) &&
    profile.skills.every((item) => object(item) && text(item.id) && text(item.name) &&
      text(item.normalizedName) && sources(item.provenance) && texts(item.githubRepositoryIds) &&
      text(item.updatedAt)) && sources(profile.userProvided) && object(preferences) &&
    preferenceKeys.every((key) => typeof preferences[key] === "boolean");
}

export function exportProfileBackup(profile: CareerEvidenceProfile): string {
  return JSON.stringify({ kind: BACKUP_KIND, version: 1, exportedAt: new Date().toISOString(), profile }, null, 2);
}

export function importProfileBackup(source: string, expectedUsername?: string): CareerEvidenceProfile {
  if (new Blob([source]).size > MAX_PROFILE_BACKUP_BYTES) throw new Error("This backup is larger than 8 MB.");
  let parsed: unknown;
  try { parsed = JSON.parse(source); }
  catch { throw new Error("This file is not valid JSON."); }
  if (!object(parsed) || parsed.kind !== BACKUP_KIND || parsed.version !== 1 || !object(parsed.profile)) {
    throw new Error("This is not a supported DevPersonify profile backup.");
  }
  const profile = parsed.profile;
  const parsedUsername = text(profile.username) ? parseGitHubUsername(profile.username) : null;
  if (profile.schemaVersion !== CAREER_EVIDENCE_SCHEMA_VERSION || !parsedUsername?.ok ||
      parsedUsername.username !== profile.username ||
      (expectedUsername !== undefined && profile.username.toLowerCase() !== expectedUsername.toLowerCase())) {
    throw new Error("This backup uses another username or an unsupported profile version.");
  }
  if (!validProfile(profile)) throw new Error("This profile backup is incomplete or damaged.");
  return deriveCareerEvidence(profile as unknown as CareerEvidenceProfile);
}
