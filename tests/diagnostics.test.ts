import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDiagnosticsBundle,
  clearDiagnostics,
  createOperationId,
  getDiagnosticEntries,
  recordDiagnosticEvent,
} from "../src/services/diagnostics/clientDiagnostics";

test("diagnostics bundle captures context and recent events for support export", () => {
  clearDiagnostics();
  const operationId = createOperationId("Excel Report");

  recordDiagnosticEvent("info", "analysis", "Selection analyzed", operationId);
  recordDiagnosticEvent("warning", "google", "Google request timed out", operationId);

  const bundle = buildDiagnosticsBundle({
    activeView: "outputs",
    lastOperationId: operationId,
    persistenceStatus: {
      degraded: false,
    },
  });
  const parsed = JSON.parse(bundle) as {
    exportedAt: string;
    context: {
      activeView: string;
      lastOperationId: string;
      persistenceStatus: {
        degraded: boolean;
      };
    };
    entries: Array<{
      area: string;
      level: string;
      message: string;
    }>;
  };

  assert.equal(typeof parsed.exportedAt, "string");
  assert.equal(parsed.context.activeView, "outputs");
  assert.equal(parsed.context.lastOperationId, operationId);
  assert.equal(parsed.context.persistenceStatus.degraded, false);
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[0].area, "google");
  assert.equal(parsed.entries[0].level, "warning");
  assert.equal(parsed.entries[0].message, "Google request timed out");
});

test("clearDiagnostics resets the export surface between runs", () => {
  clearDiagnostics();
  recordDiagnosticEvent("error", "excel", "Workbook render failed");

  assert.equal(getDiagnosticEntries().length, 1);

  clearDiagnostics();

  assert.deepEqual(getDiagnosticEntries(), []);
});
