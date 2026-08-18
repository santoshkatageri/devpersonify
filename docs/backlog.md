# Implementation Backlog

Updated: 2026-08-18

Only Phase 1 is ready to start after Phase 0. Later items are ordered for planning but must not be implemented early.

## P0 — Phase 1: Product shell and landing

| Order | ID | Item | Acceptance summary |
|---:|---|---|---|
| 1 | P1-01 | Scaffold React/Vite/TypeScript/Tailwind | Production build and strict typecheck pass; no unnecessary UI kit |
| 2 | P1-02 | Add lint/test baseline | ESLint, Vitest, Testing Library; scripts documented and passing |
| 3 | P1-03 | Establish design tokens and primitives | Accessible button, container, section, badge/card primitives; consistent focus states |
| 4 | P1-04 | Responsive application header | Clear brand, working nav, usable keyboard/mobile behavior |
| 5 | P1-05 | Landing hero and primary CTA | Positioning understandable quickly; CTA navigates to `/audit` |
| 6 | P1-06 | Product overview | Evidence-first explanation and honest deterministic V1 messaging |
| 7 | P1-07 | Module explanation sections | GitHub cleanup/profile, LaTeX resume, job match, professional presence; future features not presented as active |
| 8 | P1-08 | Audit route shell | Username form UI and honest “audit arrives next phase” state; no fake analysis |
| 9 | P1-09 | Privacy/methodology placeholders with real baseline copy | No broken links; explain public GitHub reads and no destructive action |
| 10 | P1-10 | Routing/error states | `/`, `/audit`, `/privacy`, not-found; SPA fallback |
| 11 | P1-11 | Accessibility and responsive QA | Labels, landmarks, focus, contrast, reduced motion; mobile and desktop verified |
| 12 | P1-12 | Cloudflare Pages readiness | Build output configured, no secrets, deployment instructions |
| 13 | P1-13 | Phase 1 gate/report | Build, tests, typecheck, lint, console/manual QA; all P0 issues resolved |

## P0 — Phase 2: GitHub public audit (do not start before Phase 1 passes)

| Order | ID | Item | Acceptance summary |
|---:|---|---|---|
| 1 | P2-01 | Username parser/validator | Username and profile URL handling tested |
| 2 | P2-02 | GitHub transport DTO guards | Malformed responses fail safely |
| 3 | P2-03 | Public API client | User/repository fetch, abort, Link pagination, bounded retry |
| 4 | P2-04 | Rate-limit/error model | Reset copy, cached fallback, actionable error states |
| 5 | P2-05 | DTO-to-domain mapper | No transport DTO leakage; provenance retained |
| 6 | P2-06 | Repository scoring engine | Implements `repo-v1` as pure tested functions |
| 7 | P2-07 | Classification engine | Exact precedence and explanation contract tested |
| 8 | P2-08 | Portfolio health engine | `portfolio-v1`, counts, coverage/confidence tested |
| 9 | P2-09 | Versioned audit cache | TTL, stale fallback, refresh, safe eviction |
| 10 | P2-10 | Audit dashboard | Summary metrics, uncertainty, limitations, methodology |
| 11 | P2-11 | Repository results view | Responsive table/cards, sort/filter by class/language/activity/fork |
| 12 | P2-12 | Real-profile QA | Small, large, fork-heavy, archived; document calibration outcomes |
| 13 | P2-13 | Phase 2 gate/report | All correctness and UX P0 issues resolved |

## P0 — Phase 3: Cleanup/profile preparation

- Repository evidence detail and classification explanation.
- Local, non-destructive user override with preserved computed result.
- Showcase shortlist and pin-order rules.
- Metadata/documentation gap detection.
- Deterministic GitHub profile recommendations.
- Markdown README structure, safe preview, copy, and download.
- First-time-user and owner-profile manual review.

## P0 — Phase 4: Canonical developer profile

