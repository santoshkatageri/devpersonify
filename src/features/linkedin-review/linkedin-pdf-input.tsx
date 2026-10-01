import { useEffect, useRef, useState } from "react";
import { LINKEDIN_SECTIONS } from "./linkedin-sections";
import { parseLinkedInPdf, type LinkedInPdfImport } from "./linkedin-pdf";

export function LinkedInPdfInput({ onImport }: { onImport: (result: LinkedInPdfImport, mode: "paste" | "sections") => void }) {
  const [result, setResult] = useState<LinkedInPdfImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);
  async function read(file: File) {
    const request = ++sequence.current;
    setBusy(true); setError(""); setResult(null); setApplied(false);
    try { const imported = await parseLinkedInPdf(file); if (request === sequence.current) setResult(imported); }
    catch (failure) { if (request === sequence.current) setError(failure instanceof Error ? failure.message : "Unable to read this PDF. Try pasting your profile text."); }
    finally { if (request === sequence.current) setBusy(false); }
  }
  const supplied = result ? LINKEDIN_SECTIONS.filter((section) => result.sections[section.key].trim()) : [];
  return <div className="mt-4 rounded-2xl border border-cobalt-200 bg-white p-5">
    <h3 className="text-base font-semibold">Import your LinkedIn PDF</h3>
    <p id="linkedin-pdf-help" className="mt-2 text-sm leading-6 text-slate-600">On your LinkedIn profile, choose Resources → Save to PDF, then select the file here. We read selectable text locally and use fixed English heading rules to suggest sections. Check the placement before comparing.</p>
    <label htmlFor="linkedin-pdf" className="mt-4 block text-sm font-semibold">LinkedIn profile PDF</label>
    <input id="linkedin-pdf" type="file" accept=".pdf,application/pdf" aria-describedby="linkedin-pdf-help linkedin-pdf-limits" className="mt-2 block min-h-11 w-full min-w-0 rounded-lg border p-2 text-sm" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void read(file); }} />
    <p id="linkedin-pdf-limits" className="mt-2 text-xs leading-5 text-slate-600">Up to 5 MB, 20 pages, and 30,000 characters. Scans and password-protected files need pasted text. Photos, banners, and sections absent from the export cannot be assessed.</p>
    <p role="status" className="mt-2 text-sm text-cobalt-700">{busy ? "Reading PDF on your device…" : result ? `${result.pages} pages read · ${supplied.length} sections detected${applied ? " · Added to the editor below. Check and correct the text, then compare profiles." : " · Your existing draft has not changed."}` : ""}</p>
    {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error} Your existing draft has not changed.</p> : null}
    {result ? <div className="mt-3">
      <p className="text-xs leading-6 text-slate-600">Detected: {supplied.map((section) => section.short).join(", ") || "none — use extracted text and place sections manually"}. Other sections remain unknown.</p>
      <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Check extracted text and placement</summary><div className="mt-3 space-y-3">{supplied.map((section) => <details key={section.key} className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-semibold">{section.title}</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-6">{result.sections[section.key]}</pre></details>)}{result.unmapped ? <div className="rounded-lg border p-3"><h4 className="text-sm font-semibold">Unmapped text — kept for manual review</h4><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-6">{result.unmapped}</pre></div> : null}</div></details>
      <p className="mt-3 text-xs leading-5 text-slate-600">Choose a destination below. This replaces that editor’s current draft. Your saved career profile and backup are unchanged.</p>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={!supplied.length} className="min-h-11 rounded-lg bg-cobalt-600 px-4 text-sm font-semibold text-white disabled:bg-slate-500" onClick={() => { onImport(result, "sections"); setApplied(true); }}>Use detected sections</button><button type="button" className="min-h-11 rounded-lg border px-4 text-sm font-semibold" onClick={() => { onImport(result, "paste"); setApplied(true); }}>Use extracted text</button></div>
    </div> : null}
  </div>;
}
