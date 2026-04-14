import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createReportBundle } from "../src/domain/orchestration/createReportBundle";
import { summarizeExcelPlan } from "../src/generators/excel/summarizeExcelPlan";
import { DEFAULT_LLM_PROVIDER_CONFIG } from "../src/shared/constants";
import {
  AppsScriptDeploymentOptions,
  GmailDraftRecipients,
  GoogleConnectionState,
  GoogleOAuthConfig,
  GoogleOAuthRuntimeState,
  GoogleTokenRecord,
} from "../src/shared/types";
import { AutomationView } from "../src/taskpane/views/AutomationView";
import { OutputsView } from "../src/taskpane/views/OutputsView";
import { PlanView } from "../src/taskpane/views/PlanView";
import { ReportResult } from "../src/reporting-engine";
import { createSalesSnapshot } from "./fixtures";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findButtonMarkup(markup: string, label: string): string {
  const match = markup.match(new RegExp(`<button[^>]*>${escapeRegExp(label)}<\\/button>`));
  assert.ok(match, `Button "${label}" was not rendered.`);
  return match[0];
}

function findInputMarkup(markup: string, placeholder: string): string {
  const match = markup.match(
    new RegExp(`<input[^>]*placeholder="${escapeRegExp(placeholder)}"[^>]*>`)
  );
  assert.ok(match, `Input with placeholder "${placeholder}" was not rendered.`);
  return match[0];
}

function findTextareaMarkup(markup: string): string {
  const match = markup.match(/<textarea[^>]*class="rf-textarea"[^>]*>/);
  assert.ok(match, "Textarea was not rendered.");
  return match[0];
}

function createPlanWorkspaceTabs() {
  return [
    {
      id: "brief" as const,
      label: "Brief",
      description: "Brief",
      disabled: false,
      badge: "Ready",
    },
    {
      id: "templates" as const,
      label: "Templates",
      description: "Templates",
      disabled: false,
      badge: "Saved",
    },
    {
      id: "ai" as const,
      label: "AI",
      description: "AI",
      disabled: false,
      badge: "Armed",
    },
  ];
}

function createOutputWorkspaceTabs(includeCanvas = false) {
  const tabs: Array<{
    id: "excel" | "webapp" | "email" | "slides" | "canvas";
    label: string;
    description: string;
    disabled: boolean;
    badge: string;
  }> = [
    {
      id: "excel" as const,
      label: "Workbook",
      description: "Workbook",
      disabled: false,
      badge: "Ready",
    },
    {
      id: "webapp" as const,
      label: "Web App",
      description: "Web App",
      disabled: false,
      badge: "Scaffold",
    },
    {
      id: "email" as const,
      label: "Email",
      description: "Email",
      disabled: false,
      badge: "Ready",
    },
    {
      id: "slides" as const,
      label: "Slides",
      description: "Slides",
      disabled: false,
      badge: "Ready",
    },
  ];

  if (includeCanvas) {
    tabs.push({
      id: "canvas" as const,
      label: "Canvas",
      description: "Canvas",
      disabled: false,
      badge: "Studio",
    });
  }

  return tabs;
}

function createGoogleConnectionState(): GoogleConnectionState {
  return {
    status: "connected",
    label: "Connected",
    requiresReconnect: false,
  };
}

function createGoogleConfig(): GoogleOAuthConfig {
  return {
    clientId: "123.apps.googleusercontent.com",
  };
}

