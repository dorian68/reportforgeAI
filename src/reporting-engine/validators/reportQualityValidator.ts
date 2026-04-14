import { ReportForgeBundle, SlideOutline } from "../../shared/types";
import { composeSlidesBundle } from "../../generators/slides/generateSlideOutline";
import { generateEmailDrafts } from "../../generators/email/generateEmailDrafts";
import { generateGasProject } from "../../generators/gas/generateGasProject";
import {
  AnalyticalFinding,
  StorylineStep,
  ValidationIssue,
  ValidationResult,
} from "../domain/types";

const INSTRUCTION_PATTERNS = [
  /\bthis slide exists to\b/i,
  /\buse (?:a|the) [^.]*chart\b/i,
  /\buse a kpi card\b/i,
  /\bthe closing visual\b/i,
  /\bthis panel exists\b/i,
  /\bkeep this slide for\b/i,
  /\bopen on the\b/i,
  /\bpresenter notes\b/i,
];

const GENERIC_TITLES = new Set([
  "executive summary",
  "kpi scorecard",
  "visual evidence",
  "recommended actions",
  "backup evidence 1",
  "backup evidence 2",
  "backup evidence 3",
]);

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripInstructionLanguage(value: string): string {
  const cleaned = normalizeWhitespace(value)
    .replace(/\bthis slide exists to frame\b/gi, "This slide focuses on framing")
    .replace(/\bthis slide exists to\b/gi, "This slide focuses on")
    .replace(/\bthis opening visual exists to\b/gi, "The opening view keeps attention on")
    .replace(/\bthis summary slide exists to\b/gi, "The summary keeps attention on")
    .replace(
      /\bthe closing visual should help the audience leave with\b/gi,
      "The closing view reinforces"
    )
    .replace(/\buse the [^.]* chart to show\b/gi, "The chart highlights")
    .replace(/\buse a kpi card to anchor the story on\b/gi, "A KPI scorecard keeps")
    .replace(/\bthis panel exists for\b/gi, "This panel supports")
    .replace(/\bkeep this slide for\b/gi, "This slide supports")
    .replace(/\bopen on the\b/gi, "Open with the");

  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function pickFallbackMetricTitle(finding: AnalyticalFinding | undefined, fallback: string): string {
  return finding?.title || fallback;
}

function strengthenTitle(slide: SlideOutline, storyline: StorylineStep[], index: number): string {
  const current = normalizeWhitespace(slide.title);
  if (current && !GENERIC_TITLES.has(current.toLowerCase())) {
    return current;
  }

  const step = storyline[Math.min(index, storyline.length - 1)];
  return pickFallbackMetricTitle(
    undefined,
    step?.title || "Headline message for the current reporting section"
  );
}

function strengthenChartCopy(
  value: string,
  slide: SlideOutline,
  refinedTakeaway = slide.takeaway
): string {
  if (!value.trim()) {
    return refinedTakeaway;
  }

  if (INSTRUCTION_PATTERNS.some((pattern) => pattern.test(value))) {
    const metricLabel =
      slide.headlineMetric?.label || slide.sourceMetrics?.[0] || "the current performance signal";
    return `${metricLabel} is the visual anchor for this slide and supports the message that ${refinedTakeaway.toLowerCase()}`;
  }

  return normalizeWhitespace(value);
}

function checkIssuesInSlide(slide: SlideOutline, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const visibleFields = [
    slide.title,
    slide.subtitle ?? "",
    slide.takeaway,
    ...(slide.evidencePoints ?? slide.bullets),
    slide.chartSuggestion,
    slide.chartCaption ?? "",
    slide.implication ?? "",
    slide.recommendation ?? "",
  ];

  if (GENERIC_TITLES.has(normalizeWhitespace(slide.title).toLowerCase())) {
    issues.push({
      code: "generic-title",
      severity: "warning",
      message: `Slide ${index + 1} still uses a generic title.`,
      slideIndex: index + 1,
    });
  }

  if (visibleFields.some((field) => INSTRUCTION_PATTERNS.some((pattern) => pattern.test(field)))) {
    issues.push({
      code: "instruction-leak",
      severity: "critical",
      message: `Slide ${index + 1} still leaks internal instruction language.`,
      slideIndex: index + 1,
    });
  }

  if ((slide.evidencePoints ?? slide.bullets).length < 2) {
    issues.push({
      code: "weak-insight",
      severity: "warning",
      message: `Slide ${index + 1} does not yet expose enough visible evidence.`,
      slideIndex: index + 1,
    });
  }

  if (
    (slide.speakerNotes?.length ?? 0) >
    slide.takeaway.length + (slide.implication?.length ?? 0) + 80
  ) {
    issues.push({
      code: "speaker-note-heavier-than-body",
      severity: "warning",
      message: `Slide ${index + 1} keeps too much of the value in speaker notes.`,
      slideIndex: index + 1,
    });
  }

  return issues;
}

function detectRepetition(slides: SlideOutline[]): ValidationIssue[] {
  const signatures = new Map<string, number>();
  const issues: ValidationIssue[] = [];

  slides.forEach((slide, index) => {
    const signature = normalizeWhitespace(
      `${slide.takeaway} ${(slide.evidencePoints ?? slide.bullets).join(" ")}`
    )
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, "")
      .split(" ")
      .slice(0, 12)
      .join(" ");

    if (!signature) {
      return;
    }

    if (signatures.has(signature)) {
      issues.push({
        code: "repetition",
        severity: "warning",
        message: `Slide ${index + 1} repeats an earlier narrative pattern too closely.`,
        slideIndex: index + 1,
      });
      return;
    }

    signatures.set(signature, index + 1);
  });

  return issues;
}

