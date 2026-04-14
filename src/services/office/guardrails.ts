import { EXCEL_RENDER_GUARDRAILS, EXCEL_SELECTION_GUARDRAILS } from "../../shared/constants";
import {
  DatasetProfile,
  ExcelRenderPolicy,
  RangeSelectionPreflight,
  ReportPlan,
} from "../../shared/types";

export function evaluateSelectionPreflight(
  meta: Omit<RangeSelectionPreflight, "decision" | "messages">
): RangeSelectionPreflight {
  const { rowCount, columnCount, cellCount } = meta;
  const messages: string[] = [];
  let decision: RangeSelectionPreflight["decision"] = "allow";

  if (
    rowCount > EXCEL_SELECTION_GUARDRAILS.confirmMaxRows ||
    columnCount > EXCEL_SELECTION_GUARDRAILS.confirmMaxColumns ||
    cellCount > EXCEL_SELECTION_GUARDRAILS.confirmMaxCells
  ) {
    decision = "block";
    messages.push(
      `This selection is too large for safe analysis (${rowCount.toLocaleString()} rows x ${columnCount.toLocaleString()} columns). Narrow the range before continuing.`
    );
  } else if (
    rowCount > EXCEL_SELECTION_GUARDRAILS.safeMaxRows ||
    columnCount > EXCEL_SELECTION_GUARDRAILS.safeMaxColumns ||
    cellCount > EXCEL_SELECTION_GUARDRAILS.safeMaxCells
  ) {
    decision = "confirm";
    messages.push(
      `This selection is larger than the normal safe profile (${rowCount.toLocaleString()} rows x ${columnCount.toLocaleString()} columns). Analyze only if you accept slower performance.`
    );
  }

  return {
    ...meta,
    decision,
    messages,
  };
}

export function buildExcelRenderPolicy(
  rowCount: number,
  columnCount: number,
  chartCount: number
): ExcelRenderPolicy {
  const cellCount = rowCount * columnCount;
  const notes: string[] = [];

  if (
    rowCount > EXCEL_RENDER_GUARDRAILS.maxRows ||
    columnCount > EXCEL_RENDER_GUARDRAILS.maxColumns ||
    cellCount > EXCEL_RENDER_GUARDRAILS.maxCells
  ) {
    return {
      allowRender: false,
      useDetailTable: false,
      freezeHeader: false,
      applyDetailAutofit: false,
      applyReportAutofit: false,
      maxCharts: 0,
      notes: [
        `Workbook report generation is blocked for selections larger than ${EXCEL_RENDER_GUARDRAILS.maxRows.toLocaleString()} rows, ${EXCEL_RENDER_GUARDRAILS.maxColumns} columns, or ${EXCEL_RENDER_GUARDRAILS.maxCells.toLocaleString()} cells.`,
      ],
    };
  }

  const applyDetailAutofit = cellCount <= EXCEL_RENDER_GUARDRAILS.detailAutofitCellLimit;
  const applyReportAutofit = cellCount <= EXCEL_RENDER_GUARDRAILS.reportAutofitCellLimit;
  const canKeepCharts = cellCount <= EXCEL_RENDER_GUARDRAILS.chartCellLimit;
  const maxCharts = canKeepCharts ? Math.min(chartCount, EXCEL_RENDER_GUARDRAILS.maxCharts) : 0;

  if (!applyDetailAutofit || !applyReportAutofit) {
    notes.push(
      "Autofit was reduced for this workbook render to avoid Excel slowdowns on larger selections."
    );
  }

  if (maxCharts < chartCount) {
    notes.push("Chart automation was reduced to keep the workbook render stable.");
  }

  return {
    allowRender: true,
    useDetailTable: cellCount <= EXCEL_RENDER_GUARDRAILS.maxCells,
    freezeHeader: true,
    applyDetailAutofit,
    applyReportAutofit,
    maxCharts,
    notes,
  };
}

export function buildRenderComplexitySummary(
  profile: DatasetProfile,
  plan: ReportPlan
): { rowCount: number; columnCount: number; chartCount: number } {
  return {
    rowCount: profile.dataRowCount + 1,
    columnCount: profile.columnCount,
    chartCount: plan.excel.charts.length,
  };
}
