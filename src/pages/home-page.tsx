import { CareerOutcomeGuide } from "../components/career-outcome-guide";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ButtonLink, SectionHeading } from "../components/ui";
import { CheckIcon, FileIcon, GitBranchIcon, LayersIcon, SearchIcon, ShieldIcon, SparkIcon } from "../components/icons";
import { openFeedbackPanel } from "../features/feedback/feedback";

import { WorkspaceHomePage } from "./workspace-home-page";
import { savedWorkflow } from "../components/saved-workflow";
import { tallyFeedbackFormId } from "../features/feedback/tally-feedback";

interface CapabilityCardProps {
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  cta: string;
  to?: string;
  onAction?: () => void;
  accent?: boolean;
}

function CapabilityCard({ icon, label, title, description, cta, to, onAction, accent = false }: CapabilityCardProps) {
  const actionClasses = `inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition ${accent ? "bg-lime-300 text-lime-950 hover:bg-lime-400" : "border border-slate-300 bg-white text-cobalt-700 hover:border-cobalt-300"}`;
  return <article className={`group flex min-h-full flex-col overflow-hidden rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-soft sm:p-7 ${accent ? "border-cobalt-200 bg-cobalt-950 text-white" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${accent ? "bg-white/10 text-lime-300" : "bg-cobalt-50 text-cobalt-600"}`}>{icon}</span><span className={`rounded-md px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[.14em] ${accent ? "bg-white/10 text-lime-300" : "bg-lime-50 text-lime-900"}`}>Available</span></div><p className={`mt-7 font-mono text-[10px] font-semibold uppercase tracking-[.15em] ${accent ? "text-lime-300" : "text-cobalt-600"}`}>{label}</p><h3 className="mt-3 text-xl font-semibold tracking-[-0.025em]">{title}</h3><p className={`mt-3 flex-1 text-sm leading-6 ${accent ? "text-white/65" : "text-slate-600"}`}>{description}</p><div className="mt-6">{to ? <Link to={to} className={actionClasses}>{cta} →</Link> : <button type="button" onClick={onAction} className={actionClasses}>{cta} →</button>}</div></article>;
}

function AuditPreview() {
  const repos = [
    { name: "checkout-service", score: "86", status: "SHOWCASE", color: "bg-lime-300 text-lime-900" },
    { name: "react-dashboard", score: "72", status: "KEEP", color: "bg-cobalt-50 text-cobalt-700" },
    { name: "learning-rust", score: "48", status: "CLEANUP", color: "bg-amber-100 text-amber-800" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-label="Illustrative example of a repository audit">
      <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full border-[16px] border-lime-300/70" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_28px_80px_-28px_rgba(16,24,40,.32)] sm:p-6">
        <div className="mb-4 flex items-center justify-between rounded-xl border border-cobalt-100 bg-cobalt-50 px-3 py-2">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[.16em] text-cobalt-700">Illustrative output · example values</p>
          <span className="text-[10px] text-cobalt-600">Not a live audit</span>
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-cobalt-950 font-mono text-sm font-semibold text-white">DP</div><div><p className="text-sm font-semibold">Example audit</p><p className="font-mono text-[11px] text-slate-600">public evidence · read only</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-2.5 py-1 text-[11px] font-semibold text-lime-900"><span className="h-1.5 w-1.5 rounded-full bg-lime-500" /> Example</span></div>
        <div className="grid grid-cols-[120px_1fr] gap-4 py-5 sm:grid-cols-[145px_1fr] sm:gap-6"><div className="rounded-2xl bg-cobalt-950 p-4 text-white sm:p-5"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">Portfolio health</p><p className="mt-3 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">78<span className="text-lg text-lime-300">/100</span></p><p className="mt-2 text-xs text-white/60">Example only</p></div><div className="grid grid-cols-2 gap-2">{[["18", "Original"], ["4", "Showcase"], ["7", "Review"], ["67%", "Coverage"]].map(([value, label]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-lg font-semibold tracking-tight sm:text-xl">{value}</p><p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px]">{label}</p></div>)}</div></div>
        <div className="space-y-2">{repos.map((repo) => <div key={repo.name} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 sm:grid-cols-[1fr_auto_auto]"><div className="flex min-w-0 items-center gap-2.5"><GitBranchIcon className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate font-mono text-[11px] font-semibold sm:text-xs">{repo.name}</span></div><span className={`hidden rounded-md px-2 py-1 font-mono text-[9px] font-bold sm:block ${repo.color}`}>{repo.status}</span><span className="font-mono text-xs font-bold text-cobalt-600">{repo.score}</span></div>)}</div>
      </div>
    </div>
  );
}

