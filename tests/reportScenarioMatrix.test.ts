import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { buildReportPlan } from "../src/domain/planning/buildReportPlan";
import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";
import { createSalesSnapshot, createSupportSnapshot } from "./fixtures";

test("createReportBundle keeps qualitative sparse datasets useful with fallback KPIs", () => {
  const bundle = createReportBundle(
    createSupportSnapshot(),
    "Create a concise operations report for weekly review.",
    {
      mode: "prompt-guided",
      variationSeed: 3,
    }
  );

  assert.equal(bundle.profile.primaryMeasures.length, 0);
  assert.equal(bundle.profile.chartCandidates.length, 0);
  assert.deepEqual(
    bundle.plan.excel.kpis.map((kpi) => kpi.label),
    ["Rows Analyzed", "Completeness"]
  );
  assert.equal(
    bundle.plan.recommendations.some((item) => item.includes("unlock richer charting")),
    true
  );
  assert.equal(bundle.emailBundle.primary.plainText.includes("Rows Analyzed"), true);
  assert.equal(bundle.emailBundle.primary.plainText.includes("Completeness"), true);
});

test("createReportBundle adapts outputs to French dashboard and finance-email prompts", () => {
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Cree une application web simple, un courriel pour le DAF et 6 diapositives.",
    {
      mode: "automatic",
      variationSeed: 1,
    }
  );

  assert.equal(bundle.prompt.desiredOutputs.gas, true);
  assert.equal(bundle.prompt.desiredOutputs.email, true);
  assert.equal(bundle.prompt.desiredOutputs.slides, true);
  assert.equal(bundle.prompt.slideCount, 6);
  assert.equal(bundle.plan.title.startsWith("Revenue improved"), true);
  assert.equal((bundle.plan.findings?.length ?? 0) > 0, true);
  assert.equal(bundle.emailBundle.primary.subject.startsWith("Finance Brief | "), true);
  assert.equal(bundle.slidesBundle.slides.length, 6);
  assert.equal(bundle.slidesBundle.slides[0]?.title, bundle.plan.title);
  assert.equal(
    bundle.gasProject.files.some((file) => file.filename === "Index.html"),
    true
  );
});

test("buildReportPlan keeps preview cells compact for long qualitative comments", () => {
  const snapshot = createSupportSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt("Create a simple operations report.", {
    mode: "automatic",
    variationSeed: 2,
  });
  const plan = buildReportPlan(snapshot, profile, prompt, {
    mode: "automatic",
    variationSeed: 2,
  });

  const previewCell = plan.excel.reportTableRows[0]?.[4] ?? "";

  assert.equal(previewCell.length <= 32, true);
  assert.equal(previewCell.endsWith("..."), true);
});
