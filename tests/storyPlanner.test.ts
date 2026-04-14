import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { buildReportBrief } from "../src/domain/reporting/reportBrief";
import { planStoryPages } from "../src/domain/reporting/storyPlanner";
import { buildReportPlan } from "../src/domain/planning/buildReportPlan";
import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";
import { createSalesSnapshot } from "./fixtures";

test("planStoryPages builds a diverse story with a recommendation close", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt(
    "Create a board-ready sales review with trends, regional comparisons, and a clear action close.",
    { mode: "prompt-guided", variationSeed: 5 },
    "Monthly sales performance by region and product line."
  );
  const plan = buildReportPlan(snapshot, profile, prompt, { mode: "prompt-guided", variationSeed: 5 });
  const brief = buildReportBrief(snapshot, profile, prompt);

  const pages = planStoryPages({
    brief,
    profile,
    findings: plan.findings ?? [],
    kpis: plan.excel.kpis,
    charts: plan.excel.charts,
    maxPages: 6,
  });

  assert.equal(pages[0]?.purpose, "executive-summary");
  assert.equal(pages[pages.length - 1]?.purpose, "recommendation");
  assert.equal(pages.some((page) => page.purpose === "trend-analysis"), true);
  assert.equal(
    pages.some((page) => page.purpose === "segment-comparison" || page.purpose === "geography"),
    true
  );

  for (let index = 1; index < pages.length; index += 1) {
    assert.notEqual(pages[index - 1].purpose, pages[index].purpose);
    assert.notEqual(pages[index - 1].layoutFamily, pages[index].layoutFamily);
  }
});
