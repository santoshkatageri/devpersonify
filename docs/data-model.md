# Canonical Career Evidence Profile Model

Phase 4 promotes `src/domain/career-evidence-profile.ts` as the executable canonical profile contract. It preserves GitHub-observed, resume-provided, user-provided, and deterministically derived evidence as distinct provenance. The Phase 0 `developer-profile.ts` contracts remain shared low-level evidence/entity primitives and migration reference; they are not a second persisted profile root.

## Design rules

1. One `DeveloperProfile` powers audit-derived profile data, GitHub README, resume, professional presence review, portfolio generation, and job matching.
2. Domain entities use stable local IDs. External provider IDs are attributes, not canonical IDs.
3. External observations, user-entered claims, and deterministic derivations remain distinguishable.
4. Missing evidence means “not observed,” not “developer lacks this skill.”
5. Feature state references canonical entity IDs instead of cloning entities.
6. Persisted documents carry `schemaVersion` and timestamps.

## Root sections

| Section | Purpose |
|---|---|
| `identity` | Name, headline, location, summary |
| `contact` | Private contact channels |
| `links` | Public/profile links by platform |
| `targetRoles` | Current intended career direction |
| `skills` | Normalized skills and evidence references |
| `experience` | Employment/engagement history |
| `education` | Education history |
| `certifications` | Credentials supplied or observed |
| `projects` | Curated professional projects; may reference repositories |
| `repositories` | Repository evidence; not automatically projects |
| `openSource` | Contributions that may be outside owned repositories |
| `writing` | Technical/professional writing |
| `achievements` | Awards and notable outcomes |
| `professionalProfiles` | User-supplied platform content/review metadata |
| `careerPreferences` | Work mode, employment type, industry, location preferences |
| `evidence` | Reusable evidence registry |

## Evidence semantics

`EvidenceRef.origin` is mandatory:

- `observed`: retrieved or supplied from a named external source.
- `user_claim`: entered by the user and not independently observed.
- `derived`: produced by a deterministic rule from other evidence.

Every recommendation should retain its immediate score reasons. Future cross-feature claims should reference evidence IDs. UI copy must avoid converting `user_claim` into “verified.”

## Repository versus project

A repository is source evidence. A project is a curated professional unit.

- One project can reference multiple repositories.
- A repository can remain evidence without appearing as a project.
- Forks do not become projects automatically.
- `selectedForShowcase` is user-controlled project selection, not a scoring side effect.

## Dates

Dates use ISO 8601 strings. Full timestamps are expected for API observations. Partial real-world dates may initially use the first day of a known month only if the UI preserves the user's original precision; otherwise leave the field absent. Do not invent date precision.

## Persistence and migration

Phase 4 will define a storage envelope:

```ts
interface StoredDocument<T> {
  storageVersion: number;
  savedAt: string;
  payload: T;
}
```

Migration functions must be one-way, deterministic, tested, and preserve provenance. Unknown future versions must fail safely rather than being silently rewritten.

## Validation strategy

- Compile-time: strict TypeScript contracts.
- Runtime: integration-boundary guards for GitHub data in Phase 2.
- Form input: feature-specific validation with normalized output.
- Persisted content: version check followed by migration and runtime validation.

A schema dependency such as Zod is intentionally deferred. Add it only if boundary/form validation becomes repetitive enough to offset bundle and maintenance cost.

## Persona coverage review

- **Frontend engineer:** frameworks, UI projects, npm links, portfolio, visual/project evidence.
- **Backend engineer:** services, languages, databases, cloud/devops skills, writing, open source.
- **ML engineer:** model/data projects, Kaggle/Hugging Face links, writing/research, certifications.

The shared fields represent all three without role-specific root models. Specialized evidence can be added as optional typed entities after Phase 4 persona validation.
