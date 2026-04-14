import { MAX_GAS_DATA_ROWS } from "../../shared/constants";
import {
  DatasetProfile,
  GeneratedGasProject,
  PromptInterpretation,
  RangeSnapshot,
  ReportPlan,
} from "../../shared/types";
import { escapeHtml, makeUniqueLabels, truncate } from "../../utils/formatting";

interface DashboardSectionPayload {
  id: string;
  title: string;
  subtitle: string;
  purpose: string;
  visualKind: string;
  visualTitle: string;
  visualRationale: string;
  evidence: string[];
  implication?: string;
  recommendation?: string;
  chartId?: string;
  metricLabels: string[];
}

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

  return snapshot.text.slice(startRow, startRow + MAX_GAS_DATA_ROWS).map((row) => {
    return headers.reduce<Record<string, string>>((record, header, columnIndex) => {
      record[header] = String(row[columnIndex] ?? "");
      return record;
    }, {});
  });
}

function buildDashboardSections(plan: ReportPlan): DashboardSectionPayload[] {
  return plan.storyPages.map((page) => ({
    id: page.id,
    title: page.title,
    subtitle: page.subtitle,
    purpose: page.purpose,
    visualKind: page.visualKind,
    visualTitle: page.visualTitle,
    visualRationale: page.visualRationale,
    evidence: page.evidence.slice(0, 4),
    implication: page.implication,
    recommendation: page.recommendation ?? page.callToAction,
    chartId: page.chartId,
    metricLabels: page.metricLabels,
  }));
}

