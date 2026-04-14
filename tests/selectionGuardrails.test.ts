import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { buildExcelRenderPolicy, evaluateSelectionPreflight } from "../src/services/office/guardrails";
import { createSalesSnapshot } from "./fixtures";

test("selection preflight allows, confirms, and blocks by policy size", () => {
  const safe = evaluateSelectionPreflight({
    address: "A1:D10",
    sheetName: "Sheet1",
    startRowIndex: 0,
    startColumnIndex: 0,
    rowCount: 10,
    columnCount: 4,
    cellCount: 40,
  });
  const confirm = evaluateSelectionPreflight({
    address: "A1:AD2500",
    sheetName: "Sheet1",
    startRowIndex: 0,
    startColumnIndex: 0,
    rowCount: 2500,
    columnCount: 30,
    cellCount: 75000,
  });
  const blocked = evaluateSelectionPreflight({
    address: "A1:AZ6000",
    sheetName: "Sheet1",
    startRowIndex: 0,
    startColumnIndex: 0,
    rowCount: 6000,
    columnCount: 52,
    cellCount: 312000,
  });

  assert.equal(safe.decision, "allow");
  assert.equal(confirm.decision, "confirm");
  assert.equal(blocked.decision, "block");
});

test("render policy reduces expensive workbook operations on larger selections", () => {
  const safePolicy = buildExcelRenderPolicy(40, 6, 3);
  const largePolicy = buildExcelRenderPolicy(3000, 20, 4);
  const blockedPolicy = buildExcelRenderPolicy(6000, 60, 3);

  assert.equal(safePolicy.allowRender, true);
  assert.equal(safePolicy.maxCharts > 0, true);
  assert.equal(largePolicy.allowRender, true);
  assert.equal(largePolicy.maxCharts <= 2, true);
  assert.equal(blockedPolicy.allowRender, false);
});

test("profileRangeData handles large numeric columns without spread-based failures", () => {
  const snapshot = createSalesSnapshot();
  const largeSnapshot = {
    ...snapshot,
    rowCount: 15001,
    text: [snapshot.text[0], ...Array.from({ length: 15000 }, (_, index) => [
      `Region ${index + 1}`,
      `${1000 + index}`,
      `${500 + index}`,
      `${500 + index}`,
      `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
    ])],
    values: [snapshot.values[0], ...Array.from({ length: 15000 }, (_, index) => [
      `Region ${index + 1}`,
      1000 + index,
      500 + index,
      500 + index,
      `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
    ])],
    numberFormats: [snapshot.numberFormats[0], ...Array.from({ length: 15000 }, () => [
      "@",
      "#,##0.00",
      "#,##0.00",
      "#,##0.00",
      "yyyy-mm-dd",
    ])],
  };

  const profile = profileRangeData(largeSnapshot);
  assert.equal(
    (profile.columns.find((column) => column.header === "Revenue")?.numericSummary?.max ?? 0) > 0,
    true
  );
});
