/* eslint-disable no-undef */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

import {
  CanvasBlockFrame,
  CanvasBlockSpec,
  CanvasDocument,
  CanvasPageSpec,
  GeneratedSlidesBundle,
  ReportForgeBundle,
  ReportTheme,
  ReportDesignSpec,
  SlideOutline,
  SlideVisualSpec,
  SlideTemplateDefinition,
} from "../../shared/types";
import { normalizeCanvasDocument, normalizeCanvasPage } from "../canvas/canvasGeometry";
import { getRenderableCanvasBlocks } from "../canvas/canvasStudio";
import { ReportPlan as EngineReportPlan } from "../../reporting-engine/domain/types";

interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

interface ParagraphOptions {
  x: number;
  y: number;
  width: number;
  font: PDFFont;
  fontSize: number;
  color: ReturnType<typeof rgb>;
  lineHeight: number;
}

const POWERPOINT_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

interface PowerPointFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PdfFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasDeckComposition {
  canvasDocument: CanvasDocument;
  designSpec: ReportDesignSpec;
  bundle: ReportForgeBundle;
  reportPlan: EngineReportPlan;
}

interface PowerPointSlideApi {
  background?: { color: string };
  addShape: (...args: unknown[]) => void;
  addText: (...args: unknown[]) => void;
  addNotes?: (...args: unknown[]) => void;
}

interface PowerPointDeckApi {
  layout: string;
  author: string;
  company: string;
  subject: string;
  title: string;
  ShapeType: Record<string, string>;
  ChartType: Record<string, string>;
  addSlide: () => PowerPointSlideApi;
  write: (options: {
    outputType: "arraybuffer";
  }) => Promise<Blob | ArrayBuffer | Uint8Array | string>;
}

type PptxLoaderGlobalScope = typeof globalThis & {
  PptxGenJS?: unknown;
  __reportForgePptxBundlePromise?: Promise<void>;
};

let pptxGeneratorPromise: Promise<new () => PowerPointDeckApi> | null = null;
const PPTX_BROWSER_BUNDLE_PATH = "assets/pptxgen.browser.js";

function unwrapModuleDefault(moduleImport: unknown): unknown {
  if (!moduleImport || typeof moduleImport !== "object") {
    return moduleImport;
  }

  if ("default" in moduleImport) {
    const defaultExport = (moduleImport as { default?: unknown }).default;
    return defaultExport ?? moduleImport;
  }

  return moduleImport;
}

async function loadPptxGenerator(): Promise<new () => PowerPointDeckApi> {
  if (!pptxGeneratorPromise) {
    pptxGeneratorPromise = (async () => {
      const globalScope = globalThis as PptxLoaderGlobalScope;
      const existingGenerator = unwrapModuleDefault(globalScope.PptxGenJS);
      if (typeof existingGenerator === "function") {
        return existingGenerator as new () => PowerPointDeckApi;
      }

      if (typeof window !== "undefined" && typeof document !== "undefined") {
        await loadBrowserPptxBundle(globalScope);
      } else {
        throw new Error("PowerPoint generation tools are unavailable in this runtime.");
      }

      const candidate = unwrapModuleDefault(globalScope.PptxGenJS);

      if (typeof candidate !== "function") {
        throw new Error("PowerPoint generation tools could not initialize in this Excel runtime.");
      }

      return candidate as new () => PowerPointDeckApi;
    })().catch((error) => {
      pptxGeneratorPromise = null;
      throw error;
    });
  }

  return pptxGeneratorPromise;
}

async function loadBrowserPptxBundle(globalScope: PptxLoaderGlobalScope): Promise<void> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  if (!globalScope.__reportForgePptxBundlePromise) {
    globalScope.__reportForgePptxBundlePromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-reportforge-pptx-bundle="true"]'
      );
      if (existingScript) {
        if (typeof unwrapModuleDefault(globalScope.PptxGenJS) === "function") {
          resolve();
          return;
        }

        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("PowerPoint export bundle could not load in this Excel runtime.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.dataset.reportforgePptxBundle = "true";
      script.src = new URL(PPTX_BROWSER_BUNDLE_PATH, window.location.href).toString();
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("PowerPoint export bundle could not load in this Excel runtime."));

      (document.head ?? document.body ?? document.documentElement).appendChild(script);
    }).catch((error) => {
      globalScope.__reportForgePptxBundlePromise = undefined;
      throw error;
    });
  }

  await globalScope.__reportForgePptxBundlePromise;
}

