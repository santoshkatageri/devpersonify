import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GitBranchIcon, SearchIcon, ShieldIcon } from "../components/icons";
import { PrimaryButton } from "../components/ui";
import { AuditDashboard } from "../features/github-audit/audit-dashboard";
import { GitHubClientError } from "../features/github-audit/github-api";
import { parseGitHubUsername } from "../features/github-audit/github-username";
import { runGitHubAudit, type GitHubAudit } from "../features/github-audit/run-audit";

type AuditStatus = "idle" | "validating" | "loading" | "analyzing" | "success" | "not_found" | "rate_limited" | "network_error" | "unexpected_response";

interface AuditErrorState {
  status: Exclude<AuditStatus, "idle" | "validating" | "loading" | "analyzing" | "success">;
  message: string;
  retryAt?: string;
}

function AuditEntry({ initialValue = "" }: { initialValue?: string }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(initialValue);
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseGitHubUsername(username);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError("");
    setValidating(true);
    window.requestAnimationFrame(() => navigate(`/audit/${encodeURIComponent(parsed.username)}`));
  }

  return (
    <div className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-paper">
      <div className="absolute inset-0 bg-grid bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_62%)]" aria-hidden="true" />
      <div className="container-page relative py-14 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">GitHub repository audit</p>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl lg:text-6xl">See what your public work communicates.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Enter a public GitHub profile to review repository evidence with transparent, deterministic rules.</p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft sm:p-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cobalt-950 text-lime-300"><GitBranchIcon className="h-5 w-5" /></span><div><h2 className="text-base font-semibold">Enter a public GitHub profile</h2><p className="mt-0.5 text-xs text-slate-500">Username or github.com profile URL</p></div></div>
          <form className="mt-6" onSubmit={handleSubmit} noValidate>
            <label htmlFor="github-username" className="text-sm font-semibold text-slate-800">GitHub username</label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400" aria-hidden="true"><SearchIcon className="h-5 w-5" /></span><input id="github-username" name="github-username" type="text" autoComplete="off" spellCheck="false" value={username} onChange={(event) => { setUsername(event.target.value); setError(""); }} placeholder="e.g. your-username" aria-describedby="username-help username-error" aria-invalid={Boolean(error)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 font-mono text-sm text-ink placeholder:text-slate-400 hover:border-slate-400 focus:border-cobalt-500" /></div>
              <PrimaryButton type="submit" disabled={validating} className="sm:min-w-[150px]">{validating ? "Validating…" : "Start audit"}</PrimaryButton>
            </div>
            <p id="username-help" className="mt-2 text-xs leading-5 text-slate-500">Use a username, github.com/username, or a full GitHub profile URL.</p>
            <div id="username-error" aria-live="polite">{error ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}</div>
          </form>
          <div className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500"><ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-cobalt-600" />Public data only. No login, token, write access, or repository modifications.</div>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">{[
          ["01", "Repository signals", "Activity, originality, metadata, and bounded documentation checks."],
          ["02", "Clear categories", "Showcase, keep, cleanup, archive, fork review, or manual review."],
          ["03", "Reasons included", "See which observed signals contributed to every recommendation."],
        ].map(([number, title, text]) => <div key={number} className="rounded-2xl border border-slate-200 bg-white/80 p-5"><p className="font-mono text-[11px] font-semibold text-cobalt-600">{number}</p><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></div>)}</div>
      </div>
    </div>
  );
}

function AuditProgress({ status, username }: { status: "loading" | "analyzing"; username: string }) {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-soft sm:p-10" role="status" aria-live="polite">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cobalt-950 text-lime-300"><GitBranchIcon className="h-6 w-6 animate-pulse" /></span>
        <p className="eyebrow mt-6">{status === "loading" ? "Loading public GitHub data" : "Applying transparent rules"}</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-.03em]">{status === "loading" ? `Fetching @${username}` : "Analyzing repository evidence"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{status === "loading" ? "Fetching the public profile and paginated repository listing. Large accounts can take a little longer." : "Scoring listing metadata and performing only a bounded number of README checks for likely showcase candidates."}</p>
        <div className="mx-auto mt-7 h-1.5 max-w-sm overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-cobalt-600 transition-all duration-700 ${status === "loading" ? "w-2/5" : "w-4/5"}`} /></div>
      </div>
    </div>
  );
}

