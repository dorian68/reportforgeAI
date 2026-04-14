import { canUseLlm, requestLlmJson } from "../../services/ai/llmClient";
import { normalizeCanvasDocument, normalizeCanvasPage } from "../../services/canvas/canvasGeometry";
import {
  CanvasBlockSpec,
  CanvasComponentKind,
  CanvasComponentPreset,
  CanvasDesignIntent,
  CanvasDocument,
  CanvasFormatTarget,
  CanvasLayoutMode,
  CanvasPageSpec,
  CanvasRendererHint,
  CanvasTheme,
  ComponentTree,
  LayoutPlan,
  ReportDesignSpec,
  ReportForgeBundle,
  VisualHierarchy,
} from "../../shared/types";
import {
  AnalyticalFinding,
  DatasetSemanticProfile,
  NormalizedReportRequest,
  ReportPlan,
  StorylineStep,
} from "../domain/types";

interface DesignAgentResult {
  designSpec: ReportDesignSpec;
  canvasDocument: CanvasDocument;
  usedLlm: boolean;
  warning?: string;
}

interface DesignAgentDependencies {
  requestLlmJson: typeof requestLlmJson;
}

interface DesignSpecPayload {
  styleName?: string;
  audienceBehavior?: string;
  designTone?: string;
  narrativeDensity?: ReportDesignSpec["narrativeDensity"];
  pageRhythm?: string;
  summaryPlacement?: string;
  chartPreference?: string;
  componentGrammar?: CanvasComponentKind[];
  allowedComponents?: CanvasComponentKind[];
  layoutRules?: string[];
  titleStyle?: string;
  annotationStyle?: string;
  rendererHints?: Partial<Record<CanvasFormatTarget, CanvasRendererHint>>;
  rationale?: string[];
  generatedBy?: ReportDesignSpec["generatedBy"];
  pages?: Array<{
    id?: string;
    label?: string;
    format?: CanvasFormatTarget;
    layoutMode?: CanvasLayoutMode;
    narrativeDensity?: ReportDesignSpec["narrativeDensity"];
    pageRhythm?: string;
    blocks?: Array<{
      id?: string;
      kind?: CanvasComponentKind;
      title?: string;
      body?: string;
      supportingText?: string;
      x?: number;
      y?: number;
      w?: number;
      h?: number;
      priority?: number;
      emphasis?: CanvasBlockSpec["emphasis"];
      chartId?: string;
      findingIds?: string[];
      metricIds?: string[];
      formatTargets?: CanvasFormatTarget[];
      styleToken?: string;
    }>;
  }>;
}

type DesignPagePayload = NonNullable<DesignSpecPayload["pages"]>[number];
type DesignBlockPayload = NonNullable<DesignPagePayload["blocks"]>[number];

const DEFAULT_RENDERER_HINTS: Partial<Record<CanvasFormatTarget, CanvasRendererHint>> = {
  canvas: { columns: 12, spacing: "balanced", emphasis: "narrative-first" },
  html: { columns: 12, spacing: "balanced", emphasis: "narrative-first" },
  pptx: { columns: 12, spacing: "balanced", emphasis: "kpi-first" },
  pdf: { columns: 12, spacing: "balanced", emphasis: "narrative-first" },
  "email-html": { columns: 8, spacing: "tight", emphasis: "narrative-first" },
  "gas-project": { columns: 12, spacing: "balanced", emphasis: "visual-first" },
  "excel-plan": { columns: 12, spacing: "tight", emphasis: "kpi-first" },
};

const DEFAULT_ALLOWED_COMPONENTS: CanvasComponentKind[] = [
  "hero",
  "summary",
  "kpi-strip",
  "chart-panel",
  "narrative-panel",
  "table",
  "recommendations",
  "callout",
  "email-summary",
];

const DESIGN_SYSTEM_PROMPT = `You are the design brain of an enterprise AI reporting engine.
Return one JSON object and nothing else.
You are responsible for visual composition, information hierarchy, layout rhythm, component choice, and design consistency.
You are designing reporting artifacts for banking, insurance, finance, and executive review users.
Rules:
- Output finished composition logic, not design instructions.
- Make the layout message-led and professional.
- Use the data findings and storyline to decide component ordering and prominence.
- Respect the target format(s), audience, and objective.
- Treat each requested format as a distinct composition problem, not the same layout repeated everywhere.
- For email-html, compose a compact executive-ready sequence with visible priorities, not a generic newsletter shell.
- For gas-project, compose a modular interactive reporting app with summary, filters, KPI zones, evidence modules, and drilldown space.
- Saved templates must preserve reusable design intent, not only visual skin.
- Keep the canvas grounded in a 12-column layout grid.
- Do not return placeholders like "use chart here" or "this slide exists to".
- Prefer concise, executive-ready or analyst-ready phrasing directly inside titles and body text.
- Random / variation mode must remain coherent and production-grade.
Schema:
{
  "styleName": "string",
  "audienceBehavior": "string",
  "designTone": "string",
  "narrativeDensity": "compact | balanced | dense",
  "pageRhythm": "string",
  "summaryPlacement": "string",
  "chartPreference": "string",
  "componentGrammar": ["hero"],
  "allowedComponents": ["hero"],
  "layoutRules": ["string"],
  "titleStyle": "string",
  "annotationStyle": "string",
  "rendererHints": {
    "html": { "columns": 12, "spacing": "balanced", "emphasis": "narrative-first" }
  },
  "rationale": ["string"],
  "pages": [
    {
      "id": "string",
      "label": "string",
      "format": "canvas | html | pptx | pdf | email-html | gas-project | excel-plan",
      "layoutMode": "structured | freeform",
      "narrativeDensity": "compact | balanced | dense",
      "pageRhythm": "string",
      "blocks": [
        {
          "id": "string",
          "kind": "hero | summary | kpi-strip | chart-panel | narrative-panel | table | recommendations | callout | email-summary",
          "title": "string",
          "body": "string",
          "supportingText": "string",
          "x": 1,
          "y": 1,
          "w": 12,
          "h": 3,
          "priority": 100,
          "emphasis": "high | medium | low",
          "chartId": "optional string",
          "findingIds": ["optional finding ids"],
          "metricIds": ["optional metric ids"],
          "formatTargets": ["html"],
          "styleToken": "optional string"
        }
      ]
    }
  ]
}`;