function resolveFontFace(fontFamily: string, fallback: string): string {
  const firstFace = fontFamily.split(",")[0]?.replace(/['"]/g, "").trim();
  return firstFace || fallback;
}

function mixHex(hex: string, ratioToWhite: number): string {
  const safeRatio = Math.min(Math.max(ratioToWhite, 0), 1);
  const stripped = stripHash(hex);
  const red = parseInt(stripped.slice(0, 2), 16);
  const green = parseInt(stripped.slice(2, 4), 16);
  const blue = parseInt(stripped.slice(4, 6), 16);
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * safeRatio)
      .toString(16)
      .padStart(2, "0");

  return `${mix(red)}${mix(green)}${mix(blue)}`.toUpperCase();
}

function resolvePowerPointFrames(layout: SlideTemplateDefinition["contentLayout"]): {
  key: PowerPointFrame;
  visual: PowerPointFrame;
  notes: PowerPointFrame;
} {
  if (layout === "insight") {
    return {
      key: { x: 0.5, y: 1.75, w: 4.45, h: 4.7 },
      visual: { x: 5.2, y: 1.75, w: 7.63, h: 3.2 },
      notes: { x: 5.2, y: 5.15, w: 7.63, h: 1.3 },
    };
  }

  if (layout === "stacked") {
    return {
      key: { x: 0.5, y: 4.7, w: 7.1, h: 1.8 },
      visual: { x: 0.5, y: 1.75, w: 12.33, h: 2.55 },
      notes: { x: 7.85, y: 4.7, w: 4.98, h: 1.8 },
    };
  }

  return {
    key: { x: 0.5, y: 1.55, w: 6.55, h: 4.95 },
    visual: { x: 7.25, y: 1.55, w: 5.58, h: 3.05 },
    notes: { x: 7.25, y: 4.82, w: 5.58, h: 1.68 },
  };
}

function resolvePdfFrames(layout: SlideTemplateDefinition["contentLayout"]): {
  key: PdfFrame;
  visual: PdfFrame;
  notes: PdfFrame;
} {
  if (layout === "insight") {
    return {
      key: { x: 38, y: 110, width: 350, height: 300 },
      visual: { x: 412, y: 210, width: 510, height: 200 },
      notes: { x: 412, y: 110, width: 510, height: 82 },
    };
  }

  if (layout === "stacked") {
    return {
      key: { x: 38, y: 104, width: 520, height: 98 },
      visual: { x: 38, y: 214, width: 884, height: 170 },
      notes: { x: 580, y: 104, width: 342, height: 98 },
    };
  }

  return {
    key: { x: 38, y: 102, width: 530, height: 318 },
    visual: { x: 590, y: 214, width: 332, height: 206 },
    notes: { x: 590, y: 102, width: 332, height: 96 },
  };
}

function resolvePanelAppearance(template: SlideTemplateDefinition, role: "primary" | "secondary") {
  if (template.cardStyle === "outlined") {
    return {
      fill: "FFFFFF",
      line: stripHash(template.border),
      linePt: 1.5,
    };
  }

  if (template.cardStyle === "solid") {
    return {
      fill: role === "primary" ? mixHex(template.accent, 0.84) : mixHex(template.surface, 0.15),
      line: stripHash(template.border),
      linePt: 1,
    };
  }

  return {
    fill: mixHex(template.surface, role === "primary" ? 0.06 : 0.18),
    line: stripHash(template.border),
    linePt: 1,
  };
}

function createCanvasTemplateFallback(
  designSpec: ReportDesignSpec,
  theme: ReportTheme
): SlideTemplateDefinition {
  return {
    id: designSpec.id,
    name: designSpec.styleName,
    description: designSpec.designTone,
    audienceLabel: designSpec.audienceBehavior,
    narrativeStyle: designSpec.titleStyle,
    visualDirection: designSpec.chartPreference,
    storytellingDirective: designSpec.pageRhythm,
    fontFamily: '"Aptos", "Segoe UI", sans-serif',
    accent: theme.accent,
    surface: theme.surface,
    border: theme.border,
    ink: theme.ink,
    muted: theme.muted,
    heroStyle: "spotlight",
    contentLayout: "balanced",
    cardStyle: "soft",
    promptHint: designSpec.sourcePrompt ?? "",
  };
}

function resolveCanvasPowerPointFrame(
  page: CanvasPageSpec,
  block: CanvasBlockSpec
): PowerPointFrame {
  const normalizedPage = normalizeCanvasPage(page);
  const frame = block.frame as CanvasBlockFrame;
  return {
    x: (frame.x / normalizedPage.canvasWidth) * 13.333,
    y: (frame.y / normalizedPage.canvasHeight) * 7.5,
    w: (frame.width / normalizedPage.canvasWidth) * 13.333,
    h: (frame.height / normalizedPage.canvasHeight) * 7.5,
  };
}

function resolveCanvasPdfFrame(
  page: CanvasPageSpec,
  block: { frame: { x: number; y: number; width: number; height: number } }
) {
  const normalizedPage = normalizeCanvasPage(page);
  const x = (block.frame.x / normalizedPage.canvasWidth) * 960;
  const top = (block.frame.y / normalizedPage.canvasHeight) * 540;
  const width = (block.frame.width / normalizedPage.canvasWidth) * 960;
  const height = (block.frame.height / normalizedPage.canvasHeight) * 540;

  return {
    x,
    top,
    width,
    height,
    bottom: 540 - top - height,
  };
}

function toPdfBaseline(top: number, fontSize: number): number {
  return 540 - top - fontSize;
}

function createChartVisual(
  bundle: ReportForgeBundle,
  chartId: string | undefined
): SlideVisualSpec | null {
  if (!chartId) {
    return null;
  }

  const chart = bundle.plan.excel.charts.find((entry) => entry.id === chartId);
  if (!chart) {
    return null;
  }

  return {
    kind: chart.kind === "line" ? "line" : "bar",
    title: chart.title,
    subtitle: chart.valueLabel,
    emphasis: chart.insight,
    points: chart.categories.slice(0, 6).map((label, index) => ({
      label,
      value: chart.values[index] ?? 0,
      formattedValue: (chart.values[index] ?? 0).toLocaleString(),
      note: chart.insight,
    })),
  };
}

function createKpiVisual(
  bundle: ReportForgeBundle,
  metricIds: string[] | undefined
): SlideVisualSpec | null {
  const selectedIds = new Set(metricIds ?? []);
  const kpis =
    selectedIds.size > 0
      ? bundle.plan.excel.kpis.filter((entry) => selectedIds.has(entry.id))
      : bundle.plan.excel.kpis.slice(0, 4);

  if (kpis.length === 0) {
    return null;
  }

  return {
    kind: "scorecard",
    title: "Key metrics",
    subtitle: "Primary monitored indicators",
    emphasis: "These KPI cards anchor the page before supporting commentary.",
    points: kpis.slice(0, 4).map((kpi) => ({
      label: kpi.label,
      value: kpi.rawValue,
      formattedValue: kpi.formattedValue,
      note: kpi.insight,
    })),
  };
}

function createTableSummary(bundle: ReportForgeBundle): string {
  const headers = bundle.plan.excel.reportTableHeaders.slice(0, 3);
  const rows = bundle.plan.excel.reportTableRows.slice(0, 3);
  return rows.map((row) => row.slice(0, headers.length).join(" | ")).join("\n");
}

function createRecommendationsCopy(reportPlan: EngineReportPlan): string {
  const actions =
    reportPlan.sections
      .find((section) => section.id === "recommended-actions")
      ?.narrativeBlocks.map((block) => block.text) ?? [];

  return actions.length > 0 ? actions.join("\n• ") : reportPlan.primaryMessage;
}

function addPowerPointCanvasPage(
  pptx: PowerPointDeckApi,
  page: CanvasPageSpec,
  designSpec: ReportDesignSpec,
  bundle: ReportForgeBundle,
  reportPlan: EngineReportPlan
): void {
  const normalizedPage = normalizeCanvasPage(page);
  const slide = pptx.addSlide();
  const template = createCanvasTemplateFallback(designSpec, bundle.plan.excel.theme);
  const accent = stripHash(template.accent);
  const border = stripHash(template.border);
  const ink = stripHash(template.ink);
  const muted = stripHash(template.muted);
  const displayFontFace = resolveFontFace(template.fontFamily, "Aptos Display");
  const bodyFontFace = resolveFontFace(template.fontFamily, "Aptos");

  slide.background = { color: "FFFFFF" };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: stripHash(template.surface) },
    line: { color: stripHash(template.surface) },
  });
  slide.addText(page.label, {
    x: 0.45,
    y: 0.35,
    w: 8.4,
    h: 0.34,
    fontFace: displayFontFace,
    fontSize: 22,
    bold: true,
    color: ink,
  });
  slide.addText(`${designSpec.styleName} · ${page.pageRhythm}`, {
    x: 0.45,
    y: 0.7,
    w: 8.8,
    h: 0.2,
    fontFace: bodyFontFace,
    fontSize: 9,
    color: muted,
    fit: "shrink",
  });

  getRenderableCanvasBlocks(normalizedPage, page.format).forEach((block) => {
    const frame = resolveCanvasPowerPointFrame(normalizedPage, block);
    const panelFill = block.emphasis === "high" ? mixHex(template.accent, 0.9) : "FFFFFF";
    slide.addShape(pptx.ShapeType.roundRect, {
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      fill: { color: panelFill },
      line: { color: border, pt: 1 },
      radius: 0.14,
    });
    slide.addText(block.kind.replace("-", " ").toUpperCase(), {
      x: frame.x + 0.12,
      y: frame.y + 0.12,
      w: Math.max(frame.w - 0.24, 0.8),
      h: 0.16,
      fontFace: bodyFontFace,
      fontSize: 8,
      bold: true,
      color: accent,
      fit: "shrink",
    });
    slide.addText(block.title, {
      x: frame.x + 0.12,
      y: frame.y + 0.34,
      w: Math.max(frame.w - 0.24, 0.8),
      h: 0.34,
      fontFace: displayFontFace,
      fontSize: block.kind === "hero" ? 18 : 12,
      bold: true,
      color: ink,
      fit: "shrink",
    });

    if (block.kind === "chart-panel" || block.kind === "kpi-strip") {
      const visual =
        block.kind === "kpi-strip"
          ? createKpiVisual(bundle, block.metricIds)
          : createChartVisual(bundle, block.chartId);
      if (visual) {
        addPowerPointVisual(pptx, slide, visual, {
          x: frame.x + 0.12,
          y: frame.y + 0.82,
          w: Math.max(frame.w - 0.24, 1),
          h: Math.max(frame.h - 1.08, 0.95),
          accent,
          border,
          ink,
          muted,
        });
      }
    } else {
      const bodyCopy =
        block.kind === "table"
          ? createTableSummary(bundle)
          : block.kind === "recommendations"
            ? createRecommendationsCopy(reportPlan)
            : block.kind === "email-summary"
              ? `${bundle.emailBundle.primary.subject}\n${bundle.emailBundle.primary.plainText
                  .split("\n")
                  .slice(0, 4)
                  .join(" ")}`
              : block.body;

      slide.addText(bodyCopy, {
        x: frame.x + 0.12,
        y: frame.y + 0.82,
        w: Math.max(frame.w - 0.24, 0.8),
        h: Math.max(frame.h - 1.02, 0.5),
        fontFace: bodyFontFace,
        fontSize: 10.5,
        color: muted,
        margin: 0.04,
        breakLine: true,
        fit: "shrink",
        valign: "top",
      });
    }

    if (block.supportingText) {
      slide.addText(block.supportingText, {
        x: frame.x + 0.12,
        y: frame.y + frame.h - 0.24,
        w: Math.max(frame.w - 0.24, 0.8),
        h: 0.14,
        fontFace: bodyFontFace,
        fontSize: 7.8,
        color: muted,
        fit: "shrink",
      });
    }
  });
}

