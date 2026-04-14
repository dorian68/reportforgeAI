import { DEFAULT_SLIDE_COUNT, EXCEL_SELECTION_GUARDRAILS } from "../../shared/constants";
import { RangeSnapshot } from "../../shared/types";
import { slugify } from "../../utils/formatting";
import {
  NormalizedReportRequest,
  ReportAudience,
  ReportFormat,
  ReportObjective,
  ReportRequest,
  ReportTone,
  StructuredDatasetInput,
} from "../domain/types";

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizeAudience(value: ReportAudience | undefined): ReportAudience {
  return value ?? "general";
}

function normalizeObjective(value: ReportObjective | undefined): ReportObjective {
  return value ?? "summarize";
}

function normalizeTone(value: ReportTone | undefined): ReportTone {
  return value ?? "executive";
}

function normalizeFormats(values: ReportFormat[] | undefined): ReportFormat[] {
  const formats = values?.filter(Boolean) ?? [];
  return formats.length > 0 ? Array.from(new Set(formats)) : ["html", "pptx", "email-html"];
}

function toColumnLabel(columnNumber: number): string {
  let value = columnNumber;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label || "A";
}

function createSnapshotFromDataset(dataset: StructuredDatasetInput): RangeSnapshot {
  const headers = dataset.headers.map((header, index) => header.trim() || `Column ${index + 1}`);
  const values = [headers, ...dataset.rows];
  const rowCount = values.length;
  const columnCount = headers.length;
  const address = `A1:${toColumnLabel(Math.max(1, columnCount))}${rowCount}`;

  return {
    address,
    sheetName:
      dataset.sheetName?.trim() || slugify(dataset.sourceLabel || "reporting-engine") || "Sheet1",
    workbookName: dataset.workbookName?.trim() || "Reporting Engine",
    rowCount,
    columnCount,
    values,
    text: values.map((row) => row.map((cell) => (cell == null ? "" : String(cell)))),
    numberFormats: values.map((row, rowIndex) =>
      row.map((_, columnIndex) =>
        rowIndex === 0 || typeof dataset.rows[rowIndex - 1]?.[columnIndex] !== "number"
          ? "@"
          : "#,##0.00"
      )
    ),
    capturedAt: dataset.capturedAt?.trim() || nowIso(),
  };
}

function validateSnapshot(snapshot: RangeSnapshot, maxRows: number): void {
  if (snapshot.rowCount < 2 || snapshot.columnCount < 1) {
    throw new Error("The reporting engine needs at least one header row and one data row.");
  }

  if (snapshot.rowCount > maxRows) {
    throw new Error(
      `The dataset has ${snapshot.rowCount.toLocaleString()} rows, above the current engine limit of ${maxRows.toLocaleString()}.`
    );
  }

  if (snapshot.columnCount > EXCEL_SELECTION_GUARDRAILS.confirmMaxColumns) {
    throw new Error(
      `The dataset has ${snapshot.columnCount} columns, above the current engine limit of ${EXCEL_SELECTION_GUARDRAILS.confirmMaxColumns}.`
    );
  }
}

export function validateAndNormalizeReportRequest(request: ReportRequest): NormalizedReportRequest {
  const mode = request.options?.mode ?? "prompt-guided";
  const variationSeed = request.options?.variationSeed ?? 0;
  const maxRows = request.options?.maxRows ?? EXCEL_SELECTION_GUARDRAILS.confirmMaxRows;
  const audience = normalizeAudience(request.context.audience);
  const objective = normalizeObjective(request.context.objective);
  const tone = normalizeTone(request.context.tone);
  const preferredFormats = normalizeFormats(request.context.preferredFormats);
  const maxSlides = Math.min(Math.max(request.context.maxSlides ?? DEFAULT_SLIDE_COUNT, 3), 12);
  const promptText = normalizeText(request.context.prompt);
  const businessContext = normalizeText(request.context.businessContext);
  const language = normalizeText(request.context.language) || "en";
  const requestId =
    normalizeText(request.options?.requestId) ||
    `reporting-engine-${slugify(`${audience}-${objective}`) || "request"}-${Date.now()}`;

  let sourceSnapshot: RangeSnapshot;
  let existingBundle = null;
  let profile = null;

  if (request.source.kind === "snapshot") {
    sourceSnapshot = request.source.snapshot;
  } else if (request.source.kind === "dataset") {
    sourceSnapshot = createSnapshotFromDataset(request.source.dataset);
  } else {
    existingBundle = request.source.bundle;
    profile = request.source.bundle.profile;
    sourceSnapshot = request.source.bundle.snapshot;
  }

  validateSnapshot(sourceSnapshot, maxRows);

  return {
    sourceSnapshot,
    existingBundle,
    profile,
    promptText,
    businessContext,
    brief: request.context.brief,
    audience,
    objective,
    tone,
    language,
    preferredFormats,
    maxSlides,
    mode,
    variationSeed,
    enableLlm: request.options?.enableLlm ?? true,
    llmConfig: request.options?.llmConfig,
    llmSecret: request.options?.llmSecret,
    designIntent: request.options?.designIntent,
    canvasDocument: request.options?.canvasDocument,
    designSpec: request.options?.designSpec,
    requestId,
  };
}
