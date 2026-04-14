import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_LLM_PROVIDER_CONFIG } from "../src/shared/constants";
import {
  createAppsScriptDraftStateFromValues,
  DEFAULT_APPS_SCRIPT_DRAFT_STATE,
  hasPendingLlmDraftChanges,
  reconcileAppsScriptOptionsWithPlan,
  resolveSelectedEmailAudience,
} from "../src/utils/reportDraftState";

test("apps script defaults follow the current plan until the user customizes them", () => {
  const untouched = reconcileAppsScriptOptionsWithPlan(
    {
      scriptTitle: "",
      deploymentDescription: "",
      deployAsWebApp: false,
      webAppAccess: "MYSELF",
      executeAs: "USER_ACCESSING",
    },
    DEFAULT_APPS_SCRIPT_DRAFT_STATE,
    "Executive Pack"
  );

  assert.equal(untouched.scriptTitle, "Executive Pack Web App");
  assert.equal(untouched.deploymentDescription, "Executive Pack automated deployment");

  const customized = reconcileAppsScriptOptionsWithPlan(
    {
      ...untouched,
      scriptTitle: "Custom Portal",
      deploymentDescription: "Custom deployment copy",
    },
    {
      scriptTitleDirty: true,
      deploymentDescriptionDirty: true,
    },
    "Board Pack"
  );

  assert.equal(customized.scriptTitle, "Custom Portal");
  assert.equal(customized.deploymentDescription, "Custom deployment copy");
});

test("apps script draft state detects explicit template or user-provided values", () => {
  assert.deepEqual(
    createAppsScriptDraftStateFromValues({
      scriptTitle: "",
      deploymentDescription: "",
    }),
    DEFAULT_APPS_SCRIPT_DRAFT_STATE
  );

  assert.deepEqual(
    createAppsScriptDraftStateFromValues({
      scriptTitle: "Executive Portal",
      deploymentDescription: "",
    }),
    {
      scriptTitleDirty: true,
      deploymentDescriptionDirty: false,
    }
  );
});

test("selected email audience stays stable when the refreshed bundle still supports it", () => {
  const nextAudience = resolveSelectedEmailAudience("operations", {
    primary: {
      audience: "executive",
      subject: "Exec",
      plainText: "Exec",
      html: "<p>Exec</p>",
    },
    variants: [
      {
        audience: "operations",
        subject: "Operations",
        plainText: "Operations",
        html: "<p>Operations</p>",
      },
    ],
    futureIntegrationNotes: [],
  });

  assert.equal(nextAudience, "operations");
  assert.equal(
    resolveSelectedEmailAudience("cfo", {
      primary: {
        audience: "executive",
        subject: "Exec",
        plainText: "Exec",
        html: "<p>Exec</p>",
      },
      variants: [],
      futureIntegrationNotes: [],
    }),
    "primary"
  );
});

test("pending ai draft changes are detected without triggering runtime equivalence false positives", () => {
  const appliedConfig = {
    ...DEFAULT_LLM_PROVIDER_CONFIG,
    enabled: true,
    providerLabel: "Gateway",
    endpoint: "https://gateway.example.com/v1/chat/completions",
    model: "gpt-4.1-mini",
    apiKeyHeader: "Authorization",
    apiKeyPrefix: "Bearer",
    organization: "ops",
    temperature: 0.3,
  };

  assert.equal(
    hasPendingLlmDraftChanges(
      { ...appliedConfig, providerLabel: "Gateway   " },
      appliedConfig,
      { apiKey: "secret" },
      { apiKey: "secret" }
    ),
    false
  );

  assert.equal(
    hasPendingLlmDraftChanges(
      { ...appliedConfig, model: "gpt-4.1" },
      appliedConfig,
      { apiKey: "secret" },
      { apiKey: "secret" }
    ),
    true
  );
});