function addPdfCanvasPage(
  page: PDFPage,
  canvasPage: CanvasPageSpec,
  designSpec: ReportDesignSpec,
  bundle: ReportForgeBundle,
  reportPlan: EngineReportPlan,
  titleFont: PDFFont,
  bodyFont: PDFFont
): void {
  const normalizedPage = normalizeCanvasPage(canvasPage);
  const theme = bundle.plan.excel.theme;
  const accent = toPdfColor(theme.accent);
  const border = toPdfColor(theme.border);
  const ink = toPdfColor(theme.ink);
  const muted = toPdfColor(theme.muted);
  const surface = toPdfColor(theme.surface);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 960,
    height: 540,
    color: surface,
  });
  page.drawText(canvasPage.label, {
    x: 38,
    y: 492,
    size: 22,
    font: titleFont,
    color: ink,
  });
  page.drawText(`${designSpec.styleName} · ${canvasPage.pageRhythm}`, {
    x: 38,
    y: 472,
    size: 9,
    font: bodyFont,
    color: muted,
  });

  getRenderableCanvasBlocks(normalizedPage, canvasPage.format).forEach((block) => {
    const frame = resolveCanvasPdfFrame(normalizedPage, block as { frame: CanvasBlockFrame });
    page.drawRectangle({
      x: frame.x,
      y: frame.bottom,
      width: frame.width,
      height: frame.height,
      color: block.emphasis === "high" ? toPdfColor(`#${mixHex(theme.accent, 0.9)}`) : rgb(1, 1, 1),
      borderColor: border,
      borderWidth: 1,
    });
    page.drawText(block.kind.replace("-", " ").toUpperCase(), {
      x: frame.x + 12,
      y: toPdfBaseline(frame.top + 12, 8),
      size: 8,
      font: titleFont,
      color: accent,
    });
    page.drawText(block.title, {
      x: frame.x + 12,
      y: toPdfBaseline(frame.top + 32, block.kind === "hero" ? 18 : 12),
      size: block.kind === "hero" ? 18 : 12,
      font: titleFont,
      color: ink,
    });

    if (block.kind === "chart-panel" || block.kind === "kpi-strip") {
      const visual =
        block.kind === "kpi-strip"
          ? createKpiVisual(bundle, block.metricIds)
          : createChartVisual(bundle, block.chartId);

      if (visual) {
        drawPdfVisual(page, visual, titleFont, bodyFont, {
          x: frame.x + 12,
          y: 540 - (frame.top + 56),
          width: Math.max(frame.width - 24, 120),
          height: Math.max(frame.height - 78, 78),
          accent,
          border,
          ink,
          muted,
        });
      }
    } else {
      const bodyCopy =
        block.kind === "table"
          ? createTableSummary(bundle)
          : block.kind === "recommendations"
            ? createRecommendationsCopy(reportPlan)
            : block.kind === "email-summary"
              ? `${bundle.emailBundle.primary.subject}\n${bundle.emailBundle.primary.plainText
                  .split("\n")
                  .slice(0, 4)
                  .join(" ")}`
              : block.body;

      drawParagraph(page, bodyCopy, {
        x: frame.x + 12,
        y: toPdfBaseline(frame.top + 58, 10.5),
        width: Math.max(frame.width - 24, 120),
        font: bodyFont,
        fontSize: 10.5,
        color: muted,
        lineHeight: 13,
      });
    }

    if (block.supportingText) {
      page.drawText(block.supportingText, {
        x: frame.x + 12,
        y: frame.bottom + 10,
        size: 7.8,
        font: bodyFont,
        color: muted,
      });
    }
  });
}

