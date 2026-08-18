# Phase 4 — Career Evidence Profile

## Status

**PASSED** — 2026-08-18

All Phase 4 P0 quality-gate requirements are satisfied. Phase 5 has not been started.

## Product Goal

Create one canonical Career Evidence Profile that combines and preserves the provenance of:

1. selected public GitHub evidence;
2. private user-supplied resume evidence;
3. explicit user-provided professional context; and
4. transparent deterministic comparisons.

The implemented flow is:

```text
GitHub Audit → Resume input → Review extracted evidence → Add/correct information → Career Evidence Profile
```

The profile is structured for later LaTeX resume, professional-presence, developer-platform, and job-match phases without implementing those phases now.

## Resume Input

- Added `/career/:username` as the contextual Career Evidence Profile workflow.
- Added a first-class Resume step with file upload and paste-text fallback.
- Supported file formats:
  - text-based PDF;
  - OOXML DOCX;
  - UTF-8 TXT;
  - pasted plain text.
- Added extension validation before reading file content.
- Added a 5 MB file-size limit.
- Added dedicated unsupported, oversized, empty, malformed, unreadable, and parsing-failure messages.
- All failures direct the user to the paste-text fallback.
- Added a visible “Your resume stays in your browser” privacy statement.
- Added clear-resume actions both in Resume input and profile data management.

## Resume Processing

- PDF extraction uses a locally bundled, security-audited PDF.js build and worker.
- DOCX extraction locally opens the OOXML ZIP and reads paragraph text from `word/document.xml`.
- TXT extraction requires valid UTF-8.
- Pasted text is normalized locally.
- No OCR, AI inference, external resume parser, API request, or server upload is used.
- Deterministic heading recognition separates Experience, Education, Skills, Projects, Certifications, Achievements, Professional links, and Other information.
- Skills are split into individual pending review items.
- Experience and education blocks retain title, organization, date range, description, and technologies fields where deterministic extraction can surface them.
- Extracted items always start as `PENDING`; no extracted content becomes an accepted record silently.
- Every extracted item can be corrected, accepted, or removed.
- Manual items can be added to every supported section.
- Editing an extracted item changes its provenance from `RESUME_PROVIDED` to `USER_PROVIDED`.
- Accepted experience and education remain structured and editable in the profile preview.

## Canonical Evidence Model

`src/domain/career-evidence-profile.ts` is the Phase 4 canonical persisted profile contract.

The model contains:

- identity;
- career direction;
- experience;
- education;
- skills;
- projects;
- certifications;
- achievements;
- professional links;
- other professional information;
- selected GitHub evidence;
- private resume document evidence;
- resume review decisions;
- explicit user-provided evidence;
- deterministic derived comparisons;
- completeness and source coverage;
- section visibility preferences.

The model is versioned with `CAREER_EVIDENCE_SCHEMA_VERSION = 1`. Stable evidence IDs and source references allow later phases to consume the same profile without maintaining separate resume/job/presence models.

## Provenance

Every important accepted or derived value retains one or more provenance references:

- `GITHUB_OBSERVED` — public profile and selected repository metadata;
- `RESUME_PROVIDED` — resume content accepted by the user without editing;
- `USER_PROVIDED` — explicit fields, manual additions, or corrected extractions;
- `DERIVED` — deterministic comparisons, opportunities, completeness, and source coverage.

The UI displays source badges including GitHub observed, Resume, You, and Derived. User edits do not silently retain a resume-only label. Deterministic conclusions link back to source IDs and do not become user claims.

## GitHub + Resume Comparison

- Reuses the cached Phase 2/3 audit instead of refetching unnecessarily.
- Reuses user portfolio selections when available; otherwise only computed showcase candidates seed selected GitHub evidence.
- Preserves repository names, URLs, descriptions, observed languages, topics, activity timestamps, fork status, portfolio selection, and showcase selection.
- Builds a normalized skill-evidence comparison from accepted resume skills and observed language/topic values in selected repositories.
- Displays:
  - multiple-source support;
  - resume-only evidence;
  - GitHub-only evidence;
  - potential resume opportunities for selected projects absent from accepted resume projects.
- Resume-only copy says “relevant public GitHub evidence was not detected.”
- The product never says a user lacks a skill, that a resume is false, or that GitHub verifies employment.
- Selected GitHub project opportunities are surfaced with explanations and never added to resume evidence automatically.
- No expertise or employability score is created.

## User Profile

The Profile step provides explicit editable fields for:

- professional headline;
- current role;
- target role;
- career direction;
- short introduction;
- years of experience;
- preferred technologies;
- location;
- LinkedIn URL;
- website;
- email;
- other relevant professional information.

These fields are always `USER_PROVIDED`. Target roles and career direction are never inferred from GitHub. The evidence-profile preview supports deterministic formatting and editable structured records for experience and education.

Profile completeness is a transparent checklist for Identity, GitHub, Resume, Experience, Education, Skills, Projects, Target role, and Professional links. It is explicitly not a probability of employment or recruiter success.

Source coverage reports GitHub, resume, user-provided, multiple-source support, and potential gaps with explanations rather than a generic career score.

## Persistence

