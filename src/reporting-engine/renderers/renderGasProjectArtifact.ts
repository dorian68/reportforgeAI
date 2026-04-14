import {
  GeneratedGasProject,
  RangeSnapshot,
  ReportDesignSpec,
  ReportForgeBundle,
} from "../../shared/types";
import { getRenderableCanvasBlocks } from "../../services/canvas/canvasStudio";
import { escapeHtml, makeUniqueLabels, truncate } from "../../utils/formatting";
import { MAX_GAS_DATA_ROWS } from "../../shared/constants";

function buildRowObjects(
  snapshot: RangeSnapshot,
  hasHeaders: boolean
): Array<Record<string, string>> {
  const headerRow = hasHeaders ? (snapshot.text[0] ?? []) : [];
  const headers = makeUniqueLabels(
    Array.from({ length: snapshot.columnCount }, (_, index) => {
      const fallback = `Column ${index + 1}`;
      return truncate((headerRow[index] ?? fallback).trim() || fallback, 30);
    })
  );
  const startRow = hasHeaders ? 1 : 0;

  return snapshot.text.slice(startRow, startRow + MAX_GAS_DATA_ROWS).map((row) =>
    headers.reduce<Record<string, string>>((record, header, columnIndex) => {
      record[header] = String(row[columnIndex] ?? "");
      return record;
    }, {})
  );
}

function resolveGasPage(designSpec: ReportDesignSpec) {
  return designSpec.pages.find((entry) => entry.format === "gas-project") ?? null;
}

