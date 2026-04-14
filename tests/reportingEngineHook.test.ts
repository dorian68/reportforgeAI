import assert from "node:assert/strict";
import test from "node:test";

import { registerInternalReportingEngine } from "../src/reporting-engine/adapters/registerInternalReportingEngine";

test("internal reporting engine hook registers only when the runtime flag is enabled", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalFlag = process.env.REPORTFORGE_INTERNAL_REPORTING_ENGINE;
  const fakeWindow = {} as Window;

  try {
    process.env.REPORTFORGE_INTERNAL_REPORTING_ENGINE = "true";
    Object.defineProperty(globalThis, "window", {
      value: fakeWindow,
      configurable: true,
      writable: true,
    });

    registerInternalReportingEngine();

    assert.equal(typeof fakeWindow.__REPORTFORGE_INTERNAL_ENGINE__?.generateReport, "function");
  } finally {
    if (originalFlag == null) {
      delete process.env.REPORTFORGE_INTERNAL_REPORTING_ENGINE;
    } else {
      process.env.REPORTFORGE_INTERNAL_REPORTING_ENGINE = originalFlag;
    }

    if (!originalDescriptor) {
      delete (globalThis as { window?: Window }).window;
    } else {
      Object.defineProperty(globalThis, "window", originalDescriptor);
    }
  }
});
