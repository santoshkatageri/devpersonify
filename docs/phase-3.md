# Phase 3 — GitHub Profile + Portfolio Preparation

## Status

**PASSED** — 2026-08-18

All P0 quality-gate requirements are satisfied. Phase 4 has not been started.

## Product Goal

Turn a successful public GitHub audit into an actionable, developer-controlled workflow:

```text
Audit → Review → Curate → Prepare → Generate
```

The workflow helps a developer understand recommendations, record their own decisions, curate representative portfolio evidence, add context GitHub cannot observe, and generate a profile README without AI or GitHub write access.

## Completed

- Added `/audit/:username/prepare` as the contextual preparation workspace.
- Added a “Prepare my GitHub” action to successful audit dashboards.
- Added guided Review, Curate, Prepare, and Generate steps.
- Built a repository decision workspace that keeps computed classification, score, reason, and important signals visible.
- Added independent user decisions: `KEEP`, `SHOWCASE`, `ARCHIVE`, and `REVIEW`.
- Added portfolio, showcase, and manual-review flags per repository.
- Preserved computed recommendations when a user overrides them.
- Added classification filters, search, score/activity/stars/name/classification sorting, quick decisions, row selection, and bulk decisions.
- Kept progressive 100-item rendering for large profiles.
- Added conservative deterministic project-category relevance inference for frontend, backend, cloud/infrastructure, systems, data/ML, open-source, and general work.
- Added a diverse shortlist algorithm that seeks category breadth before filling remaining positions by evidence score and recency.
- Kept suggestions optional; they never automatically become the user's portfolio.
- Added the “My GitHub portfolio” workspace with add/remove, manual showcase choice, ordering, replacement through suggestions/manual review, GitHub links, selection reasons, and readiness status.
- Added deterministic portfolio-readiness evidence for descriptions, README, license, demo/homepage, topics, screenshots, recent activity, and originality.
- Added `READY`, `NEEDS WORK`, and `REVIEW` readiness states without false claims about missing characteristics.
- Added conservative fork assessment: `POTENTIALLY_MEANINGFUL`, `LIKELY_LOW_VALUE`, or `MANUAL_REVIEW`.
- Added explicit copy that fork status alone does not determine portfolio value or contribution depth.
- Enhanced repository detail with possible portfolio relevance, readiness, current saved decision, and related public-evidence improvements.
- Added optional user profile fields for headline, focus, target roles, introduction, location, website, LinkedIn, email, additional skills, and preferred technologies.
- Visually separated “Observed from GitHub” from “Provided by you.”
- Added transparent profile completeness across eight optional context fields.
- Added deterministic profile README generation from only observed GitHub evidence and explicit user input.
- Added section controls for Introduction, What I build, Selected projects, Technologies, Open source, and Contact/links.
- Added safe Markdown escaping, preview, source view, copy, and `.md` download.
- Added browser-local persistence for repository decisions, flags, portfolio order, profile input, and README preferences.
- Updated route and project documentation.

## Verified

- `npm run typecheck` passes.
- `npm run lint` passes with zero warnings.
- `npm run test` passes: 37/37 tests across 6 test files, including README Markdown rendering and security coverage.
- `npm run test:e2e` passes across desktop and mobile Chromium; one duplicate mobile error-state matrix is intentionally skipped.
- `npm run build` passes.
- `npm audit` reports 0 vulnerabilities.
- Production output remains static and Cloudflare Pages compatible.
- No horizontal overflow was detected in desktop or iPhone 13-sized browser checks.
- Browser tests collect application console errors and uncaught page errors; none occurred.
- Decision persistence was verified after a full page reload.
- Profile fields and README preferences were verified after local serialization/restoration.
- Generated Markdown is deterministic for identical inputs.
- The live Vite preview remains running on port 5173.

## Test Profiles

| Profile | Purpose | Observed repositories | Phase 3 verification |
|---|---|---:|---|
| Large fork-heavy fixture | Primary stress profile | 245 | Workspace load, 100-item progressive rendering, sorting, decision persistence, fork classification review, bounded API behavior |
| Small public fixture | Small-account behavior | 8 | Workspace load, decision controls, shortlist behavior, zero application errors |
| Open-source fixture | Archived repositories and strong public evidence | 12 | Workspace load, archived/showcase mix, bounded enrichment, zero application errors |
| Automated `demo` fixture | Complete deterministic browser workflow | 6 | Individual and bulk decisions, portfolio selection, diverse suggestions, profile input, README source, refresh persistence, desktop/mobile |
| Automated `empty` fixture | Empty/minimal profile | 0 | Audit empty state and zero-repository preparation workspace |

