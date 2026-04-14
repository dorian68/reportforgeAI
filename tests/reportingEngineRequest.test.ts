import assert from "node:assert/strict";
import test from "node:test";

import { validateAndNormalizeReportRequest } from "../src/reporting-engine/schemas/validateRequest";

test("reporting engine request normalization builds a snapshot from dataset input", () => {
  const normalized = validateAndNormalizeReportRequest({
    source: {
      kind: "dataset",
      dataset: {
        sourceLabel: "Revenue Demo",
        headers: ["Month", "Revenue", "Cost"],
        rows: [
          ["2026-01", 120000, 80000],
          ["2026-02", 131500, 84500],
        ],
      },
    },
    context: {
      businessContext: "Monthly sales performance by region and product line.",
      audience: "client",
      objective: "recommend",
    },
  });

  assert.equal(normalized.sourceSnapshot.rowCount, 3);
  assert.equal(normalized.sourceSnapshot.columnCount, 3);
  assert.equal(normalized.audience, "client");
  assert.equal(normalized.businessContext, "Monthly sales performance by region and product line.");
  assert.deepEqual(normalized.preferredFormats, ["html", "pptx", "email-html"]);
});

test("reporting engine request validation blocks oversized datasets", () => {
  assert.throws(
    () =>
      validateAndNormalizeReportRequest({
        source: {
          kind: "dataset",
          dataset: {
            sourceLabel: "Huge Dataset",
            headers: ["Month", "Revenue"],
            rows: Array.from({ length: 6000 }, (_, index) => [`2026-${index + 1}`, index]),
          },
        },
        context: {},
      }),
    /current engine limit/i
  );
});