export async function buildSlideDeckPowerPoint(
  slidesBundle: GeneratedSlidesBundle,
  template: SlideTemplateDefinition,
  composition?: CanvasDeckComposition
): Promise<Blob> {
  const PptxGenJS = await loadPptxGenerator();
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "ReportForge AI";
  pptx.company = "ReportForge AI";
  pptx.subject = slidesBundle.title;
  pptx.title = slidesBundle.title;

  if (composition) {
    normalizeCanvasDocument(composition.canvasDocument).pages.forEach((page) => {
      addPowerPointCanvasPage(
        pptx,
        page,
        composition.designSpec,
        composition.bundle,
        composition.reportPlan
      );
    });
  } else {
    slidesBundle.slides.forEach((slide) => {
      addPowerPointSlide(pptx, slide, template);
    });
  }

  const payload = (await pptx.write({
    outputType: "arraybuffer",
  })) as Blob | ArrayBuffer | Uint8Array | string;

  return normalizePowerPointWriteResult(payload);
}

export async function buildSlideDeckPdf(
  slidesBundle: GeneratedSlidesBundle,
  template: SlideTemplateDefinition,
  composition?: CanvasDeckComposition
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);

  if (composition) {
    normalizeCanvasDocument(composition.canvasDocument).pages.forEach((page) => {
      addPdfCanvasPage(
        pdf.addPage([960, 540]),
        page,
        composition.designSpec,
        composition.bundle,
        composition.reportPlan,
        titleFont,
        bodyFont
      );
    });
  } else {
    slidesBundle.slides.forEach((slide) => {
      addPdfSlide(pdf.addPage([960, 540]), slide, template, titleFont, bodyFont);
    });
  }

  return pdf.save();
}

