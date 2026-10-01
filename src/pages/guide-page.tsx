import { Link } from "react-router-dom";

const steps = [
  { title: "Start with your GitHub", you: "Enter your GitHub username or profile URL. No account, password, or access token is needed.", service: "Reads your public profile and repositories, then explains portfolio signals and recommendations.", next: "Review the reasons. A repository score describes public presentation, not your engineering ability." },
  { title: "Choose your projects", you: "Select Portfolio for the repositories you want to include, arrange them, and add your headline, focus, and contact details.", service: "Carries your selected projects and entered details into a career profile or a GitHub README draft.", next: "Selections are yours. If you change preparation later, use Update from GitHub preparation in your career profile." },
  { title: "Add and review your resume", you: "Use your original Word (.docx) resume, up to 5 MB. Prefer standard headings such as Experience, Education, Skills, and Projects. Older .doc files must be saved as .docx. PDF, TXT, and pasted text are fallbacks.", service: "Reads document text, paragraphs, lists, and table content into editable review items in this browser.", next: "Check each role, employer, date, skill, and description. Correct, remove, or accept each item. Complex layouts can merge or split entries; pending items stay out of downloads." },
  { title: "Build and use your outputs", you: "Add any missing context, select the evidence to include, and review the preview before downloading.", service: "Creates a GitHub README (.md), a Word resume (.docx), and LaTeX source (.tex). It also reviews imported or pasted LinkedIn sections against your saved profile and offers an action plan.", next: "Publish the README yourself. Edit or export Word to PDF in your document editor; compile .tex in a LaTeX editor. Check the final document before sharing it." },
];

export function GuidePage() {
  return <div className="container-page max-w-5xl py-12 sm:py-16">
    <p className="eyebrow">User guide</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight">What you provide. What you get.</h1>
    <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">DevPersonify helps developers and graduates organize their public projects and career information into drafts they can review and use. You choose the evidence and approve the details.</p>
    <section aria-labelledby="guide-before" className="mt-8 rounded-2xl border border-cobalt-100 bg-cobalt-50 p-5">
      <h2 id="guide-before" className="text-lg font-semibold">Before you start</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">Bring your GitHub username. A resume is optional for the GitHub audit and README; add it when you want to include employment or education. Graduates can use coursework, personal projects, internships, and contributions they can explain.</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">Have a saved profile already? <Link to="/restore" className="font-semibold text-cobalt-700 underline">Restore your backup</Link> to continue without a new GitHub request.</p>
    </section>
    <ol className="mt-8 space-y-5">
      {steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="text-xl font-semibold">{index + 1}. {step.title}</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2">
          <div><dt className="text-xs font-bold uppercase tracking-wide text-cobalt-700">You provide</dt><dd className="mt-2 text-sm leading-6 text-slate-600">{step.you}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-cobalt-700">DevPersonify provides</dt><dd className="mt-2 text-sm leading-6 text-slate-600">{step.service}</dd></div>
        </dl>
        <p className="mt-5 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-700"><strong>Your next action:</strong> {step.next}</p>
      </li>)}
    </ol>
    <section aria-labelledby="guide-limits" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 id="guide-limits" className="text-xl font-semibold">Know the limits</h2>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-slate-600">
        <li>GitHub access is public and read-only. Private work is unavailable, and repository code is not assessed for correctness.</li>
        <li>Resume extraction suggests structure. It does not verify employment, qualifications, achievements, or claims. Image-only PDFs need text supplied separately.</li>
        <li>LinkedIn review accepts a username or URL to open your profile, then accepts a locally parsed LinkedIn profile PDF or pasted text. Export using Resources → Save to PDF on LinkedIn. PDF import uses fixed English heading and column rules; check the detected sections before applying them. Languages, awards, and other unmapped text remain available for manual review. Use Quick paste or Guided sections for headline, About, experience, education, skills, endorsements, Featured, posts, certifications, and contact links. It checks wording and offers guidance; it cannot fetch a live profile, verify endorsements, assess photos, or publish changes. Imported and pasted review text is not saved or included in profile backups. PDF limits: 5 MB, 20 pages, 30,000 characters; selectable text only.</li>
        <li>Downloads use the information you select and provide. There is no automatic publishing, job application submission, ATS certification, or hiring-outcome guarantee.</li>
      </ul>
    </section>
    <section aria-labelledby="guide-saving" className="mt-8 rounded-2xl border border-lime-200 bg-lime-50 p-5 sm:p-7">
      <h2 id="guide-saving" className="text-xl font-semibold">Save your work</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">Progress saves in this browser only. There is no cloud account or device sync. Use Back up now after significant changes and before clearing browser data or changing devices. Local history keeps up to five recent versions while space allows.</p>
      <p className="mt-3 text-sm leading-6 text-slate-700">A profile backup includes private resume text and career evidence. It does not include version history or your README and resume presentation settings. Store it somewhere you trust.</p>
      <Link to="/privacy" className="mt-3 inline-block text-sm font-semibold text-cobalt-700 underline">Read how your data is handled</Link>
    </section>
    <div className="mt-8 flex flex-wrap items-center gap-5"><Link to="/audit" className="rounded-xl bg-cobalt-600 px-5 py-3 text-sm font-semibold text-white">Start with GitHub audit →</Link><Link to="/methodology" className="text-sm font-semibold text-cobalt-700 underline">How recommendations are calculated</Link></div>
  </div>;
}
