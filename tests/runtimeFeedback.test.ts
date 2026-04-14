import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRuntimeIssueSignature,
  createRuntimeRecoveryMessage,
  shouldIgnoreRuntimeIssue,
} from "../src/utils/runtimeFeedback";

test("runtime feedback ignores aborted requests", () => {
  const error = new Error("The user aborted a request.");
  error.name = "AbortError";

  assert.equal(shouldIgnoreRuntimeIssue(error), true);
});

test("runtime feedback keeps network failures user-friendly", () => {
  assert.equal(
    createRuntimeRecoveryMessage(new Error("Failed to fetch")),
    "A network request failed. Check the connection and make sure Excel can access localhost and Google endpoints."
  );
});

test("runtime feedback builds a stable signature for deduplication", () => {
  assert.equal(
    buildRuntimeIssueSignature(new Error("Failed to fetch")),
    "a network request failed. check the connection and make sure excel can access localhost and google endpoints."
  );
});