const DEFAULT_DEPENDENCIES: DesignAgentDependencies = {
  requestLlmJson,
};

function normalizeText(value: string | undefined, fallback = ""): string {
  return value?.trim() || fallback;
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(value ?? fallback), min), max);
}

function normalizeComponentList(
  value: CanvasComponentKind[] | undefined,
  fallback: CanvasComponentKind[]
): CanvasComponentKind[] {
  const nextValue = (value ?? []).filter((entry): entry is CanvasComponentKind =>
    DEFAULT_ALLOWED_COMPONENTS.includes(entry)
  );
  return nextValue.length > 0 ? Array.from(new Set(nextValue)) : fallback;
}

function normalizeRendererHints(
  value: DesignSpecPayload["rendererHints"] | undefined
): Partial<Record<CanvasFormatTarget, CanvasRendererHint>> {
  const nextValue: Partial<Record<CanvasFormatTarget, CanvasRendererHint>> = {};
  const entries = Object.entries(value ?? {}) as Array<[CanvasFormatTarget, CanvasRendererHint]>;

  entries.forEach(([format, hint]) => {
    nextValue[format] = {
      columns: clamp(hint?.columns, 6, 12, DEFAULT_RENDERER_HINTS[format]?.columns ?? 12),
      spacing:
        hint?.spacing === "tight" || hint?.spacing === "balanced" || hint?.spacing === "airy"
          ? hint.spacing
          : (DEFAULT_RENDERER_HINTS[format]?.spacing ?? "balanced"),
      emphasis:
        hint?.emphasis === "kpi-first" ||
        hint?.emphasis === "narrative-first" ||
        hint?.emphasis === "visual-first"
          ? hint.emphasis
          : (DEFAULT_RENDERER_HINTS[format]?.emphasis ?? "narrative-first"),
    };
  });

  return {
    ...DEFAULT_RENDERER_HINTS,
    ...nextValue,
  };
}

function createBlock(
  id: string,
  kind: CanvasComponentKind,
  title: string,
  body: string,
  options: Partial<CanvasBlockSpec> = {}
): CanvasBlockSpec {
  return {
    id,
    kind,
    title,
    body,
    supportingText: options.supportingText,
    x: options.x ?? 1,
    y: options.y ?? 1,
    w: options.w ?? 12,
    h: options.h ?? 2,
    priority: options.priority ?? 50,
    emphasis: options.emphasis ?? "medium",
    chartId: options.chartId,
    findingIds: options.findingIds,
    metricIds: options.metricIds,
    formatTargets: options.formatTargets,
    styleToken: options.styleToken,
  };
}

function buildDefaultIntent(
  request: NormalizedReportRequest,
  semanticProfile: DatasetSemanticProfile
): CanvasDesignIntent {
  return {
    styleName:
      semanticProfile.enterpriseLens === "finance" || request.audience === "cfo"
        ? "Finance executive canvas"
        : request.audience === "client"
          ? "Client decision canvas"
          : "Enterprise reporting canvas",
    audienceBehavior:
      request.audience === "cfo"
        ? "Restrained, high-signal, finance-led hierarchy."
        : request.audience === "client"
          ? "Persuasive, polished, recommendation-first hierarchy."
          : "Balanced enterprise reporting hierarchy with visible evidence.",
    designTone:
      request.tone === "analytical"
        ? "Analytical, evidence-heavy, structured."
        : request.tone === "consultative"
          ? "Consultative, polished, client-ready."
          : "Executive, concise, controlled.",
    narrativeDensity: request.tone === "analytical" ? "dense" : "balanced",
    pageRhythm:
      request.audience === "cfo"
        ? "alert -> drivers -> concentration -> action"
        : request.audience === "client"
          ? "decision headline -> proof -> implication -> recommendation"
          : "headline -> scorecard -> evidence -> next step",
    summaryPlacement: "opening fold before secondary evidence",
    chartPreference:
      semanticProfile.timeDimension != null
        ? "Trend and variance visuals with supporting KPI blocks."
        : "Ranked comparisons, scorecards, and concentration views rather than weak trends.",
    componentGrammar: ["hero", "kpi-strip", "chart-panel", "narrative-panel", "recommendations"],
    allowedComponents: DEFAULT_ALLOWED_COMPONENTS,
    layoutRules: [
      "Keep the first fold message-led and data-grounded.",
      "Do not overload a page with more than one primary visual.",
    ],
    titleStyle: "Message-led business headline with concise subtitle.",
    annotationStyle: "Short analytical captions tied to the evidence.",
    rendererHints: DEFAULT_RENDERER_HINTS,
    promptHint:
      request.mode === "variation"
        ? "Use the variation seed to explore a distinct but professional composition."
        : "Keep the composition audience-aware and production-ready.",
  };
}

