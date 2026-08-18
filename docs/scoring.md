# Deterministic Repository Scoring Specification (repo-v1.1)

## Purpose and limits

The score ranks repository evidence for portfolio review. It is not a measure of developer ability, code quality, employability, or work performed privately. Every result exposes its inputs, point contributions, unknowns, warnings, rule version, and audit timestamp.

Scoring must be a pure function of normalized repository evidence plus `auditAt`. It must never use the current clock internally, so the same inputs produce the same result.

## Score calculation

Positive factors have a total maximum of 100 points. A factor can be unavailable when its endpoint was not fetched.

```text
availableRatio = earnedPositivePoints / availablePositiveMaximum
normalizedPositive = roundHalfUp(availableRatio * 100)
raw = normalizedPositive + applicablePenalties
score = clamp(raw, 0, 100)
```

Normalization prevents an unfetched README/release/PR signal from being treated as absent. A known absence earns zero and remains in the denominator. At least 55 available positive points are required for medium confidence and 75 for high confidence; otherwise confidence is low and classification defaults toward `REVIEW` unless a precedence rule applies.

All age calculations use whole elapsed days from `auditAt` and valid API timestamps.

## Positive factors

| Factor | Max | Deterministic rule |
|---|---:|---|
| Original vs fork | 8 | Original: 8; fork: 0 |
| Recent activity | 18 | Days since `pushedAt`: ≤30: 18; 31–90: 15; 91–180: 11; 181–365: 7; 366–730: 3; >730: 0; unknown: unavailable |
| Repository age/maturity | 5 | Age since creation: <14d: 1; 14–89d: 3; 90–730d: 5; >730d: 4 |
| Stars | 7 | 0: 0; 1–2: 2; 3–9: 4; 10–49: 6; ≥50: 7 |
| Forks received | 3 | 0: 0; 1–2: 1; 3–9: 2; ≥10: 3 |
| Description quality | 10 | Missing/trimmed <10 chars: 0; 10–39: 4; 40–120: 8; 121–200: 10; >200: 8. Subtract 2 (floor 0) for boilerplate-only text such as “my project”, “test”, or unchanged generated descriptions |
| README | 15 | Confirmed present: 15; confirmed absent: 0; not fetched: unavailable |
| License | 5 | Valid non-`NOASSERTION` SPDX ID: 5; absent/`NOASSERTION`: 0 |
| Topics | 7 | 0: 0; 1: 3; 2: 5; ≥3: 7; count normalized unique topics |
| Releases | 5 | Release in last 365d: 5; older release: 3; confirmed none: 0; not fetched: unavailable |
| Issue activity | 3 | At least one issue opened or closed in last 365d: 3; older only/none: 0; not fetched: unavailable. `open_issues_count` alone does not prove activity |
| Pull request activity | 4 | At least one PR merged/closed in last 365d: 4; older only/none: 0; not fetched: unavailable |
| Project completeness | 10 | 2 points each for confirmed README, description ≥40 chars, homepage/demo URL, release or version tag, and one completion signal (archived as intentionally finished, README usage/setup section, or explicit stable release). Unknown sub-signals are excluded from this factor's proportional denominator |

“Recent activity” reflects repository push recency, not the user's total GitHub contribution activity.

## Penalties

Penalties apply after positive normalization and are always visible reasons.

| Signal | Penalty | Rule |
|---|---:|---|
| Archived repository | -35 | `archived === true` |
| Fork repository | -20 | `fork === true` |
| Stale repository | up to -10 | Original, not archived, and last push >730d: -10; 366–730d: -5; otherwise 0 |

The staleness penalty is intentional portfolio hygiene pressure beyond the zero/low recency factor. The explanation must make the double influence visible.

## Classification precedence

Apply in this exact order:

1. **FORK_REVIEW** — repository is a fork. Forks may be useful evidence, but require manual review; score does not auto-promote them.
2. **ARCHIVE** — already archived, or original + not pushed for >730 days + score <40 + limited public engagement (<3 stars and <2 forks received). This is a recommendation to consider archiving, never an automatic action.
3. **REVIEW (historical relevance)** — original + not pushed for >730 days + score <50 + meaningful public engagement (≥3 stars or ≥2 forks received). Older engaged repositories require manual historical review rather than an archive recommendation.
4. **REVIEW (evidence coverage)** — available positive maximum <55, repository is <14 days old, or required timestamps are invalid. Evidence is too incomplete/early for a confident recommendation.
5. **SHOWCASE** — score ≥70, description ≥40 characters, README confirmed present, not archived, not a fork.
6. **KEEP** — score ≥50.
7. **CLEANUP** — score <50 and pushed within 730 days. Actionable metadata/documentation gaps should be listed.
8. **REVIEW** — fallback for ambiguous results.

A user override never rewrites the computed result. Store `{computedClassification, userClassification, reason?, updatedAt}` separately so the original explanation remains auditable.

## Confidence

- **High:** ≥75 available positive points and all of README, description, activity, and repository state are known.
- **Medium:** ≥55 available positive points.
- **Low:** <55 available positive points or invalid critical timestamps.

Confidence is evidence coverage, not probability that the classification is correct.

## Portfolio health (portfolio-v1)

Portfolio health uses original, non-archived repositories only. If none exist, return score 0 with an explicit empty-state explanation—not a failing personal judgment.

| Component | Weight | Rule summary |
|---|---:|---|
| Showcase quality | 35% | Mean of the top up to 6 eligible repository scores; missing slots do not count as zero |
| Documentation coverage | 20% | Percent with confirmed README; unknowns excluded and lower confidence |
| Metadata coverage | 15% | Average coverage of useful description, topics, and license |
| Maintenance health | 15% | Percent pushed within 365 days, capped to the most recent 20 originals to avoid punishing long histories |
| Portfolio focus | 15% | 100 for 3–6 showcase candidates; 80 for 1–2 or 7–10; 60 for 11–15; 40 for 16+. If zero, 30 when eligible repositories exist |

```text
portfolioHealth = roundHalfUp(
  showcaseQuality * 0.35 +
  documentationCoverage * 0.20 +
  metadataCoverage * 0.15 +
  maintenanceHealth * 0.15 +
  portfolioFocus * 0.15
)
```

The dashboard also reports raw counts independently: total repositories, originals, forks, active (push ≤365d), inactive (>365d or unknown), and each classification count.

## Explainability contract

Each repository result contains:

- `version`, `score`, classification, confidence
- one reason per applied/known factor
- points and observed value for each reason
- unknown evidence list
- warnings and classification precedence reason
- audit timestamp

UI must provide a methodology link and must not use copy such as “bad developer,” “low skill,” or “guaranteed recruiter impact.” Recommended language: “This repository has limited public portfolio evidence because…”

## Calibration fixtures for Phase 2

Tests must include at least:

1. Recent original with README, strong description, topics, and release → likely `SHOWCASE`.
2. Recent original missing README/description/topics → `CLEANUP`.
3. Old untouched original with low evidence → `ARCHIVE` recommendation.
4. High-star fork → `FORK_REVIEW`, regardless of score.
5. Already archived repository → `ARCHIVE`.
6. New repository under 14 days → `REVIEW`.
7. Repository with unfetched enrichment → unknown factors, normalized score, reduced confidence.
8. Fixed audit timestamp snapshot → identical output across repeated runs.

False positives/negatives are tuned by changing a versioned configuration and fixtures—not hidden one-off conditions.