function addPowerPointSlide(
  pptx: PowerPointDeckApi,
  slide: SlideOutline,
  template: SlideTemplateDefinition
): void {
  const headlineCopy = slide.subtitle ?? slide.takeaway;
  const visiblePoints = slide.evidencePoints ?? slide.bullets;
  const visualCaption = slide.chartCaption ?? slide.chartSuggestion;
  const notesCopy = [slide.implication, slide.recommendation, slide.speakerNotes]
    .filter(Boolean)
    .join(" ");
  const pptxSlide = pptx.addSlide();
  const bodyFontFace = resolveFontFace(template.fontFamily, "Aptos");
  const displayFontFace = resolveFontFace(template.fontFamily, "Aptos Display");
  const accent = stripHash(template.accent);
  const border = stripHash(template.border);
  const ink = stripHash(template.ink);
  const muted = stripHash(template.muted);
  const surface = stripHash(template.surface);
  const frames = resolvePowerPointFrames(template.contentLayout);
  const primaryPanel = resolvePanelAppearance(template, "primary");
  const secondaryPanel = resolvePanelAppearance(template, "secondary");

  pptxSlide.background = { color: "FFFFFF" };
  pptxSlide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: surface },
    line: { color: surface },
  });
  if (template.heroStyle === "ribbon") {
    pptxSlide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.45,
      fill: { color: accent },
      line: { color: accent },
    });
    pptxSlide.addText(`Slide ${slide.index}`, {
      x: 0.45,
      y: 0.12,
      w: 1.6,
      h: 0.25,
      fontFace: bodyFontFace,
      fontSize: 10,
      bold: true,
      color: "FFFFFF",
    });
    pptxSlide.addText(slide.title, {
      x: 0.5,
      y: 0.7,
      w: 8.1,
      h: 0.5,
      fontFace: displayFontFace,
      fontSize: 24,
      bold: true,
      color: ink,
    });
    pptxSlide.addText(headlineCopy, {
      x: 0.5,
      y: 1.1,
      w: 8.3,
      h: 0.34,
      fontFace: bodyFontFace,
      fontSize: 10,
      color: muted,
    });
    pptxSlide.addText(slide.storyBeat, {
      x: 0.5,
      y: 1.44,
      w: 2.8,
      h: 0.18,
      fontFace: bodyFontFace,
      fontSize: 8.5,
      bold: true,
      color: accent,
      fit: "shrink",
    });
  } else if (template.heroStyle === "spotlight") {
    pptxSlide.addShape(pptx.ShapeType.roundRect, {
      x: 0.45,
      y: 0.45,
      w: 8.55,
      h: 1.15,
      fill: { color: mixHex(template.accent, 0.9) },
      line: { color: accent, pt: 1 },
    });
    pptxSlide.addText(slide.title, {
      x: 0.72,
      y: 0.65,
      w: 7.2,
      h: 0.33,
      fontFace: displayFontFace,
      fontSize: 23,
      bold: true,
      color: ink,
    });
    pptxSlide.addText(headlineCopy, {
      x: 0.72,
      y: 1.02,
      w: 7.2,
      h: 0.22,
      fontFace: bodyFontFace,
      fontSize: 10,
      color: muted,
      fit: "shrink",
    });
    pptxSlide.addText(slide.storyBeat, {
      x: 0.72,
      y: 1.28,
      w: 2.8,
      h: 0.16,
      fontFace: bodyFontFace,
      fontSize: 8.5,
      bold: true,
      color: accent,
      fit: "shrink",
    });
    pptxSlide.addShape(pptx.ShapeType.roundRect, {
      x: 9.55,
      y: 0.55,
      w: 1.55,
      h: 0.38,
      fill: { color: accent },
      line: { color: accent, pt: 1 },
    });
    pptxSlide.addText(template.audienceLabel, {
      x: 9.78,
      y: 0.66,
      w: 2.55,
      h: 0.16,
      fontFace: bodyFontFace,
      fontSize: 8.5,
      bold: true,
      color: ink,
      fit: "shrink",
    });
    pptxSlide.addText(`Slide ${slide.index}`, {
      x: 11.28,
      y: 0.66,
      w: 1.1,
      h: 0.16,
      fontFace: bodyFontFace,
      fontSize: 8.5,
      bold: true,
      color: muted,
      align: "right",
    });
  } else {
    pptxSlide.addShape(pptx.ShapeType.line, {
      x: 0.5,
      y: 0.64,
      w: 12.3,
      h: 0,
      line: { color: accent, pt: 1.5 },
    });
    pptxSlide.addText(slide.title, {
      x: 0.5,
      y: 0.78,
      w: 8.3,
      h: 0.44,
      fontFace: displayFontFace,
      fontSize: 24,
      bold: true,
      color: ink,
    });
    pptxSlide.addText(headlineCopy, {
      x: 0.5,
      y: 1.15,
      w: 8.4,
      h: 0.26,
      fontFace: bodyFontFace,
      fontSize: 10,
      color: muted,
      fit: "shrink",
    });
    pptxSlide.addText(slide.storyBeat, {
      x: 0.5,
      y: 1.42,
      w: 2.9,
      h: 0.16,
      fontFace: bodyFontFace,
      fontSize: 8.5,
      bold: true,
      color: accent,
      fit: "shrink",
    });
    pptxSlide.addText(`${template.audienceLabel} · Slide ${slide.index}`, {
      x: 9.2,
      y: 0.82,
      w: 3.3,
      h: 0.18,
      fontFace: bodyFontFace,
      fontSize: 8.5,
      bold: true,
      color: accent,
      align: "right",
      fit: "shrink",
    });
  }

  if (slide.headlineMetric) {
    pptxSlide.addShape(pptx.ShapeType.roundRect, {
      x: 9.55,
      y: 0.72,
      w: 2.8,
      h: 0.92,
      fill: { color: "FFFFFF" },
      line: { color: border, pt: 1 },
    });
    pptxSlide.addText(slide.headlineMetric.label, {
      x: 9.78,
      y: 0.86,
      w: 2.25,
      h: 0.14,
      fontFace: bodyFontFace,
      fontSize: 9,
      bold: true,
      color: muted,
    });
    pptxSlide.addText(slide.headlineMetric.value, {
      x: 9.78,
      y: 1.02,
      w: 2.25,
      h: 0.22,
      fontFace: displayFontFace,
      fontSize: 20,
      bold: true,
      color: ink,
    });
    pptxSlide.addText(slide.headlineMetric.detail, {
      x: 9.78,
      y: 1.28,
      w: 2.25,
      h: 0.16,
      fontFace: bodyFontFace,
      fontSize: 8.5,
      color: muted,
      fit: "shrink",
    });
  }

  pptxSlide.addShape(pptx.ShapeType.roundRect, {
    x: frames.key.x,
    y: frames.key.y,
    w: frames.key.w,
    h: frames.key.h,
    fill: { color: primaryPanel.fill },
    line: { color: primaryPanel.line, pt: primaryPanel.linePt },
  });
  pptxSlide.addText("Key Points", {
    x: frames.key.x + 0.22,
    y: frames.key.y + 0.25,
    w: 1.8,
    h: 0.2,
    fontFace: bodyFontFace,
    fontSize: 13,
    bold: true,
    color: accent,
  });
  pptxSlide.addText(
    visiblePoints.map((bullet) => ({
      text: bullet,
      options: { bullet: { indent: 18 } },
    })),
    {
      x: frames.key.x + 0.25,
      y: frames.key.y + 0.6,
      w: frames.key.w - 0.55,
      h: Math.max(0.9, frames.key.h - 1.2),
      fontFace: bodyFontFace,
      fontSize: template.contentLayout === "stacked" ? 12.5 : 15,
      color: ink,
      breakLine: true,
      margin: 0.05,
      fit: "shrink",
      valign: "top",
    }
  );
  pptxSlide.addText(visualCaption, {
    x: frames.key.x + 0.25,
    y: frames.key.y + frames.key.h - 0.45,
    w: frames.key.w - 0.55,
    h: 0.28,
    fontFace: bodyFontFace,
    fontSize: 8.5,
    color: muted,
    fit: "shrink",
  });

  pptxSlide.addShape(pptx.ShapeType.roundRect, {
    x: frames.visual.x,
    y: frames.visual.y,
    w: frames.visual.w,
    h: frames.visual.h,
    fill: { color: secondaryPanel.fill },
    line: { color: secondaryPanel.line, pt: secondaryPanel.linePt },
  });
  pptxSlide.addText(slide.visual ? slide.visual.title : "Chart Direction", {
    x: frames.visual.x + 0.3,
    y: frames.visual.y + 0.25,
    w: 3.2,
    h: 0.2,
    fontFace: bodyFontFace,
    fontSize: 13,
    bold: true,
    color: accent,
  });
  if (slide.visual) {
    addPowerPointVisual(pptx, pptxSlide, slide.visual, {
      x: frames.visual.x + 0.3,
      y: frames.visual.y + 0.55,
      w: frames.visual.w - 0.62,
      h: Math.max(0.92, frames.visual.h - 1.08),
      accent,
      border,
      ink,
      muted,
    });
  } else {
    pptxSlide.addText(visualCaption, {
      x: frames.visual.x + 0.3,
      y: frames.visual.y + 0.6,
      w: frames.visual.w - 0.62,
      h: Math.max(0.8, frames.visual.h - 0.95),
      fontFace: bodyFontFace,
      fontSize: 12,
      color: muted,
      margin: 0.08,
      fit: "shrink",
      valign: "top",
    });
  }

  pptxSlide.addShape(pptx.ShapeType.roundRect, {
    x: frames.notes.x,
    y: frames.notes.y,
    w: frames.notes.w,
    h: frames.notes.h,
    fill: { color: secondaryPanel.fill },
    line: { color: secondaryPanel.line, pt: secondaryPanel.linePt },
  });
  pptxSlide.addText("Implication & Notes", {
    x: frames.notes.x + 0.3,
    y: frames.notes.y + 0.26,
    w: 2.4,
    h: 0.2,
    fontFace: bodyFontFace,
    fontSize: 13,
    bold: true,
    color: accent,
  });
  pptxSlide.addText(notesCopy, {
    x: frames.notes.x + 0.3,
    y: frames.notes.y + 0.56,
    w: frames.notes.w - 0.62,
    h: Math.max(0.4, frames.notes.h - 0.95),
    fontFace: bodyFontFace,
    fontSize: template.contentLayout === "stacked" ? 10 : 11,
    color: muted,
    margin: 0.08,
    fit: "shrink",
    valign: "top",
  });
  pptxSlide.addText(`${template.audienceLabel} · ${template.visualDirection}`, {
    x: frames.notes.x + 0.3,
    y: frames.notes.y + frames.notes.h - 0.26,
    w: frames.notes.w - 0.62,
    h: 0.16,
    fontFace: bodyFontFace,
    fontSize: 8,
    color: muted,
    fit: "shrink",
  });
}

