import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { CloseIcon } from "../../components/icons";
import { createFeedbackPayload, feedbackAreaFromPath, feedbackQuestion, OPEN_FEEDBACK_EVENT, saveFeedbackLocally, type FeedbackCategory, type FeedbackRating } from "./feedback";

const ratings: Array<[FeedbackRating, string]> = [["great", "Great"], ["useful", "Useful"], ["needs_work", "Needs work"]];
const categories: Array<[FeedbackCategory, string]> = [["bug", "Bug"], ["idea", "Idea"], ["experience", "Experience"]];

export function FeedbackControl() {
  const location = useLocation();
  const area = feedbackAreaFromPath(location.pathname);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>("experience");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOpen = () => { setStatus("idle"); setOpen(true); };
    window.addEventListener(OPEN_FEEDBACK_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, handleOpen);
  }, []);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

  function submit() {
    if (!rating) return;
    const saved = saveFeedbackLocally(createFeedbackPayload(area, rating, category, message));
    setStatus(saved ? "saved" : "failed");
    if (saved) { setRating(null); setCategory("experience"); setMessage(""); }
  }

  return <>{!open ? <button type="button" onClick={() => { setOpen(true); setStatus("idle"); }} className="fixed bottom-4 right-4 z-40 min-h-11 rounded-full border border-slate-300 bg-white/95 px-4 py-2 text-xs font-semibold text-slate-700 shadow-soft transition hover:border-cobalt-400 hover:text-ink" aria-haspopup="dialog" aria-expanded="false">Feedback</button> : null}{open ? <section role="dialog" aria-modal="false" aria-labelledby="feedback-title" className="fixed bottom-20 right-4 z-[70] max-h-[calc(100vh-6rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[9px] font-bold uppercase tracking-[.16em] text-cobalt-600">Private by design</p><h2 id="feedback-title" className="mt-2 text-xl font-semibold">Help shape DevPersonify</h2></div><button ref={closeRef} type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border" aria-label="Close feedback"><CloseIcon className="h-4 w-4" /></button></div><p className="mt-4 text-sm leading-6 text-slate-600">{feedbackQuestion(area)}</p><fieldset className="mt-5"><legend className="text-xs font-semibold">How was this experience?</legend><div className="mt-2 grid grid-cols-3 gap-2">{ratings.map(([value, label]) => <button key={value} type="button" onClick={() => setRating(value)} aria-pressed={rating === value} className={`min-h-10 rounded-lg border px-2 text-xs font-semibold ${rating === value ? "border-ink bg-ink text-white" : "bg-white"}`}>{label}</button>)}</div></fieldset><label className="mt-5 block"><span className="text-xs font-semibold">What should we improve? <span className="font-normal text-slate-400">Optional</span></span><textarea value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Share a bug, idea, or experience…" /></label><fieldset className="mt-4"><legend className="text-xs font-semibold">Feedback type</legend><div className="mt-2 flex flex-wrap gap-2">{categories.map(([value, label]) => <button key={value} type="button" onClick={() => setCategory(value)} aria-pressed={category === value} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold ${category === value ? "border-cobalt-600 bg-cobalt-50 text-cobalt-700" : "bg-white"}`}>{label}</button>)}</div></fieldset><button type="button" disabled={!rating} onClick={submit} className="mt-5 min-h-11 w-full rounded-xl bg-cobalt-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Send feedback</button><div aria-live="polite" className="mt-3 text-xs leading-5">{status === "saved" ? <p className="text-lime-800">Saved locally. Thank you. Launch submission delivery is not configured yet.</p> : status === "failed" ? <p className="text-red-700">Could not save feedback in this browser.</p> : <p className="text-slate-400">No account required. Only this rating, category, product area, and message are stored—never career data.</p>}</div></section> : null}</>;
}
