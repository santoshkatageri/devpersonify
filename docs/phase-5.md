# Phase 5 — Evidence-backed LaTeX Resume Builder

## Status

**PASSED** — 2026-08-18

All Phase 5 P0 quality-gate requirements are satisfied. Phase 6 has not been started.

## Product Goal

Turn the canonical `CareerEvidenceProfile` into a professional, editable, deterministic LaTeX resume while preserving evidence provenance and user control.

The implemented flow is:

```text
Career Evidence Profile → Select → Configure → Review → Generate
```

DevPersonify does not write impressive-sounding claims. It selects and formats evidence the user can inspect, edit for presentation, reset, and export.

## Architecture

- Added the contextual route `/career/:username/resume`.
- Added “Build LaTeX Resume” to the Career Evidence Profile.
- The builder loads the versioned browser-local canonical profile and performs no GitHub or external resume request.
- `LatexResumeConfiguration` is a separate, versioned presentation model. It stores selection, order, section configuration, and user-authored presentation overrides without mutating canonical evidence.
- Pure resolver and generator functions transform `CareerEvidenceProfile + LatexResumeConfiguration` into a deterministic source document.
- Generated source contains no timestamps, random IDs, network data, AI result, or hidden transformation.
- The application remains a static Cloudflare Pages deployment.

## Canonical Profile Integration

The builder consumes only accepted Phase 4 evidence:

- GitHub-observed selected repositories and profile links;
- accepted resume-provided experience, education, skills, projects, certifications, achievements, and links;
- explicit user-provided identity and career context;
- already-derived repository support references.

Selection cards expose provenance as GitHub, Resume, You, or combinations such as Resume + GitHub. Provenance is an editing aid and is not injected into the final resume.

No company, title, achievement, metric, technology, responsibility, year of experience, certification, project, award, or career claim is generated if it is absent from canonical evidence.

## Template

Phase 5 intentionally provides one template:

- **ID:** `devpersonify-classic`
- **Version:** `1.0`
- **Layout:** one column
- **Document class:** 10pt `article`, letter paper
- **Characteristics:** ATS-friendly hierarchy, compact margins, conventional section titles, readable source, clickable HTTP(S) links, no decorative graphics, no tables or multi-column reading-order risk.

The template uses `geometry`, `iftex`, `fontenc`/`inputenc` or `fontspec`, `lmodern`, `xcolor`, `hyperref`, `enumitem`, `titlesec`, and `parskip`. Reusable macros keep the exported source editable. The template ID/version boundary permits future templates without adding them prematurely.

## Section Configuration

Configurable sections are:

- Header
- Summary
- Experience
- Skills
- Selected Projects
- Education
- Certifications
- Achievements
- Open Source
- Links

Every section can be enabled or disabled. Up/down buttons support keyboard-accessible reordering without drag-only interaction. Empty enabled sections are omitted automatically and reported in the generation result.

The selected section order is also the emitted LaTeX order and structured-preview order.

## Content Selection

Users can independently select:

- experience records;
- canonical and GitHub projects;
- skills;
- education;
- certifications;
- achievements;
- professional links, website, LinkedIn, email, and GitHub profile.

Selected items have accessible up/down controls. The selection array determines output order; canonical profile arrays remain unchanged. Empty content groups clearly explain that their resume section will be omitted.

## Resume Presentation Overrides

Resume-specific edits are stored in `ResumePresentationOverride` with source `USER_PROVIDED`.

Supported practical edits include:

- summary;
- header name/headline/location;
- experience title, organization, description/bullets, and technology presentation;
- project title and description;
- skill display names;
- skill-group label;
- achievement and link presentation through the generator model.

The UI labels edits as “Resume presentation · You,” exposes “Reset to source,” and never writes the edited wording back to GitHub, resume evidence, or canonical profile records. Unit tests verify canonical source values remain unchanged after overrides and content reordering.

## LaTeX Generation

`generateLatexResume(profile, config)` is a pure deterministic generator.

