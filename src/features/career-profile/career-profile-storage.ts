import { CAREER_EVIDENCE_SCHEMA_VERSION, type CareerEvidenceProfile } from "../../domain/career-evidence-profile";

const PREFIX = "devpersonify:career-evidence:v1:";

function key(username: string): string {
  return `${PREFIX}${username.toLowerCase()}`;
}

export function saveCareerProfile(profile: CareerEvidenceProfile): boolean {
  try {
    localStorage.setItem(key(profile.username), JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function loadCareerProfile(username: string): CareerEvidenceProfile | null {
  try {
    const raw = localStorage.getItem(key(username));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const profile = value as Partial<CareerEvidenceProfile>;
    if (profile.schemaVersion !== CAREER_EVIDENCE_SCHEMA_VERSION || profile.username?.toLowerCase() !== username.toLowerCase()) return null;
    if (!profile.identity || !profile.careerDirection || !profile.githubEvidence || !Array.isArray(profile.resumeReview) || !profile.derived) return null;
    return profile as CareerEvidenceProfile;
  } catch {
    return null;
  }
}

export function clearCareerProfileStorage(username: string): void {
  localStorage.removeItem(key(username));
}

export function clearGitHubCareerDataStorage(username: string): void {
  localStorage.removeItem(`devpersonify:preparation:v1:${username.toLowerCase()}`);
  localStorage.removeItem(`devpersonify:audit:v1:${username.toLowerCase()}`);
}

export function clearAllCareerDataStorage(username: string): void {
  localStorage.removeItem(key(username));
  localStorage.removeItem(`devpersonify:preparation:v1:${username.toLowerCase()}`);
  localStorage.removeItem(`devpersonify:audit:v1:${username.toLowerCase()}`);
  localStorage.removeItem(`devpersonify:github-readme:v1:${username.toLowerCase()}`);
  localStorage.removeItem(`devpersonify:latex-resume:v1:${username.toLowerCase()}`);
}

export function listSavedCareerProfiles(): CareerEvidenceProfile[] {
  try {
    return Object.keys(localStorage)
      .filter((item) => item.startsWith(PREFIX))
      .map((item) => loadCareerProfile(item.slice(PREFIX.length)))
      .filter((profile): profile is CareerEvidenceProfile => profile !== null)
      .sort((left, right) => left.username.localeCompare(right.username));
  } catch { return []; }
}
