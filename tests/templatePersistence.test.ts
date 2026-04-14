import assert from "node:assert/strict";
import test from "node:test";

import {
  clearCanvasStudioDraft,
  clearLlmSessionSecret,
  createTemplateId,
  deleteCanvasStudioSnapshot,
  deleteCanvasTemplate,
  deleteSlideTemplate,
  loadCanvasStudioDraft,
  loadCanvasStudioSnapshots,
  loadGoogleSessionState,
  loadLlmProviderConfig,
  loadLlmSessionSecret,
  loadSavedCanvasTemplates,
  loadSavedSlideTemplates,
  loadSavedTemplates,
  saveCanvasStudioDraft,
  saveCanvasStudioSnapshot,
  saveCanvasTemplate,
  saveGoogleAuthState,
  saveGoogleConfig,
  saveGoogleToken,
  saveLlmProviderConfig,
  saveLlmSessionSecret,
  saveSlideTemplate,
  saveTemplate,
} from "../src/services/persistence/reportForgeStorage";

function createMemoryStorage() {
  const store = new Map<string, string>();

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

test("template persistence stores and reloads saved templates", () => {
  const storage = createMemoryStorage();
  const templateId = createTemplateId();

  saveTemplate(
    {
      id: templateId,
      name: "Board Pack",
      promptText: "Create a board summary",
      mode: "prompt-guided",
      variationSeed: 3,
      emailTo: "ceo@company.com",
      emailCc: "",
      emailBcc: "",
      appsScriptTitle: "Board Pack App",
      deploymentDescription: "Quarterly board deployment",
      deployAsWebApp: true,
      appsScriptAccess: "DOMAIN",
      appsScriptExecuteAs: "USER_DEPLOYING",
    },
    storage
  );

  const templates = loadSavedTemplates(storage);
  assert.equal(templates.length, 1);
  assert.equal(templates[0].name, "Board Pack");
  assert.equal(templates[0].deployAsWebApp, true);
  assert.equal(templates[0].appsScriptAccess, "DOMAIN");
});

test("slide template persistence stores, sorts, and deletes saved slide templates", () => {
  const storage = createMemoryStorage();

  saveSlideTemplate(
    {
      id: "slide_tpl_1",
      name: "Investor Canvas",
      description: "Investor-grade analytical deck",
      audienceLabel: "Investor audience",
      narrativeStyle: "Lead with performance proof, then capital allocation implications.",
      visualDirection: "Sharper charts and benchmark-led comparison panels.",
      storytellingDirective: "Make the deck feel investment-grade and decision-oriented.",
      fontFamily: '"Aptos", "Segoe UI", sans-serif',
      accent: "#2244AA",
      surface: "#F6F8FE",
      border: "#D5DEF6",
      ink: "#1B2D4A",
      muted: "#667799",
      heroStyle: "spotlight",
      contentLayout: "insight",
      cardStyle: "outlined",
      promptHint: "Use for investor updates.",
      sourcePrompt: "Create an investor-ready deck.",
    },
    storage
  );

  const savedTemplates = loadSavedSlideTemplates(storage);
  assert.equal(savedTemplates.length, 1);
  assert.equal(savedTemplates[0].name, "Investor Canvas");

  const remainingTemplates = deleteSlideTemplate("slide_tpl_1", storage);
  assert.equal(remainingTemplates.length, 0);
  assert.equal(loadSavedSlideTemplates(storage).length, 0);
});

test("canvas template persistence stores, reapplies, and deletes saved canvas templates", () => {
  const storage = createMemoryStorage();

  saveCanvasTemplate(
    {
      id: "canvas_tpl_1",
      name: "Client Quarterly Decision Pack",
      presetId: "client-decision-pack",
      promptText:
        "Build a persuasive client pack with premium slides and an executive follow-up email.",
      variationSeed: 42,
      designIntent: {
        styleName: "Client decision canvas",
        audienceBehavior: "Persuasive, polished, recommendation-first hierarchy.",
        designTone: "Consultative, polished, client-ready.",
        narrativeDensity: "balanced",
        pageRhythm: "decision headline -> proof -> recommendation",
        summaryPlacement: "opening fold before secondary evidence",
        chartPreference: "Comparison visuals with recommendation framing.",
        componentGrammar: ["hero", "chart-panel", "recommendations"],
        allowedComponents: [
          "hero",
          "summary",
          "kpi-strip",
          "chart-panel",
          "narrative-panel",
          "table",
          "recommendations",
          "callout",
          "email-summary",
        ],
        layoutRules: ["Keep the opening fold message-led and data-grounded."],
        titleStyle: "Message-led headline with concise subtitle.",
        annotationStyle: "Persuasive analytical captioning.",
        rendererHints: {
          canvas: { columns: 12, spacing: "balanced", emphasis: "narrative-first" },
          html: { columns: 12, spacing: "balanced", emphasis: "narrative-first" },
        },
      },
      canvasDocument: {
        version: 1,
        layoutMode: "freeform",
        designSpecId: "canvas-design",
        pages: [
          {
            id: "canvas-overview",
            label: "Canvas Overview",
            format: "canvas",
            layoutMode: "freeform",
            narrativeDensity: "balanced",
            pageRhythm: "decision headline -> proof -> recommendation",
            blocks: [
              {
                id: "hero-message",
                kind: "hero",
                title: "Revenue momentum improved",
                body: "Revenue improved across the tracked regions.",
                supportingText: "Monthly sales performance by region.",
                x: 1,
                y: 1,
                w: 8,
                h: 3,
                priority: 100,
                emphasis: "high",
                metricIds: ["Revenue"],
                formatTargets: ["canvas", "html"],
                styleToken: "hero",
              },
            ],
          },
        ],
        updatedAt: new Date().toISOString(),
      },
    },
    storage
  );

  const savedTemplates = loadSavedCanvasTemplates(storage);
  assert.equal(savedTemplates.length, 1);
  assert.equal(savedTemplates[0].presetId, "client-decision-pack");
  assert.equal(savedTemplates[0].variationSeed, 42);
  assert.equal(savedTemplates[0].designIntent?.styleName, "Client decision canvas");
  assert.equal(savedTemplates[0].canvasDocument?.pages[0]?.layoutMode, "freeform");

  const remainingTemplates = deleteCanvasTemplate("canvas_tpl_1", storage);
  assert.equal(remainingTemplates.length, 0);
  assert.equal(loadSavedCanvasTemplates(storage).length, 0);
});

test("canvas studio draft and snapshots persist separately from saved templates", () => {
  const storage = createMemoryStorage();

  saveCanvasStudioDraft(
    {
      savedAt: "2026-03-20T10:15:00.000Z",
      promptText: "Make this more executive.",
      templateName: "Recovered Studio Draft",
      presetId: "executive-monthly",
      businessContext: "Monthly profitability review",
      previewMode: "report",
      canvasDocument: {
        version: 1,
        layoutMode: "freeform",
        pages: [
          {
            id: "page-1",
            label: "Overview",
            format: "canvas",
            layoutMode: "freeform",
            narrativeDensity: "balanced",
            pageRhythm: "headline -> proof",
            blocks: [
              {
                id: "hero",
                kind: "hero",
                title: "Profitability held up",
                body: "Margin stayed resilient despite cost pressure.",
                x: 1,
                y: 1,
                w: 8,
                h: 3,
                priority: 100,
                emphasis: "high",
              },
            ],
          },
        ],
        updatedAt: "2026-03-20T10:15:00.000Z",
      },
    },
    storage
  );

  const snapshots = saveCanvasStudioSnapshot(
    {
      id: "snapshot_1",
      label: "Morning review",
      createdAt: "2026-03-20T10:20:00.000Z",
      designSpecId: "design_1",
      document: {
        version: 1,
        layoutMode: "freeform",
        pages: [
          {
            id: "page-1",
            label: "Overview",
            format: "canvas",
            layoutMode: "freeform",
            narrativeDensity: "balanced",
            pageRhythm: "headline -> proof",
            blocks: [
              {
                id: "hero",
                kind: "hero",
                title: "Snapshot title",
                body: "Snapshot body",
                x: 1,
                y: 1,
                w: 8,
                h: 3,
                priority: 100,
                emphasis: "high",
              },
            ],
          },
        ],
        updatedAt: "2026-03-20T10:20:00.000Z",
      },
    },
    storage
  );

  assert.equal(loadCanvasStudioDraft(storage)?.templateName, "Recovered Studio Draft");
  assert.equal(snapshots.length, 1);
  assert.equal(loadCanvasStudioSnapshots(storage)[0]?.label, "Morning review");

  clearCanvasStudioDraft(storage);
  assert.equal(loadCanvasStudioDraft(storage), null);

  const remainingSnapshots = deleteCanvasStudioSnapshot("snapshot_1", storage);
  assert.equal(remainingSnapshots.length, 0);
});

test("google session persistence ignores expired tokens", () => {
  const storage = createMemoryStorage();
  saveGoogleConfig({ clientId: "client-id.apps.googleusercontent.com" }, storage);
  saveGoogleAuthState(
    {
      status: "connecting",
      requestId: "req_1",
      prompt: "consent",
      requestedScopes: ["scope-a"],
      grantedScopes: [],
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      lastError: "",
      lastErrorCode: "",
    },
    storage
  );
  saveGoogleToken(
    {
      accessToken: "expired",
      tokenType: "Bearer",
      scope: "scope-a",
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    },
    storage
  );

  const session = loadGoogleSessionState(storage);
  assert.equal(session.config.clientId, "client-id.apps.googleusercontent.com");
  assert.equal(session.token, null);
  assert.equal(session.auth.status, "error");
});

test("llm provider config persists locally while api keys stay session-scoped", () => {
  const storage = createMemoryStorage();
  saveLlmProviderConfig(
    {
      enabled: true,
      providerLabel: "Enterprise Gateway",
      endpoint: "https://gateway.example.com/v1/chat/completions",
      model: "gpt-4.1-mini",
      apiKeyHeader: "Authorization",
      apiKeyPrefix: "Bearer",
      organization: "ops",
      temperature: 0.2,
    },
    storage
  );
  saveLlmSessionSecret({ apiKey: "session-secret" }, storage);

  const config = loadLlmProviderConfig(storage);
  const secret = loadLlmSessionSecret(storage);

  assert.equal(config.enabled, true);
  assert.equal(config.providerLabel, "Enterprise Gateway");
  assert.equal(secret?.apiKey, "session-secret");

  clearLlmSessionSecret(storage);
  assert.equal(loadLlmSessionSecret(storage), null);
});
