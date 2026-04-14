import assert from "node:assert/strict";
import test from "node:test";

import { assessSelection, toFriendlyErrorMessage } from "../src/utils/userFeedback";
import { createSalesSnapshot } from "./fixtures";

test("assessSelection explains thin selections without blocking viable analysis", () => {
  const snapshot = {
    ...createSalesSnapshot(),
    address: "A1",
    rowCount: 1,
    columnCount: 1,
    values: [["Revenue"]],
    text: [["Revenue"]],
    numberFormats: [["@"]],
  };
  const assessment = assessSelection(snapshot);

  assert.deepEqual(assessment.blockers, []);
  assert.equal(
    assessment.warnings.includes(
      "Only one row is selected. Include headers and data rows for stronger profiling and report generation."
    ),
    true
  );
  assert.equal(
    assessment.warnings.includes(
      "Only one column is selected. KPI blocks may still work, but charts and dimensional summaries will be limited."
    ),
    true
  );
});

test("toFriendlyErrorMessage turns Google transport failures into actionable guidance", () => {
  const message = toFriendlyErrorMessage(
    new Error("Google request failed before a response was received.")
  );

  assert.equal(
    message,
    "Google could not be reached from this Excel runtime. Check network access, then reconnect and retry."
  );
});

test("toFriendlyErrorMessage clarifies unusable AI provider responses", () => {
  const emptyMessage = toFriendlyErrorMessage(new Error("The LLM provider returned an empty response."));
  const malformedMessage = toFriendlyErrorMessage(new Error("The LLM provider returned malformed JSON."));

  assert.equal(
    emptyMessage,
    "The AI provider returned no usable content. Retry, switch to a more reliable model, or disable AI enhancement for this run."
  );
  assert.equal(
    malformedMessage,
    "The AI provider returned an unusable response. Use an OpenAI-compatible chat completions endpoint or disable AI enhancement."
  );
});

test("toFriendlyErrorMessage clarifies Google OAuth client misconfiguration", () => {
  const invalidClient = toFriendlyErrorMessage(new Error("invalid_client"));
  const originMismatch = toFriendlyErrorMessage(new Error("redirect_uri_mismatch"));

  assert.equal(
    invalidClient,
    "The Google OAuth client is not usable for this add-in. Check the client type, published consent setup, and allowed origins, then retry."
  );
  assert.equal(
    originMismatch,
    "The Google OAuth client does not trust this add-in URL. Add https://localhost:3000 as an authorized JavaScript origin in Google Cloud, then retry."
  );
});

test("toFriendlyErrorMessage clarifies account-level Apps Script activation blockers", () => {
  const message = toFriendlyErrorMessage(
    new Error("User has not enabled the Apps Script API. Enable it by visiting https://script.google.com/home/usersettings then retry.")
  );

  assert.equal(
    message,
    "The Apps Script API is not enabled for this Google account or project. Enable it in Google Cloud and in https://script.google.com/home/usersettings, then retry the export."
  );
});

test("toFriendlyErrorMessage keeps Excel host blockers explicit", () => {
  const hostMessage = toFriendlyErrorMessage(
    new Error("This Excel host does not expose the required Excel API set for workbook report generation.")
  );
  const selectionMessage = toFriendlyErrorMessage(
    new Error("GeneralException: merged cells are not supported.")
  );

  assert.equal(
    hostMessage,
    "This Excel host is missing a required Office capability. Try Excel Desktop or Excel on the web with a current Microsoft 365 build."
  );
  assert.equal(
    selectionMessage,
    "Excel rejected the current action. Try a simple rectangular range with headers, no merged cells, and no formula errors, then analyze again."
  );
});

test("toFriendlyErrorMessage clarifies PowerPoint export bootstrap failures", () => {
  const message = toFriendlyErrorMessage(
    new Error("Cannot read properties of undefined (reading 'default')")
  );

  assert.equal(
    message,
    "PowerPoint export could not initialize in this Excel runtime. Retry the Slides export, and if it still fails use the HTML or PDF output while keeping the direct download link visible to the user."
  );
});
