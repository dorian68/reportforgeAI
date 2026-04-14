# ReportForge AI Commercial Launch README

This file is the commercial launch kit for the marketing site and Microsoft Store / AppSource positioning.

## 1. Positioning

- **Product name:** ReportForge AI
- **Category framing:** Excel-native reporting copilot
- **Core promise:** Turn raw Excel ranges into dashboards, decks, web reporting, and decision-ready reporting assets.
- **Who it is for:** sales leaders, finance teams, operations teams, consultants, Excel-heavy SMBs, and enterprise reporting teams.
- **What makes it different:** ReportForge AI does not stop at text polish. It captures a report brief, builds a storyline, applies anti-repetition guardrails, and generates multi-format outputs from the same reporting logic.

## 2. Microsoft Store / AppSource Copy

### Store Tagline

Turn Excel ranges into dashboards, decks, and decision-ready reporting.

### Short Description

ReportForge AI is an Excel-native add-in that transforms a selected Excel range into workbook reporting, executive slides, HTML dashboards, Apps Script web apps, and email-ready summaries.

### Long Description

ReportForge AI helps Excel-heavy teams turn spreadsheet analysis into polished reporting deliverables without waiting for a full BI project.

Start from a real Excel selection. Capture the audience, decision, KPI priorities, and reporting style through a lightweight conversation. Then generate a shared reporting brief and storyline that powers multiple outputs:

- workbook reporting inside Excel
- executive slide planning and export
- premium HTML reporting
- Google Apps Script reporting web app scaffolds
- email summaries for stakeholders

ReportForge AI is built for teams that already live in Excel but need faster, more finished reporting. It is useful for monthly executive reviews, board packs, weekly sales reporting, finance variance analysis, operational dashboards, and client reporting.

The product is deterministic by default, with optional AI enhancement through an OpenAI-compatible provider. This means teams can keep a controlled reporting workflow even when AI is disabled or unavailable.

### Benefit Bullets

- Reduce the time spent rebuilding recurring Excel-to-PowerPoint reporting cycles.
- Generate less repetitive and more decision-oriented reporting outputs.
- Keep Excel as the source of truth while improving executive readability.
- Produce slides, HTML dashboards, web app scaffolds, and email summaries from one reporting brief.
- Use deterministic generation by default, with optional AI enhancement when needed.

### Use Case Bullets

- Monthly executive review packs
- Board and investor update decks
- Weekly sales and pipeline reviews
- Finance close and variance reporting
- Operational KPI dashboards
- Client-facing reporting packages
- Lightweight web reporting for field and regional teams

### Suggested Keywords

- Excel reporting
- executive dashboard
- PowerPoint reporting
- board pack
- management reporting
- KPI dashboard
- business review
- finance reporting
- sales reporting
- operational dashboard

## 3. Visual Assets

The generated visual assets live in the `assets/` folder.

- `assets/reportforge-store-shot-01.png`
  - Microsoft Store screenshot 01
  - Excel taskpane intake
- `assets/reportforge-store-shot-02.png`
  - Microsoft Store screenshot 02
  - Executive deck preview
- `assets/reportforge-store-shot-03.png`
  - Microsoft Store screenshot 03
  - HTML dashboard surface
- `assets/reportforge-store-banner-01.png`
  - Optional social / launch banner
  - Full-site hero composition

## 4. Pricing And Packaging

### Starter

- `$0`
- Single analyst
- Best for first installs and self-serve activation

### Pro

- `$39 / user / month`
- Best for analysts, consultants, and operators who need polished outputs every week

### Team

- `$249 / workspace / month`
- Best for multi-analyst teams standardizing recurring reporting
- Recommended expansion tier

### Enterprise

- Custom
- Best for managed rollout, Microsoft 365 deployment, security review, and institution-grade operating controls

## 5. CTA And Lead Capture Wiring

The site now includes a launch request section at `#launch-request`.

It supports:

- plan selection
- primary use case selection
- structured launch brief generation
- copy-to-clipboard
- brief download
- direct `mailto:` routing once a sales email is configured
- real JSON form submission once a lead endpoint is configured

To enable live lead capture and direct email routing, configure:

- `REPORTFORGE_SITE_LEAD_ENDPOINT`
- `REPORTFORGE_SALES_EMAIL`
- in `.env`, `.env.local`, or the process environment

Example value:

- `https://crm.example.com/reportforge/leads`
- `sales@your-domain.com`

## 6. File Map

- `src/site/content.ts`
  - commercial copy, pricing, CTA targets, launch capture config
- `src/site/MarketingSite.tsx`
  - landing page, product screens, launch request flow
- `src/site/site.css`
  - marketing visual system
- `scripts/generate-store-assets.ps1`
  - screenshot generation via Chrome headless

## 7. Local Preview

Install dependencies if needed:

```bash
npm install
```

Start the dev server:

```bash
npm run dev-server
```

Open:

- `https://localhost:3000/site.html`

For built output:

```bash
npm run build:dev
```

Then open:

- `dist/site.html`

## 8. Pre-Launch Checklist

- Set `REPORTFORGE_SITE_LEAD_ENDPOINT` for live form capture
- Set `REPORTFORGE_SALES_EMAIL` for launch-request mailto routing
- Replace support and store URLs if needed
- Generate fresh PNG assets after final copy or layout changes
- Add analytics and CRM wiring if you want real attribution and pipeline capture
- Finalize Microsoft Store / AppSource metadata and screenshots
