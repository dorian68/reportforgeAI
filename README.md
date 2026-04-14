# ReportForge AI

ReportForge AI is an Excel-native Office Add-in that turns a selected Excel range into:

- a workbook report inside Excel
- a Google Apps Script reporting app package
- an email draft
- a PowerPoint-ready slide deck plan and exportable deck

The add-in also includes a bounded `Agent Mode` that can preview and execute safe Excel reporting actions inside the workbook.

The product stays Excel-first. It works deterministically with no backend by default, then optionally applies AI narrative enhancement through a user-supplied OpenAI-compatible provider. Reporting outputs now share a structured report brief, a cross-channel story plan, and a conversational intake layer before generation.

## Product Boundary

What is production-ready in this repository:

- Excel selection profiling
- workbook report generation
- bounded Agent Mode for safe in-workbook reporting actions
- reusable prompt templates
- conversational reporting intake inside the taskpane
- shared report brief and story planning across slides, HTML, and GAS
- Apps Script reporting app generation
- email draft generation
- slide deck planning and export generation
- optional Gmail draft creation
- optional Apps Script project export and deployment
- optional AI enhancement with a user-supplied provider

What remains operator-dependent:

- production hosting URL
- Microsoft 365 tenant rollout
- Google Cloud OAuth credentials
- LLM provider credentials
- end-client branding and legal documents

## Architecture

- `src/taskpane`: React task pane workflow
- `src/components`: reusable UI primitives
- `src/domain`: profiling, prompt interpretation, planning, orchestration
- `src/domain/agent`: bounded agent planning for safe workbook actions
- `src/generators`: Excel/GAS/email/slides output generators
- `src/services/office`: Office.js range capture and workbook rendering
- `src/services/google`: Google OAuth, Gmail draft creation, Apps Script export
- `src/services/ai`: OpenAI-compatible AI enhancement layer
- `src/services/persistence`: template, Google config, AI config persistence
- `src/shared`: shared types and constants
- `tests`: deterministic unit tests

## Security Model

- Google access tokens are stored in `sessionStorage` only.
- Google OAuth runtime state is stored in `sessionStorage` only.
- AI provider API keys are stored in `sessionStorage` only.
- Google OAuth client IDs and AI provider metadata are stored in `localStorage`.
- Apps Script deployment is private by default.
- Public web app deployment is never the default path.

Important: this add-in still runs client-side in the Office webview. For institutional deployment, use an enterprise-managed AI gateway and a managed Google Cloud project. Google client secrets are not bundled into the add-in.

## AI Provider Support

The add-in supports a user-supplied OpenAI-compatible chat completions endpoint.

Typical examples:

- OpenAI
- Azure OpenAI via a compatible gateway
- enterprise AI proxy/gateway
- model router exposing an OpenAI-compatible `/v1/chat/completions` interface

The AI layer is optional. If it is disabled or unavailable, the add-in still produces a complete deterministic output set.

AI is currently used for:

- title refinement
- subtitle refinement
- executive narrative summary
- summary paragraphs
- recommendations
- story-aware slide wording aligned to the shared brief
- design-layer composition when the internal reporting engine is enabled

Those narrative upgrades now sit on top of a shared deterministic report brief and story plan, then flow into email, slides, HTML reporting, and Apps Script reporting outputs.

## Agent Mode

Agent Mode is a bounded workbook operator for reporting workflows. It currently supports:

- structuring the current selection as an Excel table
- applying reporting-friendly formatting inside the current selection
- freezing the header row on the source worksheet
- generating the workbook report sheets from the current plan

The agent is intentionally constrained. It does not delete sheets, perform open-ended workbook automation, or run external actions on its own.

## Local Development

Install dependencies:

```bash
npm install
```

Start the add-in locally:

```bash
npm run dev-server
npm start
```

Marketing site preview:

- `https://localhost:3000/site.html` during `npm run dev-server`
- `dist/site.html` after a webpack build
- `npm run site:assets` to generate Store-ready screenshots from the built site

Run checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run validate
npm run validate:dist
```

## Google Setup

To use Gmail draft creation or authenticated Apps Script export:

1. Create a Google Cloud project.
2. Enable `Gmail API` and `Apps Script API`.
3. Create an OAuth 2.0 client for a web application.
4. Add `https://localhost:3000` as an authorized JavaScript origin for local development.
5. Either:
   - paste the client ID into the task pane, or
   - provide `REPORTFORGE_GOOGLE_CLIENT_ID` at build/runtime so the deployment manages it.
6. Trigger `Connect Google`, `Create Gmail Draft`, or `Export Project`. The add-in can start sign-in automatically on first use.

For end-user deployments, prefer the managed path:

- place the public Web client ID in `.env`, `.env.local`, or the process environment as `REPORTFORGE_GOOGLE_CLIENT_ID`
- rebuild the add-in
- end users can then sign in directly from the add-in without touching Google Cloud Console

Important:

- use an OAuth Web client ID ending with `.apps.googleusercontent.com`
- a Google API key starting with `AIza...` is not valid for ReportForge OAuth sign-in
- once the client ID is available, the first Gmail or Apps Script action can trigger Google sign-in automatically
- this Phase 1 implementation uses the Google Identity Services popup token flow, so only the public client ID is used client-side
- keep Google client secrets server-side; they are only relevant if you later add a backend authorization-code flow

