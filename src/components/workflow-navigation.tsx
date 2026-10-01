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
  return <div className="border-b border-slate-200 bg-white/80">
    <div className="container-page flex flex-wrap items-center gap-x-5 gap-y-1 py-2">
      <nav className="flex w-full min-w-0 items-center gap-1 overflow-x-auto md:w-auto md:flex-1" aria-label="DevPersonify workflow">
        <Link to="/" aria-current={location.pathname === "/" ? "page" : undefined} className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Home</Link>
        {steps.map((step) => {
          const active = current?.stage === step.key;
          return step.available ? <Link key={step.key} to={step.to} aria-current={active ? "step" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? "bg-ink text-white" : "text-slate-500 hover:bg-slate-100 hover:text-ink"}`}>{step.label}</Link> : <span key={step.key} aria-disabled="true" className="cursor-not-allowed whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-slate-300">{step.label}</span>;
        })}
      </nav>
      <div className="flex w-full items-center justify-between gap-3 px-3 md:w-auto md:px-0">
        <span className="text-[11px] text-slate-500" title="Saved in this browser">@{context.username}</span>
        {!current && saved ? <Link to={saved.to} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">Continue saved session →</Link> : null}
      </div>
    </div>
  </div>;
}
