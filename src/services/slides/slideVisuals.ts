import {
  ChartPlan,
  DatasetProfile,
  KpiRecommendation,
  SlideVisualPoint,
  SlideVisualSpec,
} from "../../shared/types";

const MAX_VISUAL_POINTS = 6;

interface SlideVisualPalette {
  accent: string;
  border: string;
  ink: string;
  muted: string;
  surface: string;
}

export function createKpiScorecardVisual(
  kpis: KpiRecommendation[],
  title = "Key Client Metrics",
  subtitle = "Lead with the commercial numbers your client will remember."
): SlideVisualSpec | null {
  const points = kpis.slice(0, 4).map<SlideVisualPoint>((kpi) => ({
    label: kpi.label,
    value: sanitizeNumericValue(kpi.rawValue),
    formattedValue: kpi.formattedValue,
    note: kpi.insight,
  }));

  if (points.length === 0) {
    return null;
  }

  return {
    kind: "scorecard",
    title,
    subtitle,
    emphasis: "Anchor the business conversation in a small set of visible headline metrics.",
    points,
  };
}

export function createChartVisual(chart: ChartPlan): SlideVisualSpec | null {
  const points = chart.categories
    .slice(0, MAX_VISUAL_POINTS)
    .map<SlideVisualPoint>((category, index) => ({
      label: category,
      value: sanitizeNumericValue(chart.values[index]),
      formattedValue: formatVisualNumber(chart.values[index]),
      note: `${chart.valueLabel} by ${chart.categoryLabel}`,
    }))
    .filter((point) => Number.isFinite(point.value));

  if (points.length === 0) {
    return null;
  }

  return {
    kind: chart.kind === "line" || points.some((point) => point.value < 0) ? "line" : "bar",
    title: chart.title,
    subtitle: `${chart.valueLabel} grouped by ${chart.categoryLabel}.`,
    emphasis: chart.insight,
    points,
  };
}

export function createProfileScorecardVisual(profile: DatasetProfile): SlideVisualSpec {
  return {
    kind: "scorecard",
    title: "Reporting Scope",
    subtitle: "Keep the analysis base visible when the audience asks how far the evidence goes.",
    emphasis: "Hold scope, completeness, and data coverage in one compact support card.",
    points: [
      {
        label: "Rows analyzed",
        value: profile.dataRowCount,
        formattedValue: profile.dataRowCount.toLocaleString(),
        note: profile.datasetShape,
      },
      {
        label: "Completeness",
        value: Math.round(profile.completeness * 100),
        formattedValue: `${Math.round(profile.completeness * 100)}%`,
        note: "Populated cells",
      },
      {
        label: "Measures",
        value: profile.primaryMeasures.length,
        formattedValue: String(profile.primaryMeasures.length),
        note: profile.primaryMeasures.join(", ") || "None detected",
      },
      {
        label: "Dimensions",
        value: profile.primaryDimensions.length,
        formattedValue: String(profile.primaryDimensions.length),
        note: profile.primaryDimensions.join(", ") || "None detected",
      },
    ],
  };
}

