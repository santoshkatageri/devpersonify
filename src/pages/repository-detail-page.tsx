import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { RepositoryClassification, ScoreReason, ScoreSignalKey } from "../domain/scoring";
import { ShieldIcon } from "../components/icons";
import { parseGitHubUsername } from "../features/github-audit/github-username";
import { enrichRepositoryInAudit, runGitHubAudit, type GitHubAudit } from "../features/github-audit/run-audit";
import { applyRepositoryView, repositoryViewFromParams } from "../features/github-audit/repository-view";
import { getPreference, setRepositoryDecision, type PreparationState, type UserRepositoryDecision } from "../features/github-preparation/preparation";
import { loadPreparationState, savePreparationState } from "../features/github-preparation/preparation-storage";

const labels: Record<ScoreSignalKey, string> = { original_repository: "Original repository", recent_push: "Recent activity", repository_maturity: "Repository age", stars: "Public stars", forks: "Public forks", description_quality: "Description", readme_presence: "README", license_presence: "License", topics_presence: "Topics", release_activity: "Release activity", issues_activity: "Issue activity", pull_request_activity: "Pull request activity", project_completeness: "Project completeness", archived_repository: "Archived state", fork_repository: "Fork state", stale_repository: "Older activity" };
const classificationLabels: Record<RepositoryClassification, string> = { SHOWCASE: "Showcase", KEEP: "Keep", ARCHIVE: "Archive", FORK_REVIEW: "Fork review", REVIEW: "Review", CLEANUP: "Cleanup" };
const decisions: UserRepositoryDecision[] = ["KEEP", "SHOWCASE", "ARCHIVE", "REVIEW"];

function signalState(reason: ScoreReason): "OBSERVED" | "ABSENT" {
  if (reason.signal === "description_quality" && reason.observedValue === null) return "ABSENT";
  if (reason.signal === "readme_presence" && reason.observedValue === false) return "ABSENT";
  if (reason.signal === "license_presence" && (reason.observedValue === null || reason.observedValue === "NOASSERTION")) return "ABSENT";
  if (reason.signal === "topics_presence" && reason.observedValue === 0) return "ABSENT";
  return "OBSERVED";
}

function backPath(username: string, params: URLSearchParams): string {
  const clean = new URLSearchParams(params); const from = clean.get("from"); clean.delete("from");
  const query = clean.toString();
  if (from === "prepare") return `/audit/${encodeURIComponent(username)}/prepare${query ? `?${query}` : ""}`;
  if (from === "career") return `/career/${encodeURIComponent(username)}?step=preview`;
  if (from === "resume") return `/career/${encodeURIComponent(username)}/resume`;
  if (from === "readme") return `/career/${encodeURIComponent(username)}/readme`;
  return `/audit/${encodeURIComponent(username)}${query ? `?${query}` : ""}`;
}