It emits:

- document class and packages;
- ATS-oriented page geometry and typography;
- safe hyperlink configuration;
- section formatting;
- header/contact block;
- enabled non-empty sections in configured order;
- selected content in configured order;
- readable helper macros;
- an explicit document end.

The same profile and configuration produce byte-identical source. Empty and minimal profiles still produce syntactically structured documents without invented filler. Long descriptions are handled as escaped text.

## Escaping and URL Safety

Escaping occurs at content boundaries before insertion into template syntax. The generator does not escape the complete assembled document.

Covered LaTeX-sensitive characters:

- `&`, `%`, `$`, `#`, `_`
- `{`, `}`
- `~`, `^`, `\`
- `<`, `>`, `|`

Additional behavior:

- en dash becomes `--`;
- em dash becomes `---`;
- bullet becomes `\textbullet{}`;
- Unicode and accented text are preserved;
- apostrophes and quotation marks are preserved;
- C# and repository underscores are escaped safely;
- malicious LaTeX commands have their backslash/braces neutralized;
- HTML/script-like input is emitted only as inert escaped text.

Only HTTP and HTTPS links are accepted. Query parameters and fragments are escaped for LaTeX hyperlink arguments. `javascript:`, `data:`, `vbscript:`, malformed, and empty URLs are omitted with informational warnings. Unsafe URLs never become `\href` commands.

## Preview

The Generate step has two tabs:

- **Preview** — a structured, one-column resume preview rendered as safe React elements;
- **LaTeX source** — the exact downloadable `.tex` source.

The preview follows configured section order, selection, and presentation overrides. It does not use `dangerouslySetInnerHTML`, execute source, or pretend to be a compiled PDF.

Actual browser-side LaTeX compilation was evaluated and intentionally not implemented. A TeX engine/format/font bundle would add substantial bundle and runtime complexity for limited V1 value. The UI instead says: “Download and compile locally or with your preferred LaTeX environment.” No backend or external compilation service was introduced.

## Copy and Download

- Copy writes the exact generated source to the clipboard.
- Download creates a browser-local `application/x-tex` blob and saves `{username}-resume.tex`.
- Both actions consume the same `ResumeGenerationResult.source` string.
- Desktop and mobile browser tests read clipboard and downloaded bytes and assert exact source equality.

## Persistence

Versioned browser-local persistence stores:

- template ID/version;
- section enablement and order;
- selected item IDs and content order;
- summary/header/item presentation overrides;
- skill-group presentation;
- configuration update time.

Storage key: `devpersonify:latex-resume:v1:{username}`.

Loading validates the schema version and username, reconciles removed canonical items, preserves known selections, adds newly introduced section definitions safely, and enforces the single current template boundary. Refresh persistence is verified in browser E2E.

## Privacy

- Resume and career-profile content remain browser-local.
- The builder performs no external request and does not refetch GitHub.
- No content is sent to an AI service, resume API, server, database, analytics endpoint, or LaTeX compilation service.
- No backend, account, authentication, token, paid service, or external storage was introduced.
- Phase 4 browser network tracking continues through the Phase 5 builder and verifies zero external resume requests.

## Security

- User/evidence content is never executed.
- Structured preview uses React text nodes and safe HTTP(S) anchors.
- No `dangerouslySetInnerHTML` is used.
- LaTeX control characters are escaped per content field.
- User-supplied `\end{document}`, `\input`, HTML/script, malformed Markdown-like text, and unexpected Unicode remain inert downloadable text.
- Unsafe URL protocols are rejected.
- Generated LaTeX is displayed/downloaded text; DevPersonify does not execute or compile it.
- Dependency audit reports zero known vulnerabilities.
- Existing GitHub behavior remains public GET-only with no mutation permissions.

## Testing

Final automated coverage includes:

- deterministic generation;
- empty, minimal, and complete profiles;
- section enable/disable and ordering;
- content selection and ordering;
- project, experience, skill, education, certification, achievement, and link selection;
- provenance display;
- resume-presentation override and reset;
- canonical evidence immutability;
- template identity/version;
- URL normalization, query parameters, fragments, malformed URLs, and unsafe protocols;
- all required LaTeX special characters;
- Unicode, accents, Indian names, apostrophes, quotations, en/em dash, and bullets;
- C#, underscores, company symbols, percentages, dollar signs, and braces;
- malicious HTML/LaTeX input;
- very long descriptions;
- readiness and informational evidence warnings;
- local configuration persistence and refresh persistence;
- structured desktop/mobile preview;
- clipboard/source equality;
- downloaded `.tex`/source equality;
- zero external resume requests;
- keyboard-accessible section and item ordering;
- source-view mobile overflow containment;
- browser console/page error collection.

Final verification:

- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run test` — 117/117 tests passed across 15 test files.
- `npm run test:e2e` — 16 browser tests passed; two duplicate mobile error-state matrices were intentionally skipped.
- `npm run build` — passed.
- `npm audit` — zero known vulnerabilities.
- Desktop and iPhone-sized QA passed with no application console/page errors or horizontal document overflow.

