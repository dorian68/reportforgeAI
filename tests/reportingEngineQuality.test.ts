import assert from "node:assert/strict";
import test from "node:test";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { buildStoryline } from "../src/reporting-engine/analysis/buildStoryline";
import { extractAnalyticalFindings } from "../src/reporting-engine/analysis/extractAnalyticalFindings";
import { inferSemanticProfile } from "../src/reporting-engine/analysis/inferSemanticProfile";
import { NormalizedReportRequest } from "../src/reporting-engine/domain/types";
import {
  refineBundleForDelivery,
  validateBundleForDelivery,
} from "../src/reporting-engine/validators/reportQualityValidator";
import { createSalesSnapshot, createSupportSnapshot } from "./fixtures";

test("semantic profile avoids inventing a time axis when the dataset has no real date column", () => {
  const bundle = createReportBundle(
    createSupportSnapshot(),
    "Create a risk and operations review for ticket handling quality.",
    {
      mode: "prompt-guided",
      variationSeed: 1,
    }
  );

  const request: NormalizedReportRequest = {
    sourceSnapshot: bundle.snapshot,
    existingBundle: bundle,
    profile: bundle.profile,
    promptText: bundle.prompt.rawPrompt,
    businessContext: bundle.prompt.businessContext,
    audience: "operations" as const,
    objective: "summarize" as const,
    tone: "analytical" as const,
    language: "en",
    preferredFormats: ["html"],
    maxSlides: 5,
    mode: "prompt-guided" as const,
    variationSeed: 1,
    enableLlm: false,
    requestId: "semantic-test",
  };

  const semanticProfile = inferSemanticProfile(bundle, request);

  assert.equal(semanticProfile.timeDimension, null);
  assert.equal(semanticProfile.identifierColumns.includes("Ticket ID"), true);
  assert.equal(
    semanticProfile.notes.some((note) => note.includes("No reliable time dimension")),
    true
  );
});

test("quality validator removes instruction-style wording from visible delivery fields", () => {
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Create an executive monthly report with KPI blocks and six slides.",
    {
      mode: "prompt-guided",
      variationSeed: 2,
    }
  );
  const request: NormalizedReportRequest = {
    sourceSnapshot: bundle.snapshot,
    existingBundle: bundle,
    profile: bundle.profile,
    promptText: bundle.prompt.rawPrompt,
    businessContext: bundle.prompt.businessContext,
    audience: "cfo" as const,
    objective: "recommend" as const,
    tone: "executive" as const,
    language: "en",
    preferredFormats: ["html", "pptx"],
    maxSlides: 5,
    mode: "prompt-guided" as const,
    variationSeed: 2,
    enableLlm: false,
    requestId: "quality-test",
  };
  const semanticProfile = inferSemanticProfile(bundle, request);
  const findings = extractAnalyticalFindings(bundle, semanticProfile, request);
  const storyline = buildStoryline(findings, semanticProfile, request);

  const unsafeBundle = {
    ...bundle,
    slidesBundle: {
      ...bundle.slidesBundle,
      slides: bundle.slidesBundle.slides.map((slide, index) =>
        index === 0
          ? {
              ...slide,
              title: "Executive Summary",
              chartCaption: "Use the chart to show how the KPI moved over time.",
              takeaway: "This slide exists to frame the discussion.",
            }
          : slide
      ),
    },
  };

  const refinedBundle = refineBundleForDelivery(unsafeBundle, storyline);
  const validation = validateBundleForDelivery(refinedBundle, storyline);
  const firstSlide = refinedBundle.slidesBundle.slides[0];

  assert.notEqual(firstSlide.title, "Executive Summary");
  assert.equal(firstSlide.chartCaption?.includes("Use the chart") ?? false, false);
  assert.equal(firstSlide.takeaway.includes("This slide exists to"), false);
  assert.equal(
    validation.issues.some((issue) => issue.code === "instruction-leak"),
    false
  );
});
