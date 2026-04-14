import {
  ChartPlan,
  DatasetProfile,
  KpiRecommendation,
  PromptInterpretation,
  RangeSnapshot,
  ReportBrief,
  ReportFinding,
  StoryPagePlan,
} from "../../shared/types";
import { formatMetricValue, formatPercent, toTitleCase, truncate } from "../../utils/formatting";
import { buildReportBrief } from "../reporting/reportBrief";
import { planStoryPages } from "../reporting/storyPlanner";

interface NarrativeAnalysis {
  title: string;
  subtitle: string;
  narrativeSummary: string;
  executiveSummary: string[];
  confidenceCaveat: string;
  findings: ReportFinding[];
  recommendations: string[];
  brief: ReportBrief;
  storyPages: StoryPagePlan[];
}

type EnterpriseLens = "general" | "banking" | "insurance" | "risk" | "client";

interface AudienceProfile {
  reviewLabel: string;
  implicationLead: string;
  recommendationLead: string;
}

const AUDIENCE_PROFILES: Record<PromptInterpretation["audience"], AudienceProfile> = {
  general: {
    reviewLabel: "multi-stakeholder review",
    implicationLead: "This should stay visible in the next reporting cycle.",
    recommendationLead: "Translate the headline movement into a clear owner and next step.",
  },
  executive: {
    reviewLabel: "executive review",
    implicationLead:
      "This matters because leadership decisions will focus on material movement and timing.",
    recommendationLead:
      "Frame the next decision in terms of performance protection and follow-through.",
  },
  board: {
    reviewLabel: "board review",
    implicationLead:
      "This matters because governance discussions will focus on materiality, downside visibility, and oversight.",
    recommendationLead:
      "Close with the management action, timing, and monitoring point the board should expect.",
  },
  cfo: {
    reviewLabel: "finance review",
    implicationLead:
      "This matters because finance leadership will focus on variance discipline, margin quality, and controllable drivers.",
    recommendationLead:
      "Anchor the close on validation, variance follow-up, and the levers that need owner attention.",
  },
  operations: {
    reviewLabel: "operations review",
    implicationLead:
      "This matters because execution risk usually sits in the exceptions, not the average.",
    recommendationLead:
      "Translate the result into monitoring, escalation, and operational follow-up.",
  },
  management: {
    reviewLabel: "management committee review",
    implicationLead:
      "This matters because committee discussions need a concise view of what changed, where, and how material it is.",
    recommendationLead: "Land the decision posture and the owner for the next review point.",
  },
  analyst: {
    reviewLabel: "analyst review",
    implicationLead:
      "This matters because the next analytical pass should focus on drivers, dispersion, and validation.",
    recommendationLead: "Keep the recommendation practical and traceable back to the evidence.",
  },
  client: {
    reviewLabel: "client-ready review",
    implicationLead:
      "This matters because the client will expect a clear explanation of what changed and what to do next.",
    recommendationLead:
      "Keep the recommendation commercially clear and easy to retell after the meeting.",
  },
  risk: {
    reviewLabel: "risk and compliance review",
    implicationLead:
      "This matters because concentrations, anomalies, and unstable segments require monitoring and escalation discipline.",
    recommendationLead:
      "Frame actions as review, escalation, control validation, or deeper investigation.",
  },
  insurance: {
    reviewLabel: "insurance performance review",
    implicationLead:
      "This matters because pricing, reserving, branch performance, and claims behavior depend on where the volatility sits.",
    recommendationLead:
      "Frame actions around underwriting follow-up, pricing review, reserving attention, or branch prioritization.",
  },
  banking: {
    reviewLabel: "banking performance review",
    implicationLead:
      "This matters because portfolio steering, branch dispersion, and concentration risk need to stay visible.",
    recommendationLead:
      "Frame actions around portfolio review, branch prioritization, exposure follow-up, or resource allocation.",
  },
};

