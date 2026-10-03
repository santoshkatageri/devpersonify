import { CLASSIC_TEMPLATE_ID, CLASSIC_TEMPLATE_VERSION, LATEX_RESUME_CONFIG_VERSION, type LatexResumeConfiguration } from "../../domain/latex-resume";
import { DEFAULT_RESUME_SECTIONS } from "./resume-configuration";
import { readSavedDraft, replaceSavedDraft, record, strings, writeSavedDraft } from "../../lib/saved-draft";
const PREFIX = "devpersonify:latex-resume:v1:";
const key = (username: string) => `${PREFIX}${username.toLowerCase()}`;
const selectionKeys = ["experience", "skills", "projects", "education", "certifications", "achievements", "links"];
export function validLatexResumeConfiguration(value: unknown, username: string): value is LatexResumeConfiguration {
  if (!record(value) || value.schemaVersion !== LATEX_RESUME_CONFIG_VERSION || typeof value.username !== "string" || value.username.toLowerCase() !== username.toLowerCase()
    || value.templateId !== CLASSIC_TEMPLATE_ID || value.templateVersion !== CLASSIC_TEMPLATE_VERSION || typeof value.updatedAt !== "string"
    || !Array.isArray(value.sections) || !record(value.selections) || !record(value.overrides)) return false;
  const known = new Set<string>(DEFAULT_RESUME_SECTIONS.map((section) => section.key));
  const seen = new Set<string>();
  for (const section of value.sections) {
    if (!record(section) || typeof section.key !== "string" || !known.has(section.key) || seen.has(section.key) || typeof section.label !== "string" || typeof section.enabled !== "boolean") return false;
    seen.add(section.key);
  }
  // All fields are required in v1. Never invent missing selections or overwrite
  // an unsupported template. A future schema needs an explicit migration here.
  const selections = value.selections;
  if (seen.size !== known.size || Object.keys(selections).some((name) => !selectionKeys.includes(name)) || !selectionKeys.every((name) => strings(selections[name]))) return false;
  return Object.entries(value.overrides).every(([key, item]) => record(item) && item.key === key && typeof item.value === "string" && item.source === "USER_PROVIDED" && typeof item.updatedAt === "string");
}
export function readLatexResumeDraft(username: string) {
  return readSavedDraft(key(username), LATEX_RESUME_CONFIG_VERSION, (value): value is LatexResumeConfiguration => validLatexResumeConfiguration(value, username));
}
export function saveLatexResumeConfiguration(config: LatexResumeConfiguration): boolean {
  return writeSavedDraft(key(config.username), config, () => readLatexResumeDraft(config.username), (value): value is LatexResumeConfiguration => validLatexResumeConfiguration(value, config.username));
}
export function loadLatexResumeConfiguration(username: string): LatexResumeConfiguration | null { return readLatexResumeDraft(username).value; }
export function clearLatexResumeConfiguration(username: string): void { localStorage.removeItem(key(username)); }

export function replaceLatexResumeDraft(config: LatexResumeConfiguration, original: string): boolean {
  return replaceSavedDraft(key(config.username), config, original, (value): value is LatexResumeConfiguration => validLatexResumeConfiguration(value, config.username));
}
