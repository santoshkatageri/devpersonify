import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CareerEvidenceProfile } from "../domain/career-evidence-profile";
import type { LatexResumeConfiguration } from "../domain/latex-resume";
import { loadCareerProfile } from "../features/career-profile/career-profile-storage";
import { LatexResumeBuilder } from "../features/latex-resume/latex-resume-builder";
import { createLatexResumeConfiguration, reconcileLatexResumeConfiguration } from "../features/latex-resume/resume-configuration";
import { loadLatexResumeConfiguration, saveLatexResumeConfiguration } from "../features/latex-resume/resume-storage";
import { parseGitHubUsername } from "../features/github-audit/github-username";

export function LatexResumePage() {
  const { username = "" } = useParams();
  const parsed = parseGitHubUsername(username);
  const normalized = parsed.ok ? parsed.username : "";
  const [profile] = useState<CareerEvidenceProfile | null>(() => normalized ? loadCareerProfile(normalized) : null);
  const [config, setConfig] = useState<LatexResumeConfiguration | null>(() => {
    if (!normalized) return null;
    const career = loadCareerProfile(normalized);
    if (!career) return null;
    const stored = loadLatexResumeConfiguration(normalized);
    return stored ? reconcileLatexResumeConfiguration(stored, career) : createLatexResumeConfiguration(career);
  });
  const [saved, setSaved] = useState(true);

  useEffect(() => { if (config) setSaved(saveLatexResumeConfiguration(config)); }, [config]);

  function updateConfig(update: LatexResumeConfiguration | ((current: LatexResumeConfiguration) => LatexResumeConfiguration)) {
    setConfig((current) => current ? (typeof update === "function" ? update(current) : update) : current);
  }

  if (!normalized || !profile || !config) return <div className="container-page grid min-h-[70vh] place-items-center py-16 text-center"><div><p className="eyebrow">Resume builder unavailable</p><h1 className="mt-3 text-3xl font-semibold">Create your Career Evidence Profile first.</h1><p className="mt-3 text-sm text-slate-500">The LaTeX builder only uses accepted canonical evidence.</p><Link to={normalized ? `/career/${encodeURIComponent(normalized)}` : "/audit"} className="mt-6 inline-flex rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white">Open career profile</Link></div></div>;
  return <LatexResumeBuilder profile={profile} config={config} setConfig={updateConfig} saved={saved} />;
}