export function RepositoryDetailPage() {
  const route = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const parsed = parseGitHubUsername(route.username ?? "");
  const username = parsed.ok ? parsed.username : "";
  const [audit, setAudit] = useState<GitHubAudit | null>(null);
  const [preparation, setPreparation] = useState<PreparationState>(() => loadPreparationState(username));
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [readmeStatus, setReadmeStatus] = useState<"checking" | "ready" | "unknown">("unknown");
  const view = repositoryViewFromParams(params, params.get("from") === "prepare" ? "score" : "score");

  useEffect(() => {
    if (!username) { setStatus("error"); return; }
    const controller = new AbortController();
    runGitHubAudit(username, { signal: controller.signal }).then((result) => { if (!controller.signal.aborted) { setAudit(result); setStatus("ready"); } }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [username]);
  useEffect(() => { if (username) savePreparationState(preparation); }, [preparation, username]);

  const current = audit?.repositories.find(({ repository }) => repository.owner.toLowerCase() === (route.owner ?? "").toLowerCase() && repository.name.toLowerCase() === (route.repo ?? "").toLowerCase());
  const currentId = current?.repository.id;
  useEffect(() => {
    if (!audit || !current || current.repository.hasReadme !== undefined) { if (current?.repository.hasReadme !== undefined) setReadmeStatus("ready"); return; }
    const controller = new AbortController(); setReadmeStatus("checking");
    enrichRepositoryInAudit(audit, current.repository.id, controller.signal).then((updated) => { if (!controller.signal.aborted) { setAudit(updated); const item = updated.repositories.find(({ repository }) => repository.id === current.repository.id); setReadmeStatus(item?.repository.hasReadme === undefined ? "unknown" : "ready"); } }).catch(() => { if (!controller.signal.aborted) setReadmeStatus("unknown"); });
    return () => controller.abort();
  }, [audit, current, currentId]);

  const filtered = useMemo(() => audit ? applyRepositoryView(audit.repositories, { filter: view.filter, query: view.query, sort: view.sort }) : [], [audit, view.filter, view.query, view.sort]);
  const index = current ? filtered.findIndex(({ repository }) => repository.id === current.repository.id) : -1;
  const previous = index > 0 ? filtered[index - 1] : undefined;
  const next = index >= 0 && index < filtered.length - 1 ? filtered[index + 1] : undefined;
  const sameParams = params.toString();
  const detailPath = (owner: string, repo: string) => `/audit/${encodeURIComponent(username)}/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${sameParams ? `?${sameParams}` : ""}`;
  const previousPath = previous ? detailPath(previous.repository.owner, previous.repository.name) : "";
  const nextPath = next ? detailPath(next.repository.owner, next.repository.name) : "";
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement)?.tagName)) return;
      if (event.key === "ArrowLeft" && previousPath) navigate(previousPath);
      if (event.key === "ArrowRight" && nextPath) navigate(nextPath);
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [navigate, nextPath, previousPath]);

  if (status === "loading") return <div className="container-page grid min-h-[65vh] place-items-center"><p role="status" className="text-sm text-slate-500">Loading repository evidence…</p></div>;
  const back = backPath(username, params);
  if (status === "error" || !audit) return <div className="container-page grid min-h-[65vh] place-items-center text-center"><div><h1 className="text-3xl font-semibold">Repository evidence unavailable.</h1><Link to={back} className="mt-5 inline-flex rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white">Back to repositories</Link></div></div>;
  if (!current) return <div className="container-page grid min-h-[65vh] place-items-center text-center"><div><p className="eyebrow">Repository removed or unavailable</p><h1 className="mt-3 text-3xl font-semibold">This repository is no longer in the current audit.</h1><p className="mt-3 text-sm text-slate-500">It may have been removed, renamed, or excluded from the current result set.</p><Link to={back} className="mt-5 inline-flex rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white">Back to repositories</Link></div></div>;
  const preference = getPreference(preparation, current.repository.id);
  const readme = current.repository.hasReadme;
  return <div className="container-page pb-24 pt-8"><nav aria-label="Breadcrumb" className="text-sm"><Link to={back} className="font-semibold text-cobalt-600 hover:underline">← Back to repositories</Link><span className="mx-2 text-slate-300">/</span><span className="text-slate-500">{current.repository.name}</span></nav>
    <header className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-soft sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><span className="rounded-md bg-cobalt-50 px-2 py-1 font-mono text-[10px] font-bold text-cobalt-700">{classificationLabels[current.result.classification]}</span><span className="rounded-md bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-500">{current.result.version}</span></div><h1 className="mt-3 break-words text-3xl font-semibold tracking-[-.04em]">{current.repository.name}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{current.repository.description ?? "Description not detected in public metadata."}</p><a href={current.repository.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-cobalt-600 hover:underline">Open on GitHub ↗</a></div><div className="grid grid-cols-2 gap-2 sm:flex"><div className="rounded-xl bg-cobalt-950 p-4 text-white"><p className="font-mono text-[9px] uppercase text-white/50">Evidence score</p><p className="mt-1 text-3xl font-semibold">{current.result.score}<span className="text-sm text-lime-300">/100</span></p></div><div className="rounded-xl border bg-slate-50 p-4"><p className="font-mono text-[9px] uppercase text-slate-400">Position</p><p className="mt-1 text-lg font-semibold">{index >= 0 ? `${index + 1} of ${filtered.length}` : `Outside current view`}</p></div></div></div>
      <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-[1fr_auto_auto]"><div><p className="text-xs text-slate-500">DevPersonify recommends <strong>{classificationLabels[current.result.classification]}</strong></p><p className="mt-1 text-sm">Your decision: <strong>{preference.decision ?? "Not decided"}</strong></p></div><Link aria-disabled={!previous} to={previous ? detailPath(previous.repository.owner, previous.repository.name) : "#"} onClick={(event) => { if (!previous) event.preventDefault(); }} className={`rounded-xl border px-4 py-3 text-center text-xs font-semibold ${previous ? "bg-white" : "pointer-events-none opacity-40"}`}>← Previous repository</Link><Link aria-disabled={!next} to={next ? detailPath(next.repository.owner, next.repository.name) : "#"} onClick={(event) => { if (!next) event.preventDefault(); }} className={`rounded-xl border px-4 py-3 text-center text-xs font-semibold ${next ? "bg-white" : "pointer-events-none opacity-40"}`}>Next repository →</Link></div>
    </header>
    <div className="mt-6 grid gap-6 lg:grid-cols-[.62fr_1fr]"><aside className="space-y-5"><section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Your repository decision</h2><p className="mt-2 text-xs leading-5 text-slate-500">Local planning only. No GitHub write action occurs.</p><div className="mt-4 grid grid-cols-2 gap-2">{decisions.map((decision) => <button key={decision} type="button" aria-pressed={preference.decision === decision} onClick={() => setPreparation((state) => setRepositoryDecision(state, current.repository.id, decision))} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${preference.decision === decision ? "bg-ink text-white" : "bg-white"}`}>{decision.charAt(0) + decision.slice(1).toLowerCase()}</button>)}</div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">README enrichment</h2><div className="mt-3 flex items-start gap-3"><span className={readme === true ? "text-lime-700" : readme === false ? "text-amber-700" : "text-violet-700"}>{readme === true ? "✓" : "?"}</span><div><p className="text-sm font-semibold">{readmeStatus === "checking" ? "Checking on demand…" : readme === true ? "README confirmed" : readme === false ? "README not detected" : "README not fetched / unavailable"}</p><p className="mt-1 text-xs leading-5 text-slate-500">{readme === false ? "A targeted request did not find a README on the default branch." : readme === undefined ? "Unknown is not absent. No negative points are assigned while this signal is unknown." : "A targeted public request confirmed the README."}</p></div></div></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Repository metadata</h2><dl className="mt-4 grid grid-cols-2 gap-4 text-xs"><div><dt className="text-slate-400">Language</dt><dd className="mt-1 font-semibold">{current.repository.primaryLanguage ?? "Unknown"}</dd></div><div><dt className="text-slate-400">Visibility</dt><dd className="mt-1 font-semibold">{current.repository.visibility}</dd></div><div><dt className="text-slate-400">Stars</dt><dd className="mt-1 font-semibold">{current.repository.stars}</dd></div><div><dt className="text-slate-400">Forks</dt><dd className="mt-1 font-semibold">{current.repository.forks}</dd></div><div><dt className="text-slate-400">Open issues</dt><dd className="mt-1 font-semibold">{current.repository.openIssues}</dd></div><div><dt className="text-slate-400">Size</dt><dd className="mt-1 font-semibold">{current.repository.sizeKb} KB</dd></div><div><dt className="text-slate-400">Default branch</dt><dd className="mt-1 font-semibold">{current.repository.defaultBranch}</dd></div><div><dt className="text-slate-400">License</dt><dd className="mt-1 font-semibold">{current.repository.licenseSpdxId ?? "Not detected"}</dd></div><div className="col-span-2"><dt className="text-slate-400">Topics</dt><dd className="mt-1 font-semibold">{current.repository.topics.length ? current.repository.topics.join(", ") : "Not detected"}</dd></div><div className="col-span-2"><dt className="text-slate-400">Latest public push</dt><dd className="mt-1 font-semibold">{current.repository.pushedAt ? new Date(current.repository.pushedAt).toLocaleString() : "Unknown"}</dd></div></dl></section></aside>
      <main><section className="rounded-2xl border bg-white p-5 sm:p-7"><div className="flex gap-3"><ShieldIcon className="h-5 w-5 text-cobalt-600" /><div><h2 className="text-xl font-semibold">Complete evidence trace</h2><p className="mt-1 text-xs leading-5 text-slate-500">The exact scoring result produced by the deterministic engine. No second explanation model is used.</p></div></div><div className="mt-5 rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold">Why {classificationLabels[current.result.classification]}?</p><p className="mt-2 text-xs leading-5 text-slate-600">{current.result.classificationReason}</p><p className="mt-2 text-[10px] text-cobalt-600">Confidence: {current.result.confidence} · Available positive evidence: {current.result.availablePositivePoints}/100</p></div><div className="mt-5 overflow-hidden rounded-xl border"><div className="hidden grid-cols-[140px_90px_70px_1fr] gap-3 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase text-slate-500 sm:grid"><span>Signal</span><span>State / value</span><span>Points</span><span>Explanation</span></div><div className="divide-y">{current.result.reasons.map((reason, reasonIndex) => { const state = signalState(reason); return <div key={`${reason.signal}-${reasonIndex}`} className="grid gap-2 p-4 sm:grid-cols-[140px_90px_70px_1fr]"><p className="text-xs font-semibold">{labels[reason.signal]}</p><div><span className={`rounded-md px-2 py-1 text-[9px] font-bold ${state === "ABSENT" ? "bg-amber-50 text-amber-800" : "bg-lime-50 text-lime-800"}`}>{state}</span><p className="mt-2 break-words font-mono text-[9px] text-slate-500">{String(reason.observedValue ?? "None")}</p></div><p className={`font-mono text-xs font-bold ${reason.points > 0 ? "text-cobalt-600" : reason.points < 0 ? "text-orange-700" : "text-slate-400"}`}>{reason.points > 0 ? "+" : ""}{reason.points}</p><p className="text-xs leading-5 text-slate-600">{reason.explanation}</p></div>; })}{current.result.unknownSignals.map((signal) => <div key={`unknown-${signal}`} className="grid gap-2 p-4 sm:grid-cols-[140px_90px_70px_1fr]"><p className="text-xs font-semibold">{labels[signal]}</p><div><span className="rounded-md bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-800">UNKNOWN</span><p className="mt-2 text-[9px] text-slate-500">Not fetched</p></div><p className="font-mono text-xs text-slate-400">—</p><p className="text-xs leading-5 text-slate-600">This signal was not fetched and contributes neither positive nor negative points. Unknown is not absent.</p></div>)}</div></div></section></main></div>
    <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row"><Link to={back} className="rounded-xl border bg-white px-5 py-3 text-center text-sm font-semibold">← Back to repositories</Link><p className="self-center text-xs text-slate-400">Use ← and → arrow keys to navigate the current filtered set.</p></div></div>;
}
