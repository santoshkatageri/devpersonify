import { CareerOutcomeGuide } from "../components/career-outcome-guide";
import { useState } from "react";
import { Link } from "react-router-dom";
import { FileIcon, GitBranchIcon, LayersIcon, SearchIcon, ShieldIcon, TargetIcon } from "../components/icons";
import type { SavedWorkflow } from "../components/saved-workflow";
import { loadCareerProfile } from "../features/career-profile/career-profile-storage";
import { ProfileSafetyPanel } from "../features/career-profile/profile-safety-panel";
import { loadPreparationState } from "../features/github-preparation/preparation-storage";

// Read the saved snapshot without refreshing GitHub or applying the audit cache TTL.
function auditSnapshot(username: string): { count: number; savedAt: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(`devpersonify:audit:v1:${username.toLowerCase()}`) ?? "null");
    return value?.user?.login?.toLowerCase() === username.toLowerCase() && Array.isArray(value.repositories) && Number.isFinite(Date.parse(value.savedAt))
      ? { count: value.repositories.length, savedAt: value.savedAt } : null;
  } catch { return null; }
}
const dateLabel = (value: string | number) => Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString() : "Date unavailable";

const toolAppearance: Record<string, { icon: typeof FileIcon; label: string; color: string }> = {
  "GitHub audit": { icon: SearchIcon, label: "Public evidence", color: "bg-cobalt-50 text-cobalt-700" },
  "Career profile": { icon: LayersIcon, label: "Your foundation", color: "bg-violet-50 text-violet-700" },
  "GitHub projects": { icon: GitBranchIcon, label: "Your portfolio", color: "bg-emerald-50 text-emerald-700" },
  "README draft": { icon: FileIcon, label: "Markdown", color: "bg-sky-50 text-sky-700" },
  "Resume draft": { icon: FileIcon, label: "Word · LaTeX", color: "bg-amber-50 text-amber-800" },
  "LinkedIn review": { icon: TargetIcon, label: "Private review", color: "bg-indigo-50 text-indigo-700" },
};

