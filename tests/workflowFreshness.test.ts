import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WORKFLOW_FRESHNESS_STATE,
  workflowFreshnessReducer,
} from "../src/taskpane/workflowFreshness";

test("workflow freshness ignores stale plan completions", () => {
  let state = workflowFreshnessReducer(DEFAULT_WORKFLOW_FRESHNESS_STATE, {
    type: "analysis-started",
    requestId: 1,
  });
  state = workflowFreshnessReducer(state, {
    type: "analysis-succeeded",
    requestId: 1,
    selectionKey: "Sheet1::A1:C10::now",
  });
  state = workflowFreshnessReducer(state, {
    type: "planning-started",
    generationId: 2,
    promptSignature: "prompt-a",
  });
  state = workflowFreshnessReducer(state, {
    type: "planning-started",
    generationId: 3,
    promptSignature: "prompt-b",
  });
  state = workflowFreshnessReducer(state, {
    type: "planning-succeeded",
    generationId: 2,
  });

  assert.equal(state.planReady, false);
  assert.equal(state.readyGenerationId, null);

  state = workflowFreshnessReducer(state, {
    type: "planning-succeeded",
    generationId: 3,
  });

  assert.equal(state.planReady, true);
  assert.equal(state.readyGenerationId, 3);
});

test("workflow freshness invalidates report eligibility when the prompt changes", () => {
  let state = workflowFreshnessReducer(DEFAULT_WORKFLOW_FRESHNESS_STATE, {
    type: "analysis-started",
    requestId: 1,
  });
  state = workflowFreshnessReducer(state, {
    type: "analysis-succeeded",
    requestId: 1,
    selectionKey: "Sheet1::A1:C10::now",
  });
  state = workflowFreshnessReducer(state, {
    type: "planning-started",
    generationId: 1,
    promptSignature: "prompt-a",
  });
  state = workflowFreshnessReducer(state, {
    type: "planning-succeeded",
    generationId: 1,
  });
  state = workflowFreshnessReducer(state, {
    type: "plan-invalidated",
  });

  assert.equal(state.reportEligible, false);
  assert.equal(state.planReady, false);
});

test("workflow freshness keeps the deterministic plan ready while AI enhancement runs", () => {
  let state = workflowFreshnessReducer(DEFAULT_WORKFLOW_FRESHNESS_STATE, {
    type: "analysis-started",
    requestId: 1,
  });
  state = workflowFreshnessReducer(state, {
    type: "analysis-succeeded",
    requestId: 1,
    selectionKey: "Sheet1::A1:C10::now",
  });
  state = workflowFreshnessReducer(state, {
    type: "planning-started",
    generationId: 5,
    promptSignature: "prompt-a",
  });
  state = workflowFreshnessReducer(state, {
    type: "planning-succeeded",
    generationId: 5,
  });
  state = workflowFreshnessReducer(state, {
    type: "ai-started",
    generationId: 5,
  });

  assert.equal(state.phase, "enhancing-ai");
  assert.equal(state.planReady, true);
  assert.equal(state.reportEligible, true);

  state = workflowFreshnessReducer(state, {
    type: "ai-finished",
    generationId: 5,
  });

  assert.equal(state.phase, "ready");
  assert.equal(state.planReady, true);
  assert.equal(state.reportEligible, true);
});
