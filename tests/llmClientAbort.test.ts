import assert from "node:assert/strict";
import test from "node:test";

import { requestLlmJson } from "../src/services/ai/llmClient";
import { LlmProviderConfig, LlmSessionSecret } from "../src/shared/types";

const TEST_PROVIDER: LlmProviderConfig = {
  enabled: true,
  providerLabel: "Test Gateway",
  endpoint: "https://gateway.example.com/v1/chat/completions",
  model: "gpt-4.1-mini",
  apiKeyHeader: "Authorization",
  apiKeyPrefix: "Bearer",
  organization: "",
  temperature: 0.3,
};

const TEST_SECRET: LlmSessionSecret = {
  apiKey: "test-secret",
};

test("requestLlmJson aborts cleanly when the caller cancels the request", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();

  globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) =>
    new Promise((resolve, reject) => {
      const signal = init?.signal as AbortSignal | undefined;
      signal?.addEventListener(
        "abort",
        () => {
          const abortedError = new Error("aborted");
          abortedError.name = "AbortError";
          reject(abortedError);
        },
        { once: true }
      );

      if (signal?.aborted) {
        const abortedError = new Error("aborted");
        abortedError.name = "AbortError";
        reject(abortedError);
        return;
      }

      void resolve;
    })) as typeof fetch;

  try {
    const pending = requestLlmJson(
      TEST_PROVIDER,
      TEST_SECRET,
      "Return JSON.",
      { ok: true },
      { signal: controller.signal }
    );
    controller.abort();

    await assert.rejects(
      pending,
      (error) => error instanceof Error && error.name === "AbortError"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
