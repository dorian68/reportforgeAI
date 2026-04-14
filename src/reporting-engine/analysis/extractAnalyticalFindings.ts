import { ReportForgeBundle } from "../../shared/types";
import {
  AnalyticalFinding,
  DatasetSemanticProfile,
  NormalizedReportRequest,
} from "../domain/types";

function findingKind(
  title: string,
  semanticProfile: DatasetSemanticProfile
): AnalyticalFinding["kind"] {
  const normalized = title.toLowerCase();
  if (semanticProfile.timeDimension && /\bfrom\b|\bmonth\b|\bperiod\b|\btrend\b/.test(normalized)) {
    return "trend";
  }

  if (/\bconcentrat|share|mix|segment|region|branch|desk\b/.test(normalized)) {
    return "concentration";
  }

  if (/\bmargin|variance|gap|target|budget|plan\b/.test(normalized)) {
    return "variance";
  }

  if (/\brisk|volatility|outlier|anomaly|dispersion\b/.test(normalized)) {
    return "risk";
  }

  return "kpi";
}

function basePriority(kind: AnalyticalFinding["kind"]): number {
  switch (kind) {
    case "variance":
      return 100;
    case "trend":
      return 95;
    case "concentration":
      return 90;
    case "risk":
      return 88;
    case "segment":
      return 84;
    case "quality":
      return 78;
    default:
      return 80;
  }
}

export function extractAnalyticalFindings(
  bundle: ReportForgeBundle,
  semanticProfile: DatasetSemanticProfile,
  request: NormalizedReportRequest
): AnalyticalFinding[] {
  const findingsFromPlan = (bundle.plan.findings ?? []).map((finding, index) => {
    const kind = findingKind(finding.title, semanticProfile);
    const priority =
      basePriority(kind) -
      index +
      (finding.sourceMetrics.some((metric) => semanticProfile.metricColumns.includes(metric))
        ? 4
        : 0) +
      (semanticProfile.enterpriseLens === "finance" &&
      /\bmargin|cost|revenue\b/i.test(finding.title)
        ? 4
        : 0);

    return {
      id: finding.id,
      kind,
      title: finding.title,
      summary: finding.summary,
      implication: finding.implication,
      recommendation: finding.recommendation,
      evidencePoints: finding.evidencePoints,
      sourceMetrics: finding.sourceMetrics,
      sourceChartId: finding.sourceChartId,
      priority,
    } satisfies AnalyticalFinding;
  });

  if (findingsFromPlan.length > 0) {
    return findingsFromPlan.sort((left, right) => right.priority - left.priority).slice(0, 6);
  }

  return bundle.plan.excel.kpis.slice(0, 3).map((kpi, index) => ({
    id: `fallback-kpi-${kpi.id}`,
    kind: "kpi",
    title:
      request.audience === "cfo"
        ? `${kpi.label} anchors the current finance review at ${kpi.formattedValue}`
        : `${kpi.label} remains one of the clearest anchors in the selected data at ${kpi.formattedValue}`,
    summary: `${kpi.label} is reported at ${kpi.formattedValue}. ${kpi.insight}`,
    implication:
      semanticProfile.metricColumns.length > 1
        ? "This KPI should stay in the opening narrative because it helps frame the rest of the report."
        : "This KPI provides the clearest entry point into the current selection.",
    recommendation:
      request.objective === "alert"
        ? `Validate the driver behind ${kpi.label.toLowerCase()} before escalation.`
        : `Use ${kpi.label.toLowerCase()} as the opening anchor, then move to the most material driver.`,
    evidencePoints: [
      `${kpi.label} is ${kpi.formattedValue}.`,
      kpi.insight,
      semanticProfile.notes[0] ?? "The finding is grounded in the selected range only.",
    ],
    sourceMetrics: [kpi.label],
    priority: 70 - index,
  }));
}
