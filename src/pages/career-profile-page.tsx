import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { CareerEvidenceProfile } from "../domain/career-evidence-profile";
import { GitBranchIcon } from "../components/icons";
import { runGitHubAudit } from "../features/github-audit/run-audit";
import { parseGitHubUsername } from "../features/github-audit/github-username";
import { loadPreparationState } from "../features/github-preparation/preparation-storage";
import { clearGitHubEvidence, createCareerEvidenceProfile } from "../features/career-profile/career-profile";
import { CareerProfileWorkspace } from "../features/career-profile/career-profile-workspace";
import { clearAllCareerDataStorage, clearCareerProfileStorage, clearGitHubCareerDataStorage, loadCareerProfile, saveCareerProfile } from "../features/career-profile/career-profile-storage";

export function CareerProfilePage() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const parsed = parseGitHubUsername(username);
  const normalized = parsed.ok ? parsed.username : "";
  const [profile, setProfile] = useState<CareerEvidenceProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (!normalized) { setStatus("error"); return; }
    const stored = loadCareerProfile(normalized);
    if (stored) { setProfile(stored); setStatus("ready"); return; }
    setProfile(null);
    setStatus("loading");
    const controller = new AbortController();
    runGitHubAudit(normalized, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      const preparation = loadPreparationState(normalized);
      setProfile(createCareerEvidenceProfile(result, preparation)); setStatus("ready");
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [normalized]);

  useEffect(() => {
    if (profile) setSaved(saveCareerProfile(profile));
  }, [profile]);

  function updateProfile(update: CareerEvidenceProfile | ((current: CareerEvidenceProfile) => CareerEvidenceProfile)) {
    setProfile((current) => current ? (typeof update === "function" ? update(current) : update) : current);
  }

  function clearGitHubData() {
    clearGitHubCareerDataStorage(normalized);
    updateProfile((current) => clearGitHubEvidence(current));
  }

  function resetCareerProfile() {
    clearCareerProfileStorage(normalized);
    navigate(`/audit/${encodeURIComponent(normalized)}`);
  }

  function clearAll() {
    clearAllCareerDataStorage(normalized);
    navigate(`/audit/${encodeURIComponent(normalized)}`);
  }

  if (status === "loading") return <div className="container-page grid min-h-[70vh] place-items-center py-16"><div className="text-center" role="status"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cobalt-950 text-lime-300"><GitBranchIcon className="h-6 w-6 animate-pulse" /></span><p className="eyebrow mt-6">Loading career evidence</p><h1 className="mt-3 text-2xl font-semibold">Restoring local profile</h1></div></div>;
  if (status === "error" || !profile) return <div className="container-page grid min-h-[70vh] place-items-center py-16 text-center"><div><p className="eyebrow">Career profile unavailable</p><h1 className="mt-3 text-3xl font-semibold">Run a GitHub audit first.</h1><p className="mt-3 text-sm text-slate-500">GitHub evidence anchors the canonical career profile.</p><Link to="/audit" className="mt-6 inline-flex rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white">Open GitHub audit</Link><Link to="/restore" className="ml-4 text-sm font-semibold text-cobalt-700 underline">Restore a backup</Link></div></div>;
  return <CareerProfileWorkspace profile={profile} setProfile={updateProfile} saved={saved} onClearGitHubData={clearGitHubData} onClearCareerProfile={resetCareerProfile} onClearAll={clearAll} />;
}