export function normalizePowerPointWriteResult(
  payload: Blob | ArrayBuffer | Uint8Array | string
): Blob {
  if (isBlobLike(payload)) {
    return payload;
  }

  if (isByteArrayLike(payload)) {
    return new Blob([Uint8Array.from(payload)], { type: POWERPOINT_MIME_TYPE });
  }

  if (isArrayBufferLike(payload)) {
    return new Blob([payload], { type: POWERPOINT_MIME_TYPE });
  }

  if (typeof payload === "string") {
    return new Blob([payload], { type: POWERPOINT_MIME_TYPE });
  }

  throw new Error("PowerPoint export returned an unsupported payload.");
}

function isBlobLike(value: unknown): value is Blob {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as Blob).arrayBuffer === "function" &&
    typeof (value as Blob).size === "number"
  );
}

function isByteArrayLike(value: unknown): value is Uint8Array {
  return Boolean(value && typeof value === "object" && ArrayBuffer.isView(value));
}

function isArrayBufferLike(value: unknown): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === "[object ArrayBuffer]";
}

function addPowerPointVisual(
  pptx: PowerPointDeckApi,
  slide: any,
  visual: SlideVisualSpec,
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
    accent: string;
    border: string;
    ink: string;
    muted: string;
  }
): void {
  if (visual.kind === "scorecard") {
    addPowerPointScorecards(pptx, slide, visual, frame);
    return;
  }

  slide.addChart(
    visual.kind === "line" ? pptx.ChartType.line : pptx.ChartType.bar,
    [
      {
        name: visual.title,
        labels: visual.points.map((point) => point.label),
        values: visual.points.map((point) => point.value),
      },
    ],
    {
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      showLegend: false,
      showTitle: false,
      showValue: true,
      showBorder: false,
      chartColors: [frame.accent],
      catAxisLabelColor: frame.ink,
      valAxisLabelColor: frame.muted,
      catAxisColor: frame.border,
      valAxisColor: frame.border,
      catGridLine: { color: frame.border, transparency: 60 },
      valGridLine: { color: frame.border, transparency: 30 },
      lineSize: 2,
      dataLabelPosition: visual.kind === "line" ? "t" : "outEnd",
      showCatName: false,
      showPercent: false,
      showSerName: false,
    }
  );
}

function addPowerPointScorecards(
  pptx: PowerPointDeckApi,
  slide: any,
  visual: SlideVisualSpec,
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
    accent: string;
    border: string;
    ink: string;
    muted: string;
  }
): void {
  const columns = 2;
  const rows = Math.min(2, Math.ceil(visual.points.length / columns));
  const cardW = (frame.w - 0.12) / columns;
  const cardH = (frame.h - 0.12) / Math.max(rows, 1);

  visual.points.slice(0, 4).forEach((point, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = frame.x + column * (cardW + 0.08);
    const y = frame.y + row * (cardH + 0.08);

    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: "FFFFFF" },
      line: { color: frame.border, pt: 1 },
    });
    slide.addText(point.label, {
      x: x + 0.1,
      y: y + 0.1,
      w: cardW - 0.2,
      h: 0.15,
      fontFace: "Aptos",
      fontSize: 8.5,
      bold: true,
      color: frame.muted,
      fit: "shrink",
    });
    slide.addText(point.formattedValue, {
      x: x + 0.1,
      y: y + 0.3,
      w: cardW - 0.2,
      h: 0.28,
      fontFace: "Aptos Display",
      fontSize: 16,
      bold: true,
      color: frame.ink,
      fit: "shrink",
    });
    slide.addText(point.note, {
      x: x + 0.1,
      y: y + 0.62,
      w: cardW - 0.2,
      h: cardH - 0.72,
      fontFace: "Aptos",
      fontSize: 8,
      color: frame.muted,
      fit: "shrink",
      valign: "top",
    });
  });
}

