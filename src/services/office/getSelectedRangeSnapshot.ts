import { RangeSelectionPreflight, RangeSnapshot } from "../../shared/types";

/* global Excel */

export async function inspectSelectedRange(): Promise<
  Omit<RangeSelectionPreflight, "decision" | "messages">
> {
  return Excel.run(async (context) => {
    const worksheet = context.workbook.worksheets.getActiveWorksheet();
    const range = context.workbook.getSelectedRange();

    worksheet.load("name");
    range.load(["address", "rowIndex", "columnIndex", "rowCount", "columnCount"]);

    await context.sync();

    return {
      address: range.address,
      sheetName: worksheet.name,
      startRowIndex: range.rowIndex,
      startColumnIndex: range.columnIndex,
      rowCount: range.rowCount,
      columnCount: range.columnCount,
      cellCount: range.rowCount * range.columnCount,
    };
  });
}

export async function getSelectedRangeSnapshot(): Promise<RangeSnapshot> {
  return Excel.run(async (context) => {
    const worksheet = context.workbook.worksheets.getActiveWorksheet();
    const range = context.workbook.getSelectedRange();

    worksheet.load("name");
    range.load([
      "address",
      "rowIndex",
      "columnIndex",
      "rowCount",
      "columnCount",
      "values",
      "text",
      "numberFormat",
    ]);

    await context.sync();

    return {
      address: range.address,
      sheetName: worksheet.name,
      startRowIndex: range.rowIndex,
      startColumnIndex: range.columnIndex,
      rowCount: range.rowCount,
      columnCount: range.columnCount,
      values: range.values as RangeSnapshot["values"],
      text: range.text as string[][],
      numberFormats: range.numberFormat as string[][],
      capturedAt: new Date().toISOString(),
    };
  });
}
