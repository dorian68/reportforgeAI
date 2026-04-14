import {
  CanvasBlockSpec,
  GeneratedEmailBundle,
  ReportDesignSpec,
  ReportForgeBundle,
  ReportTheme,
} from "../../shared/types";
import { getRenderableCanvasBlocks } from "../../services/canvas/canvasStudio";
import { escapeHtml } from "../../utils/formatting";

function sortBlocks(designSpec: ReportDesignSpec) {
  const page = designSpec.pages.find((entry) => entry.format === "email-html");
  if (!page) {
    return null;
  }

  return {
    page,
    blocks: getRenderableCanvasBlocks(page, "email-html"),
  };
}

function renderMiniChart(bundle: ReportForgeBundle, chartId: string | undefined): string {
  if (!chartId) {
    return "";
  }

  const chart = bundle.plan.excel.charts.find((entry) => entry.id === chartId);
  if (!chart) {
    return "";
  }

  const maxValue = Math.max(...chart.values, 1);
  return `
    <div style="display:grid;gap:8px;margin-top:12px;">
      ${chart.categories
        .slice(0, 4)
        .map((label, index) => {
          const value = chart.values[index] ?? 0;
          const width = Math.max(8, Math.round((value / maxValue) * 100));
          return `
          <div style="display:grid;grid-template-columns:100px 1fr 64px;gap:10px;align-items:center;font-size:12px;">
            <span style="color:#58767a;">${escapeHtml(label)}</span>
            <span style="display:block;height:8px;background:rgba(15,118,110,0.10);border-radius:999px;overflow:hidden;">
              <span style="display:block;height:100%;width:${width}%;background:linear-gradient(90deg,#0f766e,#34b2a8);"></span>
            </span>
            <strong style="color:#17353a;">${escapeHtml(value.toLocaleString())}</strong>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderKpis(
  bundle: ReportForgeBundle,
  metricIds: string[] | undefined,
  theme: ReportTheme
): string {
  const selectedIds = new Set(metricIds ?? []);
  const kpis =
    selectedIds.size > 0
      ? bundle.plan.excel.kpis.filter((entry) => selectedIds.has(entry.id))
      : bundle.plan.excel.kpis.slice(0, 4);

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;">
      ${kpis
        .map(
          (kpi) => `
        <article style="border:1px solid ${theme.border};border-radius:16px;padding:14px;background:${theme.surface};">
          <div style="font-size:12px;color:${theme.muted};">${escapeHtml(kpi.label)}</div>
          <div style="margin-top:8px;font-size:24px;font-weight:700;color:${theme.accent};">${escapeHtml(kpi.formattedValue)}</div>
          <div style="margin-top:8px;font-size:12px;color:${theme.muted};">${escapeHtml(kpi.insight)}</div>
        </article>
      `
        )
        .join("")}
    </div>
  `;
}

function renderTable(bundle: ReportForgeBundle, theme: ReportTheme): string {
  const headers = bundle.plan.excel.reportTableHeaders.slice(0, 4);
  const rows = bundle.plan.excel.reportTableRows.slice(0, 3);
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead>
        <tr>${headers.map((header) => `<th style="text-align:left;padding:8px;border-bottom:1px solid ${theme.border};color:${theme.muted};font-size:12px;">${escapeHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>${row
            .slice(0, headers.length)
            .map(
              (cell) =>
                `<td style="padding:8px;border-bottom:1px solid ${theme.border};color:${theme.ink};font-size:12px;">${escapeHtml(cell)}</td>`
            )
            .join("")}</tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderRecommendations(bundle: ReportForgeBundle): string {
  return `
    <ul style="margin:0;padding-left:18px;display:grid;gap:8px;">
      ${bundle.plan.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderBlockMarkup(
  block: CanvasBlockSpec,
  bundle: ReportForgeBundle,
  theme: ReportTheme
): string {
  let innerMarkup = `<p style="margin:10px 0 0;color:${theme.muted};line-height:1.5;">${escapeHtml(block.body)}</p>`;

  if (block.kind === "kpi-strip") {
    innerMarkup = renderKpis(bundle, block.metricIds, theme);
  } else if (block.kind === "chart-panel") {
    innerMarkup = `
      <p style="margin:10px 0 0;color:${theme.muted};line-height:1.5;">${escapeHtml(block.body)}</p>
      ${renderMiniChart(bundle, block.chartId)}
    `;
  } else if (block.kind === "table") {
    innerMarkup = renderTable(bundle, theme);
  } else if (block.kind === "recommendations") {
    innerMarkup = renderRecommendations(bundle);
  } else if (block.kind === "email-summary") {
    innerMarkup = `
      <p style="margin:10px 0 0;color:${theme.muted};line-height:1.5;">${escapeHtml(bundle.emailBundle.primary.plainText.split("\n").slice(0, 4).join(" "))}</p>
    `;
  }

  return `
    <section style="border:1px solid ${theme.border};border-radius:18px;padding:18px;background:${block.emphasis === "high" ? "#ffffff" : theme.surface};">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${theme.accent};">${escapeHtml(block.kind.replace("-", " "))}</div>
      <h2 style="margin:8px 0 0;font-size:${block.kind === "hero" ? "28px" : "18px"};line-height:1.2;color:${theme.ink};">${escapeHtml(block.title)}</h2>
      ${innerMarkup}
      ${block.supportingText ? `<p style="margin:12px 0 0;color:${theme.muted};font-size:12px;">${escapeHtml(block.supportingText)}</p>` : ""}
    </section>
  `;
}

export function renderEmailHtmlArtifact(
  bundle: ReportForgeBundle,
  designSpec: ReportDesignSpec
): { html: string; subject: string; source: GeneratedEmailBundle } {
  const theme = bundle.plan.excel.theme;
  const ordered = sortBlocks(designSpec);

  if (!ordered) {
    return {
      html: bundle.emailBundle.primary.html,
      subject: bundle.emailBundle.primary.subject,
      source: bundle.emailBundle,
    };
  }

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f5f8f8;font-family:'Segoe UI',Aptos,sans-serif;color:${theme.ink};">
    <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid ${theme.border};border-radius:24px;padding:24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${theme.accent};">${escapeHtml(designSpec.styleName)}</p>
      <div style="display:grid;gap:16px;">
        ${ordered.blocks.map((block) => renderBlockMarkup(block, bundle, theme)).join("")}
      </div>
    </div>
  </body>
</html>`;

  const subject =
    ordered.blocks.find((block) => block.kind === "hero" || block.kind === "email-summary")
      ?.title || bundle.emailBundle.primary.subject;

  return {
    html,
    subject,
    source: bundle.emailBundle,
  };
}
