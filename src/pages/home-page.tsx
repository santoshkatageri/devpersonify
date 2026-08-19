import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ButtonLink, SectionHeading } from "../components/ui";
import { CheckIcon, FileIcon, GitBranchIcon, LayersIcon, MegaphoneIcon, SearchIcon, ShieldIcon, SparkIcon } from "../components/icons";
import { openFeedbackPanel } from "../features/feedback/feedback";

interface CapabilityCardProps {
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  cta: string;
  to?: string;
  onAction?: () => void;
  tone: "audit" | "profile" | "career" | "readme" | "resume" | "feedback";
}

const capabilityTones: Record<CapabilityCardProps["tone"], { card: string; icon: string; badge: string; label: string; action: string }> = {
  audit: {
    card: "border-cobalt-200 bg-cobalt-50/80",
    icon: "bg-cobalt-100 text-cobalt-700",
    badge: "bg-cobalt-100 text-cobalt-700",
    label: "text-cobalt-700",
    action: "bg-cobalt-600 text-white hover:bg-cobalt-700",
  },
  profile: {
    card: "border-emerald-200 bg-emerald-50/70",
    icon: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
    label: "text-emerald-700",
    action: "border border-emerald-200 bg-white/80 text-emerald-800 hover:border-emerald-300 hover:bg-white",
  },
  career: {
    card: "border-violet-200 bg-violet-50/70",
    icon: "bg-violet-100 text-violet-700",
    badge: "bg-violet-100 text-violet-800",
    label: "text-violet-700",
    action: "border border-violet-200 bg-white/80 text-violet-800 hover:border-violet-300 hover:bg-white",
  },
  readme: {
    card: "border-amber-200 bg-amber-50/70",
    icon: "bg-amber-100 text-amber-800",
    badge: "bg-amber-100 text-amber-900",
    label: "text-amber-800",
    action: "border border-amber-200 bg-white/80 text-amber-900 hover:border-amber-300 hover:bg-white",
  },
  resume: {
    card: "border-rose-200 bg-rose-50/70",
    icon: "bg-rose-100 text-rose-700",
    badge: "bg-rose-100 text-rose-800",
    label: "text-rose-700",
    action: "border border-rose-200 bg-white/80 text-rose-800 hover:border-rose-300 hover:bg-white",
  },
  feedback: {
    card: "border-cyan-200 bg-cyan-50/70",
    icon: "bg-cyan-100 text-cyan-700",
    badge: "bg-cyan-100 text-cyan-800",
    label: "text-cyan-700",
    action: "border border-cyan-200 bg-white/80 text-cyan-800 hover:border-cyan-300 hover:bg-white",
  },
};

