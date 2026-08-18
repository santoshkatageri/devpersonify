# Phase 2 — GitHub Public Audit

## Status

**PASSED** — 2026-08-18

The Phase 2 gate is satisfied. Phase 3 has not been started.

## Completed

- Refined the Phase 1 landing experience without changing its visual language.
- Made all example audit metrics visibly illustrative with “Illustrative output · example values,” “Not a live audit,” and “Example” labels.
- Clarified the hero as a developer career evidence platform rather than a generic optimization product.
- Reordered the landing content around outcomes: hero, CTA, what users receive, example audit, process, capabilities, trust summary, final CTA.
- Rewrote capability cards around concrete outcomes and changed the first capability status to “START HERE.”
- Implemented GitHub username/profile URL normalization for plain usernames, `github.com/{username}`, full HTTPS URLs, optional `www`, and `@username`.
- Added local username validation before any network request.
- Implemented public, unauthenticated GitHub user and owner-repository fetching.
- Implemented RFC 5988 Link-header pagination with 100 repositories per page and a 50-page/5,000-repository safety ceiling.
- Added runtime validation for required GitHub user and repository response fields.
- Normalized external snake_case GitHub data into the existing internal domain contracts.
- Captured repository identity, description, URL, dates, fork/archive/template state, stars, forks, watchers, open issues, language, topics, license, default branch, homepage, visibility, and size when available.
- Implemented explicit idle, validating, loading, analyzing, success, not-found, rate-limited, network failure, empty, and malformed-response experiences.
- Implemented the versioned `repo-v1` deterministic scoring model and `portfolio-v1` aggregate.
- Preserved the Phase 0 100-point positive-factor model, unknown-signal normalization, penalties, classification precedence, confidence, warnings, and explanation contract.
- Implemented all classifications: `SHOWCASE`, `KEEP`, `ARCHIVE`, `FORK_REVIEW`, `REVIEW`, and `CLEANUP`.
- Added a portfolio dashboard with health score, repository/original/fork counts, every classification count, and explanation coverage.
- Added repository filtering, search, score/recent/stars/name sorting, desktop table, mobile cards, and 100-item progressive display for very large accounts.
- Added repository details with score, classification reason, observed values, point contributions, explanations, confidence, and unknown signals.
- Added explicit “Unknown is not absent” messaging throughout the audit.
- Added bounded README enrichment for at most six likely showcase candidates, constrained further by remaining API quota.
- Added on-demand README enrichment when a repository detail is opened.
- Added 15-minute browser-local caching keyed by username and audit version.
- Added request cancellation and 20-second per-request timeout protection.
- Kept the application static and Cloudflare Pages compatible.

## Verified

- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run test` — 25/25 tests passed across 4 files.
- `npm run test:e2e` — 5 browser tests passed, 1 intentionally skipped duplicate mobile error-state matrix.
- `npm run build` — passed.
- `npm audit` — 0 known vulnerabilities.
- Production bundle: 301.95 kB JavaScript / 95.68 kB gzip and 28.44 kB CSS / 6.19 kB gzip.
- Landing page and audit dashboard were checked in desktop Chromium at 1440×1000.
- Landing page, audit dashboard, filters, cards, and repository detail were checked at an iPhone 13-sized viewport.
- Browser tests assert no horizontal overflow.
- Browser tests collect application console errors and uncaught page errors; none occurred.
- Expected HTTP failure statuses used to exercise README absence, 404, 403, and network-error paths are treated as tested network outcomes rather than application console failures.
- The live development preview remains available on port 5173.

## Test Profiles

Real public GitHub profiles were tested through the running application on 2026-08-18:

| Internal fixture | Purpose | Repositories observed | Originals | Forks | Archived recommendations | GitHub requests | Write requests |
|---|---|---:|---:|---:|---:|---:|---:|
| Large fork-heavy profile | Pagination and fork handling | 245 | 32 | 213 | 23 | 5 | 0 |
| Very small profile | Small-account behavior | 8 | 6 | 2 | 3 | 3 | 0 |
| Open-source profile | Archived and high-engagement behavior | 12 | 9 | 3 | 2 | 9 | 0 |

These three real profiles collectively cover the requested owner, few-repository, many-repository, fork-heavy, and archived-repository cases. Counts are snapshots and can change when GitHub data changes.

Automated fixtures additionally cover invalid username, GitHub 404, rate limit, network failure, empty repository list, malformed response, multiple classifications, filters, sorting, and repository details.

## API Behavior

- Initial endpoints:
  - `GET /users/{username}`
  - `GET /users/{username}/repos?type=owner&sort=updated&direction=desc&per_page=100&page=1`
- Pagination follows only GitHub's `rel="next"` Link URL.
- No public repository count is used to guess the final page.
- External JSON is validated before normalization.
- Nullable fields remain omitted/unknown rather than being invented.
- Rate-limit headers are normalized and displayed when available.
- 404 user, 403/429 rate limit, malformed JSON shape, network/timeout, GitHub failure, and empty-list states have dedicated recovery copy.
- Requests are aborted when the route changes or component unmounts.
- Completed audits are cached locally for 15 minutes; explicit refresh bypasses the cache.

## Scoring Verification

- Scoring is a pure function of normalized repository metadata and a fixed audit timestamp.
- Positive factors use the Phase 0 maximums totaling 100 points.
- Only available positive factors enter the score denominator.
- Known absence earns zero; unfetched evidence is excluded and listed as unknown.
- Listing-available factors include originality, recency, age, stars, forks received, description, license, topics, and known completeness sub-signals.
- README contributes only after a targeted request confirms presence/absence.
- Releases, issue activity, and pull-request activity remain unknown during the initial audit.
- Archived, fork, and stale penalties are applied after positive-score normalization and remain visible as reasons.
- Repeated scoring with identical input and audit timestamp is verified to produce identical output.
- The UI clearly says scores summarize public repository evidence and do not measure engineering ability, employability, developer quality, or guaranteed outcomes.

## Classification Verification

Automated tests verify:

- Strong original, documented evidence can become `SHOWCASE`.
- Fork precedence produces `FORK_REVIEW` regardless of public engagement.
- Archived precedence produces `ARCHIVE`.
- Recent repositories with weak metadata can produce `CLEANUP`.
- New/incomplete evidence produces `REVIEW`.
- Mid-level public evidence produces `KEEP`.
- Every repository result includes a classification reason and factor-level explanations.
- User-facing explanations are neutral and evidence-focused.

The browser fixture exercises all six classifications in the dashboard, filters, and detail view.

## Performance

- The initial audit primarily uses the user endpoint and paginated repository listing.
- There is no per-repository initial fan-out for languages, issues, pull requests, releases, or full repository details.
- Automatic README checks are capped at six and reduced when the exposed API quota is low.
- Real-profile request counts were 5 for 245 repositories, 3 for 8 repositories, and 9 for 12 repositories; all requests were GET.
- Repository results progressively render 100 at a time to avoid placing thousands of rows in the DOM.
- Local caching avoids repeated requests during a 15-minute review session.
- Route changes cancel in-flight requests and each request has a 20-second ceiling.

## Security

- No GitHub token or secret exists.
- No authentication or OAuth exists.
- No database or server runtime exists.
- No AI inference, RAG, vector database, or paid API exists.
- No POST, PUT, PATCH, or DELETE GitHub request exists; real-profile QA observed zero write requests.
- No delete, archive, edit, sync, or repository-modification control exists in the UI.
- All product behavior is recommendation-only and read-only.
- External content is rendered as React text, not injected HTML.
- Repository links are opened with safe new-tab relationship attributes.
- GitHub profile/resume data is not logged by the application.

## UX

- The audit accepts all requested username/profile URL forms.
- Progress copy distinguishes fetching from deterministic analysis.
- Large-account copy explains that pagination can take longer.
- Dashboard hierarchy prioritizes portfolio summary, limitations, then repository evidence.
- Filters include all classifications; sorting includes score, recent activity, stars, and name.
- Desktop uses a compact table; mobile uses readable stacked cards.
- Repository details use a responsive, refresh-safe route with breadcrumb/back navigation, current-view previous/next controls, URL-preserved filter/search/sort state, and keyboard arrow navigation.
- Unknown signals are visually separated from known absences.
- Error states provide retry and username-reset actions.
- Empty profiles explicitly avoid drawing conclusions about private work.
- Visual evidence:
  - `docs/screenshots/phase-2-landing-desktop.png`
  - `docs/screenshots/phase-2-landing-mobile.png`
  - `docs/screenshots/phase-2-audit-detail-desktop.png`
  - `docs/screenshots/phase-2-audit-detail-mobile.png`

## Known Limitations

- Unauthenticated GitHub access is limited by GitHub's public per-IP quota; shared networks may exhaust it sooner.
- README presence is checked only for a bounded shortlist or on detail open.
- Releases, issue activity, pull-request activity, code quality, contribution depth, private work, organization work not owned by the user, and professional employment evidence are not assessed in the initial audit.
- A fork cannot reveal the user's contribution depth from listing metadata, so it always requires manual review.
- Portfolio health can have reduced evidence coverage; the UI displays that coverage rather than implying full precision.
- Local cache validation is intentionally lightweight; future persisted canonical-profile data will require versioned runtime migration in Phase 4.
- GitHub's API data and test-profile counts change over time.

## Technical Debt

- Add route-level code splitting before later modules materially grow the bundle.
- Consider a dedicated audit-result storage envelope with stronger runtime validation if cached data evolves beyond short-lived public snapshots.
- Evaluate automatic accessibility scanning in the next UI-heavy phase.
- Add bounded transient 5xx retry only if real usage shows it improves outcomes without confusing rate-limit behavior.
- Consider rendering virtualization only if real profiles near the 5,000-repository ceiling demonstrate that 100-item progressive rendering is insufficient.

## P0

- None open.

## P1

- Add automated accessibility scanning.
- Add route-level code splitting as Phase 3 grows the audit bundle.
- Expand real-profile calibration fixtures when false positives/negatives are reported.

## P2

- Evaluate privacy-respecting anonymous product analytics after a specific validation metric is approved.
- Consider a secure caching Worker only if measured public API limits block validated usage; do not embed a shared token without abuse controls.

## Next Phase

Phase 3 — GitHub Cleanup and Profile Preparation.

Do not begin automatically. Phase 2 is complete, and Phase 3 awaits explicit instruction.