function createGoogleToken(): GoogleTokenRecord {
  return {
    accessToken: "token",
    tokenType: "Bearer",
    scope: "gmail script",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

function createGoogleAuthState(): GoogleOAuthRuntimeState {
  return {
    status: "connected",
    requestId: "req-1",
    prompt: "",
    requestedScopes: ["scope-a"],
    grantedScopes: ["scope-a"],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    lastError: "",
    lastErrorCode: "",
  };
}

function createAppsScriptOptions(): AppsScriptDeploymentOptions {
  return {
    scriptTitle: "Executive Pack Web App",
    deploymentDescription: "Executive Pack automated deployment",
    deployAsWebApp: true,
    webAppAccess: "MYSELF",
    executeAs: "USER_ACCESSING",
  };
}

function createRecipients(): GmailDraftRecipients {
  return {
    to: "ceo@example.com",
    cc: "",
    bcc: "",
  };
}

function createSlidesProps() {
  return {
    html: bundle.slidesBundle.html,
    markdown: bundle.slidesBundle.markdown,
    json: bundle.slidesBundle.json,
    title: bundle.slidesBundle.title,
    powerPointDownloadUrl: "blob://powerpoint",
    powerPointDownloadFilename: "executive-spotlight.pptx",
    slides: bundle.slidesBundle.slides,
    templateName: "Executive Spotlight",
    templateDescription: "Board-ready deck",
    templateAudienceLabel: "Executive leadership",
    templateNarrativeStyle: "Lead with headline movement.",
    templateVisualDirection: "Premium scorecards and clean charts.",
    templateStorytellingDirective: "Close on a clear client decision.",
    templateSourcePrompt: "",
    templatePromptHint: "Use for executive review.",
    templateOptions: [
      {
        id: "executive-spotlight",
        name: "Executive Spotlight",
        description: "Board-ready deck",
        isCustom: false,
      },
    ],
    selectedTemplateId: "executive-spotlight",
    slideTemplatePrompt: "",
    pdfPreviewUrl: null,
    canGenerateTemplate: true,
    canDeleteSelectedTemplate: false,
    onSelectedTemplateChange: () => undefined,
    onSlideTemplatePromptChange: () => undefined,
    onGenerateTemplate: () => undefined,
    onDeleteSelectedTemplate: () => undefined,
    onClearPdfPreview: () => undefined,
    onOpenHtmlPreview: () => undefined,
    onDownloadPowerPoint: () => undefined,
    onOpenPdfPreview: () => undefined,
    onDownloadPdf: () => undefined,
    onDownloadHtml: () => undefined,
    onDownloadMarkdown: () => undefined,
    onDownloadJson: () => undefined,
    onCopyMarkdown: () => undefined,
  };
}

function createCanvasResult(): ReportResult {
  return {
    status: "success",
    request: {
      sourceSnapshot: bundle.snapshot,
      existingBundle: bundle,
      profile: bundle.profile,
      promptText: "Client decision pack with premium deck and follow-up email.",
      businessContext: "Monthly sales performance by region and product line.",
      audience: "client",
      objective: "recommend",
      tone: "consultative",
      language: "en",
      preferredFormats: ["html", "pptx", "email-html"],
      maxSlides: 6,
      mode: "prompt-guided",
      variationSeed: 2,
      enableLlm: false,
      requestId: "canvas-test",
    },
    bundle,
    corePlan: bundle.plan,
    reportPlan: {
      title: bundle.plan.title,
      subtitle: bundle.plan.subtitle,
      audience: "client",
      objective: "recommend",
      tone: "consultative",
      primaryMessage: bundle.plan.narrativeSummary,
      recommendedFormats: ["html", "pptx", "email-html"],
      sections: [
        {
          id: "executive-summary",
          title: "Executive Summary",
          purpose: "Land the main message.",
          narrativeBlocks: [],
          visuals: [],
        },
      ],
      brief: bundle.plan.brief,
      storyPages: bundle.plan.storyPages,
      limitations: [],
      confidenceStatement: "High confidence.",
    },
    designSpec: {
      id: "canvas-design",
      styleName: "Client decision canvas",
      audienceBehavior: "Persuasive, polished, recommendation-first hierarchy.",
      designTone: "Consultative, polished, client-ready.",
      narrativeDensity: "balanced",
      pageRhythm: "decision headline -> proof -> implication -> recommendation",
      summaryPlacement: "opening fold before secondary evidence",
      chartPreference: "Comparison visuals that support the recommendation.",
      componentGrammar: ["hero", "kpi-strip", "chart-panel", "recommendations"],
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
      pages: [
        {
          id: "canvas-overview",
          label: "Canvas Overview",
          format: "canvas",
          layoutMode: "freeform",
          narrativeDensity: "balanced",
          pageRhythm: "decision headline -> proof -> implication -> recommendation",
          blocks: [
            {
              id: "hero-message",
              kind: "hero",
              title: "Revenue momentum improved in the latest period",
              body: "Revenue improved across both tracked regions in the latest period.",
              supportingText: "Monthly sales performance by region and product line.",
              x: 1,
              y: 1,
              w: 8,
              h: 3,
              priority: 100,
              emphasis: "high",
              findingIds: ["finding-1"],
              metricIds: ["Revenue"],
              formatTargets: ["canvas", "html"],
              styleToken: "hero",
            },
          ],
        },
      ],
      rationale: ["AI design places the main decision message above the supporting proof."],
      variationSeed: 2,
      generatedBy: "hybrid",
      sourcePrompt: "Build a client-ready canvas pack.",
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
          pageRhythm: "decision headline -> proof -> implication -> recommendation",
          blocks: [
            {
              id: "hero-message",
              kind: "hero",
              title: "Revenue momentum improved in the latest period",
              body: "Revenue improved across both tracked regions in the latest period.",
              supportingText: "Monthly sales performance by region and product line.",
              x: 1,
              y: 1,
              w: 8,
              h: 3,
              priority: 100,
              emphasis: "high",
              findingIds: ["finding-1"],
              metricIds: ["Revenue"],
              formatTargets: ["canvas", "html"],
              styleToken: "hero",
            },
          ],
        },
      ],
      updatedAt: new Date().toISOString(),
    },
    semanticProfile: {
      sourceLabel: bundle.profile.sourceLabel,
      enterpriseLens: "client",
      timeDimension: "Month",
      metricColumns: ["Revenue", "Cost", "Margin %"],
      dimensionColumns: ["Region"],
      identifierColumns: [],
      comparisonModes: ["trend", "segment", "ranking-and-concentration"],
      notes: [],
    },
    analyticalFindings: [
      {
        id: "finding-1",
        kind: "trend",
        title: "Revenue momentum improved in the latest period",
        summary: "Revenue improved across both tracked regions in the latest period.",
        implication: "The headline commercial trajectory remains constructive.",
        recommendation: "Keep the next review focused on repeatability.",
        evidencePoints: ["Revenue improved across both tracked regions."],
        sourceMetrics: ["Revenue", "Month"],
        priority: 100,
      },
    ],
    storyline: [
      {
        id: "opening",
        title: "Revenue momentum improved in the latest period",
        purpose: "Open on the headline message.",
        message: "Revenue improved across both tracked regions in the latest period.",
        findingIds: ["finding-1"],
        recommendedVisual: "headline-scorecard",
      },
    ],
    validation: {
      passed: true,
      issues: [],
    },
    slidesBundle: bundle.slidesBundle,
    gasProject: bundle.gasProject,
    artifacts: [
      {
        id: "artifact-html",
        format: "html",
        label: "HTML report",
        summary: "Generated an HTML executive report artifact.",
        status: "ready",
        filename: "report.html",
        textContent: "<html><body><h1>Canvas Report</h1></body></html>",
      },
      {
        id: "artifact-pptx",
        format: "pptx",
        label: "PowerPoint deck",
        summary: "Generated a PowerPoint deck artifact.",
        status: "ready",
        filename: "report.pptx",
      },
    ],
    logs: [
      {
        level: "info",
        step: "report-planner",
        message: "The report planner built the multi-format report plan.",
        timestamp: new Date().toISOString(),
      },
    ],
    featureFlagEnabled: true,
    usedLlm: false,
  };
}

