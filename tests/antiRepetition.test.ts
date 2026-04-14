import assert from "node:assert/strict";
import test from "node:test";

import { repairStoryPages, validateStoryPages } from "../src/domain/reporting/antiRepetition";
import { StoryPagePlan } from "../src/shared/types";

function createPage(
  id: string,
  title: string,
  purpose: StoryPagePlan["purpose"],
  layoutFamily: StoryPagePlan["layoutFamily"],
  metricLabels: string[]
): StoryPagePlan {
  return {
    id,
    title,
    subtitle: "Support the report with a distinct angle.",
    purpose,
    distinctJob: "Give the page a distinct job to do.",
    storyBeat: "Advance the story rather than repeating the prior page.",
    layoutFamily,
    visualKind: "bar",
    visualTitle: "Comparison view",
    visualRationale: "Expose the contrast across segments.",
    narrativeAngle: "Why the split matters",
    metricLabels,
    evidence: ["Evidence point 1", "Evidence point 2"],
  };
}

test("validateStoryPages flags duplicate purpose, layout, title, and missing action pages", () => {
  const pages = [
    createPage("page-1", "Revenue improved in North", "executive-summary", "hero-metrics", ["Revenue"]),
    createPage("page-2", "Revenue improved in North", "executive-summary", "hero-metrics", ["Revenue"]),
  ];

  const issues = validateStoryPages(pages);

  assert.equal(issues.some((issue) => issue.code === "duplicate-purpose"), true);
  assert.equal(issues.some((issue) => issue.code === "duplicate-layout"), true);
  assert.equal(issues.some((issue) => issue.code === "similar-title"), true);
  assert.equal(issues.some((issue) => issue.code === "missing-action"), true);
});

test("repairStoryPages alternates layouts, trims repeated KPI clusters, and differentiates titles", () => {
  const pages = [
    createPage("page-1", "Revenue improved in North", "segment-comparison", "comparison-grid", ["Revenue", "Margin %"]),
    createPage("page-2", "Revenue improved in North", "segment-comparison", "comparison-grid", ["Revenue", "Margin %"]),
    createPage("page-3", "Action close", "recommendation", "action-checklist", ["Revenue"]),
  ];

  const repaired = repairStoryPages(pages);

  assert.notEqual(repaired[1].layoutFamily, pages[1].layoutFamily);
  assert.notEqual(repaired[1].title, pages[1].title);
  assert.notDeepEqual(repaired[1].metricLabels, pages[1].metricLabels);
  assert.equal(repaired[2].purpose, "recommendation");
});
