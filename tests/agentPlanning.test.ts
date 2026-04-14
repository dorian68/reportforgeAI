import assert from "node:assert/strict";
import test from "node:test";

import { planAgentActions } from "../src/domain/agent/planAgentActions";
import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { createSalesSnapshot } from "./fixtures";

test("planAgentActions builds a bounded reporting workflow from an executive prompt", () => {
  const snapshot = createSalesSnapshot();
  const bundle = createReportBundle(
    snapshot,
    "Make this an executive monthly report with KPI blocks at the top and charts below.",
    {
      mode: "prompt-guided",
      variationSeed: 2,
    }
  );

  const plan = planAgentActions(
    "Prepare this selection for a board report: structure it as a table, format it, freeze the header row, and generate the report.",
    snapshot,
    bundle.profile,
    bundle.plan
  );

  assert.equal(plan.steps.length, 4);
  assert.deepEqual(
    plan.steps.map((step) => step.kind),
    [
      "structure-source-table",
      "format-source-range",
      "freeze-source-header",
      "generate-workbook-report",
    ]
  );
  assert.equal(plan.warnings.length, 0);
});

test("planAgentActions ignores destructive asks and stays within safe reporting actions", () => {
  const snapshot = createSalesSnapshot();
  const bundle = createReportBundle(snapshot, "Create a simple report.", {
    mode: "automatic",
    variationSeed: 1,
  });

  const plan = planAgentActions(
    "Delete the messy parts, remove bad rows, then format this selection professionally.",
    snapshot,
    bundle.profile,
    bundle.plan
  );

  assert.equal(plan.steps.some((step) => step.kind === "format-source-range"), true);
  assert.equal(plan.steps.some((step) => step.kind === "generate-workbook-report"), false);
  assert.equal(
    plan.warnings.some((warning) => warning.includes("Destructive actions were requested")),
    true
  );
});
