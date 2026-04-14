import { buildSlideDeckPdf, buildSlideDeckPowerPoint } from "../../services/slides/exportSlideDeck";
import {
  DEFAULT_SLIDE_TEMPLATE_ID,
  renderSlideDeckHtml,
  resolveSlideTemplate,
} from "../../services/slides/slideTemplates";
import { slugify } from "../../utils/formatting";
import { RenderArtifact, ReportFormat, ReportResult } from "../domain/types";
import { renderEmailHtmlArtifact } from "./renderEmailArtifact";
import { renderGasProjectArtifact } from "./renderGasProjectArtifact";
import { renderHtmlReport } from "./renderHtmlReport";

interface SlideRenderDependencies {
  buildSlideDeckPowerPoint: typeof buildSlideDeckPowerPoint;
  buildSlideDeckPdf: typeof buildSlideDeckPdf;
}

const DEFAULT_SLIDE_RENDER_DEPENDENCIES: SlideRenderDependencies = {
  buildSlideDeckPowerPoint,
  buildSlideDeckPdf,
};

function buildFilename(title: string, extension: string): string {
  return `${slugify(title) || "reportforge-report"}.${extension}`;
}

function createSkippedArtifact(format: ReportFormat, summary: string): RenderArtifact {
  return {
    id: `artifact-${format}`,
    format,
    label: format,
    status: "skipped",
    summary,
  };
}

export async function renderArtifacts(
  result: Omit<ReportResult, "artifacts" | "status">,
  dependencies: SlideRenderDependencies = DEFAULT_SLIDE_RENDER_DEPENDENCIES
): Promise<RenderArtifact[]> {
  const template = resolveSlideTemplate(
    DEFAULT_SLIDE_TEMPLATE_ID,
    result.bundle.slidesBundle.theme,
    []
  );
  const artifacts: RenderArtifact[] = [];

  for (const format of result.request.preferredFormats) {
    if (format === "html") {
      artifacts.push({
        id: "artifact-html",
        format,
        label: "HTML report",
        status: "ready",
        summary: "Generated an HTML executive report artifact.",
        mimeType: "text/html",
        filename: buildFilename(result.reportPlan.title, "html"),
        textContent: renderHtmlReport(
          result.reportPlan,
          result.bundle,
          result.designSpec,
          result.canvasDocument
        ),
      });
      continue;
    }

    if (format === "slides-json") {
      artifacts.push({
        id: "artifact-slides-json",
        format,
        label: "Slides JSON",
        status: "ready",
        summary: "Generated a structured slide deck specification.",
        mimeType: "application/json",
        filename: buildFilename(result.bundle.slidesBundle.title, "slides.json"),
        jsonContent: result.bundle.slidesBundle,
        textContent: result.bundle.slidesBundle.json,
      });
      continue;
    }

    if (format === "email-html") {
      const emailArtifact = renderEmailHtmlArtifact(result.bundle, result.designSpec);
      artifacts.push({
        id: "artifact-email-html",
        format,
        label: "Email draft",
        status: "ready",
        summary: "Generated an email draft preview ready for Gmail.",
        mimeType: "text/html",
        filename: buildFilename(`${result.reportPlan.title}-email`, "html"),
        textContent: emailArtifact.html,
        jsonContent: {
          ...emailArtifact.source,
          primary: {
            ...emailArtifact.source.primary,
            subject: emailArtifact.subject,
            html: emailArtifact.html,
          },
        },
      });
      continue;
    }

    if (format === "gas-project") {
      const gasProject = renderGasProjectArtifact(result.bundle, result.designSpec);
      artifacts.push({
        id: "artifact-gas",
        format,
        label: "Apps Script project",
        status: "ready",
        summary: "Generated an Apps Script dashboard scaffold.",
        mimeType: "application/json",
        filename: buildFilename(`${result.reportPlan.title}-apps-script`, "json"),
        jsonContent: gasProject,
      });
      continue;
    }

    if (format === "excel-plan") {
      artifacts.push({
        id: "artifact-excel-plan",
        format,
        label: "Excel report plan",
        status: "ready",
        summary: "Generated an Excel render plan for the workbook adapter.",
        mimeType: "application/json",
        filename: buildFilename(`${result.reportPlan.title}-excel-plan`, "json"),
        jsonContent: {
          plan: result.corePlan.excel,
          reportTitle: result.corePlan.title,
          subtitle: result.corePlan.subtitle,
        },
      });
      continue;
    }

    if (format === "pptx") {
      try {
        const blob = await dependencies.buildSlideDeckPowerPoint(
          result.bundle.slidesBundle,
          template,
          {
            canvasDocument: result.canvasDocument,
            designSpec: result.designSpec,
            bundle: result.bundle,
            reportPlan: result.reportPlan,
          }
        );
        artifacts.push({
          id: "artifact-pptx",
          format,
          label: "PowerPoint deck",
          status: "ready",
          summary: "Generated a PowerPoint deck artifact.",
          mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          filename: buildFilename(result.bundle.slidesBundle.title, "pptx"),
          binaryContent: blob,
        });
      } catch (error) {
        artifacts.push({
          id: "artifact-pptx",
          format,
          label: "PowerPoint deck",
          status: "error",
          summary: "PowerPoint generation failed.",
          error: error instanceof Error ? error.message : "PowerPoint export failed.",
        });
      }
      continue;
    }

    if (format === "pdf") {
      try {
        const pdfBytes = await dependencies.buildSlideDeckPdf(
          result.bundle.slidesBundle,
          template,
          {
            canvasDocument: result.canvasDocument,
            designSpec: result.designSpec,
            bundle: result.bundle,
            reportPlan: result.reportPlan,
          }
        );
        artifacts.push({
          id: "artifact-pdf",
          format,
          label: "PDF deck",
          status: "ready",
          summary: "Generated a PDF deck artifact.",
          mimeType: "application/pdf",
          filename: buildFilename(result.bundle.slidesBundle.title, "pdf"),
          binaryContent: pdfBytes,
        });
      } catch (error) {
        artifacts.push({
          id: "artifact-pdf",
          format,
          label: "PDF deck",
          status: "error",
          summary: "PDF generation failed.",
          error: error instanceof Error ? error.message : "PDF export failed.",
        });
      }
      continue;
    }

    artifacts.push(createSkippedArtifact(format, `No renderer is registered for ${format}.`));
  }

  if (artifacts.length === 0) {
    artifacts.push(createSkippedArtifact("html", "No output format was requested."));
  }

  if (!artifacts.some((artifact) => artifact.format === "slides-json")) {
    artifacts.push({
      id: "artifact-slide-preview",
      format: "slides-json",
      label: "Slide preview",
      status: "ready",
      summary: "Generated a reusable slide deck preview artifact.",
      mimeType: "text/html",
      filename: buildFilename(result.bundle.slidesBundle.title, "deck-preview.html"),
      textContent: renderSlideDeckHtml(result.bundle.slidesBundle, template),
      jsonContent: result.bundle.slidesBundle,
    });
  }

  return artifacts;
}
