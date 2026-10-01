import { useState } from "react";
import type { FeedbackArea } from "./feedback";
import { tallyFeedbackUrl } from "./tally-feedback";

export function TallyFeedbackForm({ formId, area }: { formId: string; area: FeedbackArea }) {
  const [loadForm, setLoadForm] = useState(false);
  return <div className="mt-4">
    <p className="text-sm leading-6 text-slate-600">Share what helped you or suggest an improvement. Tally collects your response for the DevPersonify team. Please leave out resume content and other private career details.</p>
    <p className="mt-2 text-xs leading-5 text-slate-600">Opening the form connects to Tally. We include only the general app section, not your profile or repository details. See <a href="https://tally.so/help/terms-and-privacy" target="_blank" rel="noreferrer" className="underline">Tally’s privacy information</a>.</p>
    {loadForm ? <iframe
      title="DevPersonify feedback form"
      src={tallyFeedbackUrl(formId, area, true)}
      referrerPolicy="no-referrer"
      className="mt-4 h-[440px] w-full rounded-xl border border-slate-200 bg-white"
    /> : <button type="button" onClick={() => setLoadForm(true)} className="mt-4 min-h-11 w-full rounded-xl bg-cobalt-600 px-4 py-2 text-sm font-semibold text-white">Load feedback form</button>}
    <a href={tallyFeedbackUrl(formId, area)} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-cobalt-700 underline">Open feedback form in a new tab ↗</a>
    <p className="mt-1 text-xs leading-5 text-slate-600">Submit inside the form and wait for its confirmation. If it does not load here, use the new-tab link.</p>
  </div>;
}