function AuditError({ error, onRetry, onReset }: { error: AuditErrorState; onRetry: () => void; onReset: () => void }) {
  const title = error.status === "not_found" ? "GitHub user not found" : error.status === "rate_limited" ? "GitHub rate limit reached" : error.status === "unexpected_response" ? "Unexpected GitHub response" : "Could not reach GitHub";
  return (
    <div className="container-page grid min-h-[68vh] place-items-center py-16"><div className="max-w-xl text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-800"><SearchIcon className="h-6 w-6" /></span><p className="eyebrow mt-6">Audit paused</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">{title}</h1><p className="mt-4 text-sm leading-6 text-slate-600">{error.message}</p>{error.retryAt ? <p className="mt-2 text-xs text-slate-500">Public API quota resets around {new Date(error.retryAt).toLocaleString()}.</p> : null}<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={onReset} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold">Try another username</button><button type="button" onClick={onRetry} className="min-h-11 rounded-xl bg-cobalt-600 px-5 py-2 text-sm font-semibold text-white">Retry</button></div></div></div>
  );
}

function EmptyAudit({ audit, onReset }: { audit: GitHubAudit; onReset: () => void }) {
  return <div className="container-page grid min-h-[68vh] place-items-center py-16"><div className="max-w-xl text-center"><img src={audit.user.avatarUrl} alt="" className="mx-auto h-16 w-16 rounded-2xl" /><p className="eyebrow mt-6">Public profile found</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">No public repositories to audit.</h1><p className="mt-4 text-sm leading-6 text-slate-600">@{audit.user.login} has no public owner repositories in the listing response. Private work is not visible and no conclusion should be drawn from its absence.</p><button type="button" onClick={onReset} className="mt-7 min-h-11 rounded-xl bg-cobalt-600 px-5 py-2 text-sm font-semibold text-white">Audit another profile</button></div></div>;
}

export function AuditPage() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuditStatus>(routeUsername ? "loading" : "idle");
  const [audit, setAudit] = useState<GitHubAudit | null>(null);
  const [error, setError] = useState<AuditErrorState | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const forceRefresh = useRef(false);
  const parsedRoute = routeUsername ? parseGitHubUsername(routeUsername) : null;
  const normalizedUsername = parsedRoute?.ok ? parsedRoute.username : null;

  useEffect(() => {
    if (!routeUsername) {
      setStatus("idle");
      setAudit(null);
      return;
    }
    if (!normalizedUsername) {
      setStatus("idle");
      setAudit(null);
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setError(null);
    runGitHubAudit(normalizedUsername, { signal: controller.signal, forceRefresh: forceRefresh.current, onAnalyzing: () => { if (!controller.signal.aborted) setStatus("analyzing"); } })
      .then((result) => {
        if (controller.signal.aborted) return;
        forceRefresh.current = false;
        setAudit(result);
        setStatus("success");
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const clientError = caught instanceof GitHubClientError ? caught : new GitHubClientError("NETWORK_ERROR", "The audit could not be completed. Try again.");
        const errorStatus: AuditErrorState["status"] = clientError.code === "NOT_FOUND" ? "not_found" : clientError.code === "RATE_LIMITED" ? "rate_limited" : clientError.code === "MALFORMED_RESPONSE" ? "unexpected_response" : "network_error";
        setError({ status: errorStatus, message: clientError.message, ...(clientError.retryAt ? { retryAt: clientError.retryAt } : {}) });
        setStatus(errorStatus);
      });
    return () => controller.abort();
  }, [normalizedUsername, refreshCount, routeUsername]);

  function refresh() {
    forceRefresh.current = true;
    setRefreshCount((count) => count + 1);
  }

  if (!routeUsername || !normalizedUsername) return <AuditEntry initialValue={routeUsername ?? ""} />;
  if (status === "loading" || status === "analyzing") return <AuditProgress status={status} username={normalizedUsername} />;
  if (error && ["not_found", "rate_limited", "network_error", "unexpected_response"].includes(status)) return <AuditError error={error} onRetry={refresh} onReset={() => navigate("/audit")} />;
  if (audit && status === "success" && audit.repositories.length === 0) return <EmptyAudit audit={audit} onReset={() => navigate("/audit")} />;
  if (audit && status === "success") return <AuditDashboard audit={audit} onRefresh={refresh} />;
  return <AuditEntry />;
}
