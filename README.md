# DevPersonify

**Your work. Your proof. Your next opportunity.**

DevPersonify is a developer career evidence platform. V1 turns public GitHub data and user-supplied professional information into explainable repository recommendations, a canonical developer profile, and deterministic career outputs—without runtime AI.

## Current status

Phase 5 — Evidence-backed LaTeX Resume Builder: **PASSED**.

The canonical Career Evidence Profile powers independent GitHub Profile README and Resume Studio outputs. Resume Studio now exports both deterministic LaTeX and a real browser-generated Word/DOCX file from the same selections, ordering, and presentation overrides. Shared clipboard fallbacks, exact local downloads, and a privacy-preserving local feedback control complete V1 launch hardening without changing source evidence. No AI, external compiler/document service, backend, database, authentication, paid API, OAuth, GitHub token, or write operation is used.

## Intended V1 stack

- React + Vite + TypeScript
- Tailwind CSS
- Cloudflare Pages
- GitHub public REST API
- Browser-local persistence until a validated feature requires accounts/server storage
- Cloudflare Workers only if server-side behavior becomes necessary

## Phase 0 documents

- [Architecture](docs/architecture.md)
- [Canonical data model](docs/data-model.md)
- [Route map](docs/routes.md)
- [GitHub API requirements](docs/github-api.md)
- [Scoring specification](docs/scoring.md)
- [Prioritized backlog](docs/backlog.md)
- [Phase 0 report](docs/phase-reports/phase-0.md)

## Domain source

The initial canonical TypeScript contracts live in:

- `src/domain/developer-profile.ts`
- `src/domain/github.ts`
- `src/domain/scoring.ts`

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

The Vite development server binds to `0.0.0.0` for local and Arena live-preview use. Playwright's Chromium browser dependencies are required for `npm run test:e2e`.

## Product constraints

- No AI inference in the V1 runtime
- No destructive GitHub operations
- No GitHub token in browser code
- No authentication until a validated feature requires it
- Deterministic, transparent scoring
- Target infrastructure cost during validation: ₹0/month
