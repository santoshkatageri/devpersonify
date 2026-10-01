# Tally feedback and Google Sheets

## Status

The application defaults to the published form https://tally.so/r/PdVrRd. The Google Sheets connection `devpersonify-tally` is configured. On 2026-10-01, a synthetic response sent through the local app’s embedded form appeared in both Tally and Google Sheets (submission ID `5XDPPZ6`, marker `DP-TALLY-20261001`). Tally recorded `product=DevPersonify`, `area=general`, and `source=app`; name, email, and testimonial permission were left blank. The destination sheet reported “Private to only me.” Production deployment is still pending. Local browser drafts are the fallback; existing drafts are never automatically sent. The app does not receive a Tally submission callback or claim Google Sheets delivery. Tally displays submission confirmation; the integration owner verifies sheet delivery in Tally.

## Create the form

In your Tally account, create **DevPersonify feedback** with this introduction:

> What helped you most? Share a small win or an idea for improving DevPersonify. Please do not include your resume or private career details. Your response is received through Tally and copied to our private Google Sheet for review. For bugs, use our GitHub Issues link.

Suggested fields:

- Experience (required): Great / Useful / Needs work.
- Feedback type (required): What helped / Suggestion.
- Message (required): What worked well, or what would make it better?
- Name (optional).
- Email (optional): Only if you would like a reply.
- Permission to feature this feedback publicly (optional, unchecked by default). Only publish feedback after explicit permission and review.
- Hidden fields named exactly `product`, `area`, and `source` (insert using Tally’s `/hidden` block).

Add a bug-report link to https://github.com/santoshkatageri/devpersonify/issues/new and a thank-you screen: “Thank you! Your feedback has been submitted.” Enable Tally’s spam protection and optional owner email notifications in form settings. Keep submissions private. The public form needs to be published to accept responses; the response spreadsheet must not be published.

## Connect Google Sheets

1. In the published form, open **Integrations → Google Sheets → Connect**.
2. Sign in to the Google account that will own the feedback sheet, review the requested access, and authorize Tally.
3. Create/select a private spreadsheet named **DevPersonify feedback** and a response sheet. Save the connection.
4. Keep Tally’s response columns intact. Add review columns to the right: `Status`, `Priority`, `Owner`, `Notes`, `GitHub issue URL`. Suggested statuses: New, Reviewed, Planned, Done. Do not prefill blank response rows with status values; Tally writes to the first blank row.
5. If needed, enable export of existing Tally submissions. This does not import DevPersonify’s local drafts.

No Zapier, backend, Google API key, or service account is required. Google authentication stays between the account owner and Tally.

## Configure DevPersonify

The published form ID `PdVrRd` is the application default, so deployment needs no additional configuration. To override it, set this public build environment variable in Cloudflare Pages:

```text
VITE_TALLY_FEEDBACK_FORM_ID=PdVrRd
```

For local overrides, copy `.env.example` to `.env.local`, set the desired form ID, and restart/rebuild Vite. An explicitly empty value disables Tally and restores local drafts. Never place an API token, Google credential, or webhook secret in a `VITE_` variable. Rebuild and deploy after setting the ID.

Opening Feedback loads the form in a wide modal on desktop and a full-screen modal on mobile. A desktop Expand control and a new-tab link provide more room. The iframe fills the remaining viewport; its form is the only scroll area. Background scrolling is locked, native dialog focus is contained, and the close control stays visible. The GitHub issue link appears once inside Tally. The iframe uses `no-referrer`. Only `product=DevPersonify`, the general app section, and `source=app` are passed. There is no Tally script running across the site, no automatic route/query forwarding, and no upload of profile data. The iframe is removed when the panel closes.

## Verify before launch

- Open Feedback on desktop and mobile; confirm the form loads and the separate link works.
- Submit one clearly labelled synthetic test response through the real form.
- Confirm it appears in Tally submissions and as exactly one matching Google Sheets row, including hidden fields.
- Check Tally’s integration log for Delivered; on failures inspect the error and resend there. A Tally thank-you screen alone does not prove Sheets delivery.
- Confirm respondents cannot view the response sheet and GitHub remains the bug destination.
- Test blocked third-party content using the new-tab fallback. If the form ID is explicitly set empty, rebuild and verify honest local-only draft wording.

## Official references

- https://tally.so/help/google-sheets-integration
- https://tally.so/help/embed-your-form
- https://tally.so/help/hidden-fields