const bundle = createReportBundle(
  createSalesSnapshot(),
  "Create an executive monthly report with KPI blocks, email update, and six slides.",
  {
    mode: "prompt-guided",
    variationSeed: 2,
  }
);

test("plan brief keeps prompt editing available during AI refresh", () => {
  const markup = renderToStaticMarkup(
    <PlanView
      activeWorkspace="brief"
      workspaceTabs={createPlanWorkspaceTabs()}
      onWorkspaceChange={() => undefined}
      mode="prompt-guided"
      isActionBusy={false}
      isBackgroundRefreshing={true}
      isPlanReady={true}
      promptStarters={[{ label: "Starter", prompt: "Starter prompt", mode: "automatic" }]}
      promptText="Keep the report board-ready."
      businessContext="Monthly sales performance by region and product line."
      reportIntake={null}
      intakeMessage=""
      bundle={bundle}
      variationSeed={42}
      templateName=""
      templates={[]}
      selectedTemplateId=""
      selectedTemplate={null}
      aiStatusLabel="Configured"
      hasPendingAiChanges={false}
      aiActionHint="AI enhancement is armed."
      llmConfig={{
        ...DEFAULT_LLM_PROVIDER_CONFIG,
        enabled: true,
        providerLabel: "Test Gateway",
        endpoint: "https://gateway.example.com/v1/chat/completions",
        model: "gpt-4.1-mini",
      }}
      llmSecret={{ apiKey: "session-key" }}
      hasManagedPreset={false}
      managedPresetSummary=""
      onModeChange={() => undefined}
      onApplyPromptStarter={() => undefined}
      onPromptChange={() => undefined}
      onBusinessContextChange={() => undefined}
      onIntakeMessageChange={() => undefined}
      onSubmitIntakeMessage={() => undefined}
      onGenerateNow={() => undefined}
      onOpenOutputs={() => undefined}
      onShuffleVariation={() => undefined}
      onTemplateNameChange={() => undefined}
      onSelectedTemplateChange={() => undefined}
      onSaveTemplate={() => undefined}
      onApplyTemplate={() => undefined}
      onDeleteTemplate={() => undefined}
      onLlmConfigChange={() => undefined}
      onLlmSecretChange={() => undefined}
      onSaveAiSettings={() => undefined}
      onRestoreManagedPreset={() => undefined}
      onTestAiConnection={() => undefined}
      onClearAiKey={() => undefined}
    />
  );

  assert.equal(findTextareaMarkup(markup).includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Randomize Report").includes("disabled"), false);
  assert.equal(markup.includes("AI enhancement is still running in the background"), true);
});

test("plan ai workspace keeps settings editable during AI refresh while connection tests stay locked", () => {
  const markup = renderToStaticMarkup(
    <PlanView
      activeWorkspace="ai"
      workspaceTabs={createPlanWorkspaceTabs()}
      onWorkspaceChange={() => undefined}
      mode="prompt-guided"
      isActionBusy={false}
      isBackgroundRefreshing={true}
      isPlanReady={true}
      promptStarters={[{ label: "Starter", prompt: "Starter prompt", mode: "automatic" }]}
      promptText="Keep the report board-ready."
      businessContext="Monthly sales performance by region and product line."
      reportIntake={null}
      intakeMessage=""
      bundle={bundle}
      variationSeed={42}
      templateName=""
      templates={[]}
      selectedTemplateId=""
      selectedTemplate={null}
      aiStatusLabel="Unsaved"
      hasPendingAiChanges={true}
      aiActionHint="AI enhancement is armed."
      llmConfig={{
        ...DEFAULT_LLM_PROVIDER_CONFIG,
        enabled: true,
        providerLabel: "Test Gateway",
        endpoint: "https://gateway.example.com/v1/chat/completions",
        model: "gpt-4.1-mini",
      }}
      llmSecret={{ apiKey: "session-key" }}
      hasManagedPreset={false}
      managedPresetSummary=""
      onModeChange={() => undefined}
      onApplyPromptStarter={() => undefined}
      onPromptChange={() => undefined}
      onBusinessContextChange={() => undefined}
      onIntakeMessageChange={() => undefined}
      onSubmitIntakeMessage={() => undefined}
      onGenerateNow={() => undefined}
      onOpenOutputs={() => undefined}
      onShuffleVariation={() => undefined}
      onTemplateNameChange={() => undefined}
      onSelectedTemplateChange={() => undefined}
      onSaveTemplate={() => undefined}
      onApplyTemplate={() => undefined}
      onDeleteTemplate={() => undefined}
      onLlmConfigChange={() => undefined}
      onLlmSecretChange={() => undefined}
      onSaveAiSettings={() => undefined}
      onRestoreManagedPreset={() => undefined}
      onTestAiConnection={() => undefined}
      onClearAiKey={() => undefined}
    />
  );

  assert.equal(
    findInputMarkup(markup, "https://api.openai.com/v1/chat/completions").includes("disabled"),
    false
  );
  assert.equal(findButtonMarkup(markup, "Save AI Settings").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Test Connection").includes("disabled"), true);
});

test("automation view keeps prompt editing available during AI refresh while execution stays locked", () => {
  const markup = renderToStaticMarkup(
    <AutomationView
      agentActionHint="Review the bounded plan."
      agentPromptText="Format the active selection and build the report."
      agentPlan={null}
      agentExecutionResult={null}
      isPlanReady={true}
      isActionBusy={false}
      isBackgroundRefreshing={true}
      onAgentPromptChange={() => undefined}
      onPreviewAgentPlan={() => undefined}
      onRunAgentPlan={() => undefined}
    />
  );

  assert.equal(findTextareaMarkup(markup).includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Preview Agent Plan").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Execute Approved Plan").includes("disabled"), true);
});

test("outputs view keeps review fields editable during AI refresh but locks live Google actions", () => {
  const markup = renderToStaticMarkup(
    <OutputsView
      activeWorkspace="email"
      workspaceTabs={createOutputWorkspaceTabs()}
      onWorkspaceChange={() => undefined}
      bundle={bundle}
      outputSummary={[
        { label: "Workbook", value: "Ready", detail: "Primary Excel output" },
        { label: "Web App", value: "Scaffold", detail: "Apps Script project" },
        { label: "Email", value: "Ready", detail: bundle.emailBundle.primary.subject },
        { label: "Slides", value: "6 slides", detail: bundle.slidesBundle.title },
      ]}
      isPlanReady={true}
      isActionBusy={false}
      isBackgroundRefreshing={true}
      onCopyText={() => undefined}
      excel={{
        excelSummary: summarizeExcelPlan(bundle.plan),
        complexitySummary: { rowCount: 4, columnCount: 5, chartCount: 3 },
        renderResult: {
          reportSheetName: "RF Report 001",
          detailSheetName: "RF Data 001",
          supportSheetName: "RF Support 001",
          notes: [],
        },
        isReportEligible: true,
        excelSupported: true,
        actionHint: "Workbook generation is available.",
        onBuildReport: () => undefined,
        onOpenReportSheet: () => undefined,
        onOpenDetailSheet: () => undefined,
      }}
      webApp={{
        actionHint: "Ready for export.",
        googleConfig: createGoogleConfig(),
        googleToken: createGoogleToken(),
        googleConnection: createGoogleConnectionState(),
        googleAuthState: createGoogleAuthState(),
        isGoogleConfigured: true,
        isManagedClientId: true,
        googleSetupIssue: "",
        googleScopeState: { gmail: true, script: true, deploy: true },
        appsScriptOptions: createAppsScriptOptions(),
        appsScriptResult: null,
        onGoogleConfigChange: () => undefined,
        onAppsScriptOptionsChange: () => undefined,
        onSaveGoogleSettings: () => undefined,
        onConnectGoogle: () => undefined,
        onDisconnectGoogle: () => undefined,
        onExportProject: () => undefined,
        exportActionLabel: "Export Project",
        deployActionLabel: "Export & Deploy",
      }}
      email={{
        actionHint: "Ready to create a Gmail draft.",
        activeEmail: bundle.emailBundle.primary,
        selectedAudience: "primary",
        emailRecipients: createRecipients(),
        gmailDraftResult: null,
        hasRecipients: true,
        actionLabel: "Create Gmail Draft",
        onAudienceChange: () => undefined,
        onRecipientsChange: () => undefined,
        onCreateDraft: () => undefined,
      }}
      slides={createSlidesProps()}
    />
  );

  assert.equal(findInputMarkup(markup, "ceo@company.com").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Copy Subject").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Create Gmail Draft").includes("disabled"), true);
});

