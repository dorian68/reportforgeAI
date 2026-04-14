import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOutputWorkspaceTabs,
  buildPlanWorkspaceTabs,
  loadOutputWorkspacePreference,
  loadPlanWorkspacePreference,
  resolveWorkspaceTab,
  saveOutputWorkspacePreference,
  savePlanWorkspacePreference,
} from "../src/taskpane/workspaceNavigation";

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

test("plan workspace tabs expose useful badges for planning status", () => {
  const tabs = buildPlanWorkspaceTabs({
    selectionReady: true,
    bundleReady: false,
    templateCount: 2,
    aiEnabled: true,
    aiConfigured: false,
    aiEnhanced: false,
  });

  assert.equal(tabs.find((tab) => tab.id === "brief")?.badge, "Drafting");
  assert.equal(tabs.find((tab) => tab.id === "templates")?.badge, "2 saved");
  assert.equal(tabs.find((tab) => tab.id === "ai")?.badge, "Incomplete");
});

test("output workspace tabs reflect channel readiness and results", () => {
  const tabs = buildOutputWorkspaceTabs({
    selectionReady: true,
    bundleReady: true,
    excelGenerated: true,
    webAppExported: false,
    emailGenerated: false,
    slidesReady: true,
    canvasEnabled: false,
    canvasGenerated: false,
  });

  assert.equal(tabs.find((tab) => tab.id === "excel")?.badge, "Created");
  assert.equal(tabs.find((tab) => tab.id === "webapp")?.badge, "Scaffold");
  assert.equal(tabs.find((tab) => tab.id === "email")?.badge, "Ready");
  assert.equal(tabs.find((tab) => tab.id === "slides")?.badge, "Ready");
});

test("workspace preferences round-trip through storage", () => {
  const storage = createMemoryStorage();

  assert.equal(loadPlanWorkspacePreference(storage), "brief");
  assert.equal(loadOutputWorkspacePreference(storage), "excel");
  assert.equal(savePlanWorkspacePreference("ai", storage), "ai");
  assert.equal(saveOutputWorkspacePreference("email", storage), "email");
  assert.equal(loadPlanWorkspacePreference(storage), "ai");
  assert.equal(loadOutputWorkspacePreference(storage), "email");
});

test("workspace tab resolution falls back to the first enabled tab", () => {
  const tabs = buildOutputWorkspaceTabs({
    selectionReady: false,
    bundleReady: false,
    excelGenerated: false,
    webAppExported: false,
    emailGenerated: false,
    slidesReady: false,
    canvasEnabled: false,
    canvasGenerated: false,
  });

  assert.equal(resolveWorkspaceTab("slides", tabs), "excel");
});

test("output workspace tabs expose canvas studio only when the feature flag is enabled", () => {
  const tabs = buildOutputWorkspaceTabs({
    selectionReady: true,
    bundleReady: true,
    excelGenerated: false,
    webAppExported: false,
    emailGenerated: false,
    slidesReady: true,
    canvasEnabled: true,
    canvasGenerated: true,
  });

  assert.equal(tabs.find((tab) => tab.id === "canvas")?.badge, "Generated");
});
