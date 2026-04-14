import assert from "node:assert/strict";
import test from "node:test";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { buildStoryline } from "../src/reporting-engine/analysis/buildStoryline";
import { extractAnalyticalFindings } from "../src/reporting-engine/analysis/extractAnalyticalFindings";
import { inferSemanticProfile } from "../src/reporting-engine/analysis/inferSemanticProfile";
import { runDesignAgent } from "../src/reporting-engine/agents/designAgent";
import { runReportPlannerAgent } from "../src/reporting-engine/agents/reportPlannerAgent";
import { renderEmailHtmlArtifact } from "../src/reporting-engine/renderers/renderEmailArtifact";
import { renderGasProjectArtifact } from "../src/reporting-engine/renderers/renderGasProjectArtifact";
import { validateAndNormalizeReportRequest } from "../src/reporting-engine/schemas/validateRequest";
import { createSalesSnapshot } from "./fixtures";

function createBaseInputs() {
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Build a CFO-ready reporting pack with message-led pages and evidence.",
    {
      mode: "variation",
      variationSeed: 77,
    },
    undefined,
    "Monthly sales performance by region and product line."
  );
  const request = validateAndNormalizeReportRequest({
    source: {
      kind: "bundle",
      bundle,
    },
    context: {
      prompt: "Build a CFO-ready reporting pack with message-led pages and evidence.",
      businessContext: "Monthly sales performance by region and product line.",
      audience: "cfo",
      objective: "recommend",
      tone: "analytical",
      preferredFormats: ["html", "pptx", "email-html"],
      maxSlides: 5,
    },
    options: {
      enableLlm: false,
      mode: "variation",
      variationSeed: 77,
    },
  });
  const reportPlan = runReportPlannerAgent(bundle, request);
  const semanticProfile = inferSemanticProfile(bundle, request);
  const findings = extractAnalyticalFindings(bundle, semanticProfile, request);
  const storyline = buildStoryline(findings, semanticProfile, request);

  return {
    bundle,
    request,
    reportPlan,
    semanticProfile,
    findings,
    storyline,
  };
}

test("design agent produces an AI-backed composition spec for variation mode", async () => {
  const { bundle, request, reportPlan, semanticProfile, findings, storyline } = createBaseInputs();

  const result = await runDesignAgent(
    bundle,
    {
      ...request,
      enableLlm: true,
      llmConfig: {
        enabled: true,
        providerLabel: "Managed AI",
        endpoint: "/api/reportforge/llm/chat/completions",
        model: "gpt-4.1-mini",
        apiKeyHeader: "",
        apiKeyPrefix: "",
        organization: "",
        temperature: 0.4,
      },
    },
    reportPlan,
    semanticProfile,
    findings,
    storyline,
    {
      requestLlmJson: async <T>() =>
        ({
          styleName: "AI Boardroom Variation",
          audienceBehavior: "Restrained, finance-led composition with selective evidence density.",
          designTone: "Board-grade finance reporting.",
          narrativeDensity: "compact",
          pageRhythm: "message -> proof -> implication -> action",
          summaryPlacement: "Opening hero with right-column watchpoints.",
          chartPreference: "Variance and concentration visuals only when they sharpen the message.",
          componentGrammar: ["hero", "kpi-strip", "chart-panel", "recommendations"],
          allowedComponents: ["hero", "kpi-strip", "chart-panel", "recommendations", "callout"],
          layoutRules: ["Keep a strong hero and one primary evidence zone per page."],
          titleStyle: "Finance headline with explicit implication.",
          annotationStyle: "Short evidence captions.",
          rendererHints: {
            canvas: { columns: 12, spacing: "balanced", emphasis: "kpi-first" },
            html: { columns: 12, spacing: "balanced", emphasis: "narrative-first" },
          },
          rationale: ["The CFO view needs a stronger message-to-proof rhythm."],
          pages: [
            {
              id: "canvas-overview",
              label: "AI Canvas Overview",
              format: "canvas",
              layoutMode: "freeform",
              narrativeDensity: "compact",
              pageRhythm: "message -> proof -> implication -> action",
              blocks: [
                {
                  id: "hero-message",
                  kind: "hero",
                  title: "Margin held, but concentration risk increased in the latest period",
                  body: "Topline held together, yet a narrower revenue mix leaves the next period more exposed.",
                  supportingText: "This should frame the full canvas before any detail is shown.",
                  x: 1,
                  y: 1,
                  w: 8,
                  h: 3,
                  priority: 100,
                  emphasis: "high",
                  findingIds: ["finding-1"],
                  metricIds: ["Revenue"],
                  formatTargets: ["canvas", "html"],
                  styleToken: "hero",
                },
              ],
            },
          ],
        }) as T,
    }
  );

  assert.equal(result.usedLlm, true);
  assert.equal(result.designSpec.generatedBy, "hybrid");
  assert.equal(result.designSpec.styleName, "AI Boardroom Variation");
  assert.equal(Boolean(result.designSpec.layoutPlan?.pages.length), true);
  assert.equal(Boolean(result.designSpec.componentTree?.rootIds.length), true);
  assert.equal(Boolean(result.designSpec.visualHierarchy?.items.length), true);
  assert.equal(result.canvasDocument.pages[0]?.layoutMode, "freeform");
  assert.equal(
    result.canvasDocument.pages[0]?.blocks[0]?.title.includes("concentration risk increased"),
    true
  );
});