function blockKindForStoryPage(page: ReportPlan["storyPages"][number]): CanvasBlockSpec["kind"] {
  if (page.purpose === "executive-summary") {
    return "hero";
  }

  if (page.purpose === "recommendation") {
    return "recommendations";
  }

  if (page.visualKind === "kpi-strip" || page.purpose === "kpi-scorecard") {
    return "kpi-strip";
  }

  if (page.visualKind === "table" || page.purpose === "methodology") {
    return "table";
  }

  if (page.chartId) {
    return "chart-panel";
  }

  return "narrative-panel";
}

function resolveMetricIds(bundle: ReportForgeBundle, metricLabels: string[]): string[] {
  return bundle.plan.excel.kpis
    .filter((kpi) => metricLabels.includes(kpi.label))
    .map((kpi) => kpi.id);
}

function createStoryBlock(
  bundle: ReportForgeBundle,
  page: ReportPlan["storyPages"][number],
  format: CanvasFormatTarget,
  options: Partial<CanvasBlockSpec>
): CanvasBlockSpec {
  return createBlock(
    page.id,
    blockKindForStoryPage(page),
    page.title,
    page.subtitle || page.narrativeAngle,
    {
      ...options,
      chartId: page.chartId,
      metricIds: resolveMetricIds(bundle, page.metricLabels),
      styleToken: page.layoutFamily,
      supportingText: page.implication ?? page.recommendation ?? page.visualRationale,
      formatTargets: [format],
    }
  );
}