- Career profiles are stored only in browser `localStorage` under a versioned username key.
- Persisted data includes resume text, accepted review data, pending decisions, explicit user fields, GitHub profile reference, selected repositories, comparisons, and section preferences.
- Refresh persistence is verified in desktop and mobile browser tests.
- Data-management actions include:
  - Clear resume — removes resume document/review data and resume-only accepted records while preserving unrelated user/GitHub evidence.
  - Clear GitHub data — removes cached audit/preparation data and GitHub evidence from the canonical profile.
  - Clear career profile — resets the canonical career profile from the current GitHub audit.
  - Clear all career data — removes career, preparation, and audit data and returns to the audit workflow.
- No account, database, backend, cookie-based session, or cross-device storage was introduced.

## Privacy

- Resume bytes and text are processed in the browser.
- Resume content is never sent to GitHub.
- Resume content is never sent to an external parser, AI provider, analytics service, server, or third party.
- Browser E2E tracks network requests during upload, paste, review, profile input, comparison, and preview; no external resume request occurs.
- No resume content is logged by the application.
- The UI explicitly states: “Your resume stays in your browser.”
- All persistence is user-clearable.

## Security

- Resume text is always rendered as React text/input values; it is never interpreted as resume HTML.
- No `dangerouslySetInnerHTML` is used.
- HTML/script strings and malicious Markdown-like input remain inert text evidence.
- PDF evaluation support is disabled during parsing.
- DOCX extraction reads only expected local OOXML text content and does not load remote resources.
- Website/link presentation does not execute supplied markup.
- Unsupported, corrupt, empty, oversized, invalid UTF-8, malformed PDF, and malformed DOCX inputs fail safely.
- File processing errors do not expose stack traces in the UI.
- The installed dependency set reports zero known vulnerabilities.
- Existing GitHub behavior remains public GET-only with no OAuth, token, write permission, or mutation endpoint.
- No AI, paid API, database, authentication, resume generation, job matching, or LinkedIn scraping was introduced.

## Testing

Final verification:

- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run test` — 49/49 tests passed across 8 test files.
- `npm run test:e2e` — 9 browser tests passed; one duplicate mobile error-state matrix was intentionally skipped.
- `npm run build` — passed.
- `npm audit` — zero known vulnerabilities.

Automated coverage includes:

- pasted resume extraction;
- valid text PDF parsing;
- valid DOCX parsing;
- valid UTF-8 TXT parsing;
- unsupported file rejection;
- 5 MB limit enforcement;
- malformed PDF/DOCX;
- empty file/text;
- invalid document handling;
- deterministic section and skill extraction;
- malicious resume text remaining inert;
- accept/edit/remove/manual review behavior;
- structured record editing;
- all four provenance types;
- GitHub + resume multiple-source support;
- resume-only non-detection language;
- GitHub-only evidence;
- potential resume opportunities;
- local save/load;
- clear resume, GitHub, career, and all-data behavior;
- unsupported-upload browser fallback;
- valid TXT upload in a real browser;
- paste workflow in a real browser;
- desktop and mobile career workflow;
- refresh persistence;
- zero external resume requests;
- console/page error collection;
- horizontal-overflow checks.

Desktop and mobile QA screenshots:

- `docs/screenshots/phase-4-career-profile-desktop.png`
- `docs/screenshots/phase-4-career-profile-mobile.png`

Production output remains static and Cloudflare Pages compatible. PDF processing is emitted as a lazy module plus a local worker asset rather than inflating the initial application path.

## Known Limitations

- Image-only/scanned PDFs are not OCR-processed; users must paste text.
- Complex PDF reading order can differ from visual layout.
- DOCX support extracts standard OOXML paragraph text; text boxes, images, charts, headers/footers, and unusual embedded structures may not be represented.
- Deterministic heading extraction recognizes common English section labels and cannot understand every resume layout.
- Experience extraction intentionally leaves uncertain fields editable rather than inventing facts.
- Dates are retained as user-reviewable strings instead of normalized into false precision.
- GitHub skill support uses explicit observed languages/topics in selected repositories and does not inspect code or claim expertise.
- Browser-local data does not sync across devices and can be cleared by browser settings.
- The profile preview is structured evidence, not an AI-written professional narrative.

## P0

None open.

## P1

- Expand deterministic section-heading aliases based on anonymous parsing failures.
- Add stronger schema migration/runtime validation before the profile schema evolves.
- Add accessible confirmation dialogs for destructive local clear-data actions.
- Add route-level code splitting around the career workspace itself; PDF parsing is already lazy.
- Add automated accessibility scanning and focus-management coverage.

## P2

- Add optional local OCR only if a maintainable, zero-cost browser approach is justified by usage.
- Add more locale/date formats without inventing date precision.
- Add export/import of the versioned local profile only after privacy UX is validated.
- Preserve future compatibility for Phase 5–8 consumers without implementing those phases prematurely.

## Overall Verdict

**PASS**

Resume upload and paste, local parsing, explicit review, structured editing, provenance preservation, cross-source comparison, local persistence, clear-data controls, security handling, desktop/mobile UX, tests, and production build all satisfy the Phase 4 gate. No P0 issues remain.

Phase 5 has not been started.
