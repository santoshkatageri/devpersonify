# DevPersonify

**Your work. Your proof. Your next opportunity.**

DevPersonify is a developer career evidence platform. V1 turns public GitHub data and user-supplied professional information into explainable repository recommendations, a canonical developer profile, and deterministic career outputs—without runtime AI.


Career profiles show backup reminders after resume import, evidence review, and profile-stage milestones. Local history retains up to five recent versions (fewer when size or storage limits apply), with manual checkpoints and restore. Before replacing a profile, the app retains the current version or stops the replacement if it cannot do so. Backups contain the current profile only. History and backup status are browser-local; clearing evidence also removes retained history.

## Current status

Launch update: profile backups can be downloaded from Career Profile or Backup & restore and restored on a new browser at `/restore`. Manual LinkedIn review at `/career/:username/linkedin-review` compares pasted profile wording with stored evidence without accessing LinkedIn or retaining pasted text. Saved career profiles remain usable without a new GitHub request; imported GitHub evidence is preserved until the user clears it.

Feedback uses the published [DevPersonify Tally form](https://tally.so/r/PdVrRd). Tally’s native Google Sheets connection is configured separately in Tally; see [setup instructions](docs/feedback-tally.md). Override `VITE_TALLY_FEEDBACK_FORM_ID` at build time to select another form, or explicitly set it empty to use local browser drafts without delivery. Bugs go to public GitHub Issues. No Supabase or Google credentials are needed in this app.

Phase 5 — Evidence-backed LaTeX Resume Builder: **PASSED**.

The canonical Career Evidence Profile powers independent GitHub Profile README and Resume Studio outputs. Resume Studio now exports both deterministic LaTeX and a real browser-generated Word/DOCX file from the same selections, ordering, and presentation overrides. Shared clipboard fallbacks, exact local downloads, and a privacy-preserving local feedback control complete V1 launch hardening without changing source evidence. Career tools use no AI, external compiler/document service, backend, database, authentication, paid API, OAuth, GitHub token, or repository write operation. Optional feedback delivery uses an external Tally form; Google authorization takes place in Tally’s integration settings.

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

The Vite development server binds to `0.0.0.0` for local and Arena live-preview use. Install test browsers with `npx playwright install --with-deps chromium firefox webkit` before `npm run test:e2e`. Exact clipboard permission tests run in Chromium; independent profile backup and LinkedIn tests, audit navigation, and automated accessibility checks also run in Firefox and WebKit.

## Product constraints

- No AI inference in the V1 runtime
- No destructive GitHub operations
- No GitHub token in browser code
- No authentication until a validated feature requires it
- Deterministic, transparent scoring
- Target infrastructure cost during validation: ₹0/month
