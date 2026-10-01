import { Link, useLocation } from "react-router-dom";
import { savedWorkflow } from "./saved-workflow";
import { workflowContextFromPath, type WorkflowStage } from "./workflow-context";

export function WorkflowNavigation() {
  const location = useLocation();
  const current = workflowContextFromPath(location.pathname);
  const saved = savedWorkflow();
  const context = current ?? saved;
  if (!context) return null;
  const username = encodeURIComponent(context.username);
  const careerAvailable = (() => { try { return Boolean(localStorage.getItem(`devpersonify:career-evidence:v1:${context.username.toLowerCase()}`)); } catch { return false; } })();
  const steps: Array<{ key: WorkflowStage; label: string; to: string; available: boolean }> = [
    { key: "audit", label: "Audit", to: `/audit/${username}`, available: true },
    { key: "preparation", label: "GitHub Profile", to: `/audit/${username}/prepare`, available: true },
    { key: "career", label: "Career Profile", to: careerAvailable ? `/career/${username}?step=preview` : `/career/${username}`, available: true },
    { key: "resume", label: "Resume", to: `/career/${username}/resume`, available: careerAvailable || context.stage === "career" || context.stage === "resume" },
  ];
  return <div className="border-b border-slate-200 bg-white/80">{!current && saved ? <div className="container-page flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3"><p className="text-xs text-slate-600">Saved in this browser · <strong>@{saved.username}</strong></p><div className="flex flex-wrap gap-4"><Link to={saved.to} className="text-sm font-semibold text-cobalt-700 underline">Continue saved session →</Link><Link to="/audit" className="text-xs font-semibold text-slate-600 underline">Start a new audit</Link></div></div> : null}<nav className="container-page flex items-center gap-1 overflow-x-auto py-2" aria-label="DevPersonify workflow"><Link to="/" aria-current={location.pathname === "/" ? "page" : undefined} className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Home</Link>{steps.map((step) => {
    const active = current?.stage === step.key;
    const content = <>{step.label}</>;
    return step.available ? <Link key={step.key} to={step.to} aria-current={active ? "step" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? "bg-ink text-white" : "text-slate-500 hover:bg-slate-100 hover:text-ink"}`}>{content}</Link> : <span key={step.key} aria-disabled="true" className="cursor-not-allowed whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">{content}</span>;
  })}<span className="ml-auto hidden whitespace-nowrap font-mono text-[10px] text-slate-400 md:block">@{context.username}</span></nav></div>;
}
