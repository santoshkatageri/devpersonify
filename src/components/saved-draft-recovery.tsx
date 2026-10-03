import { useState } from "react";
import type { SavedDraft } from "../lib/saved-draft";
import { downloadTextFile } from "../lib/browser-output";
export function SavedDraftRecovery({ draft, name, onReset }: { draft: SavedDraft<unknown>; name: string; onReset: () => boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  if (draft.status !== "invalid" && draft.status !== "unsupported") return null;
  return <section role="region" aria-label="Saved draft recovery" className="container-page mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
    <h2 className="font-semibold">Your saved {name} draft needs attention</h2>
    <p className="mt-2 text-sm leading-6">{draft.status === "unsupported" ? "This draft uses a different format version." : "Some saved settings could not be read safely."} The original is preserved. You can try a temporary draft below; edits will not replace the saved version.</p>
    <p className="mt-2 text-xs leading-5">Download the original before starting fresh. It may contain private career text. Your career profile is separate and will stay unchanged.</p>
    <div className="mt-3 flex flex-wrap gap-3"><button className="min-h-11 rounded-lg border border-amber-400 bg-white px-4 text-sm font-semibold" onClick={() => { try { downloadTextFile(draft.raw, `${name.toLowerCase()}-draft-recovery.json`, "application/json"); setMessage("Original draft download started. Check your downloads and keep the file private."); } catch { setMessage("Download failed. Your original draft is still preserved."); } }}>Download original draft</button><button className="min-h-11 rounded-lg border border-amber-400 bg-white px-4 text-sm font-semibold" onClick={() => setConfirming(true)}>Start fresh</button></div>
    {confirming ? <div className="mt-3"><p className="text-sm">Replace the saved {name} settings with defaults from your career profile? Temporary edits will also be reset.</p><div className="mt-2 flex gap-3"><button className="min-h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-white" onClick={() => { if (!onReset()) setMessage("The saved draft could not be replaced. Try again when browser storage is available."); }}>Replace saved draft</button><button className="min-h-11 rounded-lg border px-4 text-sm" onClick={() => setConfirming(false)}>Cancel</button></div></div> : null}
    <p role="status" className="mt-2 text-sm">{message}</p>
  </section>;
}
