# DevPersonify V1 Launch Hardening Report

## Status

**PASS** — 2026-08-18

All launch-hardening P0 issues are resolved. Phase 6 and Phase 7 remain frozen in backlog.

## 1. LaTeX Copy Root Cause

The LaTeX source was correct, but the Resume Builder used a separate direct `navigator.clipboard.writeText` call. Browser permission policies, sandboxed preview frames, and restricted Clipboard API environments can reject that call even during a user gesture. The catch path only reset component state, providing neither a local fallback nor reliable failure lifecycle.

## 2. LaTeX Copy Fix

README and LaTeX now share `copyTextExactly` from `src/lib/browser-output.ts`:

1. Use `navigator.clipboard.writeText(source)` when available.
2. On unavailable/rejected access, create an offscreen plain textarea.
3. Assign the exact source through `.value`, focus, select, and copy during the same user gesture.
4. Remove the textarea and restore the previous focus and selection.
5. If both mechanisms fail, return an explicit failure.

The LaTeX button lifecycle is:

- Copy
- Copying…
- Copied
- Copy

or:

- Copy
- Copying…
- Copy failed
- Copy

Every state resets after a short delay. Unit and browser tests verify modern clipboard, unavailable API, rejected API, textarea fallback, total failure, cleanup, state reset, and byte-for-byte source equality.

## 3. README Copy Verification

Both the Career Profile README Builder and legacy Phase 3 Generate page use the same clipboard utility. They copy the exact generated Markdown source—not rendered HTML, reformatted Markdown, or a second representation.

Verified on desktop, 390px mobile, and 375px mobile:

- modern clipboard source equality;
- rejected Clipboard API fallback;
- exact fallback textarea value;
- visible Copied state;
- no temporary textarea remains;
- no network request;
- safe `escapeMarkdownContent` + `SafeMarkdownPreview` pipeline remains unchanged.

## 4. Download Verification

Browser output downloads share the local `downloadBlob`/`downloadTextFile` implementation:

- hidden anchor attached to the document;
- browser-local object URL;
- anchor clicked and removed;
- object URL revoked asynchronously;
- no API/server request.

Verified outputs:

- README: `{username}-github-profile-readme.md`, `text/markdown;charset=utf-8`, exact source bytes.
- LaTeX: `{username}-resume.tex`, exact `ResumeGenerationResult.source` bytes.
- Word: `{username}-resume.docx`, proper DOCX MIME and ZIP/OOXML structure.

## 5. Feedback Implementation

A compact persistent Feedback control is available across the application. It opens a route-contextual accessible panel with:

- Great / Useful / Needs work rating;
- optional message;
- Bug / Idea / Experience category;
- Send feedback;
- Escape and explicit close behavior;
- 44px-class touch target;
- viewport-contained mobile panel.

Contextual questions cover GitHub Audit, GitHub Preparation, Repository Detail, GitHub README, Career Evidence Profile, Resume Builder, and general pages.

## 6. Feedback Privacy Model

No safe launch submission endpoint exists, so V1 uses an explicitly labeled browser-local launch stub rather than inventing a backend.

The payload contains only:

- product identifier;
- application version;
- product area (not username/path);
- rating;
- category;
- optional user-written message;
- local timestamp/ID;
- local-stub delivery marker.

It never includes resume content, Career Evidence Profile data, repository data/descriptions, generated Markdown, generated LaTeX, DOCX content, username, or career history. Storage retains at most 20 local entries. Browser network tracking confirms feedback submission creates no external request.

## 7. DOCX Implementation and Architecture

A real browser-local Word export was added without a second resume editing model:

```text
CareerEvidenceProfile
  + LatexResumeConfiguration
        ↓
resolveResumeContent / presentation overrides
        ├── Structured Preview
        ├── LaTeX generator
        └── DOCX model + OOXML generator
```

The DOCX generator uses the same section enablement/order, item selections/order, summary, header, experience, project, skill, education, certification, achievement, open-source, and link presentation overrides as LaTeX.

Generated package parts include:

- `[Content_Types].xml`
- package relationships
- `word/document.xml`
- `word/styles.xml`
- document relationships/hyperlinks
- core/app properties

The one-column document uses conventional headings, editable paragraphs, clean margins, ATS-friendly reading order, and HTTP(S)-only hyperlinks. It is a real ZIP-based OOXML document, not renamed HTML/Markdown.

No PDF output was added.

## 8. DOCX Security Verification

- Career and user content is inserted only as XML-escaped text.
- HTML/script-like values remain plain text.
- HTTP/HTTPS links only become external hyperlink relationships.
- Unsafe protocols are omitted from hyperlink output.
- Unicode, accents, Indian names, C#, ampersands, percentages, pipes, underscores, and long text are preserved safely.
- Canonical evidence remains immutable.
- No executable content, raw HTML, external image, macro, embedded object, cloud API, or backend is used.
- Unit tests unzip and parse the OOXML.
- A generated document was independently opened with `python-docx`, confirming Word-compatible package structure and expected text.

