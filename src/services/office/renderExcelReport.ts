import { DatasetProfile, PrimitiveCellValue, RangeSnapshot, ReportPlan } from "../../shared/types";

import { detectOfficeCapabilities } from "./capabilities";
import { buildExcelRenderPolicy, buildRenderComplexitySummary } from "./guardrails";

/* global Excel, Office */

export interface ExcelRenderResult {
  reportSheetName: string;
  detailSheetName: string;
  supportSheetName: string;
  notes: string[];
}

export async function renderExcelReport(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  plan: ReportPlan
): Promise<ExcelRenderResult> {
  return Excel.run(async (context) => {
    const capabilities = detectOfficeCapabilities(Office.HostType.Excel);
    const complexity = buildRenderComplexitySummary(profile, plan);
    const renderPolicy = buildExcelRenderPolicy(
      complexity.rowCount,
      complexity.columnCount,
      complexity.chartCount
    );
    const notes = [...renderPolicy.notes];

    if (!capabilities.excelApiSupported) {
      throw new Error(
        "This Excel host does not expose the required Excel API set for workbook report generation."
      );
    }

    if (!renderPolicy.allowRender) {
      throw new Error(renderPolicy.notes[0]);
    }

    const worksheets = context.workbook.worksheets;
    const workbookTables = context.workbook.tables;
    worksheets.load("items/name");
    workbookTables.load("items/name");
    await context.sync();

    const existingNames = new Set(worksheets.items.map((sheet) => sheet.name));
    const existingTableNames = new Set(workbookTables.items.map((table) => table.name));
    const reportSheetName = createUniqueName(plan.excel.reportSheetName, existingNames);
    const detailSheetName = createUniqueName(plan.excel.detailSheetName, existingNames);
    const supportSheetName = createUniqueName(
      `RF Support ${plan.excel.variationId + 1}`,
      existingNames
    );

    let reportSheet: Excel.Worksheet | null = null;
    let detailSheet: Excel.Worksheet | null = null;
    let supportSheet: Excel.Worksheet | null = null;

    try {
      reportSheet = worksheets.add(reportSheetName);
      detailSheet = worksheets.add(detailSheetName);
      supportSheet = worksheets.add(supportSheetName);
      supportSheet.visibility = Excel.SheetVisibility.hidden;

      const detailRows = buildDetailRows(
        snapshot,
        profile.hasHeaders,
        plan.excel.reportTableHeaders
      );
      const detailRange = detailSheet.getRangeByIndexes(
        0,
        0,
        detailRows.length,
        detailRows[0].length
      );
      detailRange.values = detailRows;
      detailRange.load("address");

      if (renderPolicy.applyDetailAutofit) {
        detailRange.format.autofitColumns();
        detailRange.format.autofitRows();
      }

      await context.sync();

      if (capabilities.workbookTables && renderPolicy.useDetailTable) {
        const detailTable = detailSheet.tables.add(detailRange.address, true);
        detailTable.name = createUniqueName(
          `RFDataTable${plan.excel.variationId + 1}`,
          existingTableNames
        );
        detailTable.style = "TableStyleMedium2";
      } else {
        notes.push("Detail data was written as a range instead of a table on this host.");
        styleDetailHeader(detailSheet, detailRows[0].length);
      }

      if (capabilities.freezePanes && renderPolicy.freezeHeader) {
        detailSheet.freezePanes.freezeRows(1);
      }

      renderHeader(reportSheet, plan.title, plan.subtitle, plan.excel.theme.accent);
      const effectivePlan =
        capabilities.charts && renderPolicy.maxCharts > 0
          ? {
              ...plan,
              excel: {
                ...plan.excel,
                charts: plan.excel.charts.slice(0, renderPolicy.maxCharts),
              },
            }
          : {
              ...plan,
              excel: {
                ...plan.excel,
                charts: [],
              },
            };

      if (!capabilities.charts && plan.excel.charts.length > 0) {
        notes.push("Chart automation was skipped because this Excel host does not support it.");
      }

      let cursorRow = 6;
      for (const section of effectivePlan.excel.sectionOrder) {
        if (section === "hero") {
          continue;
        }

        if (section === "summary") {
          cursorRow = renderSummarySection(reportSheet, cursorRow, effectivePlan);
        } else if (section === "kpis") {
          cursorRow = renderKpiSection(reportSheet, cursorRow, effectivePlan);
        } else if (section === "charts") {
          cursorRow = await renderChartSection(
            reportSheet,
            supportSheet,
            cursorRow,
            effectivePlan,
            context
          );
        } else if (section === "detailTable") {
          cursorRow = renderTablePreview(reportSheet, cursorRow, effectivePlan, renderPolicy);
        } else if (section === "recommendations") {
          cursorRow = renderRecommendations(reportSheet, cursorRow, effectivePlan);
        }
      }

      if (renderPolicy.applyReportAutofit) {
        reportSheet.getUsedRange().format.autofitColumns();
        reportSheet.getUsedRange().format.autofitRows();
      }
      reportSheet.activate();

      await context.sync();
    } catch (error) {
      try {
        reportSheet?.delete();
        detailSheet?.delete();
        supportSheet?.delete();
        await context.sync();
      } catch {
        // Ignore cleanup failures and surface the original render error.
      }

      throw error;
    }

    return {
      reportSheetName,
      detailSheetName,
      supportSheetName,
      notes,
    };
  });
}

