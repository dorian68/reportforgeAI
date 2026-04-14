import {
  AnalyticalFinding,
  DatasetSemanticProfile,
  NormalizedReportRequest,
  StorylineStep,
} from "../domain/types";
import { StoryPagePlan } from "../../shared/types";

function takeTopFindingIds(findings: AnalyticalFinding[], count: number): string[] {
  return findings.slice(0, count).map((finding) => finding.id);
}

function recommendedVisualForPage(page: StoryPagePlan): string {
  switch (page.visualKind) {
    case "kpi-strip":
      return "headline-scorecard";
    case "line":
    case "area":
      return "trend-chart";
    case "bar":
    case "stacked-bar":
      return "ranked-bars";
    case "map":
      return "geography-view";
    case "table":
      return "detail-table";
    case "donut":
      return "mix-view";
    default:
      return page.purpose === "recommendation" ? "action-matrix" : "driver-summary";
  }
}

function findingIdsForStoryPage(page: StoryPagePlan, findings: AnalyticalFinding[]): string[] {
  const matched = findings.filter((finding) => {
    if (page.chartId && finding.sourceChartId === page.chartId) {
      return true;
    }

    return finding.sourceMetrics.some((metric) => page.metricLabels.includes(metric));
  });
  return matched.slice(0, 2).map((finding) => finding.id);
}

function buildStorylineFromStoryPages(
  storyPages: StoryPagePlan[],
  findings: AnalyticalFinding[]
): StorylineStep[] {
  return storyPages.map((page, index) => ({
    id: page.id || `story-step-${index + 1}`,
    title: page.title,
    purpose: page.distinctJob,
    message:
      page.subtitle ||
      page.implication ||
      page.recommendation ||
      page.evidence[0] ||
      page.storyBeat,
    findingIds:
      findingIdsForStoryPage(page, findings).length > 0
        ? findingIdsForStoryPage(page, findings)
        : takeTopFindingIds(findings, Math.min(2, Math.max(1, index === 0 ? 1 : 2))),
    recommendedVisual: recommendedVisualForPage(page),
  }));
}

export function buildStoryline(
  findings: AnalyticalFinding[],
  semanticProfile: DatasetSemanticProfile,
  request: NormalizedReportRequest
): StorylineStep[] {
  const storyPages = request.existingBundle?.plan.storyPages ?? [];
  if (storyPages.length > 0) {
    return buildStorylineFromStoryPages(storyPages.slice(0, request.maxSlides), findings);
  }

  const primary = findings[0];
  const secondary = findings[1];
  const tertiary = findings[2];

  const steps: StorylineStep[] = [
    {
      id: "opening",
      title: primary?.title ?? "Headline performance message",
      purpose: "Open with the message that matters most for the requested audience.",
      message:
        primary?.summary ??
        "Lead with the clearest performance signal visible in the selected data.",
      findingIds: takeTopFindingIds(findings, 1),
      recommendedVisual: "headline-scorecard",
    },
  ];

  if (secondary) {
    steps.push({
      id: "evidence",
      title: secondary.title,
      purpose: "Back the opening message with the strongest proof point.",
      message: secondary.summary,
      findingIds: [secondary.id],
      recommendedVisual:
        semanticProfile.timeDimension && secondary.kind === "trend" ? "trend-chart" : "ranked-bars",
    });
  }

  if (tertiary) {
    steps.push({
      id: "implication",
      title: tertiary.title,
      purpose: "Translate the evidence into a management or client implication.",
      message: tertiary.implication,
      findingIds: [tertiary.id],
      recommendedVisual:
        tertiary.kind === "concentration" ? "concentration-view" : "driver-summary",
    });
  }

  steps.push({
    id: "decision",
    title:
      request.objective === "recommend"
        ? "Management action should now focus on the most material lever"
        : "The close should land on the next monitoring and decision point",
    purpose: "Finish on action, monitoring, or decision support instead of a descriptive recap.",
    message:
      findings.find((finding) => Boolean(finding.recommendation))?.recommendation ??
      "Close on the most concrete next step supported by the current evidence.",
    findingIds: takeTopFindingIds(findings, 2),
    recommendedVisual: "action-matrix",
  });

  return steps;
}
