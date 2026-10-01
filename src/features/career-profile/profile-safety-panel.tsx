import { useEffect, useRef, useState } from "react";
import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { saveCareerProfile } from "./career-profile-storage";
import { importProfileBackup, exportProfileBackup } from "./profile-backup";
import { clearProfileHistory, downloadCareerBackup, HISTORY_CHANGED, loadBackupStatus, loadProfileHistory, profileRevision, saveProfileVersion, type ProfileVersion } from "./profile-history";

type Props = { profile: CareerEvidenceProfile; step: string; saved: boolean; restore: (profile: CareerEvidenceProfile) => void };
const reviewed = (profile: CareerEvidenceProfile) => profile.resumeReview.length > 0 && profile.resumeReview.every((item) => item.status === "ACCEPTED");

export function ProfileSafetyPanel({ profile, step, saved, restore }: Props) {
  const [history, setHistory] = useState(() => loadProfileHistory(profile.username));
  const [backup, setBackup] = useState(() => loadBackupStatus(profile.username));
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const [pendingVersion, setPendingVersion] = useState<ProfileVersion | null>(null);
  const previous = useRef<{ profile: CareerEvidenceProfile; step: string } | null>(null);

  useEffect(() => {
    const refresh = () => { setHistory(loadProfileHistory(profile.username)); setBackup(loadBackupStatus(profile.username)); };
    refresh();
    window.addEventListener(HISTORY_CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener(HISTORY_CHANGED, refresh); window.removeEventListener("storage", refresh); };
  }, [profile.username]);

  useEffect(() => {
    const before = previous.current;
    previous.current = { profile, step };
    let label = "";
    if (!before || before.profile.username !== profile.username) {
      if (!loadProfileHistory(profile.username).length) label = "Profile started";
      setNotice("Keep a backup of your latest profile.");
    } else if (profile.resumeEvidence && before.profile.resumeEvidence?.id !== profile.resumeEvidence.id) label = "Resume added";
    else if (reviewed(profile) && !reviewed(before.profile)) label = "Evidence review completed";
    else if (before.step !== step) {
      if (step === "preview") label = "Evidence profile ready";
      else if (before.step === "profile") label = "Profile details updated";
      else if (before.step === "review") label = "Evidence review checkpoint";
    }
    if (label) {
      const stored = saveProfileVersion(profile, label);
      setNotice(`${label}. Download a backup to keep a copy outside this browser.`);
      setMessage(stored ? "Version saved in this browser." : "Version history could not be saved. Download a backup now.");
    }
  }, [profile, step]);

  function download() {
    try { downloadCareerBackup(profile); setNotice(""); setMessage("Backup download started. Check your downloads and keep the file private."); }
    catch { setMessage("Backup could not be downloaded. Please try again."); }
  }
  function checkpoint() {
    const stored = saveProfileVersion(profile, "Saved manually");
    setMessage(stored ? "Version saved in this browser." : "Version history could not be saved. Download a backup now.");
    setNotice("Save a backup outside this browser to protect your progress.");
  }
  function restoreVersion(version: ProfileVersion) {
    if (!saved) { setMessage("Download your unsaved changes before restoring another version. Restore becomes available after local saving works again."); return; }
    try {
      const next = importProfileBackup(exportProfileBackup(version.profile), profile.username);
      if (!saveCareerProfile(next, "Version restored")) throw new Error("Could not safely save the replacement. Your current profile is unchanged. Download a backup and free some browser storage first.");
      restore(next);
      setPendingVersion(null);
      setNotice("An earlier version was restored. Download a fresh backup after reviewing it.");
      setMessage("Profile version restored. Your previous profile is available in history.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not restore this version."); }
  }
  const currentBackup = backup?.revision === profileRevision(profile);
  return <section aria-label="Profile backup and history" className="mt-5 rounded-2xl border border-cobalt-100 bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-sm font-semibold">Protect your progress</h2><p className="mt-1 text-xs leading-5 text-slate-600">Changes save automatically in this browser. Download a backup before switching devices or clearing site data.</p>
        <p className="mt-1 text-xs text-slate-600">{backup ? `Last backup download requested: ${new Date(backup.requestedAt).toLocaleString()}${currentBackup ? " · current version" : " · newer changes need a backup"}` : "No backup downloaded on this site yet."}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={download} className="min-h-11 rounded-lg bg-cobalt-600 px-4 py-2 text-xs font-semibold text-white">Back up now</button><button type="button" onClick={checkpoint} className="min-h-11 rounded-lg border px-4 py-2 text-xs font-semibold">Save version</button></div>
    </div>
    {!saved ? <p role="alert" className="mt-3 text-sm font-semibold text-red-700">Your latest changes could not be saved in this browser. Download a backup before leaving. Restoring is disabled until saving works again.</p> : null}
    {notice && !currentBackup ? <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-cobalt-50 p-3"><p role="status" className="text-sm text-cobalt-900">{notice}</p><button type="button" onClick={() => setNotice("")} className="min-h-11 shrink-0 px-2 text-xs underline" aria-label="Dismiss backup reminder">Dismiss</button></div> : null}
    <p role="status" className="mt-2 text-xs text-slate-600">{message}</p>
    {pendingVersion ? <div className="mt-3 rounded-xl border border-cobalt-200 bg-cobalt-50 p-4" role="region" aria-label="Confirm profile restoration"><p className="text-sm font-semibold">Restore {pendingVersion.label} from {new Date(pendingVersion.savedAt).toLocaleString()}?</p><p className="mt-2 text-xs leading-5">Your current profile will be kept in history first. Resume and README presentation settings stay unchanged.</p><div className="mt-3 flex gap-2"><button type="button" disabled={!saved} onClick={() => restoreVersion(pendingVersion)} className="min-h-11 rounded-lg bg-cobalt-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Confirm restore</button><button type="button" onClick={() => setPendingVersion(null)} className="min-h-11 rounded-lg border bg-white px-4 py-2 text-xs font-semibold">Cancel restore</button></div></div> : null}
    <details className="mt-3 border-t pt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Profile history ({history.length})</summary>
      <p className="text-xs leading-5 text-slate-600">Up to five recent versions, fewer for large profiles or limited storage. History stays on this device and is not included in downloaded backups. Clearing resume or GitHub evidence also clears history to remove retained copies.</p>
      {!history.length ? <p className="mt-3 text-sm text-slate-600">No saved versions yet.</p> : <ol className="mt-3 space-y-3">{history.map((version) => <li key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div><p className="text-sm font-semibold">{version.label}</p><time dateTime={version.savedAt} className="text-xs text-slate-600">{new Date(version.savedAt).toLocaleString()}</time><p className="mt-1 text-xs text-slate-600">{version.profile.careerDirection.professionalHeadline?.value || "No headline yet"} · {version.profile.resumeReview.filter((item) => item.status === "ACCEPTED").length} accepted items · {version.profile.githubEvidence.repositories.length} repositories</p></div><button type="button" onClick={() => setPendingVersion(version)} disabled={!saved} className="min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50" aria-label={`Restore ${version.label} from ${version.savedAt}`}>Restore version</button></li>)}</ol>}
      {history.length ? <button type="button" onClick={() => { if (window.confirm("Delete all saved versions for this profile? Your current profile stays available.")) { try { clearProfileHistory(profile.username); setMessage("Profile history cleared. Your current profile is unchanged."); } catch { setMessage("History could not be cleared in this browser."); } } }} className="mt-3 min-h-11 text-xs font-semibold text-red-700 underline">Clear history</button> : null}
    </details>
  </section>;
}