function createUniqueName(baseName: string, existingNames: Set<string>): string {
  let candidate = baseName;
  let suffix = 2;
  while (existingNames.has(candidate)) {
    candidate = `${baseName} ${suffix}`;
    suffix += 1;
  }
  existingNames.add(candidate);
  return candidate;
}

function buildDetailRows(
  snapshot: RangeSnapshot,
  hasHeaders: boolean,
  headers: string[]
): Array<Array<string | number | boolean>> {
  const startRow = hasHeaders ? 1 : 0;
  const rows = snapshot.values
    .slice(startRow)
    .map((row) => headers.map((_, index) => normalizeForExcel(row[index] ?? null)));

  return [headers, ...rows];
}

function normalizeForExcel(value: PrimitiveCellValue): string | number | boolean {
  if (value === null || value === undefined) {
    return "";
  }

  return value;
}

function styleDetailHeader(sheet: Excel.Worksheet, columnCount: number): void {
  const headerRange = sheet.getRangeByIndexes(0, 0, 1, columnCount);
  headerRange.format.fill.color = "#e4f3f0";
  headerRange.format.font.bold = true;
  headerRange.format.font.color = "#0f766e";
}

function renderHeader(
  sheet: Excel.Worksheet,
  title: string,
  subtitle: string,
  accent: string
): void {
  const titleRange = sheet.getRange("A1:H2");
  writeMergedText(titleRange, title);
  titleRange.format.fill.color = accent;
  titleRange.format.font.color = "#ffffff";
  titleRange.format.font.size = 20;
  titleRange.format.font.bold = true;
  titleRange.format.wrapText = true;

  const subtitleRange = sheet.getRange("A3:H4");
  writeMergedText(subtitleRange, subtitle);
  subtitleRange.format.fill.color = "#f4fbfa";
  subtitleRange.format.font.color = "#35585c";
  subtitleRange.format.wrapText = true;
}

function renderSummarySection(sheet: Excel.Worksheet, row: number, plan: ReportPlan): number {
  writeSectionTitle(sheet, row, "Summary");
  let cursor = row + 1;

  for (const paragraph of plan.excel.summaryParagraphs) {
    const range = sheet.getRange(`A${cursor}:H${cursor + 1}`);
    writeMergedText(range, paragraph);
    range.format.wrapText = true;
    range.format.fill.color = "#ffffff";
    range.format.font.color = "#35585c";
    cursor += 3;
  }

  return cursor;
}

function renderKpiSection(sheet: Excel.Worksheet, row: number, plan: ReportPlan): number {
  writeSectionTitle(sheet, row, "KPI Scorecard");
  let cursor = row + 1;
  const kpis = plan.excel.kpis.slice(0, 4);

  kpis.forEach((kpi, index) => {
    const topRow = cursor + Math.floor(index / 2) * 4;
    const leftColumn = index % 2 === 0 ? "A" : "E";
    const rightColumn = index % 2 === 0 ? "D" : "H";
    const range = sheet.getRange(`${leftColumn}${topRow}:${rightColumn}${topRow + 2}`);
    writeMergedText(range, `${kpi.label}\n${kpi.formattedValue}\n${kpi.insight}`);
    range.format.fill.color = "#f8fbfb";
    range.format.font.color = "#17353a";
    range.format.wrapText = true;
    range.format.borders.getItem("EdgeBottom").color = plan.excel.theme.border;
  });

  return cursor + Math.ceil(kpis.length / 2) * 4;
}