function buildDeterministicPages(
  bundle: ReportForgeBundle,
  request: NormalizedReportRequest,
  reportPlan: ReportPlan,
  findings: AnalyticalFinding[],
  storyline: StorylineStep[]
): CanvasPageSpec[] {
  const topKpis = bundle.plan.excel.kpis.slice(0, 4);
  const storyPages = reportPlan.storyPages;
  const summaryPage = storyPages[0];
  const evidencePages = storyPages.filter(
    (page) => page.purpose !== "executive-summary" && page.purpose !== "recommendation"
  );
  const recommendationPage =
    storyPages.find((page) => page.purpose === "recommendation") ??
    storyPages[storyPages.length - 1];
  const pages: CanvasPageSpec[] = [
    {
      id: "canvas-overview",
      label: "Canvas Overview",
      format: "canvas",
      layoutMode: request.canvasDocument?.layoutMode ?? "freeform",
      narrativeDensity: request.designIntent?.narrativeDensity ?? "balanced",
      pageRhythm: request.designIntent?.pageRhythm ?? "headline -> proof -> action",
      blocks: [
        createBlock(
          "hero-message",
          "hero",
          summaryPage?.title ?? reportPlan.title,
          summaryPage?.subtitle ?? reportPlan.primaryMessage,
          {
            supportingText: reportPlan.subtitle,
            x: 1,
            y: 1,
            w: 8,
            h: 3,
            priority: 100,
            emphasis: "high",
            metricIds: resolveMetricIds(bundle, summaryPage?.metricLabels ?? []),
            styleToken: "hero",
          }
        ),
        createBlock(
          "summary-callout",
          "callout",
          "Bottom line",
          summaryPage?.implication ?? findings[0]?.implication ?? reportPlan.confidenceStatement,
          {
            x: 9,
            y: 1,
            w: 4,
            h: 3,
            priority: 95,
            emphasis: "high",
            styleToken: "callout",
          }
        ),
        createBlock(
          "kpi-strip",
          "kpi-strip",
          "Scorecard",
          topKpis.map((kpi) => `${kpi.label}: ${kpi.formattedValue}`).join(" • "),
          {
            supportingText: topKpis.map((kpi) => kpi.insight).join(" "),
            x: 1,
            y: 4,
            w: 12,
            h: 2,
            priority: 90,
            emphasis: "high",
            metricIds: topKpis.map((kpi) => kpi.id),
            styleToken: "scorecard",
          }
        ),
        ...evidencePages.slice(0, 2).map((page, index) =>
          createStoryBlock(bundle, page, "canvas", {
            x: index === 0 ? 1 : 7,
            y: 6,
            w: 6,
            h: 3,
            priority: 85 - index * 5,
            emphasis: index === 0 ? "high" : "medium",
          })
        ),
        createStoryBlock(bundle, recommendationPage, "canvas", {
          x: 1,
          y: 9,
          w: 12,
          h: 2,
          priority: 72,
          emphasis: "medium",
        }),
      ],
    },
    {
      id: "html-report",
      label: "HTML Report Composition",
      format: "html",
      layoutMode: "structured",
      narrativeDensity: request.designIntent?.narrativeDensity ?? "balanced",
      pageRhythm: request.designIntent?.pageRhythm ?? "hero -> evidence -> action",
      blocks: [
        createBlock("html-hero", "hero", reportPlan.title, reportPlan.primaryMessage, {
          supportingText: reportPlan.subtitle,
          x: 1,
          y: 1,
          w: 12,
          h: 3,
          priority: 100,
          emphasis: "high",
          styleToken: "hero",
        }),
        createBlock(
          "html-kpis",
          "kpi-strip",
          "Headline KPIs",
          topKpis.map((kpi) => `${kpi.label}: ${kpi.formattedValue}`).join(" • "),
          {
            x: 1,
            y: 4,
            w: 12,
            h: 2,
            priority: 88,
            emphasis: "medium",
            metricIds: topKpis.map((kpi) => kpi.id),
          }
        ),
        ...evidencePages.slice(0, 3).map((page, index) =>
          createStoryBlock(bundle, page, "html", {
            x: index % 2 === 0 ? 1 : 7,
            y: 6 + Math.floor(index / 2) * 3,
            w: 6,
            h: 3,
            priority: 82 - index * 4,
            emphasis: index === 0 ? "high" : "medium",
          })
        ),
        createStoryBlock(bundle, recommendationPage, "html", {
          x: 1,
          y: 12,
          w: 12,
          h: 2,
          priority: 70,
          emphasis: "medium",
        }),
      ],
    },
    {
      id: "slides-layout",
      label: "Deck Composition",
      format: "pptx",
      layoutMode: "structured",
      narrativeDensity: request.audience === "cfo" ? "compact" : "balanced",
      pageRhythm: "message slide -> evidence slide -> action slide",
      blocks: [
        createBlock(
          "slide-opening",
          "hero",
          summaryPage?.title ?? storyline[0]?.title ?? reportPlan.title,
          summaryPage?.subtitle ?? storyline[0]?.message ?? reportPlan.primaryMessage,
          {
            x: 1,
            y: 1,
            w: 8,
            h: 3,
            priority: 100,
            emphasis: "high",
            metricIds: resolveMetricIds(bundle, summaryPage?.metricLabels ?? []),
          }
        ),
        createBlock("slide-kpi", "kpi-strip", "Opening evidence", topKpis[0]?.insight ?? "", {
          x: 9,
          y: 1,
          w: 4,
          h: 3,
          priority: 90,
          emphasis: "medium",
          metricIds: topKpis.slice(0, 2).map((kpi) => kpi.id),
        }),
        createStoryBlock(bundle, evidencePages[0] ?? summaryPage, "pptx", {
          x: 1,
          y: 4,
          w: 6,
          h: 3,
          priority: 82,
          emphasis: "high",
        }),
        createStoryBlock(bundle, recommendationPage, "pptx", {
          x: 7,
          y: 4,
          w: 6,
          h: 3,
          priority: 80,
          emphasis: "medium",
        }),
      ],
    },
  ];

  if (request.preferredFormats.includes("email-html")) {
    pages.push({
      id: "email-composition",
      label: "Email Composition",
      format: "email-html",
      layoutMode: "structured",
      narrativeDensity: "compact",
      pageRhythm: "headline -> bullets -> action",
      blocks: [
        createBlock(
          "email-summary",
          "email-summary",
          bundle.emailBundle.primary.subject,
          bundle.emailBundle.primary.plainText.split("\n").slice(0, 4).join(" "),
          {
            x: 1,
            y: 1,
            w: 8,
            h: 3,
            priority: 100,
            emphasis: "high",
          }
        ),
        createBlock(
          "email-callout",
          "callout",
          "Email priority",
          findings[0]?.implication ?? reportPlan.primaryMessage,
          {
            x: 9,
            y: 1,
            w: 4,
            h: 3,
            priority: 90,
            emphasis: "medium",
          }
        ),
      ],
    });
  }

  if (request.preferredFormats.includes("gas-project")) {
    pages.push({
      id: "webapp-composition",
      label: "Interactive Reporting App",
      format: "gas-project",
      layoutMode: "structured",
      narrativeDensity: "balanced",
      pageRhythm: "hero -> KPI ribbon -> story modules -> action -> table",
      blocks: [
        createBlock("webapp-hero", "hero", reportPlan.title, reportPlan.primaryMessage, {
          x: 1,
          y: 1,
          w: 12,
          h: 2,
          priority: 100,
          emphasis: "high",
        }),
        createBlock(
          "webapp-scorecard",
          "kpi-strip",
          "Dashboard scorecard",
          topKpis.map((kpi) => `${kpi.label}: ${kpi.formattedValue}`).join(" • "),
          {
            x: 1,
            y: 3,
            w: 12,
            h: 2,
            priority: 90,
            emphasis: "high",
            metricIds: topKpis.map((kpi) => kpi.id),
          }
        ),
        ...evidencePages.slice(0, 3).map((page, index) =>
          createStoryBlock(bundle, page, "gas-project", {
            x: index % 2 === 0 ? 1 : 7,
            y: 5 + Math.floor(index / 2) * 3,
            w: 6,
            h: 3,
            priority: 82 - index * 4,
            emphasis: index === 0 ? "high" : "medium",
          })
        ),
        createStoryBlock(bundle, recommendationPage, "gas-project", {
          x: 1,
          y: 11,
          w: 12,
          h: 2,
          priority: 74,
          emphasis: "medium",
        }),
        createBlock(
          "webapp-table",
          "table",
          "Supporting table",
          "Keep a tabular zone available for drilldown and filterable evidence.",
          {
            x: 1,
            y: 13,
            w: 12,
            h: 3,
            priority: 78,
            emphasis: "low",
          }
        ),
      ],
    });
  }

  return pages;
}