test("outputs view keeps previously generated workbook sheets accessible during AI refresh", () => {
  const markup = renderToStaticMarkup(
    <OutputsView
      activeWorkspace="excel"
      workspaceTabs={createOutputWorkspaceTabs()}
      onWorkspaceChange={() => undefined}
      bundle={bundle}
      outputSummary={[
        { label: "Workbook", value: "Created", detail: "RF Report 001" },
        { label: "Web App", value: "Scaffold", detail: "Apps Script project" },
        { label: "Email", value: "Ready", detail: bundle.emailBundle.primary.subject },
        { label: "Slides", value: "6 slides", detail: bundle.slidesBundle.title },
      ]}
      isPlanReady={true}
      isActionBusy={false}
      isBackgroundRefreshing={true}
      onCopyText={() => undefined}
      excel={{
        excelSummary: summarizeExcelPlan(bundle.plan),
        complexitySummary: { rowCount: 4, columnCount: 5, chartCount: 3 },
        renderResult: {
          reportSheetName: "RF Report 001",
          detailSheetName: "RF Data 001",
          supportSheetName: "RF Support 001",
          notes: [],
        },
        isReportEligible: true,
        excelSupported: true,
        actionHint: "Workbook generation is available.",
        onBuildReport: () => undefined,
        onOpenReportSheet: () => undefined,
        onOpenDetailSheet: () => undefined,
      }}
      webApp={{
        actionHint: "Ready for export.",
        googleConfig: createGoogleConfig(),
        googleToken: createGoogleToken(),
        googleConnection: createGoogleConnectionState(),
        googleAuthState: createGoogleAuthState(),
        isGoogleConfigured: true,
        isManagedClientId: true,
        googleSetupIssue: "",
        googleScopeState: { gmail: true, script: true, deploy: true },
        appsScriptOptions: createAppsScriptOptions(),
        appsScriptResult: null,
        onGoogleConfigChange: () => undefined,
        onAppsScriptOptionsChange: () => undefined,
        onSaveGoogleSettings: () => undefined,
        onConnectGoogle: () => undefined,
        onDisconnectGoogle: () => undefined,
        onExportProject: () => undefined,
        exportActionLabel: "Export Project",
        deployActionLabel: "Export & Deploy",
      }}
      email={{
        actionHint: "Ready to create a Gmail draft.",
        activeEmail: bundle.emailBundle.primary,
        selectedAudience: "primary",
        emailRecipients: createRecipients(),
        gmailDraftResult: null,
        hasRecipients: true,
        actionLabel: "Create Gmail Draft",
        onAudienceChange: () => undefined,
        onRecipientsChange: () => undefined,
        onCreateDraft: () => undefined,
      }}
      slides={createSlidesProps()}
    />
  );

  assert.equal(findButtonMarkup(markup, "Write Workbook Report").includes("disabled"), true);
  assert.equal(findButtonMarkup(markup, "Open Report Sheet").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Open Detail Sheet").includes("disabled"), false);
});

test("slides workspace exposes export and template actions without hiding the preview", () => {
  const markup = renderToStaticMarkup(
    <OutputsView
      activeWorkspace="slides"
      workspaceTabs={createOutputWorkspaceTabs()}
      onWorkspaceChange={() => undefined}
      bundle={bundle}
      outputSummary={[
        { label: "Workbook", value: "Created", detail: "RF Report 001" },
        { label: "Web App", value: "Scaffold", detail: "Apps Script project" },
        { label: "Email", value: "Ready", detail: bundle.emailBundle.primary.subject },
        { label: "Slides", value: "6 slides", detail: bundle.slidesBundle.title },
      ]}
      isPlanReady={true}
      isActionBusy={false}
      isBackgroundRefreshing={false}
      onCopyText={() => undefined}
      excel={{
        excelSummary: summarizeExcelPlan(bundle.plan),
        complexitySummary: { rowCount: 4, columnCount: 5, chartCount: 3 },
        renderResult: null,
        isReportEligible: true,
        excelSupported: true,
        actionHint: "Workbook generation is available.",
        onBuildReport: () => undefined,
        onOpenReportSheet: () => undefined,
        onOpenDetailSheet: () => undefined,
      }}
      webApp={{
        actionHint: "Ready for export.",
        googleConfig: createGoogleConfig(),
        googleToken: createGoogleToken(),
        googleConnection: createGoogleConnectionState(),
        googleAuthState: createGoogleAuthState(),
        isGoogleConfigured: true,
        isManagedClientId: true,
        googleSetupIssue: "",
        googleScopeState: { gmail: true, script: true, deploy: true },
        appsScriptOptions: createAppsScriptOptions(),
        appsScriptResult: null,
        onGoogleConfigChange: () => undefined,
        onAppsScriptOptionsChange: () => undefined,
        onSaveGoogleSettings: () => undefined,
        onConnectGoogle: () => undefined,
        onDisconnectGoogle: () => undefined,
        onExportProject: () => undefined,
        exportActionLabel: "Export Project",
        deployActionLabel: "Export & Deploy",
      }}
      email={{
        actionHint: "Ready to create a Gmail draft.",
        activeEmail: bundle.emailBundle.primary,
        selectedAudience: "primary",
        emailRecipients: createRecipients(),
        gmailDraftResult: null,
        hasRecipients: true,
        actionLabel: "Create Gmail Draft",
        onAudienceChange: () => undefined,
        onRecipientsChange: () => undefined,
        onCreateDraft: () => undefined,
      }}
      slides={createSlidesProps()}
    />
  );

  assert.equal(findButtonMarkup(markup, "Download PowerPoint").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Open PDF Preview").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Generate Template").includes("disabled"), false);
  assert.equal(markup.includes("Export Status"), true);
  assert.equal(markup.includes("Open PowerPoint File"), true);
  assert.equal(markup.includes("Download PowerPoint Directly"), true);
  assert.equal(markup.includes("Generated slide deck preview"), true);
  assert.equal(markup.includes("Deck template"), true);
  assert.equal(markup.includes("Markdown deck outline"), true);
  assert.equal(markup.includes("HTML deck source"), true);
});