export function analyzeReportNarrative(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  briefOverrides: Partial<ReportBrief> = {}
): NarrativeAnalysis {
  const brief = buildReportBrief(snapshot, profile, prompt, briefOverrides);
  const lens = detectEnterpriseLens(prompt, profile);
  const audienceProfile = AUDIENCE_PROFILES[prompt.audience];
  const contextLabel = buildContextLabel(snapshot, prompt.businessContext);
  const chartFindings = profile.chartCandidates
    .map((chart) => buildChartFinding(chart, prompt, lens))
    .filter((finding): finding is ReportFinding => Boolean(finding));
  const kpiFindings = profile.kpis
    .slice(0, profile.chartCandidates.length === 0 ? 3 : 2)
    .map((kpi) => buildKpiFinding(kpi, profile, prompt, lens));
  const findings = prioritizeFindings([...chartFindings, ...kpiFindings]);
  const confidenceCaveat = buildConfidenceCaveat(profile, lens);
  const storyPages = planStoryPages({
    brief,
    profile,
    findings,
    kpis: profile.kpis,
    charts: profile.chartCandidates,
    maxPages: prompt.slideCount,
  });
  const recommendations = buildRecommendations(findings, profile, prompt, lens);
  const title = truncate(
    storyPages[0]?.title ?? buildReportTitle(prompt, findings[0], contextLabel, profile),
    72
  );
  const subtitle =
    storyPages[0]?.subtitle ?? buildReportSubtitle(prompt, contextLabel, profile, findings[0]);
  const executiveSummary = buildExecutiveSummary(
    findings,
    storyPages,
    recommendations,
    confidenceCaveat,
    audienceProfile.reviewLabel,
    contextLabel
  );

  return {
    title,
    subtitle,
    narrativeSummary: executiveSummary[0] ?? confidenceCaveat,
    executiveSummary,
    confidenceCaveat,
    findings,
    recommendations,
    brief,
    storyPages,
  };
}

function detectEnterpriseLens(
  prompt: PromptInterpretation,
  profile: DatasetProfile
): EnterpriseLens {
  const signature = [prompt.rawPrompt, prompt.businessContext, ...profile.headers, ...profile.notes]
    .join(" ")
    .toLowerCase();

  if (
    /\bclaim|claims|policy|policies|premium|renewal|underwriting|loss|severity|reserve|broker|branch\b/.test(
      signature
    ) ||
    prompt.audience === "insurance"
  ) {
    return "insurance";
  }

  if (
    /\bportfolio|exposure|loan|deposit|desk|branch|profitability|npl|liquidity|bank|banking\b/.test(
      signature
    ) ||
    prompt.audience === "banking"
  ) {
    return "banking";
  }

  if (
    /\brisk|compliance|control|incident|breach|alert|exposure\b/.test(signature) ||
    prompt.audience === "risk"
  ) {
    return "risk";
  }

  if (prompt.audience === "client") {
    return "client";
  }

  return "general";
}

function buildContextLabel(snapshot: RangeSnapshot, businessContext: string): string {
  const trimmedContext = businessContext.trim();
  if (trimmedContext) {
    return trimmedContext;
  }

  const sheetLabel = snapshot.sheetName
    ? toTitleCase(snapshot.sheetName.replace(/[_-]+/g, " "))
    : "Selected dataset";
  return `${sheetLabel} from ${snapshot.address}`;
}

function buildChartFinding(
  chart: ChartPlan,
  prompt: PromptInterpretation,
  lens: EnterpriseLens
): ReportFinding | null {
  if (chart.values.length < 2 || chart.categories.length < 2) {
    return null;
  }

  if (chart.kind === "line") {
    return buildTrendFinding(chart, prompt, lens);
  }

  return buildSegmentFinding(chart, prompt, lens);
}

