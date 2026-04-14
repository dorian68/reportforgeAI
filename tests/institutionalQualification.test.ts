import assert from "node:assert/strict";
import test from "node:test";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { summarizeExcelPlan } from "../src/generators/excel/summarizeExcelPlan";
import { capabilityWarnings } from "../src/services/office/capabilities";
import { buildExcelRenderPolicy, evaluateSelectionPreflight } from "../src/services/office/guardrails";
import { assessSelection } from "../src/utils/userFeedback";
import { createSalesSnapshot, createSupportSnapshot } from "./fixtures";

test("institutional happy path produces a credible multi-channel executive reporting package", () => {
  const snapshot = createSalesSnapshot();
  const assessment = assessSelection(snapshot);
  const preflight = evaluateSelectionPreflight({
    address: snapshot.address,
    sheetName: snapshot.sheetName,
    startRowIndex: snapshot.startRowIndex ?? 0,
    startColumnIndex: snapshot.startColumnIndex ?? 0,
    rowCount: snapshot.rowCount,
    columnCount: snapshot.columnCount,
    cellCount: snapshot.rowCount * snapshot.columnCount,
  });
  const bundle = createReportBundle(
    snapshot,
    "Create an executive monthly report with KPI blocks at the top, a dashboard, an email update, and 6 slides.",
    {
      mode: "prompt-guided",
      variationSeed: 2,
    }
  );
  const excelSummary = summarizeExcelPlan(bundle.plan);

  assert.deepEqual(assessment.blockers, []);
  assert.equal(preflight.decision, "allow");
  assert.equal(bundle.plan.title.startsWith("Revenue improved"), true);
  assert.equal(bundle.prompt.audience, "executive");
  assert.equal(bundle.prompt.desiredOutputs.excel, true);
  assert.equal(bundle.prompt.desiredOutputs.gas, true);
  assert.equal(bundle.prompt.desiredOutputs.email, true);
  assert.equal(bundle.prompt.desiredOutputs.slides, true);
  assert.equal(
    bundle.plan.excel.summaryParagraphs.some((paragraph) =>
      paragraph.toLowerCase().includes("revenue")
    ),
    true
  );
  assert.equal(excelSummary.kpiCount >= 3, true);
  assert.equal(excelSummary.chartCount >= 2, true);
  assert.equal(
    bundle.emailBundle.primary.subject,
    `Executive Update | ${bundle.plan.title}`
  );
  assert.equal(bundle.emailBundle.primary.plainText.includes("What matters:"), true);
  assert.equal(
    bundle.gasProject.summary.includes("Deployable Apps Script scaffold with HtmlService"),
    true
  );
  assert.equal(bundle.gasProject.files.some((file) => file.filename === "Index.html"), true);
  assert.equal(bundle.gasProject.files.some((file) => file.filename === "Code.gs"), true);
  assert.equal(bundle.slidesBundle.slides.length, 6);
  assert.equal(bundle.slidesBundle.slides[0]?.title, bundle.plan.title);
  assert.equal((bundle.slidesBundle.slides[0]?.evidencePoints?.length ?? 0) > 0, true);
  assert.equal(bundle.slidesBundle.markdown.includes("Visible message"), true);
});

test("institutional fallback flow keeps qualitative operations data decision-useful", () => {
  const snapshot = createSupportSnapshot();
  const assessment = assessSelection(snapshot);
  const bundle = createReportBundle(
    snapshot,
    "Create a concise operations report, an email summary, and 5 slides for weekly review.",
    {
      mode: "automatic",
      variationSeed: 4,
    }
  );
  const excelSummary = summarizeExcelPlan(bundle.plan);

  assert.deepEqual(assessment.blockers, []);
  assert.equal(bundle.prompt.audience, "operations");
  assert.equal(bundle.profile.primaryMeasures.length, 0);
  assert.equal(excelSummary.chartCount, 0);
  assert.deepEqual(
    bundle.plan.excel.kpis.map((kpi) => kpi.label),
    ["Rows Analyzed", "Completeness"]
  );
  assert.equal(
    bundle.plan.recommendations.some((item) => item.includes("unlock richer charting")),
    true
  );
  assert.equal(bundle.emailBundle.primary.plainText.includes("Completeness"), true);
  assert.equal(bundle.gasProject.files.some((file) => file.filename === "Client.html"), true);
  assert.equal(bundle.slidesBundle.slides.length, 5);
});

test("institutional guardrails expose clear analysis and rendering limits before Excel work starts", () => {
  const emptySnapshot = {
    ...createSalesSnapshot(),
    rowCount: 2,
    columnCount: 2,
    values: [
      [null, null],
      [null, null],
    ],
    text: [
      ["", ""],
      ["", ""],
    ],
    numberFormats: [
      ["@", "@"],
      ["@", "@"],
    ],
  };
  const emptyAssessment = assessSelection(emptySnapshot);
  const confirm = evaluateSelectionPreflight({
    address: "A1:AD2500",
    sheetName: "Sheet1",
    startRowIndex: 0,
    startColumnIndex: 0,
    rowCount: 2500,
    columnCount: 30,
    cellCount: 75000,
  });
  const blockedRender = buildExcelRenderPolicy(6000, 60, 3);

  assert.equal(
    emptyAssessment.blockers[0],
    "The current selection is empty. Select a populated range or table first."
  );
  assert.equal(confirm.decision, "confirm");
  assert.equal(confirm.messages[0].includes("Analyze only if you accept slower performance."), true);
  assert.equal(blockedRender.allowRender, false);
  assert.equal(blockedRender.notes[0].includes("Workbook report generation is blocked"), true);
});

test("institutional host warnings stay actionable when Excel capabilities are unavailable", () => {
  const warnings = capabilityWarnings({
    officeJsReady: true,
    excelHost: false,
    excelApiSupported: false,
    selectionRead: false,
    workbookTables: false,
    charts: false,
    freezePanes: false,
    clipboard: false,
  });
  const limitedExcelWarnings = capabilityWarnings({
    officeJsReady: true,
    excelHost: true,
    excelApiSupported: false,
    selectionRead: false,
    workbookTables: false,
    charts: false,
    freezePanes: false,
    clipboard: true,
  });

  assert.equal(warnings.includes("This add-in only supports Excel hosts."), true);
  assert.equal(warnings.includes("Clipboard integration is unavailable in this Office runtime."), true);
  assert.equal(
    limitedExcelWarnings.includes(
      "This Excel host does not expose the required Excel API set. Advanced workbook actions are disabled."
    ),
    true
  );
});
