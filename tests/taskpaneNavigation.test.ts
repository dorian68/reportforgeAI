import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTaskpaneViews,
  loadTaskpaneViewPreference,
  resolveActiveTaskpaneView,
  saveTaskpaneViewPreference,
} from "../src/taskpane/navigation";

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

test("taskpane navigation disables outputs until a selection exists", () => {
  const views = buildTaskpaneViews({
    isReady: true,
    isExcelHost: true,
    selectionReady: false,
    bundleReady: false,
    outputsReady: false,
    diagnosticsCount: 0,
  });

  const outputsView = views.find((view) => view.id === "outputs");
  const automationView = views.find((view) => view.id === "automation");
  assert.equal(outputsView?.disabled, true);
  assert.equal(outputsView?.badge, "Locked");
  assert.equal(automationView?.disabled, true);
  assert.equal(resolveActiveTaskpaneView("outputs", views), "overview");
});

test("taskpane navigation keeps outputs active when the workflow is ready", () => {
  const views = buildTaskpaneViews({
    isReady: true,
    isExcelHost: true,
    selectionReady: true,
    bundleReady: true,
    outputsReady: true,
    diagnosticsCount: 4,
  });

  const outputsView = views.find((view) => view.id === "outputs");
  const activityView = views.find((view) => view.id === "activity");
  const planView = views.find((view) => view.id === "brief");
  const automationView = views.find((view) => view.id === "automation");

  assert.equal(outputsView?.disabled, false);
  assert.equal(outputsView?.badge, "Generated");
  assert.equal(planView?.badge, "Ready");
  assert.equal(automationView?.disabled, false);
  assert.equal(automationView?.badge, "Ready");
  assert.equal(activityView?.badge, "4 events");
  assert.equal(resolveActiveTaskpaneView("outputs", views), "outputs");
});

test("taskpane view preference migrates legacy configure to brief", () => {
  const storage = createMemoryStorage();

  assert.equal(loadTaskpaneViewPreference(storage), "overview");
  assert.equal(saveTaskpaneViewPreference("brief", storage), "brief");
  assert.equal(loadTaskpaneViewPreference(storage), "brief");

  storage.setItem("reportforge.taskpane.view.v1", JSON.stringify("configure"));
  assert.equal(loadTaskpaneViewPreference(storage), "brief");
});
