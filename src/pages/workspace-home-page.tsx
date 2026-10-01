import { useState } from "react";
import { Link } from "react-router-dom";
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
    ...(profile ? [{ title: "LinkedIn review", detail: "Compare pasted profile text with your saved career evidence", action: "Review LinkedIn", to: `${career}/linkedin-review` }] : []),
  ];
  return <div className="container-page max-w-5xl py-8 sm:py-12">
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div className="min-w-0"><p className="eyebrow">Your workspace</p><h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, @{session.username}</h1>{headline ? <p className="mt-2 text-sm text-slate-700">{headline}</p> : null}<p className="mt-3 text-xs leading-5 text-slate-600">Saved in this browser · {profile ? "Career profile saved" : "Last saved"} {dateLabel(profile?.updatedAt ?? audit?.savedAt ?? session.updatedAt)}</p></div>
      <Link to={session.to} className="inline-flex min-h-11 items-center rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">Continue saved session →</Link>
    </header>
    <section aria-labelledby="next-step-title" className="mt-7 rounded-2xl border border-cobalt-100 bg-cobalt-50/60 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div><p className="text-xs font-semibold text-cobalt-700">Suggested next step</p><h2 id="next-step-title" className="mt-2 text-lg font-semibold">{next.title}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{next.text}</p></div><Link to={next.to} className="mt-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-cobalt-700 underline sm:mt-0">{next.action} →</Link>
    </section>
    <section aria-labelledby="your-work-title" className="mt-8"><h2 id="your-work-title" className="text-lg font-semibold">Your work</h2><ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">{work.map((item) => <li key={item.title} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-4"><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{item.detail}</p></div><Link to={item.to} className="inline-flex min-h-11 items-center text-xs font-semibold text-cobalt-700 underline">{item.action} →</Link></li>)}</ul></section>
    {profile ? <ProfileSafetyPanel profile={profile} step="home" saved={true} restore={setProfile} /> : <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Protect your progress</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your audit and project choices are saved in this browser. Create a career profile to download a portable profile backup and keep version history.</p><Link to={career} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-cobalt-700 underline">Create career profile →</Link></section>}
    <nav aria-label="Workspace options" className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-slate-600"><Link to="/audit" className="inline-flex min-h-11 items-center underline">Analyze another GitHub</Link><Link to="/restore" className="inline-flex min-h-11 items-center underline">Restore a backup</Link><Link to="/about" className="inline-flex min-h-11 items-center underline">About DevPersonify</Link></nav>
    <p className="mt-2 text-xs leading-5 text-slate-600">Saved work stays on this website in this browser. It does not sync across devices. Document drafts need your review before sharing.</p>
  </div>;
}