## 9. 375px QA

All E2E scenarios run in a dedicated 375×812 Chromium project. Verified routes/workflows include:

- landing and `/audit` entry;
- successful audit;
- preparation/review/README;
- repository detail and current-set navigation;
- Career Evidence Profile;
- Career Profile README;
- LaTeX source/preview;
- DOCX control/download;
- feedback control/panel;
- workflow navigation;
- browser history and refresh.

Controls remain reachable, output buttons wrap without clipping, source panes contain their own horizontal scrolling, feedback fits the viewport, and document-level horizontal overflow remains absent.

## 10. 390px QA

The same suite runs with the iPhone 13/390px viewport. Verified:

- Copy, Download .md, Download .tex, and Download .docx;
- Preview/Source tabs;
- workflow navigation without numeric prefixes;
- feedback panel bounds and touch target;
- repository evidence readability;
- previous/next detail navigation;
- no console/page errors;
- no document horizontal overflow.

Visual artifacts:

- `docs/screenshots/v1-feedback-375.png`
- `docs/screenshots/v1-feedback-390.png`
- `docs/screenshots/phase-5-latex-resume-mobile.png`
- `docs/screenshots/phase-5-readme-regression-mobile.png`
- `docs/screenshots/phase-2-audit-detail-mobile.png`

## 11. Desktop QA

Desktop Chromium verifies the same complete workflows, including source equality, downloaded file inspection, DOCX OOXML contents, feedback privacy payload, state isolation, repository evidence tracing, browser back/forward, and persistent workflow navigation.

No console/page errors, write requests, career-data network requests, or external generation requests were observed.

## 12. Automated Test Results

Final commands:

- `npm run typecheck` — PASS
- `npm run lint` — PASS, zero warnings
- `npm run test` — **117/117 passed across 15 files**
- `npm run test:e2e` — **16 passed, 2 intentional duplicate mobile error-matrix skips**
- `npm run build` — PASS
- `npm audit` — **0 known vulnerabilities**

Production build remains static and Cloudflare Pages-compatible. The Phase 4 PDF input parser remains lazy; no PDF output/compiler exists.

## 13. Remaining P1/P2 Items

### P1

- Configure a privacy-reviewed feedback delivery endpoint later; local launch-stub feedback is intentionally not transmitted.
- Add automated accessibility scanning beyond semantic and keyboard E2E checks.
- Add stronger runtime migration validation before changing output configuration schemas.
- Add compile instructions tailored to pdfLaTeX versus XeLaTeX/LuaLaTeX.

### P2

- Add advanced DOCX styling only if user feedback identifies a concrete editing/compatibility need.
- Add additional resume templates only after validated demand.
- Consider versioned local profile/configuration import/export after privacy UX validation.
- Continue bundle-size reduction through route splitting without changing product behavior.

## Landing Page and Feedback UX Consolidation

The landing page now represents shipped V1 rather than a roadmap. The Capabilities section contains six available product capabilities: GitHub Audit, GitHub Profile Preparation, Career Evidence Profile, GitHub Profile README, Resume Studio (LaTeX + DOCX), and Product Feedback. No shipped capability is labeled planned/future, and the emphasized Audit card remains the primary starting point.

The supporting story now communicates: public GitHub evidence → focused developer profile → one canonical evidence layer → multiple editable career outputs. Contextual capability links reopen existing browser-local workflows when a prior username/profile is available and otherwise route to the required Audit entry without inventing generic routes.

Feedback is now discoverable through both a capability card and a dedicated high-visibility landing section. Both dispatch the existing feedback panel; no second form or state model was added. The floating Feedback control remains a subordinate convenience shortcut and is removed while the panel is open, preventing overlap. Landing privacy copy accurately states that V1 feedback is saved locally and excludes GitHub repositories, resume content, and generated documents.

Desktop, 390px, and 375px visual/browser QA confirms stacked readable cards, visible CTAs, viewport-contained feedback, accessible close/Escape behavior, usable footer/navigation, no clipped controls, no console errors, and no horizontal overflow.

## Privacy and Scope Freeze

Preserved:

- no AI;
- no authentication;
- no career-data backend/storage;
- no external resume/document service;
- no external PDF/LaTeX compiler;
- public read-only GitHub GET access;
- independent README and resume configurations;
- canonical Career Evidence Profile immutability;
- deterministic scoring and evidence traceability;
- unknown is not absent.

Phase 6 Job Match and Phase 7 Professional Presence Review remain in backlog and were not started.

## Overall Verdict

**PASS**

LaTeX Copy, LaTeX Download, README Copy/Download, browser-local DOCX, persistent privacy-preserving feedback, desktop QA, 390px QA, and 375px release-gate QA all pass. No P0 launch blockers remain.
