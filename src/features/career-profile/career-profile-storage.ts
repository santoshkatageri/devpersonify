import { CAREER_EVIDENCE_SCHEMA_VERSION, type CareerEvidenceProfile } from "../../domain/career-evidence-profile";

import { clearProfileBackupStatus, clearProfileHistory, saveProfileVersion } from "./profile-history";

const PREFIX = "devpersonify:career-evidence:v1:";

function key(username: string): string {
  return `${PREFIX}${username.toLowerCase()}`;
}

export function saveCareerProfile(profile: CareerEvidenceProfile, milestone?: string): boolean {
  try {
    const previous = loadCareerProfile(profile.username);
    // Clearing evidence must also remove copies retained in history.
    if (!milestone && previous && ((previous.resumeEvidence && !profile.resumeEvidence) || (previous.githubEvidence.profileUrl && !profile.githubEvidence.profileUrl))) {
      clearProfileHistory(profile.username);
      clearProfileBackupStatus(profile.username);
    }
    if (milestone && previous && !saveProfileVersion(previous, "Before replacement")) return false;
    try { localStorage.setItem(key(profile.username), JSON.stringify(profile)); }
    catch {
      // Working data takes priority over optional history when storage is full.
      if (milestone) return false;
      clearProfileHistory(profile.username);
      localStorage.setItem(key(profile.username), JSON.stringify(profile));
    }
    if (milestone) saveProfileVersion(profile, milestone);
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
  clearProfileHistory(username);
  clearProfileBackupStatus(username);
}

export function clearGitHubCareerDataStorage(username: string): void {
  localStorage.removeItem(`devpersonify:preparation:v1:${username.toLowerCase()}`);
  localStorage.removeItem(`devpersonify:audit:v1:${username.toLowerCase()}`);
}

export function clearAllCareerDataStorage(username: string): void {
  clearCareerProfileStorage(username);
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
