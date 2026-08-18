# DevPersonify V1 Architecture

Status: Phase 0 baseline  
Date: 2026-08-18

## 1. Repository discovery

The workspace was empty at inspection time: no source, package manifest, Git history, framework, dependencies, tests, or deployment configuration existed. There is therefore no reusable implementation and no migration constraint.

Phase 0 adds only documentation, canonical domain contracts, and TypeScript validation. The product shell is intentionally deferred to Phase 1.

## 2. Architecture decision summary

DevPersonify V1 will be a client-first static web application:

```text
Browser
  ├── React UI + route pages
  ├── application use cases
  ├── deterministic domain rules
  ├── GitHub REST adapter (read-only/public)
  └── local storage adapter (versioned, replaceable)
             │
             └── api.github.com (public REST API)

Build: Vite + TypeScript
Host: Cloudflare Pages
Optional later boundary: Cloudflare Worker only when a demonstrated need exists
```

### Why client-first

- Phase 2 only needs public, read-only GitHub data.
- GitHub's REST API supports browser requests and requires no token for the initial flow.
- Static deployment keeps initial infrastructure at ₹0/month.
- No account or database is needed to validate the anonymous audit.
- It avoids premature security, privacy, migration, and operational burdens.

### Known client-first constraint

Unauthenticated GitHub REST requests are rate limited (typically 60 requests/hour per originating IP). The UI must budget requests, show reset information, avoid eager detail calls, and cache snapshots locally. A Worker proxy is **not** automatically the solution: embedding a shared GitHub token would shift abuse and quota risk to DevPersonify. Add a Worker only after measurement demonstrates a need and a secure rate-limiting/caching design is approved.

## 3. Layer boundaries

```text
src/
  app/              composition, router, providers
  pages/            route-level UI
  components/       reusable presentation components
  features/         feature-specific UI and application orchestration
  domain/           pure types, scoring, classification, profile rules
  integrations/     GitHub HTTP DTOs, validation, mapping
  storage/          versioned browser persistence abstraction
  styles/           Tailwind entry and design tokens
  test/             shared fixtures and test setup
```

Dependency direction:

1. `domain` depends on no UI or HTTP library.
2. `integrations` maps untrusted external DTOs to domain types.
3. `features` invokes domain rules and adapters.
4. `pages` compose features.
5. UI components do not call GitHub directly.

This prevents GitHub DTOs, resume models, and page-local state from becoming competing profile models.

## 4. Technology choices

| Concern | V1 choice | Rationale |
|---|---|---|
| UI | React | Preferred stack; mature and maintainable |
| Build | Vite | Static-first, fast, Cloudflare Pages compatible |
| Language | TypeScript strict mode | Protect domain and external-data boundaries |
| Styling | Tailwind CSS | Preferred stack and low runtime cost |
| Routing | React Router | Clear route ownership; add in Phase 1 |
| Components | Small local primitives first | Avoid importing a large design system prematurely |
| Validation | Focused boundary guards initially | Avoid adding schema libraries until repetition justifies one |
| State | React state/context by feature | No global state package until demonstrated need |
| Persistence | Versioned localStorage adapter | Anonymous workflow; replaceable later |
| Testing | Vitest + Testing Library in Phase 1 | Vite-aligned; domain tests prioritized |
| Hosting | Cloudflare Pages | Free static hosting |
| Backend | None initially | Worker only for actual server-side requirements |
| Analytics | None in baseline | Add privacy-respecting free analytics only after approval |

## 5. Canonical data ownership

`DeveloperProfile` is the single canonical model. GitHub is one evidence source, not the profile itself.

- External API payloads are validated and normalized before use.
- Every observed item carries provenance.
- Manual entries are marked `user_claim`.
- Deterministic conclusions are marked `derived` and reference evidence.
- README, resume, portfolio, presence review, and job match consume this model.
- Module-specific display state may reference canonical IDs but must not duplicate profile entities.
- Schema changes increment `schemaVersion` and require migration for persisted profiles.