function applyIntentOverrides(
  designSpec: ReportDesignSpec,
  intent: CanvasDesignIntent | undefined
): ReportDesignSpec {
  if (!intent) {
    return designSpec;
  }

  return {
    ...designSpec,
    styleName: intent.styleName || designSpec.styleName,
    audienceBehavior: intent.audienceBehavior || designSpec.audienceBehavior,
    designTone: intent.designTone || designSpec.designTone,
    narrativeDensity: intent.narrativeDensity || designSpec.narrativeDensity,
    pageRhythm: intent.pageRhythm || designSpec.pageRhythm,
    summaryPlacement: intent.summaryPlacement || designSpec.summaryPlacement,
    chartPreference: intent.chartPreference || designSpec.chartPreference,
    componentGrammar: normalizeComponentList(intent.componentGrammar, designSpec.componentGrammar),
    allowedComponents: normalizeComponentList(
      intent.allowedComponents,
      designSpec.allowedComponents
    ),
    layoutRules: intent.layoutRules?.length ? intent.layoutRules : designSpec.layoutRules,
    titleStyle: intent.titleStyle || designSpec.titleStyle,
    annotationStyle: intent.annotationStyle || designSpec.annotationStyle,
    rendererHints: {
      ...designSpec.rendererHints,
      ...(intent.rendererHints ?? {}),
    },
  };
}

function sanitizeBlockPayload(
  block: DesignBlockPayload,
  fallback: CanvasBlockSpec
): CanvasBlockSpec {
  return {
    id: normalizeText(block?.id, fallback.id),
    kind: DEFAULT_ALLOWED_COMPONENTS.includes(block?.kind as CanvasComponentKind)
      ? (block?.kind as CanvasComponentKind)
      : fallback.kind,
    title: normalizeText(block?.title, fallback.title),
    body: normalizeText(block?.body, fallback.body),
    supportingText: normalizeText(block?.supportingText, fallback.supportingText ?? ""),
    x: clamp(block?.x, 1, 12, fallback.x),
    y: clamp(block?.y, 1, 24, fallback.y),
    w: clamp(block?.w, 2, 12, fallback.w),
    h: clamp(block?.h, 1, 8, fallback.h),
    priority: clamp(block?.priority, 1, 100, fallback.priority),
    emphasis:
      block?.emphasis === "high" || block?.emphasis === "medium" || block?.emphasis === "low"
        ? block.emphasis
        : fallback.emphasis,
    chartId: normalizeText(block?.chartId, fallback.chartId ?? ""),
    findingIds: (block?.findingIds ?? fallback.findingIds ?? []).filter(Boolean),
    metricIds: (block?.metricIds ?? fallback.metricIds ?? []).filter(Boolean),
    formatTargets: (block?.formatTargets ?? fallback.formatTargets ?? []).filter(Boolean),
    styleToken: normalizeText(block?.styleToken, fallback.styleToken ?? ""),
  };
}

function sanitizePagePayload(page: DesignPagePayload, fallback: CanvasPageSpec): CanvasPageSpec {
  const fallbackBlocks = fallback.blocks;
  const nextBlocks = (page?.blocks ?? []).map((block, index) =>
    sanitizeBlockPayload(block, fallbackBlocks[index] ?? fallbackBlocks[fallbackBlocks.length - 1])
  );

  return {
    id: normalizeText(page?.id, fallback.id),
    label: normalizeText(page?.label, fallback.label),
    format:
      page?.format &&
      ["canvas", "html", "pptx", "pdf", "email-html", "gas-project", "excel-plan"].includes(
        page.format
      )
        ? page.format
        : fallback.format,
    layoutMode:
      page?.layoutMode === "freeform" || page?.layoutMode === "structured"
        ? page.layoutMode
        : fallback.layoutMode,
    narrativeDensity:
      page?.narrativeDensity === "compact" ||
      page?.narrativeDensity === "balanced" ||
      page?.narrativeDensity === "dense"
        ? page.narrativeDensity
        : fallback.narrativeDensity,
    pageRhythm: normalizeText(page?.pageRhythm, fallback.pageRhythm),
    blocks: nextBlocks.length > 0 ? nextBlocks : fallbackBlocks,
  };
}

