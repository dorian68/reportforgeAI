import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { buildReportPlan } from "../src/domain/planning/buildReportPlan";
import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";
import { createSalesSnapshot } from "./fixtures";

test("buildReportPlan creates an executive plan with section order and workbook naming", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt("Make this an executive monthly report and put KPIs at the top.", {
    mode: "prompt-guided",
    variationSeed: 4,
  });

  const plan = buildReportPlan(snapshot, profile, prompt, {
    mode: "prompt-guided",
    variationSeed: 4,
  });

  assert.equal(plan.title.startsWith("Revenue improved"), true);
  assert.equal((plan.executiveSummary?.length ?? 0) > 0, true);
  assert.equal((plan.findings?.length ?? 0) > 0, true);
  assert.deepEqual(plan.excel.sectionOrder.slice(0, 3), ["hero", "kpis", "summary"]);
  assert.equal(plan.excel.reportSheetName.startsWith("RF Report"), true);
  assert.equal(plan.excel.kpis.length > 0, true);
});
