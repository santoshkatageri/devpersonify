import { GITHUB_README_CONFIG_VERSION, type GithubReadmeConfiguration } from "../../domain/github-readme";
import { fields, readSavedDraft, replaceSavedDraft, record, strings, writeSavedDraft } from "../../lib/saved-draft";
const PREFIX = "devpersonify:github-readme:v1:";
const key = (username: string) => `${PREFIX}${username.toLowerCase()}`;
const sectionKeys = ["introduction", "whatIBuild", "selectedProjects", "technologies", "openSource", "contact"];
const presentationKeys = ["professionalHeadline", "shortIntroduction", "currentFocus", "additionalSkills", "preferredTechnologies", "location", "website", "linkedinUrl", "email"];
export function validGithubReadmeConfiguration(value: unknown, username: string): value is GithubReadmeConfiguration {
  return record(value) && value.schemaVersion === GITHUB_README_CONFIG_VERSION && typeof value.username === "string" && value.username.toLowerCase() === username.toLowerCase()
    && typeof value.updatedAt === "string" && strings(value.selectedProjectIds) && strings(value.projectOrder)
    && fields(value.sections, sectionKeys, "boolean") && fields(value.presentation, presentationKeys, "string");
}
export function readGithubReadmeDraft(username: string) {
  return readSavedDraft(key(username), GITHUB_README_CONFIG_VERSION, (value): value is GithubReadmeConfiguration => validGithubReadmeConfiguration(value, username));
}
export function saveGithubReadmeConfiguration(config: GithubReadmeConfiguration): boolean {
  return writeSavedDraft(key(config.username), config, () => readGithubReadmeDraft(config.username), (value): value is GithubReadmeConfiguration => validGithubReadmeConfiguration(value, config.username));
}
export function loadGithubReadmeConfiguration(username: string): GithubReadmeConfiguration | null { return readGithubReadmeDraft(username).value; }
export function clearGithubReadmeConfiguration(username: string): void { localStorage.removeItem(key(username)); }

export function replaceGithubReadmeDraft(config: GithubReadmeConfiguration, original: string): boolean {
  return replaceSavedDraft(key(config.username), config, original, (value): value is GithubReadmeConfiguration => validGithubReadmeConfiguration(value, config.username));
}