export function renderGasProjectArtifact(
  bundle: ReportForgeBundle,
  designSpec: ReportDesignSpec
): GeneratedGasProject {
  const gasPage = resolveGasPage(designSpec);
  if (!gasPage) {
    return bundle.gasProject;
  }

  const rows = buildRowObjects(bundle.snapshot, bundle.profile.hasHeaders);
  const filterField =
    bundle.profile.primaryDimensions[0] ?? bundle.profile.headers[0] ?? "Category";
  const orderedBlocks = getRenderableCanvasBlocks(gasPage, "gas-project");
  const payload = {
    title: bundle.plan.title,
    subtitle: bundle.plan.subtitle,
    primaryMessage: bundle.plan.storyPages[0]?.subtitle ?? bundle.plan.narrativeSummary,
    audience: bundle.plan.brief.audience,
    filterField,
    rows,
    kpis: bundle.plan.excel.kpis,
    charts: bundle.plan.excel.charts,
    storySections: bundle.plan.storyPages.map((page) => ({
      id: page.id,
      title: page.title,
      subtitle: page.subtitle,
      purpose: page.purpose,
      layoutFamily: page.layoutFamily,
      visualKind: page.visualKind,
      visualTitle: page.visualTitle,
      visualRationale: page.visualRationale,
      metricLabels: page.metricLabels,
      chartId: page.chartId ?? "",
      evidence: page.evidence,
      implication: page.implication ?? "",
      recommendation: page.recommendation ?? "",
    })),
    blocks: orderedBlocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      title: block.title,
      body: block.body,
      supportingText: block.supportingText ?? "",
      chartId: block.chartId ?? "",
      metricIds: block.metricIds ?? [],
      gridColumn: `${block.x} / span ${Math.min(block.w, 13 - block.x)}`,
      gridRow: `${block.y} / span ${block.h}`,
      emphasis: block.emphasis,
    })),
    brief: bundle.plan.brief,
    design: {
      styleName: designSpec.styleName,
      designTone: designSpec.designTone,
      pageRhythm: gasPage.pageRhythm,
      chartPreference: designSpec.chartPreference,
      viewLabels: designSpec.pages.map((page) => page.label),
    },
  };

  const payloadJson = JSON.stringify(payload, null, 2);

  return {
    title: `${bundle.plan.title} Apps Script Project`,
    summary:
      "AI-composed Apps Script reporting app with KPI ribbon, filters, story modules, action guidance, and analyst drilldown.",
    files: [
      {
        filename: "appsscript.json",
        language: "json",
        content: `{
  "timeZone": "Etc/UTC",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "access": "MYSELF",
    "executeAs": "USER_ACCESSING"
  }
}`,
      },
      {
        filename: "Code.gs",
        language: "javascript",
        content: `const REPORT_PAYLOAD = ${payloadJson};

function doGet() {
  const template = HtmlService.createTemplateFromFile("Index");
  template.payload = REPORT_PAYLOAD;
  return template.evaluate().setTitle(${JSON.stringify(bundle.plan.title)});
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDashboardData() {
  return REPORT_PAYLOAD;
}`,
      },
      {
        filename: "Index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="report-style" content="${escapeHtml(designSpec.styleName)}">
    <title>${escapeHtml(bundle.plan.title)}</title>
    <?!= include("Styles"); ?>
  </head>
  <body>
    <div class="shell">
      <header class="hero">
        <div class="hero__copy">
          <p class="eyebrow">ReportForge AI dashboard</p>
          <h1><?= payload.title ?></h1>
          <p class="subtitle"><?= payload.primaryMessage ?></p>
          <div class="hero__chips" id="view-chips"></div>
        </div>
        <aside class="hero__decision">
          <span>Main decision</span>
          <strong><?= payload.brief.keyDecision ?></strong>
          <p><?= payload.brief.businessGoal ?></p>
        </aside>
      </header>
      <section class="toolbar">
        <div>
          <label for="dimension-filter">Filter by <?= payload.filterField ?></label>
          <select id="dimension-filter"></select>
        </div>
        <div class="toolbar__meta">
          <span><?= payload.design.styleName ?></span>
          <span><?= payload.design.designTone ?></span>
          <span><?= payload.audience ?></span>
        </div>
      </section>
      <section id="kpi-ribbon" class="kpi-ribbon"></section>
      <section id="story-grid" class="story-grid"></section>
      <section class="evidence-shell">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Row evidence</p>
            <h2>Keep a drilldown table available after the summary view</h2>
          </div>
          <p id="row-count" class="section-heading__meta"></p>
        </div>
        <div id="evidence-table"></div>
      </section>
    </div>
    <script>
      window.REPORT_PAYLOAD = <?!= JSON.stringify(payload) ?>;
    </script>
    <?!= include("Client"); ?>
  </body>
</html>`,
      },
      {
        filename: "Styles.html",
        language: "html",
        content: `<style>
  :root {
    --bg: #eef6f5;
    --surface: ${bundle.plan.excel.theme.surface};
    --ink: ${bundle.plan.excel.theme.ink};
    --muted: ${bundle.plan.excel.theme.muted};
    --accent: ${bundle.plan.excel.theme.accent};
    --border: ${bundle.plan.excel.theme.border};
    --shadow: 0 22px 44px rgba(17, 57, 60, 0.1);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Aptos Display", "Aptos", "Segoe UI", sans-serif;
    color: var(--ink);
    background:
      radial-gradient(circle at top right, rgba(15, 118, 110, 0.18), transparent 28%),
      linear-gradient(180deg, #f4fbfb, var(--bg));
  }
  .shell {
    max-width: 1280px;
    margin: 0 auto;
    padding: 28px 18px 40px;
    display: grid;
    gap: 18px;
  }
  .hero,
  .toolbar,
  .kpi-ribbon,
  .story-card,
  .evidence-shell {
    background: rgba(255,255,255,0.95);
    border: 1px solid var(--border);
    border-radius: 24px;
    box-shadow: var(--shadow);
  }
  .hero {
    padding: 26px;
    display: grid;
    grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.9fr);
    gap: 18px;
  }
  .eyebrow {
    margin: 0 0 8px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
  }
  h1, h2, h3, p { margin: 0; }
  .subtitle,
  .hero__decision p,
  .section-heading__meta,
  .story-card p,
  td,
  th {
    color: var(--muted);
  }
  .hero__chips,
  .toolbar__meta,
  .story-card__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .hero__chips span,
  .toolbar__meta span,
  .story-card__chips span {
    border-radius: 999px;
    padding: 8px 12px;
    background: #eef7f6;
    border: 1px solid #d5e7e4;
  }
  .hero__decision {
    border-radius: 20px;
    padding: 18px;
    background: linear-gradient(180deg, rgba(15,118,110,0.12), #ffffff);
    display: grid;
    gap: 10px;
  }
  .hero__decision span {
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .hero__decision strong {
    font-size: 24px;
    line-height: 1.2;
  }
  .toolbar,
  .evidence-shell {
    padding: 18px;
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: end;
  }
  label {
    display: grid;
    gap: 8px;
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
  }
  select {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 12px;
    font: inherit;
    color: var(--ink);
    background: #fff;
  }
  .kpi-ribbon {
    padding: 18px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }
  .kpi-card,
  .story-card__kpi {
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 14px;
    background: linear-gradient(180deg, rgba(15, 118, 110, 0.08), #ffffff);
  }
  .kpi-card strong,
  .story-card__kpi strong {
    display: block;
    margin: 8px 0;
    color: var(--accent);
    font-size: 24px;
  }
  .story-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }
  .story-card {
    padding: 20px;
    display: grid;
    gap: 14px;
  }
  .story-card--featured,
  .story-card--action {
    grid-column: span 2;
  }
  .story-card--action {
    background:
      linear-gradient(135deg, rgba(15, 118, 110, 0.12), rgba(255,255,255,0.98)),
      #ffffff;
  }
  .story-card__eyebrow {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .story-visual {
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 16px;
    background: linear-gradient(180deg, #f8fbfb, #ffffff);
  }
  .story-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  .story-spark {
    width: 100%;
    height: 92px;
  }
  .story-spark polyline {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .story-bars,
  .story-list {
    display: grid;
    gap: 10px;
  }
  .story-bars__row {
    display: grid;
    grid-template-columns: minmax(90px, 120px) 1fr 64px;
    gap: 10px;
    align-items: center;
  }
  .story-bars__track {
    background: rgba(15,118,110,0.09);
    border-radius: 999px;
    overflow: hidden;
    height: 10px;
  }
  .story-bars__fill {
    height: 100%;
    display: block;
    background: linear-gradient(90deg, var(--accent), #34d399);
    border-radius: inherit;
  }
  .story-composition {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: 10px;
  }
  .story-composition__item {
    border-radius: 16px;
    padding: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
  }
  .story-composition__item strong {
    display: block;
    font-size: 22px;
    color: var(--accent);
  }
  .story-highlight {
    border-radius: 18px;
    padding: 16px;
    background: var(--surface);
  }
  .story-list {
    margin: 0;
    padding-left: 18px;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
    margin-bottom: 12px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    padding: 10px 8px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    font-size: 13px;
  }
  @media (max-width: 920px) {
    .hero,
    .story-grid,
    .kpi-ribbon {
      grid-template-columns: 1fr;
    }
    .story-card--featured,
    .story-card--action {
      grid-column: auto;
    }
    .toolbar {
      display: grid;
      align-items: stretch;
    }
  }
</style>`,
      },
      {
        filename: "Client.html",
        language: "html",
        content: `<script>
  (function () {
    const payload = window.REPORT_PAYLOAD || {};
    const layoutBlocks = payload.blocks || [];
    const filterField = payload.filterField;
    const filterElement = document.getElementById("dimension-filter");
    const kpiRibbon = document.getElementById("kpi-ribbon");
    const storyGrid = document.getElementById("story-grid");
    const evidenceTable = document.getElementById("evidence-table");
    const rowCount = document.getElementById("row-count");
    const viewChips = document.getElementById("view-chips");

    function unique(values) {
      return Array.from(new Set(values.filter(Boolean)));
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function compactNumber(value) {
      const number = Number(value || 0);
      if (Math.abs(number) >= 1000) {
        return number.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 });
      }
      return number.toLocaleString();
    }

    function renderSparkline(values) {
      const points = (values || []).slice(0, 10);
      if (!points.length) {
        return "";
      }
      const min = Math.min.apply(Math, points);
      const max = Math.max.apply(Math, points);
      const span = max - min || 1;
      const coordinates = points.map(function (value, index) {
        const x = (index / Math.max(points.length - 1, 1)) * 100;
        const y = 54 - ((value - min) / span) * 44;
        return x + "," + y;
      }).join(" ");
      return "<svg class='story-spark' viewBox='0 0 100 60' preserveAspectRatio='none'><polyline points='" + coordinates + "'></polyline></svg>";
    }

    function renderBars(labels, values) {
      const pairs = (labels || []).slice(0, 5).map(function (label, index) {
        return { label: label, value: values[index] || 0 };
      });
      const max = Math.max.apply(Math, pairs.map(function (pair) { return Math.abs(pair.value); }).concat([1]));
      return "<div class='story-bars'>" + pairs.map(function (pair) {
        const width = max === 0 ? 0 : Math.max(8, Math.round((Math.abs(pair.value) / max) * 100));
        return "<div class='story-bars__row'>" +
          "<span>" + escapeHtml(pair.label) + "</span>" +
          "<div class='story-bars__track'><span class='story-bars__fill' style='width:" + width + "%'></span></div>" +
          "<strong>" + escapeHtml(compactNumber(pair.value)) + "</strong>" +
        "</div>";
      }).join("") + "</div>";
    }

    function renderComposition(chart) {
      if (!chart) {
        return "";
      }
      const total = (chart.values || []).reduce(function (sum, value) {
        return sum + Math.abs(value || 0);
      }, 0) || 1;
      return "<div class='story-composition'>" + (chart.categories || []).slice(0, 5).map(function (label, index) {
        const value = Math.round((Math.abs(chart.values[index] || 0) / total) * 100);
        return "<div class='story-composition__item'><strong>" + value + "%</strong><span>" + escapeHtml(label) + "</span></div>";
      }).join("") + "</div>";
    }

    function renderVisual(section) {
      const chart = (payload.charts || []).find(function (entry) { return entry.id === section.chartId; });
      if (section.visualKind === "kpi-strip") {
        const kpis = (payload.kpis || []).filter(function (kpi) {
          return (section.metricLabels || []).indexOf(kpi.label) >= 0;
        }).slice(0, 4);
        return "<div class='story-kpis'>" + kpis.map(function (kpi) {
          return "<article class='story-card__kpi'><span>" + escapeHtml(kpi.label) + "</span><strong>" +
            escapeHtml(kpi.formattedValue) + "</strong><p>" + escapeHtml(kpi.insight) + "</p></article>";
        }).join("") + "</div>";
      }
      if (section.visualKind === "line" || section.visualKind === "area") {
        return "<div class='story-visual'>" + renderSparkline(chart && chart.values) +
          "<p>" + escapeHtml(section.visualTitle || section.visualRationale || "") + "</p></div>";
      }
      if (section.visualKind === "bar" || section.visualKind === "stacked-bar" || section.visualKind === "map") {
        return "<div class='story-visual'>" + renderBars(chart && chart.categories, chart && chart.values) + "</div>";
      }
      if (section.visualKind === "donut") {
        return "<div class='story-visual'>" + renderComposition(chart) + "</div>";
      }
      return "<div class='story-highlight'><strong>" + escapeHtml(section.visualTitle || section.title) + "</strong><p>" +
        escapeHtml(section.visualRationale || section.subtitle || "") + "</p></div>";
    }

    function renderKpis() {
      kpiRibbon.innerHTML = (payload.kpis || []).slice(0, 4).map(function (kpi) {
        return "<article class='kpi-card'><span>" + escapeHtml(kpi.label) + "</span><strong>" +
          escapeHtml(kpi.formattedValue) + "</strong><p>" + escapeHtml(kpi.insight) + "</p></article>";
      }).join("");
    }

    function renderStorySections() {
      storyGrid.innerHTML = (payload.storySections || []).map(function (section, index) {
        const cardClass =
          section.purpose === "trend-analysis"
            ? "story-card story-card--featured"
            : section.purpose === "recommendation"
              ? "story-card story-card--action"
              : "story-card";
        return "<article class='" + cardClass + "'>" +
          "<div class='story-card__eyebrow'><span>" + escapeHtml(String(section.purpose || "").replace(/-/g, " ")) + "</span><span>" +
          escapeHtml(String(section.layoutFamily || "").replace(/-/g, " ")) + "</span></div>" +
          "<h3>" + escapeHtml(section.title || ("Section " + (index + 1))) + "</h3>" +
          "<p>" + escapeHtml(section.subtitle || "") + "</p>" +
          "<div class='story-card__chips'>" + (section.metricLabels || []).slice(0, 4).map(function (metric) {
            return "<span>" + escapeHtml(metric) + "</span>";
          }).join("") + "</div>" +
          renderVisual(section) +
          "<ul class='story-list'>" + (section.evidence || []).slice(0, 3).map(function (item) {
            return "<li>" + escapeHtml(item) + "</li>";
          }).join("") + "</ul>" +
          (section.implication ? "<p><strong>Implication.</strong> " + escapeHtml(section.implication) + "</p>" : "") +
          (section.recommendation ? "<p><strong>Next move.</strong> " + escapeHtml(section.recommendation) + "</p>" : "") +
        "</article>";
      }).join("");
    }

    function renderTable(rows) {
      if (!rows.length) {
        evidenceTable.innerHTML = "<p>No rows matched the current filter.</p>";
        rowCount.textContent = "0 rows visible";
        return;
      }

      const headers = Object.keys(rows[0]).slice(0, 5);
      rowCount.textContent = rows.length + " rows visible";
      evidenceTable.innerHTML = "<table><thead><tr>" +
        headers.map(function (header) { return "<th>" + escapeHtml(header) + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
        rows.slice(0, 8).map(function (row) {
          return "<tr>" + headers.map(function (header) { return "<td>" + escapeHtml(row[header] || "") + "</td>"; }).join("") + "</tr>";
        }).join("") +
        "</tbody></table>";
    }

    function render() {
      const rows = payload.rows || [];
      const selected = filterElement.value;
      const filteredRows = selected === "All"
        ? rows
        : rows.filter(function (row) { return String(row[filterField] || "") === selected; });
      renderKpis();
      renderStorySections();
      renderTable(filteredRows);
    }

    function bootstrapFilter() {
      const options = ["All"].concat(unique((payload.rows || []).map(function (row) {
        return String(row[filterField] || "");
      })));

      filterElement.innerHTML = options.map(function (option) {
        const safeOption = escapeHtml(option);
        return "<option value='" + safeOption + "'>" + safeOption + "</option>";
      }).join("");

      viewChips.innerHTML = (payload.design.viewLabels || []).slice(0, 5).map(function (label) {
        return "<span>" + escapeHtml(label) + "</span>";
      }).join("") + (layoutBlocks.length ? "<span>" + layoutBlocks.length + " layout blocks</span>" : "");

      filterElement.addEventListener("change", render);
    }

    bootstrapFilter();
    render();
  })();
</script>`,
      },
    ],
    deploymentSteps: [
      "Create a new Apps Script project from script.google.com.",
      "Add the generated files and keep the filenames exactly as provided.",
      `The scaffold embeds up to ${MAX_GAS_DATA_ROWS} rows for review. Replace that payload with a live data source for production dashboards.`,
      "Review the KPI ribbon, story modules, and table interactions before widening web-app access.",
      "Keep the report brief aligned with the same saved template or prompt when regenerating future Apps Script dashboards.",
    ],
  };
}