function buildTrendFinding(
  chart: ChartPlan,
  prompt: PromptInterpretation,
  lens: EnterpriseLens
): ReportFinding {
  const firstIndex = 0;
  const lastIndex = chart.values.length - 1;
  const firstValue = chart.values[firstIndex] ?? 0;
  const lastValue = chart.values[lastIndex] ?? 0;
  const delta = lastValue - firstValue;
  const changeRatio = firstValue === 0 ? 0 : delta / Math.abs(firstValue);
  const movement = delta >= 0 ? "improved" : "softened";
  const materiality = describeMateriality(Math.abs(changeRatio));
  const firstCategory = truncate(chart.categories[firstIndex] ?? chart.categoryLabel, 18);
  const lastCategory = truncate(chart.categories[lastIndex] ?? chart.categoryLabel, 18);
  const valueLabel = chart.valueLabel.toLowerCase();
  const title = `${chart.valueLabel} ${movement} ${formatSignedPercent(changeRatio)} from ${firstCategory} to ${lastCategory}`;
  const summary = `${chart.valueLabel} moved from ${formatMetricValue(firstValue, chart.valueLabel)} to ${formatMetricValue(lastValue, chart.valueLabel)}, a ${materiality} shift over the observed ${chart.categoryLabel.toLowerCase()}.`;
  const implication = buildImplication(
    prompt.audience,
    lens,
    `${chart.valueLabel} ${movement} over time`,
    `${chart.valueLabel} needs closer monitoring in the next reporting cycle`
  );

  return {
    id: chart.id,
    title,
    subtitle: `${chart.categoryLabel} trend in ${valueLabel} with ${formatSignedValue(delta, chart.valueLabel)} change between the first and latest period.`,
    summary,
    evidencePoints: [
      `${firstCategory} started at ${formatMetricValue(firstValue, chart.valueLabel)} and the latest period reached ${formatMetricValue(lastValue, chart.valueLabel)}.`,
      `The movement is ${materiality}, which makes the trend material enough for a ${AUDIENCE_PROFILES[prompt.audience].reviewLabel}.`,
      chart.insight,
    ],
    chartCaption: `${chart.valueLabel} across ${chart.categoryLabel.toLowerCase()} highlights where the trend accelerated or weakened most clearly.`,
    implication,
    recommendation:
      delta >= 0
        ? `Confirm whether the improvement in ${valueLabel} is repeatable in the next cycle and which driver should be scaled.`
        : `Review the driver behind the recent weakness in ${valueLabel} and decide whether escalation or corrective action is needed.`,
    confidenceCaveat:
      prompt.businessContext.trim().length === 0
        ? "Narrative inferred from headers and observed data patterns."
        : undefined,
    sourceMetrics: [chart.valueLabel, chart.categoryLabel],
    sourceChartId: chart.id,
  };
}

function buildSegmentFinding(
  chart: ChartPlan,
  prompt: PromptInterpretation,
  lens: EnterpriseLens
): ReportFinding {
  const total = chart.values.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
  const ranked = chart.values
    .map((value, index) => ({
      category: chart.categories[index] ?? chart.categoryLabel,
      value,
    }))
    .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
  const lead = ranked[0];
  const runnerUp = ranked[1];
  const concentrationShare = Math.abs(lead.value) / total;
  const title =
    concentrationShare >= 0.45
      ? `${lead.category} concentrates ${formatPercent(concentrationShare)} of ${chart.valueLabel.toLowerCase()} in the current mix`
      : `${lead.category} leads ${chart.valueLabel.toLowerCase()}, but the mix remains relatively distributed`;
  const summary =
    concentrationShare >= 0.45
      ? `${lead.category} contributes ${formatMetricValue(lead.value, chart.valueLabel)} and represents ${formatPercent(concentrationShare)} of the observed ${chart.valueLabel.toLowerCase()}, making concentration a live discussion point.`
      : `${lead.category} leads at ${formatMetricValue(lead.value, chart.valueLabel)}, but the gap to the next segment remains contained enough to keep the mix broadly balanced.`;
  const implication = buildImplication(
    prompt.audience,
    lens,
    concentrationShare >= 0.45
      ? `${lead.category} now carries a material share of the reported mix`
      : "the mix is not dominated by a single segment",
    concentrationShare >= 0.45
      ? "Concentration risk or opportunity deserves explicit follow-up"
      : "The next review should focus on which segment can move the mix fastest"
  );

  return {
    id: chart.id,
    title,
    subtitle: `${lead.category} contributes ${formatMetricValue(lead.value, chart.valueLabel)} out of ${formatMetricValue(total, chart.valueLabel)} total ${chart.valueLabel.toLowerCase()}.`,
    summary,
    evidencePoints: [
      `${lead.category} is the leading ${chart.categoryLabel.toLowerCase()} at ${formatMetricValue(lead.value, chart.valueLabel)}.`,
      runnerUp
        ? `${runnerUp.category} follows at ${formatMetricValue(runnerUp.value, chart.valueLabel)}, which ${concentrationShare >= 0.45 ? "confirms the lead segment carries disproportionate weight." : "keeps the ranking competitive."}`
        : `Only one material ${chart.categoryLabel.toLowerCase()} value was detected in the aggregated series.`,
      chart.insight,
    ],
    chartCaption: `${chart.valueLabel} by ${chart.categoryLabel.toLowerCase()} makes the concentration pattern visible and shows why the lead segment matters.`,
    implication,
    recommendation:
      concentrationShare >= 0.45
        ? `Stress-test dependence on ${lead.category} and decide whether diversification, deeper review, or targeted follow-up is required.`
        : `Use the ranking to prioritise the next commercial or operating discussion on the segments that can still move the overall result.`,
    confidenceCaveat:
      prompt.businessContext.trim().length === 0
        ? "Narrative inferred from the observed ranking and concentration pattern."
        : undefined,
    sourceMetrics: [chart.valueLabel, chart.categoryLabel],
    sourceChartId: chart.id,
  };
}

