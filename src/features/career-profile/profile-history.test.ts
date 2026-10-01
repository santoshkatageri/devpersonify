import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { downloadTextFile } from "../../lib/browser-output";
import { clearGitHubEvidence, clearResumeEvidence } from "./career-profile";
import { clearCareerProfileStorage, loadCareerProfile, saveCareerProfile } from "./career-profile-storage";
import { downloadCareerBackup, loadBackupStatus, loadProfileHistory, MAX_HISTORY_VERSIONS, profileRevision, saveProfileVersion } from "./profile-history";

vi.mock("../../lib/browser-output", () => ({ downloadTextFile: vi.fn() }));

const observedAt = "2026-10-01T00:00:00.000Z";
const historyKey = "devpersonify:profile-history:v1:developer";
const profileKey = "devpersonify:career-evidence:v1:developer";

function profile(revision = 0, username = "developer"): CareerEvidenceProfile {
  const updatedAt = new Date(Date.parse(observedAt) + revision * 1000).toISOString();
  return {
    schemaVersion: 1, id: `career:${username}`, username, createdAt: observedAt, updatedAt,
    identity: {}, careerDirection: {},
    githubEvidence: { username, profileUrl: `https://github.com/${username}`, observedAt, repositories: [] },
    resumeEvidence: { id: "resume-test", fileType: "PASTED_TEXT", text: "Synthetic resume", importedAt: observedAt, sizeBytes: 16, private: true },
    resumeReview: [], experience: [], education: [], skills: [], projects: [], certifications: [], achievements: [], professionalLinks: [], other: [], userProvided: [],
    derived: { comparisons: [], completeness: [], sourceCoverage: { github: "NONE", resume: "NONE", userProvided: "NONE", crossSourceSupport: 0, potentialGaps: 0 }, generatedAt: observedAt },
    sectionPreferences: { headline: true, summary: true, experience: true, selectedProjects: true, skills: true, education: true, certifications: true, achievements: true, links: true },
  };
}

afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("local profile history", () => {
  it("keeps the newest five versions and deduplicates consecutive identical saves", () => {
    for (let revision = 0; revision < MAX_HISTORY_VERSIONS + 3; revision++) {
      expect(saveProfileVersion(profile(revision), `Milestone ${revision}`)).toBe(true);
    }
    const before = loadProfileHistory("DEVELOPER");
    expect(before).toHaveLength(MAX_HISTORY_VERSIONS);
    expect(before.map((version) => version.label)).toEqual(["Milestone 7", "Milestone 6", "Milestone 5", "Milestone 4", "Milestone 3"]);
    expect(saveProfileVersion(profile(7), "Same profile again")).toBe(true);
    expect(loadProfileHistory("developer")).toEqual(before);
  });

  it("clips large history while retaining the latest previous version", () => {
    const largeProfile = (revision: number) => {
      const value = profile(revision);
      value.resumeEvidence!.text = "x".repeat(300_000);
      value.resumeEvidence!.sizeBytes = 300_000;
      return value;
    };
    for (let revision = 0; revision < 3; revision++) {
      expect(saveProfileVersion(largeProfile(revision), `Large version ${revision}`)).toBe(true);
    }
    expect(loadProfileHistory("developer").map((version) => version.label)).toEqual(["Large version 2", "Large version 1"]);
    const retained = localStorage.getItem(historyKey);
    expect(retained!.length).toBeLessThanOrEqual(750_000);

    const tooLarge = largeProfile(3);
    tooLarge.resumeEvidence!.text = "x".repeat(500_000);
    tooLarge.resumeEvidence!.sizeBytes = 500_000;
    expect(saveProfileVersion(tooLarge, "Cannot retain this and previous")).toBe(false);
    expect(localStorage.getItem(historyKey)).toBe(retained);
  });

  it("rejects a single snapshot larger than the history budget", () => {
    const tooLarge = profile();
    tooLarge.resumeEvidence!.text = "x".repeat(750_000);
    tooLarge.resumeEvidence!.sizeBytes = 750_000;
    expect(saveProfileVersion(tooLarge, "Too large")).toBe(false);
    expect(loadProfileHistory("developer")).toEqual([]);
    expect(localStorage.getItem(historyKey)).toBeNull();
  });

  it("clips older snapshots on quota failure but never discards the latest previous version", () => {
    saveProfileVersion(profile(), "First");
    saveProfileVersion(profile(1), "Second");
    let allowedVersions = 2;
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === historyKey && JSON.parse(value).length > allowedVersions) {
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      setItem.call(this, key, value);
    });
    expect(saveProfileVersion(profile(2), "Third")).toBe(true);
    expect(loadProfileHistory("developer").map((version) => version.label)).toEqual(["Third", "Second"]);
    const retained = localStorage.getItem(historyKey);
    allowedVersions = 1;
    expect(saveProfileVersion(profile(3), "Fourth")).toBe(false);
    expect(localStorage.getItem(historyKey)).toBe(retained);
  });

  it("ignores corrupt snapshots and snapshots belonging to another username", () => {
    saveProfileVersion(profile(), "Valid version");
    const valid = loadProfileHistory("developer")[0]!;
    localStorage.setItem(historyKey, JSON.stringify([
      { ...valid, id: "wrong-user", profile: profile(0, "someone-else") },
      { ...valid, id: "corrupt", profile: { ...profile(), skills: null } },
      { ...valid, id: "wrong-date", savedAt: "invalid date" },
      null,
      valid,
    ]));
    expect(loadProfileHistory("developer")).toEqual([valid]);
    localStorage.setItem(historyKey, "{");
    expect(loadProfileHistory("developer")).toEqual([]);
  });

  it("captures the working profile before replacement as well as the new milestone", () => {
    const previous = profile();
    const next = profile(1);
    expect(saveCareerProfile(previous)).toBe(true);
    expect(saveCareerProfile(next, "Resume imported")).toBe(true);
    expect(loadCareerProfile("developer")).toEqual(next);
    expect(loadProfileHistory("developer").map((version) => ({ label: version.label, profile: version.profile }))).toEqual([
      { label: "Resume imported", profile: next },
      { label: "Before replacement", profile: previous },
    ]);
  });

  it("preserves the original resume when restoring a backup that has no resume", () => {
    const previous = profile();
    saveCareerProfile(previous, "Resume imported");
    const restored = profile(1);
    delete restored.resumeEvidence;
    expect(saveCareerProfile(restored, "Backup restored")).toBe(true);
    expect(loadCareerProfile("developer")?.resumeEvidence).toBeUndefined();
    const history = loadProfileHistory("developer");
    expect(history[0]?.profile).toEqual(restored);
    expect(history[1]?.profile).toEqual(previous);
    expect(history[1]?.profile.resumeEvidence?.text).toBe("Synthetic resume");
  });

  it("leaves the working profile untouched when its previous version cannot be retained", () => {
    const previous = profile();
    saveCareerProfile(previous);
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === historyKey) throw new DOMException("Storage full", "QuotaExceededError");
      setItem.call(this, key, value);
    });
    expect(saveCareerProfile(profile(1), "Resume replaced")).toBe(false);
    expect(loadCareerProfile("developer")).toEqual(previous);
  });

  it("leaves the working profile intact when the replacement write fails", () => {
    const previous = profile();
    saveCareerProfile(previous);
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key === profileKey) throw new DOMException("Storage full", "QuotaExceededError");
      setItem.call(this, key, value);
    });
    expect(saveCareerProfile(profile(1), "Resume replaced")).toBe(false);
    expect(loadCareerProfile("developer")).toEqual(previous);
    expect(loadProfileHistory("developer")[0]?.profile).toEqual(previous);
  });

  it.each([
    ["resume", clearResumeEvidence],
    ["GitHub", clearGitHubEvidence],
  ] as const)("removes retained history and backup status when clearing %s evidence", (_name, clearEvidence) => {
    const original = profile();
    saveCareerProfile(original, "Profile created");
    downloadCareerBackup(original);
    expect(loadProfileHistory("developer")).toHaveLength(1);
    expect(loadBackupStatus("developer")).not.toBeNull();
    const cleared = clearEvidence(original, profile(1).updatedAt);
    expect(saveCareerProfile(cleared)).toBe(true);
    expect(loadCareerProfile("developer")).toEqual(cleared);
    expect(loadProfileHistory("developer")).toEqual([]);
    expect(loadBackupStatus("developer")).toBeNull();
  });

  it("clears profile, history, and backup status while preserving another user's data", () => {
    const original = profile();
    const other = profile(0, "another-user");
    saveCareerProfile(original, "Profile created");
    saveCareerProfile(other, "Profile created");
    downloadCareerBackup(original);
    downloadCareerBackup(other);
    clearCareerProfileStorage("DEVELOPER");
    expect(loadCareerProfile("developer")).toBeNull();
    expect(loadProfileHistory("developer")).toEqual([]);
    expect(loadBackupStatus("developer")).toBeNull();
    expect(loadCareerProfile("another-user")).toEqual(other);
    expect(loadProfileHistory("another-user")).toHaveLength(1);
    expect(loadBackupStatus("another-user")).not.toBeNull();
  });
});

describe("backup revision tracking", () => {
  it("records the downloaded revision and detects subsequent edits or visibility changes", () => {
    const original = profile();
    downloadCareerBackup(original);
    const status = loadBackupStatus("DEVELOPER");
    expect(status?.revision).toBe(profileRevision(original));
    expect(Number.isFinite(Date.parse(status!.requestedAt))).toBe(true);
    expect(downloadTextFile).toHaveBeenCalledWith(expect.any(String), "devpersonify-developer-backup.json", "application/json;charset=utf-8");
    expect(profileRevision(profile(1))).not.toBe(status?.revision);
    expect(profileRevision({ ...original, sectionPreferences: { ...original.sectionPreferences, skills: false } })).not.toBe(status?.revision);
    expect(loadBackupStatus("developer")).toEqual(status);
  });

  it("does not mark a revision backed up if starting its download fails", () => {
    const previous = profile();
    downloadCareerBackup(previous);
    const status = loadBackupStatus("developer");
    vi.mocked(downloadTextFile).mockImplementationOnce(() => { throw new Error("Download unavailable"); });
    expect(() => downloadCareerBackup(profile(1))).toThrow("Download unavailable");
    expect(loadBackupStatus("developer")).toEqual(status);
  });
});