export function generateGasProject(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  plan: ReportPlan
): GeneratedGasProject {
  const dataRows = buildRowObjects(snapshot, profile.hasHeaders);
  const filterField = profile.primaryDimensions[0] ?? profile.headers[0] ?? "Category";
  const payload = {
    title: plan.title,
    subtitle: plan.subtitle,
    brief: {
      audience: plan.brief.audience,
      reportType: plan.brief.reportType,
      keyDecision: plan.brief.keyDecision,
      datasetSummary: plan.brief.datasetSummary,
      focusAreas: plan.brief.focusAreas,
    },
    filterField,
    rows: dataRows,
    kpis: plan.excel.kpis,
    charts: plan.excel.charts,
    sections: buildDashboardSections(plan),
    recommendations: plan.recommendations,
    generatedFor: prompt.audience,
  };
  const payloadJson = JSON.stringify(payload, null, 2);

  return {
    title: `${plan.title} Apps Script Project`,
    summary:
      "Deployable Apps Script scaffold with HtmlService, plus a dashboard header, KPI ribbon, story modules, filters, and evidence table.",
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
  return template.evaluate().setTitle(${JSON.stringify(plan.title)});
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
    <title>${escapeHtml(plan.title)}</title>
    <?!= include("Styles"); ?>
  </head>
  <body>
    <div class="shell">
      <header class="hero">
        <div class="hero__copy">
          <p class="eyebrow"><?= payload.brief.reportType ?></p>
          <h1><?= payload.title ?></h1>
          <p class="subtitle"><?= payload.subtitle ?></p>
          <p class="hero__decision"><?= payload.brief.keyDecision ?></p>
        </div>
        <div class="hero__meta">
          <span><?= payload.brief.audience ?></span>
          <span><?= payload.rows.length ?> rows embedded</span>
          <span><?= payload.brief.datasetSummary ?></span>
        </div>
      </header>

      <section class="toolbar">
        <div class="toolbar__group">
          <label for="dimension-filter">Filter</label>
          <select id="dimension-filter"></select>
        </div>
        <div class="toolbar__group toolbar__group--chips" id="focus-chip-row"></div>
      </section>

      <section class="kpi-ribbon" id="kpi-ribbon"></section>

      <main class="dashboard">
        <section class="dashboard__main" id="story-grid"></section>
        <aside class="dashboard__side">
          <section class="panel">
            <div class="panel__head">
              <h2>Action focus</h2>
            </div>
            <ul class="action-list" id="action-list"></ul>
          </section>
          <section class="panel">
            <div class="panel__head">
              <h2>Evidence table</h2>
            </div>
            <div class="table-wrap">
              <table>
                <thead id="table-head"></thead>
                <tbody id="table-body"></tbody>
              </table>
            </div>
          </section>
        </aside>
      </main>
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
    --bg: #f3f6fb;
    --surface: #ffffff;
    --surface-soft: #f7fafc;
    --ink: #0f172a;
    --muted: #5b6b84;
    --accent: #0f766e;
    --accent-soft: rgba(15, 118, 110, 0.08);
    --border: #d9e3ef;
    --shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
    --danger-soft: rgba(190, 24, 93, 0.08);
    --danger: #be185d;
    --warning-soft: rgba(180, 83, 9, 0.1);
    --warning: #b45309;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: "Aptos", "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at top left, rgba(15, 118, 110, 0.08), transparent 28%),
      linear-gradient(180deg, #f8fbfd, var(--bg));
    color: var(--ink);
  }

  .shell {
    max-width: 1320px;
    margin: 0 auto;
    padding: 28px 20px 40px;
    display: grid;
    gap: 18px;
  }

  .hero,
  .toolbar,
  .panel,
  .story-card,
  .kpi-card {
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  .hero {
    border-radius: 28px;
    padding: 28px;
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
    gap: 18px;
  }

  .eyebrow {
    margin: 0 0 8px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
  }

  h1,
  h2,
  h3 {
    margin: 0;
  }

  .subtitle,
  .hero__decision {
    margin: 10px 0 0;
    color: var(--muted);
  }

  .hero__decision {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
  }

  .hero__meta {
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .hero__meta span,
  .focus-chip {
    border-radius: 999px;
    padding: 8px 12px;
    background: var(--surface-soft);
    border: 1px solid var(--border);
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
  }

  .toolbar {
    border-radius: 20px;
    padding: 14px 16px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }

  .toolbar__group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toolbar__group--chips {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  select {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 12px;
    font: inherit;
    background: #fff;
    color: var(--ink);
  }

  .kpi-ribbon {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }

  .kpi-card {
    border-radius: 20px;
    padding: 16px;
    background: linear-gradient(180deg, #ffffff, var(--surface-soft));
  }

  .kpi-card span {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .kpi-card strong {
    display: block;
    margin-top: 10px;
    font-size: 30px;
    line-height: 1.05;
  }

  .kpi-card p {
    margin: 8px 0 0;
    color: var(--muted);
  }

  .dashboard {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.85fr);
    gap: 18px;
    align-items: start;
  }

  .dashboard__main {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .dashboard__side {
    display: grid;
    gap: 16px;
  }

  .panel,
  .story-card {
    border-radius: 24px;
    padding: 20px;
  }

  .panel__head,
  .story-card__head {
    display: grid;
    gap: 8px;
    margin-bottom: 14px;
  }

  .story-card__eyebrow {
    color: var(--accent);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .story-card__subtitle {
    color: var(--muted);
  }

  .story-card__grid {
    display: grid;
    gap: 16px;
  }

  .story-card__grid--split {
    grid-template-columns: minmax(0, 1.1fr) minmax(220px, 0.9fr);
  }

  .story-card__list,
  .action-list {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 10px;
  }

  .story-card__list li,
  .action-list li,
  td,
  th,
  p {
    color: var(--muted);
    line-height: 1.55;
  }

  .story-card__aside,
  .story-card__visual,
  .story-card__readout {
    border: 1px solid var(--border);
    border-radius: 18px;
    background: var(--surface-soft);
    padding: 14px;
  }

  .story-card[data-purpose="anomaly"] .story-card__aside {
    background: var(--danger-soft);
    border-color: rgba(190, 24, 93, 0.18);
  }

  .story-card[data-purpose="recommendation"] .story-card__aside {
    background: var(--warning-soft);
    border-color: rgba(180, 83, 9, 0.18);
  }

  .bars {
    display: grid;
    gap: 10px;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 110px 1fr 72px;
    gap: 10px;
    align-items: center;
    font-size: 13px;
  }

  .bar-track {
    height: 10px;
    border-radius: 999px;
    background: #e8eff7;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #0f766e, #38bdf8);
  }

  .donut-shell {
    display: grid;
    gap: 16px;
    align-items: center;
  }

  .donut {
    width: 160px;
    height: 160px;
    margin: 0 auto;
    border-radius: 50%;
    position: relative;
  }

  .donut::after {
    content: "";
    position: absolute;
    inset: 22%;
    border-radius: 50%;
    background: #fff;
  }

  .donut-legend {
    display: grid;
    gap: 8px;
  }

  .donut-legend__row {
    display: grid;
    grid-template-columns: 12px 1fr auto;
    gap: 10px;
    align-items: center;
    font-size: 13px;
  }

  .donut-legend__swatch {
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 10px 8px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    font-size: 13px;
  }

  th {
    color: var(--muted);
    font-weight: 700;
  }

  @media (max-width: 980px) {
    .hero,
    .dashboard,
    .story-card__grid--split {
      grid-template-columns: 1fr;
    }

    .dashboard__main {
      grid-template-columns: 1fr;
    }

    .toolbar {
      display: grid;
    }

    .bar-row {
      grid-template-columns: 1fr;
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
    const filterField = payload.filterField;
    const filterElement = document.getElementById("dimension-filter");
    const focusChipRow = document.getElementById("focus-chip-row");
    const kpiRibbon = document.getElementById("kpi-ribbon");
    const storyGrid = document.getElementById("story-grid");
    const actionList = document.getElementById("action-list");
    const tableHead = document.getElementById("table-head");
    const tableBody = document.getElementById("table-body");

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

    function colors(index) {
      const palette = ["#0f766e", "#14b8a6", "#38bdf8", "#f59e0b", "#fb7185"];
      return palette[index % palette.length];
    }

    function findChart(chartId) {
      return (payload.charts || []).find(function (entry) { return entry.id === chartId; });
    }

    function renderBars(chart) {
      if (!chart) {
        return "<p>No chart-ready series was detected for this section.</p>";
      }
      const maxValue = Math.max.apply(Math, chart.values || [1]);
      return (
        "<div class='bars'>" +
          (chart.categories || []).slice(0, 6).map(function (category, index) {
            const rawValue = chart.values[index] || 0;
            const percent = maxValue === 0 ? 0 : Math.max(8, Math.round((rawValue / maxValue) * 100));
            return (
              "<div class='bar-row'>" +
                "<span>" + escapeHtml(category) + "</span>" +
                "<div class='bar-track'><div class='bar-fill' style='width:" + percent + "%'></div></div>" +
                "<strong>" + escapeHtml(rawValue) + "</strong>" +
              "</div>"
            );
          }).join("") +
        "</div>"
      );
    }

    function renderDonut(chart) {
      if (!chart || !(chart.values || []).length) {
        return "<p>No composition-ready series was detected for this section.</p>";
      }
      const total = (chart.values || []).reduce(function (sum, value) {
        return sum + Math.abs(Number(value) || 0);
      }, 0) || 1;
      let current = 0;
      const segments = (chart.values || []).slice(0, 5).map(function (value, index) {
        const safeValue = Math.abs(Number(value) || 0);
        const share = Math.round((safeValue / total) * 100);
        const start = current;
        current += share;
        return {
          label: chart.categories[index] || "Category " + (index + 1),
          share: share,
          start: start,
          color: colors(index)
        };
      });
      const gradient = segments.map(function (segment) {
        return segment.color + " " + segment.start + "% " + (segment.start + segment.share) + "%";
      }).join(", ");
      return (
        "<div class='donut-shell'>" +
          "<div class='donut' style='background:conic-gradient(" + gradient + ");'></div>" +
          "<div class='donut-legend'>" +
            segments.map(function (segment) {
              return (
                "<div class='donut-legend__row'>" +
                  "<span class='donut-legend__swatch' style='background:" + segment.color + ";'></span>" +
                  "<span>" + escapeHtml(segment.label) + "</span>" +
                  "<strong>" + segment.share + "%</strong>" +
                "</div>"
              );
            }).join("") +
          "</div>" +
        "</div>"
      );
    }

    function renderKpiRibbon() {
      kpiRibbon.innerHTML = (payload.kpis || []).slice(0, 4).map(function (kpi) {
        return (
          "<article class='kpi-card'>" +
            "<span>" + escapeHtml(kpi.label) + "</span>" +
            "<strong>" + escapeHtml(kpi.formattedValue) + "</strong>" +
            "<p>" + escapeHtml(kpi.insight) + "</p>" +
          "</article>"
        );
      }).join("");
    }

    function renderFocusChips() {
      focusChipRow.innerHTML = (payload.brief.focusAreas || []).map(function (focus) {
        return "<span class='focus-chip'>" + escapeHtml(focus) + "</span>";
      }).join("");
    }

    function renderSection(section) {
      const chart = findChart(section.chartId);
      const visualMarkup =
        section.visualKind === "donut"
          ? renderDonut(chart)
          : section.visualKind === "highlight"
            ? "<p>" + escapeHtml(section.visualRationale) + "</p>"
            : renderBars(chart);

      const implicationMarkup = section.implication
        ? "<div class='story-card__readout'><strong>Business read</strong><p>" + escapeHtml(section.implication) + "</p></div>"
        : "";
      const actionMarkup = section.recommendation
        ? "<div class='story-card__readout'><strong>Action cue</strong><p>" + escapeHtml(section.recommendation) + "</p></div>"
        : "";

      return (
        "<article class='story-card' data-purpose='" + escapeHtml(section.purpose) + "'>" +
          "<div class='story-card__head'>" +
            "<span class='story-card__eyebrow'>" + escapeHtml(section.purpose.replace(/-/g, " ")) + "</span>" +
            "<h3>" + escapeHtml(section.title) + "</h3>" +
            "<p class='story-card__subtitle'>" + escapeHtml(section.subtitle) + "</p>" +
          "</div>" +
          "<div class='story-card__grid story-card__grid--split'>" +
            "<div>" +
              "<ul class='story-card__list'>" +
                (section.evidence || []).map(function (entry) {
                  return "<li>" + escapeHtml(entry) + "</li>";
                }).join("") +
              "</ul>" +
            "</div>" +
            "<div class='story-card__aside'>" +
              "<strong>" + escapeHtml(section.visualTitle) + "</strong>" +
              "<p>" + escapeHtml(section.visualRationale) + "</p>" +
              "<div class='story-card__visual'>" + visualMarkup + "</div>" +
            "</div>" +
          "</div>" +
          "<div class='story-card__grid'>" + implicationMarkup + actionMarkup + "</div>" +
        "</article>"
      );
    }

    function renderActions() {
      actionList.innerHTML = (payload.recommendations || []).map(function (entry) {
        return "<li>" + escapeHtml(entry) + "</li>";
      }).join("");
    }

    function renderTable(rows) {
      tableHead.innerHTML = "";
      tableBody.innerHTML = "";
      if (!rows.length) {
        tableBody.innerHTML = "<tr><td>No rows matched the current filter.</td></tr>";
        return;
      }

      const headers = Object.keys(rows[0]).slice(0, 6);
      const headerRow = document.createElement("tr");
      headers.forEach(function (header) {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
      });
      tableHead.appendChild(headerRow);

      rows.slice(0, 8).forEach(function (row) {
        const tr = document.createElement("tr");
        headers.forEach(function (header) {
          const td = document.createElement("td");
          td.textContent = row[header];
          tr.appendChild(td);
        });
        tableBody.appendChild(tr);
      });
    }

    function renderStories() {
      storyGrid.innerHTML = (payload.sections || []).map(renderSection).join("");
    }

    function render() {
      const rows = payload.rows || [];
      const selected = filterElement.value;
      const filteredRows = selected === "All" ? rows : rows.filter(function (row) {
        return String(row[filterField] || "") === selected;
      });

      renderStories();
      renderActions();
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

      filterElement.addEventListener("change", render);
    }

    bootstrapFilter();
    renderFocusChips();
    renderKpiRibbon();
    render();
  })();
</script>`,
      },
    ],
    deploymentSteps: [
      "Create a new Apps Script project from script.google.com.",
      "Add the generated files and keep the filenames exactly as provided.",
      `The scaffold embeds up to ${MAX_GAS_DATA_ROWS} rows for review. Replace that payload with a live data source for production dashboards.`,
      "Keep access private on the first deployment, then widen only after security and design review.",
      "Treat the generated sections as the productized dashboard baseline, not as a temporary placeholder shell.",
    ],
  };
}