export function renderSlideVisualHtml(
  visual: SlideVisualSpec | null | undefined,
  palette: SlideVisualPalette
): string {
  if (!visual || visual.points.length === 0) {
    return "";
  }

  if (visual.kind === "scorecard") {
    return `
      <section class="slide-visual slide-visual--scorecard">
        <header class="slide-visual__header">
          <h3>${escapeHtml(visual.title)}</h3>
          <p>${escapeHtml(visual.subtitle)}</p>
        </header>
        <div class="slide-visual__scorecards">
          ${visual.points
            .map(
              (point) => `
                <article class="slide-visual__scorecard">
                  <span class="slide-visual__label">${escapeHtml(point.label)}</span>
                  <strong class="slide-visual__value">${escapeHtml(point.formattedValue)}</strong>
                  <p class="slide-visual__note">${escapeHtml(point.note)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  if (visual.kind === "line") {
    return `
      <section class="slide-visual slide-visual--line">
        <header class="slide-visual__header">
          <h3>${escapeHtml(visual.title)}</h3>
          <p>${escapeHtml(visual.subtitle)}</p>
        </header>
        ${buildLineVisualMarkup(visual, palette)}
      </section>
    `;
  }

  return `
    <section class="slide-visual slide-visual--bar">
      <header class="slide-visual__header">
        <h3>${escapeHtml(visual.title)}</h3>
        <p>${escapeHtml(visual.subtitle)}</p>
      </header>
      <div class="slide-visual__bars">
        ${visual.points.map((point) => buildBarRowMarkup(point, visual.points)).join("")}
      </div>
    </section>
  `;
}

function buildBarRowMarkup(point: SlideVisualPoint, points: SlideVisualPoint[]): string {
  const max = Math.max(...points.map((entry) => Math.abs(entry.value)), 1);
  const width = Math.max(12, Math.round((Math.abs(point.value) / max) * 100));

  return `
    <div class="slide-visual__bar-row">
      <div class="slide-visual__bar-copy">
        <span class="slide-visual__label">${escapeHtml(point.label)}</span>
        <strong class="slide-visual__value">${escapeHtml(point.formattedValue)}</strong>
      </div>
      <div class="slide-visual__bar-track">
        <span class="slide-visual__bar-fill" style="width:${width}%"></span>
      </div>
      <p class="slide-visual__note">${escapeHtml(point.note)}</p>
    </div>
  `;
}

function buildLineVisualMarkup(visual: SlideVisualSpec, palette: SlideVisualPalette): string {
  const width = 420;
  const height = 210;
  const paddingX = 28;
  const paddingTop = 22;
  const paddingBottom = 34;
  const min = Math.min(...visual.points.map((point) => point.value));
  const max = Math.max(...visual.points.map((point) => point.value));
  const span = max - min || 1;

  const coordinates = visual.points.map((point, index) => {
    const x = paddingX + (index * (width - paddingX * 2)) / Math.max(visual.points.length - 1, 1);
    const y = paddingTop + (height - paddingTop - paddingBottom) * (1 - (point.value - min) / span);
    return { x, y, point };
  });
  const path = coordinates.map((entry) => `${entry.x},${entry.y}`).join(" ");

  return `
    <div class="slide-visual__line-shell">
      <svg viewBox="0 0 ${width} ${height}" class="slide-visual__line-svg" aria-hidden="true">
        <line
          x1="${paddingX}"
          y1="${height - paddingBottom}"
          x2="${width - paddingX}"
          y2="${height - paddingBottom}"
          stroke="${escapeHtml(palette.border)}"
          stroke-width="2"
        />
        <line
          x1="${paddingX}"
          y1="${paddingTop}"
          x2="${paddingX}"
          y2="${height - paddingBottom}"
          stroke="${escapeHtml(palette.border)}"
          stroke-width="2"
        />
        <polyline
          fill="none"
          stroke="${escapeHtml(palette.accent)}"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
          points="${path}"
        />
        ${coordinates
          .map(
            (entry) => `
              <circle cx="${entry.x}" cy="${entry.y}" r="5" fill="${escapeHtml(palette.accent)}" />
              <text x="${entry.x}" y="${height - 10}" text-anchor="middle" fill="${escapeHtml(
                palette.muted
              )}" font-size="11">${escapeHtml(truncateLabel(entry.point.label))}</text>
            `
          )
          .join("")}
      </svg>
      <div class="slide-visual__line-legend">
        ${visual.points
          .map(
            (point) => `
              <div class="slide-visual__line-legend-item">
                <span class="slide-visual__label">${escapeHtml(point.label)}</span>
                <strong class="slide-visual__value">${escapeHtml(point.formattedValue)}</strong>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeNumericValue(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function truncateLabel(value: string): string {
  return value.length > 10 ? `${value.slice(0, 9)}…` : value;
}

export function formatVisualNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (absolute >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }

  if (absolute >= 100) {
    return value.toFixed(0);
  }

  if (absolute >= 10) {
    return value.toFixed(1);
  }

  return value.toFixed(2);
}
