import assert from "node:assert/strict";
import test from "node:test";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { DEFAULT_LLM_PROVIDER_CONFIG } from "../src/shared/constants";
import {
  buildDefaultSlideTemplate,
  generateSlideTemplateWithLlm,
  renderSlideDeckHtml,
  resolveSlideTemplate,
} from "../src/services/slides/slideTemplates";
import { createSalesSnapshot } from "./fixtures";

test("renderSlideDeckHtml applies the chosen template to the deck preview", () => {
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Create an executive monthly report with six slides.",
    { mode: "prompt-guided", variationSeed: 2 }
  );
  const template = buildDefaultSlideTemplate(bundle.slidesBundle.theme);
  const html = renderSlideDeckHtml(bundle.slidesBundle, template);

  assert.equal(html.includes(bundle.slidesBundle.title), true);
  assert.equal(html.includes(template.description), true);
  assert.equal(html.includes(template.audienceLabel), true);
  assert.equal(html.includes(template.visualDirection), true);
  assert.equal(html.includes("ReportForge Slide Deck"), true);
  assert.equal(html.includes(bundle.slidesBundle.slides[0].title), true);
  assert.equal(html.includes("slide-visual"), true);
});

test("resolveSlideTemplate falls back to the default template when selection is unknown", () => {
  const bundle = createReportBundle(
    createSalesSnapshot(),
    "Create an executive monthly report with six slides.",
    { mode: "prompt-guided", variationSeed: 2 }
  );

  const template = resolveSlideTemplate("missing-template", bundle.slidesBundle.theme, []);
  assert.equal(template.id, "executive-spotlight");
  assert.equal(template.accent, bundle.slidesBundle.theme.accent);
});

test("generateSlideTemplateWithLlm sanitizes provider output into a reusable template", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: "Investor Canvas",
                description: "Sharper analytical deck for investors.",
                audienceLabel: "Investor committee",
                narrativeStyle: "Lead with growth quality and risk-aware upside.",
                visualDirection: "Use benchmark comparisons and crisp analytical charts.",
                storytellingDirective: "Frame each slide as evidence for an investment decision.",
                fontFamily: '"Aptos", "Segoe UI", sans-serif',
                accent: "#2244AA",
                surface: "invalid-color",
                border: "#D5DEF6",
                ink: "#1B2D4A",
                muted: "#667799",
                heroStyle: "spotlight",
                contentLayout: "insight",
                cardStyle: "outlined",
                promptHint: "Use for investor updates.",
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  try {
    const fallbackTheme = {
      accent: "#0f766e",
      surface: "#f5fbfa",
      border: "#c3dfda",
      ink: "#17353a",
      muted: "#5f7b81",
    };
    const template = await generateSlideTemplateWithLlm(
      {
        ...DEFAULT_LLM_PROVIDER_CONFIG,
        enabled: true,
        providerLabel: "Managed AI",
        endpoint: "https://relay.example.com/chat/completions",
        model: "gpt-4.1-mini",
        apiKeyHeader: "",
        apiKeyPrefix: "",
      },
      null,
      "tpl_generated",
      fallbackTheme,
      {
        userPrompt: "Create an investor-ready template.",
        reportPrompt: "Make this board-ready.",
        audience: "executive",
        reportTitle: "Investor Update",
        reportSubtitle: "Q4 trend pack",
        slideCount: 6,
      }
    );

    assert.equal(template.id, "tpl_generated");
    assert.equal(template.name, "Investor Canvas");
    assert.equal(template.heroStyle, "spotlight");
    assert.equal(template.contentLayout, "insight");
    assert.equal(template.cardStyle, "outlined");
    assert.equal(template.audienceLabel, "Investor committee");
    assert.equal(template.storytellingDirective.includes("investment decision"), true);
    assert.equal(template.surface, fallbackTheme.surface);
    assert.equal(template.promptHint, "Use for investor updates.");
  } finally {
    global.fetch = originalFetch;
  }
});