Real-profile QA observed 5, 3, and 9 GitHub GET requests respectively, with zero write requests.

## Repository Decision Behavior

- Computed recommendations remain owned by the scoring engine and are never mutated by a user decision.
- User decisions are stored in a separate `RepositoryPreference` keyed by canonical repository ID.
- A computed `ARCHIVE` can coexist with user decision `KEEP`.
- `SHOWCASE` decisions also select the repository for portfolio/showcase locally; removing showcase does not silently remove a separately chosen portfolio project.
- `REVIEW` marks the item for manual review; manual review can also be toggled independently.
- Quick actions work in desktop tables and mobile cards.
- Bulk actions apply only to explicitly selected visible repositories.
- Search, filters, sort order, and decisions do not trigger GitHub requests.
- All actions are local planning actions; no GitHub operation is performed.

## Fork Handling

- Forks remain computed as `FORK_REVIEW`; no fork is automatically treated as bad or automatically recommended for GitHub archiving.
- `POTENTIALLY_MEANINGFUL` requires several public signals such as useful description, topics, engagement, and recent public activity.
- `LIKELY_LOW_VALUE` requires several limited-context signals such as no detected description/topics/engagement and old activity.
- Mixed or insufficient evidence becomes `MANUAL_REVIEW`.
- The UI explicitly says that fork status and metadata cannot establish contribution depth.
- On the primary profile, the full 213-fork set produced 192 likely-low-value planning signals and 21 manual-review results; none met the conservative potentially-meaningful threshold in the available listing metadata.
- These labels are review aids, not GitHub archive commands. The rules are generic and were not special-cased for the primary profile.

## Portfolio Selection

- Portfolio projects are selected manually or added from an optional diverse shortlist.
- The shortlist does not simply take the six highest scores; it first seeks new conservatively inferred relevance categories.
- Language alone does not claim framework expertise. Categories rely on explicit names, descriptions, and topics, and copy says “appears relevant.”
- Forks enter suggestions only when their assessment is potentially meaningful.
- Users can add, remove, mark/unmark showcase, reorder up/down, and replace suggestions with any reviewed repository.
- The selected order drives README project order.
- Selection reasons distinguish user decisions from metadata-based relevance suggestions.

## Portfolio Readiness

- Every selected project receives a checklist with observed evidence.
- `observed` means a public signal was actually available.
- `not_detected` means the relevant public metadata did not expose the signal; it does not claim the characteristic is absent.
- `unknown` means it was not fetched or could not be determined.
- Screenshots remain unknown because README contents are not inspected.
- README remains unknown unless a bounded or on-demand public check was performed.
- Forks and unknown README evidence bias readiness toward `REVIEW` rather than a false negative.
- No opaque numeric readiness score was added; the actionable states are `READY`, `NEEDS WORK`, and `REVIEW`.

## README Generation

- Markdown uses only observed GitHub identity/bio/location/website, explicitly selected repositories, observed languages in selected repositories, and user-provided fields.
- Generated content never invents companies, job history, years of experience, achievements, metrics, certifications, technologies, or projects.
- Observed technologies are labeled “Observed in selected GitHub repositories.”
- Explicit additions are labeled “Provided by me.”
- Fork-based open-source entries state that contribution context requires manual review.
- User-controlled section toggles are persisted.
- Untrusted content is escaped before document assembly; generated Markdown syntax is not escaped afterward.
- HTML-sensitive characters are encoded, while ordinary pipes, repository-name underscores, and safe URL syntax remain readable.
- Bold project links use valid `**[name](url)**` Markdown.
- The preview uses a constrained safe Markdown parser that renders headings, bold text, HTTP(S) links, paragraphs, and bullet lists as React elements without `dangerouslySetInnerHTML`.
- Unsupported or unsafe link protocols remain inert text, and encoded script/HTML input renders only as text.
- URLs are accepted only when they normalize to HTTP(S); email is format checked before output.
- Preview, clipboard copy, and `.md` download consume the same generated source; browser tests verify byte-for-byte copy/download equality.

