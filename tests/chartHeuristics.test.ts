import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { chooseStoryVisual } from "../src/domain/reporting/chartHeuristics";
import { buildReportBrief } from "../src/domain/reporting/reportBrief";
import { buildReportPlan } from "../src/domain/planning/buildReportPlan";
import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";
import { ChartPlan } from "../src/shared/types";
import { createSalesSnapshot } from "./fixtures";

function createCharts(): ChartPlan[] {
  return [
    {
      id: "month-revenue",
      title: "Revenue by Month",
      kind: "line",
      categoryLabel: "Month",
      valueLabel: "Revenue",
      categories: ["2026-01", "2026-02"],
      values: [242200, 254400],
      insight: "Revenue increased across the observed periods.",
    },
    {
      id: "region-revenue",
      title: "Revenue by Region",
      kind: "column",
      categoryLabel: "Region",
      valueLabel: "Revenue",
      categories: ["North", "South"],
      values: [257500, 239100],
      insight: "The regional split is visible in a compact comparison.",
    },
    {
      id: "product-revenue",
      title: "Revenue by Product",
      kind: "column",
      categoryLabel: "Product",
      valueLabel: "Revenue",
      categories: ["Alpha", "Beta", "Gamma"],
      values: [90, 70, 40],
      insight: "A small product set makes composition the main question.",
    },
  ];
}

test("chooseStoryVisual uses data semantics to select trend, mix, and geography visuals", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt(
    "Create a dashboard focused on trend, product mix, and region performance.",
    { mode: "prompt-guided", variationSeed: 2 },
    "Monthly sales performance by region and product line."
  );
  const brief = buildReportBrief(snapshot, profile, prompt, {
    focusAreas: ["trend", "segmentation", "product", "geography"],
    geographicDimensions: ["Region"],
  });
  const plan = buildReportPlan(snapshot, profile, prompt, { mode: "prompt-guided", variationSeed: 2 });
  const charts = createCharts();

  const trendVisual = chooseStoryVisual(
    "trend-analysis",
    brief,
    profile,
    charts,
    plan.excel.kpis,
    "Revenue"
  );
  const productVisual = chooseStoryVisual(
    "product-mix",
    brief,
    profile,
    charts,
    plan.excel.kpis,
    "Revenue"
  );
  const geographyVisual = chooseStoryVisual(
    "geography",
    brief,
    profile,
    charts,
    plan.excel.kpis,
    "Revenue"
  );

  assert.equal(trendVisual.visualKind, "line");
  assert.equal(productVisual.visualKind, "donut");
  assert.equal(geographyVisual.visualKind, "map");
});
