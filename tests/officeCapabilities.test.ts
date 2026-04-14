import assert from "node:assert/strict";
import test from "node:test";

import {
  capabilityWarnings,
  detectOfficeCapabilities,
} from "../src/services/office/capabilities";

test("detectOfficeCapabilities degrades when ExcelApi is unsupported", () => {
  const originalOffice = globalThis.Office;

  globalThis.Office = {
    HostType: {
      Excel: "Excel",
    },
    context: {
      requirements: {
        isSetSupported: () => false,
      },
    },
  } as unknown as typeof Office;

  try {
    const capabilities = detectOfficeCapabilities(Office.HostType.Excel);
    assert.equal(capabilities.excelHost, true);
    assert.equal(capabilities.excelApiSupported, false);
    assert.equal(capabilityWarnings(capabilities).length > 0, true);
  } finally {
    globalThis.Office = originalOffice;
  }
});

test("detectOfficeCapabilities separates baseline Excel support from freeze pane support", () => {
  const originalOffice = globalThis.Office;

  globalThis.Office = {
    HostType: {
      Excel: "Excel",
    },
    context: {
      requirements: {
        isSetSupported: (_name: string, version: string) => version === "1.1",
      },
    },
  } as unknown as typeof Office;

  try {
    const capabilities = detectOfficeCapabilities(Office.HostType.Excel);
    assert.equal(capabilities.excelHost, true);
    assert.equal(capabilities.excelApiSupported, true);
    assert.equal(capabilities.selectionRead, true);
    assert.equal(capabilities.workbookTables, true);
    assert.equal(capabilities.charts, true);
    assert.equal(capabilities.freezePanes, false);
  } finally {
    globalThis.Office = originalOffice;
  }
});