Requested scopes:

- `https://www.googleapis.com/auth/gmail.compose`
- `https://www.googleapis.com/auth/script.projects`
- `https://www.googleapis.com/auth/script.deployments`

Phase 2 live validation:

- validate the OAuth consent screen in the real Google Cloud project
- validate the production add-in origin, not only `https://localhost:3000`
- validate Gmail draft creation and Apps Script export with a real test account
- optionally run `npm run google:validate-live -- "C:\\Users\\Labry\\Downloads\\cdp.json"` to exercise the live Google APIs with a temporary localhost callback

See [docs/google-oauth-setup.md](./docs/google-oauth-setup.md) for the Phase 1 vs Phase 2 split.

## AI Setup

To use AI enhancement:

1. Open the `Prompt` section.
2. Enable AI enhancement.
3. Enter:
   - provider label
   - endpoint
   - model
   - API key header
   - API key prefix
   - session API key
4. Save the AI settings.
5. Optionally use `Test Connection` before running a full enhancement.

The default configuration targets an OpenAI-compatible chat completions endpoint:

- endpoint: `https://api.openai.com/v1/chat/completions`
- header: `Authorization`
- prefix: `Bearer`

For managed deployments, you can prefill the public provider metadata with:

- `REPORTFORGE_LLM_PROVIDER_LABEL`
- `REPORTFORGE_LLM_ENDPOINT`
- `REPORTFORGE_LLM_MODEL`
- `REPORTFORGE_LLM_API_KEY_HEADER`
- `REPORTFORGE_LLM_API_KEY_PREFIX`
- `REPORTFORGE_LLM_ORGANIZATION`

The AI API key itself should still remain session-only or be brokered by a secure backend.

For managed local or hosted deployments, this repository now supports a same-origin AI relay:

- keep `OPENAI_API_KEY` only in `.env`, `.env.local`, or the server environment
- expose only the managed provider metadata to the taskpane
- the add-in can then use AI without asking the end user for an API key
- the secret never needs to be visible in the browser UI

## Slides Output

The `Slides` channel now supports:

- in-taskpane deck review
- saved reusable slide templates
- AI-generated slide templates based on a user brief
- real PowerPoint deck export
- real PDF preview and PDF download
- standalone HTML deck export
- markdown export
- JSON export

This makes the slide output directly reviewable and savable while keeping the channel useful even inside the narrow Office taskpane.

## Production Build Configuration

Production builds require `REPORTFORGE_BASE_URL`. The packaged `dist/manifest.xml` is the
release source of truth.

Optional launch-site routing can also be configured with `REPORTFORGE_SALES_EMAIL` so the
marketing site opens a real sales inbox instead of staying in copy/download-only mode.

The marketing site can also submit launch requests to a real API with
`REPORTFORGE_SITE_LEAD_ENDPOINT`. In local development, the site uses a built-in dev endpoint
when this variable is left empty.

Example:

```bash
$env:REPORTFORGE_BASE_URL="https://addins.example.com/reportforge/"
$env:REPORTFORGE_SALES_EMAIL="sales@example.com"
$env:REPORTFORGE_SITE_LEAD_ENDPOINT="https://crm.example.com/reportforge/leads"
npm run build
```

The webpack build replaces all `https://localhost:3000` manifest URLs with the configured
production base URL and fails fast if the variable is missing.

For a ready-made managed deployment path, see [docs/cloudflare-pages-deploy.md](./docs/cloudflare-pages-deploy.md).

Versioning discipline:

- `package.json` drives the release version
- `manifest.xml` must match `${package.json.version}.0`
- `npm run version:check` verifies the sync before release

## Client Rollout Checklist

Before a pilot or paid deployment:

1. Host the built assets behind HTTPS on a stable domain.
2. Set `REPORTFORGE_BASE_URL` for the production build.
3. Review manifest branding, support links, and tenant distribution path.
4. Use a managed Google Cloud project if Google features are enabled.
5. Use an enterprise-managed AI gateway if AI is enabled.
6. Test in Excel Desktop and Excel on the web.
7. Validate privacy language with the client.
8. Decide whether Gmail/App Script features are enabled for that client or kept off.
9. Release from `dist/manifest.xml`, not the root localhost manifest.
10. Run the manual smoke matrix in [docs/smoke-matrix.md](./docs/smoke-matrix.md).

## Supported Hosts

ReportForge AI is hardened and documented for:

- Excel Desktop on Windows
- Excel on the web
- Excel on Mac

Other hosts should be treated as unsupported until they pass the same smoke matrix.

## Release Notes For This Version

This codebase now includes:

- session-only secret handling for Google and AI credentials
- optional OpenAI-compatible AI enhancement
- safer Apps Script deployment defaults
- environment-driven production URL replacement
- stronger tests around persistence, Apps Script deployment settings, and AI enhancement
- CI automation for test/build/lint/manifest validation

## Business Planning

Commercial positioning, target markets, pricing, and the institution-ready roadmap are documented in [business.md](./business.md).
