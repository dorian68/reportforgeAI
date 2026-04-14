import {
  ChartPlan,
  DatasetProfile,
  KpiRecommendation,
  ReportBrief,
  StoryPagePurpose,
  StoryVisualKind,
} from "../../shared/types";

export interface StoryVisualSelection {
  visualKind: StoryVisualKind;
  chartId?: string;
  visualTitle: string;
  visualRationale: string;
  metricLabels: string[];
  dimensionKey?: string;
}

function findFirstChart(
  charts: ChartPlan[],
  predicate: (chart: ChartPlan) => boolean
): ChartPlan | undefined {
  return charts.find(predicate);
}

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function inferCompositionFocus(brief: ReportBrief): boolean {
  return brief.focusAreas.includes("segmentation") || brief.focusAreas.includes("product");
}

function isGeographyHeader(value: string | undefined): boolean {
  return /\bregion|country|state|city|market|territory|zone|area\b/i.test(value ?? "");
}

function isLowCardinalityChart(chart: ChartPlan): boolean {
  return chart.categories.length >= 2 && chart.categories.length <= 4;
}

function resolveMetricLabels(
  brief: ReportBrief,
  kpis: KpiRecommendation[],
  fallbackChart?: ChartPlan
): string[] {
  if (brief.preferredKpis.length > 0) {
    return brief.preferredKpis.slice(0, 4);
  }

  if (fallbackChart) {
    return [fallbackChart.valueLabel];
  }

  return kpis.slice(0, 4).map((entry) => entry.label);
}

export function chooseStoryVisual(
  purpose: StoryPagePurpose,
  brief: ReportBrief,
  profile: DatasetProfile,
  charts: ChartPlan[],
  kpis: KpiRecommendation[],
  preferredMetric?: string
): StoryVisualSelection {
  const normalizedMetric = normalize(preferredMetric);
  const metricChart =
    charts.find((chart) => normalize(chart.valueLabel) === normalizedMetric) ??
    charts.find((chart) => normalize(chart.title).includes(normalizedMetric));
  const timeChart =
    metricChart && metricChart.kind === "line"
      ? metricChart
      : findFirstChart(charts, (chart) => chart.kind === "line");
  const segmentChart =
    metricChart && metricChart.kind !== "line"
      ? metricChart
      : findFirstChart(charts, (chart) => chart.kind !== "line");
  const geoChart =
    findFirstChart(charts, (chart) => isGeographyHeader(chart.categoryLabel)) ??
    findFirstChart(charts, (chart) => brief.geographicDimensions.includes(chart.categoryLabel));

  if (purpose === "executive-summary" || purpose === "kpi-scorecard") {
    return {
      visualKind: "kpi-strip",
      visualTitle: "Headline KPI scorecard",
      visualRationale:
        "Keep only the small set of metrics that frame the report on the first fold.",
      metricLabels: resolveMetricLabels(brief, kpis),
    };
  }

  if (purpose === "trend-analysis" && timeChart) {
    return {
      visualKind: "line",
      chartId: timeChart.id,
      visualTitle: timeChart.title,
      visualRationale: "Use a time-series view because the question is about movement over time.",
      metricLabels: [timeChart.valueLabel],
      dimensionKey: timeChart.categoryLabel,
    };
  }

  if (
    (purpose === "segment-comparison" ||
      purpose === "product-mix" ||
      purpose === "customer-channel-mix") &&
    segmentChart
  ) {
    const visualKind: StoryVisualKind =
      inferCompositionFocus(brief) && isLowCardinalityChart(segmentChart) ? "donut" : "bar";
    return {
      visualKind,
      chartId: segmentChart.id,
      visualTitle: segmentChart.title,
      visualRationale:
        visualKind === "donut"
          ? "Use a composition view only because the category count is small and the mix itself is the point."
          : "Use a ranked comparison to show which segments matter most.",
      metricLabels: [segmentChart.valueLabel],
      dimensionKey: segmentChart.categoryLabel,
    };
  }

  if (purpose === "geography" && geoChart) {
    return {
      visualKind: "map",
      chartId: geoChart.id,
      visualTitle: geoChart.title,
      visualRationale:
        "A geographic view is justified because the dimension looks like a real territory split.",
      metricLabels: [geoChart.valueLabel],
      dimensionKey: geoChart.categoryLabel,
    };
  }

  if (purpose === "driver-analysis" && segmentChart) {
    return {
      visualKind:
        brief.focusAreas.includes("benchmark") ||
        /\btarget|budget|plan|forecast\b/i.test(segmentChart.title)
          ? "stacked-bar"
          : "bar",
      chartId: segmentChart.id,
      visualTitle: segmentChart.title,
      visualRationale:
        "Compare the driver mix directly so the audience can see what explains the result.",
      metricLabels: [segmentChart.valueLabel],
      dimensionKey: segmentChart.categoryLabel,
    };
  }

  if (purpose === "anomaly") {
    return {
      visualKind: profile.chartCandidates.length > 0 ? "highlight" : "table",
      chartId: profile.chartCandidates[0]?.id,
      visualTitle: profile.chartCandidates[0]?.title ?? "Exception evidence",
      visualRationale:
        "Use a compact exception view when the page is about risk, outliers, or data quality.",
      metricLabels: resolveMetricLabels(brief, kpis, profile.chartCandidates[0]),
      dimensionKey: profile.chartCandidates[0]?.categoryLabel,
    };
  }

  if (purpose === "recommendation") {
    return {
      visualKind: "highlight",
      visualTitle: "Decision checklist",
      visualRationale:
        "Keep the close action-led instead of repeating a chart already shown earlier.",
      metricLabels: brief.preferredKpis.slice(0, 3),
    };
  }

  return {
    visualKind: segmentChart ? "bar" : "table",
    chartId: segmentChart?.id,
    visualTitle: segmentChart?.title ?? "Supporting evidence table",
    visualRationale: segmentChart
      ? "Use a comparison view because it is the strongest remaining evidence block."
      : "No strong chart candidate exists, so show the evidence as a compact table.",
    metricLabels: resolveMetricLabels(brief, kpis, segmentChart),
    dimensionKey: segmentChart?.categoryLabel,
  };
}
