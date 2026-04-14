import assert from "node:assert/strict";
import test from "node:test";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { executeAgentPlan } from "../src/services/office/executeAgentPlan";
import { createSalesSnapshot } from "./fixtures";

test("executeAgentPlan structures the selection as a table without requiring newer overlap APIs", async () => {
  const originalOffice = globalThis.Office;
  const originalExcel = globalThis.Excel;
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const plan = createReportBundle(snapshot, "Create an operational report for the selected range.", {
    mode: "automatic",
    variationSeed: 1,
  }).plan;
  const addCalls: Array<{ address: string; hasHeaders: boolean }> = [];

  const nextTable = {
    name: "",
    style: "",
    getRange: () => ({
      format: {
        autofitColumns: () => undefined,
        autofitRows: () => undefined,
      },
    }),
  };

  const worksheet = {
    tables: {
      add: (address: string, hasHeaders: boolean) => {
        addCalls.push({ address, hasHeaders });
        return nextTable;
      },
    },
  };

  const context = {
    workbook: {
      worksheets: {
        getItem: () => worksheet,
      },
      tables: {
        items: [{ name: "ExistingTable" }],
        load: () => undefined,
      },
    },
    sync: async () => undefined,
  };

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

  globalThis.Excel = {
    run: async (callback: (requestContext: unknown) => Promise<unknown>) => callback(context),
  } as unknown as typeof Excel;

  try {
    const result = await executeAgentPlan(
      snapshot,
      profile,
      plan,
      {
        title: "Agent",
        summary: "Summary",
        userPrompt: "Structure the range",
        warnings: [],
        notes: [],
        steps: [
          {
            id: "step_1",
            kind: "structure-source-table",
            title: "Structure source selection",
            description: "Convert the source selection into a table.",
            impact: "selection",
          },
        ],
      }
    );

    assert.equal(result.stepResults[0]?.status, "completed");
    assert.match(result.stepResults[0]?.message ?? "", /Selection structured as Excel table/i);
    assert.deepEqual(addCalls, [{ address: snapshot.address, hasHeaders: true }]);
  } finally {
    globalThis.Office = originalOffice;
    globalThis.Excel = originalExcel;
  }
});

test("executeAgentPlan turns overlapping table errors into a usable message", async () => {
  const originalOffice = globalThis.Office;
  const originalExcel = globalThis.Excel;
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const plan = createReportBundle(snapshot, "Create an operational report for the selected range.", {
    mode: "automatic",
    variationSeed: 1,
  }).plan;

  const worksheet = {
    tables: {
      add: () => {
        throw new Error("The table cannot overlap another table.");
      },
    },
  };

  const context = {
    workbook: {
      worksheets: {
        getItem: () => worksheet,
      },
      tables: {
        items: [],
        load: () => undefined,
      },
    },
    sync: async () => undefined,
  };

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

  globalThis.Excel = {
    run: async (callback: (requestContext: unknown) => Promise<unknown>) => callback(context),
  } as unknown as typeof Excel;

  try {
    const result = await executeAgentPlan(
      snapshot,
      profile,
      plan,
      {
        title: "Agent",
        summary: "Summary",
        userPrompt: "Structure the range",
        warnings: [],
        notes: [],
        steps: [
          {
            id: "step_1",
            kind: "structure-source-table",
            title: "Structure source selection",
            description: "Convert the source selection into a table.",
            impact: "selection",
          },
        ],
      }
    );

    assert.equal(result.stepResults[0]?.status, "completed");
    assert.match(result.stepResults[0]?.message ?? "", /already overlaps an Excel table/i);
  } finally {
    globalThis.Office = originalOffice;
    globalThis.Excel = originalExcel;
  }
});