Visual QA artifacts:

- `docs/screenshots/phase-5-latex-resume-desktop.png`
- `docs/screenshots/phase-5-latex-resume-mobile.png`

## Performance

- Generation, selection, sorting, escaping, preview, copy, and download are synchronous browser-local operations.
- No API call or compiler startup is required.
- LaTeX source generation is linear in selected content size.
- The existing PDF resume-input parser remains lazy-loaded from Phase 4; Phase 5 adds no compilation engine or font distribution.
- Source is kept readable rather than minified.
- Production assets: application JavaScript approximately 481 kB / 144 kB gzip after launch hardening, landing correction, DOCX export, persistent feedback, routed evidence detail, contextual workflow navigation, and clipboard fallback support; no output adds a runtime compiler. The existing Phase 4 PDF parser remains a separate ~465 kB / 141 kB gzip lazy chunk with a local worker asset.

## Known Limitations

- V1 does not compile PDF in the browser or on a server.
- Users need a local LaTeX environment or preferred external environment after intentionally downloading the `.tex` file.
- The template is optimized for one-column resumes; extremely long content may span multiple pages and requires user curation.
- Non-Latin Unicode may require XeLaTeX/LuaLaTeX and an installed font with the required glyphs.
- Resume presentation editing is intentionally practical rather than a full document editor.
- Dates remain evidence-backed strings and are not reformatted into invented precision.
- One polished template is available; additional templates await validated demand.
- No provenance labels are printed in the final resume, although they remain visible in the builder.

## Phase 3 Regression

### Root cause

The Phase 3 implementation was not deleted: `/audit/:username/prepare`, its repository curation, section preferences, deterministic Markdown generator, safe React Markdown preview, copy/download behavior, and browser-local state still existed. The regression was architectural discoverability and source integration. Phase 4 made the Career Evidence Profile the canonical evidence layer, while Phase 5 exposed only “Build LaTeX Resume” from that profile. The README workflow remained connected to the audit/preparation route and had no Career Evidence Profile entry point, so it appeared replaced and could require returning through the audit-oriented flow.

### Affected functionality

- Career-profile users could not clearly choose between GitHub README and LaTeX resume outputs.
- The existing README capability was not reachable from the shared evidence profile.
- README and resume output-state isolation had not been explicitly regression-tested together.

### Fix

- Preserved the complete legacy Phase 3 preparation route and implementation.
- Added “Build GitHub Profile README” beside “Build LaTeX Resume” in the Career Evidence Profile.
- Added `/career/:username/readme`, which consumes the existing browser-local `CareerEvidenceProfile` directly and does not rebuild/refetch an audit.
- Reused the Phase 3 `escapeMarkdownContent` and `SafeMarkdownPreview` security/rendering behavior.
- Added a dedicated versioned `GithubReadmeConfiguration` at `devpersonify:github-readme:v1:{username}` for project selection/order, section visibility, and README presentation.
- Kept `LatexResumeConfiguration` at its separate resume key. Neither output imports, mutates, clears, or overwrites the other output’s configuration.
- Kept canonical GitHub/resume/user evidence immutable during output-specific presentation edits.
- Extended “Clear all career data” to clear both output configurations; output-specific clear actions remain isolated.