export function WorkspaceHomePage({ session }: { session: SavedWorkflow }) {
  const [profile, setProfile] = useState(() => loadCareerProfile(session.username));
  const preparation = loadPreparationState(session.username);
  const audit = auditSnapshot(session.username);
  const username = encodeURIComponent(session.username);
  const career = `/career/${username}`;
  const prepare = `/audit/${username}/prepare`;
  const repositories = profile?.githubEvidence.repositories ?? [];
  const pending = profile?.resumeReview.filter((item) => item.status === "PENDING").length ?? 0;
  const accepted = profile?.resumeReview.filter((item) => item.status === "ACCEPTED").length ?? 0;
  const selected = audit ? Object.values(preparation.repositories).filter((item) => item?.selectedForPortfolio).length : repositories.filter((item) => item.selectedForPortfolio).length;
  const next = !profile
    ? { title: "Choose the projects that represent you", text: "Review your repository recommendations, then build your career profile.", to: prepare, action: "Review projects" }
    : pending > 0
      ? { title: `Review ${pending} evidence ${pending === 1 ? "item" : "items"}`, text: "Check extracted details and accept the ones you want to use. Pending items stay out of your documents.", to: `${career}?step=review`, action: "Review evidence" }
      : !profile.resumeEvidence
        ? { title: "Add your career experience", text: "Add a Word resume or enter your details manually. You can also keep working with GitHub evidence alone.", to: `${career}?step=resume`, action: "Add career details" }
        : { title: "Review your profile and document drafts", text: "Check the facts, choose what to include, and review each document before sharing it.", to: `${career}?step=preview`, action: "Review career profile" };
  const headline = profile?.careerDirection.professionalHeadline?.value || preparation.profile.professionalHeadline;
  const work = [
    ...(audit ? [{ title: "GitHub audit", detail: `Snapshot from ${dateLabel(audit.savedAt)}`, action: "Open audit", to: `/audit/${username}` }] : []),
    { title: "Career profile", detail: profile ? `${accepted} accepted evidence items · ${pending} pending review` : "Add experience, skills, and career context", action: profile ? "Open career profile" : "Build career profile", to: profile ? `${career}?step=preview` : career },
    { title: "GitHub projects", detail: audit ? `${audit.count} repositories in saved audit · ${selected} selected for portfolio` : `${repositories.length} repositories in career evidence · ${selected} selected for portfolio`, action: audit ? "Open GitHub profile" : "View saved evidence", to: audit ? prepare : `${career}?step=preview` },
    { title: "README draft", detail: "Review and download Markdown for your GitHub profile", action: "Build README", to: profile ? `${career}/readme` : `${prepare}?step=readme` },
    { title: "Resume draft", detail: "Choose content and download Word or LaTeX", action: profile ? "Open Resume Studio" : "Build career profile first", to: profile ? `${career}/resume` : career },
    ...(profile ? [{ title: "LinkedIn review", detail: "Review 10 profile sections with your saved evidence and a practical action plan", action: "Review LinkedIn", to: `${career}/linkedin-review` }] : []),
  ];
  const metrics = [
    { value: audit?.count ?? repositories.length, label: "Repositories", detail: audit ? "In your saved audit" : "In your career evidence", icon: GitBranchIcon, color: "text-cobalt-700 bg-cobalt-50" },
    { value: selected, label: "Portfolio picks", detail: "Selected by you", icon: LayersIcon, color: "text-emerald-700 bg-emerald-50" },
    { value: profile ? pending : "—", label: "Evidence to review", detail: profile ? `${accepted} items already accepted` : "Add your career details to begin", icon: TargetIcon, color: "text-amber-800 bg-amber-50" },
  ];
  return <div className="container-page py-6 sm:py-10">
    <div className="relative isolate overflow-hidden rounded-[28px] bg-cobalt-950 p-6 text-white shadow-soft sm:p-8 lg:p-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(49,88,231,.5),transparent_65%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-44 -z-10 h-96 w-96 rounded-full border-[48px] border-white/5" />
      <div className="grid items-center gap-7 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <header className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.2em] text-lime-300"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" />Your workspace</p>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl">Welcome back,{" "}<span className="mt-1 block break-words text-white">@{session.username}</span></h1>
          <p className="mt-3 text-sm leading-6 text-cobalt-100">{headline || "Turn your experience into a profile you’re proud to share."}</p>
          <Link to={session.to} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-lime-300 px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-lime-400">Continue saved session →</Link>
          <p className="mt-4 flex items-center gap-2 text-xs text-cobalt-100"><ShieldIcon className="h-4 w-4 shrink-0" />Saved in this browser</p>
          <p className="mt-1 text-[11px] leading-5 text-cobalt-100">{profile ? "Career profile saved" : "Last saved"} {dateLabel(profile?.updatedAt ?? audit?.savedAt ?? session.updatedAt)}</p>
        </header>
        <section aria-labelledby="next-step-title" className="rounded-2xl border border-white/20 bg-white p-5 text-ink shadow-soft sm:p-6">
          <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cobalt-50 text-cobalt-700"><TargetIcon className="h-5 w-5" /></span><p className="text-xs font-semibold text-cobalt-700">Suggested next step</p></div>
          <h2 id="next-step-title" className="mt-5 text-2xl font-semibold leading-tight tracking-[-.025em]">{next.title}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">{next.text}</p>
          <Link to={next.to} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-cobalt-50 px-4 py-2 text-sm font-semibold text-cobalt-700 transition hover:bg-cobalt-100">{next.action} →</Link>
        </section>
      </div>
    </div>
    <CareerOutcomeGuide profile={profile} username={session.username} />
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{metrics.map(({ value, label, detail, icon: Icon, color }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span><dl><dt className="text-xs font-medium text-slate-600">{label}</dt><dd className="mt-1"><span className="text-2xl font-semibold tracking-tight">{value}</span><span className="mt-1 block text-[11px] leading-4 text-slate-600">{detail}</span></dd></dl></div>)}</div>
    <section aria-labelledby="your-work-title" className="mt-9">
      <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="your-work-title" className="text-xl font-semibold tracking-tight">Your work</h2><p className="mt-1 text-sm text-slate-600">Shape your story. Choose where to pick up.</p></div><Link to="/guide" className="inline-flex min-h-11 items-center text-xs font-semibold text-cobalt-700 underline">Need a hand? User guide →</Link></div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{work.map((item) => {
        const { icon: Icon, label, color } = toolAppearance[item.title]!;
        return <li key={item.title} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:border-cobalt-100 hover:shadow-lift motion-safe:hover:-translate-y-1 sm:p-6">
          <div className="flex items-center justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}><Icon className="h-5 w-5" /></span><span className="text-[10px] font-medium text-slate-600">{label}</span></div>
          <h3 className="mt-5 text-lg font-semibold tracking-tight">{item.title}</h3><p className="mb-4 mt-2 flex-1 text-xs leading-5 text-slate-600">{item.detail}</p>
          <Link to={item.to} className="inline-flex min-h-11 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-cobalt-700 transition hover:border-cobalt-100 hover:bg-cobalt-50">{item.action} →</Link>
        </li>;
      })}</ul>
    </section>
    {profile ? <ProfileSafetyPanel profile={profile} step="home" saved={true} restore={setProfile} /> : <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Protect your progress</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your audit and project choices are saved in this browser. Create a career profile to download a portable profile backup and keep version history.</p><Link to={career} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-cobalt-700 underline">Create career profile →</Link></section>}
    <nav aria-label="Workspace options" className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-slate-600"><Link to="/audit" className="inline-flex min-h-11 items-center underline">Analyze another GitHub</Link><Link to="/restore" className="inline-flex min-h-11 items-center underline">Restore a backup</Link><Link to="/about" className="inline-flex min-h-11 items-center underline">About DevPersonify</Link></nav>
    <p className="mt-2 text-xs leading-5 text-slate-600">Saved work stays on this website in this browser. It does not sync across devices. Document drafts need your review before sharing.</p>
  </div>;
}
