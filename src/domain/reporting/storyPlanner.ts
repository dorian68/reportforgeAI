import {
  ChartPlan,
  DatasetProfile,
  KpiRecommendation,
  ReportBrief,
  ReportFinding,
  StoryLayoutFamily,
  StoryPagePlan,
  StoryPagePurpose,
} from "../../shared/types";
import { chooseStoryVisual } from "./chartHeuristics";
import { repairStoryPages } from "./antiRepetition";

interface StoryPlannerInput {
  brief: ReportBrief;
  profile: DatasetProfile;
  findings: ReportFinding[];
  kpis: KpiRecommendation[];
  charts: ChartPlan[];
  maxPages: number;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function findFindingByMetric(findings: ReportFinding[], metric: string): ReportFinding | undefined {
  const normalizedMetric = metric.toLowerCase();
  return findings.find((finding) =>
    finding.sourceMetrics.some((sourceMetric) => sourceMetric.toLowerCase() === normalizedMetric)
  );
}

function findFindingByChart(
  findings: ReportFinding[],
  chartId: string | undefined
): ReportFinding | undefined {
  if (!chartId) {
    return undefined;
  }
  return findings.find((finding) => finding.sourceChartId === chartId);
}

function metricLabelForPage(brief: ReportBrief, profile: DatasetProfile, index = 0): string {
  return (
    brief.preferredKpis[index] ??
    brief.measureCandidates[index] ??
    profile.primaryMeasures[index] ??
    "performance"
  );
}

function capitalizeSentence(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function defaultLayoutForPurpose(purpose: StoryPagePurpose): StoryLayoutFamily {
  switch (purpose) {
    case "executive-summary":
      return "hero-metrics";
    case "kpi-scorecard":
      return "scorecard-grid";
    case "trend-analysis":
      return "trend-focus";
    case "segment-comparison":
    case "product-mix":
    case "customer-channel-mix":
    case "geography":
      return "comparison-grid";
    case "anomaly":
      return "exception-focus";
    case "recommendation":
      return "action-checklist";
    default:
      return "detail-table";
  }
}

function createPage(
  purpose: StoryPagePurpose,
  brief: ReportBrief,
  profile: DatasetProfile,
  charts: ChartPlan[],
  kpis: KpiRecommendation[],
  findings: ReportFinding[],
  options: {
    id: string;
    title: string;
    subtitle: string;
    storyBeat: string;
    distinctJob: string;
    narrativeAngle: string;
    preferredMetric?: string;
    implication?: string;
    recommendation?: string;
    callToAction?: string;
    evidence?: string[];
  }
): StoryPagePlan {
  const visual = chooseStoryVisual(purpose, brief, profile, charts, kpis, options.preferredMetric);
  const finding =
    findFindingByMetric(findings, options.preferredMetric ?? "") ??
    findFindingByChart(findings, visual.chartId);

  return {
    id: options.id,
    title: options.title,
    subtitle: options.subtitle,
    purpose,
    distinctJob: options.distinctJob,
    storyBeat: options.storyBeat,
    layoutFamily: defaultLayoutForPurpose(purpose),
    visualKind: visual.visualKind,
    visualTitle: visual.visualTitle,
    visualRationale: visual.visualRationale,
    narrativeAngle: options.narrativeAngle,
    metricLabels: unique(
      [options.preferredMetric, ...visual.metricLabels, ...(finding?.sourceMetrics ?? [])].filter(
        Boolean
      ) as string[]
    ).slice(0, 4),
    chartId: visual.chartId,
    dimensionKey: visual.dimensionKey,
    headlineMetricLabel: options.preferredMetric,
    evidence:
      options.evidence && options.evidence.length > 0
        ? options.evidence
        : (finding?.evidencePoints ?? []).slice(0, 3),
    implication: options.implication ?? finding?.implication,
    recommendation: options.recommendation ?? finding?.recommendation,
    callToAction: options.callToAction ?? finding?.recommendation,
  };
}

function buildExecutivePage(
  brief: ReportBrief,
  profile: DatasetProfile,
  charts: ChartPlan[],
  kpis: KpiRecommendation[],
  findings: ReportFinding[]
): StoryPagePlan {
  const leadMetric = metricLabelForPage(brief, profile, 0);
  const leadFinding = findFindingByMetric(findings, leadMetric) ?? findings[0];
  return createPage("executive-summary", brief, profile, charts, kpis, findings, {
    id: "story-executive-summary",
    title: leadFinding?.title ?? `${capitalizeSentence(leadMetric)} frames the current readout`,
    subtitle: brief.keyDecision,
    storyBeat: "Open on the decision-ready message",
    distinctJob: "Give the audience a one-page answer to what changed and why it matters.",
    narrativeAngle: "What leaders should retain first",
    preferredMetric: leadMetric,
    implication: leadFinding?.implication,
    recommendation: leadFinding?.recommendation,
    evidence: unique([
      leadFinding?.summary ?? "",
      ...brief.importantQuestions.slice(0, 2),
      brief.datasetSummary,
    ]).filter(Boolean),
  });
}

function buildKpiPage(
  brief: ReportBrief,
  profile: DatasetProfile,
  charts: ChartPlan[],
  kpis: KpiRecommendation[],
  findings: ReportFinding[]
): StoryPagePlan {
  const topMetrics = brief.preferredKpis.slice(0, 4);
  return createPage("kpi-scorecard", brief, profile, charts, kpis, findings, {
    id: "story-kpi-scorecard",
    title: "Topline, efficiency, and quality define the operating picture",
    subtitle: "Keep the opening KPI cluster tight enough to read in seconds.",
    storyBeat: "Anchor the story in a disciplined scorecard",
    distinctJob: "Show the KPI cluster that the rest of the report will unpack.",
    narrativeAngle: "Which numbers frame the conversation",
    preferredMetric: topMetrics[0],
    evidence: topMetrics.map((metric) => {
      const kpi = kpis.find((entry) => entry.label === metric);
      return kpi ? `${kpi.label}: ${kpi.formattedValue}. ${kpi.insight}` : metric;
    }),
  });
}

function buildTrendPage(
  brief: ReportBrief,
  profile: DatasetProfile,
  charts: ChartPlan[],
  kpis: KpiRecommendation[],
  findings: ReportFinding[]
): StoryPagePlan | null {
  const trendMetric = metricLabelForPage(brief, profile, 0);
  const finding =
    findFindingByMetric(findings, trendMetric) ?? findings.find((entry) => entry.sourceChartId);
  const chart =
    charts.find(
      (entry) => entry.kind === "line" && normalize(entry.valueLabel) === normalize(trendMetric)
    ) ?? charts.find((entry) => entry.kind === "line");
  if (!chart && !finding) {
    return null;
  }

  return createPage("trend-analysis", brief, profile, charts, kpis, findings, {
    id: "story-trend-analysis",
    title:
      finding?.title ??
      `${capitalizeSentence(chart?.valueLabel ?? trendMetric)} moved across ${chart?.categoryLabel ?? brief.timeDimension ?? "the observed periods"}`,
    subtitle:
      finding?.subtitle ??
      "Use the main time-series to explain pace, inflection points, and the latest read.",
    storyBeat: "Explain how the headline metric moved over time",
    distinctJob: "Translate movement over time into a concrete business readout.",
    narrativeAngle: "What changed over time",
    preferredMetric: chart?.valueLabel ?? trendMetric,
    implication: finding?.implication,
    recommendation: finding?.recommendation,
    evidence: finding?.evidencePoints ?? [chart?.insight ?? ""].filter(Boolean),
  });
}

function buildComparisonPage(
  purpose: StoryPagePurpose,
  brief: ReportBrief,
  profile: DatasetProfile,
  charts: ChartPlan[],
  kpis: KpiRecommendation[],
  findings: ReportFinding[],
  preferredMetric: string,
  title: string,
  subtitle: string,
  distinctJob: string,
  narrativeAngle: string
): StoryPagePlan {
  return createPage(purpose, brief, profile, charts, kpis, findings, {
    id: `story-${purpose}`,
    title,
    subtitle,
    storyBeat: distinctJob,
    distinctJob,
    narrativeAngle,
    preferredMetric,
  });
}

function buildRecommendationPage(
  brief: ReportBrief,
  profile: DatasetProfile,
  charts: ChartPlan[],
  kpis: KpiRecommendation[],
  findings: ReportFinding[]
): StoryPagePlan {
  return createPage("recommendation", brief, profile, charts, kpis, findings, {
    id: "story-recommendation",
    title: "The report closes on action, ownership, and the next checkpoint",
    subtitle: brief.keyDecision,
    storyBeat: "Land the decision and the follow-up",
    distinctJob: "End on the action the audience should actually take.",
    narrativeAngle: "What should happen next",
    preferredMetric: metricLabelForPage(brief, profile, 0),
    implication: brief.businessGoal,
    recommendation:
      findings.find((finding) => finding.recommendation)?.recommendation ?? brief.keyDecision,
    callToAction: brief.keyDecision,
    evidence: unique([
      findings.find((finding) => finding.recommendation)?.recommendation ?? "",
      brief.keyDecision,
      ...brief.constraints.slice(0, 1),
    ]).filter(Boolean),
  });
}

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function planStoryPages({
  brief,
  profile,
  findings,
  kpis,
  charts,
  maxPages,
}: StoryPlannerInput): StoryPagePlan[] {
  const pages: StoryPagePlan[] = [];

  pages.push(buildExecutivePage(brief, profile, charts, kpis, findings));

  if (brief.preferredKpis.length > 1 || kpis.length > 2) {
    pages.push(buildKpiPage(brief, profile, charts, kpis, findings));
  }

  const trendPage = brief.timeDimension
    ? buildTrendPage(brief, profile, charts, kpis, findings)
    : null;
  if (trendPage) {
    pages.push(trendPage);
  }

  if (brief.segmentDimensions.length > 0) {
    const preferredMetric = metricLabelForPage(brief, profile, 0);
    pages.push(
      buildComparisonPage(
        "segment-comparison",
        brief,
        profile,
        charts,
        kpis,
        findings,
        preferredMetric,
        `${capitalizeSentence(preferredMetric)} is uneven across ${brief.segmentDimensions[0].toLowerCase()}`,
        "Make the main segment split visible without burying the lead in a table.",
        "Show where the result is concentrated or lagging.",
        "Where performance is concentrated"
      )
    );
  }

  if (brief.geographicDimensions.length > 0) {
    const preferredMetric = metricLabelForPage(brief, profile, 0);
    pages.push(
      buildComparisonPage(
        "geography",
        brief,
        profile,
        charts,
        kpis,
        findings,
        preferredMetric,
        `${capitalizeSentence(preferredMetric)} differs across ${brief.geographicDimensions[0].toLowerCase()}`,
        "Use geography only because the source data contains a credible territory split.",
        "Show whether geography changes the management answer.",
        "Where the footprint differs"
      )
    );
  }

  if (brief.focusAreas.includes("product")) {
    const preferredMetric = metricLabelForPage(brief, profile, 0);
    pages.push(
      buildComparisonPage(
        "product-mix",
        brief,
        profile,
        charts,
        kpis,
        findings,
        preferredMetric,
        `${capitalizeSentence(preferredMetric)} mix shows which products carry the result`,
        "Use a mix page only when product-level composition helps explain the outcome.",
        "Separate the broad KPI picture from the product mix behind it.",
        "Which products explain the result"
      )
    );
  }

  if (brief.focusAreas.includes("customer") || brief.focusAreas.includes("channel")) {
    const preferredMetric = metricLabelForPage(brief, profile, 0);
    pages.push(
      buildComparisonPage(
        "customer-channel-mix",
        brief,
        profile,
        charts,
        kpis,
        findings,
        preferredMetric,
        `${capitalizeSentence(preferredMetric)} shifts by customer or channel mix`,
        "Bring customer or channel structure forward when it changes the operating answer.",
        "Show whether the commercial mix, not only the headline total, changed.",
        "Which channel or customer mix changed"
      )
    );
  }

  if (brief.focusAreas.includes("anomalies") || profile.completeness < 0.9) {
    pages.push(
      createPage("anomaly", brief, profile, charts, kpis, findings, {
        id: "story-anomaly",
        title:
          profile.completeness < 0.9
            ? "Data quality and exceptions still shape how hard this readout can be pushed"
            : "Exceptions deserve attention before this report is circulated more widely",
        subtitle: "Keep risk, outliers, and caveats visible instead of hiding them in footnotes.",
        storyBeat: "Show what could weaken confidence or require investigation",
        distinctJob: "Separate decision-ready insight from unresolved exceptions.",
        narrativeAngle: "What could change the interpretation",
        preferredMetric: metricLabelForPage(brief, profile, 0),
        evidence: unique([
          ...profile.notes.slice(0, 2),
          ...findings
            .filter((finding) => /risk|outlier|anomaly|quality/i.test(finding.title))
            .flatMap((finding) => finding.evidencePoints.slice(0, 1)),
        ]).filter(Boolean),
        implication: brief.constraints[0] ?? "Keep caveats visible so the report stays defensible.",
      })
    );
  }

  pages.push(buildRecommendationPage(brief, profile, charts, kpis, findings));

  const repairedPages = repairStoryPages(pages);
  const cappedCount = Math.max(3, maxPages);
  if (repairedPages.length <= cappedCount) {
    return repairedPages;
  }

  const recommendationPage =
    repairedPages.find((page) => page.purpose === "recommendation") ??
    repairedPages[repairedPages.length - 1];
  const bodyPages = repairedPages.filter((page) => page.id !== recommendationPage.id);
  return [...bodyPages.slice(0, Math.max(2, cappedCount - 1)), recommendationPage];
}
