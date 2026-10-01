import { Link } from "react-router-dom";
import { ArrowRightIcon, ShieldIcon } from "../components/icons";

import { tallyFeedbackFormId } from "../features/feedback/tally-feedback";

interface InfoSection {
  title: string;
  body: string;
}

function InformationPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: InfoSection[] }) {
  return (
    <div className="bg-white py-16 sm:py-20">
      <div className="container-page grid gap-10 lg:grid-cols-[.4fr_.6fr] lg:gap-20">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h1>
          <p className="mt-5 text-base leading-7 text-slate-600">{intro}</p>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return <InformationPage eyebrow="Privacy" title="Your evidence stays yours." intro="DevPersonify works without an account or GitHub write access. Here is what happens to your information today." sections={[
    { title: "Public GitHub reads", body: "The audit requests public profile and repository metadata directly from GitHub. It never modifies, archives, or deletes repositories. GitHub receives your browser's request when you run an audit." },
    { title: "Saved in this browser", body: "Audit results, repository decisions, career profile fields, recent profile versions, backup download timestamps, your last workflow location, extracted resume text, and generated document settings are stored in this browser's local storage. They are not synced to another device. Anyone using the same browser profile may be able to see them, and clearing site data can erase them." },
    { title: "Your control", body: "Use the career profile's data controls to clear resume, GitHub, or all career data. Export a backup before clearing browser data or moving devices. Profile history keeps up to five recent versions, subject to storage space. Clearing a resume or GitHub evidence also removes saved history; clearing the career profile removes its history and backup status. Downloads contain the current profile, not its history." },
    { title: "Feedback", body: tallyFeedbackFormId() ? "The feedback form is hosted by Tally and loads only when you open Feedback. Tally receives your browser request, the general app section, and information you enter in its form. Submitted feedback is available to the DevPersonify team in Tally and may be copied to its private Google Sheet for review. No resume, profile, repository details, or previous local feedback drafts are automatically sent. Avoid putting private career details in your feedback." : "Feedback notes are stored only in this browser and are not delivered to the team. GitHub Issues are public and require a GitHub account." },
    { title: "No external resume processing", body: "PDF, DOCX, and text resumes are processed in your browser. DevPersonify does not send resume or manually entered professional content to an AI service, document service, or DevPersonify server." },
  ]} />;
}

export function MethodologyPage() {
  return <InformationPage eyebrow="Methodology" title="A score you can inspect." intro="Repository recommendations come from published deterministic rules, not hidden inference or assumptions about developer ability." sections={[
    { title: "Evidence, not judgment", body: "The repository score reviews public portfolio signals such as activity, originality, descriptions, documentation, topics, licensing, and completion. It is not a score of engineering skill or employability." },
    { title: "Unknown is not absent", body: "If a signal has not been fetched, it is marked unknown instead of being scored as missing. Confidence describes evidence coverage, not the probability that a recommendation is correct." },
    { title: "Every recommendation has reasons", body: "Each classification exposes the contributing signal, observed value, points, and explanation. You can override recommendations locally without erasing the computed result." },
    { title: "No destructive action", body: "Archive and cleanup are recommendations only. V1 never changes a GitHub repository automatically and does not request repository write permissions." },
  ]} />;
}

export function NotFoundPage() {
  return (
    <div className="container-page grid min-h-[65vh] place-items-center py-16 text-center">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cobalt-50 text-cobalt-600"><ShieldIcon className="h-6 w-6" /></span>
        <p className="eyebrow mt-6">404 · Route not found</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em]">This page is not part of the evidence map.</h1>
        <p className="mx-auto mt-4 max-w-md text-slate-600">Return to the product overview or begin with the GitHub audit entry.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold">Return home</Link>
          <Link to="/audit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white">Open audit <ArrowRightIcon className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  );
}
