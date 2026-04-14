import { ReportForgeBundle } from "../../shared/types";
import {
  NarrativeBlock,
  RenderArtifact,
  ReportPlan,
  ReportSection,
  VisualSpec,
} from "../domain/types";

function buildConfidenceStatement(bundle: ReportForgeBundle): string {
  if (bundle.profile.completeness >= 0.9) {
    return "High confidence: the dataset is well populated and supports a decision-ready summary.";
  }

  if (bundle.profile.completeness >= 0.7) {
    return "Moderate confidence: the dataset supports directional reporting, with some gaps to keep in mind.";
  }

  return "Cautious confidence: the dataset is sparse, so the report should be treated as directional rather than exhaustive.";
}

function buildLimitations(bundle: ReportForgeBundle): string[] {
  const limitations = [...bundle.profile.notes, ...bundle.plan.brief.constraints];

  if (bundle.profile.completeness < 0.9) {
    limitations.push(
      `Completeness is ${Math.round(bundle.profile.completeness * 100)}%, so some conclusions should stay directional.`
    );
  }

  if (bundle.plan.excel.charts.length === 0) {
    limitations.push("No chart-worthy numeric series were detected in the current selection.");
  }

  return Array.from(new Set(limitations)).slice(0, 5);
}

function mapStoryVisuals(bundle: ReportForgeBundle, storyPageId: string): VisualSpec[] {
  const storyPage = bundle.plan.storyPages.find((entry) => entry.id === storyPageId);
  if (!storyPage) {
    return [];
  }

  if (storyPage.chartId) {
    const chart = bundle.plan.excel.charts.find((entry) => entry.id === storyPage.chartId);
    if (chart) {
      return [
        {
          id: chart.id,
          title: storyPage.visualTitle,
          kind: chart.kind,
          rationale: storyPage.visualRationale,
          emphasis: storyPage.narrativeAngle,
          sourceChartId: chart.id,
        },
      ];
    }
  }

  return storyPage.metricLabels.slice(0, 4).map((metricLabel) => ({
    id: metricLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: metricLabel,
    kind: "scorecard",
    rationale: storyPage.visualRationale,
    emphasis: storyPage.narrativeAngle,
  }));
}

function mapStoryPageToSection(bundle: ReportForgeBundle): ReportSection[] {
  const narrativeSource: NarrativeBlock["source"] = bundle.aiEnhancement ? "hybrid" : "data";
  return bundle.plan.storyPages.map((page) => {
    const narrativeBlocks: NarrativeBlock[] = [
      {
        id: `${page.id}-summary`,
        kind: "headline",
        text: page.subtitle,
        source: narrativeSource,
      },
      ...page.evidence.map((text, index) => ({
        id: `${page.id}-evidence-${index + 1}`,
        kind: "summary" as const,
        text,
        source: narrativeSource,
      })),
      ...(page.implication
        ? [
            {
              id: `${page.id}-implication`,
              kind: "insight" as const,
              text: page.implication,
              source: narrativeSource,
            },
          ]
        : []),
      ...(page.recommendation
        ? [
            {
              id: `${page.id}-recommendation`,
              kind: "recommendation" as const,
              text: page.recommendation,
              source: narrativeSource,
            },
          ]
        : []),
    ];

    return {
      id: page.id,
      title: page.title,
      purpose: page.distinctJob,
      narrativeBlocks,
      visuals: mapStoryVisuals(bundle, page.id),
      callToAction: page.callToAction ?? page.recommendation,
      limitations:
        page.purpose === "anomaly" ? bundle.plan.brief.constraints.slice(0, 2) : undefined,
    };
  });
}

export function mapBundleToReportPlan(
  bundle: ReportForgeBundle,
  request: {
    audience: ReportPlan["audience"];
    objective: ReportPlan["objective"];
    tone: ReportPlan["tone"];
    preferredFormats: ReportPlan["recommendedFormats"];
  }
): ReportPlan {
  const limitations = buildLimitations(bundle);
  const sections = mapStoryPageToSection(bundle);

  return {
    title: bundle.plan.title,
    subtitle: bundle.plan.subtitle,
    audience: request.audience,
    objective: request.objective,
    tone: request.tone,
    primaryMessage: bundle.plan.storyPages[0]?.subtitle ?? bundle.plan.narrativeSummary,
    recommendedFormats: request.preferredFormats,
    sections,
    brief: bundle.plan.brief,
    storyPages: bundle.plan.storyPages,
    limitations,
    confidenceStatement: buildConfidenceStatement(bundle),
  };
}

export function buildArtifactWarnings(artifacts: RenderArtifact[]): string[] {
  return artifacts
    .filter((artifact) => artifact.status !== "ready")
    .map((artifact) => artifact.summary);
}