function buildKpiFinding(
  kpi: KpiRecommendation,
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  lens: EnterpriseLens
): ReportFinding {
  const recordLabel =
    kpi.aggregation === "average"
      ? `${profile.dataRowCount.toLocaleString()} populated records`
      : `${profile.dataRowCount.toLocaleString()} selected rows`;
  const title =
    kpi.aggregation === "average"
      ? `${kpi.label} remains at ${kpi.formattedValue} across the current scope`
      : `${kpi.label} totals ${kpi.formattedValue} in the selected review perimeter`;
  const summary = `${kpi.label} is currently ${kpi.formattedValue}. ${kpi.insight}`;
  const implication = buildImplication(
    prompt.audience,
    lens,
    `${kpi.label} is a headline indicator in this selection`,
    `${kpi.label} should anchor the opening section of the report`
  );

  return {
    id: `kpi-${kpi.id}`,
    title,
    subtitle: `${recordLabel} feed this metric, making it one of the clearest anchors for the ${AUDIENCE_PROFILES[prompt.audience].reviewLabel}.`,
    summary,
    evidencePoints: [
      `${kpi.label} is reported at ${kpi.formattedValue}.`,
      kpi.insight,
      `The selected data has ${Math.round(profile.completeness * 100)}% completeness, so this metric is ${profile.completeness >= 0.85 ? "usable for decision-ready commentary." : "directional and should be validated before external circulation."}`,
    ],
    chartCaption: `${kpi.label} should stay visible as the opening scorecard because it anchors the rest of the commentary on a concrete number.`,
    implication,
    recommendation: buildKpiRecommendation(kpi, prompt.audience, lens),
    confidenceCaveat:
      profile.completeness < 0.85
        ? `The source range is ${Math.round(profile.completeness * 100)}% complete, so the metric should be treated as directional until missing values are validated.`
        : undefined,
    sourceMetrics: [kpi.label],
  };
}

function buildKpiRecommendation(
  kpi: KpiRecommendation,
  audience: PromptInterpretation["audience"],
  lens: EnterpriseLens
): string {
  if (lens === "risk") {
    return `Use ${kpi.label.toLowerCase()} as a monitoring anchor and define the escalation threshold for the next review.`;
  }

  if (lens === "insurance") {
    return `Use ${kpi.label.toLowerCase()} to prioritise pricing, reserving, or branch-level follow-up where the next investigation should start.`;
  }

  if (lens === "banking") {
    return `Use ${kpi.label.toLowerCase()} to steer portfolio review, branch prioritisation, or exposure follow-up in the next cycle.`;
  }

  if (audience === "cfo") {
    return `Use ${kpi.label.toLowerCase()} as the anchor for the next variance discussion and confirm which controllable driver explains the movement.`;
  }

  return `Use ${kpi.label.toLowerCase()} as a headline metric, then connect it to the main driver and the next action.`;
}

function buildImplication(
  audience: PromptInterpretation["audience"],
  lens: EnterpriseLens,
  observedState: string,
  defaultImplication: string
): string {
  const audienceProfile = AUDIENCE_PROFILES[audience];

  if (lens === "insurance") {
    return `${observedState}; this should be framed in terms of pricing, reserving, branch follow-up, or claims monitoring.`;
  }

  if (lens === "banking") {
    return `${observedState}; this should be framed in terms of portfolio steering, concentration, branch review, or exposure follow-up.`;
  }

  if (lens === "risk") {
    return `${observedState}; this should be framed as monitoring, escalation, or control validation rather than as a generic performance comment.`;
  }

  return `${observedState}. ${audienceProfile.implicationLead} ${defaultImplication}.`;
}

function buildConfidenceCaveat(profile: DatasetProfile, lens: EnterpriseLens): string {
  if (profile.completeness >= 0.92) {
    return lens === "general"
      ? "The dataset is well populated, so the narrative can stay decision-oriented rather than purely directional."
      : "The dataset is well populated enough to support a disciplined enterprise-style commentary.";
  }

  if (profile.completeness >= 0.78) {
    return "The dataset supports a credible first-pass report, but the commentary should stay explicit about data gaps and validation points.";
  }

  return "The dataset is sparse enough that the report should remain directional, with explicit caveats on missing or partial evidence.";
}

