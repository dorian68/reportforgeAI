import assert from "node:assert/strict";
import test from "node:test";

import { profileRangeData } from "../src/domain/dataProfiling/profileRangeData";
import { buildReportPlan } from "../src/domain/planning/buildReportPlan";
import { interpretPrompt } from "../src/domain/prompt/interpretPrompt";
import { generateGasProject } from "../src/generators/gas/generateGasProject";
import {
  exportAppsScriptProject,
  mapGasProjectToAppsScriptFiles,
} from "../src/services/google/appsScriptProjects";
import { createSalesSnapshot } from "./fixtures";

test("mapGasProjectToAppsScriptFiles converts scaffold files into Apps Script API payloads", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt("Create a simple Google web dashboard.", {
    mode: "automatic",
    variationSeed: 1,
  });
  const plan = buildReportPlan(snapshot, profile, prompt, {
    mode: "automatic",
    variationSeed: 1,
  });
  const project = generateGasProject(snapshot, profile, prompt, plan);
  const files = mapGasProjectToAppsScriptFiles(project);

  assert.equal(
    files.some((file) => file.name === "Code" && file.type === "SERVER_JS"),
    true
  );
  assert.equal(
    files.some((file) => file.name === "Index" && file.type === "HTML"),
    true
  );
  assert.equal(
    files.some((file) => file.name === "appsscript" && file.type === "JSON"),
    true
  );
});

test("mapGasProjectToAppsScriptFiles applies safe deployment options into appsscript.json", () => {
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt("Create a simple Google web dashboard.", {
    mode: "automatic",
    variationSeed: 1,
  });
  const plan = buildReportPlan(snapshot, profile, prompt, {
    mode: "automatic",
    variationSeed: 1,
  });
  const project = generateGasProject(snapshot, profile, prompt, plan);
  const files = mapGasProjectToAppsScriptFiles(project, {
    webAppAccess: "DOMAIN",
    executeAs: "USER_ACCESSING",
  });
  const manifestFile = files.find((file) => file.name === "appsscript");
  assert.ok(manifestFile);

  const manifest = JSON.parse(manifestFile.source) as {
    webapp?: {
      access?: string;
      executeAs?: string;
    };
  };

  assert.equal(manifest.webapp?.access, "DOMAIN");
  assert.equal(manifest.webapp?.executeAs, "USER_ACCESSING");
});

test("exportAppsScriptProject orchestrates project creation, upload, and deployment", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body: string }> = [];
  const snapshot = createSalesSnapshot();
  const profile = profileRangeData(snapshot);
  const prompt = interpretPrompt("Create a simple Google web dashboard.", {
    mode: "automatic",
    variationSeed: 1,
  });
  const plan = buildReportPlan(snapshot, profile, prompt, {
    mode: "automatic",
    variationSeed: 1,
  });
  const project = generateGasProject(snapshot, profile, prompt, plan);

  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: String(init?.method ?? "GET"),
      body: String(init?.body ?? ""),
    });

    if (String(url).endsWith("/v1/projects") && init?.method === "POST") {
      return new Response(JSON.stringify({ scriptId: "script_123", title: "Board Dashboard" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (String(url).includes("/content") && init?.method === "PUT") {
      return new Response(null, { status: 204 });
    }

    if (String(url).endsWith("/versions") && init?.method === "POST") {
      return new Response(JSON.stringify({ versionNumber: 7 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (String(url).endsWith("/deployments") && init?.method === "POST") {
      return new Response(
        JSON.stringify({
          deploymentId: "deployment_456",
          entryPoints: [{ entryPointType: "WEB_APP", webApp: { url: "https://script.google.com/macros/s/demo/exec" } }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    throw new Error(`Unexpected request: ${String(url)} ${String(init?.method ?? "GET")}`);
  }) as typeof fetch;

  try {
    const result = await exportAppsScriptProject(
      project,
      {
        accessToken: "google-token",
        tokenType: "Bearer",
        scope: "scope-a",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      {
        scriptTitle: "Board Dashboard",
        deploymentDescription: "Weekly release",
        deployAsWebApp: true,
        webAppAccess: "DOMAIN",
        executeAs: "USER_ACCESSING",
      }
    );

    assert.equal(calls.length, 4);
    assert.equal(calls[0].url, "https://script.googleapis.com/v1/projects");
    assert.equal(calls[1].url, "https://script.googleapis.com/v1/projects/script_123/content");
    assert.equal(calls[2].url, "https://script.googleapis.com/v1/projects/script_123/versions");
    assert.equal(calls[3].url, "https://script.googleapis.com/v1/projects/script_123/deployments");
    assert.equal(calls[1].body.includes("\"files\""), true);
    assert.equal(result.scriptId, "script_123");
    assert.equal(result.deploymentId, "deployment_456");
    assert.equal(result.webAppUrl, "https://script.google.com/macros/s/demo/exec");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
