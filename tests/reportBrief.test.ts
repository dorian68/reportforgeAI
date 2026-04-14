import assert from "node:assert/strict";
import test from "node:test";

import {
  applyConversationMessage,
  buildReportBrief,
  createInitialIntakeState,
} from "../src/domain/reporting/reportBrief";
import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";
import { createSalesSnapshot } from "./fixtures";

test("buildReportBrief normalizes a board-ready reporting brief from the prompt and data profile", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt(
    "Create a board deck on revenue and margin with a strong regional trend view.",
    { mode: "prompt-guided", variationSeed: 4 },
    "Monthly sales performance by region and product line."
  );

  const brief = buildReportBrief(snapshot, profile, prompt);

  assert.equal(brief.outputStyle, "board-deck");
  assert.equal(brief.audience, "board");
  assert.equal(brief.timeDimension, "Month");
  assert.equal(brief.preferredKpis.includes("Revenue"), true);
  assert.equal(brief.focusAreas.includes("trend"), true);
  assert.equal(brief.geographicDimensions.includes("Region"), true);
  assert.equal(brief.datasetSummary.includes("time tracked by Month"), true);
});

test("conversation intake updates the brief and honors generate-now intent", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt("Create a performance review.", { mode: "automatic", variationSeed: 1 });
  const initial = createInitialIntakeState(snapshot, profile, prompt);

  const nextState = applyConversationMessage(
    initial,
    snapshot,
    profile,
    prompt,
    "Audience is CFO. Decision: decide whether margin pressure needs intervention. Focus on Revenue and Margin %. Generate now."
  );

  assert.equal(nextState.brief.audience, "cfo");
  assert.equal(nextState.brief.keyDecision.includes("margin pressure"), true);
  assert.equal(nextState.brief.preferredKpis.includes("Revenue"), true);
  assert.equal(nextState.brief.preferredKpis.includes("Margin %"), true);
  assert.equal(nextState.brief.generateNow, true);
  assert.equal(nextState.intakeComplete, true);
  assert.equal(nextState.turns.length, 2);
});
