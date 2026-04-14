/* global AbortSignal */

import { generateEmailDrafts } from "../../generators/email/generateEmailDrafts";
import { generateGasProject } from "../../generators/gas/generateGasProject";
import {
  composeSlidesBundle,
  generateSlideOutline,
} from "../../generators/slides/generateSlideOutline";
import {
  GeneratedSlidesBundle,
  LlmProviderConfig,
  LlmSessionSecret,
  ReportForgeBundle,
  ReportPlan,
  SlideOutline,
  SlideTemplateDefinition,
} from "../../shared/types";
import {
  AnalyticalFinding,
  DatasetSemanticProfile,
  StorylineStep,
  ValidationIssue,
} from "../../reporting-engine/domain/types";

import { canUseLlm, requestLlmJson } from "./llmClient";

interface BundleEnhancementPayload {
  title?: string;
  subtitle?: string;
  narrativeSummary?: string;
  summaryParagraphs?: string[];
  confidenceCaveat?: string;
  recommendations?: string[];
  slides?: Array<{
    index?: number;
    title?: string;
    subtitle?: string;
    storyBeat?: string;
    takeaway?: string;
    bullets?: string[];
    evidencePoints?: string[];
    chartSuggestion?: string;
    chartCaption?: string;
    implication?: string;
    recommendation?: string;
    speakerNotes?: string;
    confidenceCaveat?: string;
    sourceMetrics?: string[];
  }>;
}

const ENHANCEMENT_SYSTEM_PROMPT = `You are an enterprise reporting analyst and presentation writer for banking, insurance, finance, and executive reporting teams.
Return one JSON object and nothing else.
Do not invent metrics, dates, trends, or percentages that are not present in the input.
Use only the provided facts and recast them into clear business language that feels ready to review.
Keep the tone aligned to the requested audience and business context.
If a slide template is provided, use it as the storytelling and visual direction for the deck.
If semantic profile, analytical findings, or storyline guidance are provided, treat them as the preferred structure for the final deliverable.
If quality issues are provided, explicitly repair them and do not repeat the weak wording that triggered them.
Make slide titles read like presentation headlines, not worksheet labels.
Do not write instructions such as "Use a chart to", "Explain to the client", "This slide should", or "Present KPI tiles".
Put the strongest insight on the visible slide body, not only in speaker notes.
Use chartSuggestion and chartCaption to explain why the visual exists and what business point it supports.
Keep the deck sequence coherent across opening -> proof -> implication -> decision, unless the input clearly requires a different flow.
Prefer analyst-grade language over design notes or presentation meta-language.
Schema:
{
  "title": "optional string, <= 70 chars",
  "subtitle": "optional string, <= 120 chars",
  "narrativeSummary": "optional string, <= 280 chars",
  "summaryParagraphs": ["2-3 short paragraphs, each <= 180 chars"],
  "confidenceCaveat": "optional string, <= 180 chars",
  "recommendations": ["2-4 concrete next steps, each <= 140 chars"],
  "slides": [
    {
      "index": "slide number from the input",
      "title": "optional string, <= 72 chars",
      "subtitle": "optional string, <= 140 chars",
      "storyBeat": "optional string, <= 48 chars",
      "takeaway": "optional string, <= 160 chars",
      "bullets": ["2-4 concise visible insights, each <= 140 chars"],
      "evidencePoints": ["2-4 evidence-led bullets, each <= 140 chars"],
      "chartSuggestion": "optional string, <= 140 chars",
      "chartCaption": "optional string, <= 140 chars",
      "implication": "optional string, <= 180 chars",
      "recommendation": "optional string, <= 160 chars",
      "speakerNotes": "optional string, <= 260 chars",
      "confidenceCaveat": "optional string, <= 180 chars",
      "sourceMetrics": ["optional metric labels used on the slide"]
    }
  ]
}`;

export async function enhanceBundleWithLlm(
  baseBundle: ReportForgeBundle,
  config: LlmProviderConfig,
  secret: LlmSessionSecret | null,
  options?: {
    signal?: AbortSignal;
    slideTemplate?: SlideTemplateDefinition | null;
    semanticProfile?: DatasetSemanticProfile;
    analyticalFindings?: AnalyticalFinding[];
    storyline?: StorylineStep[];
    qualityIssues?: ValidationIssue[];
  }
): Promise<ReportForgeBundle> {
  if (!canUseLlm(config, secret)) {
    return baseBundle;
  }

  const payload = await requestLlmJson<BundleEnhancementPayload>(
    config,
    secret,
    ENHANCEMENT_SYSTEM_PROMPT,
    buildEnhancementContext(baseBundle, options?.slideTemplate ?? null, options),
    options
  );
  const nextPlan = mergePlan(baseBundle.plan, payload);
  const nextSlidesBundle = mergeSlidesBundle(
    generateSlideOutline(baseBundle.profile, baseBundle.prompt, nextPlan),
    nextPlan.title,
    payload.slides,
    nextPlan.recommendations
  );

  return {
    ...baseBundle,
    plan: nextPlan,
    gasProject: generateGasProject(
      baseBundle.snapshot,
      baseBundle.profile,
      baseBundle.prompt,
      nextPlan
    ),
    emailBundle: generateEmailDrafts(baseBundle.profile, baseBundle.prompt, nextPlan),
    slidesBundle: nextSlidesBundle,
    aiEnhancement: {
      providerLabel: config.providerLabel.trim() || "Custom LLM",
      model: config.model.trim(),
      enhancedAt: new Date().toISOString(),
    },
  };
}