async function renderChartSection(
  reportSheet: Excel.Worksheet,
  supportSheet: Excel.Worksheet,
  row: number,
  plan: ReportPlan,
  context: Excel.RequestContext
): Promise<number> {
  writeSectionTitle(reportSheet, row, "Charts");
  if (plan.excel.charts.length === 0) {
    const emptyRange = reportSheet.getRange(`A${row + 1}:H${row + 2}`);
    writeMergedText(
      emptyRange,
      "No dimension/measure pair was strong enough for chart automation."
    );
    emptyRange.format.fill.color = "#fff8ef";
    emptyRange.format.font.color = "#8a6130";
    return row + 4;
  }

  const chartRow = row + 1;
  let supportRow = 1;
  const queuedCharts: Array<{
    chart: ReportPlan["excel"]["charts"][number];
    startCell: string;
    endCell: string;
    supportRange: Excel.Range;
  }> = [];

  for (const [index, chart] of plan.excel.charts.entries()) {
    const supportValues = [
      [chart.categoryLabel, chart.valueLabel],
      ...chart.categories.map((category, pointIndex) => [category, chart.values[pointIndex]]),
    ];
    const supportRange = supportSheet.getRangeByIndexes(supportRow - 1, 0, supportValues.length, 2);
    supportRange.values = supportValues;
    supportRange.load("address");
    const startColumn = index % 2 === 0 ? "A" : "E";
    const endColumn = index % 2 === 0 ? "D" : "H";
    const startRow = chartRow + Math.floor(index / 2) * 14;
    queuedCharts.push({
      chart,
      startCell: `${startColumn}${startRow}`,
      endCell: `${endColumn}${startRow + 11}`,
      supportRange,
    });
    supportRow += supportValues.length + 2;
  }

  await context.sync();

  for (const queuedChart of queuedCharts) {
    const excelChart = reportSheet.charts.add(
      mapChartType(queuedChart.chart.kind),
      queuedChart.supportRange,
      Excel.ChartSeriesBy.columns
    );
    excelChart.title.text = queuedChart.chart.title;
    excelChart.legend.position = Excel.ChartLegendPosition.right;
    excelChart.setPosition(queuedChart.startCell, queuedChart.endCell);
  }

  return chartRow + Math.ceil(plan.excel.charts.length / 2) * 14;
}

function mapChartType(kind: string): Excel.ChartType {
  if (kind === "line") {
    return Excel.ChartType.line;
  }

  if (kind === "doughnut") {
    return Excel.ChartType.doughnut;
  }

  return Excel.ChartType.columnClustered;
}

function renderTablePreview(
  sheet: Excel.Worksheet,
  row: number,
  plan: ReportPlan,
  renderPolicy: { applyDetailAutofit: boolean }
): number {
  writeSectionTitle(sheet, row, "Table Preview");
  const previewRows = [plan.excel.reportTableHeaders, ...plan.excel.reportTableRows.slice(0, 8)];
  const tableRange = sheet.getRangeByIndexes(
    row,
    0,
    previewRows.length,
    Math.min(previewRows[0].length, 8)
  );
  tableRange.values = previewRows.map((previewRow) => previewRow.slice(0, 8));
  if (renderPolicy.applyDetailAutofit) {
    tableRange.format.autofitColumns();
    tableRange.format.autofitRows();
  }
  tableRange.format.borders.getItem("InsideHorizontal").color = "#d7e8e6";
  return row + previewRows.length + 2;
}

function renderRecommendations(sheet: Excel.Worksheet, row: number, plan: ReportPlan): number {
  writeSectionTitle(sheet, row, "Recommendations");
  let cursor = row + 1;
  plan.recommendations.forEach((recommendation) => {
    const range = sheet.getRange(`A${cursor}:H${cursor}`);
    writeMergedText(range, `• ${recommendation}`);
    range.format.font.color = "#35585c";
    cursor += 1;
  });

  return cursor + 1;
}

function writeSectionTitle(sheet: Excel.Worksheet, row: number, title: string): void {
  const range = sheet.getRange(`A${row}:H${row}`);
  writeMergedText(range, title);
  range.format.fill.color = "#e4f3f0";
  range.format.font.color = "#0f766e";
  range.format.font.bold = true;
}

export function writeMergedText(
  range: Pick<Excel.Range, "merge" | "getCell">,
  value: string
): void {
  range.merge();
  range.getCell(0, 0).values = [[value]];
}