test("design agent preserves saved freeform layout geometry while refreshing content", async () => {
  const { bundle, request, reportPlan, semanticProfile, findings, storyline } = createBaseInputs();

  const result = await runDesignAgent(
    bundle,
    {
      ...request,
      enableLlm: false,
      canvasDocument: {
        version: 1,
        layoutMode: "freeform",
        designSpecId: "legacy-design",
        pages: [
          {
            id: "canvas-overview",
            label: "Saved Layout",
            format: "canvas",
            layoutMode: "freeform",
            narrativeDensity: "balanced",
            pageRhythm: "message -> proof",
            blocks: [
              {
                id: "saved-hero",
                kind: "hero",
                title: "Old title",
                body: "Old body",
                supportingText: "",
                x: 2,
                y: 2,
                w: 7,
                h: 4,
                priority: 100,
                emphasis: "high",
                formatTargets: ["canvas", "html"],
                styleToken: "hero",
              },
            ],
          },
        ],
        updatedAt: new Date().toISOString(),
      },
    },
    reportPlan,
    semanticProfile,
    findings,
    storyline
  );

  assert.equal(result.usedLlm, false);
  assert.equal(result.canvasDocument.layoutMode, "freeform");
  assert.equal(Boolean(result.designSpec.theme?.styleTokens.length), true);
  assert.equal(Boolean(result.designSpec.componentPresets?.length), true);
  assert.equal(result.canvasDocument.pages[0]?.blocks[0]?.x, 2);
  assert.equal(result.canvasDocument.pages[0]?.blocks[0]?.w, 7);
  assert.notEqual(result.canvasDocument.pages[0]?.blocks[0]?.title, "Old title");
});

test("email renderer uses the design-page composition instead of the base bundle shell", () => {
  const { bundle, request, reportPlan, semanticProfile, findings, storyline } = createBaseInputs();
  const deterministic = runDesignAgent(
    bundle,
    {
      ...request,
      enableLlm: false,
      preferredFormats: [...request.preferredFormats, "gas-project"],
    },
    reportPlan,
    semanticProfile,
    findings,
    storyline
  );

  return deterministic.then((result) => {
    const emailArtifact = renderEmailHtmlArtifact(bundle, {
      ...result.designSpec,
      pages: result.designSpec.pages.map((page) =>
        page.format === "email-html"
          ? {
              ...page,
              blocks: [
                {
                  ...page.blocks[0],
                  title: "Client decisions should focus on margin durability this month",
                  body: "The email should land first on margin durability before secondary evidence.",
                },
                ...page.blocks.slice(1),
              ],
            }
          : page
      ),
    });

    assert.equal(
      emailArtifact.html.includes("Client decisions should focus on margin durability this month"),
      true
    );
    assert.equal(emailArtifact.html.includes("generic newsletter"), false);
  });
});

test("gas renderer emits an AI-composed app scaffold driven by the gas-project page", () => {
  const { bundle, request, reportPlan, semanticProfile, findings, storyline } = createBaseInputs();
  const deterministic = runDesignAgent(
    bundle,
    {
      ...request,
      enableLlm: false,
      preferredFormats: [...request.preferredFormats, "gas-project"],
    },
    reportPlan,
    semanticProfile,
    findings,
    storyline
  );

  return deterministic.then((result) => {
    const gasProject = renderGasProjectArtifact(bundle, result.designSpec);
    const indexFile = gasProject.files.find((file) => file.filename === "Index.html");
    const clientFile = gasProject.files.find((file) => file.filename === "Client.html");

    assert.equal(gasProject.summary.includes("AI-composed Apps Script"), true);
    assert.equal(indexFile?.content.includes(result.designSpec.styleName), true);
    assert.equal(clientFile?.content.includes("payload.blocks"), true);
  });
});