export function HomePage() {
  const session = savedWorkflow();
  return session ? <WorkspaceHomePage key={session.username} session={session} /> : <LandingPage />;
}

export function LandingPage() {
  const context = savedWorkflow();
  const username = context ? encodeURIComponent(context.username) : "";
  const preparationRoute = username ? `/audit/${username}/prepare` : "/audit";
  const careerRoute = username ? `/career/${username}${context?.hasCareer ? "?step=preview" : ""}` : "/audit";
  const readmeRoute = username && context?.hasCareer ? `/career/${username}/readme` : "/audit";
  const resumeRoute = username && context?.hasCareer ? `/career/${username}/resume` : "/audit";
  return (
    <>
      <section className="relative overflow-hidden border-b border-slate-200 bg-paper py-16 sm:py-20 lg:py-24">
        <div className="absolute inset-0 bg-grid bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-12 lg:grid-cols-[1.08fr_.72fr] lg:gap-16">
          <div><p className="eyebrow inline-flex items-center gap-2"><span className="h-px w-7 bg-cobalt-500" /> Developer career evidence platform</p><h1 className="mt-6 max-w-[760px] text-balance text-[2.85rem] font-semibold leading-[.98] tracking-[-0.06em] text-ink sm:text-[4.25rem] lg:text-[4.7rem]">Your work already tells a story. <span className="text-cobalt-600">Make it count.</span></h1><p className="mt-7 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Turn your projects and experience into a resume you can share, a clearer GitHub profile, or a LinkedIn action plan. Bring the facts; review and download a draft you control.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><ButtonLink to="/audit" className="sm:min-w-[194px]">Analyze my GitHub</ButtonLink><a href="#outcomes" className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">See what you’ll get</a></div><div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">{["No account required", "Public GitHub access", "Never modifies repositories"].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-cobalt-600" />{item}</span>)}</div></div>
          <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-cobalt-600">One clear starting point</p><h2 className="mt-4 text-2xl font-semibold tracking-[-.035em]">From your experience to a useful output.</h2><div className="mt-7 space-y-5">{[["01", "Bring your work", "Start with GitHub, then add projects, education, and experience you want to include."], ["02", "Check your facts", "Correct extracted details and choose the evidence that supports your story."], ["03", "Leave with something useful", "Download a Word resume, a GitHub README, or a LinkedIn review report."]].map(([number, title, text]) => <div key={number} className="flex gap-4"><span className="font-mono text-xs font-bold text-cobalt-600">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div></div>)}</div></aside>
        </div>
      </section>

      <div id="outcomes" className="container-page py-6"><CareerOutcomeGuide /></div>

      <section className="border-y border-slate-200 bg-[#f1f2ee] py-20 sm:py-24"><div className="container-page grid items-center gap-12 lg:grid-cols-[.7fr_1fr] lg:gap-16"><div><SectionHeading eyebrow="Example audit" title="From repository list to an actionable review." description="The audit makes public signals visible without pretending they tell the whole story. Example values are shown here only to demonstrate the interface." /><ButtonLink to="/audit" className="mt-7">Run a real audit</ButtonLink></div><AuditPreview /></div></section>

      <section id="how-it-works" className="bg-white py-16 sm:py-20"><div className="container-page"><SectionHeading eyebrow="How it works" title="Bring your experience. Review every detail." align="center" /><div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2">{[
        ["01", "Audit your public work", "You enter a GitHub username. DevPersonify explains repository signals and suggests projects to review."],
        ["02", "Choose what represents you", "You select and order projects, then add your headline and career context. Nothing is changed on GitHub."],
        ["03", "Review your resume details", "Add an original Word (.docx) resume for best results. Correct and accept the extracted roles, dates, skills, and education. Pending items stay out of downloads."],
        ["04", "Download and keep a backup", "Get a Markdown README, Word resume, or LaTeX source. Review the final document, publish it yourself, and save a profile backup to move devices."],
      ].map(([number, title, text]) => <article key={number} className="rounded-2xl border border-slate-200 p-6"><p className="font-mono text-xs font-bold text-cobalt-600">{number}</p><h3 className="mt-3 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</div><div className="mt-7 text-center"><p className="text-sm text-slate-600">Your judgment is part of the workflow. Extraction and comparison can miss context.</p><Link to="/guide" className="mt-3 inline-block text-sm font-semibold text-cobalt-700 underline">Read the user guide: inputs, outputs, and limits →</Link></div></div></section>

      <section id="features" className="border-y border-slate-200 bg-[#f1f2ee] py-20 sm:py-24 lg:py-28"><div className="container-page"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><SectionHeading eyebrow="Capabilities" title="One evidence layer, useful across your career presence." /><p className="max-w-md text-sm leading-6 text-slate-600 lg:text-right">Start with public GitHub evidence, build a focused developer profile, then turn the same evidence into drafts you can review and download.</p></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CapabilityCard icon={<SearchIcon className="h-5 w-5" />} label="GitHub Audit" title="Know what your public work communicates." description="Review repositories with transparent scoring, evidence traces, and non-destructive recommendations." cta="Start here" to="/audit" accent />
        <CapabilityCard icon={<GitBranchIcon className="h-5 w-5" />} label="GitHub Profile Preparation" title="Make your strongest work easier to find." description="Curate repositories, resolve cleanup decisions, and prepare a focused GitHub profile without changing your account." cta={context ? "Open GitHub profile" : "Start with audit"} to={preparationRoute} />
        <CapabilityCard icon={<LayersIcon className="h-5 w-5" />} label="Career Evidence Profile" title="Build one source of truth for your career evidence." description="Combine GitHub evidence, your resume, and information you provide into one structured profile with sources preserved." cta={context ? "Open career profile" : "Start with audit"} to={careerRoute} />
        <CapabilityCard icon={<FileIcon className="h-5 w-5" />} label="GitHub Profile README" title="Turn your evidence into a profile people can understand." description="Create an editable GitHub Profile README from selected evidence, with safe preview, Markdown source, copy, and download." cta={context?.hasCareer ? "Build README" : "Start with audit"} to={readmeRoute} />
        <CapabilityCard icon={<FileIcon className="h-5 w-5" />} label="Resume Studio" title="Turn the same evidence into a professional resume." description="Build an editable one-column resume with LaTeX source and Word export, while keeping evidence and presentation edits separate." cta={context?.hasCareer ? "Open Resume Studio" : "Start with audit"} to={resumeRoute} />
        <CapabilityCard icon={<SparkIcon className="h-5 w-5" />} label="Product Feedback" title="What helped you most?" description="Capture what worked well, a small win, or a suggestion. Report bugs separately on GitHub." cta="Write feedback" onAction={openFeedbackPanel} />
      </div></div></section>

      <section className="bg-white py-20 sm:py-24"><div className="container-page"><div className="grid gap-8 rounded-[32px] border border-lime-300 bg-lime-50 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-14"><div><p className="font-mono text-xs font-semibold uppercase tracking-[.18em] text-lime-900">Help shape DevPersonify</p><h2 className="mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-[-.04em] text-ink sm:text-4xl">We would love to hear what worked well.</h2><p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">Did DevPersonify help you find a project worth showcasing, improve your profile, or put together a resume? Tell us what helped and what you would like next.</p><p className="mt-4 max-w-2xl text-xs leading-5 text-slate-500">{tallyFeedbackFormId() ? "Share feedback through our Tally form. Report bugs and technical issues on GitHub." : "Feedback drafts stay in this browser and are not sent to the team. Report bugs and technical issues on GitHub."}</p></div><button type="button" onClick={openFeedbackPanel} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-700">Write feedback →</button></div></div></section>

      <section className="bg-white py-20 sm:py-24"><div className="container-page grid gap-10 rounded-[32px] bg-cobalt-950 px-6 py-10 text-white sm:px-10 sm:py-12 lg:grid-cols-[1fr_.78fr] lg:items-center lg:px-14 lg:py-14"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Evidence before claims</p><h2 className="mt-4 max-w-xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Useful without a black box.</h2><p className="mt-5 max-w-xl text-base leading-7 text-white/70">Scores use published deterministic rules. They describe visible public repository evidence—not engineering ability, employability, or guaranteed outcomes.</p></div><div className="grid gap-3">{[[<ShieldIcon className="h-5 w-5" />, "Read-only by design", "No automatic archive, delete, edit, OAuth, or write access."], [<SearchIcon className="h-5 w-5" />, "Unknown is not absent", "Unfetched signals do not count as missing evidence."]].map(([icon, title, text]) => <div key={String(title)} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-300 text-lime-900">{icon}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-white/60">{text}</p></div></div>)}</div></div></section>

      <section className="border-t border-slate-200 bg-paper py-20 sm:py-24"><div className="container-page text-center"><p className="eyebrow">Start with what is public</p><h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Make your GitHub easier to understand.</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">No sign-up. No write access. Just a clear starting point for reviewing your public developer evidence.</p><ButtonLink to="/audit" className="mt-8">Analyze my GitHub</ButtonLink></div></section>
    </>
  );
}