function CapabilityCard({ icon, label, title, description, cta, to, onAction, tone }: CapabilityCardProps) {
  const colors = capabilityTones[tone];
  const actionClasses = `inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition ${colors.action}`;
  return <article className={`group flex min-h-full flex-col overflow-hidden rounded-3xl border p-6 text-ink transition duration-300 hover:-translate-y-1 hover:shadow-soft sm:p-7 ${colors.card}`}><div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${colors.icon}`}>{icon}</span><span className={`rounded-md px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[.14em] ${colors.badge}`}>Available</span></div><p className={`mt-7 font-mono text-[10px] font-semibold uppercase tracking-[.15em] ${colors.label}`}>{label}</p><h3 className="mt-3 text-xl font-semibold tracking-[-0.025em]">{title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{description}</p><div className="mt-6">{to ? <Link to={to} className={actionClasses}>{cta} →</Link> : <button type="button" onClick={onAction} className={actionClasses}>{cta} →</button>}</div></article>;
}

function existingWorkflowContext(): { username: string; hasCareer: boolean } | null {
  try {
    const careerKeys = Object.keys(localStorage).filter((key) => key.startsWith("devpersonify:career-evidence:v1:"));
    if (careerKeys.length) {
      const profiles = careerKeys.map((key) => { try { return JSON.parse(localStorage.getItem(key) ?? "null") as { username?: string; updatedAt?: string } | null; } catch { return null; } }).filter((value): value is { username: string; updatedAt?: string } => Boolean(value?.username)).sort((a, b) => Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? ""));
      if (profiles[0]) return { username: profiles[0].username, hasCareer: true };
    }
    const prefixes = ["devpersonify:preparation:v1:", "devpersonify:audit:v1:"];
    for (const prefix of prefixes) {
      const key = Object.keys(localStorage).find((candidate) => candidate.startsWith(prefix));
      if (key) return { username: key.slice(prefix.length), hasCareer: false };
    }
  } catch { /* Landing remains useful without local storage. */ }
  return null;
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
        <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-cobalt-950 font-mono text-sm font-semibold text-white">DP</div><div><p className="text-sm font-semibold">Example audit</p><p className="font-mono text-[11px] text-slate-400">public evidence · read only</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-2.5 py-1 text-[11px] font-semibold text-lime-900"><span className="h-1.5 w-1.5 rounded-full bg-lime-500" /> Example</span></div>
        <div className="grid grid-cols-[120px_1fr] gap-4 py-5 sm:grid-cols-[145px_1fr] sm:gap-6"><div className="rounded-2xl bg-cobalt-950 p-4 text-white sm:p-5"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">Portfolio health</p><p className="mt-3 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">78<span className="text-lg text-lime-300">/100</span></p><p className="mt-2 text-xs text-white/60">Example only</p></div><div className="grid grid-cols-2 gap-2">{[["18", "Original"], ["4", "Showcase"], ["7", "Review"], ["67%", "Coverage"]].map(([value, label]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-lg font-semibold tracking-tight sm:text-xl">{value}</p><p className="mt-0.5 text-[10px] text-slate-500 sm:text-[11px]">{label}</p></div>)}</div></div>
        <div className="space-y-2">{repos.map((repo) => <div key={repo.name} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 sm:grid-cols-[1fr_auto_auto]"><div className="flex min-w-0 items-center gap-2.5"><GitBranchIcon className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate font-mono text-[11px] font-semibold sm:text-xs">{repo.name}</span></div><span className={`hidden rounded-md px-2 py-1 font-mono text-[9px] font-bold sm:block ${repo.color}`}>{repo.status}</span><span className="font-mono text-xs font-bold text-cobalt-600">{repo.score}</span></div>)}</div>
      </div>
    </div>
  );
}

export function HomePage() {
  const context = existingWorkflowContext();
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
          <div><p className="eyebrow inline-flex items-center gap-2"><span className="h-px w-7 bg-cobalt-500" /> Developer career evidence platform</p><h1 className="mt-6 max-w-[760px] text-balance text-[2.85rem] font-semibold leading-[.98] tracking-[-0.06em] text-ink sm:text-[4.25rem] lg:text-[4.7rem]">Your work already tells a story. <span className="text-cobalt-600">Make it count.</span></h1><p className="mt-7 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">DevPersonify turns your public GitHub work into clear career-profile evidence—showing what is easy to understand, what needs context, and what deserves attention.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><ButtonLink to="/audit" className="sm:min-w-[194px]">Analyze my GitHub</ButtonLink><a href="#outcomes" className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white">See what you’ll get</a></div><div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500">{["No account required", "Public data only", "Never modifies repositories"].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><CheckIcon className="h-3.5 w-3.5 text-cobalt-600" />{item}</span>)}</div></div>
          <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft sm:p-8"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-cobalt-600">One clear starting point</p><h2 className="mt-4 text-2xl font-semibold tracking-[-.035em]">See your GitHub as career evidence.</h2><div className="mt-7 space-y-5">{[["01", "Find the signal", "Separate original work, forks, active projects, and historical repositories."], ["02", "Understand the score", "Inspect observed values, points, unknowns, and classification reasons."], ["03", "Choose the next action", "Know which repository deserves visibility, context, cleanup, or review."]].map(([number, title, text]) => <div key={number} className="flex gap-4"><span className="font-mono text-xs font-bold text-cobalt-600">{number}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div></div>)}</div></aside>
        </div>
      </section>

      <section id="outcomes" className="bg-white py-20 sm:py-24"><div className="container-page"><SectionHeading eyebrow="What you’ll get" title="A practical view of your public developer evidence." description="Start with a real, read-only GitHub audit designed to help you decide what to present, improve, or review." /><div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 md:grid-cols-3">{[["01", "A portfolio health snapshot", "See originals, forks, activity, evidence coverage, and recommendation counts in one place."], ["02", "Repository-level recommendations", "Sort work into showcase, keep, cleanup, archive, fork review, and manual review categories."], ["03", "Reasons you can inspect", "Open any repository to see observed signals, point contributions, and unfetched evidence."]].map(([number, title, text]) => <article key={number} className="bg-white p-7 sm:p-8"><p className="font-mono text-xs font-semibold text-cobalt-600">{number}</p><h3 className="mt-8 text-xl font-semibold tracking-[-0.025em]">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>

      <section className="border-y border-slate-200 bg-[#f1f2ee] py-20 sm:py-24"><div className="container-page grid items-center gap-12 lg:grid-cols-[.7fr_1fr] lg:gap-16"><div><SectionHeading eyebrow="Example audit" title="From repository list to an actionable review." description="The audit makes public signals visible without pretending they tell the whole story. Example values are shown here only to demonstrate the interface." /><ButtonLink to="/audit" className="mt-7">Run a real audit</ButtonLink></div><AuditPreview /></div></section>

      <section id="how-it-works" className="bg-white py-20 sm:py-24"><div className="container-page"><SectionHeading eyebrow="How it works" title="Public data in. Explainable recommendations out." align="center" /><div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">{[["01", "Enter a profile", "Use a GitHub username or profile URL. No token or authentication is required."], ["02", "Review the evidence", "We fetch the public profile and paginated repository listing, then apply versioned rules."], ["03", "Inspect and decide", "Filter recommendations and open any repository to understand the contributing signals."]].map(([number, title, text]) => <article key={number} className="rounded-2xl border border-slate-200 p-6"><p className="font-mono text-xs font-bold text-cobalt-600">{number}</p><h3 className="mt-6 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>

      <section id="features" className="border-y border-slate-200 bg-[#f1f2ee] py-20 sm:py-24 lg:py-28"><div className="container-page"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><SectionHeading eyebrow="Capabilities" title="One evidence layer, useful across your career presence." /><p className="max-w-md text-sm leading-6 text-slate-600 lg:text-right">Start with public GitHub evidence, build a focused developer profile, then turn the same evidence into career-ready outputs.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <CapabilityCard icon={<SearchIcon className="h-5 w-5" />} label="GitHub Audit" title="Know what your public work communicates." description="Review repositories with transparent scoring, evidence traces, and non-destructive recommendations." cta="Start here" to="/audit" tone="audit" />
        <CapabilityCard icon={<GitBranchIcon className="h-5 w-5" />} label="GitHub Profile Preparation" title="Make your strongest work easier to find." description="Curate repositories, resolve cleanup decisions, and prepare a focused GitHub profile without changing your account." cta={context ? "Open GitHub profile" : "Start with audit"} to={preparationRoute} tone="profile" />
        <CapabilityCard icon={<LayersIcon className="h-5 w-5" />} label="Career Evidence Profile" title="Build one source of truth for your career evidence." description="Combine GitHub evidence, your resume, and information you provide into one structured profile with sources preserved." cta={context ? "Open career profile" : "Start with audit"} to={careerRoute} tone="career" />
        <CapabilityCard icon={<FileIcon className="h-5 w-5" />} label="GitHub Profile README" title="Turn your evidence into a profile people can understand." description="Create an editable GitHub Profile README from selected evidence, with safe preview, Markdown source, copy, and download." cta={context?.hasCareer ? "Build README" : "Start with audit"} to={readmeRoute} tone="readme" />
        <CapabilityCard icon={<FileIcon className="h-5 w-5" />} label="Resume Studio" title="Turn the same evidence into a professional resume." description="Build an editable one-column resume with LaTeX source and Word export, while keeping evidence and presentation edits separate." cta={context?.hasCareer ? "Open Resume Studio" : "Start with audit"} to={resumeRoute} tone="resume" />
        <CapabilityCard icon={<SparkIcon className="h-5 w-5" />} label="Product Feedback" title="Help shape what DevPersonify builds next." description="Tell us what worked, what needs work, or what you want next." cta="Send feedback" onAction={openFeedbackPanel} tone="feedback" />
      </div><div className="mt-6 grid gap-6 rounded-[28px] border border-emerald-200 bg-emerald-50/70 px-6 py-7 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-10"><div className="grid gap-5 sm:grid-cols-[96px_1fr] sm:items-center"><span className="hidden h-24 w-24 place-items-center rounded-full border border-emerald-200 bg-white/50 text-emerald-700 sm:grid"><MegaphoneIcon className="h-11 w-11" /></span><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-800">Help shape DevPersonify</p><h2 className="mt-3 max-w-lg text-balance text-2xl font-semibold tracking-[-.035em] text-ink sm:text-3xl">Your feedback becomes the next iteration.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">DevPersonify is being built around real developer workflows. Tell us what worked, what felt confusing, or what you want us to build next.</p></div></div><div className="flex flex-col gap-4 lg:justify-self-end lg:pl-4"><button type="button" onClick={openFeedbackPanel} className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-emerald-700">Send feedback →</button><ul className="max-w-md space-y-1.5 text-xs leading-4 text-slate-600">{["No account required.", "Your feedback does not include GitHub repositories, resume content, or generated career documents.", "Feedback is saved locally in this V1 launch experience."].map((item) => <li key={item} className="flex gap-2"><CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />{item}</li>)}</ul></div></div></div></section>

      <section className="bg-white py-20 sm:py-24"><div className="container-page grid gap-10 rounded-[32px] bg-cobalt-950 px-6 py-10 text-white sm:px-10 sm:py-12 lg:grid-cols-[1fr_.78fr] lg:items-center lg:px-14 lg:py-14"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-lime-300">Evidence before claims</p><h2 className="mt-4 max-w-xl text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Useful without a black box.</h2><p className="mt-5 max-w-xl text-base leading-7 text-white/70">Scores use published deterministic rules. They describe visible public repository evidence—not engineering ability, employability, or guaranteed outcomes.</p></div><div className="grid gap-3">{[[<ShieldIcon className="h-5 w-5" />, "Read-only by design", "No automatic archive, delete, edit, OAuth, or write access."], [<SearchIcon className="h-5 w-5" />, "Unknown is not absent", "Unfetched signals do not count as missing evidence."]].map(([icon, title, text]) => <div key={String(title)} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-lime-300 text-lime-900">{icon}</span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-white/60">{text}</p></div></div>)}</div></div></section>

      <section className="border-t border-slate-200 bg-paper py-20 sm:py-24"><div className="container-page text-center"><p className="eyebrow">Start with what is public</p><h2 className="mx-auto mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Make your GitHub easier to understand.</h2><p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600">No sign-up. No write access. Just a clear starting point for reviewing your public developer evidence.</p><ButtonLink to="/audit" className="mt-8">Analyze my GitHub</ButtonLink></div></section>
    </>
  );
}
