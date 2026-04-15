import React, { type MouseEvent, type ReactNode, useEffect, useState } from "react";

import { marketingSiteContent } from "./content";
import {
  buildLaunchBrief,
  buildLaunchRequestPayload,
  buildSalesMailto,
  hasConfiguredLeadEndpoint,
  hasConfiguredSalesEmail,
  submitLaunchRequest,
  type LaunchRequestErrors,
  type LaunchRequestState,
  validateLaunchRequest,
} from "./leadCapture";
import { siteRuntimeConfig } from "./runtimeConfig";

type ButtonLinkProps = {
  cta: {
    label: string;
    href: string;
    tone: "primary" | "secondary" | "ghost";
  };
  onNavigate: (href: string) => void;
};

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  summary?: string;
};

type WindowShellProps = {
  title: string;
  caption?: string;
  className?: string;
  children: ReactNode;
};

const trendBars = [54, 66, 61, 78, 74, 88, 96];
const comparisonBars = [68, 54, 42, 35];
const leaderboardBars = [88, 74, 65, 51, 39];
const trendBarPixels = trendBars.map((value) => Math.max(48, Math.round((value / 100) * 146)));
const comparisonBarPixels = comparisonBars.map((value) => Math.max(44, Math.round((value / 100) * 138)));

const defaultLaunchRequestState: LaunchRequestState = {
  fullName: "",
  workEmail: "",
  company: "",
  teamSize: marketingSiteContent.leadCapture.teamSizes[1] ?? "2-5",
  selectedPlan: "Team",
  useCase: marketingSiteContent.useCases.items[0]?.title ?? "",
  notes: "",
};

type SiteRoute = {
  anchor?: string;
};

const defaultPrerenderRoute: SiteRoute = {};
const trackedSiteSections = [
  "top",
  "workflow",
  "before-after",
  "outputs",
  "store-assets",
  "security",
  "buyers",
  "use-cases",
  "comparison",
  "pricing",
  "launch-request",
  "faq",
  "closing",
] as const;
const siteSectionToNavAnchor: Record<(typeof trackedSiteSections)[number], string> = {
  top: "top",
  workflow: "workflow",
  "before-after": "workflow",
  outputs: "outputs",
  "store-assets": "outputs",
  security: "outputs",
  buyers: "buyers",
  "use-cases": "buyers",
  comparison: "buyers",
  pricing: "pricing",
  "launch-request": "launch-request",
  faq: "faq",
  closing: "launch-request",
};

type SiteLinkProps = {
  href: string;
  className?: string;
  onNavigate: (href: string) => void;
  children: ReactNode;
  ariaCurrent?: "page";
};

function normalizeAnchor(value: string | null | undefined) {
  const normalized = (value ?? "").replace(/^#/, "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseSiteRouteFromHref(href: string): SiteRoute | null {
  if (href === marketingSiteContent.brand.supportHref || /^[a-z]+:/i.test(href)) {
    return null;
  }

  if (href.startsWith("#")) {
    return { anchor: normalizeAnchor(href) };
  }

  return null;
}

function buildSiteHref(route: SiteRoute) {
  return route.anchor ? `#${route.anchor}` : "#top";
}

function readSiteRouteFromWindow(): SiteRoute {
  if (typeof window === "undefined") {
    return defaultPrerenderRoute;
  }

  return { anchor: normalizeAnchor(window.location.hash) };
}

function readCaptureModeFromWindow(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return new URLSearchParams(window.location.search).get("capture");
}

function SiteLink({ href, className, onNavigate, children, ariaCurrent }: SiteLinkProps) {
  const route = parseSiteRouteFromHref(href);
  const resolvedHref = route ? buildSiteHref(route) : href;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!route) {
      return;
    }

    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    onNavigate(href);
  }

  return (
    <a className={className} href={resolvedHref} onClick={handleClick} aria-current={ariaCurrent}>
      {children}
    </a>
  );
}

function ButtonLink({ cta, onNavigate }: ButtonLinkProps) {
  return (
    <SiteLink
      className={`rf-site-button rf-site-button--${cta.tone}`}
      href={cta.href}
      onNavigate={onNavigate}
    >
      {cta.label}
    </SiteLink>
  );
}

function SectionHeader({ eyebrow, title, summary }: SectionHeaderProps) {
  return (
    <div className="rf-site-section__header">
      <p className="rf-site-section__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {summary ? <p className="rf-site-section__summary">{summary}</p> : null}
    </div>
  );
}

