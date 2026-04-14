import assert from "node:assert/strict";
import test from "node:test";

import { activateWorksheetByName } from "../src/services/office/activateWorksheet";

test("activateWorksheetByName activates the requested worksheet in Excel", async () => {
  const originalExcel = globalThis.Excel;
  const calls: string[] = [];

  const worksheet = {
    activate: () => {
      calls.push("activate");
    },
  };

  const context = {
    workbook: {
      worksheets: {
        getItem: (name: string) => {
          calls.push(name);
          return worksheet;
        },
      },
    },
    sync: async () => {
      calls.push("sync");
    },
  };

  globalThis.Excel = {
    run: async (callback: (requestContext: unknown) => Promise<unknown>) => callback(context),
  } as unknown as typeof Excel;

  try {
    await activateWorksheetByName("RF Report 1");
    assert.deepEqual(calls, ["RF Report 1", "activate", "sync"]);
  } finally {
    globalThis.Excel = originalExcel;
  }
});
