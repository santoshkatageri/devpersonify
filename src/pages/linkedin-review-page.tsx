import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CareerEvidenceProfile } from "../domain/career-evidence-profile";
import { loadCareerProfile } from "../features/career-profile/career-profile-storage";
import { reviewLinkedInText, type LinkedInReviewItem } from "../features/linkedin-review/linkedin-review";

const guidance: Record<LinkedInReviewItem["kind"], string> = {
  headline: "Compare your role and focus. Different wording may be appropriate for LinkedIn.",
  summary: "Check that your About section conveys the same work and direction. It need not repeat your resume.",
  experience: "Check the role, employer, and dates manually. A title match alone does not verify experience.",
  skill: "If this skill is relevant to your target role, explain where you used it. Include only claims you can support.",
  project: "Consider featuring this project with your contribution, a result, and a link to the work.",
  link: "Check your Featured and Contact sections. A copied profile may omit the destination of a link.",
};

function LinkedInReviewWorkspace({ profile }: { profile: CareerEvidenceProfile }) {
  const [pastedText, setPastedText] = useState("");
  const [reviewedText, setReviewedText] = useState("");
  const findings = reviewedText ? reviewLinkedInText(profile, reviewedText) : [];
  const missing = findings.filter((item) => !item.found);

  return <div className="container-page max-w-4xl pb-24 pt-12">
    <p className="eyebrow">Manual professional presence review</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight">Review your LinkedIn profile</h1>
    <p className="mt-5 text-sm leading-7 text-slate-600">Paste the visible text from your own LinkedIn profile. This browser compares phrases with your DevPersonify career evidence. Your pasted text stays in this tab until you leave or clear it. It is never sent to LinkedIn or saved in your career profile.</p>
    <p className="mt-3 text-xs text-slate-600">A missing phrase is a prompt for your review. Paraphrases may not match, and matching text does not verify a claim.</p>
    <label className="mt-8 block text-sm font-semibold" htmlFor="linkedin-profile-text">Your LinkedIn profile text</label>
    <textarea id="linkedin-profile-text" value={pastedText} onChange={(event) => { setPastedText(event.target.value); setReviewedText(""); }} maxLength={30000} rows={12} className="mt-2 w-full rounded-xl border border-slate-300 p-4 text-sm" placeholder="Paste your headline, About, experience, skills, projects, and links here…" aria-describedby="linkedin-text-limit" />
    <p id="linkedin-text-limit" className="mt-1 text-xs text-slate-600">{pastedText.length.toLocaleString()} / 30,000 characters</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <button type="button" disabled={!pastedText.trim()} onClick={() => setReviewedText(pastedText)} className="min-h-11 rounded-xl bg-cobalt-600 px-5 py-2 text-sm font-semibold text-white disabled:bg-slate-300">Compare profiles</button>
      <button type="button" onClick={() => { setPastedText(""); setReviewedText(""); }} className="min-h-11 rounded-xl border px-5 py-2 text-sm font-semibold">Clear pasted text</button>
      <Link to={`/career/${encodeURIComponent(profile.username)}?step=preview`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-cobalt-700 underline">Back to career profile</Link>
    </div>
    <section className="mt-10" aria-live="polite">
      {reviewedText ? <>
        <h2 className="text-2xl font-semibold">Review results</h2>
        <p className="mt-2 text-sm text-slate-600">{findings.length - missing.length} of {findings.length} career evidence phrases found in your paste. Review the remaining {missing.length} manually.</p>
        {findings.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{findings.map((item) => <article key={`${item.kind}:${item.label}`} className="min-w-0 rounded-xl border bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">{item.kind}</p>
          <h3 className="mt-2 break-words text-sm font-semibold">{item.label}</h3>
          <p className={`mt-2 text-xs ${item.found ? "text-lime-800" : "text-amber-800"}`}>{item.found ? "Phrase found" : "Exact phrase not found — review wording or evidence"}</p>
          <p className="mt-3 text-xs leading-5 text-slate-600">{guidance[item.kind]}</p>
        </article>)}</div> : <p className="mt-5 text-sm text-slate-600">Add a headline, experience, skills, projects, or links to your career profile to compare them.</p>}
      </> : null}
    </section>
  </div>;
}

export function LinkedInReviewPage() {
  const { username = "" } = useParams();
  const profile = loadCareerProfile(username);
  if (!profile) return <div className="container-page py-20"><h1 className="text-3xl font-semibold">Create a career profile first.</h1><Link to="/audit" className="mt-5 inline-block text-cobalt-700 underline">Start with GitHub audit</Link></div>;
  return <LinkedInReviewWorkspace key={profile.username} profile={profile} />;
}
