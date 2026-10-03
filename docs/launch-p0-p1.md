# Launch and profile tools

Current implementation summary: 2026-10-03. This describes source behavior, not a verified production deployment. See `docs/release-verification.md` for the release gate.

## Implemented

- Current privacy and methodology copy, including local storage and deletion behavior.
- Feedback uses the published Tally form and its separately configured private Google Sheets integration. Bugs go to GitHub Issues. An explicitly empty form ID enables clearly labeled local-only drafts.
- Social preview PNG, favicon, metadata, robots.txt, and a sitemap for devpersonify.learnwithsk.dev.
- Versioned career profile backup, nested input validation, restoration on a new device without a GitHub request, and storage failure handling.
- LinkedIn review accepts a locally parsed profile PDF, quick paste, or guided input for 10 sections. Fixed English heading/column rules suggest editable placement; unmapped text is retained for review. Imported and pasted input stays in memory and clears when leaving the page. Results offer review prompts rather than accuracy or employability scores.
- Accessibility scans on public information pages, contrast fixes, and Firefox/WebKit browser coverage alongside Chromium.
- Patched development dependencies, including Vitest 4.1.11.

## Product boundaries

Backups contain private career details and extracted resume text. They contain one career profile, not separate README/resume presentation settings. Import replaces an existing profile only after confirmation. Imported derived comparisons are recomputed from validated evidence.

Stored profiles no longer require a GitHub request on every visit. Their GitHub evidence is a snapshot; it is not silently replaced after backup restoration. A new audit does not automatically merge its results into a stored career profile.

LinkedIn review works on user-supplied PDFs or text. It has no LinkedIn API, scraping, automatic updates, or semantic contradiction detection. Punctuation-aware phrase matching keeps C, C++, and C# distinct. Users review dates, employers, paraphrases, and claim accuracy themselves.

LearnWithSK integration is deferred at the user's request. No lesson links, referral tracking, or changes to that site are included.

## Validation metrics to use during beta

The intended funnel is audit started → audit completed → career profile created → README or resume exported. Track error category and feedback submission count only if a collection service is explicitly configured. Do not put usernames, repository names, resume text, LinkedIn text, or generated documents in analytics events. This release adds no telemetry; use invited-user observation and GitHub Issues until a collection service and retention policy are chosen.

## Production release gate

Build and deploy the reviewed branch to the existing Cloudflare Pages project. After deployment, verify the favicon, social card, robots.txt, sitemap, direct routes, actual GitHub API behavior, and download flows. Existing production HTTPS, HTTP redirect, direct routes, and JS/CSS delivery were checked before these changes. Production interactive flows and the new branch's deployment remain separate checks.

Optional feedback delivery is prepared through Tally and its native Google Sheets integration; see `docs/feedback-tally.md`. The published form PdVrRd is configured by default. The private Google Sheets connection was verified with one synthetic response from the local app on 2026-10-01. Recheck the feedback entry point after production deployment. Explicitly setting the form ID empty restores local drafts without delivery.

## P1 hardening and outcome guidance

- README/resume saved settings now receive nested runtime validation before reconciliation or output generation. Valid v1 settings retain their content, order, and overrides. Unknown schema versions and damaged drafts are preserved instead of silently overwritten by defaults. Users can download the original and explicitly replace it; quota failures and stale recovery actions preserve it.
- No new storage schema was introduced. There is no historical format conversion to invent: v1 remains supported, and other versions are blocked. Any future format change requires a tested migration with real historical fixtures. Career profile backups retain their existing validation and scope.
- CI checks the P1/release branches and pull requests. Builds carry release metadata, and a separate manual workflow checks the deployed commit, routes, and asset hashes. Interactive production checks still remain.
- Anonymized parser cases cover multi-page continuation, sidebar/main columns, and additional English headings. Fixed a resume page break being interpreted as a second job. PDF text extraction still requires human review.
- Resume Studio includes compiler guidance and local/optional external compilation instructions. It does not compile or claim a verified PDF preview.
- Home and the guide explain three finish lines: Word resume, GitHub README, or LinkedIn action plan. Career-stage guidance covers graduates, mid-level, and experienced engineers. These choices guide users; they do not score or classify them.

## Product gaps after this pass

- **Next P1 product decision:** a resume/manual-first start without requiring GitHub. Current new-profile creation still needs a GitHub username; no-GitHub users cannot start a fresh profile yet. This is especially relevant to engineers whose work is private.
- Full backups of separate README/resume presentation settings remain P2. Current profile backup scope is explicit.
- Additional languages, OCR, arbitrary PDF layouts, job-description matching, and automated publishing are not part of this release.
- Validate the value proposition with users from each career stage: can they identify an output, complete it, and explain how it helped? No employment outcome is promised.