## Persistence

- Persistence uses versioned browser `localStorage` only.
- Key format: `devpersonify:preparation:v1:{username}`.
- Persisted data includes decisions, portfolio/showcase/manual-review flags, portfolio order, user profile input, and README section preferences.
- State restoration merges current defaults and rejects unknown versions/usernames.
- Storage failure leaves the workspace usable and displays “Local save unavailable.”
- Automated browser QA verifies refresh persistence for decisions and profile input.
- No account, database, backend, or cross-device sync was introduced.

## Security

- GitHub requests remain public GET requests only.
- No GitHub OAuth, token, secret, write scope, or mutation endpoint exists.
- No delete, archive, edit, or repository-change control exists.
- “Archive” is explicitly a local user decision, not an API action.
- No AI, RAG, vector database, paid API, database, authentication, LinkedIn scraping, resume generation, or job matching was added.
- User content is rendered through React text nodes.
- Untrusted content is HTML-encoded and selectively Markdown-escaped before assembly; preview rendering creates safe React elements and never injects HTML.
- External links use safe new-tab relationship attributes.
- Dependency audit reports zero known vulnerabilities.

## Performance

- Phase 3 reuses the Phase 2 cached audit and normally performs no new listing requests when entered from a completed audit.
- Search, filtering, sorting, decisions, portfolio curation, and README generation are browser-local.
- The large-profile workspace renders 100 repositories at a time and offers explicit 100-item expansion.
- Diversity, readiness, and README rules are synchronous deterministic functions over normalized local data.
- API fan-out remains bounded to Phase 2 behavior; real-profile Phase 3 QA observed no write requests.
- Production JavaScript is approximately 343 kB uncompressed / 106 kB gzip. Route-level splitting is now a P1 optimization before additional modules are added.

## UX

- The workflow presents only the immediate GitHub-strengthening journey rather than unrelated future features.
- A four-step navigation remains visible and usable on desktop and mobile.
- Computed and user decisions have distinct labels.
- Desktop uses an efficient decision table; mobile uses stacked decision cards and controls.
- Bulk selection and decision controls remain usable without horizontal scrolling.
- Portfolio cards expose selection reason, language, score, GitHub link, order, showcase state, and readiness evidence.
- Profile input visually separates observed and user-provided information.
- Profile readiness explains its denominator and explicitly disclaims career-outcome prediction.
- README preview and source are available side by side with configuration on desktop and stacked on mobile.
- Visual QA artifacts:
  - `docs/screenshots/phase-3-workspace-desktop.png`
  - `docs/screenshots/phase-3-workspace-mobile.png`
  - `docs/screenshots/phase-3-readme-preview-desktop.png`
  - `docs/screenshots/phase-3-readme-preview-mobile.png`

## Known Limitations

- Repository listing metadata cannot establish fork contribution depth, code quality, screenshots, deployment status, or actual framework usage.
- Portfolio categories are conservative keyword relevance hints, not expertise claims.
- README screenshot detection remains unknown because README bodies are not downloaded for every repository.
- Portfolio order uses simple up/down controls rather than drag-and-drop to preserve mobile and keyboard reliability.
- Local persistence is device/browser specific and can be cleared by the user or browser.
- Copy support depends on browser Clipboard API permission; download remains available.
- Profile README preview is intentionally lightweight and does not emulate every GitHub Markdown extension.
- The diversity algorithm does not yet use target roles because canonical target-role integration belongs to Phase 4; users retain full manual control.

## Technical Debt

No P0 technical debt remains. Remaining product and engineering improvements have been moved to the normal prioritized backlog in `docs/backlog.md`.

## P0 Issues

None.

## Overall Verdict

**PASS**

The README source, safe rendered preview, clipboard copy, and downloaded `.md` now use the same valid Markdown document. Markdown syntax renders correctly, content-level security protections remain in place, and all Phase 2/3 regression checks pass.

## Next Phase

Phase 4 — Canonical Developer Profile.

Phase 4 has not been started and requires explicit instruction.
