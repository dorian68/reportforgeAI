import { WorkflowFreshnessState } from "../shared/types";

export type WorkflowFreshnessAction =
  | { type: "analysis-started"; requestId: number }
  | { type: "analysis-succeeded"; requestId: number; selectionKey: string }
  | { type: "analysis-failed"; requestId: number }
  | { type: "plan-invalidated" }
  | { type: "planning-started"; generationId: number; promptSignature: string }
  | { type: "planning-succeeded"; generationId: number }
  | { type: "planning-failed"; generationId: number }
  | { type: "ai-started"; generationId: number }
  | { type: "ai-finished"; generationId: number };

export const DEFAULT_WORKFLOW_FRESHNESS_STATE: WorkflowFreshnessState = {
  analysisRequestId: 0,
  selectionVersion: 0,
  activeGenerationId: null,
  readyGenerationId: null,
  phase: "idle",
  selectionReady: false,
  analysisReady: false,
  planReady: false,
  reportEligible: false,
  selectionKey: null,
  promptSignature: null,
};

export function workflowFreshnessReducer(
  state: WorkflowFreshnessState,
  action: WorkflowFreshnessAction
): WorkflowFreshnessState {
  if (action.type === "analysis-started") {
    return {
      ...state,
      analysisRequestId: action.requestId,
      phase: "analyzing",
      analysisReady: false,
      planReady: false,
      reportEligible: false,
      activeGenerationId: null,
      readyGenerationId: null,
      promptSignature: null,
    };
  }

  if (action.type === "analysis-succeeded") {
    if (action.requestId !== state.analysisRequestId) {
      return state;
    }

    return {
      ...state,
      selectionVersion: state.selectionVersion + 1,
      selectionReady: true,
      analysisReady: true,
      planReady: false,
      reportEligible: false,
      selectionKey: action.selectionKey,
      phase: "planning",
    };
  }

  if (action.type === "analysis-failed") {
    if (action.requestId !== state.analysisRequestId) {
      return state;
    }

    return {
      ...state,
      phase: "error",
      selectionReady: false,
      analysisReady: false,
      planReady: false,
      reportEligible: false,
      activeGenerationId: null,
      readyGenerationId: null,
      selectionKey: null,
      promptSignature: null,
    };
  }

  if (action.type === "plan-invalidated") {
    return {
      ...state,
      phase: state.selectionReady ? "planning" : state.phase,
      planReady: false,
      reportEligible: false,
      readyGenerationId: null,
    };
  }

  if (action.type === "planning-started") {
    return {
      ...state,
      activeGenerationId: action.generationId,
      readyGenerationId: null,
      planReady: false,
      reportEligible: false,
      promptSignature: action.promptSignature,
      phase: "planning",
    };
  }

  if (action.type === "planning-succeeded") {
    if (action.generationId !== state.activeGenerationId) {
      return state;
    }

    return {
      ...state,
      readyGenerationId: action.generationId,
      planReady: true,
      reportEligible: true,
      phase: "ready",
    };
  }

  if (action.type === "planning-failed") {
    if (action.generationId !== state.activeGenerationId) {
      return state;
    }

    return {
      ...state,
      planReady: false,
      reportEligible: false,
      phase: "error",
    };
  }

  if (action.type === "ai-started") {
    if (action.generationId !== state.activeGenerationId) {
      return state;
    }

    return {
      ...state,
      phase: "enhancing-ai",
    };
  }

  if (action.generationId !== state.activeGenerationId) {
    return state;
  }

  return {
    ...state,
    readyGenerationId: action.generationId,
    planReady: true,
    reportEligible: true,
    phase: "ready",
  };
}

export function createSelectionKey(sheetName: string, address: string, capturedAt: string): string {
  return `${sheetName}::${address}::${capturedAt}`;
}

export function createPromptSignature(
  promptText: string,
  businessContext: string,
  mode: string,
  variationSeed: number
): string {
  return JSON.stringify({
    promptText,
    businessContext,
    mode,
    variationSeed,
  });
}