test("canvas workspace exposes the internal reporting studio inside the add-in", () => {
  const markup = renderToStaticMarkup(
    <OutputsView
      activeWorkspace="canvas"
      workspaceTabs={createOutputWorkspaceTabs(true)}
      onWorkspaceChange={() => undefined}
      bundle={bundle}
      outputSummary={[
        { label: "Workbook", value: "Created", detail: "RF Report 001" },
        { label: "Web App", value: "Scaffold", detail: "Apps Script project" },
        { label: "Email", value: "Ready", detail: bundle.emailBundle.primary.subject },
        { label: "Slides", value: "6 slides", detail: bundle.slidesBundle.title },
        { label: "Canvas", value: "success", detail: bundle.plan.title },
      ]}
      isPlanReady={true}
      isActionBusy={false}
      isBackgroundRefreshing={false}
      onCopyText={() => undefined}
      excel={{
        excelSummary: summarizeExcelPlan(bundle.plan),
        complexitySummary: { rowCount: 4, columnCount: 5, chartCount: 3 },
        renderResult: null,
        isReportEligible: true,
        excelSupported: true,
        actionHint: "Workbook generation is available.",
        onBuildReport: () => undefined,
        onOpenReportSheet: () => undefined,
        onOpenDetailSheet: () => undefined,
      }}
      webApp={{
        actionHint: "Ready for export.",
        googleConfig: createGoogleConfig(),
        googleToken: createGoogleToken(),
        googleConnection: createGoogleConnectionState(),
        googleAuthState: createGoogleAuthState(),
        isGoogleConfigured: true,
        isManagedClientId: true,
        googleSetupIssue: "",
        googleScopeState: { gmail: true, script: true, deploy: true },
        appsScriptOptions: createAppsScriptOptions(),
        appsScriptResult: null,
        onGoogleConfigChange: () => undefined,
        onAppsScriptOptionsChange: () => undefined,
        onSaveGoogleSettings: () => undefined,
        onConnectGoogle: () => undefined,
        onDisconnectGoogle: () => undefined,
        onExportProject: () => undefined,
        exportActionLabel: "Export Project",
        deployActionLabel: "Export & Deploy",
      }}
      email={{
        actionHint: "Ready to create a Gmail draft.",
        activeEmail: bundle.emailBundle.primary,
        selectedAudience: "primary",
        emailRecipients: createRecipients(),
        gmailDraftResult: null,
        hasRecipients: true,
        actionLabel: "Create Gmail Draft",
        onAudienceChange: () => undefined,
        onRecipientsChange: () => undefined,
        onCreateDraft: () => undefined,
      }}
      slides={createSlidesProps()}
      canvas={{
        isGenerating: false,
        canvasPrompt: "Build a client-ready canvas pack.",
        canvasTemplateName: "Client-ready canvas pack",
        selectedTemplateId: "canvas-client-pack",
        selectedPresetId: "client-decision-pack",
        effectiveBrief: "Build a client-ready canvas pack.",
        effectiveBriefSource: "Canvas brief",
        presetOptions: [
          {
            id: "client-decision-pack",
            label: "Client Decision Pack",
            promptHint: "Best for client-facing decks.",
          },
        ],
        savedTemplates: [
          {
            id: "canvas-client-pack",
            name: "Client-ready canvas pack",
            presetId: "client-decision-pack",
            styleName: "Client decision canvas",
          },
        ],
        result: createCanvasResult(),
        designSpec: createCanvasResult().designSpec,
        canvasDocument: createCanvasResult().canvasDocument,
        comparisonDocument: createCanvasResult().canvasDocument,
        canvasLayoutIssues: [],
        previewMode: "report",
        reportPreviewHtml: "<html><body><h1>Canvas Report</h1></body></html>",
        emailPreviewHtml: bundle.emailBundle.primary.html,
        slidesPreviewHtml: bundle.slidesBundle.html,
        autosaveStatus: "Autosaved 10:00",
        recoveredDraftAt: null,
        snapshots: [],
        selectedSnapshotId: "",
        snapshotComparison: "No saved snapshot selected.",
        snapshotDetails: null,
        onCanvasPromptChange: () => undefined,
        onCanvasTemplateNameChange: () => undefined,
        onSelectedTemplateChange: () => undefined,
        onPresetChange: () => undefined,
        onSaveTemplate: () => undefined,
        onApplyTemplate: () => undefined,
        onDeleteTemplate: () => undefined,
        onGenerate: () => undefined,
        onGenerateVariation: () => undefined,
        onCanvasAiCoEdit: async () => "",
        onPreviewChange: () => undefined,
        onCanvasLayoutModeChange: () => undefined,
        onAddCanvasBlock: () => undefined,
        onUpdateCanvasBlock: () => undefined,
        onSetCanvasBlockFrame: () => undefined,
        onNudgeCanvasBlock: () => undefined,
        onRemoveCanvasBlock: () => undefined,
        onReplaceCanvasDocument: () => undefined,
        onCheckpointCanvasHistory: () => undefined,
        onUndoCanvas: () => undefined,
        onRedoCanvas: () => undefined,
        canUndoCanvas: true,
        canRedoCanvas: false,
        onResetCanvasLayout: () => undefined,
        onSaveCanvasSnapshot: () => undefined,
        onRestoreCanvasSnapshot: () => undefined,
        onDeleteCanvasSnapshot: () => undefined,
        onSelectedCanvasSnapshotChange: () => undefined,
        onDiscardRecoveredDraft: () => undefined,
        onDownloadArtifact: () => undefined,
        onCopyArtifactText: () => undefined,
      }}
    />
  );

  assert.equal(markup.includes("Canvas Studio"), true);
  assert.equal(markup.includes("Canvas Template Library"), true);
  assert.equal(markup.includes("Brief In Use"), true);
  assert.equal(findButtonMarkup(markup, "Generate Canvas Pack").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Generate AI Variation").includes("disabled"), false);
  assert.equal(findButtonMarkup(markup, "Save Template").includes("disabled"), false);
  assert.equal(markup.includes("Canvas Layout Studio"), true);
  assert.equal(markup.includes("Inspector"), true);
  assert.equal(markup.includes("Mini-map"), true);
  assert.equal(markup.includes("Compare Overlay"), true);
  assert.equal(markup.includes("AI co-edit instruction"), true);
  assert.equal(markup.includes("Regenerate Selection"), true);
  assert.equal(markup.includes("Marquee Select"), true);
  assert.equal(markup.includes("Lasso Select"), true);
  assert.equal(markup.includes("Layers"), true);
  assert.equal(markup.includes("Layout Quality Gate"), true);
  assert.equal(markup.includes("HTML Report"), true);
  assert.equal(markup.includes("Execution Log"), true);
});