function WindowShell({ title, caption, className, children }: WindowShellProps) {
  return (
    <div className={`rf-site-window ${className ?? ""}`.trim()}>
      <div className="rf-site-window__chrome">
        <div className="rf-site-window__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="rf-site-window__title">
          <strong>{title}</strong>
          {caption ? <span>{caption}</span> : null}
        </div>
      </div>
      <div className="rf-site-window__body">{children}</div>
    </div>
  );
}

function ExcelTaskpaneMock() {
  return (
    <WindowShell
      title="Excel selection -> report brief"
      caption="Conversation-led intake inside the add-in"
      className="rf-site-window--excel"
    >
      <div className="rf-site-excel">
        <div className="rf-site-excel__sheet">
          <div className="rf-site-excel__toolbar">
            <span>Revenue Model Q2</span>
            <span className="rf-site-pill">Selection ready</span>
          </div>
          <div className="rf-site-excel__formula">=SUMIFS(Revenue, Region, "West", Month, B$2)</div>
          <div className="rf-site-excel__grid" aria-hidden="true">
            {Array.from({ length: 30 }).map((_, index) => (
              <span
                key={index}
                className={index === 8 || index === 9 || index === 14 || index === 15 ? "is-active" : ""}
              />
            ))}
          </div>
        </div>
        <div className="rf-site-excel__pane">
          <div className="rf-site-excel__pane-header">
            <div>
              <strong>Report brief</strong>
              <p>Board-ready performance review</p>
            </div>
            <span className="rf-site-chip">AI optional</span>
          </div>
          <div className="rf-site-message rf-site-message--assistant">
            Who is the audience and what decision should this report support?
          </div>
          <div className="rf-site-message rf-site-message--user">
            CFO and CEO. Focus on revenue, margin, and regional underperformance. Generate now.
          </div>
          <div className="rf-site-brief-grid">
            <div>
              <span>Audience</span>
              <strong>CFO / CEO</strong>
            </div>
            <div>
              <span>Decision</span>
              <strong>Intervene on margin pressure</strong>
            </div>
            <div>
              <span>Priority KPIs</span>
              <strong>Revenue, Margin %, Variance</strong>
            </div>
            <div>
              <span>Output mix</span>
              <strong>Deck, HTML, GAS, email</strong>
            </div>
          </div>
          <div className="rf-site-story-strip">
            <span>Exec summary</span>
            <span>Variance drivers</span>
            <span>Regional breakdown</span>
            <span>Actions</span>
          </div>
          <div className="rf-site-excel__actions">
            <button type="button">Generate report</button>
            <button type="button" className="is-secondary">
              Save template
            </button>
          </div>
        </div>
      </div>
    </WindowShell>
  );
}

