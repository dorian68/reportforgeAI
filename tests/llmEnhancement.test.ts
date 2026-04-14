import assert from "node:assert/strict";
import test from "node:test";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { enhanceBundleWithLlm } from "../src/services/ai/enhanceBundle";
import { extractFirstJsonObject } from "../src/services/ai/llmClient";
import { LlmProviderConfig, LlmSessionSecret } from "../src/shared/types";
import { createSalesSnapshot } from "./fixtures";

const TEST_PROVIDER: LlmProviderConfig = {
  enabled: true,
  providerLabel: "Test Gateway",
  endpoint: "https://gateway.example.com/v1/chat/completions",
  model: "gpt-4.1-mini",
  apiKeyHeader: "Authorization",
  apiKeyPrefix: "Bearer",
  organization: "",
  temperature: 0.3,
};

const TEST_SECRET: LlmSessionSecret = {
  apiKey: "test-secret",
};

test("extractFirstJsonObject parses wrapped JSON safely", () => {
  const result = extractFirstJsonObject(
    "```json\n{\"title\":\"Executive Pack\",\"recommendations\":[\"Review KPI definitions\"]}\n```"
  );

  assert.equal(
    result,
    "{\"title\":\"Executive Pack\",\"recommendations\":[\"Review KPI definitions\"]}"
  );
});

test("enhanceBundleWithLlm upgrades the narrative while keeping the bundle structure intact", async () => {
  const baseBundle = createReportBundle(
    createSalesSnapshot(),
    "Make this an executive monthly report with KPI blocks at the top.",
    {
      mode: "prompt-guided",
      variationSeed: 2,
    }
  );
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "AI Executive Performance Pack",
                subtitle: "4 rows, 5 columns, tailored for executive review.",
                narrativeSummary:
                  "Revenue, cost, and margin signals were reframed into a concise executive narrative.",
                summaryParagraphs: [
                  "This pack keeps the message tight for an executive audience.",
                  "Revenue and cost measures are the clearest levers in the current selection.",
                  "Regional segmentation is the main comparison dimension in the dataset.",
                ],
                recommendations: [
                  "Confirm metric definitions before circulation.",
                  "Refresh the report monthly from the same Excel range.",
                ],
                slides: [
                  {
                    index: 1,
                    title: "Revenue Momentum at a Glance",
                    storyBeat: "Opening Hook",
                    takeaway:
                      "Open with the commercial headline so the client immediately sees the gain in momentum.",
                    bullets: [
                      "Revenue improved across both tracked regions in the latest snapshot.",
                      "Margin held firm while costs stayed controlled.",
                      "This creates room to push the next growth action with confidence.",
                    ],
                    chartSuggestion:
                      "Lead with a premium revenue scorecard and a short growth message.",
                    speakerNotes:
                      "Use this slide to frame the meeting around growth quality, not just topline size.",
                  },
                  {
                    index: 2,
                    title: "What the Client Should Remember",
                    storyBeat: "Executive Framing",
                    takeaway:
                      "Give the client a repeatable summary they can forward after the meeting.",
                    bullets: [
                      "Revenue and cost trends are moving in the right direction together.",
                      "Regional performance remains comparable enough to scale the same playbook.",
                      "The main opportunity is to convert momentum into a sharper operating plan.",
                    ],
                    chartSuggestion:
                      "Pair the summary with a compact KPI panel instead of another dense chart.",
                    speakerNotes:
                      "Keep the message crisp and commercial so the client can restate it internally.",
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
    const enhancedBundle = await enhanceBundleWithLlm(baseBundle, TEST_PROVIDER, TEST_SECRET, {
      slideTemplate: {
        id: "client-storyboard",
        name: "Client Storyboard",
        description: "Narrative-first client deck",
        audienceLabel: "Client committee",
        narrativeStyle: "Turn performance into a persuasive client story.",
        visualDirection: "Use premium scorecards and proof-oriented visuals.",
        storytellingDirective: "Make each slide feel like evidence for the next recommendation.",
        fontFamily: '"Aptos", "Segoe UI", sans-serif',
        accent: "#b45309",
        surface: "#fff9f2",
        border: "#f0d7bc",
        ink: "#4a2800",
        muted: "#876138",
        heroStyle: "minimal",
        contentLayout: "stacked",
        cardStyle: "solid",
        promptHint: "Best for client-facing recaps.",
      },
    });

    assert.equal(enhancedBundle.plan.title, "AI Executive Performance Pack");
    assert.equal(
      enhancedBundle.plan.narrativeSummary.includes("executive narrative"),
      true
    );
    assert.equal(enhancedBundle.plan.excel.summaryParagraphs.length, 3);
    assert.equal(enhancedBundle.emailBundle.primary.plainText.includes("What matters:"), true);
    assert.equal(
      enhancedBundle.emailBundle.primary.plainText.includes("Confirm metric definitions before circulation."),
      true
    );
    assert.equal(enhancedBundle.slidesBundle.slides[0]?.title, "Revenue Momentum at a Glance");
    assert.equal(enhancedBundle.slidesBundle.slides[0]?.storyBeat, "Opening Hook");
    assert.equal((enhancedBundle.slidesBundle.slides[0]?.evidencePoints?.length ?? 0) > 0, true);
    assert.equal(
      enhancedBundle.slidesBundle.slides[0]?.recommendation,
      "Confirm metric definitions before circulation."
    );
    assert.equal(
      enhancedBundle.slidesBundle.slides[0]?.speakerNotes.includes("growth quality"),
      true
    );
    assert.equal(
      enhancedBundle.slidesBundle.html.includes("Revenue Momentum at a Glance"),
      true
    );
    assert.equal(enhancedBundle.aiEnhancement?.providerLabel, "Test Gateway");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
