import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicRuntimeConfig,
  resolveGoogleConfigWithRuntimeDefaults,
  resolveLlmConfigWithRuntimeDefaults,
} from "../src/shared/publicRuntimeConfig";
import { DEFAULT_LLM_PROVIDER_CONFIG } from "../src/shared/constants";

test("public runtime config exposes managed Google and AI defaults", () => {
  const runtimeConfig = buildPublicRuntimeConfig({
    REPORTFORGE_GOOGLE_CLIENT_ID: "1234567890-managed.apps.googleusercontent.com",
    REPORTFORGE_INTERNAL_REPORTING_ENGINE: "true",
    REPORTFORGE_LLM_PROVIDER_LABEL: "Managed OpenAI Gateway",
    REPORTFORGE_LLM_ENDPOINT: "https://api.openai.com/v1/chat/completions",
    REPORTFORGE_LLM_MODEL: "gpt-4.1-mini",
    REPORTFORGE_LLM_API_KEY_HEADER: "Authorization",
    REPORTFORGE_LLM_API_KEY_PREFIX: "Bearer",
    REPORTFORGE_LLM_ORGANIZATION: "ops",
  });

  assert.equal(runtimeConfig.hasManagedGoogleClientId, true);
  assert.equal(runtimeConfig.googleOAuthClientId, "1234567890-managed.apps.googleusercontent.com");
  assert.equal(runtimeConfig.internalReportingEngine.enabled, true);
  assert.equal(runtimeConfig.llmPreset.available, true);
  assert.equal(runtimeConfig.llmPreset.providerLabel, "Managed OpenAI Gateway");
  assert.equal(runtimeConfig.llmPreset.organization, "ops");
});

test("runtime defaults override empty local config but preserve user toggles", () => {
  const runtimeConfig = buildPublicRuntimeConfig({
    REPORTFORGE_GOOGLE_CLIENT_ID: "1234567890-managed.apps.googleusercontent.com",
    REPORTFORGE_LLM_PROVIDER_LABEL: "Managed OpenAI Gateway",
    REPORTFORGE_LLM_ENDPOINT: "https://api.openai.com/v1/chat/completions",
    REPORTFORGE_LLM_MODEL: "gpt-4.1-mini",
    REPORTFORGE_LLM_API_KEY_HEADER: "Authorization",
    REPORTFORGE_LLM_API_KEY_PREFIX: "Bearer",
  });
  const google = resolveGoogleConfigWithRuntimeDefaults({ clientId: "" }, runtimeConfig);
  const llm = resolveLlmConfigWithRuntimeDefaults(
    {
      ...DEFAULT_LLM_PROVIDER_CONFIG,
      enabled: true,
      providerLabel: "",
      endpoint: "",
      model: "",
      apiKeyHeader: "",
      apiKeyPrefix: "",
    },
    runtimeConfig
  );

  assert.equal(google.clientId, "1234567890-managed.apps.googleusercontent.com");
  assert.equal(llm.enabled, true);
  assert.equal(llm.providerLabel, "Managed OpenAI Gateway");
  assert.equal(llm.endpoint, "https://api.openai.com/v1/chat/completions");
  assert.equal(llm.model, "gpt-4.1-mini");
});

test("internal reporting engine defaults to enabled when the flag is omitted", () => {
  const runtimeConfig = buildPublicRuntimeConfig({});
  assert.equal(runtimeConfig.internalReportingEngine.enabled, true);
  assert.equal(runtimeConfig.internalReportingEngine.adminOnly, false);
});
