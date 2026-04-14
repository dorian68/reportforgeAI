import { CanvasDesignIntent, CanvasFormatTarget, CanvasRendererHint } from "../../shared/types";
import { ReportFormat, ReportObjective, ReportRequest, ReportTone } from "../domain/types";

interface ReportingPreset {
  id: string;
  label: string;
  objective: ReportObjective;
  tone: ReportTone;
  preferredFormats: ReportFormat[];
  promptHint: string;
  designIntent: CanvasDesignIntent;
}

function buildRendererHints(
  emphasis: CanvasRendererHint["emphasis"],
  spacing: CanvasRendererHint["spacing"]
): Partial<Record<CanvasFormatTarget, CanvasRendererHint>> {
  return {
    canvas: {
      columns: 12,
      spacing,
      emphasis,
    },
    html: {
      columns: 12,
      spacing,
      emphasis,
    },
    pptx: {
      columns: 12,
      spacing,
      emphasis,
    },
    pdf: {
      columns: 12,
      spacing,
      emphasis,
    },
    "email-html": {
      columns: 8,
      spacing: "tight",
      emphasis: "narrative-first",
    },
    "gas-project": {
      columns: 12,
      spacing: "balanced",
      emphasis: "visual-first",
    },
    "excel-plan": {
      columns: 12,
      spacing: "tight",
      emphasis: "kpi-first",
    },
  };
}

