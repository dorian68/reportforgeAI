import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { buildReportPlan } from "../src/domain/planning/buildReportPlan";
import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";
import { generateGasProject } from "../src/generators/gas/generateGasProject";
import { createSalesSnapshot } from "./fixtures";

test("generateGasProject emits a deployable HtmlService scaffold", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt("Create a simple Google web dashboard.", {
    mode: "automatic",
    variationSeed: 1,
  });
  const plan = buildReportPlan(snapshot, profile, prompt, {
    mode: "automatic",
    variationSeed: 1,
  });

  const gasProject = generateGasProject(snapshot, profile, prompt, plan);
  const codeFile = gasProject.files.find((file) => file.filename === "Code.gs");
  const indexFile = gasProject.files.find((file) => file.filename === "Index.html");

  assert.ok(codeFile);
  assert.ok(indexFile);
  assert.equal(codeFile.content.includes("function doGet()"), true);
  assert.equal(codeFile.content.includes("HtmlService.createTemplateFromFile"), true);
  assert.equal(indexFile.content.includes("dimension-filter"), true);
});
