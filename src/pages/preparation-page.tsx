import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GitBranchIcon } from "../components/icons";
import { runGitHubAudit, type GitHubAudit } from "../features/github-audit/run-audit";
import { parseGitHubUsername } from "../features/github-audit/github-username";
import { PreparationWorkspace } from "../features/github-preparation/preparation-workspace";
import { createPreparationState, type PreparationState } from "../features/github-preparation/preparation";
import { loadPreparationState, savePreparationState } from "../features/github-preparation/preparation-storage";

export function PreparationPage() {
  const { username = "" } = useParams();
  const parsed = parseGitHubUsername(username);
  const normalized = parsed.ok ? parsed.username : "";
  const [audit, setAudit] = useState<GitHubAudit | null>(null);
  const [state, setState] = useState<PreparationState>(() => normalized ? loadPreparationState(normalized) : createPreparationState(""));
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (!normalized) { setStatus("error"); return; }
    const controller = new AbortController();
    setStatus("loading");
    setState(loadPreparationState(normalized));
    runGitHubAudit(normalized, { signal: controller.signal }).then((result) => { if (!controller.signal.aborted) { setAudit(result); setStatus("ready"); } }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [normalized]);

  useEffect(() => {
    if (!normalized || state.username !== normalized) return;
    setSaved(savePreparationState(state));
  }, [normalized, state]);

  if (status === "loading") return <div className="container-page grid min-h-[70vh] place-items-center py-16"><div className="text-center" role="status"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cobalt-950 text-lime-300"><GitBranchIcon className="h-6 w-6 animate-pulse" /></span><p className="eyebrow mt-6">Loading preparation workspace</p><h1 className="mt-3 text-2xl font-semibold">Restoring @{normalized}</h1><p className="mt-2 text-sm text-slate-500">Using the latest cached audit when available.</p></div></div>;
  if (status === "error" || !audit) return <div className="container-page grid min-h-[70vh] place-items-center py-16 text-center"><div><p className="eyebrow">Workspace unavailable</p><h1 className="mt-3 text-3xl font-semibold">Run the GitHub audit first.</h1><p className="mt-3 text-sm text-slate-500">A successful public audit is required before portfolio preparation.</p><Link to="/audit" className="mt-6 inline-flex rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white">Open GitHub audit</Link></div></div>;
  return <PreparationWorkspace audit={audit} state={state} setState={setState} saved={saved} />;
}
