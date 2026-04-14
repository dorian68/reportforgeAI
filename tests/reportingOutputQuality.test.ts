import assert from "node:assert/strict";
import test from "node:test";

import { generateReport } from "../src/reporting-engine";
import { createSalesSnapshot } from "./fixtures";

test("shared story planning produces dashboard-like HTML and product-grade GAS structures", async () => {
  const result = await generateReport({
    source: {
      kind: "snapshot",
      snapshot: createSalesSnapshot(),
    },
    context: {
      prompt: "Create a board-ready sales dashboard with a KPI ribbon, trend page, regional split, and action close.",
      businessContext: "Monthly sales performance by region and product line.",
      audience: "board",
      objective: "recommend",
      preferredFormats: ["html", "gas-project"],
      maxSlides: 6,
    },
    options: {
      enableLlm: false,
    },
  });

  const htmlArtifact = result.artifacts.find((artifact) => artifact.format === "html");
  const indexFile = result.gasProject.files.find((file) => file.filename === "Index.html");
  const clientFile = result.gasProject.files.find((file) => file.filename === "Client.html");
  const pages = result.bundle.plan.storyPages;

  assert.equal(htmlArtifact?.status, "ready");
  assert.equal(htmlArtifact?.textContent?.includes("Decision focus"), true);
  assert.equal(htmlArtifact?.textContent?.includes("Evidence table"), true);
  assert.equal(htmlArtifact?.textContent?.includes("rf-kpi-ribbon"), true);
  assert.equal(indexFile?.content.includes("kpi-ribbon"), true);
  assert.equal(indexFile?.content.includes("story-grid"), true);
  assert.equal(clientFile?.content.includes("payload.storySections"), true);
  assert.equal(result.slidesBundle.html.includes("Visible Narrative"), false);

  for (let index = 1; index < pages.length; index += 1) {
    assert.notEqual(pages[index - 1].purpose, pages[index].purpose);
    assert.notEqual(pages[index - 1].layoutFamily, pages[index].layoutFamily);
  }
});