function refineSlide(slide: SlideOutline, storyline: StorylineStep[], index: number): SlideOutline {
  const visibleEvidence = (slide.evidencePoints ?? slide.bullets).map((bullet) =>
    stripInstructionLanguage(bullet)
  );
  const title = strengthenTitle(slide, storyline, index);
  const takeaway = stripInstructionLanguage(slide.takeaway);
  const implication = slide.implication
    ? stripInstructionLanguage(slide.implication)
    : slide.implication;
  const recommendation = slide.recommendation
    ? stripInstructionLanguage(slide.recommendation)
    : slide.recommendation;

  return {
    ...slide,
    title,
    subtitle: slide.subtitle ? stripInstructionLanguage(slide.subtitle) : slide.subtitle,
    takeaway,
    bullets: visibleEvidence,
    evidencePoints: visibleEvidence,
    chartSuggestion: strengthenChartCopy(slide.chartSuggestion, slide, takeaway),
    chartCaption: strengthenChartCopy(slide.chartCaption ?? slide.chartSuggestion, slide, takeaway),
    implication,
    recommendation,
    speakerNotes: stripInstructionLanguage(slide.speakerNotes),
  };
}

function refineEmailBundle(bundle: ReportForgeBundle) {
  return generateEmailDrafts(bundle.profile, bundle.prompt, bundle.plan);
}

export function refineBundleForDelivery(
  bundle: ReportForgeBundle,
  storyline: StorylineStep[]
): ReportForgeBundle {
  const slides = bundle.slidesBundle.slides.map((slide, index) =>
    refineSlide(slide, storyline, index)
  );
  const slidesBundle = composeSlidesBundle(bundle.plan.title, bundle.slidesBundle.theme, slides);
  const nextBundle = {
    ...bundle,
    slidesBundle,
  };

  return {
    ...nextBundle,
    emailBundle: refineEmailBundle(nextBundle),
    gasProject: generateGasProject(
      nextBundle.snapshot,
      nextBundle.profile,
      nextBundle.prompt,
      nextBundle.plan
    ),
  };
}

export function validateBundleForDelivery(
  bundle: ReportForgeBundle,
  storyline: StorylineStep[]
): ValidationResult {
  const slideIssues = bundle.slidesBundle.slides.flatMap((slide, index) =>
    checkIssuesInSlide(slide, index)
  );
  const repetitionIssues = detectRepetition(bundle.slidesBundle.slides);
  const planIssues: ValidationIssue[] = [];

  if (INSTRUCTION_PATTERNS.some((pattern) => pattern.test(bundle.plan.narrativeSummary))) {
    planIssues.push({
      code: "instruction-leak",
      severity: "critical",
      message: "The report-level narrative summary still contains instruction-style language.",
    });
  }

  if (!storyline.length) {
    planIssues.push({
      code: "weak-insight",
      severity: "warning",
      message: "No storyline was produced for the reporting engine result.",
    });
  }

  const issues = [...slideIssues, ...repetitionIssues, ...planIssues];
  return {
    passed: !issues.some((issue) => issue.severity === "critical"),
    issues,
  };
}
