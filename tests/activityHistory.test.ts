import assert from "node:assert/strict";
import test from "node:test";

import { ACTIVITY_HISTORY_MAX_ENTRIES } from "../src/shared/constants";
import {
  addActivityEntry,
  loadActivityHistory,
  saveActivityHistory,
} from "../src/taskpane/activityHistory";

function createMemoryStorage(initial?: Record<string, string>) {
  const store = new Map(Object.entries(initial ?? {}));

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

test("activity history persists appended entries in newest-first order", () => {
  const storage = createMemoryStorage();

  let history = addActivityEntry(
    [],
    {
      status: "info",
      area: "analysis",
      title: "Selection analyzed",
      detail: "Captured Sheet1!A1:C10.",
    },
    storage
  );
  history = addActivityEntry(
    history,
    {
      status: "success",
      area: "report",
      title: "Workbook report generated",
      detail: "Created RF Report.",
    },
    storage
  );

  const reloaded = loadActivityHistory(storage);
  assert.equal(reloaded.length, 2);
  assert.equal(reloaded[0].title, "Workbook report generated");
  assert.equal(reloaded[1].title, "Selection analyzed");
});

test("activity history trims oversized entry lists", () => {
  const storage = createMemoryStorage();
  const oversized = Array.from({ length: ACTIVITY_HISTORY_MAX_ENTRIES + 5 }, (_, index) => ({
    id: `entry_${index}`,
    status: "info" as const,
    area: "test",
    title: `Entry ${index}`,
    detail: "Detail",
    occurredAt: new Date().toISOString(),
  }));

  const saved = saveActivityHistory(oversized, storage);
  assert.equal(saved.length, ACTIVITY_HISTORY_MAX_ENTRIES);
  assert.equal(loadActivityHistory(storage).length, ACTIVITY_HISTORY_MAX_ENTRIES);
});
