# Cloudflare Pages Deployment

This project is ready to ship on Cloudflare Pages as a static add-in host with an optional
Pages Function for marketing-site leads.

## What Cloudflare Hosts In This Repo

- `dist/` hosts the production add-in files, manifest assets, and marketing site.
- `functions/api/reportforge/site/lead.js` handles `POST /api/reportforge/site/lead` when you
  want the marketing site form to submit on the same domain.

## Recommended Project Shape

- Production URL: `https://app.reportforge.ai/`
- Optional support URL: `https://app.reportforge.ai/support.html`
- Lead capture endpoint on the same project: `https://app.reportforge.ai/api/reportforge/site/lead`

That maps to:

- `REPORTFORGE_BASE_URL=https://app.reportforge.ai/`
- `REPORTFORGE_SITE_LEAD_ENDPOINT=/api/reportforge/site/lead`
- `REPORTFORGE_SALES_EMAIL=sales@reportforge.ai`

## Create The Pages Project

1. Push this repository to GitHub.
2. In Cloudflare, open `Workers & Pages`.
3. Create a new `Pages` project.
4. Choose `Import an existing Git repository`.
5. Connect the GitHub repository for this codebase.
6. Use these build settings:

   - Framework preset: `None`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
   - Production branch: `main`

## Production Environment Variables

Set these in the Cloudflare Pages project for the `Production` environment:

- `REPORTFORGE_BASE_URL`
  Example: `https://app.reportforge.ai/`
- `REPORTFORGE_SITE_LEAD_ENDPOINT`
  Example: `/api/reportforge/site/lead`
- `REPORTFORGE_SALES_EMAIL`
  Example: `sales@reportforge.ai`

Optional server-side variable for the Pages Function:

- `REPORTFORGE_LEAD_WEBHOOK_URL`
  Example: a webhook endpoint in Zapier, Make, n8n, your CRM intake API, or another backend you
  control. If this variable is omitted, the function still accepts the lead and logs a summary in
  Cloudflare instead of forwarding it.

## Custom Domain

1. In the Pages project, open `Custom domains`.
2. Add your domain or subdomain, for example `app.reportforge.ai`.
3. Update DNS as instructed by Cloudflare.
4. Once active, rebuild so `REPORTFORGE_BASE_URL` matches the final HTTPS hostname.

## Release Flow

1. Set the production environment variables in Cloudflare Pages.
2. Push to the production branch.
3. Confirm the build finishes successfully.
4. Open the deployed `site.html` and `support.html`.
5. Download the packaged `dist/manifest.xml` artifact from the same commit locally if you need to
   sideload or submit the add-in.

## Local Build Equivalent

```powershell
$env:REPORTFORGE_BASE_URL="https://app.reportforge.ai/"
$env:REPORTFORGE_SITE_LEAD_ENDPOINT="/api/reportforge/site/lead"
$env:REPORTFORGE_SALES_EMAIL="sales@reportforge.ai"
npm run build
```

## Notes

- `REPORTFORGE_BASE_URL` is required for production builds.
- `REPORTFORGE_SITE_LEAD_ENDPOINT` is injected into the marketing site at build time, so keep it
  aligned with the domain and route you really deploy.
- The Pages Function is same-origin friendly, so using `/api/reportforge/site/lead` avoids CORS
  complexity.