function addPdfSlide(
  page: PDFPage,
  slide: SlideOutline,
  template: SlideTemplateDefinition,
  titleFont: PDFFont,
  bodyFont: PDFFont
): void {
  const headlineCopy = slide.subtitle ?? slide.takeaway;
  const visiblePoints = slide.evidencePoints ?? slide.bullets;
  const visualCaption = slide.chartCaption ?? slide.chartSuggestion;
  const notesCopy = [slide.implication, slide.recommendation, slide.speakerNotes]
    .filter(Boolean)
    .join(" ");
  const accent = toPdfColor(template.accent);
  const border = toPdfColor(template.border);
  const ink = toPdfColor(template.ink);
  const muted = toPdfColor(template.muted);
  const surface = toPdfColor(template.surface);
  const frames = resolvePdfFrames(template.contentLayout);
  const primaryPanel = resolvePanelAppearance(template, "primary");
  const secondaryPanel = resolvePanelAppearance(template, "secondary");
  const primaryFill = toPdfColor(`#${primaryPanel.fill}`);
  const secondaryFill = toPdfColor(`#${secondaryPanel.fill}`);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 960,
    height: 540,
    color: surface,
  });
  if (template.heroStyle === "ribbon") {
    page.drawRectangle({
      x: 0,
      y: 510,
      width: 960,
      height: 30,
      color: accent,
    });
    page.drawText(`Slide ${slide.index}`, {
      x: 42,
      y: 520,
      size: 10,
      font: titleFont,
      color: rgb(1, 1, 1),
    });
    page.drawText(slide.title, {
      x: 38,
      y: 472,
      size: 25,
      font: titleFont,
      color: ink,
    });
    page.drawText(headlineCopy, {
      x: 38,
      y: 448,
      size: 11,
      font: bodyFont,
      color: muted,
    });
    page.drawText(slide.storyBeat, {
      x: 38,
      y: 432,
      size: 8.5,
      font: titleFont,
      color: accent,
    });
  } else if (template.heroStyle === "spotlight") {
    page.drawRectangle({
      x: 34,
      y: 440,
      width: 610,
      height: 56,
      color: toPdfColor(`#${mixHex(template.accent, 0.9)}`),
      borderColor: accent,
      borderWidth: 1,
    });
    page.drawText(slide.title, {
      x: 54,
      y: 474,
      size: 22,
      font: titleFont,
      color: ink,
    });
    page.drawText(headlineCopy, {
      x: 54,
      y: 452,
      size: 10.5,
      font: bodyFont,
      color: muted,
    });
    page.drawText(slide.storyBeat, {
      x: 54,
      y: 438,
      size: 8.5,
      font: titleFont,
      color: accent,
    });
    page.drawText(template.audienceLabel, {
      x: 760,
      y: 478,
      size: 8.5,
      font: titleFont,
      color: accent,
    });
    page.drawText(`Slide ${slide.index}`, {
      x: 860,
      y: 478,
      size: 8.5,
      font: titleFont,
      color: muted,
    });
  } else {
    page.drawLine({
      start: { x: 38, y: 500 },
      end: { x: 922, y: 500 },
      thickness: 1.4,
      color: accent,
    });
    page.drawText(slide.title, {
      x: 38,
      y: 466,
      size: 24,
      font: titleFont,
      color: ink,
    });
    page.drawText(headlineCopy, {
      x: 38,
      y: 444,
      size: 10.5,
      font: bodyFont,
      color: muted,
    });
    page.drawText(slide.storyBeat, {
      x: 38,
      y: 430,
      size: 8.5,
      font: titleFont,
      color: accent,
    });
    page.drawText(`${template.audienceLabel} · Slide ${slide.index}`, {
      x: 700,
      y: 468,
      size: 8.5,
      font: titleFont,
      color: accent,
    });
  }

  if (slide.headlineMetric) {
    page.drawRectangle({
      x: 736,
      y: 430,
      width: 180,
      height: 56,
      color: rgb(1, 1, 1),
      borderColor: border,
      borderWidth: 1,
    });
    page.drawText(slide.headlineMetric.label, {
      x: 752,
      y: 468,
      size: 9,
      font: titleFont,
      color: muted,
    });
    page.drawText(slide.headlineMetric.value, {
      x: 752,
      y: 446,
      size: 19,
      font: titleFont,
      color: ink,
    });
    drawParagraph(page, slide.headlineMetric.detail, {
      x: 752,
      y: 434,
      width: 142,
      font: bodyFont,
      fontSize: 8.5,
      color: muted,
      lineHeight: 10,
    });
  }

  page.drawRectangle({
    x: frames.key.x,
    y: frames.key.y,
    width: frames.key.width,
    height: frames.key.height,
    color: primaryFill,
    borderColor: border,
    borderWidth: 1,
  });
  page.drawText("Key Points", {
    x: frames.key.x + 20,
    y: frames.key.y + frames.key.height - 24,
    size: 13,
    font: titleFont,
    color: accent,
  });
  drawBulletList(page, visiblePoints, {
    x: frames.key.x + 20,
    y: frames.key.y + frames.key.height - 50,
    width: frames.key.width - 52,
    font: bodyFont,
    fontSize: template.contentLayout === "stacked" ? 12 : 14,
    color: ink,
    lineHeight: 18,
  });
  page.drawText(visualCaption, {
    x: frames.key.x + 20,
    y: frames.key.y + 12,
    size: 8.5,
    font: bodyFont,
    color: muted,
  });

  page.drawRectangle({
    x: frames.visual.x,
    y: frames.visual.y,
    width: frames.visual.width,
    height: frames.visual.height,
    color: secondaryFill,
    borderColor: border,
    borderWidth: 1,
  });
  page.drawText(slide.visual ? slide.visual.title : "Chart Direction", {
    x: frames.visual.x + 20,
    y: frames.visual.y + frames.visual.height - 24,
    size: 13,
    font: titleFont,
    color: accent,
  });
  if (slide.visual) {
    drawPdfVisual(page, slide.visual, titleFont, bodyFont, {
      x: frames.visual.x + 20,
      y: frames.visual.y + frames.visual.height - 46,
      width: frames.visual.width - 52,
      height: Math.max(70, frames.visual.height - 70),
      accent,
      border,
      ink,
      muted,
    });
  } else {
    drawParagraph(page, visualCaption, {
      x: frames.visual.x + 20,
      y: frames.visual.y + frames.visual.height - 48,
      width: frames.visual.width - 42,
      font: bodyFont,
      fontSize: 12,
      color: muted,
      lineHeight: 16,
    });
  }
  drawParagraph(page, visualCaption, {
    x: frames.visual.x + 20,
    y: frames.visual.y + 16,
    width: frames.visual.width - 42,
    font: bodyFont,
    fontSize: 8.5,
    color: muted,
    lineHeight: 10,
  });

  page.drawRectangle({
    x: frames.notes.x,
    y: frames.notes.y,
    width: frames.notes.width,
    height: frames.notes.height,
    color: secondaryFill,
    borderColor: border,
    borderWidth: 1,
  });
  page.drawText("Implication & Notes", {
    x: frames.notes.x + 20,
    y: frames.notes.y + frames.notes.height - 20,
    size: 13,
    font: titleFont,
    color: accent,
  });
  drawParagraph(page, notesCopy, {
    x: frames.notes.x + 20,
    y: frames.notes.y + frames.notes.height - 42,
    width: frames.notes.width - 42,
    font: bodyFont,
    fontSize: template.contentLayout === "stacked" ? 9.5 : 10.5,
    color: muted,
    lineHeight: 13,
  });
  page.drawText(`${template.audienceLabel} · ${template.visualDirection}`, {
    x: frames.notes.x + 20,
    y: frames.notes.y + 10,
    size: 7.8,
    font: bodyFont,
    color: muted,
  });
}

function drawPdfVisual(
  page: PDFPage,
  visual: SlideVisualSpec,
  titleFont: PDFFont,
  bodyFont: PDFFont,
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
    accent: ReturnType<typeof rgb>;
    border: ReturnType<typeof rgb>;
    ink: ReturnType<typeof rgb>;
    muted: ReturnType<typeof rgb>;
  }
): void {
  if (visual.kind === "scorecard") {
    drawPdfScorecards(page, visual, titleFont, bodyFont, frame);
    return;
  }

  if (visual.kind === "line") {
    drawPdfLineChart(page, visual, bodyFont, frame);
    return;
  }

  drawPdfBarChart(page, visual, titleFont, bodyFont, frame);
}

