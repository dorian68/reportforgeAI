import assert from "node:assert/strict";
import test from "node:test";

import { probeLlmProvider } from "../src/services/ai/llmHealth";
import { LlmProviderConfig, LlmSessionSecret } from "../src/shared/types";

const TEST_PROVIDER: LlmProviderConfig = {
  enabled: true,
  providerLabel: "Managed OpenAI Gateway",
  endpoint: "https://gateway.example.com/v1/chat/completions",
  model: "gpt-4.1-mini",
  apiKeyHeader: "Authorization",
  apiKeyPrefix: "Bearer",
  organization: "",
  temperature: 0.2,
};

const TEST_SECRET: LlmSessionSecret = {
  apiKey: "session-secret",
};

test("probeLlmProvider validates a healthy JSON response", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                status: "ok",
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )) as typeof fetch;

  try {
    const result = await probeLlmProvider(TEST_PROVIDER, TEST_SECRET);
    assert.equal(result.status, "ok");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
