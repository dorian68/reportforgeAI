import assert from "node:assert/strict";
import test from "node:test";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import {
  buildSlideDeckPdf,
  buildSlideDeckPowerPoint,
  normalizePowerPointWriteResult,
} from "../src/services/slides/exportSlideDeck";
import { buildDefaultSlideTemplate } from "../src/services/slides/slideTemplates";
import { createSalesSnapshot } from "./fixtures";
import { ensurePptxBrowserBundleLoaded } from "./pptxBrowserBundle";

test("buildSlideDeckPowerPoint produces a downloadable PowerPoint blob", async () => {
  await ensurePptxBrowserBundleLoaded();
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Create an executive monthly report with six slides.",
    { mode: "prompt-guided", variationSeed: 2 }
  );

  const template = buildDefaultSlideTemplate(bundle.slidesBundle.theme);
  const blob = await buildSlideDeckPowerPoint(bundle.slidesBundle, template);

  assert.ok(blob.size > 0);
});

test("buildSlideDeckPdf produces a real PDF payload", async () => {
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Create an executive monthly report with six slides.",
    { mode: "prompt-guided", variationSeed: 2 }
  );

  const template = buildDefaultSlideTemplate(bundle.slidesBundle.theme);
  const pdfBytes = await buildSlideDeckPdf(bundle.slidesBundle, template);
  const header = Buffer.from(pdfBytes.slice(0, 4)).toString("utf8");

  assert.equal(header, "%PDF");
  assert.ok(pdfBytes.length > 1000);
});

test("buildSlideDeckPowerPoint supports canvas-driven composition exports", async () => {
  await ensurePptxBrowserBundleLoaded();
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Create an executive monthly report with six slides.",
    { mode: "prompt-guided", variationSeed: 2 }
  );

  const template = buildDefaultSlideTemplate(bundle.slidesBundle.theme);
  const blob = await buildSlideDeckPowerPoint(bundle.slidesBundle, template, {
    bundle,
    reportPlan: {
      title: "Canvas Pack",
      subtitle: "Canvas-first composition",
      audience: "client",
      objective: "recommend",
      tone: "consultative",
      primaryMessage: "Revenue improved while concentration risk remains important to monitor.",
      recommendedFormats: ["pptx"],
      sections: [],
      brief: bundle.plan.brief,
      storyPages: bundle.plan.storyPages,
      limitations: [],
      confidenceStatement: "High confidence.",
    },
    designSpec: {
      id: "design-1",
      styleName: "Client Canvas",
      audienceBehavior: "Client-facing and polished",
      designTone: "Consultative",
      narrativeDensity: "balanced",
      pageRhythm: "message -> proof -> action",
      summaryPlacement: "opening hero",
      chartPreference: "comparison charts",
      componentGrammar: ["hero", "chart-panel"],
      allowedComponents: ["hero", "chart-panel", "table", "recommendations"],
      layoutRules: ["Lead with a headline and one proof block."],
      titleStyle: "Message-led",
      annotationStyle: "Short caption",
      rendererHints: {},
      pages: [],
      rationale: [],
      variationSeed: 2,
      generatedBy: "deterministic",
    },
    canvasDocument: {
      version: 1,
      layoutMode: "freeform",
      pages: [
        {
          id: "canvas-overview",
          label: "Canvas Overview",
          format: "canvas",
          layoutMode: "freeform",
          narrativeDensity: "balanced",
          pageRhythm: "message -> proof -> action",
          blocks: [
            {
              id: "hero",
              kind: "hero",
              title: "Revenue improved while concentration risk remains elevated",
              body: "The topline improved, but the latest period relies on a narrow set of contributors.",
              x: 1,
              y: 1,
              w: 8,
              h: 3,
              priority: 100,
              emphasis: "high",
            },
            {
              id: "chart",
              kind: "chart-panel",
              title: "Regional contribution mix",
              body: "This visual anchors the concentration story.",
              x: 1,
              y: 4,
              w: 10,
              h: 3,
              priority: 90,
              emphasis: "medium",
              chartId: bundle.plan.excel.charts[0]?.id,
            },
          ],
        },
      ],
      updatedAt: new Date().toISOString(),
    },
  });

  assert.ok(blob.size > 0);
});

test("normalizePowerPointWriteResult accepts raw binary payloads from Office WebViews", () => {
  const blob = normalizePowerPointWriteResult(new Uint8Array([80, 75, 3, 4]));

  assert.ok(blob.size > 0);
  assert.equal(
    blob.type,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );
});