See `docs/data-model.md` and `src/domain/developer-profile.ts`.

## 6. Request and data flow for GitHub audit

1. Normalize and validate the username locally.
2. Read a fresh cached audit, if available.
3. Fetch `GET /users/{username}`.
4. Fetch all public repositories using `per_page=100` and Link-header pagination.
5. Validate required fields and normalize API DTOs.
6. Score each repository with a frozen rule version and audit timestamp.
7. Classify repositories using deterministic precedence.
8. Aggregate portfolio health from repository results.
9. Render scores, signals, uncertainty, limitations, and rate-limit status.
10. Persist a versioned, non-sensitive audit snapshot locally.

README, release, contributor, PR, and activity endpoints are not fetched for every repository during the list request. Detail evidence is fetched lazily for shortlisted/reviewed repositories so the unauthenticated quota remains usable.

## 7. Security and privacy

- Public GitHub reads only; no OAuth and no write scopes in the initial audit.
- No token or secret in browser source, environment variables exposed to Vite, logs, or persisted snapshots.
- Validate API JSON at the integration boundary; do not trust field shape or content.
- Render user/external text through React text nodes. Never inject GitHub text as HTML.
- Sanitize any future Markdown HTML preview.
- Validate protocols for links (`https:`; selectively allow `mailto:`/`tel:` where appropriate).
- Treat profile and resume text as private even when stored locally.
- Do not send profile content to telemetry.
- Local-storage export/reset must be explicit and non-destructive by default.
- Generated Markdown and LaTeX require context-appropriate escaping.

## 8. Performance and accessibility baseline

- Route-level code splitting after the shell has more than two substantive routes.
- One repository list call per page, maximum `per_page=100`.
- Avoid N+1 API requests on initial audit.
- Score repositories with pure synchronous functions; use stable memoization only if measured.
- Table must have a mobile card alternative or horizontal-safe layout.
- Keyboard focus, semantic landmarks, form labels, visible error text, reduced motion, and WCAG AA contrast are release requirements.
- Loading, empty, error, not-found, and rate-limited states are first-class states.

## 9. Deployment

Phase 1 should produce static files deployable to Cloudflare Pages. SPA deep links need a Pages fallback (`public/_redirects` with `/* /index.html 200`) or an equivalent routing strategy. No Wrangler configuration is needed until a Worker or Pages Functions capability is approved.

Suggested Pages settings:

- Build command: `npm run build`
- Output directory: `dist`
- Node: current supported LTS (minimum 20)
- Secrets: none for Phase 1–3 public flow

## 10. Architecture decision triggers

Do not add infrastructure because a later phase mentions it. Reassess only when a feature proves the need:

| Trigger | Possible decision |
|---|---|
| Users need cross-device persistence | Auth + D1/Supabase evaluation in Phase 10 |
| Public API quota blocks validated usage | Caching Worker with abuse controls; do not expose shared token |
| GitHub OAuth is required | Worker-held OAuth secret, minimal read scopes |
| Static generation requires server processing | Narrow Worker endpoint |
| Local model becomes too complex | Evaluate a small state library with measured justification |

## 11. Explicitly excluded from V1 baseline

AI inference, RAG, vector storage, LinkedIn scraping, destructive GitHub actions, billing, a job board, social networking, mobile apps, microservices, automatic repository changes, and authentication before demonstrated need.

## 12. Risks

1. **GitHub unauthenticated rate limit:** mitigate with pagination efficiency, local cache, lazy enrichment, clear reset state.
2. **False precision in scoring:** show raw signals, version rules, expose overrides, and label unknown evidence.
3. **README detection cost:** list responses do not prove README presence; enrich only candidates or treat it as unknown.
4. **GitHub activity blind spots:** public repository metadata is not a complete measure of skill or work.
5. **localStorage privacy/size:** store only necessary normalized content, provide reset/export, migrate by schema version.
6. **Model expansion pressure:** add fields through canonical schema review rather than page-specific models.
