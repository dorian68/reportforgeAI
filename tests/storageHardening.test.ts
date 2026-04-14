import assert from "node:assert/strict";
import test from "node:test";

import {
  getPersistenceStatus,
  resetPersistenceStatus,
} from "../src/services/persistence/safeStorage";
import {
  loadGoogleSessionState,
  loadLlmProviderConfig,
  loadSavedTemplates,
  saveTemplate,
} from "../src/services/persistence/reportForgeStorage";

function createThrowingStorage() {
  return {
    getItem() {
      throw new Error("Storage blocked");
    },
    setItem() {
      throw new Error("Quota exceeded");
    },
    removeItem() {
      throw new Error("Storage blocked");
    },
  };
}

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

test("storage failures degrade gracefully instead of throwing", () => {
  resetPersistenceStatus();
  const storage = createThrowingStorage();

  assert.deepEqual(loadSavedTemplates(storage), []);
  assert.equal(loadGoogleSessionState(storage).token, null);
  assert.equal(loadLlmProviderConfig(storage).enabled, false);

  const nextTemplates = saveTemplate(
    {
      id: "tpl_1",
      name: "Executive",
      promptText: "Create an executive summary",
      mode: "prompt-guided",
      variationSeed: 1,
      emailTo: "",
      emailCc: "",
      emailBcc: "",
      appsScriptTitle: "Executive",
      deploymentDescription: "Test",
      deployAsWebApp: false,
    },
    storage
  );

  assert.equal(nextTemplates.length, 1);
  assert.equal(getPersistenceStatus().degraded, true);
});

test("malformed persisted JSON falls back safely", () => {
  resetPersistenceStatus();
  const storage = createMemoryStorage({
    "reportforge.templates.v1": "{bad json",
    "reportforge.llm.config.v1": "{bad json",
  });

  assert.deepEqual(loadSavedTemplates(storage), []);
  assert.equal(loadLlmProviderConfig(storage).providerLabel.length > 0, true);
  assert.equal(getPersistenceStatus().degraded, true);
});
