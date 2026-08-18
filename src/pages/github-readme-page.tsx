import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CareerEvidenceProfile } from "../domain/career-evidence-profile";
import type { GithubReadmeConfiguration } from "../domain/github-readme";
import { loadCareerProfile } from "../features/career-profile/career-profile-storage";
import { parseGitHubUsername } from "../features/github-audit/github-username";
import { CareerReadmeBuilder } from "../features/github-readme/career-readme-builder";
import { createGithubReadmeConfiguration, reconcileGithubReadmeConfiguration } from "../features/github-readme/readme-configuration";
import { clearGithubReadmeConfiguration, loadGithubReadmeConfiguration, saveGithubReadmeConfiguration } from "../features/github-readme/readme-storage";

export function GithubReadmePage() {
  const { username = "" } = useParams();
  const parsed = parseGitHubUsername(username);
  const normalized = parsed.ok ? parsed.username : "";
  const [profile] = useState<CareerEvidenceProfile | null>(() => normalized ? loadCareerProfile(normalized) : null);
  const [config, setConfig] = useState<GithubReadmeConfiguration | null>(() => {
    if (!normalized) return null;
    const career = loadCareerProfile(normalized);
    if (!career) return null;
    const stored = loadGithubReadmeConfiguration(normalized);
    return stored ? reconcileGithubReadmeConfiguration(stored, career) : createGithubReadmeConfiguration(career);
  });
  const [saved, setSaved] = useState(true);
  useEffect(() => { if (config) setSaved(saveGithubReadmeConfiguration(config)); }, [config]);
  function updateConfig(update: GithubReadmeConfiguration | ((current: GithubReadmeConfiguration) => GithubReadmeConfiguration)) { setConfig((current) => current ? (typeof update === "function" ? update(current) : update) : current); }
  function clear() { if (!profile) return; clearGithubReadmeConfiguration(profile.username); setConfig(createGithubReadmeConfiguration(profile)); }
  if (!normalized || !profile || !config) return <div className="container-page grid min-h-[70vh] place-items-center py-16 text-center"><div><p className="eyebrow">README builder unavailable</p><h1 className="mt-3 text-3xl font-semibold">Create your Career Evidence Profile first.</h1><p className="mt-3 text-sm text-slate-500">The README builder consumes shared canonical evidence without rebuilding an audit.</p><Link to={normalized ? `/career/${encodeURIComponent(normalized)}` : "/audit"} className="mt-6 inline-flex rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white">Open career profile</Link></div></div>;
  return <CareerReadmeBuilder profile={profile} config={config} setConfig={updateConfig} saved={saved} onClear={clear} />;
}
