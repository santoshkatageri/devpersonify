# GitHub Profile Regression Test

## Purpose

Evaluate whether DevPersonify’s deterministic GitHub audit and Phase 3 preparation rules generalize across four materially different public profiles without profile-specific logic.

This is an internal QA artifact. Profiles are anonymous, aggregate-only fixtures. No username, personal repository name, or repository-level personal result is included. The fixtures are not exposed in production UI or imported by production code.

The regression measured repository composition, scoring, classification, fork assessment, readiness, diverse portfolio suggestions, empty user-provided profile completeness, request behavior, errors, and elapsed retrieval/analysis time. It also checked repository-count, fork, staleness, star, activity, duplication, historical-project, missing-data, role-neutrality, profile-overfitting, and open-source bias.

## Test Profiles

- **Profile A** — large, fork-heavy individual profile.
- **Profile B** — large public learning/content portfolio with unusually high repository engagement.
- **Profile C** — small, currently active individual profile.
- **Profile D** — major open-source profile with high-engagement, historical, archived, and forked repositories.

The labels correspond only to this internal run. Production code contains no label-to-profile mapping.

## Aggregate Results

Post-adjustment results using `repo-v1.1`:

| Metric | Profile A | Profile B | Profile C | Profile D |
|---|---:|---:|---:|---:|
| Repository count | 245 | 327 | 8 | 12 |
| Original repositories | 32 | 315 | 7 | 9 |
| Forks | 213 | 12 | 1 | 3 |
| Archived repositories | 0 | 0 | 0 | 1 |
| Active repositories | 4 | 31 | 6 | 7 |
| Showcase candidates | 0 | 5 | 1 | 3 |
| Keep candidates | 0 | 26 | 1 | 3 |
| Archive candidates | 20 | 0 | 1 | 1 |
| Fork-review candidates | 213 | 12 | 1 | 3 |
| Manual-review candidates | 7 | 264 | 0 | 1 |
| Cleanup candidates | 5 | 20 | 4 | 1 |
| Portfolio health | 25 | 82 | 66 | 78 |
| Evidence coverage | 67% | 67% | 71% | 74% |
| Readiness: Ready | 0 | 2 | 2 | 0 |
| Readiness: Needs work | 0 | 3 | 0 | 5 |
| Readiness: Review | 245 | 322 | 6 | 7 |
| Suggested portfolio size | 6 | 6 | 6 | 6 |
| Distinct relevance categories in shortlist | 3 | 6 | 3 | 3 |
| User-provided profile completeness | 0% | 0% | 0% | 0% |

The 0% profile-completeness result is expected: regression contexts intentionally supplied no optional user profile fields. Observed GitHub evidence remains displayed separately and is not incorrectly counted as user-provided information.

## Scoring Findings

- **Repository-count bias:** not observed. The two largest profiles produced materially different portfolio-health scores (25 and 82), while the two small profiles scored 66 and 78. Repository count itself is not a negative factor.
- **Star bias:** not observed as automatic showcase promotion. Profile B had 238 repositories with at least 50 stars, but only 3 of those were showcase candidates. Profile D had 12 high-star repositories and 3 showcase candidates. README, description, ownership, recency, and other evidence remained necessary.
- **Activity bias:** not observed as automatic value. Recent repositories with sparse descriptions/topics existed in Profiles B and C; none became showcase candidates solely because they were recent.
- **Missing-data bias:** not observed. Unchecked README, release, issue, pull-request, and screenshot signals remained unknown. QA-only failed README probes remained unknown rather than being converted to absence.
- **Role neutrality:** preserved. Portfolio categories use conservative “appears relevant” wording and do not state expertise. A language or metadata keyword is a relevance hint, not proof of a framework, role, or skill level.
- **Open-source bias:** not observed in the aggregate score. Profile D received strong evidence results, but was not treated as inherently superior to Profile B. The normal individual and major open-source profiles both produced strong but different evidence patterns.

## Classification Findings

The initial `repo-v1` regression exposed a genuine historical-project classification defect:

- Profile B initially produced 247 archive candidates.
- 245 of those were old original repositories with meaningful public engagement.
- Profile A had 2 old, publicly engaged repositories classified as archive candidates.
- The prior verified baseline for Profile D also contained one old, engaged non-archived repository inside its archive recommendations.

