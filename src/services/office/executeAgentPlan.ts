import {
  AgentPlan,
  AgentPlanStep,
  DatasetProfile,
  RangeSnapshot,
  ReportPlan,
} from "../../shared/types";
import { EXCEL_RENDER_GUARDRAILS } from "../../shared/constants";

import { ExcelRenderResult, renderExcelReport } from "./renderExcelReport";
import { detectOfficeCapabilities } from "./capabilities";
import { buildExcelRenderPolicy } from "./guardrails";

/* global Excel, Office */

export interface AgentExecutionStepResult {
  stepId: string;
  title: string;
  status: "completed" | "failed" | "skipped";
  message: string;
}

export interface AgentExecutionResult {
  startedAt: string;
  finishedAt: string;
  stepResults: AgentExecutionStepResult[];
  reportResult: ExcelRenderResult | null;
}

export async function executeAgentPlan(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  reportPlan: ReportPlan,
  plan: AgentPlan
): Promise<AgentExecutionResult> {
  const startedAt = new Date().toISOString();
  const stepResults: AgentExecutionStepResult[] = [];
  let reportResult: ExcelRenderResult | null = null;

  for (const step of plan.steps) {
    try {
      if (step.kind === "generate-workbook-report") {
        reportResult = await renderExcelReport(snapshot, profile, reportPlan);
        stepResults.push({
          stepId: step.id,
          title: step.title,
          status: "completed",
          message: `Workbook report created in ${reportResult.reportSheetName} and ${reportResult.detailSheetName}.`,
        });
        continue;
      }

      const message = await executeWorkbookStep(snapshot, profile, step);
      stepResults.push({
        stepId: step.id,
        title: step.title,
        status: "completed",
        message,
      });
    } catch (error) {
      stepResults.push({
        stepId: step.id,
        title: step.title,
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    stepResults,
    reportResult,
  };
}

async function executeWorkbookStep(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  step: AgentPlanStep
): Promise<string> {
  if (step.kind === "structure-source-table") {
    return structureSourceSelectionAsTable(snapshot, profile);
  }

  if (step.kind === "format-source-range") {
    return formatSourceSelection(snapshot, profile);
  }

  if (step.kind === "freeze-source-header") {
    return freezeSourceHeader(snapshot, profile);
  }

  return "Step skipped because the action is not supported in this MVP.";
}

async function structureSourceSelectionAsTable(
  snapshot: RangeSnapshot,
  profile: DatasetProfile
): Promise<string> {
  const capabilities = detectOfficeCapabilities(Office.HostType.Excel);
  if (!capabilities.workbookTables) {
    return "Table creation is unavailable on this Excel host, so the selection was left as a range.";
  }

  return Excel.run(async (context) => {
    const worksheet = context.workbook.worksheets.getItem(snapshot.sheetName);
    const localAddress = toLocalAddress(snapshot.address);
    const workbookTables = context.workbook.tables;
    workbookTables.load("items/name");
    await context.sync();
    const renderPolicy = buildExcelRenderPolicy(snapshot.rowCount, snapshot.columnCount, 0);
    if (!renderPolicy.allowRender) {
      throw new Error(renderPolicy.notes[0]);
    }

    try {
      const nextTable = worksheet.tables.add(localAddress, profile.hasHeaders);
      nextTable.name = createUniqueWorkbookTableName(
        workbookTables.items.map((table) => table.name)
      );
      nextTable.style = "TableStyleMedium2";

      if (renderPolicy.applyDetailAutofit) {
        nextTable.getRange().format.autofitColumns();
        nextTable.getRange().format.autofitRows();
      }
      await context.sync();

      return `Selection structured as Excel table ${nextTable.name}.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/table/i.test(message) && /(overlap|already|another table|invalid)/i.test(message)) {
        return "Selection already overlaps an Excel table or cannot be converted into a table on this host.";
      }

      throw error;
    }
  });
}

async function formatSourceSelection(
  snapshot: RangeSnapshot,
  profile: DatasetProfile
): Promise<string> {
  const renderPolicy = buildExcelRenderPolicy(snapshot.rowCount, snapshot.columnCount, 0);
  if (!renderPolicy.allowRender) {
    throw new Error(renderPolicy.notes[0]);
  }

  return Excel.run(async (context) => {
    const worksheet = context.workbook.worksheets.getItem(snapshot.sheetName);
    const range = worksheet.getRange(toLocalAddress(snapshot.address));

    if (profile.hasHeaders) {
      const headerRange = range.getRow(0);
      headerRange.format.fill.color = "#e4f3f0";
      headerRange.format.font.bold = true;
      headerRange.format.font.color = "#0f766e";
      headerRange.format.wrapText = true;
    }

    const shouldApplyNumberFormats =
      snapshot.rowCount * snapshot.columnCount <= EXCEL_RENDER_GUARDRAILS.numberFormatCellLimit;

    if (profile.dataRowCount > 0 && shouldApplyNumberFormats) {
      const dataRowOffset = profile.hasHeaders ? 1 : 0;
      for (const column of profile.columns) {
        if (column.kind !== "numeric" && column.kind !== "date") {
          continue;
        }

        const topCell = range.getCell(dataRowOffset, column.index);
        const dataRange = topCell.getResizedRange(profile.dataRowCount - 1, 0);
        dataRange.numberFormat = buildNumberFormatGrid(
          profile.dataRowCount,
          getColumnNumberFormat(column.header, column.kind)
        );
      }
    }

    if (renderPolicy.applyDetailAutofit) {
      range.format.autofitColumns();
      range.format.autofitRows();
    }
    await context.sync();

    return shouldApplyNumberFormats
      ? "Selection formatting updated with header styling, autofit, and data-aware number formats."
      : "Selection formatting updated with header styling. Autofit and per-cell number formatting were reduced for stability on this larger range.";
  });
}

async function freezeSourceHeader(
  snapshot: RangeSnapshot,
  profile: DatasetProfile
): Promise<string> {
  if (!profile.hasHeaders) {
    return "Header freeze skipped because no header row was detected clearly.";
  }

  const capabilities = detectOfficeCapabilities(Office.HostType.Excel);
  if (!capabilities.freezePanes) {
    return "Header freeze is unavailable on this Excel host.";
  }

  return Excel.run(async (context) => {
    const worksheet = context.workbook.worksheets.getItem(snapshot.sheetName);

    if (typeof snapshot.startRowIndex === "number") {
      const freezeTarget = worksheet.getRangeByIndexes(snapshot.startRowIndex + 1, 0, 1, 1);
      worksheet.freezePanes.freezeAt(freezeTarget);
    } else {
      worksheet.freezePanes.freezeRows(1);
    }

    await context.sync();
    return "Header row frozen on the source worksheet.";
  });
}

function toLocalAddress(address: string): string {
  return address.includes("!") ? address.split("!").slice(1).join("!") : address;
}

function createUniqueWorkbookTableName(existingNames: string[]): string {
  const existing = new Set(existingNames);
  let suffix = 1;
  let candidate = `RFSourceTable${suffix}`;

  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `RFSourceTable${suffix}`;
  }

  return candidate;
}

function buildNumberFormatGrid(rowCount: number, format: string): string[][] {
  return Array.from({ length: rowCount }, () => [format]);
}

function getColumnNumberFormat(
  header: string,
  kind: DatasetProfile["columns"][number]["kind"]
): string {
  if (kind === "date") {
    return "yyyy-mm-dd";
  }

  if (header.includes("%")) {
    return "0.0%";
  }

  return "#,##0.00";
}