function DashboardMock({ compact = false }: { compact?: boolean }) {
  return (
    <WindowShell
      title="Premium HTML reporting surface"
      caption="KPI hierarchy, trend area, comparison blocks"
      className={`rf-site-window--dashboard ${compact ? "is-compact" : ""}`.trim()}
    >
      <div className="rf-site-dashboard">
        <div className="rf-site-dashboard__header">
          <div>
            <strong>Commercial performance overview</strong>
            <p>Built from the same brief as the deck and email summary</p>
          </div>
          <div className="rf-site-dashboard__filters">
            <span>YTD</span>
            <span>Europe</span>
            <span>Enterprise</span>
          </div>
        </div>
        <div className="rf-site-dashboard__kpis">
          {[
            ["Revenue", "$9.8M", "+6.4%"],
            ["Gross margin", "34.1%", "-1.8 pts"],
            ["Pipeline", "$4.2M", "+12.0%"],
            ["At-risk regions", "3", "Escalate"],
          ].map(([label, value, note]) => (
            <article key={label} className="rf-site-kpi-card">
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{note}</p>
            </article>
          ))}
        </div>
        <div className="rf-site-dashboard__main">
          <div className="rf-site-chart-card rf-site-chart-card--trend">
            <div className="rf-site-card-heading">
              <strong>Revenue trend</strong>
              <span>Trend matters most for the executive story</span>
            </div>
            <div className="rf-site-area-chart" aria-hidden="true">
              {trendBarPixels.map((height, index) => (
                <span key={index} style={{ height: `${height}px` }} />
              ))}
            </div>
          </div>
          <div className="rf-site-chart-card rf-site-chart-card--comparison">
            <div className="rf-site-card-heading">
              <strong>Region comparison</strong>
              <span>Detect concentration and weak pockets quickly</span>
            </div>
            <div className="rf-site-bar-stack" aria-hidden="true">
              {comparisonBars.map((width, index) => (
                <div key={index}>
                  <span>{["West", "North", "South", "EMEA"][index]}</span>
                  <i style={{ width: `${width}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rf-site-dashboard__bottom">
          <div className="rf-site-chart-card">
            <div className="rf-site-card-heading">
              <strong>Top contributors</strong>
              <span>Highlight who drives the story</span>
            </div>
            <div className="rf-site-leaderboard" aria-hidden="true">
              {leaderboardBars.map((width, index) => (
                <div key={index}>
                  <span>{["Product A", "Product C", "Region West", "Channel B", "Client X"][index]}</span>
                  <i style={{ width: `${width}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="rf-site-chart-card rf-site-chart-card--actions">
            <div className="rf-site-card-heading">
              <strong>Recommended actions</strong>
              <span>Close on decision support, not descriptive recap</span>
            </div>
            <ul className="rf-site-actions-list">
              <li>Protect margin in two discount-heavy regions.</li>
              <li>Double down on the channel driving the cleanest growth.</li>
              <li>Review low-converting segments before next forecast cycle.</li>
            </ul>
          </div>
        </div>
      </div>
    </WindowShell>
  );
}

function DeckMock({ compact = false }: { compact?: boolean }) {
  return (
    <WindowShell
      title="Executive deck preview"
      caption="Message-led, less repetitive, decision-focused"
      className={`rf-site-window--deck ${compact ? "is-compact" : ""}`.trim()}
    >
      <div className="rf-site-deck">
        <div className="rf-site-deck__rail" aria-hidden="true">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className={item === 2 ? "is-active" : ""}>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="rf-site-deck__slide">
          <div className="rf-site-slide__header">
            <p>Slide 02 · Margin pressure is local, not systemic</p>
            <h3>Revenue is still growing, but discount intensity is compressing margin in two regions.</h3>
          </div>
          <div className="rf-site-slide__body">
            <div className="rf-site-slide__scorecard">
              <article>
                <span>Revenue</span>
                <strong>$9.8M</strong>
                <p>+6.4% vs prior period</p>
              </article>
              <article>
                <span>Margin %</span>
                <strong>34.1%</strong>
                <p>-1.8 pts vs target</p>
              </article>
              <article>
                <span>Regions to watch</span>
                <strong>2</strong>
                <p>Escalate pricing review</p>
              </article>
            </div>
            <div className="rf-site-slide__insight">
              <div className="rf-site-slide__bars" aria-hidden="true">
                {comparisonBarPixels.map((height, index) => (
                  <i key={index} style={{ height: `${height}px` }} />
                ))}
              </div>
              <div className="rf-site-slide__commentary">
                <strong>Why this slide exists</strong>
                <p>
                  The story separates healthy topline growth from localized margin leakage so the
                  meeting can focus on intervention rather than generic recap.
                </p>
                <ul>
                  <li>West and South drive most of the shortfall.</li>
                  <li>Channel mix is still supportive overall.</li>
                  <li>Action should target discount controls before headcount changes.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WindowShell>
  );
}

function GasMock() {
  return (
    <WindowShell
      title="Apps Script reporting web app"
      caption="Lightweight distribution with stronger reporting structure"
      className="rf-site-window--gas"
    >
      <div className="rf-site-gas">
        <aside className="rf-site-gas__sidebar">
          <strong>ReportForge App</strong>
          <nav>
            <span className="is-active">Overview</span>
            <span>Regions</span>
            <span>Products</span>
            <span>Exceptions</span>
            <span>Actions</span>
          </nav>
        </aside>
        <div className="rf-site-gas__main">
          <div className="rf-site-gas__topline">
            <div>
              <span>Coverage</span>
              <strong>98%</strong>
            </div>
            <div>
              <span>Trend</span>
              <strong>Improving</strong>
            </div>
            <div>
              <span>Main issue</span>
              <strong>Margin drift</strong>
            </div>
          </div>
          <div className="rf-site-gas__panels">
            <div className="rf-site-gas__panel">
              <strong>Performance trend</strong>
              <div className="rf-site-line-chart" aria-hidden="true">
                {trendBars.map((height, index) => (
                  <span key={index} style={{ bottom: `${height / 5}%` }} />
                ))}
              </div>
            </div>
            <div className="rf-site-gas__panel">
              <strong>Decision notes</strong>
              <ul>
                <li>Escalate pricing review in two territories.</li>
                <li>Defend the acquisition channel with the best margin profile.</li>
                <li>Keep the summary short and decision-led.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </WindowShell>
  );
}

function HeroShowcase() {
  const sequence = [
    {
      code: "01",
      title: "Source range locked",
      detail: "Start from the exact worksheet range the team is already using in the real review cycle.",
    },
    {
      code: "02",
      title: "Story brief aligned",
      detail: "Audience, decision, KPI hierarchy, and tone stay consistent before outputs start branching.",
    },
    {
      code: "03",
      title: "Decision surfaces issued",
      detail: "Dashboards, decks, web apps, and executive summaries all ship from the same reporting plan.",
    },
  ];

  return (
    <div className="rf-site-command">
      <div className="rf-site-command__masthead">
        <span>Excel-native reporting flow</span>
        <strong>One brief governs every output</strong>
      </div>
      <article className="rf-site-command__shot">
        <div className="rf-site-command__shot-label">Excel intake surface</div>
        <img
          src="assets/reportforge-store-shot-01.png"
          alt="ReportForge AI Excel intake screenshot"
        />
        <div className="rf-site-command__caption">
          <strong>Selection, brief, and story plan stay inside one operating surface.</strong>
          <p>
            That is why the deck, dashboard, and web app read as one reporting system instead of
            three separate exports.
          </p>
        </div>
      </article>
      <div className="rf-site-command__track">
        {sequence.map((step) => (
          <article key={step.code} className="rf-site-command__step">
            <span>{step.code}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function StoreScreenshotGrid() {
  const shots = marketingSiteContent.storeShots.items;

  return (
    <div className="rf-site-store-grid">
      {shots.map((shot) => (
        <article key={shot.label} className="rf-site-store-card">
          <div className="rf-site-store-card__label">{shot.label}</div>
          <div className="rf-site-store-card__preview">
            <img src={shot.imageSrc} alt={shot.title} />
          </div>
          <strong>{shot.title}</strong>
          <p>{shot.detail}</p>
        </article>
      ))}
    </div>
  );
}

function ComparisonGrid() {
  return (
    <div className="rf-site-comparison">
      <div className="rf-site-comparison__head">
        <span />
        <strong>Manual reporting</strong>
        <strong>Generic AI</strong>
        <strong>ReportForge AI</strong>
      </div>
      {marketingSiteContent.comparison.rows.map((row) => (
        <div key={row.capability} className="rf-site-comparison__row">
          <span>{row.capability}</span>
          <p>{row.manual}</p>
          <p>{row.genericAi}</p>
          <p className="is-accent">{row.reportForge}</p>
        </div>
      ))}
    </div>
  );
}

function OverviewTabContent() {
  const content = marketingSiteContent;
  const rail = [
    "No BI rebuild required to prove value.",
    "The team keeps working from the spreadsheet it already trusts.",
    "One brief controls every output before polish begins.",
  ];

  return (
    <>
      <section className="rf-site-section" id="workflow">
        <div className="rf-site-shell rf-site-shell--narrow">
          <div className="rf-site-workflow">
            <SectionHeader
              eyebrow={content.workflow.eyebrow}
              title={content.workflow.title}
              summary={content.workflow.summary}
            />
            <div className="rf-site-sequence__rail">
              <span>Why this wedge wins</span>
              <ul>
                {rail.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rf-site-steps">
              {content.workflow.steps.map((step, index) => (
                <article key={step.title}>
                  <div className="rf-site-step__index">0{index + 1}</div>
                  <strong>{step.title}</strong>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rf-site-section rf-site-section--muted" id="before-after">
        <div className="rf-site-shell">
          <div className="rf-site-shift">
            <div className="rf-site-shift__intro">
              <SectionHeader
                eyebrow={content.beforeAfter.eyebrow}
                title={content.beforeAfter.title}
              />
            </div>
            <div className="rf-site-list-panels">
              <article className="rf-site-list-card rf-site-list-card--before">
                <span>Before</span>
                <ul>
                  {content.beforeAfter.before.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="rf-site-list-card rf-site-list-card--accent">
                <span>After</span>
                <ul>
                  {content.beforeAfter.after.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ProductTabContent() {
  const content = marketingSiteContent;

  return (
    <>
      <section className="rf-site-section" id="outputs">
        <div className="rf-site-shell">
          <div className="rf-site-output-stage">
            <div className="rf-site-output-stage__copy">
              <SectionHeader
                eyebrow={content.outputs.eyebrow}
                title={content.outputs.title}
                summary="The operating advantage is not one isolated artifact. ReportForge keeps the reporting brief coherent across every delivery channel."
              />
              <div className="rf-site-output-grid">
                {content.outputs.items.map((item) => (
                  <article key={item.title} className="rf-site-output-card">
                    <strong>{item.title}</strong>
                    <p>{item.summary}</p>
                    <span>{item.benefit}</span>
                  </article>
                ))}
              </div>
            </div>
            <div className="rf-site-output-stage__proof" id="screens">
              <DashboardMock />
              <div className="rf-site-output-stage__stack">
                <DeckMock />
                <GasMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rf-site-section" id="store-assets">
        <div className="rf-site-shell">
          <SectionHeader
            eyebrow={content.storeShots.eyebrow}
            title={content.storeShots.title}
          />
          <StoreScreenshotGrid />
        </div>
      </section>

      <section className="rf-site-section rf-site-section--muted" id="security">
        <div className="rf-site-shell rf-site-shell--narrow">
          <div className="rf-site-security">
            <SectionHeader
              eyebrow="Security and control"
              title="Commercially attractive, operationally credible."
              summary="The rollout story matters in enterprise deals. ReportForge is built to keep a deterministic path, optional AI, session-only secrets, and a same-origin relay option for managed deployments."
            />
            <div className="rf-site-security__cards">
              {[
                "Deterministic fallback stays available even without AI.",
                "Google and AI credentials are handled session-first in the client.",
                "Managed relay support exists for centralized AI operations.",
                "The product is already aligned with Excel add-in packaging and Microsoft 365 distribution.",
              ].map((item) => (
                <article key={item}>{item}</article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function BuyersTabContent() {
  const content = marketingSiteContent;

  return (
    <>
      <section className="rf-site-section rf-site-section--muted" id="buyers">
        <div className="rf-site-shell rf-site-shell--narrow">
          <div className="rf-site-buyer-intro">
            <SectionHeader
              eyebrow={content.personas.eyebrow}
              title={content.personas.title}
            />
            <p className="rf-site-buyer-intro__summary">
              The sale lands fastest where important reporting still passes through Excel before
              leadership sees it.
            </p>
          </div>
          <div className="rf-site-persona-grid">
            {content.personas.items.map((persona) => (
              <article key={persona.title} className="rf-site-persona-card">
                <h3>{persona.title}</h3>
                <p className="rf-site-persona-card__pain">{persona.pain}</p>
                <p className="rf-site-persona-card__promise">{persona.promise}</p>
                <ul>
                  {persona.outcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rf-site-section" id="use-cases">
        <div className="rf-site-shell rf-site-shell--narrow">
          <SectionHeader
            eyebrow={content.useCases.eyebrow}
            title={content.useCases.title}
          />
          <div className="rf-site-usecase-grid">
            {content.useCases.items.map((useCase) => (
              <article key={useCase.title} className="rf-site-usecase-card">
                <div className="rf-site-usecase-card__topline">
                  <strong>{useCase.title}</strong>
                  <span>{useCase.audience}</span>
                </div>
                <p>{useCase.whyExcel}</p>
                <div className="rf-site-usecase-card__result">{useCase.result}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rf-site-section rf-site-section--dark" id="comparison">
        <div className="rf-site-shell rf-site-shell--narrow">
          <SectionHeader
            eyebrow={content.comparison.eyebrow}
            title={content.comparison.title}
          />
          <ComparisonGrid />
        </div>
      </section>
    </>
  );
}

function PricingTabContent({ onNavigate }: { onNavigate: (href: string) => void }) {
  const content = marketingSiteContent;

  return (
    <>
      <section className="rf-site-section" id="pricing">
        <div className="rf-site-shell">
          <SectionHeader
            eyebrow={content.pricing.eyebrow}
            title={content.pricing.title}
          />
          <div className="rf-site-pricing-grid">
            {content.pricing.tiers.map((tier) => (
              <article
                key={tier.name}
                className={`rf-site-pricing-card ${tier.recommended ? "is-recommended" : ""}`.trim()}
              >
                <div className="rf-site-pricing-card__head">
                  <div>
                    <strong>{tier.name}</strong>
                    <p>{tier.summary}</p>
                  </div>
                  {tier.badge ? <span className="rf-site-pill">{tier.badge}</span> : null}
                </div>
                <div className="rf-site-pricing-card__price">
                  <span>{tier.price}</span>
                  <p>{tier.cadence}</p>
                </div>
                <ul>
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <ButtonLink cta={tier.cta} onNavigate={onNavigate} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rf-site-section rf-site-section--muted" id="launch-request">
        <div className="rf-site-shell rf-site-shell--narrow">
          <SectionHeader
            eyebrow={content.leadCapture.eyebrow}
            title={content.leadCapture.title}
            summary={content.leadCapture.summary}
          />
          <LeadCapturePanel />
        </div>
      </section>

      <section className="rf-site-section rf-site-section--muted" id="faq">
        <div className="rf-site-shell rf-site-shell--narrow">
          <SectionHeader eyebrow={content.faq.eyebrow} title={content.faq.title} />
          <div className="rf-site-faq">
            {content.faq.items.map((item) => (
              <article key={item.question}>
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rf-site-section rf-site-section--closing" id="closing">
        <div className="rf-site-shell rf-site-shell--narrow">
          <div className="rf-site-closing">
            <SectionHeader
              eyebrow={content.closing.eyebrow}
              title={content.closing.title}
              summary={content.closing.summary}
            />
            <div className="rf-site-closing__actions">
              <ButtonLink cta={content.closing.primaryCta} onNavigate={onNavigate} />
              <ButtonLink cta={content.closing.secondaryCta} onNavigate={onNavigate} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function getPlanRoute(selectedPlan: string) {
  switch (selectedPlan) {
    case "Starter":
      return {
        label: "Fast proof",
        detail:
          "Use Starter to prove the Excel-to-output motion on one workbook before asking the team to change habits.",
      };
    case "Pro":
      return {
        label: "Single-operator scale",
        detail:
          "Pro fits analysts, consultants, and operators who need polished reporting every week without a wider rollout yet.",
      };
    case "Enterprise":
      return {
        label: "Governed rollout",
        detail:
          "Enterprise is the path when procurement, Microsoft 365 deployment, or managed AI controls are part of the deal.",
      };
    default:
      return {
        label: "Team pilot",
        detail:
          "Team works best when one recurring review already exists and the buyer wants to standardize it across a function.",
      };
  }
}

function LeadCapturePanel() {
  const [form, setForm] = useState<LaunchRequestState>(defaultLaunchRequestState);
  const [errors, setErrors] = useState<LaunchRequestErrors>({});
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const brief = buildLaunchBrief(form);
  const route = getPlanRoute(form.selectedPlan);
  const salesEmailConfigured = hasConfiguredSalesEmail(siteRuntimeConfig.salesEmail);
  const leadEndpointConfigured = hasConfiguredLeadEndpoint(siteRuntimeConfig.leadEndpoint);
  const salesMailto = salesEmailConfigured ? buildSalesMailto(form, siteRuntimeConfig.salesEmail) : "";

  function updateField<K extends keyof LaunchRequestState>(key: K, value: LaunchRequestState[K]) {
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCopyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setStatus("Pilot brief copied. You can drop it into email, CRM, or your internal handoff flow.");
    } catch {
      setStatus("Copy failed in this browser. Use the download action instead.");
    }
  }

  function handleDownloadBrief() {
    const blob = new Blob([brief], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = "reportforge-launch-request.txt";
    link.click();
    URL.revokeObjectURL(objectUrl);
    setStatus("Pilot brief downloaded.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    const nextErrors = validateLaunchRequest(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("Complete the key contact fields so we can reply with the right pilot path.");
      return;
    }

    if (!leadEndpointConfigured) {
      setStatus(
        "Live form submission is not configured on this deployment yet. Use copy, download, or the sales email fallback."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitLaunchRequest(
        siteRuntimeConfig.leadEndpoint,
        buildLaunchRequestPayload(form, {
          pageUrl: typeof window === "undefined" ? "" : window.location.href,
          userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
        })
      );
      setStatus(result.message);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Pilot request submission failed. Use the sales email or brief download fallback."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rf-site-launch">
      <form className="rf-site-launch__form" onSubmit={handleSubmit}>
        <div className="rf-site-launch__grid">
          <label>
            <span>Full name</span>
            <input
              aria-invalid={Boolean(errors.fullName)}
              autoComplete="name"
              name="fullName"
              required={true}
              type="text"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              placeholder="Jane Smith"
            />
            {errors.fullName ? <small className="rf-site-launch__error">{errors.fullName}</small> : null}
          </label>
          <label>
            <span>Work email</span>
            <input
              aria-invalid={Boolean(errors.workEmail)}
              autoComplete="email"
              name="workEmail"
              required={true}
              type="email"
              value={form.workEmail}
              onChange={(event) => updateField("workEmail", event.target.value)}
              placeholder="jane@company.com"
            />
            {errors.workEmail ? <small className="rf-site-launch__error">{errors.workEmail}</small> : null}
          </label>
          <label>
            <span>Company</span>
            <input
              aria-invalid={Boolean(errors.company)}
              autoComplete="organization"
              name="company"
              required={true}
              type="text"
              value={form.company}
              onChange={(event) => updateField("company", event.target.value)}
              placeholder="Acme Corp"
            />
            {errors.company ? <small className="rf-site-launch__error">{errors.company}</small> : null}
          </label>
          <label>
            <span>Team size</span>
            <select
              name="teamSize"
              value={form.teamSize}
              onChange={(event) => updateField("teamSize", event.target.value)}
            >
              {marketingSiteContent.leadCapture.teamSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Notes</span>
          <textarea
            name="notes"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="What review is painful today? Which audience matters most? What has to ship faster?"
            rows={5}
          />
        </label>
        <div className="rf-site-launch__optional">
          <span>Optional context</span>
          <div className="rf-site-launch__meta">
            <label>
              <span>Preferred plan</span>
              <select
                name="selectedPlan"
                value={form.selectedPlan}
                onChange={(event) => updateField("selectedPlan", event.target.value)}
              >
                {marketingSiteContent.pricing.tiers.map((tier) => (
                  <option key={tier.name} value={tier.name}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Primary use case</span>
              <select
                name="useCase"
                value={form.useCase}
                onChange={(event) => updateField("useCase", event.target.value)}
              >
                {marketingSiteContent.useCases.items.map((item) => (
                  <option key={item.title} value={item.title}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="rf-site-launch__actions">
          <button type="submit" disabled={isSubmitting || !leadEndpointConfigured}>
            {isSubmitting ? "Submitting..." : "Request Pilot"}
          </button>
          {salesEmailConfigured ? (
            <a className="rf-site-button rf-site-button--secondary" href={salesMailto}>
              Email sales
            </a>
          ) : (
            <div className="rf-site-launch__hint">{marketingSiteContent.leadCapture.note}</div>
          )}
        </div>
        <div className="rf-site-launch__utility">
          <button type="button" onClick={handleCopyBrief}>
            Copy brief
          </button>
          <button type="button" onClick={handleDownloadBrief}>
            Download brief
          </button>
        </div>
        {!leadEndpointConfigured ? (
          <p className="rf-site-launch__hint">
            Set <code>REPORTFORGE_SITE_LEAD_ENDPOINT</code> to enable live submission from this form.
          </p>
        ) : null}
        {status ? (
          <p aria-live="polite" className="rf-site-launch__status">
            {status}
          </p>
        ) : null}
      </form>
      <aside className="rf-site-launch__summary">
        <div className="rf-site-launch__route">
          <span>{route.label}</span>
          <strong>{form.selectedPlan} pilot motion</strong>
          <p>{route.detail}</p>
        </div>
        <div className="rf-site-launch__preview">
          <strong>Pilot brief preview</strong>
          <pre>{brief}</pre>
        </div>
      </aside>
    </div>
  );
}

function CaptureModeView({ mode }: { mode: string }) {
  const captureViews: Record<string, { eyebrow: string; title: string; body: ReactNode }> = {
    taskpane: {
      eyebrow: "Microsoft Store screenshot 01",
      title: "Excel taskpane intake",
      body: <ExcelTaskpaneMock />,
    },
    deck: {
      eyebrow: "Microsoft Store screenshot 02",
      title: "Executive deck preview",
      body: <DeckMock />,
    },
    dashboard: {
      eyebrow: "Microsoft Store screenshot 03",
      title: "HTML dashboard surface",
      body: <DashboardMock />,
    },
  };

  const view = captureViews[mode] ?? captureViews.taskpane;

  return (
    <div className="rf-site-capture">
      <div className="rf-site-capture__header">
        <div className="rf-site-brand">
          <img src="assets/reportforge-mark.svg" alt="" aria-hidden="true" />
          <div>
            <strong>{marketingSiteContent.brand.name}</strong>
            <span>{marketingSiteContent.brand.category}</span>
          </div>
        </div>
        <div className="rf-site-capture__copy">
          <p className="rf-site-section__eyebrow">{view.eyebrow}</p>
          <h1>{view.title}</h1>
        </div>
      </div>
      <div className="rf-site-capture__body">{view.body}</div>
    </div>
  );
}

export function MarketingSite() {
  const content = marketingSiteContent;
  const [captureMode, setCaptureMode] = useState<string | null>(null);
  const [route, setRoute] = useState<SiteRoute>(defaultPrerenderRoute);
  const [activeSection, setActiveSection] = useState("top");

  useEffect(() => {
    function syncRoute() {
      setCaptureMode(readCaptureModeFromWindow());
      setRoute(readSiteRouteFromWindow());
    }

    syncRoute();

    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);

    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  useEffect(() => {
    if (!route.anchor) {
      return;
    }

    const activeAnchor = route.anchor;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(activeAnchor);

      if (target) {
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
        setActiveSection(activeAnchor);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [route.anchor]);

  useEffect(() => {
    if (captureMode || typeof window === "undefined" || typeof IntersectionObserver !== "function") {
      return;
    }

    const sections = trackedSiteSections
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visibleSections[0]?.target.id) {
          const visibleId = visibleSections[0].target.id as (typeof trackedSiteSections)[number];
          setActiveSection(siteSectionToNavAnchor[visibleId] ?? visibleId);
        }
      },
      {
        rootMargin: "-18% 0px -55% 0px",
        threshold: [0.2, 0.45, 0.7],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [captureMode]);

  function navigateTo(href: string) {
    const nextRoute = parseSiteRouteFromHref(href);

    if (!nextRoute) {
      window.location.href = href;
      return;
    }

    const nextHref = buildSiteHref(nextRoute);
    window.history.pushState({}, "", nextHref);
    setRoute(nextRoute);
  }

  if (captureMode) {
    return <CaptureModeView mode={captureMode} />;
  }

  return (
    <div className="rf-site">
      <div className="rf-site__backdrop" aria-hidden="true" />
      <header className="rf-site-hero">
        <div className="rf-site-shell">
          <nav className="rf-site-nav">
            <SiteLink className="rf-site-brand" href="#top" onNavigate={navigateTo}>
              <img src="assets/reportforge-mark.svg" alt="" aria-hidden="true" />
              <div>
                <strong>{content.brand.name}</strong>
                <span>{content.brand.category}</span>
              </div>
            </SiteLink>
            <div className="rf-site-nav__links">
              {content.navigation.map((item) => (
                <SiteLink
                  key={item.href}
                  className={`rf-site-nav__tab ${
                    activeSection === parseSiteRouteFromHref(item.href)?.anchor ? "is-active" : ""
                  }`.trim()}
                  href={item.href}
                  onNavigate={navigateTo}
                  ariaCurrent={activeSection === parseSiteRouteFromHref(item.href)?.anchor ? "page" : undefined}
                >
                  {item.label}
                </SiteLink>
              ))}
            </div>
            <div className="rf-site-nav__cta">
              <ButtonLink cta={content.hero.primaryCta} onNavigate={navigateTo} />
            </div>
          </nav>

          <div className="rf-site-hero__layout" id="top">
            <div className="rf-site-hero__copy">
              <p className="rf-site-hero__eyebrow">{content.hero.eyebrow}</p>
              <h1>{content.hero.title}</h1>
              <p className="rf-site-hero__subtitle">{content.hero.subtitle}</p>
              <div className="rf-site-hero__actions">
                <ButtonLink cta={content.hero.primaryCta} onNavigate={navigateTo} />
                <ButtonLink cta={content.hero.secondaryCta} onNavigate={navigateTo} />
              </div>
            </div>
            <div className="rf-site-hero__visual">
              <HeroShowcase />
            </div>
          </div>
          <div className="rf-site-hero__proof">
            {content.signals.map((signal) => (
              <article key={signal.label}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <p>{signal.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </header>

      <main className="rf-site-main">
        <OverviewTabContent />
        <ProductTabContent />
        <BuyersTabContent />
        <PricingTabContent onNavigate={navigateTo} />
      </main>

      <footer className="rf-site-footer">
        <div className="rf-site-shell rf-site-footer__inner">
          <div>
            <strong>{content.brand.name}</strong>
            <p>Excel-native reporting software for teams that need cleaner dashboards, decks, and decision packs from real workbook data.</p>
          </div>
          <div className="rf-site-footer__links">
            {content.navigation.map((item) => (
              <SiteLink key={item.href} href={item.href} onNavigate={navigateTo}>
                {item.label}
              </SiteLink>
            ))}
            <SiteLink href={content.brand.supportHref} onNavigate={navigateTo}>
              Support
            </SiteLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
