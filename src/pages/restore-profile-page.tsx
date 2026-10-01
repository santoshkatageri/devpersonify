import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { importProfileBackup, MAX_PROFILE_BACKUP_BYTES } from "../features/career-profile/profile-backup";
import { loadCareerProfile, saveCareerProfile } from "../features/career-profile/career-profile-storage";

export function RestoreProfilePage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      if (file.size > MAX_PROFILE_BACKUP_BYTES) throw new Error("This backup is larger than 8 MB.");
      const profile = importProfileBackup(await file.text());
      if (loadCareerProfile(profile.username) && !window.confirm(`Replace the career profile for @${profile.username} in this browser?`)) return;
      if (!saveCareerProfile(profile)) throw new Error("Your browser could not save the backup. Free some site storage and try again.");
      navigate(`/career/${encodeURIComponent(profile.username)}?step=preview`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The backup could not be restored.");
    }
  }
  return <div className="container-page max-w-2xl py-16">
    <p className="eyebrow">Bring your profile with you</p><h1 className="mt-3 text-4xl font-semibold">Restore a profile backup</h1>
    <p className="mt-5 text-sm leading-7 text-slate-600">Choose a DevPersonify JSON backup to restore its career evidence and resume text in this browser. It works without a new GitHub request. The file stays on your device.</p>
    <p className="mt-3 text-sm leading-6 text-slate-600">Resume and README presentation settings are separate from the career profile and are not included in this backup.</p>
    <label className="mt-7 block text-sm font-semibold">Profile backup file<input type="file" accept="application/json,.json" onChange={restore} className="mt-3 block w-full rounded-xl border bg-white p-3 text-sm" /></label>
    <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>
    <Link className="mt-6 inline-block text-sm font-semibold text-cobalt-700 underline" to="/">Back to DevPersonify</Link>
  </div>;
}
