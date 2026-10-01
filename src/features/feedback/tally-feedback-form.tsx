import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "../../components/icons";
import type { FeedbackArea } from "./feedback";
import { tallyFeedbackUrl } from "./tally-feedback";

export function TallyFeedbackForm({ formId, area, onClose }: { formId: string; area: FeedbackArea; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return <dialog
    ref={dialogRef}
    aria-labelledby="feedback-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    className={`fixed inset-0 m-auto h-[100dvh] max-h-none w-full max-w-none flex-col overflow-hidden border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-slate-950/50 open:flex ${expanded ? "" : "sm:h-[90dvh] sm:max-h-[1000px] sm:w-[min(760px,calc(100vw-3rem))] sm:rounded-2xl"}`}
  >
    <header className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="feedback-title" className="text-lg font-semibold sm:text-xl">Help shape DevPersonify</h2>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setExpanded(!expanded)} aria-pressed={expanded} className="hidden min-h-11 rounded-lg border px-3 text-xs font-semibold sm:block">{expanded ? "Restore size" : "Expand"}</button>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-lg border" aria-label="Close feedback"><CloseIcon className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 text-xs text-slate-600">
        <span>Collected via Tally. <a href="/privacy" target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center underline">Privacy</a></span>
        <a href={tallyFeedbackUrl(formId, area)} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center font-semibold text-cobalt-700 underline">Open in new tab ↗</a>
      </div>
    </header>
    {!loaded ? <p role="status" className="shrink-0 px-6 py-2 text-sm text-slate-600">Loading form… If it stays blank, use “Open in new tab”.</p> : null}
    {ready ? <iframe
      title="DevPersonify feedback form"
      src={tallyFeedbackUrl(formId, area, true)}
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      className="min-h-0 w-full flex-1 border-0 bg-white"
    /> : null}
  </dialog>;
}