function buildEnhancementContext(
  bundle: ReportForgeBundle,
  slideTemplate: SlideTemplateDefinition | null,
  options?: {
    semanticProfile?: DatasetSemanticProfile;
    analyticalFindings?: AnalyticalFinding[];
    storyline?: StorylineStep[];
    qualityIssues?: ValidationIssue[];
  }
) {
  return {
    source: {
      workbook: bundle.snapshot.workbookName || "Current workbook",
      sheet: bundle.snapshot.sheetName,
      range: bundle.snapshot.address,
      businessContext: bundle.prompt.businessContext,
      rows: bundle.profile.dataRowCount,
      columns: bundle.profile.columnCount,
      datasetShape: bundle.profile.datasetShape,
      headersDetected: bundle.profile.hasHeaders,
      measures: bundle.profile.primaryMeasures,
      dimensions: bundle.profile.primaryDimensions,
      profilerNotes: bundle.profile.notes,
    },
    prompt: {
      raw: bundle.prompt.rawPrompt,
      audience: bundle.prompt.audience,
      tone: bundle.prompt.tone,
      reportStyle: bundle.prompt.reportStyle,
      slideCount: bundle.prompt.slideCount,
      emphasizesCharts: bundle.prompt.emphasizesCharts,
      emphasizesNarrative: bundle.prompt.emphasizesNarrative,
    },
    basePlan: {
      title: bundle.plan.title,
      subtitle: bundle.plan.subtitle,
      narrativeSummary: bundle.plan.narrativeSummary,
      confidenceCaveat: bundle.plan.confidenceCaveat,
      summaryParagraphs: bundle.plan.excel.summaryParagraphs,
      recommendations: bundle.plan.recommendations,
      findings: bundle.plan.findings ?? [],
    },
    kpis: bundle.plan.excel.kpis.map((kpi) => ({
      label: kpi.label,
      value: kpi.formattedValue,
      insight: kpi.insight,
    })),
    charts: bundle.plan.excel.charts.slice(0, 3).map((chart) => ({
      title: chart.title,
      kind: chart.kind,
      categoryLabel: chart.categoryLabel,
      valueLabel: chart.valueLabel,
      insight: chart.insight,
      sampleCategories: chart.categories.slice(0, 5),
      sampleValues: chart.values.slice(0, 5),
    })),
    semanticProfile: options?.semanticProfile
      ? {
          enterpriseLens: options.semanticProfile.enterpriseLens,
          timeDimension: options.semanticProfile.timeDimension,
          metricColumns: options.semanticProfile.metricColumns,
          dimensionColumns: options.semanticProfile.dimensionColumns,
          identifierColumns: options.semanticProfile.identifierColumns,
          comparisonModes: options.semanticProfile.comparisonModes,
          notes: options.semanticProfile.notes,
        }
      : null,
    analyticalFindings: options?.analyticalFindings?.map((finding) => ({
      title: finding.title,
      summary: finding.summary,
      implication: finding.implication,
      recommendation: finding.recommendation,
      evidencePoints: finding.evidencePoints,
      priority: finding.priority,
      sourceMetrics: finding.sourceMetrics,
    })),
    storyline: options?.storyline?.map((step) => ({
      title: step.title,
      purpose: step.purpose,
      message: step.message,
      recommendedVisual: step.recommendedVisual,
      findingIds: step.findingIds,
    })),
    qualityIssues: options?.qualityIssues?.map((issue) => ({
      code: issue.code,
      severity: issue.severity,
      message: issue.message,
      slideIndex: issue.slideIndex,
    })),
    slideTemplate: slideTemplate
      ? {
          name: slideTemplate.name,
          audienceLabel: slideTemplate.audienceLabel,
          narrativeStyle: slideTemplate.narrativeStyle,
          visualDirection: slideTemplate.visualDirection,
          storytellingDirective: slideTemplate.storytellingDirective,
          heroStyle: slideTemplate.heroStyle,
          contentLayout: slideTemplate.contentLayout,
          cardStyle: slideTemplate.cardStyle,
          promptHint: slideTemplate.promptHint,
        }
      : null,
    slides: bundle.slidesBundle.slides.map((slide) => ({
      index: slide.index,
      title: slide.title,
      subtitle: slide.subtitle,
      storyBeat: slide.storyBeat,
      takeaway: slide.takeaway,
      bullets: slide.bullets,
      evidencePoints: slide.evidencePoints,
      chartSuggestion: slide.chartSuggestion,
      chartCaption: slide.chartCaption,
      implication: slide.implication,
      recommendation: slide.recommendation,
      speakerNotes: slide.speakerNotes,
      confidenceCaveat: slide.confidenceCaveat,
      sourceMetrics: slide.sourceMetrics,
      headlineMetric: slide.headlineMetric
        ? {
            label: slide.headlineMetric.label,
            value: slide.headlineMetric.value,
            detail: slide.headlineMetric.detail,
          }
        : null,
      visual: slide.visual
        ? {
            kind: slide.visual.kind,
            title: slide.visual.title,
            emphasis: slide.visual.emphasis,
          }
        : null,
    })),
  };
}

