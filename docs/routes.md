# V1 Route Map

Routes are introduced only in the phase that owns their working capability. Future routes listed here are architectural reservations, not claims of current functionality.

| Route | Phase | Purpose | Data dependency | Initial access |
|---|---:|---|---|---|
| `/` | 1 | Landing and product positioning | Static | Public |
| `/audit` | 1–2 | Username input, then GitHub audit dashboard | GitHub public API | Public |
| `/audit/:username` | 2 | Shareable/reloadable audit target; recomputes public data | GitHub public API | Public |
| `/audit/:username/prepare` | 3 | Repository decision workspace, portfolio curation, profile context, and README generation | Audit snapshot + browser-local preparation state | Public/local |
| `/audit/:username/repositories/:owner/:repo` | 2/3 | Routed repository evidence trace with current-view previous/next navigation and local decision controls | Audit snapshot + URL view state + local preparation decisions | Public/local |
| `/github-profile` | 3 | Superseded by the contextual `/audit/:username/prepare` workflow | Audit + profile | Not routed |
| `/career/:username` | 4 | Resume input/review, canonical Career Evidence Profile, cross-source comparison, and local data management | Cached audit + local career profile | Public/local |
| `/profile` | 4 | Reserved generic profile route; contextual implementation uses `/career/:username` | CareerEvidenceProfile | Not routed |
| `/career/:username/readme` | 3/5 | Career-profile entry to independent GitHub README selection, presentation, safe preview, and Markdown export | CareerEvidenceProfile + local GithubReadmeConfiguration | Public/local |
| `/career/:username/resume` | 5 | Evidence selection, resume presentation overrides, structured preview, deterministic LaTeX export, and browser-local DOCX export | CareerEvidenceProfile + local LatexResumeConfiguration | Public/local |
| `/resume` | 5 | Reserved generic resume route; contextual implementation uses `/career/:username/resume` | CareerEvidenceProfile | Not routed |
| `/presence` | 6–7 | Manual professional profile review and role-specific presence map | DeveloperProfile + supplied text | Public/local |
| `/job-match` | 8 | Job description parsing and evidence match | DeveloperProfile + supplied JD | Public/local |
| `/portfolio` | 9 | Static portfolio/outputs configuration | DeveloperProfile | Public/local |
| `/privacy` | 1 | Plain-language data handling | Static | Public |
| `/methodology` | 2 | Scoring rules, limitations, version | Static/config | Public |
| `*` | 1 | Not-found page with recovery actions | Static | Public |

## Route rules

- The landing CTA links to `/audit`.
- Query state may hold filters, sorting, and tabs for reload/share behavior.
- Sensitive user-entered profile, resume, or job text must not be placed in URLs.
- A username is normalized before it enters a route and encoded when constructing URLs.
- Route loaders must display loading, error, empty, rate-limited, and stale-cache states.
- Future routes must not appear as functional navigation destinations until the owning phase ships. They may be described as “planned,” without misleading CTAs.
- Static hosting must support SPA fallback for deep links.
