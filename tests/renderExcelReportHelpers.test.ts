import assert from "node:assert/strict";
import test from "node:test";

import { writeMergedText } from "../src/services/office/renderExcelReport";

test("writeMergedText writes through the top-left cell after merging", () => {
  let merged = false;
  const target = {
    values: [] as string[][],
  };

  writeMergedText(
    {
      merge: () => {
        merged = true;
      },
      getCell: (row: number, column: number) => {
        assert.equal(row, 0);
        assert.equal(column, 0);
        return target as unknown as Excel.Range;
      },
    },
    "Executive Monthly Performance Report"
  );

  assert.equal(merged, true);
  assert.deepEqual(target.values, [["Executive Monthly Performance Report"]]);
});