function sanitizeDesignSpec(
  payload: DesignSpecPayload,
  fallback: ReportDesignSpec
): ReportDesignSpec {
  const fallbackPages = fallback.pages;
  const nextPages = (payload.pages ?? []).map((page, index) =>
    sanitizePagePayload(page, fallbackPages[index] ?? fallbackPages[fallbackPages.length - 1])
  );
  const mergedPages = nextPages.length > 0 ? nextPages : fallbackPages.slice();
  const knownFormats = new Set(mergedPages.map((page) => page.format));

  fallbackPages.forEach((page) => {
    if (!knownFormats.has(page.format)) {
      mergedPages.push(page);
    }
  });

  const rationale = (payload.rationale ?? [])
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .slice(0, 8);

  const nextSpec = {
    ...fallback,
    styleName: normalizeText(payload.styleName, fallback.styleName),
    audienceBehavior: normalizeText(payload.audienceBehavior, fallback.audienceBehavior),
    designTone: normalizeText(payload.designTone, fallback.designTone),
    narrativeDensity:
      payload.narrativeDensity === "compact" ||
      payload.narrativeDensity === "balanced" ||
      payload.narrativeDensity === "dense"
        ? payload.narrativeDensity
        : fallback.narrativeDensity,
    pageRhythm: normalizeText(payload.pageRhythm, fallback.pageRhythm),
    summaryPlacement: normalizeText(payload.summaryPlacement, fallback.summaryPlacement),
    chartPreference: normalizeText(payload.chartPreference, fallback.chartPreference),
    componentGrammar: normalizeComponentList(payload.componentGrammar, fallback.componentGrammar),
    allowedComponents: normalizeComponentList(
      payload.allowedComponents,
      fallback.allowedComponents
    ),
    layoutRules:
      (payload.layoutRules ?? [])
        .map((rule) => normalizeText(rule))
        .filter(Boolean)
        .slice(0, 8) || fallback.layoutRules,
    titleStyle: normalizeText(payload.titleStyle, fallback.titleStyle),
    annotationStyle: normalizeText(payload.annotationStyle, fallback.annotationStyle),
    rendererHints: normalizeRendererHints(payload.rendererHints),
    rationale: rationale.length > 0 ? rationale : fallback.rationale,
    generatedBy:
      payload.generatedBy === "llm" || payload.generatedBy === "hybrid"
        ? payload.generatedBy
        : fallback.generatedBy,
    pages: mergedPages,
  };
  return {
    ...nextSpec,
    theme: fallback.theme,
    componentPresets: fallback.componentPresets,
    qualityConstraints: fallback.qualityConstraints,
    layoutPlan: buildLayoutPlan(nextSpec.pages, nextSpec.summaryPlacement),
    componentTree: buildComponentTree(nextSpec.pages),
    visualHierarchy: buildVisualHierarchy(nextSpec.pages),
  };
}

function hydrateCanvasBlocks(
  existingBlocks: CanvasBlockSpec[],
  generatedBlocks: CanvasBlockSpec[]
): CanvasBlockSpec[] {
  const generatedByKind = new Map<CanvasComponentKind, CanvasBlockSpec[]>();
  generatedBlocks.forEach((block) => {
    const next = generatedByKind.get(block.kind) ?? [];
    next.push(block);
    generatedByKind.set(block.kind, next);
  });

  const hydrated: CanvasBlockSpec[] = existingBlocks.map((block, index) => {
    const matching = generatedByKind.get(block.kind) ?? [];
    const candidate = matching.shift() ?? generatedBlocks[index] ?? block;
    generatedByKind.set(block.kind, matching);
    return {
      ...block,
      title: candidate.title,
      body: candidate.body,
      supportingText: candidate.supportingText,
      chartId: candidate.chartId,
      findingIds: candidate.findingIds,
      metricIds: candidate.metricIds,
      formatTargets: candidate.formatTargets,
      styleToken: block.styleToken || candidate.styleToken,
    };
  });

  const existingIds = new Set(existingBlocks.map((block) => block.id));
  generatedBlocks.forEach((block) => {
    if (!existingIds.has(block.id)) {
      hydrated.push(block);
    }
  });

  return hydrated;
}

function buildCanvasDocument(
  designSpec: ReportDesignSpec,
  existingDocument: CanvasDocument | undefined
): CanvasDocument {
  const defaultPages = designSpec.pages.filter(
    (page) => page.format === "canvas" || page.format === "html"
  );

  if (!existingDocument || existingDocument.pages.length === 0) {
    return normalizeCanvasDocument({
      version: 1,
      layoutMode: defaultPages.some((page) => page.layoutMode === "freeform")
        ? "freeform"
        : "structured",
      designSpecId: designSpec.id,
      theme: designSpec.theme,
      componentPresets: designSpec.componentPresets,
      pages: defaultPages.map((page) => normalizeCanvasPage(page)),
      updatedAt: new Date().toISOString(),
    });
  }

  return normalizeCanvasDocument({
    version: existingDocument.version || 1,
    layoutMode: existingDocument.layoutMode,
    designSpecId: designSpec.id,
    theme: designSpec.theme ?? existingDocument.theme,
    componentPresets: designSpec.componentPresets ?? existingDocument.componentPresets,
    pages: existingDocument.pages.map((page, index) => {
      const generatedPage =
        designSpec.pages.find((candidate) => candidate.id === page.id) ??
        designSpec.pages.find((candidate) => candidate.format === page.format) ??
        defaultPages[index] ??
        page;

      return {
        ...page,
        label: page.label || generatedPage.label,
        format: page.format || generatedPage.format,
        narrativeDensity: page.narrativeDensity || generatedPage.narrativeDensity,
        pageRhythm: page.pageRhythm || generatedPage.pageRhythm,
        canvasWidth: page.canvasWidth ?? generatedPage.canvasWidth,
        canvasHeight: page.canvasHeight ?? generatedPage.canvasHeight,
        gridColumns: page.gridColumns ?? generatedPage.gridColumns,
        gridUnitHeight: page.gridUnitHeight ?? generatedPage.gridUnitHeight,
        blocks: hydrateCanvasBlocks(page.blocks, generatedPage.blocks),
      };
    }),
    updatedAt: new Date().toISOString(),
  });
}

