import assert from "node:assert/strict";
import test from "node:test";

import { generateReport } from "../src/reporting-engine";
import { renderArtifacts } from "../src/reporting-engine/renderers/renderArtifacts";
import { createSalesSnapshot } from "./fixtures";
import { ensurePptxBrowserBundleLoaded } from "./pptxBrowserBundle";

test("internal reporting engine generates multi-format artifacts from a real snapshot", async () => {
  await ensurePptxBrowserBundleLoaded();
  const result = await generateReport({
    source: {
      kind: "snapshot",
      snapshot: createSalesSnapshot(),
    },
    context: {
      prompt: "Build a client-ready recommendation deck and HTML performance review.",
      audience: "client",
      objective: "recommend",
      preferredFormats: ["html", "pptx", "email-html", "gas-project", "excel-plan"],
      maxSlides: 6,
    },
    options: {
      enableLlm: false,
    },
  });

  assert.equal(result.status, "success");
  assert.equal(result.reportPlan.sections.length >= 3, true);
  assert.equal(result.designSpec.pages.length >= 2, true);
  assert.equal(result.canvasDocument.pages.length >= 1, true);
  assert.equal(
    result.logs.some((entry) => entry.step === "report-planner"),
    true
  );

  const htmlArtifact = result.artifacts.find((artifact) => artifact.format === "html");
  const pptxArtifact = result.artifacts.find((artifact) => artifact.format === "pptx");
  const emailArtifact = result.artifacts.find((artifact) => artifact.format === "email-html");
  const gasArtifact = result.artifacts.find((artifact) => artifact.format === "gas-project");

  assert.equal(htmlArtifact?.status, "ready");
  assert.equal(htmlArtifact?.textContent?.includes(result.reportPlan.title), true);
  assert.equal(htmlArtifact?.textContent?.includes("AI reporting canvas"), true);
  assert.equal(
    htmlArtifact?.textContent?.includes(result.designSpec.pages[0]?.label ?? "Canvas Overview"),
    true
  );
  assert.equal(pptxArtifact?.status, "ready");
  assert.equal(Boolean(pptxArtifact?.binaryContent), true);
  assert.equal(emailArtifact?.status, "ready");
  assert.equal(emailArtifact?.textContent?.includes("<html"), true);
  assert.equal(emailArtifact?.textContent?.includes(result.designSpec.styleName), true);
  assert.equal(gasArtifact?.status, "ready");
  assert.equal(
    Array.isArray((gasArtifact?.jsonContent as { files?: unknown[] } | undefined)?.files),
    true
  );
  assert.equal(
    ((gasArtifact?.jsonContent as { summary?: string } | undefined)?.summary ?? "").includes(
      "AI-composed Apps Script"
    ),
    true
  );
});

test("renderArtifacts keeps the canvas/report engine usable when PowerPoint export fails", async () => {
  await ensurePptxBrowserBundleLoaded();
  const baseResult = await generateReport({
    source: {
      kind: "snapshot",
      snapshot: createSalesSnapshot(),
    },
    context: {
      prompt: "Build a client-ready recommendation deck and HTML performance review.",
      audience: "client",
      objective: "recommend",
      preferredFormats: ["html", "pptx", "pdf", "email-html"],
      maxSlides: 6,
    },
    options: {
      enableLlm: false,
    },
  });

  const artifacts = await renderArtifacts(
    {
      request: baseResult.request,
      bundle: baseResult.bundle,
      corePlan: baseResult.corePlan,
      reportPlan: baseResult.reportPlan,
      designSpec: baseResult.designSpec,
      canvasDocument: baseResult.canvasDocument,
      semanticProfile: baseResult.semanticProfile,
      analyticalFindings: baseResult.analyticalFindings,
      storyline: baseResult.storyline,
      validation: baseResult.validation,
      slidesBundle: baseResult.slidesBundle,
      gasProject: baseResult.gasProject,
      logs: baseResult.logs,
      featureFlagEnabled: baseResult.featureFlagEnabled,
      usedLlm: baseResult.usedLlm,
    },
    {
      buildSlideDeckPowerPoint: async () => {
        throw new Error("PowerPoint generation tools could not initialize in this Excel runtime.");
      },
      buildSlideDeckPdf: async () => new Uint8Array(Buffer.from("%PDF-stub")),
    }
  );

  const htmlArtifact = artifacts.find((artifact) => artifact.format === "html");
  const pptxArtifact = artifacts.find((artifact) => artifact.format === "pptx");
  const pdfArtifact = artifacts.find((artifact) => artifact.format === "pdf");
  const emailArtifact = artifacts.find((artifact) => artifact.format === "email-html");

  assert.equal(htmlArtifact?.status, "ready");
  assert.equal(pptxArtifact?.status, "error");
  assert.equal(pdfArtifact?.status, "ready");
  assert.equal(emailArtifact?.status, "ready");
});

