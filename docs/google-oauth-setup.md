# Google OAuth Setup

## Phase 1

The current add-in uses the Google Identity Services popup token flow directly inside the Office task pane.

What this phase supports now:

- first-use Google sign-in initiated from the add-in
- callback/error handling inside the task pane
- session-scoped Google token storage
- Gmail Draft creation
- Apps Script project export
- Apps Script web app deployment

What you need for this phase:

1. A Google Cloud project
2. `Gmail API` enabled
3. `Apps Script API` enabled
4. A Web OAuth client ID ending with `.apps.googleusercontent.com`
5. Authorized JavaScript origins including:
   - `https://localhost:3000` for local development
   - your production add-in origin for deployed validation

Important distinction:

- the add-in itself uses the Google Identity Services popup token flow and relies on `Authorized JavaScript origins`
- the add-in does not need a redirect URI in normal taskpane usage
- the local live-validation script still uses `http://localhost:3000/oauth2callback` as a redirect URI, but that is only for `npm run google:validate-live`

Public runtime variable:

```env
REPORTFORGE_GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
```

Convenience option for local operators:

- place the downloaded Google OAuth file in `config/cdp.json`
- or keep a sanitized public copy in `config/google-oauth.client.json`
- ReportForge reads only the public `client_id` from these files for the taskpane build
- the Google client secret must remain operator-only and is never injected into the browser bundle

Important:

- do not use a Google API key starting with `AIza...`
- do not embed a Google client secret in the add-in bundle
- tokens and OAuth runtime state are kept in session storage only

## Phase 2

Use live Google credentials only to validate the real cloud project and consent screen.

Still required for final live qualification:

- real Google test account sign-in
- consent screen review
- production origin validation
- Gmail draft smoke test
- Apps Script export smoke test
- Apps Script deployment smoke test

Reusable command:

```powershell
npm run build:test
npm run google:validate-live -- "C:\Users\Labry\Downloads\cdp.json"
```

Google client secret and redirect URIs are only needed if you later introduce a backend authorization-code flow. They are not required by the current client-side popup implementation.