function buildLayoutPlan(pages: CanvasPageSpec[], summaryPlacement: string): LayoutPlan {
  return {
    pages: pages.map((page) => {
      const orderedBlocks = [...page.blocks].sort((left, right) => right.priority - left.priority);
      return {
        pageId: page.id,
        format: page.format,
        summaryPlacement,
        density: page.narrativeDensity,
        primaryBlockIds: orderedBlocks
          .filter((block) => block.emphasis === "high")
          .slice(0, 3)
          .map((block) => block.id),
        supportingBlockIds: orderedBlocks
          .filter((block) => block.emphasis !== "high")
          .slice(0, 6)
          .map((block) => block.id),
      };
    }),
    globalRules: pages.flatMap((page) => [
      `${page.label}: ${page.pageRhythm}`,
      `${page.label}: ${page.narrativeDensity} density`,
    ]),
  };
}

function buildComponentTree(pages: CanvasPageSpec[]): ComponentTree {
  const nodes = Object.fromEntries(
    pages.flatMap((page) =>
      page.blocks.map((block) => [
        `${page.id}:${block.id}`,
        {
          id: `${page.id}:${block.id}`,
          pageId: page.id,
          blockId: block.id,
          kind: block.kind,
          priority: block.priority,
          children: [],
        },
      ])
    )
  );

  return {
    rootIds: Object.keys(nodes),
    nodes,
  };
}

function buildVisualHierarchy(pages: CanvasPageSpec[]): VisualHierarchy {
  return {
    pageIds: pages.map((page) => page.id),
    items: pages.flatMap((page) =>
      [...page.blocks]
        .sort((left, right) => right.priority - left.priority)
        .map((block, index) => ({
          pageId: page.id,
          blockId: block.id,
          prominence: block.emphasis === "high" ? "primary" : index <= 2 ? "secondary" : "support",
          reason:
            block.emphasis === "high"
              ? "This block anchors the page message."
              : "This block supports the page with evidence or detail.",
        }))
    ),
  };
}

function buildTheme(
  bundle: ReportForgeBundle,
  designSpec: Pick<ReportDesignSpec, "styleName" | "designTone">
): CanvasTheme {
  return {
    id: `${designSpec.styleName.toLowerCase().replace(/\s+/g, "-")}-theme`,
    name: `${designSpec.styleName} theme`,
    brandingTokens: {
      designTone: designSpec.designTone,
    },
    styleTokens: [
      { id: "accent", label: "Accent", kind: "color", value: bundle.plan.excel.theme.accent },
      { id: "surface", label: "Surface", kind: "color", value: bundle.plan.excel.theme.surface },
      { id: "border", label: "Border", kind: "color", value: bundle.plan.excel.theme.border },
      { id: "ink", label: "Ink", kind: "color", value: bundle.plan.excel.theme.ink },
      { id: "spacing", label: "Spacing", kind: "spacing", value: "16" },
      { id: "radius", label: "Radius", kind: "radius", value: "18" },
    ],
  };
}

function buildComponentPresets(allowedComponents: CanvasComponentKind[]): CanvasComponentPreset[] {
  return allowedComponents.map((kind) => ({
    id: `preset-${kind}`,
    kind,
    label: kind.replace("-", " "),
    description: `Reusable ${kind} block for AI-composed reporting artifacts.`,
    defaultFrame: {
      x: 120,
      y: 120,
      width: kind === "hero" ? 640 : 360,
      height: kind === "table" ? 220 : 180,
    },
    defaultFormats: ["canvas", "html", "pptx", "pdf"],
  }));
}

