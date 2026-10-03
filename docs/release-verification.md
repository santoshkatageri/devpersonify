# Release verification

## Before deployment

The **Check application** workflow runs type checks, lint, unit tests, a production build, and browser tests on pull requests and pushes to `main`, `launch-*`, `release/**`, `p1-*`, and `p1/**` branches. It does not deploy or merge anything.

Production builds emit `/release.json` containing a full commit SHA, a dirty-worktree flag, build time, and SHA-256 hashes of JavaScript/CSS assets (including lazy-loaded parsers and PDF workers). HTML carries the same commit marker. This is public release metadata; no branch name, local path, token, or other environment value is published. The commit is taken from `CF_PAGES_COMMIT_SHA`, then `GITHUB_SHA`, then the local Git checkout. Unidentifiable builds use `unknown` and cannot pass release verification. A build from uncommitted files also cannot pass.

## After Cloudflare reports deployment complete

1. Find the exact deployed **40-character commit SHA** in Cloudflare or GitHub. After a squash/merge, use the new commit on `main`, not the old PR head.
2. In GitHub Actions, open **Verify deployed release** and choose **Run workflow**. Set the HTTPS deployment origin and expected SHA. A manual workflow becomes available in the Actions UI once its definition is on the default branch.
3. Alternatively, with Node 22 installed, run:

   ```sh
   npm run verify:release -- https://devpersonify.learnwithsk.dev FULL_40_CHARACTER_COMMIT_SHA
   ```

The check is read-only and needs no provider token. It verifies a clean, exact release identity, all 12 listed direct SPA routes, the application shell and its linked assets, content types, and every JavaScript/CSS asset hash. Redirects are rejected: use the final canonical HTTPS origin. This detects old deployments, mixed/stale assets, missing lazy chunks, and hosting rewrite problems. Asset hashes check consistency with the manifest, not independent release provenance.

## User-flow checks still required

Passing the script confirms hosting and release identity, not application interaction. Before announcing a beta, verify the production site in a clean desktop browser and a mobile viewport:

- Analyze a public GitHub username; confirm helpful handling of invalid usernames and API failures.
- Review career evidence before accepting it, then check resume and README downloads.
- Download a backup, restore it in a fresh browser context, and confirm the returning-user home and navigation populate.
- Import a selectable-text LinkedIn PDF, inspect the mapped/unmapped sections, edit a section, and run the review. Missing sections should remain “not supplied.” Confirm clear/reload removes this temporary input.
- Submit one clearly labeled test response through Tally and verify its arrival in the private Google Sheet. Remove the test response when finished.
- Check important links, keyboard focus, mobile layout, and production privacy guidance.

Do not submit private profile content to a feedback form as a test. Keep test downloads and personal PDFs out of the repository. Record the tested URL, commit, date, and any failed checks before announcing.