The old rule used `age > 730 days + score < 40` for archive consideration. Because staleness already reduced both recency points and the final score, historical repositories could be pushed into `ARCHIVE` even when stars/forks showed continuing public significance. This was a cross-profile generalization problem, not a cosmetic issue.

The generalized `repo-v1.1` rule now requires all of the following for an unarchived stale repository to become an archive candidate:

- no push for more than 730 days;
- evidence score below 40;
- fewer than 3 stars; and
- fewer than 2 forks received.

An old repository with at least 3 stars or 2 forks and a score below 50 now becomes `REVIEW` with an explicit historical-relevance explanation. Stars still do not make it showcase or keep automatically.

Post-change effects:

- Profile A archive candidates decreased from 23 to 20; manual review increased from 4 to 7.
- Profile B archive candidates decreased from 247 to 0; manual review increased from 17 to 264.
- Profile C was unchanged.
- Profile D now has one archive candidate matching its one repository already archived; one additional historical repository moved to manual review.

This is intentionally conservative. The system no longer commands cleanup for historically engaged work, but it also does not automatically promote that work.

## Fork Handling Findings

| Fork assessment | Profile A | Profile B | Profile C | Profile D |
|---|---:|---:|---:|---:|
| Potentially meaningful | 0 | 1 | 0 | 0 |
| Likely low-value public context | 192 | 1 | 0 | 0 |
| Manual review | 21 | 10 | 1 | 3 |

- Fork classification remained `FORK_REVIEW`; no fork became `ARCHIVE` merely because it was a fork.
- Profile B demonstrated that a fork can become potentially meaningful when several public signals align.
- Profiles C and D demonstrated the manual-review fallback when metadata does not establish contribution depth.
- Profile A’s high likely-low-value count required multiple limited-context signals; fork status alone was insufficient.
- The product continues to state that fork metadata cannot prove customization or contribution depth.

No rule adjustment was made to produce a nicer fork distribution. The evidence supports retaining the current three-way assessment while monitoring false negatives through manual review.

## Portfolio Recommendation Findings

- Every profile received at most six suggestions.
- Suggestions remained optional and did not alter user decisions or portfolio state automatically.
- Profile B’s shortlist covered six relevance categories despite high engagement across many repositories.
- Profiles A, C, and D each covered three categories; this reflects narrower or incomplete public metadata rather than forced artificial diversity.
- Forks entered suggestions only when assessed as potentially meaningful.
- High score was used only after attempting category breadth.
- No username or profile-specific condition exists in recommendation code.

A potential improvement is to explain when fewer than six distinct categories are available, rather than silently filling remaining positions by score. This is P1 UX work, not a correctness blocker.

## Portfolio Diversity Findings

- **Portfolio duplication:** no six-item shortlist consisted solely of one detected relevance category.
- The diversity algorithm selected new categories first, then filled remaining positions using evidence score and recency.
- Profile B showed the broadest detected range with six categories.
- Profile A’s three-category result did not inflate breadth from forks with weak context.
- Profile D’s three-category result avoided treating open-source popularity as a category by itself.
- Categories remain metadata relevance signals. They do not claim role proficiency or technical expertise.

## Performance / API Findings

Initial direct-list regression measurements before public quota exhaustion:

| Metric | Profile A | Profile B | Profile C | Profile D |
|---|---:|---:|---:|---:|
| Repository-list API GETs | 3 | 4 | 1 | 1 |
| Bounded README checks needed by product-equivalent run | 0 | 6 | 2 | 6 |
| Expected/observed complete audit GETs including user request | 4 | 11 | 4 | 8–9 |
| Write requests | 0 | 0 | 0 | 0 |
| Initial aggregate run time | ~1.5 s | ~3.4 s | ~0.9 s | ~2.3 s |

Request types remained read-only:

- one public user-profile `GET` in the production flow;
- paginated repository-list `GET` requests with `per_page=100`;
- zero to six bounded README-presence `GET` requests;
- no POST, PUT, PATCH, or DELETE request.

