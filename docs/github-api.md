# GitHub Public REST API Requirements

API version target: `2022-11-28`  
Authentication in initial audit: none  
Operations: public read-only

## Required initial endpoints

### User

`GET https://api.github.com/users/{username}`

Required normalized fields:

- `login`, `id`, `name`, `avatar_url`, `html_url`
- `bio`, `company`, `blog`, `location`
- `public_repos`, `followers`, `following`
- `created_at`, `updated_at`

### Repositories

`GET https://api.github.com/users/{username}/repos?type=owner&sort=updated&direction=desc&per_page=100&page={n}`

`type=owner` is deliberate: the audit should include repositories owned by the user, including their forks, but not organization repositories merely accessible to them.

Required normalized fields:

- Identity: `id`, `name`, `full_name`, `owner.login`, `owner.avatar_url`, `html_url`
- Content metadata: `description`, `homepage`, `language`, `topics`, `license.spdx_id`, `default_branch`
- State: `fork`, `archived`, `is_template`, `visibility`
- Counts: `stargazers_count`, `forks_count`, `watchers_count`, `open_issues_count`, `size`
- Capability flags: `has_issues`, `has_projects`, `has_wiki`
- Dates: `created_at`, `updated_at`, `pushed_at`

Send headers:

```http
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

Do not send a client-side token.

## Pagination

- Request `per_page=100`.
- Follow the RFC 5988 `Link` response header's `rel="next"` URL until absent.
- Do not infer completion from the user's `public_repos` count; API filters and concurrent changes can differ.
- Set a defensible safety ceiling (initially 50 pages / 5,000 repositories) and show a partial-results warning if reached.
- Preserve the audit timestamp for deterministic age/activity calculations.
- Cancel outstanding requests when a username changes or the user cancels.

## Rate limits

Read and expose:

- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`
- `x-ratelimit-resource`

Handling:

- On `403` or `429`, inspect headers and response message rather than assuming all 403s are quota failures.
- Show the reset time in the user's locale when quota is exhausted.
- Offer a recently cached result with an explicit “captured at” timestamp.
- Do not automatically retry quota errors.
- Retry transient network/5xx failures at most twice with bounded exponential backoff and jitter; never retry 404.
- Avoid README/detail fan-out on initial load.

## Lazy enrichment endpoints (Phase 2/3)

These are conditional, not initial-list requirements:

| Evidence | Endpoint/approach | Policy |
|---|---|---|
| README | `GET /repos/{owner}/{repo}/readme` | Candidate/detail only; 404 means absent |
| Releases | `GET /repos/{owner}/{repo}/releases?per_page=1` | Candidate/detail only |
| Contributors | `GET /repos/{owner}/{repo}/contributors?per_page=1&anon=1` | Optional; not needed for base score |
| Pull requests | Search/issues APIs | Defer unless quota and product value justify it |
| Languages | `GET /repos/{owner}/{repo}/languages` | Detail only; primary language is already listed |
| Repository detail | `GET /repos/{owner}/{repo}` | Use only when list payload lacks a required field |

Signals unavailable because they were not fetched must be `unknown`, not scored as false. The base scoring specification defines a normalized-score denominator for available evidence.

## Input validation

GitHub usernames:

- 1–39 characters.
- ASCII alphanumeric or single hyphens between alphanumeric groups.
- No leading/trailing hyphen and no consecutive hyphens.
- Accept a pasted `https://github.com/{username}` URL by extracting only a valid first path segment; reject repository URLs as usernames.
- Use `encodeURIComponent` when constructing paths even after validation.

## Response validation and normalization

External JSON is untrusted. Runtime guards must verify required types, tolerate documented nullable fields, reject impossible required shapes, and default only safe collection fields (for example, missing topics to `[]` if compatible with the API version). Preserve neither unknown HTML nor API errors as renderable markup.

Map snake_case transport DTOs into camelCase domain snapshots. The rest of the application must not import GitHub transport DTOs.

## Error taxonomy

- `INVALID_USERNAME`: local validation failure
- `NOT_FOUND`: valid input but GitHub user not found
- `RATE_LIMITED`: primary quota or secondary limit reached
- `NETWORK_ERROR`: offline, timeout, DNS, or aborted unexpectedly
- `MALFORMED_RESPONSE`: external response fails validation
- `GITHUB_UNAVAILABLE`: GitHub 5xx after bounded retry

User copy should explain recovery and avoid raw stack traces.

## Caching

Initial recommendation:

- Cache a completed normalized audit in localStorage for 15 minutes.
- Key by normalized username + audit/scoring schema versions.
- Store fetched timestamp and rate-limit snapshot.
- Permit explicit refresh.
- Do not cache failed responses.
- Fall back to stale cached results when offline/rate-limited, clearly labeled.

Validate browser storage limits before storing exceptionally large accounts; evict oldest audit snapshots rather than profile data.