function buildDeterministicDesignSpec(
  bundle: ReportForgeBundle,
  request: NormalizedReportRequest,
  reportPlan: ReportPlan,
  semanticProfile: DatasetSemanticProfile,
  findings: AnalyticalFinding[],
  storyline: StorylineStep[]
): ReportDesignSpec {
  const baseIntent = buildDefaultIntent(request, semanticProfile);
  const pages = buildDeterministicPages(bundle, request, reportPlan, findings, storyline);
  const baseSpec = applyIntentOverrides(
    {
      id: `${request.requestId}-design`,
      ...baseIntent,
      pages,
      rationale: [
        `The layout is tuned for ${request.audience} with ${request.tone} language.`,
        `The composition favors ${baseIntent.chartPreference.toLowerCase()}`,
      ],
      qualityConstraints: [
        "Do not leak authoring or renderer instructions into visible content.",
        "Keep the layout legible for executive and client review contexts.",
        "Avoid duplicate evidence modules unless the page is an appendix.",
      ],
      variationSeed: request.variationSeed,
      generatedBy: "deterministic",
      sourcePrompt: request.promptText,
    },
    request.designIntent
  );
  return {
    ...baseSpec,
    theme: buildTheme(bundle, baseSpec),
    componentPresets: buildComponentPresets(baseSpec.allowedComponents),
    layoutPlan: buildLayoutPlan(baseSpec.pages, baseSpec.summaryPlacement),
    componentTree: buildComponentTree(baseSpec.pages),
    visualHierarchy: buildVisualHierarchy(baseSpec.pages),
  };
}

export function designIntentFromSpec(spec: ReportDesignSpec): CanvasDesignIntent {
  return {
    styleName: spec.styleName,
    audienceBehavior: spec.audienceBehavior,
    designTone: spec.designTone,
    narrativeDensity: spec.narrativeDensity,
    pageRhythm: spec.pageRhythm,
    summaryPlacement: spec.summaryPlacement,
    chartPreference: spec.chartPreference,
    componentGrammar: spec.componentGrammar,
    allowedComponents: spec.allowedComponents,
    layoutRules: spec.layoutRules,
    titleStyle: spec.titleStyle,
    annotationStyle: spec.annotationStyle,
    rendererHints: spec.rendererHints,
    promptHint: spec.sourcePrompt,
  };
}

export async function runDesignAgent(
  bundle: ReportForgeBundle,
  request: NormalizedReportRequest,
  reportPlan: ReportPlan,
  semanticProfile: DatasetSemanticProfile,
  analyticalFindings: AnalyticalFinding[],
  storyline: StorylineStep[],
  dependencies: DesignAgentDependencies = DEFAULT_DEPENDENCIES
): Promise<DesignAgentResult> {
  const fallbackDesign = buildDeterministicDesignSpec(
    bundle,
    request,
    reportPlan,
    semanticProfile,
    analyticalFindings,
    storyline
  );
  const fallbackDocument = buildCanvasDocument(fallbackDesign, request.canvasDocument);

  if (
    !request.enableLlm ||
    !request.llmConfig ||
    !canUseLlm(request.llmConfig, request.llmSecret ?? null)
  ) {
    return {
      designSpec: fallbackDesign,
      canvasDocument: fallbackDocument,
      usedLlm: false,
    };
  }

  try {
    const payload = await dependencies.requestLlmJson<DesignSpecPayload>(
      request.llmConfig,
      request.llmSecret ?? null,
      DESIGN_SYSTEM_PROMPT,
      {
        brief: request.promptText,
        businessContext: request.businessContext,
        audience: request.audience,
        objective: request.objective,
        tone: request.tone,
        preferredFormats: request.preferredFormats,
        maxSlides: request.maxSlides,
        mode: request.mode,
        variationSeed: request.variationSeed,
        semanticProfile,
        topKpis: bundle.plan.excel.kpis.slice(0, 4),
        charts: bundle.plan.excel.charts.slice(0, 4).map((chart) => ({
          id: chart.id,
          title: chart.title,
          kind: chart.kind,
          insight: chart.insight,
        })),
        storyline,
        analyticalFindings: analyticalFindings.slice(0, 6),
        currentDesignIntent: request.designIntent ?? request.designSpec ?? null,
        currentCanvasDocument: request.canvasDocument
          ? {
              layoutMode: request.canvasDocument.layoutMode,
              pages: request.canvasDocument.pages.map((page) => ({
                id: page.id,
                label: page.label,
                format: page.format,
                layoutMode: page.layoutMode,
                canvasWidth: page.canvasWidth,
                canvasHeight: page.canvasHeight,
                blocks: page.blocks.map((block) => ({
                  id: block.id,
                  kind: block.kind,
                  x: block.x,
                  y: block.y,
                  w: block.w,
                  h: block.h,
                  frame: block.frame,
                  styleToken: block.styleToken,
                })),
              })),
            }
          : null,
      }
    );

    const nextDesign = applyIntentOverrides(
      sanitizeDesignSpec(
        {
          ...payload,
          generatedBy: "hybrid",
        },
        fallbackDesign
      ),
      request.designIntent
    );
    const nextDocument = buildCanvasDocument(nextDesign, request.canvasDocument);

    return {
      designSpec: {
        ...nextDesign,
        generatedBy: "hybrid",
      },
      canvasDocument: nextDocument,
      usedLlm: true,
    };
  } catch (error) {
    const warning =
      error instanceof Error
        ? `${error.message} Falling back to the deterministic design engine for this run.`
        : "AI design generation failed. Falling back to the deterministic design engine for this run.";

    return {
      designSpec: fallbackDesign,
      canvasDocument: fallbackDocument,
      usedLlm: false,
      warning,
    };
  }
}