function drawPdfScorecards(
  page: PDFPage,
  visual: SlideVisualSpec,
  titleFont: PDFFont,
  bodyFont: PDFFont,
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
    border: ReturnType<typeof rgb>;
    ink: ReturnType<typeof rgb>;
    muted: ReturnType<typeof rgb>;
  }
): void {
  const columns = 2;
  const cardWidth = (frame.width - 12) / columns;
  const cardHeight = (frame.height - 12) / 2;

  visual.points.slice(0, 4).forEach((point, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = frame.x + column * (cardWidth + 12);
    const y = frame.y - row * (cardHeight + 12) - cardHeight;

    page.drawRectangle({
      x,
      y,
      width: cardWidth,
      height: cardHeight,
      color: rgb(1, 1, 1),
      borderColor: frame.border,
      borderWidth: 1,
    });
    page.drawText(point.label, {
      x: x + 10,
      y: y + cardHeight - 16,
      size: 8,
      font: titleFont,
      color: frame.muted,
    });
    page.drawText(point.formattedValue, {
      x: x + 10,
      y: y + cardHeight - 36,
      size: 15,
      font: titleFont,
      color: frame.ink,
    });
    drawParagraph(page, point.note, {
      x: x + 10,
      y: y + cardHeight - 48,
      width: cardWidth - 20,
      font: bodyFont,
      fontSize: 7.8,
      color: frame.muted,
      lineHeight: 9,
    });
  });
}

function drawPdfBarChart(
  page: PDFPage,
  visual: SlideVisualSpec,
  titleFont: PDFFont,
  bodyFont: PDFFont,
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
    accent: ReturnType<typeof rgb>;
    border: ReturnType<typeof rgb>;
    ink: ReturnType<typeof rgb>;
    muted: ReturnType<typeof rgb>;
  }
): void {
  const max = Math.max(...visual.points.map((point) => Math.abs(point.value)), 1);
  const rowHeight = Math.min(24, frame.height / Math.max(visual.points.length, 1));

  visual.points.forEach((point, index) => {
    const y = frame.y - index * rowHeight - 10;
    page.drawText(point.label, {
      x: frame.x,
      y,
      size: 8.5,
      font: titleFont,
      color: frame.ink,
    });
    page.drawRectangle({
      x: frame.x + 70,
      y: y - 2,
      width: frame.width - 128,
      height: 8,
      color: rgb(0.95, 0.98, 0.98),
      borderColor: frame.border,
      borderWidth: 0.5,
    });
    page.drawRectangle({
      x: frame.x + 70,
      y: y - 2,
      width: Math.max(16, ((frame.width - 128) * Math.abs(point.value)) / max),
      height: 8,
      color: frame.accent,
    });
    page.drawText(point.formattedValue, {
      x: frame.x + frame.width - 42,
      y,
      size: 8.5,
      font: titleFont,
      color: frame.ink,
    });
  });

  drawParagraph(page, visual.emphasis, {
    x: frame.x,
    y: frame.y - frame.height + 10,
    width: frame.width,
    font: bodyFont,
    fontSize: 8,
    color: frame.muted,
    lineHeight: 9.5,
  });
}

function drawPdfLineChart(
  page: PDFPage,
  visual: SlideVisualSpec,
  bodyFont: PDFFont,
  frame: {
    x: number;
    y: number;
    width: number;
    height: number;
    accent: ReturnType<typeof rgb>;
    border: ReturnType<typeof rgb>;
    muted: ReturnType<typeof rgb>;
  }
): void {
  const min = Math.min(...visual.points.map((point) => point.value));
  const max = Math.max(...visual.points.map((point) => point.value));
  const span = max - min || 1;
  const chartHeight = frame.height - 28;
  const points = visual.points.map((point, index) => ({
    x: frame.x + (index * (frame.width - 20)) / Math.max(visual.points.length - 1, 1),
    y: frame.y - 12 - ((point.value - min) / span) * chartHeight,
    point,
  }));

  page.drawLine({
    start: { x: frame.x, y: frame.y - chartHeight - 12 },
    end: { x: frame.x + frame.width, y: frame.y - chartHeight - 12 },
    color: frame.border,
    thickness: 1,
  });
  page.drawLine({
    start: { x: frame.x, y: frame.y - 12 },
    end: { x: frame.x, y: frame.y - chartHeight - 12 },
    color: frame.border,
    thickness: 1,
  });

  for (let index = 0; index < points.length - 1; index += 1) {
    page.drawLine({
      start: { x: points[index].x, y: points[index].y },
      end: { x: points[index + 1].x, y: points[index + 1].y },
      color: frame.accent,
      thickness: 2,
    });
  }

  points.forEach((entry) => {
    page.drawCircle({
      x: entry.x,
      y: entry.y,
      size: 3,
      color: frame.accent,
      borderColor: frame.accent,
      borderWidth: 1,
    });
    page.drawText(truncatePdfLabel(entry.point.label), {
      x: entry.x - 14,
      y: frame.y - chartHeight - 24,
      size: 7,
      font: bodyFont,
      color: frame.muted,
    });
  });
}

function drawBulletList(page: PDFPage, bullets: string[], options: ParagraphOptions): void {
  let cursorY = options.y;
  bullets.forEach((bullet) => {
    const lines = wrapText(`• ${bullet}`, options.width, options.font, options.fontSize);
    lines.forEach((line) => {
      page.drawText(line, {
        x: options.x,
        y: cursorY,
        size: options.fontSize,
        font: options.font,
        color: options.color,
      });
      cursorY -= options.lineHeight;
    });
    cursorY -= 5;
  });
}

function drawParagraph(page: PDFPage, text: string, options: ParagraphOptions): void {
  let cursorY = options.y;
  wrapText(text, options.width, options.font, options.fontSize).forEach((line) => {
    page.drawText(line, {
      x: options.x,
      y: cursorY,
      size: options.fontSize,
      font: options.font,
      color: options.color,
    });
    cursorY -= options.lineHeight;
  });
}

function wrapText(text: string, width: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= width) {
      currentLine = candidate;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function stripHash(value: string): string {
  return value.replace("#", "");
}

function toPdfColor(hex: string) {
  const parsed = parseHexColor(hex);
  return rgb(parsed.red / 255, parsed.green / 255, parsed.blue / 255);
}

function parseHexColor(value: string): RgbColor {
  const normalized = value.replace("#", "").trim();
  const fullValue =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalized;

  return {
    red: Number.parseInt(fullValue.slice(0, 2), 16),
    green: Number.parseInt(fullValue.slice(2, 4), 16),
    blue: Number.parseInt(fullValue.slice(4, 6), 16),
  };
}

function truncatePdfLabel(value: string): string {
  return value.length > 10 ? `${value.slice(0, 9)}…` : value;
}