### Regression verification

Automated unit/integration/browser coverage now proves:

- both builders are reachable from one Career Evidence Profile;
- Markdown generation, safe rendered preview, source, copy, and `.md` download work after career-profile creation;
- LaTeX generation, structured preview, source, copy, and `.tex` download work when README configuration exists;
- README state survives resume selection, ordering, section, and presentation changes;
- resume state survives README selection, section, presentation, reset, and clear actions;
- clearing resume evidence does not clear README configuration;
- clearing README configuration does not clear resume configuration or canonical resume evidence;
- career-profile reconciliation does not wipe either output configuration;
- output presentation edits do not mutate canonical GitHub or resume evidence;
- refresh preserves both configurations;
- Markdown and LaTeX copy/download bytes exactly match their displayed sources;
- desktop/mobile preview, console, network, and horizontal-overflow checks pass;
- no AI, backend, external resume API, or external compilation service was introduced.

Visual regression artifacts:

- `docs/screenshots/phase-5-readme-regression-desktop.png`
- `docs/screenshots/phase-5-readme-regression-mobile.png`
- `docs/screenshots/phase-5-latex-resume-desktop.png`
- `docs/screenshots/phase-5-latex-resume-mobile.png`

**P0 Issues: None.**

## README Output Action Regression

The Career Evidence Profile README builder generated the correct Markdown, but Copy relied only on `navigator.clipboard.writeText`. Sandboxed previews, iframe permission policies, insecure contexts, and browsers with restricted Clipboard API access can reject that call even during a user gesture. The rejection was surfaced as “Copy failed,” but no local fallback existed. Download also needed the V1 filename and cross-browser object-URL lifecycle hardened.

The fix keeps `GithubReadmeConfiguration` and `devpersonify:github-readme:v1:{username}` fully isolated from LaTeX resume state:

- Copy first attempts `navigator.clipboard.writeText` with the exact `generateCareerGithubReadme(...)` source shown in the Markdown source tab.
- If unavailable or rejected, it creates an offscreen plain textarea, assigns the exact source through `.value`, selects it, calls the browser's synchronous `copy` command during the same user gesture, removes it, and restores focus/selection.
- The fallback uses no HTML injection, external service, network request, or server.
- No rendered HTML, reformatting, or post-generation escaping is copied.
- Successful modern or fallback copy displays “Copied.” “Copy failed” appears only when both local mechanisms are unavailable, with an accessible manual-source fallback announcement.
- Download creates a browser-local `Blob` with `text/markdown;charset=utf-8`.
- The hidden anchor is attached, clicked, removed, and its object URL is revoked asynchronously for cross-browser reliability.
- Filename is exactly `{username}-github-profile-readme.md`.
- The legacy Phase 3 Generate output uses the same filename and reliable browser action pattern.
- No network request, backend, external clipboard service, or external download service is involved.

Desktop and mobile E2E capture the Markdown source, compare clipboard text byte-for-byte, read the downloaded file byte-for-byte, assert the exact filename, and exercise the clipboard-failure state. **Copy exactness: PASS. Download exactness: PASS.**

## Workflow Navigation Regression

The application previously treated the global “Analyze my GitHub” action as a universal escape hatch. Although every workflow route and local state still existed, GitHub Preparation did not expose a coherent forward transition to Career Evidence Profile, and Career/Resume pages did not consistently expose contextual backward transitions. Users could be forced to revisit Audit simply to reach an already-established workflow.

The fix uses the existing route tree and versioned browser-local stores rather than adding another routing/state architecture:

- Added a compact functional workflow navigator: Audit → GitHub Profile → Career Profile → Resume.
- Removed numeric prefixes so it behaves as persistent product navigation rather than a numbered wizard.
- The current stage uses `aria-current="step"`; available stages are navigable, while Resume remains unavailable until career context exists.
- Made the global header action route-aware:
  - Audit → Analyze my GitHub (current username audit)
  - GitHub Preparation/README → GitHub Audit
  - Career Profile → GitHub Preparation
  - LaTeX Resume → Career Profile
- Added “Build career profile →” directly to GitHub Profile Preparation.
- Added explicit Career Profile links back to GitHub Preparation and GitHub Audit.
- Added “Back to career profile” to LaTeX Resume.
- Preserved both GitHub README routes/configuration and LaTeX Resume routes/configuration.
- Preserved username, audit cache, preparation decisions, portfolio selections, canonical career data, README configuration, and resume configuration across transitions.
- Continued using cached GitHub audit data; no transition introduces an unnecessary refetch.
- Career Profile preview state is URL-addressable so repository-detail and resume returns restore the expected context.

Browser regression journeys now cover Audit → Preparation, Preparation → Career, Career → Preparation, Career → Audit, Career → Resume, Resume → Career, Preparation → README generation, the complete forward/backward chain, route refresh, browser back/forward, state persistence, repository detail navigation, context-aware header links, desktop/mobile workflow navigation, console checks, and horizontal-overflow checks.

**P0 Issues: None.**

## Repository Detail Regression

The earlier Phase 2 evidence detail had remained as route-local modal state while newer workflows introduced route transitions and independent output pages. That modal could not survive refresh, browser history, or preserve list-view state, and it was not consistently reachable from preparation, career-profile, README, and resume contexts.

The existing evidence presentation was restored as the originally reserved route `/audit/:username/repositories/:owner/:repo` rather than creating another scoring implementation. The route consumes the exact `RepositoryScore`, `ScoreReason[]`, `unknownSignals`, normalized repository metadata, and lazy README enrichment produced by the existing audit engine.

Verified behavior now includes:

- breadcrumb and context-aware back navigation;
- URL-preserved search, classification filter, and sort state;
- previous/next navigation over the current filtered/sorted set only;
- position indicator and disabled first/last boundaries;
- left/right keyboard navigation with form-control safeguards;
- refresh and browser back/forward behavior;
- computed classification beside persistent user decision;
- local Keep/Showcase/Archive/Review decisions that update the shared preparation state;
- complete signal name, observed value, points, and explanation trace;
- explicit observed, absent, and unknown/not-fetched states;
- on-demand README state persisted back to the audit cache;
- relevant public metadata and safe GitHub link;
- graceful removed/renamed repository state;
- entry and return paths for Audit, GitHub preparation, Career Evidence Profile, GitHub README, and LaTeX Resume;
- desktop/mobile layout, console, read-only network method, and horizontal-overflow regression coverage.

No scoring or explanation rule was duplicated or changed. **P0 Issues: None.**

## P0

None open.

## P1

- Add an optional compile-instructions panel tailored to pdfLaTeX vs XeLaTeX/LuaLaTeX.
- Add stronger runtime migration validation before changing the resume-configuration schema.
- Add automated accessibility scanning in addition to browser semantic checks.
- Evaluate print-specific structured-preview styles without implying PDF equivalence.

## P2

- Add another template only after real demand demonstrates a distinct use case.
- Consider optional local compilation only if bundle size, privacy, performance, and maintenance costs materially improve.
- Consider import/export of resume configuration with the canonical profile after privacy UX validation.

## Overall Verdict

**PASS**

The canonical profile now exposes two independently configured outputs: the restored GitHub Profile README workflow and the versioned LaTeX Resume workflow. Markdown and LaTeX selection, presentation, source/preview, exact copy/download, persistence, state isolation, privacy, responsive UX, and security requirements pass. No P0 issues remain.

Phase 6 has not been started.
