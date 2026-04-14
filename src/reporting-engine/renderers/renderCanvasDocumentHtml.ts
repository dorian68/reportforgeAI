import { CanvasDocument, ReportDesignSpec, ReportForgeBundle } from "../../shared/types";
import { normalizeCanvasDocument } from "../../services/canvas/canvasGeometry";
import { ReportPlan } from "../domain/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(value) >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function renderKpiRibbon(bundle: ReportForgeBundle): string {
  return `
    <section class="rf-kpi-ribbon">
      ${bundle.plan.excel.kpis
        .slice(0, 4)
        .map(
          (kpi) => `
        <article class="rf-kpi-card">
          <span class="rf-kpi-card__label">${escapeHtml(kpi.label)}</span>
          <strong>${escapeHtml(kpi.formattedValue)}</strong>
          <p>${escapeHtml(kpi.insight)}</p>
        </article>
      `
        )
        .join("")}
    </section>
  `;
}

function renderSparkline(values: number[]): string {
  const points = values.slice(0, 10);
  if (points.length === 0) {
    return "";
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coordinates = points
    .map((value, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 54 - ((value - min) / span) * 44;
      return `${x},${y}`;
    })
    .join(" ");

  return `
    <svg class="rf-story-visual__spark" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${coordinates}" />
    </svg>
  `;
}

function renderBarList(labels: string[], values: number[], modifierClass = ""): string {
  const pairs = labels.slice(0, 5).map((label, index) => ({
    label,
    value: values[index] ?? 0,
  }));
  const max = Math.max(...pairs.map((pair) => Math.abs(pair.value)), 1);

  return `
    <div class="rf-story-bars ${modifierClass}">
      ${pairs
        .map(
          (pair) => `
        <div class="rf-story-bars__row">
          <span>${escapeHtml(pair.label)}</span>
          <div class="rf-story-bars__track">
            <span class="rf-story-bars__fill" style="width:${Math.max(8, Math.round((Math.abs(pair.value) / max) * 100))}%"></span>
          </div>
          <strong>${escapeHtml(compactNumber(pair.value))}</strong>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderCompositionVisual(bundle: ReportForgeBundle, chartId: string | undefined): string {
  if (!chartId) {
    return "";
  }

  const chart = bundle.plan.excel.charts.find((entry) => entry.id === chartId);
  if (!chart) {
    return "";
  }

  const total = chart.values.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
  return `
    <div class="rf-story-composition">
      ${chart.categories
        .slice(0, 5)
        .map(
          (label, index) => `
        <div class="rf-story-composition__item">
          <strong>${Math.round((Math.abs(chart.values[index] ?? 0) / total) * 100)}%</strong>
          <span>${escapeHtml(label)}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderStoryVisual(
  page: ReportPlan["storyPages"][number],
  bundle: ReportForgeBundle
): string {
  const chart = page.chartId
    ? bundle.plan.excel.charts.find((entry) => entry.id === page.chartId)
    : null;

  if (page.visualKind === "kpi-strip") {
    const metricSet = new Set(page.metricLabels);
    const kpis = bundle.plan.excel.kpis.filter((kpi) => metricSet.has(kpi.label)).slice(0, 4);
    return `
      <div class="rf-story-kpis">
        ${kpis
          .map(
            (kpi) => `
          <article class="rf-story-kpi">
            <span>${escapeHtml(kpi.label)}</span>
            <strong>${escapeHtml(kpi.formattedValue)}</strong>
            <p>${escapeHtml(kpi.insight)}</p>
          </article>
        `
          )
          .join("")}
      </div>
    `;
  }

  if (page.visualKind === "line" || page.visualKind === "area") {
    return `
      <div class="rf-story-visual">
        ${renderSparkline(chart?.values ?? [])}
        <div class="rf-story-visual__caption">${escapeHtml(page.visualTitle)}</div>
      </div>
    `;
  }

  if (page.visualKind === "bar" || page.visualKind === "stacked-bar" || page.visualKind === "map") {
    return renderBarList(
      chart?.categories ?? page.metricLabels,
      chart?.values ?? [],
      page.visualKind === "map" ? "rf-story-bars--map" : ""
    );
  }

  if (page.visualKind === "donut") {
    return renderCompositionVisual(bundle, page.chartId);
  }

  if (page.visualKind === "table") {
    const headers = bundle.plan.excel.reportTableHeaders.slice(0, 4);
    const rows = bundle.plan.excel.reportTableRows.slice(0, 4);
    return `
      <table class="rf-story-table">
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>${row
              .slice(0, headers.length)
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join("")}</tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  return `
    <div class="rf-story-highlight">
      <strong>${escapeHtml(page.visualTitle)}</strong>
      <p>${escapeHtml(page.visualRationale)}</p>
    </div>
  `;
}

function renderStoryCard(
  page: ReportPlan["storyPages"][number],
  bundle: ReportForgeBundle,
  options: { featured?: boolean; action?: boolean } = {}
): string {
  return `
    <article class="rf-story-card ${options.featured ? "rf-story-card--featured" : ""} ${options.action ? "rf-story-card--action" : ""}">
      <div class="rf-story-card__eyebrow">
        <span>${escapeHtml(page.purpose.replace(/-/g, " "))}</span>
        <span>${escapeHtml(page.layoutFamily.replace(/-/g, " "))}</span>
      </div>
      <h3>${escapeHtml(page.title)}</h3>
      <p class="rf-story-card__subtitle">${escapeHtml(page.subtitle || page.storyBeat)}</p>
      <div class="rf-chip-list">
        ${page.metricLabels
          .slice(0, 4)
          .map((metric) => `<span class="rf-story-chip">${escapeHtml(metric)}</span>`)
          .join("")}
      </div>
      <div class="rf-story-card__visual">
        ${renderStoryVisual(page, bundle)}
      </div>
      <ul class="rf-story-list">
        ${page.evidence
          .slice(0, 3)
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}
      </ul>
      ${page.implication ? `<p class="rf-story-card__implication"><strong>Implication.</strong> ${escapeHtml(page.implication)}</p>` : ""}
      ${page.recommendation ? `<p class="rf-story-card__action"><strong>Next move.</strong> ${escapeHtml(page.recommendation)}</p>` : ""}
    </article>
  `;
}

function renderEvidenceTable(bundle: ReportForgeBundle): string {
  const headers = bundle.plan.excel.reportTableHeaders.slice(0, 5);
  const rows = bundle.plan.excel.reportTableRows.slice(0, 6);
  return `
    <section class="rf-evidence-table">
      <div class="rf-section-heading">
        <div>
          <span class="rf-section-heading__eyebrow">Evidence table</span>
          <h2>Keep a row-level view available for analyst follow-up</h2>
        </div>
      </div>
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
            <tr>${row
              .slice(0, headers.length)
              .map((cell) => `<td>${escapeHtml(cell)}</td>`)
              .join("")}</tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

export function renderCanvasDocumentHtml(
  canvasDocument: CanvasDocument,
  designSpec: ReportDesignSpec,
  plan: ReportPlan,
  bundle: ReportForgeBundle
): string {
  const normalizedDocument = normalizeCanvasDocument(canvasDocument);
  const storyPages = plan.storyPages;
  const recommendationPage =
    storyPages.find((page) => page.purpose === "recommendation") ??
    storyPages[storyPages.length - 1];
  const primaryTrendPage = storyPages.find((page) => page.purpose === "trend-analysis") ?? null;
  const secondaryPages = storyPages.filter(
    (page) =>
      page.id !== primaryTrendPage?.id &&
      page.id !== recommendationPage?.id &&
      page.purpose !== "executive-summary"
  );

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(plan.title)}</title>
    <style>
      :root {
        --rf-accent: ${bundle.plan.excel.theme.accent};
        --rf-surface: ${bundle.plan.excel.theme.surface};
        --rf-border: ${bundle.plan.excel.theme.border};
        --rf-ink: ${bundle.plan.excel.theme.ink};
        --rf-muted: ${bundle.plan.excel.theme.muted};
        --rf-shadow: 0 22px 46px rgba(11, 39, 44, 0.1);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Aptos Display", "Aptos", "Segoe UI", sans-serif;
        color: var(--rf-ink);
        background:
          radial-gradient(circle at top right, rgba(15, 118, 110, 0.18), transparent 28%),
          linear-gradient(180deg, #eff7f6 0%, #f9fcfc 38%, #ffffff 100%);
      }
      main {
        max-width: 1360px;
        margin: 0 auto;
        padding: 28px 18px 44px;
        display: grid;
        gap: 18px;
      }
      .rf-report-shell,
      .rf-kpi-ribbon,
      .rf-story-card,
      .rf-decision-panel,
      .rf-brief-panel,
      .rf-evidence-table {
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid var(--rf-border);
        border-radius: 24px;
        box-shadow: var(--rf-shadow);
      }
      .rf-report-shell {
        padding: 28px;
        display: grid;
        gap: 18px;
      }
      .rf-report-shell__eyebrow,
      .rf-section-heading__eyebrow,
      .rf-story-card__eyebrow,
      .rf-view-chip {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 11px;
        font-weight: 700;
        color: var(--rf-accent);
      }
      .rf-report-shell h1,
      .rf-section-heading h2,
      .rf-story-card h3 {
        margin: 0;
      }
      .rf-report-shell__subcopy,
      .rf-story-card__subtitle,
      .rf-brief-panel p,
      .rf-decision-panel p,
      .rf-story-card p,
      .rf-evidence-table td,
      .rf-evidence-table th {
        color: var(--rf-muted);
      }
      .rf-report-topline {
        display: grid;
        grid-template-columns: minmax(0, 2.1fr) minmax(320px, 1fr);
        gap: 18px;
      }
      .rf-report-meta,
      .rf-view-list,
      .rf-story-card__eyebrow,
      .rf-chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .rf-report-meta span,
      .rf-story-chip,
      .rf-view-chip {
        border-radius: 999px;
        padding: 8px 12px;
        background: #eef7f6;
        border: 1px solid #d6e9e6;
      }
      .rf-report-panels {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
      .rf-decision-panel,
      .rf-brief-panel,
      .rf-evidence-table {
        padding: 22px;
      }
      .rf-kpi-ribbon {
        padding: 18px;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }
      .rf-kpi-card,
      .rf-story-kpi {
        border: 1px solid var(--rf-border);
        border-radius: 18px;
        padding: 14px;
        background: linear-gradient(180deg, rgba(15, 118, 110, 0.08), #ffffff);
      }
      .rf-kpi-card strong,
      .rf-story-kpi strong {
        display: block;
        margin: 8px 0;
        font-size: 24px;
        color: var(--rf-accent);
      }
      .rf-kpi-card__label {
        display: block;
        font-size: 12px;
        color: var(--rf-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .rf-story-layout {
        display: grid;
        gap: 18px;
      }
      .rf-story-layout--featured {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr);
        gap: 18px;
      }
      .rf-story-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
      .rf-story-card {
        padding: 22px;
        display: grid;
        gap: 14px;
      }
      .rf-story-card--featured {
        min-height: 100%;
      }
      .rf-story-card--action {
        background:
          linear-gradient(135deg, rgba(15, 118, 110, 0.12), rgba(255,255,255,0.98)),
          #ffffff;
      }
      .rf-story-card__visual {
        border: 1px solid var(--rf-border);
        border-radius: 20px;
        padding: 16px;
        background: linear-gradient(180deg, #f8fbfb, #ffffff);
      }
      .rf-story-visual__spark {
        width: 100%;
        height: 96px;
      }
      .rf-story-visual__spark polyline {
        fill: none;
        stroke: var(--rf-accent);
        stroke-width: 3;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      .rf-story-visual__caption {
        font-size: 12px;
        color: var(--rf-muted);
      }
      .rf-story-bars,
      .rf-story-list {
        display: grid;
        gap: 10px;
      }
      .rf-story-bars__row {
        display: grid;
        grid-template-columns: minmax(90px, 120px) 1fr 70px;
        gap: 10px;
        align-items: center;
      }
      .rf-story-bars__track {
        background: rgba(15, 118, 110, 0.08);
        border-radius: 999px;
        overflow: hidden;
        height: 12px;
      }
      .rf-story-bars__fill {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--rf-accent), #35b3a8);
      }
      .rf-story-composition {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
        gap: 12px;
      }
      .rf-story-composition__item {
        border-radius: 16px;
        padding: 14px;
        background: var(--rf-surface);
        border: 1px solid var(--rf-border);
      }
      .rf-story-composition__item strong {
        display: block;
        font-size: 24px;
        color: var(--rf-accent);
      }
      .rf-story-kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
      }
      .rf-story-table,
      .rf-evidence-table table {
        width: 100%;
        border-collapse: collapse;
      }
      .rf-story-table th,
      .rf-story-table td,
      .rf-evidence-table th,
      .rf-evidence-table td {
        text-align: left;
        padding: 10px 8px;
        border-bottom: 1px solid var(--rf-border);
      }
      .rf-story-highlight {
        border-radius: 18px;
        padding: 16px;
        background: var(--rf-surface);
      }
      .rf-story-list {
        margin: 0;
        padding-left: 18px;
      }
      .rf-story-card__implication,
      .rf-story-card__action {
        margin: 0;
      }
      @media (max-width: 980px) {
        .rf-report-topline,
        .rf-report-panels,
        .rf-story-layout--featured,
        .rf-story-grid,
        .rf-kpi-ribbon {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="rf-report-shell">
        <div class="rf-report-shell__eyebrow">AI reporting canvas</div>
        <div class="rf-report-topline">
          <div>
            <h1>${escapeHtml(plan.title)}</h1>
            <p class="rf-report-shell__subcopy">${escapeHtml(plan.primaryMessage)}</p>
            <div class="rf-report-meta">
              <span>${escapeHtml(designSpec.styleName)}</span>
              <span>${escapeHtml(plan.audience)}</span>
              <span>${escapeHtml(plan.brief.outputStyle)}</span>
              <span>${escapeHtml(plan.brief.visualDensity)}</span>
            </div>
          </div>
          <div class="rf-brief-panel">
            <span class="rf-section-heading__eyebrow">Delivery views</span>
            <div class="rf-view-list">
              ${normalizedDocument.pages.map((page) => `<span class="rf-view-chip">${escapeHtml(page.label)}</span>`).join("")}
            </div>
            <p>${escapeHtml(plan.confidenceStatement)}</p>
          </div>
        </div>
        <div class="rf-report-panels">
          <div class="rf-decision-panel">
            <span class="rf-section-heading__eyebrow">Decision focus</span>
            <h2>${escapeHtml(plan.brief.keyDecision)}</h2>
            <p>${escapeHtml(plan.brief.businessGoal)}</p>
          </div>
          <div class="rf-brief-panel">
            <span class="rf-section-heading__eyebrow">Reporting brief</span>
            <div class="rf-chip-list">
              ${plan.brief.focusAreas
                .slice(0, 5)
                .map((item) => `<span class="rf-story-chip">${escapeHtml(item)}</span>`)
                .join("")}
              ${plan.brief.targetOrBenchmark ? `<span class="rf-story-chip">${escapeHtml(plan.brief.targetOrBenchmark)}</span>` : ""}
            </div>
            <p>${escapeHtml(plan.brief.datasetSummary)}</p>
          </div>
        </div>
      </section>
      ${renderKpiRibbon(bundle)}
      <section class="rf-story-layout">
        ${
          primaryTrendPage
            ? `
          <div class="rf-story-layout--featured">
            ${renderStoryCard(primaryTrendPage, bundle, { featured: true })}
            ${renderStoryCard(recommendationPage, bundle, { action: true })}
          </div>
        `
            : recommendationPage
              ? `
          <div class="rf-story-layout--featured">
            ${renderStoryCard(storyPages[0], bundle, { featured: true })}
            ${renderStoryCard(recommendationPage, bundle, { action: true })}
          </div>
        `
              : ""
        }
        ${
          secondaryPages.length > 0
            ? `
          <div class="rf-story-grid">
            ${secondaryPages.map((page) => renderStoryCard(page, bundle)).join("")}
          </div>
        `
            : ""
        }
      </section>
      ${renderEvidenceTable(bundle)}
    </main>
  </body>
</html>`;
}