function buildReportTitle(
  prompt: PromptInterpretation,
  leadFinding: ReportFinding | undefined,
  contextLabel: string,
  profile: DatasetProfile
): string {
  if (leadFinding) {
    return truncate(leadFinding.title, 72);
  }

  if (prompt.reportStyle === "dashboard") {
    return `Key drivers and exceptions across ${truncate(contextLabel, 36)}`;
  }

  if (profile.primaryMeasures.length > 0) {
    return `${profile.primaryMeasures[0]} anchors the current ${AUDIENCE_PROFILES[prompt.audience].reviewLabel}`;
  }

  return `${truncate(contextLabel, 30)} needs a structured review narrative`;
}

function buildReportSubtitle(
  prompt: PromptInterpretation,
  contextLabel: string,
  profile: DatasetProfile,
  leadFinding: ReportFinding | undefined
): string {
  const scope = `${profile.dataRowCount.toLocaleString()} rows across ${profile.columnCount} columns`;
  if (leadFinding) {
    return `${scope} from ${truncate(contextLabel, 48)}, prepared for ${AUDIENCE_PROFILES[prompt.audience].reviewLabel}.`;
  }

  return `${scope} from ${truncate(contextLabel, 48)}.`;
}

function buildExecutiveSummary(
  findings: ReportFinding[],
  storyPages: StoryPagePlan[],
  recommendations: string[],
  confidenceCaveat: string,
  reviewLabel: string,
  contextLabel: string
): string[] {
  const first = findings[0];
  const second = findings[1];
  const opening =
    storyPages[0]?.subtitle ||
    (first
      ? `${first.summary} ${first.implication}`
      : `This report reviews ${contextLabel} and organizes the selected data into a ${reviewLabel} with clear priorities.`);
  const middle =
    storyPages[1]?.subtitle ||
    storyPages[1]?.evidence[0] ||
    (second
      ? `${second.summary} ${second.implication}`
      : `The next readout should focus on the clearest KPI, the main segment split, and the areas where evidence is still thin.`);
  const close = storyPages[storyPages.length - 1]?.recommendation
    ? `${storyPages[storyPages.length - 1].recommendation} ${confidenceCaveat}`
    : recommendations[0]
      ? `${recommendations[0]} ${confidenceCaveat}`
      : confidenceCaveat;

  return [opening, middle, close].map((paragraph) => truncate(paragraph, 220));
}

function buildRecommendations(
  findings: ReportFinding[],
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  lens: EnterpriseLens
): string[] {
  const recommendations = findings
    .map((finding) => finding.recommendation)
    .filter((recommendation): recommendation is string => Boolean(recommendation));

  if (profile.completeness < 0.9) {
    recommendations.push(
      "Validate missing or partial fields before external circulation so the final report stays defensible."
    );
  }

  if (profile.chartCandidates.length === 0) {
    recommendations.push(
      "Add a clean date, category, or segment field if you want the next version to unlock richer charting and clearer driver analysis."
    );
  }

  if (lens === "risk") {
    recommendations.push(
      "Translate the key finding into a monitoring trigger, escalation rule, or validation step for the next committee review."
    );
  } else if (lens === "insurance") {
    recommendations.push(
      "Prioritise the branch, product, or claims segment that most clearly explains the observed movement before the next review."
    );
  } else if (lens === "banking") {
    recommendations.push(
      "Confirm whether the lead movement should trigger portfolio reprioritisation, branch follow-up, or deeper exposure analysis."
    );
  } else if (prompt.audience === "cfo") {
    recommendations.push(
      "Translate the lead movement into a variance explanation with an owner, timing, and validation point for finance leadership."
    );
  }

  return Array.from(new Set(recommendations.map((value) => truncate(value, 180)))).slice(0, 4);
}

function prioritizeFindings(findings: ReportFinding[]): ReportFinding[] {
  return findings
    .filter(
      (finding, index, items) => items.findIndex((entry) => entry.title === finding.title) === index
    )
    .slice(0, 4);
}

function describeMateriality(changeRatio: number): string {
  if (changeRatio >= 0.2) {
    return "material";
  }

  if (changeRatio >= 0.08) {
    return "meaningful";
  }

  if (changeRatio >= 0.03) {
    return "noticeable";
  }

  return "modest";
}

function formatSignedPercent(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${(value * 100).toFixed(1)}%`;
}

function formatSignedValue(value: number, label: string): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${formatMetricValue(value, label)}`;
}
