import assert from "node:assert/strict";
import test from "node:test";

import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";

test("interpretPrompt extracts audience, layout, slide count, and output intent", () => {
  const interpretation = interpretPrompt(
    "Make this an executive monthly report, write an email for the CFO, create 5 business slides, and put KPIs at the top with charts below.",
    {
      mode: "prompt-guided",
      variationSeed: 2,
    }
  );

  assert.equal(interpretation.audience, "cfo");
  assert.equal(interpretation.reportStyle, "executive-monthly");
  assert.equal(interpretation.slideCount, 5);
  assert.equal(interpretation.excelLayoutHint, "kpis-top");
  assert.equal(interpretation.desiredOutputs.email, true);
  assert.equal(interpretation.desiredOutputs.slides, true);
});

test("interpretPrompt understands common French prompt cues", () => {
  const interpretation = interpretPrompt(
    "Fais un rapport mensuel pour la direction, ecris un email pour la DAF, cree 5 diapositives et mets les KPI en haut.",
    {
      mode: "prompt-guided",
      variationSeed: 3,
    }
  );

  assert.equal(interpretation.audience, "cfo");
  assert.equal(interpretation.reportStyle, "executive-monthly");
  assert.equal(interpretation.slideCount, 5);
  assert.equal(interpretation.excelLayoutHint, "kpis-top");
  assert.equal(interpretation.desiredOutputs.email, true);
  assert.equal(interpretation.desiredOutputs.slides, true);
});

test("interpretPrompt does not confuse dashboard with board reporting", () => {
  const interpretation = interpretPrompt(
    "Create a dashboard with KPI cards, an email update, and 6 slides for leadership.",
    {
      mode: "prompt-guided",
      variationSeed: 1,
    }
  );

  assert.equal(interpretation.audience, "executive");
  assert.equal(interpretation.reportStyle, "dashboard");
  assert.equal(interpretation.webAppStyle, "simple-dashboard");
});