test("renderArtifacts passes the AI canvas composition into PowerPoint and PDF exports", async () => {
  await ensurePptxBrowserBundleLoaded();
  const baseResult = await generateReport({
    source: {
      kind: "snapshot",
      snapshot: createSalesSnapshot(),
    },
    context: {
      prompt: "Build a client-ready recommendation deck and HTML performance review.",
      audience: "client",
      objective: "recommend",
      preferredFormats: ["pptx", "pdf"],
      maxSlides: 6,
    },
    options: {
      enableLlm: false,
    },
  });

  let receivedPowerPointComposition: unknown = null;
  let receivedPdfComposition: unknown = null;

  await renderArtifacts(
    {
      request: baseResult.request,
      bundle: baseResult.bundle,
      corePlan: baseResult.corePlan,
      reportPlan: baseResult.reportPlan,
      designSpec: baseResult.designSpec,
      canvasDocument: baseResult.canvasDocument,
      semanticProfile: baseResult.semanticProfile,
      analyticalFindings: baseResult.analyticalFindings,
      storyline: baseResult.storyline,
      validation: baseResult.validation,
      slidesBundle: baseResult.slidesBundle,
      gasProject: baseResult.gasProject,
      logs: baseResult.logs,
      featureFlagEnabled: baseResult.featureFlagEnabled,
      usedLlm: baseResult.usedLlm,
    },
    {
      buildSlideDeckPowerPoint: async (_slides, _template, composition) => {
        receivedPowerPointComposition = composition;
        return new Blob([Uint8Array.from([80, 75, 3, 4])]);
      },
      buildSlideDeckPdf: async (_slides, _template, composition) => {
        receivedPdfComposition = composition;
        return new Uint8Array(Buffer.from("%PDF-stub"));
      },
    }
  );

  assert.equal(
    Boolean(
      (receivedPowerPointComposition as { canvasDocument?: unknown; designSpec?: unknown } | null)
        ?.canvasDocument
    ),
    true
  );
  assert.equal(
    Boolean(
      (receivedPdfComposition as { canvasDocument?: unknown; reportPlan?: unknown } | null)
        ?.reportPlan
    ),
    true
  );
});

test("internal reporting engine falls back to deterministic artifacts when AI enhancement times out", async () => {
  await ensurePptxBrowserBundleLoaded();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    const timeoutError = new Error("aborted");
    timeoutError.name = "AbortError";
    throw timeoutError;
  }) as typeof fetch;

  try {
    const result = await generateReport({
      source: {
        kind: "snapshot",
        snapshot: createSalesSnapshot(),
      },
      context: {
        prompt: "Build a client-ready recommendation deck and HTML performance review.",
        audience: "client",
        objective: "recommend",
        preferredFormats: ["html", "pptx", "email-html"],
        maxSlides: 6,
      },
      options: {
        enableLlm: true,
        llmConfig: {
          enabled: true,
          providerLabel: "Test Gateway",
          endpoint: "https://gateway.example.com/v1/chat/completions",
          model: "gpt-4.1-mini",
          apiKeyHeader: "Authorization",
          apiKeyPrefix: "Bearer",
          organization: "",
          temperature: 0.3,
        },
        llmSecret: {
          apiKey: "test-secret",
        },
      },
    });

    assert.equal(result.status, "success");
    assert.equal(result.usedLlm, false);
    assert.equal(result.designSpec.generatedBy, "deterministic");
    assert.equal(
      result.logs.some(
        (entry) =>
          entry.level === "warning" &&
          entry.step === "narrative-agent" &&
          entry.message.includes("Falling back to the deterministic reporting engine")
      ),
      true
    );
    assert.equal(
      result.artifacts.filter((artifact) => artifact.status === "ready").length >= 2,
      true
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("internal reporting engine can use the managed relay flow without a user API key", async () => {
  await ensurePptxBrowserBundleLoaded();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "AI Finance Review",
                subtitle: "Revenue and margin moved together in the latest period.",
                narrativeSummary:
                  "Revenue improved while margin held, keeping the finance view supportive for the next review.",
                summaryParagraphs: [
                  "Revenue improved in the latest period while cost stayed controlled enough to protect margin quality.",
                  "Regional dispersion remained contained, so the headline improvement is not isolated to one segment.",
                ],
                recommendations: [
                  "Validate whether the latest margin quality can be sustained next month.",
                ],
                slides: [
                  {
                    index: 1,
                    title: "Revenue improved while margin discipline held in the latest period",
                    takeaway:
                      "The opening message should land on simultaneous topline progress and stable margin quality.",
                    bullets: [
                      "Revenue improved in both tracked regions between the two observed periods.",
                      "Cost growth stayed controlled enough to avoid margin erosion in the latest view.",
                    ],
                    chartCaption:
                      "Revenue and margin together make the quality of the latest improvement visible at a glance.",
                  },
                ],
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const result = await generateReport({
      source: {
        kind: "snapshot",
        snapshot: createSalesSnapshot(),
      },
      context: {
        prompt: "Build a CFO-ready reporting pack.",
        audience: "cfo",
        objective: "recommend",
        preferredFormats: ["html", "pptx"],
        maxSlides: 5,
      },
      options: {
        enableLlm: true,
        llmConfig: {
          enabled: true,
          providerLabel: "ReportForge Managed AI",
          endpoint: "/api/reportforge/llm/chat/completions",
          model: "gpt-4.1-mini",
          apiKeyHeader: "",
          apiKeyPrefix: "",
          organization: "",
          temperature: 0.3,
        },
      },
    });

    assert.equal(result.usedLlm, true);
    assert.equal(result.bundle.aiEnhancement?.providerLabel, "ReportForge Managed AI");
    assert.equal(result.designSpec.generatedBy === "hybrid", true);
    assert.equal(result.slidesBundle.slides[0]?.title.includes("Revenue improved"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