export const REPORTING_PRESETS: ReportingPreset[] = [
  {
    id: "executive-monthly",
    label: "Executive Monthly Review",
    objective: "summarize",
    tone: "executive",
    preferredFormats: ["html", "pptx", "email-html"],
    promptHint: "Best for leadership updates that need a compact storyline and a clear scorecard.",
    designIntent: {
      styleName: "Executive briefing system",
      audienceBehavior: "Restrained, high-signal composition for leadership reviews.",
      designTone: "Executive, crisp, KPI-first.",
      narrativeDensity: "balanced",
      pageRhythm: "hero -> scorecard -> evidence -> action",
      summaryPlacement: "top-left summary with immediate scorecard support",
      chartPreference: "Limited charts with high explanatory value.",
      componentGrammar: ["hero", "kpi-strip", "chart-panel", "narrative-panel", "recommendations"],
      allowedComponents: [
        "hero",
        "kpi-strip",
        "chart-panel",
        "narrative-panel",
        "recommendations",
        "callout",
      ],
      layoutRules: [
        "Keep the opening fold dominated by the main message and 2-4 KPI tiles.",
        "Use one proof visual per page before adding secondary commentary.",
      ],
      titleStyle: "Message-led headline with restrained subtitle.",
      annotationStyle: "Minimal, executive, focused on implication.",
      rendererHints: buildRendererHints("kpi-first", "balanced"),
      promptHint: "Lead with the performance message and keep the layout executive.",
    },
  },
  {
    id: "client-decision-pack",
    label: "Client Decision Pack",
    objective: "recommend",
    tone: "consultative",
    preferredFormats: ["html", "pptx", "pdf", "email-html", "gas-project"],
    promptHint: "Best for persuasive client-facing decks and follow-up messages.",
    designIntent: {
      styleName: "Client decision storyboard",
      audienceBehavior: "Persuasive, polished, decision-oriented presentation flow.",
      designTone: "Consultative, premium, visually guided.",
      narrativeDensity: "balanced",
      pageRhythm: "problem -> evidence -> recommendation -> next step",
      summaryPlacement: "hero summary centered before evidence",
      chartPreference: "Comparison and before/after visuals that support recommendation.",
      componentGrammar: [
        "hero",
        "summary",
        "chart-panel",
        "narrative-panel",
        "callout",
        "recommendations",
      ],
      allowedComponents: [
        "hero",
        "summary",
        "kpi-strip",
        "chart-panel",
        "narrative-panel",
        "callout",
        "recommendations",
        "email-summary",
      ],
      layoutRules: [
        "Use stronger callouts and recommendation modules than in executive review mode.",
        "Keep each page anchored on one decision point rather than a broad scorecard.",
      ],
      titleStyle: "Client-facing headline that lands on the recommendation.",
      annotationStyle: "Persuasive, concise, commercial.",
      rendererHints: buildRendererHints("narrative-first", "airy"),
      promptHint: "Build a persuasive but disciplined decision pack for external stakeholders.",
    },
  },
  {
    id: "finance-alert",
    label: "Finance Alert Pack",
    objective: "alert",
    tone: "analytical",
    preferredFormats: ["html", "pptx", "email-html", "excel-plan"],
    promptHint: "Best for variance alerts, root-cause reviews, and finance escalation packs.",
    designIntent: {
      styleName: "Finance control room",
      audienceBehavior: "Analytical, variance-led, root-cause focused.",
      designTone: "Dense but disciplined finance reporting.",
      narrativeDensity: "dense",
      pageRhythm: "alert -> drivers -> concentration -> follow-up",
      summaryPlacement: "top alert banner with supporting variance blocks",
      chartPreference: "Variance bars, ranked comparisons, concentration views.",
      componentGrammar: [
        "hero",
        "kpi-strip",
        "chart-panel",
        "table",
        "narrative-panel",
        "recommendations",
      ],
      allowedComponents: [
        "hero",
        "summary",
        "kpi-strip",
        "chart-panel",
        "table",
        "narrative-panel",
        "recommendations",
        "callout",
      ],
      layoutRules: [
        "Keep a stronger analytical density and allow tables on evidence-heavy pages.",
        "Use calls to action as control actions, not commercial recommendations.",
      ],
      titleStyle: "Variance-led headline with finance wording.",
      annotationStyle: "Analytical, control-oriented, evidence-heavy.",
      rendererHints: buildRendererHints("kpi-first", "tight"),
      promptHint: "Bias the layout toward variance analysis and root-cause review.",
    },
  },
  {
    id: "board-brief",
    label: "Board Brief",
    objective: "summarize",
    tone: "formal",
    preferredFormats: ["html", "pptx", "pdf", "email-html"],
    promptHint: "Best for board packs, investors, and concise strategic storytelling.",
    designIntent: {
      styleName: "Board committee pack",
      audienceBehavior: "Formal, strategic, concise, low-noise layout.",
      designTone: "Board-grade, measured, message-led.",
      narrativeDensity: "compact",
      pageRhythm: "opening message -> strategic evidence -> risk/watchpoints -> action",
      summaryPlacement: "single hero statement before any detail",
      chartPreference: "Limited chart count, emphasis on distilled evidence.",
      componentGrammar: ["hero", "summary", "chart-panel", "callout", "recommendations"],
      allowedComponents: [
        "hero",
        "summary",
        "kpi-strip",
        "chart-panel",
        "callout",
        "recommendations",
      ],
      layoutRules: [
        "Use fewer blocks per page than any other preset.",
        "Make whitespace part of the hierarchy and avoid dense tables.",
      ],
      titleStyle: "Formal headline that already states the conclusion.",
      annotationStyle: "Measured, concise, strategic.",
      rendererHints: buildRendererHints("narrative-first", "airy"),
      promptHint: "Keep the pack formal, strategic, and visibly restrained.",
    },
  },
  {
    id: "web-dashboard",
    label: "Interactive Web Dashboard",
    objective: "inform",
    tone: "analytical",
    preferredFormats: ["html", "gas-project", "excel-plan"],
    promptHint:
      "Best for online KPI dashboards, lightweight Apps Script reporting, and filterable views.",
    designIntent: {
      styleName: "Interactive reporting canvas",
      audienceBehavior: "Modular, explorable, dashboard-first composition.",
      designTone: "Analytical, interactive, component-driven.",
      narrativeDensity: "balanced",
      pageRhythm: "summary strip -> filters -> chart modules -> detail table",
      summaryPlacement: "summary cards above interactive modules",
      chartPreference: "Modular charts with clear captions and drill-down logic.",
      componentGrammar: ["hero", "kpi-strip", "chart-panel", "table", "summary", "callout"],
      allowedComponents: [
        "hero",
        "summary",
        "kpi-strip",
        "chart-panel",
        "table",
        "narrative-panel",
        "callout",
        "recommendations",
      ],
      layoutRules: [
        "Reserve space for filters and modular cards when the web app format is requested.",
        "Prefer reusable panels over long narrative sections.",
      ],
      titleStyle: "Dashboard headline with clear monitoring context.",
      annotationStyle: "Short captions plus one-line insight support.",
      rendererHints: buildRendererHints("visual-first", "balanced"),
      promptHint: "Compose the report like a modular interactive dashboard.",
    },
  },
];

export function applyReportingPreset(request: ReportRequest, presetId: string): ReportRequest {
  const preset = REPORTING_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) {
    return request;
  }

  return {
    ...request,
    context: {
      ...request.context,
      objective: request.context.objective ?? preset.objective,
      tone: request.context.tone ?? preset.tone,
      preferredFormats:
        request.context.preferredFormats && request.context.preferredFormats.length > 0
          ? request.context.preferredFormats
          : preset.preferredFormats,
      prompt: request.context.prompt?.trim()
        ? request.context.prompt
        : `${preset.label}. ${preset.promptHint}`,
    },
    options: {
      ...request.options,
      designIntent: request.options?.designIntent ?? preset.designIntent,
    },
  };
}
