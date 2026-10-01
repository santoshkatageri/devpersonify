import { useState, type ChangeEvent } from "react";
import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { downloadTextFile } from "../../lib/browser-output";
import { exportProfileBackup, importProfileBackup, MAX_PROFILE_BACKUP_BYTES } from "./profile-backup";
import { saveCareerProfile } from "./career-profile-storage";

export function ProfileBackupControl({ profile, restore }: { profile: CareerEvidenceProfile; restore: (profile: CareerEvidenceProfile) => void }) {
  const [message, setMessage] = useState("");

  function exportBackup() {
    try {
      downloadTextFile(exportProfileBackup(profile), `devpersonify-${profile.username.toLowerCase()}-backup.json`, "application/json;charset=utf-8");
      setMessage("Backup downloaded. Store it somewhere private; it includes your resume text and career details.");
    } catch {
      setMessage("The backup could not be downloaded in this browser.");
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PROFILE_BACKUP_BYTES) { setMessage("This backup is larger than 8 MB."); return; }
    try {
      const restored = importProfileBackup(await file.text(), profile.username);
      if (!window.confirm("Replace this browser's current career profile with the selected backup?")) return;
      if (!saveCareerProfile(restored)) throw new Error("This browser could not save the imported profile. The current profile has not been replaced.");
      restore(restored);
      setMessage("Profile restored in this browser. Review the imported details before exporting documents.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The backup could not be imported.");
    }
  }

  return <div className="mt-3 space-y-2 border-t pt-3"><p className="text-xs font-semibold">Backup and restore</p><p className="text-[10px] leading-4 text-slate-500">Your backup includes private resume text. Import replaces this username's career profile only; README and resume presentation settings stay in this browser.</p><button type="button" onClick={exportBackup} className="w-full rounded-lg border px-3 py-2 text-left text-xs">Download profile backup</button><label className="block cursor-pointer rounded-lg border px-3 py-2 text-xs">Import profile backup<input type="file" accept="application/json,.json" className="sr-only" onChange={importBackup} /></label><p role="status" className="text-[10px] leading-4 text-slate-600">{message}</p></div>;
}