The shared unauthenticated quota was exhausted before the first complete four-profile pass. This correctly produced a 403/rate-limit condition rather than an application crash. The post-change scoring rerun used a test-only public retrieval mirror for repository-list fixtures and raw-content HEAD checks only to confirm README presence. Those mechanisms exist only in `scripts/qa`, are not bundled, and are not production dependencies.

No application/scoring runtime errors occurred. Production fan-out remains bounded and independent of repository count except for required 100-item pagination.

## False Positives

### Resolved P0 false positive

Old, publicly engaged repositories were over-classified as archive candidates under `repo-v1`. Profile B made this failure severe and obvious. `repo-v1.1` resolves it by requiring low engagement before recommending archive and routing engaged historical repositories to manual review.

### Remaining non-blocking risks

- Profile A still has 20 archive candidates. Aggregate checks indicate these satisfy old age, low score, and low public engagement, but users must retain override control.
- Profile B now has 264 manual-review candidates. This is correct conservatism but creates review volume; bulk review and filters mitigate it.
- Keyword relevance can occasionally group a repository broadly even though it does not establish expertise. UI wording already limits the claim.

## False Negatives

- Potentially meaningful forks may remain manual review when public listing metadata cannot show customization or contribution depth. This is preferable to inventing evidence.
- README readiness remains `REVIEW` for most repositories because only a bounded shortlist is checked. Unknown is not treated as missing.
- Older engaged repositories moved to manual review rather than keep/showcase, so historically important work can still require user intervention. This is intentional.
- Profiles with sparse topics/descriptions may receive fewer diversity categories even if their codebase is diverse. The system does not inspect code to compensate.

## Rules That Need Adjustment

### Applied: historical engagement guard (`repo-v1.1`)

**Problem:** age and score could override strong historical public engagement.

**Why the old rule failed:** staleness reduced recency points and added a penalty, then the low resulting score triggered archive classification without an engagement guard.

**Generalized rule:** only recommend archive for an old, low-scoring original when public engagement is also limited. Route old engaged repositories to `REVIEW` with a historical-relevance explanation.

**Verification:** all Phase 2/3 tests pass; two new unit fixtures verify both old-engaged review and old-low-engagement archive behavior; the anonymous four-profile aggregate rerun removed all old-significant archive cases.

No other production rule change is supported by the cross-profile evidence.

## Rules That Should Remain

- Repository count is not a scoring input.
- Forks receive `FORK_REVIEW`, not automatic archive/cleanup.
- Fork assessment requires multiple signals and retains a manual-review fallback.
- Stars have a capped contribution and cannot bypass README/originality/showcase requirements.
- Recent activity is one factor and cannot create showcase value by itself.
- Unknown signals remain outside the positive denominator and are listed explicitly.
- README checks remain bounded rather than creating repository-wide fan-out.
- Showcase requires confirmed README, useful description, score threshold, original ownership, and non-archived state.
- Diverse recommendations seek uncovered relevance categories before filling by score.
- Category copy says “appears relevant” and does not claim expertise.
- Computed recommendations remain separate from local user decisions.

## P0 Issues

None open.

The historical-project false positive was P0 and is resolved in `repo-v1.1`. Regression, unit, integration, browser, type, lint, and build verification passed after the change.

## P1 Issues

- Add a dedicated “historical relevance” filter/review shortcut for profiles with many engaged old repositories.
- Explain when shortlist diversity is metadata-limited and why remaining slots were filled by score.
- Consider a separate readiness label for “not enriched yet” to reduce the visual volume of generic `REVIEW` without treating unknown data as missing.
- Add an optional test harness cache so a four-profile internal rerun does not consume the public quota repeatedly.

## P2 Issues

- Expand anonymous regression archetypes only when a new failure mode is reported.
- Consider calibrated engagement thresholds by repository age only if broader aggregate evidence supports it; do not tune them to these four fixtures.
- Consider accessible charts for internal aggregate comparison; do not expose fixture identities.

## Overall Verdict

**PASS WITH CHANGES**

The regression found one genuine cross-profile P0 generalization issue: historical, highly engaged repositories could be recommended for archive. The generalized `repo-v1.1` engagement guard is implemented and verified. No P0 issues remain.

Repository-count, fork, star, activity, missing-data, role-neutrality, profile-specific overfitting, and open-source bias checks passed within the available public evidence. Phase 4 remains unstarted.
