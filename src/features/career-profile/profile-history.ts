import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { downloadTextFile } from "../../lib/browser-output";
import { exportProfileBackup, importProfileBackup } from "./profile-backup";

const PREFIX = "devpersonify:profile-history:v1:";
const BACKUP_PREFIX = "devpersonify:profile-backup-status:v1:";
export const HISTORY_CHANGED = "devpersonify:history-changed";
export const MAX_HISTORY_VERSIONS = 5;
// Keep local history small enough to leave space for the working profile.
const MAX_HISTORY_CHARACTERS = 750_000;
export interface ProfileVersion { id: string; savedAt: string; label: string; profile: CareerEvidenceProfile }
export interface BackupStatus { requestedAt: string; revision: string }
const key = (username: string) => `${PREFIX}${username.toLowerCase()}`;
const backupKey = (username: string) => `${BACKUP_PREFIX}${username.toLowerCase()}`;
const notify = () => window.dispatchEvent(new Event(HISTORY_CHANGED));
export const profileRevision = (profile: CareerEvidenceProfile) => JSON.stringify([profile.updatedAt, profile.sectionPreferences]);

export function loadProfileHistory(username: string): ProfileVersion[] {
  try {
    const raw = localStorage.getItem(key(username));
    if (!raw || raw.length > MAX_HISTORY_CHARACTERS) return [];
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    return entries.slice(0, MAX_HISTORY_VERSIONS).flatMap((entry) => {
      try {
        if (!entry || typeof entry.id !== "string" || typeof entry.label !== "string" || entry.label.length > 100 || !Number.isFinite(Date.parse(entry.savedAt))) return [];
        // Validate snapshots with the same checks used for imported backups.
        importProfileBackup(exportProfileBackup(entry.profile), username);
        return [entry as ProfileVersion];
      } catch { return []; }
    });
  } catch { return []; }
}

export function saveProfileVersion(profile: CareerEvidenceProfile, label: string): boolean {
  try {
    const history = loadProfileHistory(profile.username);
    if (history[0] && JSON.stringify(history[0].profile) === JSON.stringify(profile)) return true;
    const version: ProfileVersion = { id: crypto.randomUUID(), savedAt: new Date().toISOString(), label, profile };
    const next = [version, ...history].slice(0, MAX_HISTORY_VERSIONS);
    const minimum = history.length ? 2 : 1;
    while (JSON.stringify(next).length > MAX_HISTORY_CHARACTERS && next.length > minimum) next.pop();
    if (JSON.stringify(next).length > MAX_HISTORY_CHARACTERS) return false;
    while (next.length >= minimum) {
      try { localStorage.setItem(key(profile.username), JSON.stringify(next)); notify(); return true; }
      catch { next.pop(); }
    }
    return false;
  } catch { return false; }
}

export function clearProfileHistory(username: string): void {
  localStorage.removeItem(key(username));
  notify();
}
export function clearProfileBackupStatus(username: string): void {
  localStorage.removeItem(backupKey(username));
  notify();
}
export function loadBackupStatus(username: string): BackupStatus | null {
  try {
    const value = JSON.parse(localStorage.getItem(backupKey(username)) ?? "null");
    return value && typeof value.revision === "string" && Number.isFinite(Date.parse(value.requestedAt)) ? value : null;
  } catch { return null; }
}

export function downloadCareerBackup(profile: CareerEvidenceProfile): void {
  downloadTextFile(exportProfileBackup(profile), `devpersonify-${profile.username.toLowerCase()}-backup.json`, "application/json;charset=utf-8");
  try {
    localStorage.setItem(backupKey(profile.username), JSON.stringify({ requestedAt: new Date().toISOString(), revision: profileRevision(profile) }));
    notify();
  } catch { /* Download still works when browser storage is unavailable. */ }
}
