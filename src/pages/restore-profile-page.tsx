import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { importProfileBackup, MAX_PROFILE_BACKUP_BYTES } from "../features/career-profile/profile-backup";
import { listSavedCareerProfiles, loadCareerProfile, saveCareerProfile } from "../features/career-profile/career-profile-storage";

import { downloadCareerBackup } from "../features/career-profile/profile-history";
import type { CareerEvidenceProfile } from "../domain/career-evidence-profile";

export function RestoreProfilePage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [savedProfiles] = useState(listSavedCareerProfiles);
  const [downloadMessage, setDownloadMessage] = useState("");
  function download(profile: CareerEvidenceProfile) {
    try {
      downloadCareerBackup(profile);
      setDownloadMessage("Backup download started. Check your downloads. Keep it private; it contains your career details and resume text.");
    } catch { setDownloadMessage("This profile could not be downloaded. Open your career profile and try again."); }
  }
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      if (file.size > MAX_PROFILE_BACKUP_BYTES) throw new Error("This backup is larger than 8 MB.");
      const profile = importProfileBackup(await file.text());
      if (loadCareerProfile(profile.username) && !window.confirm(`Replace the career profile for @${profile.username} in this browser?`)) return;
      if (!saveCareerProfile(profile, "Backup imported")) throw new Error("Your browser could not save the backup. Free some site storage and try again.");
      navigate(`/career/${encodeURIComponent(profile.username)}?step=preview`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The backup could not be restored.");
    }
  }
  return <div className="container-page max-w-2xl py-16">
    <p className="eyebrow">Bring your profile with you</p><h1 className="mt-3 text-4xl font-semibold">Back up or restore your profile</h1>
    <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="download-backup-title">
      <h2 id="download-backup-title" className="text-xl font-semibold">Download a backup</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Save your career profile and resume text as a private JSON file before moving to another device or clearing browser data.</p>
      {savedProfiles.length ? <ul className="mt-4 space-y-3">{savedProfiles.map((profile) => <li key={profile.username} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
        <Link to={`/career/${encodeURIComponent(profile.username)}?step=preview`} className="text-sm font-semibold text-cobalt-700 underline">@{profile.username}</Link>
        <button type="button" onClick={() => download(profile)} className="min-h-11 rounded-lg bg-cobalt-600 px-4 py-2 text-sm font-semibold text-white">Download backup for @{profile.username}</button>
      </li>)}</ul> : <div className="mt-4"><p className="text-sm text-slate-600">No career profile is saved on this website in this browser yet.</p><Link to="/audit" className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-cobalt-600 px-4 py-2 text-sm font-semibold text-white">Start with a GitHub audit</Link></div>}
      <p className="mt-3 text-xs leading-5 text-slate-600">Profiles are saved separately for each website address and browser. To download a profile you created elsewhere, open that address in the original browser and go to Career Profile → Data management → Download profile backup.</p>
      <p role="status" className="mt-2 text-sm text-slate-600">{downloadMessage}</p>
    </section>
    <h2 className="mt-10 text-xl font-semibold">Restore an existing backup</h2>
    <p className="mt-3 text-sm leading-7 text-slate-600">Choose a DevPersonify JSON backup to restore its career evidence and resume text in this browser. It works without a new GitHub request. The file stays on your device.</p>
    <p className="mt-3 text-sm leading-6 text-slate-600">Resume and README presentation settings are separate from the career profile and are not included in this backup.</p>
    <label className="mt-7 block text-sm font-semibold">Profile backup file<input type="file" accept="application/json,.json" onChange={restore} className="mt-3 block w-full rounded-xl border bg-white p-3 text-sm" /></label>
    <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>
    <Link className="mt-6 inline-block text-sm font-semibold text-cobalt-700 underline" to="/">Back to DevPersonify</Link>
  </div>;
}