function mergePlan(plan: ReportPlan, payload: BundleEnhancementPayload): ReportPlan {
  const summaryParagraphs = normalizeList(payload.summaryParagraphs, 3);
  const recommendations = normalizeList(payload.recommendations, 4);
  const title = normalizeString(payload.title, 70) || plan.title;
  const subtitle = normalizeString(payload.subtitle, 120) || plan.subtitle;
  const narrativeSummary =
    normalizeString(payload.narrativeSummary, 280) || summaryParagraphs[0] || plan.narrativeSummary;
  const confidenceCaveat = normalizeString(payload.confidenceCaveat, 180) || plan.confidenceCaveat;

  return {
    ...plan,
    title,
    subtitle,
    narrativeSummary,
    executiveSummary: summaryParagraphs.length > 0 ? summaryParagraphs : plan.executiveSummary,
    confidenceCaveat,
    recommendations: recommendations.length > 0 ? recommendations : plan.recommendations,
    excel: {
      ...plan.excel,
      summaryParagraphs:
        summaryParagraphs.length > 0 ? summaryParagraphs : plan.excel.summaryParagraphs,
    },
  };
}

function normalizeString(value: string | undefined, maxLength: number): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeList(values: string[] | undefined, maxItems: number): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(values.map((value) => normalizeString(value, 180)).filter(Boolean))
  ).slice(0, maxItems);
}

function mergeSlidesBundle(
  slidesBundle: GeneratedSlidesBundle,
  reportTitle: string,
  slidePayloads: BundleEnhancementPayload["slides"],
  reportRecommendations: string[] = []
): GeneratedSlidesBundle {
  if (!Array.isArray(slidePayloads) || slidePayloads.length === 0) {
    return slidesBundle;
  }

  const slides = slidesBundle.slides.map((slide, index) => {
    const payload = resolveSlidePayload(slidePayloads, slide.index, index);

    if (!payload) {
      return slide;
    }

    return {
      ...slide,
      title: normalizeDeliveredTitle(payload.title, slide.title),
      subtitle: normalizeString(payload.subtitle, 140) || slide.subtitle,
      storyBeat: normalizeString(payload.storyBeat, 48) || slide.storyBeat,
      takeaway: normalizeString(payload.takeaway, 160) || slide.takeaway,
      bullets: normalizeSlideBullets(payload.bullets, slide.bullets),
      evidencePoints: normalizeSlideBullets(
        payload.evidencePoints,
        slide.evidencePoints ?? slide.bullets
      ),
      chartSuggestion: normalizeString(payload.chartSuggestion, 140) || slide.chartSuggestion,
      chartCaption: normalizeString(payload.chartCaption, 140) || slide.chartCaption,
      implication: normalizeString(payload.implication, 180) || slide.implication,
      recommendation:
        normalizeString(payload.recommendation, 160) ||
        (index === 0 ? reportRecommendations[0] : "") ||
        slide.recommendation,
      speakerNotes: normalizeString(payload.speakerNotes, 260) || slide.speakerNotes,
      confidenceCaveat: normalizeString(payload.confidenceCaveat, 180) || slide.confidenceCaveat,
      sourceMetrics:
        normalizeList(payload.sourceMetrics, 5).length > 0
          ? normalizeList(payload.sourceMetrics, 5)
          : slide.sourceMetrics,
    } satisfies SlideOutline;
  });

  return composeSlidesBundle(reportTitle, slidesBundle.theme, slides);
}

function resolveSlidePayload(
  slidePayloads: NonNullable<BundleEnhancementPayload["slides"]>,
  slideIndex: number,
  arrayIndex: number
) {
  return (
    slidePayloads.find((payload) => payload?.index === slideIndex) ??
    slidePayloads[arrayIndex] ??
    null
  );
}

function normalizeSlideBullets(values: string[] | undefined, fallback: string[]): string[] {
  const normalized = normalizeList(values, 4)
    .map((value) => normalizeString(value, 140))
    .filter((value) => !containsInstructionalTone(value));
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeDeliveredTitle(value: string | undefined, fallback: string): string {
  const normalized = normalizeString(value, 72);
  if (!normalized || containsInstructionalTone(normalized)) {
    return fallback;
  }

  return normalized;
}

function containsInstructionalTone(value: string): boolean {
  const normalized = value.toLowerCase();
  return [
    "use a chart",
    "use the chart",
    "this slide should",
    "explain to the client",
    "present kpi",
    "guide the discussion",
    "show the client",
    "this slide exists to",
    "the closing visual",
    "presenter notes",
    "keep this slide for",
    "open on the",
  ].some((pattern) => normalized.includes(pattern));
}