- Runtime validation and versioned persistence envelope.
- GitHub-to-profile mapping with provenance.
- Manual editing and user-claim distinction.
- Project/repository curation and target roles.
- Completeness and evidence coverage scoring.
- Frontend/backend/ML persona model validation.

## P1 — Validated expansion

1. Phase 5: one polished software-engineer LaTeX template, safe escaping, `.tex` export.
2. Phase 6: manual professional presence input and deterministic consistency review.
3. Phase 8: deterministic job-requirement parsing, correction, and evidence matching.

Phase 8 may follow Phase 6 before Phase 7 because it is P1 while Phase 7 is P2, provided its dependency on the canonical profile is stable.

## P2 — Later expansion

1. Phase 7: role-specific developer presence map.
2. Phase 9: portfolio and additional output generation.
3. Phase 10: persistence/authentication, only after anonymous workflow validation.

## Deferred / P3

AI career or resume tools, interview coaching, recruiter marketplace, job board, social network, automatic GitHub cleanup, LinkedIn scraping, team/enterprise features, billing, and mobile app.

## Normal post-Phase 3 backlog

### P1

- Add route-level code splitting for audit and preparation bundles.
- Add automated accessibility scanning to complement semantic/browser checks.
- Add keyboard focus trapping to the repository detail modal.
- Connect target-role context to conservative portfolio relevance after the canonical DeveloperProfile is implemented.
- Add stronger runtime validation and migrations for long-lived local preparation documents in Phase 4.
- Add a dedicated historical-relevance filter for profiles with many engaged older repositories.
- Explain when shortlist diversity is metadata-limited and remaining positions are filled by score.

### P2

- Consider accessible drag-and-drop ordering only if user testing shows up/down controls are insufficient.
- Add additional README templates only after the first deterministic format is validated.
- Consider a distinct “not enriched yet” readiness presentation if user testing finds the generic review state too broad.
- Consider privacy-respecting analytics only after a specific validation metric is approved.

## Normal post-Phase 4 backlog

### P1

- Expand deterministic resume section-heading aliases using anonymous parsing failures.
- Add stronger runtime validation and versioned migration before changing the Career Evidence Profile schema.
- Add accessible confirmation dialogs for destructive browser-local clear-data actions.
- Add route-level code splitting around the career workspace; keep PDF parsing lazy.
- Add automated accessibility scanning and focus-management coverage.

### P2

- Evaluate optional local OCR only if usage justifies a maintainable zero-cost browser implementation.
- Add more locale/date formats without inventing date precision.
- Consider export/import of versioned local career data after privacy UX validation.

## Normal post-Phase 5 backlog

### P1

- Add compile instructions tailored to pdfLaTeX versus XeLaTeX/LuaLaTeX.
- Add stronger runtime migration validation before changing the LaTeX resume configuration schema.
- Add automated accessibility scanning beyond semantic browser checks.
- Evaluate print-specific structured preview styles without implying compiled PDF equivalence.

### P2

- Add another resume template only after validated demand demonstrates a distinct use case.
- Re-evaluate optional local compilation only if bundle, privacy, performance, and maintenance costs improve materially.
- Consider versioned configuration import/export after privacy UX validation.

## Normal post-launch-hardening backlog

### P1

- Configure a privacy-reviewed feedback delivery endpoint; keep the local launch stub until approved.
- Add automated accessibility scanning beyond semantic and keyboard browser checks.
- Strengthen runtime migrations before changing Career, README, LaTeX, or DOCX configuration schemas.

### P2

- Add advanced DOCX styling only when concrete compatibility/editing feedback justifies it.
- Continue route-level bundle splitting without changing product behavior.
- Consider versioned local configuration export/import after privacy review.

## Cross-cutting definition for every implementation item

- Loading, empty, error, and success states where applicable.
- Strict TypeScript and production build pass.
- Relevant unit/integration tests pass.
- Mobile and desktop behavior checked.
- Accessibility basics and user-facing copy reviewed.
- Security/privacy implications documented.
- No secrets, paid APIs, AI runtime, destructive actions, or unrelated scope.
