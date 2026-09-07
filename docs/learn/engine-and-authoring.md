# DevPersonify Learn — engine & course-authoring reference

> **Where this lives:** the Learn experience (`/learn`, `/learn/21-days`, the
> generic Markdown course engine, and the rendered UI) has been **moved out of
> the DevPersonify product repository into its own Learn web application** to
> keep the DevPersonify product focused. This document is retained here as the
> **authoring/architecture reference** for that separate Learn app.
>
> The paths below (`src/features/learn/`, `content/learn/courses/`, `/learn`
> routes) refer to the **Learn application repository**, not this repository.
> This DevPersonify repo no longer ships the Learn UI or engine; it keeps only
> the course planning documents in `docs/learn/`.

Status (at time of relocation): Orientation (Day 0) and Missions 1–3 fully authored in Markdown; Missions 4–21 are inspectable previews. Curriculum content is authored in **Markdown**; the Learn engine is a course-agnostic renderer.

## Engine vs. content (architecture)

DevPersonify Learn separates **what a course teaches** from **how the experience works**:

- **The Learn engine is generic TypeScript** (`src/features/learn/`). It knows about courses, missions, sections, quizzes, evidence and progress — but nothing about Kafka, Docker or any discipline.
- **A course is specialized curriculum** in Markdown. The first course is **DevOps & Platform Engineering** ("21 Days — Build, Break & Operate").
- **Markdown is the curriculum source of truth** (`content/learn/courses/`). There is no competing TypeScript content object.

```
content/learn/courses/
└── devops-platform/
    ├── course.md     # course metadata, pillars, architecture, roadmap stubs
    ├── assets/       # course-owned binary assets (diagrams, figures)
    │   └── architecture-overview.svg
    ├── day-00.md     # Orientation
    ├── day-01.md
    ├── day-02.md
    └── day-03.md
```

A future course is **content-only**: add a sibling directory (`backend-engineering/`, `sre/`, …) with `course.md` + `day-*.md`. The loader discovers every `content/learn/courses/**/*.md` at build time via Vite `?raw` imports — no engine change, no runtime fetch, no backend.

### Engine modules

| Module | Responsibility |
|---|---|
| `learn-types.ts` | Generic content + progress contracts. No curriculum data. |
| `engine/markdown.ts` | Parses the Markdown convention into the content contract. |
| `engine/validate.ts` | Structural validation; malformed content throws `CourseContentError`. |
| `engine/course-loader.ts` | Discovers/loads/validates courses from Markdown. |
| `learn.ts` | Accessors, section/completion derivation, progress updates. |
| `learn-storage.ts` | Versioned browser-local persistence. |
| `career-bridge.ts` | Pending, user-provided Career Evidence review item. |
| `components/` | Renders whatever sections a mission declares — no day-specific React. |

## Authoring course content in Markdown

> **Where do I edit Day 3?** → `content/learn/courses/devops-platform/day-03.md`.

`day-XX.md` uses frontmatter for mission metadata, four-backtick section containers for the ordered sections, and triple-backtick structured JSON blocks for quizzes/evidence/etc. Sections render in the order declared; a mission includes only the sections it needs.

- Section types: `text`, `tools`, `modes`, `activity`, `quiz`, `defense`, `journal`, `evidence`.
- Activity `kind`: `context, modeling, exercise, build, experiment, break, observe, diagnose, fix, verify`.
- Activity modes use `::: mode=challenge|guided|deep` blocks; each has an objective first line, prose/code blocks, and a `checkpoints` JSON list.
- Structured blocks (JSON): `quiz`, `defense`, `journal`, `evidence`, `checkpoints`, `tools`, `concepts`, `resources`, `components`, `upcoming`, `outcomes`.
- Prose blocks: `bash`/language code, `callout tone="info|tip|warn"`, `diagram caption="…"`, paragraphs and `-`/`1.` lists.
- `missionType`: `ORIENTATION, ARCHITECTURE, MODELING, BUILD, INTEGRATION, OPERATE, OBSERVABILITY, FAILURE, RELIABILITY, DELIVERY, SECURITY, INCIDENT`.

## course.md — course-level contract

`course.md` holds course-wide metadata in frontmatter and structured JSON blocks:

- Frontmatter scalars: `slug`, `title`, `heroEyebrow`, `heroLabel`, `heroTitle` (course-page hero overrides), `subtitle` (the five-pillar line), `description`, `projectName`, `projectSummary`, `implementationNote`, `loopNote`, `progressionNote`.
- Frontmatter lists: `track` (the five pillars as text), `implementationStack` (current laboratory implementation, e.g. Java 21 / Spring Boot — replaceable, never a pillar), `technologies` (tools/practices), `philosophy` (the learning loop), `progression` (architecture progression stages).
- Structured blocks (JSON):
  - `` ```architecture `` — `{ "asset": "assets/<file>.svg", "alt": "…accessible alt text…", "caption": "…", "ascii": "…fallback…" }`. An asset **requires** non-empty `alt`. The loader bundles the file (Vite `?url` glob over `content/learn/courses/**/*.{svg,png,jpg,…}`) and resolves the relative path to the served URL; the generic renderer (`components/architecture-figure.tsx`) shows the image or falls back to `ascii`. Assets belong to course content — never hard-code a diagram in React.
  - `` ```pillars `` — `[{ "name", "detail" }]` the capabilities the course builds.
  - `` ```progression `` — `[{ "stage", "detail" }]` architecture progression.
  - `` ```roadmapGroups `` — `[{ "label", "fromDay", "toDay" }]` optional roadmap grouping; must cover missions 1–21 without gaps/overlap.
  - `` ```components `` — platform component roles; `` ```upcoming `` — `DayStub` previews for unauthored missions.

**Identity rule:** the five pillars (what you learn — DevOps, System Design, Distributed Systems, Cloud Engineering, Infrastructure as Code) lead; the laboratory stack (what you use — Linux, Docker, Kafka, Terraform, AWS, GitHub Actions, Java/Spring, …) is secondary. Java/Spring is an implementation choice, not the course identity — "Application technology is replaceable. Engineering concepts are not."

## Course semantics

- **Day 0 is Orientation**, not a learning mission; completing it does not advance the denominator.
- **Missions 1–21** are the 21 learning missions (denominator derived from content = 21). Day 0 + Mission 1 → **1/21**.
- The UI says **"Orientation + 21 learning missions"** (22 inspectable entries), never "22 missions".

## Routes

| Route | Layout |
|---|---|
| `/learn` | Site header + learning hub |
| `/learn/21-days` | Site header + course overview |
| `/learn/21-days/day/:day` | **Focused mission layout** (Back to Learning; no marketing nav) |

## Completion, modes, progress, evidence

- Completion is **deterministic and section-derived**: activity checkpoints, quiz checked, defense answered (≥20 chars), evidence ack + ≥1 record. Scrolling never completes a mission.
- Mission-complete renders **`day.completion.outcomes`** (content-declared; never generic Built/Broke hard-coding).
- Modes (Challenge/Guided/Deep Guided) change guidance depth only; the same outcome/evidence applies.
- Progress persists to `devpersonify:learn:v1` (versioned, sanitized); resume goes to the first incomplete section.
- Evidence is manual/honest — never auto-verified. **Add to Career Evidence** creates a PENDING `USER_PROVIDED` project review item; nothing is written silently.

## Intentionally NOT implemented

Backend/accounts/auth/Supabase/LMS/CMS/AI grading; Missions 4–21 lab content (previews only); XP/streaks/badges/leaderboards.

## Repository strategy (planning)

The course laboratory application and its evolution across the 21 missions are
planned (not yet implemented) in these documents:

- [starter-repository-spec.md](./starter-repository-spec.md) — exactly what `event-driven-microservices-starter@main` contains on Day 1.
- [repository-evolution.md](./repository-evolution.md) — the 21-day map: engineering capability, repository/config/DB/Kafka/Docker/observability/CI/Terraform/security changes, verification, evidence, and `mission-N` checkpoint per day.
- [checkpoint-strategy.md](./checkpoint-strategy.md) — immutable `mission-N` tags vs branches; recovery without cloning the completed reference.
- [reference-vs-starter.md](./reference-vs-starter.md) — what is reused from the completed `event-driven-microservices` reference and what must not be leaked.

The starter repository, tags, and Day 4–21 lesson bodies are **not** created
by these planning documents.
