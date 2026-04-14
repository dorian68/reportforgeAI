import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { SectionCard } from "../components/SectionCard";
import { StatusPill } from "../components/StatusPill";
import { TaskpaneTabs } from "../components/TaskpaneTabs";
import { getDefaultAgentPrompt, planAgentActions } from "../domain/agent/planAgentActions";
import { profileRangeData } from "../domain/dataProfiling/profileRangeData";
import { createReportBundle } from "../domain/orchestration/createReportBundle";
import {
  applyConversationMessage,
  createInitialIntakeState,
} from "../domain/reporting/reportBrief";
import { interpretPrompt } from "../domain/prompt/interpretPrompt";
import { summarizeExcelPlan } from "../generators/excel/summarizeExcelPlan";
import { enhanceBundleWithLlm } from "../services/ai/enhanceBundle";
import { canUseLlm, requiresLlmClientSecret } from "../services/ai/llmClient";
import { probeLlmProvider } from "../services/ai/llmHealth";
import {
  buildDiagnosticsBundle,
  createOperationId,
  getDiagnosticEntries,
  recordDiagnosticEvent,
} from "../services/diagnostics/clientDiagnostics";
import { exportAppsScriptProject } from "../services/google/appsScriptProjects";
import {
  getGoogleConnectionState,
  hasGoogleClientId,
  isGoogleTokenActive,
  requestGoogleAccessToken,
  revokeGoogleAccess,
  tokenHasScopes,
} from "../services/google/googleAuth";
import { GoogleApiError } from "../services/google/googleApi";
import { createGmailDraft } from "../services/google/gmailDrafts";
import {
  clearGoogleOAuthRuntimeState,
  markGoogleOAuthRuntimeError,
} from "../services/google/googleAuthSession";
import {
  clearCanvasStudioDraft,
  clearGoogleAuthState,
  clearLlmSessionSecret,
  clearGoogleToken,
  createTemplateId,
  deleteCanvasStudioSnapshot,
  deleteCanvasTemplate,
  deleteSlideTemplate,
  deleteTemplate,
  loadCanvasStudioDraft,
  loadCanvasStudioSnapshots,
  loadGoogleSessionState,
  saveGoogleAuthState,
  loadSavedCanvasTemplates,
  loadLlmProviderConfig,
  loadLlmSessionSecret,
  loadSavedSlideTemplates,
  loadSavedTemplates,
  saveCanvasStudioDraft,
  saveCanvasStudioSnapshot,
  saveCanvasTemplate,
  saveGoogleConfig,
  saveGoogleToken,
  saveLlmProviderConfig,
  saveLlmSessionSecret,
  saveSlideTemplate,
  saveTemplate,
} from "../services/persistence/reportForgeStorage";
import { getPersistenceStatus } from "../services/persistence/safeStorage";
import {
  DEFAULT_OFFICE_CAPABILITIES,
  capabilityWarnings,
  detectOfficeCapabilities,
} from "../services/office/capabilities";
import { activateWorksheetByName } from "../services/office/activateWorksheet";
import { AgentExecutionResult, executeAgentPlan } from "../services/office/executeAgentPlan";
import {
  normalizeCanvasDocument,
  normalizeCanvasPage,
  patchCanvasBlockFrame,
} from "../services/canvas/canvasGeometry";
import {
  compareCanvasDocuments,
  createCanvasSnapshot,
  removeCanvasBlocksFromPage,
  summarizeCanvasSnapshotDiff,
  validateCanvasDocumentLayout,
} from "../services/canvas/canvasStudio";
import {
  CanvasHistoryState,
  pushCanvasHistory,
  redoCanvasHistory,
  undoCanvasHistory,
} from "../services/canvas/canvasHistory";
import {
  getSelectedRangeSnapshot,
  inspectSelectedRange,
} from "../services/office/getSelectedRangeSnapshot";
import {
  buildExcelRenderPolicy,
  buildRenderComplexitySummary,
  evaluateSelectionPreflight,
} from "../services/office/guardrails";
import { ExcelRenderResult, renderExcelReport } from "../services/office/renderExcelReport";
import {
  DEFAULT_LLM_PROVIDER_CONFIG,
  DEFAULT_PERSISTENCE_STATUS,
  GOOGLE_SCOPES,
} from "../shared/constants";
import {
  DEFAULT_SLIDE_TEMPLATE_ID,
  generateSlideTemplateWithLlm,
  getAllSlideTemplates,
  renderSlideDeckHtml,
  resolveSlideTemplate,
} from "../services/slides/slideTemplates";
import {
  getPublicRuntimeConfig,
  resolveGoogleConfigWithRuntimeDefaults,
  resolveLlmConfigWithRuntimeDefaults,
} from "../shared/publicRuntimeConfig";
import {
  AgentPlan,
  AppsScriptDeploymentOptions,
  AppsScriptProjectResult,
  CanvasBlockSpec,
  CanvasComponentKind,
  CanvasDesignIntent,
  CanvasDocument,
  CanvasDocumentSnapshot,
  DatasetProfile,
  GmailDraftRecipients,
  GmailDraftResult,
  GoogleConnectionState,
  GoogleOAuthConfig,
  GoogleOAuthRuntimeState,
  GoogleTokenRecord,
  LlmProviderConfig,
  LlmSessionSecret,
  OfficeCapabilityState,
  PersistenceStatus,
  RangeSelectionPreflight,
  RangeSnapshot,
  ReportDesignSpec,
  ReportBrief,
  ReportConversationTurn,
  ReportForgeBundle,
  ReportIntakeState,
  ReportMode,
  SavedSlideTemplate,
  SavedCanvasTemplate,
  SavedTemplate,
  SlideTemplateDefinition,
} from "../shared/types";
import { assessSelection, toFriendlyErrorMessage } from "../utils/userFeedback";
import { describeGoogleOAuthClientIdIssue } from "../utils/googleIdentity";
import {
  ActivityEntry,
  ActivityStatus,
  addActivityEntry,
  loadActivityHistory,
} from "./activityHistory";
import {
  buildTaskpaneViews,
  loadTaskpaneViewPreference,
  resolveActiveTaskpaneView,
  saveTaskpaneViewPreference,
  TaskpaneViewId,
} from "./navigation";
import { createSingleFlightGuard, SingleFlightClaim } from "./singleFlight";
import {
  buildOutputWorkspaceTabs,
  buildPlanWorkspaceTabs,
  loadOutputWorkspacePreference,
  loadPlanWorkspacePreference,
  OutputWorkspaceId,
  PlanWorkspaceId,
  resolveWorkspaceTab,
  saveOutputWorkspacePreference,
  savePlanWorkspacePreference,
} from "./workspaceNavigation";
import { AutomationView } from "./views/AutomationView";
import { OutputsView } from "./views/OutputsView";
import { PlanView } from "./views/PlanView";
import {
  REPORTING_PRESETS,
  applyReportingPreset,
} from "../reporting-engine/templates/reportingPresets";
import { designIntentFromSpec } from "../reporting-engine";
import type {
  RenderArtifact as CanvasRenderArtifact,
  ReportRequest as CanvasReportRequest,
  ReportResult as CanvasReportResult,
} from "../reporting-engine/domain/types";
import { renderCanvasDocumentHtml } from "../reporting-engine/renderers/renderCanvasDocumentHtml";
import {
  createPromptSignature,
  createSelectionKey,
  DEFAULT_WORKFLOW_FRESHNESS_STATE,
  workflowFreshnessReducer,
} from "./workflowFreshness";
import {
  createAppsScriptDraftStateFromValues,
  DEFAULT_APPS_SCRIPT_DRAFT_STATE,
  hasPendingLlmDraftChanges,
  reconcileAppsScriptOptionsWithPlan,
  resolveSelectedEmailAudience,
} from "../utils/reportDraftState";
import {
  buildRuntimeIssueSignature,
  createRuntimeRecoveryMessage,
  shouldIgnoreRuntimeIssue,
} from "../utils/runtimeFeedback";

/* global Office */

const DEFAULT_PROMPT =
  "Make this an executive monthly report with KPI blocks at the top and charts below.";

const EMPTY_RECIPIENTS: GmailDraftRecipients = { to: "", cc: "", bcc: "" };
const DEFAULT_CANVAS_PRESET_ID = "client-decision-pack";

const PROMPT_STARTERS: Array<{ label: string; prompt: string; mode: ReportMode }> = [
  {
    label: "Executive Monthly",
    prompt: "Make this an executive monthly report with KPI blocks at the top and charts below.",
    mode: "prompt-guided",
  },
  {
    label: "Board Summary",
    prompt: "Create a board-style summary with concise narrative and high-level KPI cards.",
    mode: "prompt-guided",
  },
  {
    label: "Google Dashboard",
    prompt: "Create a simple Google web dashboard with KPI cards, filters, and a compact summary.",
    mode: "prompt-guided",
  },
  {
    label: "French Direction",
    prompt:
      "Fais un rapport mensuel de direction avec les KPI en haut, un resume clair et 5 diapositives.",
    mode: "prompt-guided",
  },
];

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  optional?: boolean;
}

export function App() {
  const analysisRequestRef = useRef(0);
  const planGenerationRef = useRef(0);
  const actionGuardRef = useRef(createSingleFlightGuard());
  const mountedRef = useRef(true);
  const readyRef = useRef(false);
  const runtimeIssueSignatureRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isExcelHost, setIsExcelHost] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [activeActionLabel, setActiveActionLabel] = useState<string | null>(null);
  const [workflowFreshness, dispatchWorkflowFreshness] = useReducer(
    workflowFreshnessReducer,
    DEFAULT_WORKFLOW_FRESHNESS_STATE
  );
  const [promptText, setPromptText] = useState(DEFAULT_PROMPT);
  const [businessContext, setBusinessContext] = useState("");
  const [reportBriefOverrides, setReportBriefOverrides] = useState<Partial<ReportBrief>>({});
  const [reportConversationTurns, setReportConversationTurns] = useState<ReportConversationTurn[]>(
    []
  );
  const [reportIntakeMessage, setReportIntakeMessage] = useState("");
  const [pendingGenerateNow, setPendingGenerateNow] = useState(false);
  const [agentPromptText, setAgentPromptText] = useState(getDefaultAgentPrompt());
  const [mode, setMode] = useState<ReportMode>("automatic");
  const [variationSeed, setVariationSeed] = useState(1);
  const [snapshot, setSnapshot] = useState<RangeSnapshot | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [baseBundle, setBaseBundle] = useState<ReportForgeBundle | null>(null);
  const [bundle, setBundle] = useState<ReportForgeBundle | null>(null);
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null);
  const [agentExecutionResult, setAgentExecutionResult] = useState<AgentExecutionResult | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Select a range in Excel, then click Analyze Selection.");
  const [renderResult, setRenderResult] = useState<ExcelRenderResult | null>(null);
  const [slidePdfPreviewUrl, setSlidePdfPreviewUrl] = useState<string | null>(null);
  const [slidePowerPointDownloadUrl, setSlidePowerPointDownloadUrl] = useState<string | null>(null);
  const [slidePowerPointDownloadFilename, setSlidePowerPointDownloadFilename] = useState("");
  const [canvasPrompt, setCanvasPrompt] = useState("");
  const [selectedCanvasPresetId, setSelectedCanvasPresetId] = useState(DEFAULT_CANVAS_PRESET_ID);
  const [canvasResult, setCanvasResult] = useState<CanvasReportResult | null>(null);
  const [canvasDesignSpec, setCanvasDesignSpec] = useState<ReportDesignSpec | null>(null);
  const [canvasDocumentDraft, setCanvasDocumentDraft] = useState<CanvasDocument | null>(null);
  const [canvasDesignIntentDraft, setCanvasDesignIntentDraft] = useState<CanvasDesignIntent | null>(
    null
  );
  const [canvasPreviewMode, setCanvasPreviewMode] = useState<"report" | "email" | "slides">(
    "report"
  );
  const [canvasHistory, setCanvasHistory] = useState<CanvasHistoryState>({
    undoStack: [],
    redoStack: [],
  });
  const [canvasSnapshots, setCanvasSnapshots] = useState<CanvasDocumentSnapshot[]>(() =>
    loadCanvasStudioSnapshots()
  );
  const [selectedCanvasSnapshotId, setSelectedCanvasSnapshotId] = useState("");
  const [canvasAutosaveStatus, setCanvasAutosaveStatus] = useState("No unsaved canvas edits.");
  const [canvasRecoveredDraftAt, setCanvasRecoveredDraftAt] = useState<string | null>(null);
  const [selectedEmailAudience, setSelectedEmailAudience] = useState("primary");
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [slideTemplates, setSlideTemplates] = useState<SavedSlideTemplate[]>([]);
  const [selectedSlideTemplateId, setSelectedSlideTemplateId] = useState(DEFAULT_SLIDE_TEMPLATE_ID);
  const [slideTemplatePrompt, setSlideTemplatePrompt] = useState("");
  const [canvasTemplateName, setCanvasTemplateName] = useState("");
  const [canvasTemplates, setCanvasTemplates] = useState<SavedCanvasTemplate[]>(() =>
    loadSavedCanvasTemplates()
  );
  const [selectedCanvasTemplateId, setSelectedCanvasTemplateId] = useState("");
  const [googleConfig, setGoogleConfigState] = useState<GoogleOAuthConfig>({ clientId: "" });
  const [googleToken, setGoogleTokenState] = useState<GoogleTokenRecord | null>(null);
  const [googleAuthState, setGoogleAuthState] = useState<GoogleOAuthRuntimeState>(
    clearGoogleOAuthRuntimeState()
  );
  const [googleConnection, setGoogleConnection] = useState<GoogleConnectionState>({
    status: "disconnected",
    label: "Google Optional",
    requiresReconnect: false,
  });
  const [llmConfig, setLlmConfigState] = useState<LlmProviderConfig>(DEFAULT_LLM_PROVIDER_CONFIG);
  const [llmSecret, setLlmSecretState] = useState<LlmSessionSecret | null>(null);
  const [appliedLlmConfig, setAppliedLlmConfig] = useState<LlmProviderConfig>(
    DEFAULT_LLM_PROVIDER_CONFIG
  );
  const [appliedLlmSecret, setAppliedLlmSecret] = useState<LlmSessionSecret | null>(null);
  const [emailRecipients, setEmailRecipients] = useState<GmailDraftRecipients>(EMPTY_RECIPIENTS);
  const [gmailDraftResult, setGmailDraftResult] = useState<GmailDraftResult | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>(
    DEFAULT_PERSISTENCE_STATUS
  );
  const [officeCapabilities, setOfficeCapabilities] = useState<OfficeCapabilityState>(
    DEFAULT_OFFICE_CAPABILITIES
  );
  const [startupIssue, setStartupIssue] = useState<string | null>(null);
  const [pendingSelectionPreflight, setPendingSelectionPreflight] =
    useState<RangeSelectionPreflight | null>(null);
  const [lastOperationId, setLastOperationId] = useState<string | null>(null);
  const [appsScriptOptions, setAppsScriptOptions] = useState<AppsScriptDeploymentOptions>({
    scriptTitle: "",
    deploymentDescription: "",
    deployAsWebApp: false,
    webAppAccess: "MYSELF",
    executeAs: "USER_ACCESSING",
  });
  const [appsScriptDraftState, setAppsScriptDraftState] = useState(DEFAULT_APPS_SCRIPT_DRAFT_STATE);
  const [appsScriptResult, setAppsScriptResult] = useState<AppsScriptProjectResult | null>(null);
  const appsScriptOptionsRef = useRef<AppsScriptDeploymentOptions>({
    scriptTitle: "",
    deploymentDescription: "",
    deployAsWebApp: false,
    webAppAccess: "MYSELF",
    executeAs: "USER_ACCESSING",
  });
  const slidePdfPreviewUrlRef = useRef<string | null>(null);
  const slidePowerPointDownloadUrlRef = useRef<string | null>(null);
  const canvasDocumentDraftRef = useRef<CanvasDocument | null>(null);
  const canvasDraftRecoveryAttemptedRef = useRef(false);
  const [activeView, setActiveView] = useState<TaskpaneViewId>(() => loadTaskpaneViewPreference());
  const [activePlanWorkspace, setActivePlanWorkspace] = useState<PlanWorkspaceId>(() =>
    loadPlanWorkspacePreference()
  );
  const [activeOutputWorkspace, setActiveOutputWorkspace] = useState<OutputWorkspaceId>(() =>
    loadOutputWorkspacePreference()
  );
  const [activityHistory, setActivityHistory] = useState<ActivityEntry[]>(() =>
    loadActivityHistory()
  );
  const deferredPrompt = useDeferredValue(promptText);
  const deferredBusinessContext = useDeferredValue(businessContext);
  const reportIntake = useMemo<ReportIntakeState | null>(() => {
    if (!snapshot || !profile) {
      return null;
    }

    const prompt = interpretPrompt(promptText, { mode, variationSeed }, businessContext);
    const nextState = createInitialIntakeState(snapshot, profile, prompt, reportBriefOverrides);
    return {
      ...nextState,
      turns: reportConversationTurns,
    };
  }, [
    businessContext,
    mode,
    profile,
    promptText,
    reportBriefOverrides,
    reportConversationTurns,
    snapshot,
    variationSeed,
  ]);
  const runtimeConfig = useMemo(() => getPublicRuntimeConfig(), []);
  const isCanvasStudioEnabled = runtimeConfig.internalReportingEngine.enabled;

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
  const slideFallbackTheme = useMemo(
    () =>
      bundle?.slidesBundle.theme ??
      baseBundle?.slidesBundle.theme ?? {
        accent: "#0f766e",
        surface: "#f5fbfa",
        border: "#c3dfda",
        ink: "#17353a",
        muted: "#5f7b81",
      },
    [baseBundle, bundle]
  );
  const activeSlideTemplate = useMemo<SlideTemplateDefinition>(() => {
    return resolveSlideTemplate(selectedSlideTemplateId, slideFallbackTheme, slideTemplates);
  }, [selectedSlideTemplateId, slideFallbackTheme, slideTemplates]);
  const llmSlideTemplateContext = useMemo<SlideTemplateDefinition>(
    () => ({
      id: activeSlideTemplate.id,
      name: activeSlideTemplate.name,
      description: activeSlideTemplate.description,
      audienceLabel: activeSlideTemplate.audienceLabel,
      narrativeStyle: activeSlideTemplate.narrativeStyle,
      visualDirection: activeSlideTemplate.visualDirection,
      storytellingDirective: activeSlideTemplate.storytellingDirective,
      fontFamily: activeSlideTemplate.fontFamily,
      accent: activeSlideTemplate.accent,
      surface: activeSlideTemplate.surface,
      border: activeSlideTemplate.border,
      ink: activeSlideTemplate.ink,
      muted: activeSlideTemplate.muted,
      heroStyle: activeSlideTemplate.heroStyle,
      contentLayout: activeSlideTemplate.contentLayout,
      cardStyle: activeSlideTemplate.cardStyle,
      promptHint: activeSlideTemplate.promptHint,
    }),
    [
      activeSlideTemplate.id,
      activeSlideTemplate.name,
      activeSlideTemplate.description,
      activeSlideTemplate.audienceLabel,
      activeSlideTemplate.narrativeStyle,
      activeSlideTemplate.visualDirection,
      activeSlideTemplate.storytellingDirective,
      activeSlideTemplate.fontFamily,
      activeSlideTemplate.accent,
      activeSlideTemplate.surface,
      activeSlideTemplate.border,
      activeSlideTemplate.ink,
      activeSlideTemplate.muted,
      activeSlideTemplate.heroStyle,
      activeSlideTemplate.contentLayout,
      activeSlideTemplate.cardStyle,
      activeSlideTemplate.promptHint,
    ]
  );
  const slideTemplateOptions = useMemo(
    () =>
      getAllSlideTemplates(slideFallbackTheme, slideTemplates).map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        isCustom: slideTemplates.some((savedTemplate) => savedTemplate.id === template.id),
      })),
    [slideFallbackTheme, slideTemplates]
  );
  const slidePreviewHtml = useMemo(
    () => (bundle ? renderSlideDeckHtml(bundle.slidesBundle, activeSlideTemplate) : ""),
    [activeSlideTemplate, bundle]
  );
  const canDeleteSlideTemplate = useMemo(
    () => slideTemplates.some((template) => template.id === selectedSlideTemplateId),
    [selectedSlideTemplateId, slideTemplates]
  );
  const selectedSavedSlideTemplate = useMemo(
    () => slideTemplates.find((template) => template.id === selectedSlideTemplateId) ?? null,
    [selectedSlideTemplateId, slideTemplates]
  );
  const excelSummary = bundle ? summarizeExcelPlan(bundle.plan) : null;
  const canvasPresetOptions = useMemo(
    () =>
      REPORTING_PRESETS.map((preset) => ({
        id: preset.id,
        label: preset.label,
        promptHint: preset.promptHint,
      })),
    []
  );
  const selectedCanvasTemplate =
    canvasTemplates.find((template) => template.id === selectedCanvasTemplateId) ?? null;
  const selectedCanvasSnapshot =
    canvasSnapshots.find((snapshotEntry) => snapshotEntry.id === selectedCanvasSnapshotId) ?? null;
  const selectedCanvasPreset =
    REPORTING_PRESETS.find((preset) => preset.id === selectedCanvasPresetId) ?? null;
  const effectiveCanvasPrompt = useMemo(() => {
    return (
      canvasPrompt.trim() || promptText.trim() || selectedCanvasPreset?.promptHint || DEFAULT_PROMPT
    );
  }, [canvasPrompt, promptText, selectedCanvasPreset]);
  const effectiveCanvasPromptSource = canvasPrompt.trim()
    ? "Canvas brief"
    : promptText.trim()
      ? "Main report brief"
      : "Preset guidance";
  const isCanvasGenerating = isBusy && activeActionLabel === "Generating canvas pack";
  const canvasHtmlReportPreview = useMemo(() => {
    if (canvasResult && canvasDesignSpec && canvasDocumentDraft) {
      return renderCanvasDocumentHtml(
        canvasDocumentDraft,
        canvasDesignSpec,
        canvasResult.reportPlan,
        canvasResult.bundle
      );
    }

    const artifact = canvasResult?.artifacts.find(
      (entry) =>
        entry.format === "html" && entry.status === "ready" && typeof entry.textContent === "string"
    );
    return artifact?.textContent ?? "";
  }, [canvasDesignSpec, canvasDocumentDraft, canvasResult]);
  const canvasEmailPreview = useMemo(() => {
    const artifact = canvasResult?.artifacts.find(
      (entry) =>
        entry.format === "email-html" &&
        entry.status === "ready" &&
        typeof entry.textContent === "string"
    );
    return artifact?.textContent ?? canvasResult?.bundle.emailBundle.primary.html ?? "";
  }, [canvasResult]);
  const canvasSlidesPreview = useMemo(() => {
    const artifact = canvasResult?.artifacts.find(
      (entry) =>
        entry.id === "artifact-slide-preview" &&
        entry.status === "ready" &&
        typeof entry.textContent === "string"
    );
    return artifact?.textContent ?? canvasResult?.bundle.slidesBundle.html ?? "";
  }, [canvasResult]);
  const canvasLayoutIssues = useMemo(
    () => validateCanvasDocumentLayout(canvasDocumentDraft),
    [canvasDocumentDraft]
  );
  const canvasSnapshotComparison = useMemo(
    () => summarizeCanvasSnapshotDiff(canvasDocumentDraft, selectedCanvasSnapshot),
    [canvasDocumentDraft, selectedCanvasSnapshot]
  );
  const canvasSnapshotDetails = useMemo(
    () => compareCanvasDocuments(canvasDocumentDraft, selectedCanvasSnapshot),
    [canvasDocumentDraft, selectedCanvasSnapshot]
  );
  const emailOptions = bundle ? [bundle.emailBundle.primary, ...bundle.emailBundle.variants] : [];
  const activeEmail =
    emailOptions.find((draft) =>
      selectedEmailAudience === "primary"
        ? draft === bundle?.emailBundle.primary
        : draft.audience === selectedEmailAudience
    ) ??
    bundle?.emailBundle.primary ??
    null;
  const isGoogleConfigured = hasGoogleClientId(googleConfig);
  const isAiConfigured = canUseLlm(appliedLlmConfig, appliedLlmSecret);
  const canGenerateSlideTemplate = canUseLlm(appliedLlmConfig, appliedLlmSecret);
  const hasPendingAiChanges = hasPendingLlmDraftChanges(
    llmConfig,
    appliedLlmConfig,
    llmSecret,
    appliedLlmSecret
  );
  const isManagedGoogleClientId = runtimeConfig.hasManagedGoogleClientId;
  const hasManagedLlmPreset = runtimeConfig.llmPreset.available;
  const aiStatusLabel = bundle?.aiEnhancement
    ? "Enhanced"
    : hasPendingAiChanges
      ? "Unsaved"
      : appliedLlmConfig.enabled
        ? isAiConfigured
          ? "Configured"
          : "Incomplete"
        : "Off";
  const googleSetupIssue =
    googleConnection.status === "invalid"
      ? describeGoogleOAuthClientIdIssue(googleConfig.clientId)
      : "";
  const googleDeploymentMessage = isManagedGoogleClientId
    ? "Google sign-in is built into this deployment. The first Gmail or Apps Script action will open Google sign-in automatically if needed."
    : "Google sign-in is not enabled for this deployment yet. Ask the workspace administrator to enable it for end users.";
  const isPlanReady = workflowFreshness.planReady && Boolean(bundle);
  const isReportEligible = workflowFreshness.reportEligible && Boolean(bundle);
  const hasRecipients = useMemo(
    () =>
      [emailRecipients.to, emailRecipients.cc, emailRecipients.bcc].some(
        (value) => value.trim().length > 0
      ),
    [emailRecipients]
  );
  const googleScopeState = useMemo(
    () => ({
      gmail: tokenHasScopes(googleToken, [GOOGLE_SCOPES.gmailCompose]),
      script: tokenHasScopes(googleToken, [GOOGLE_SCOPES.scriptProjects]),
      deploy: tokenHasScopes(googleToken, [
        GOOGLE_SCOPES.scriptProjects,
        GOOGLE_SCOPES.scriptDeployments,
      ]),
    }),
    [googleToken]
  );
  const isGoogleConnected = googleConnection.status === "connected";
  const gmailPrimaryActionLabel = !isGoogleConfigured
    ? "Create Gmail Draft"
    : isGoogleConnected
      ? "Create Gmail Draft"
      : "Connect Google & Create Draft";
  const appsScriptPrimaryActionLabel = !isGoogleConfigured
    ? "Export Project"
    : isGoogleConnected
      ? "Export Project"
      : "Connect Google & Export";
  const appsScriptDeployActionLabel = !isGoogleConfigured
    ? "Export & Deploy"
    : isGoogleConnected
      ? "Export & Deploy"
      : "Connect Google & Deploy";
  const selectionAssessment = useMemo(
    () => (snapshot ? assessSelection(snapshot) : null),
    [snapshot]
  );
  const selectionWarnings = useMemo(() => {
    const warnings = [...(selectionAssessment?.warnings ?? [])];

    if (bundle && !bundle.profile.hasHeaders) {
      warnings.push(
        "Headers were not clearly detected. Add a labeled first row if you want cleaner titles, KPIs, and charts."
      );
    }

    return Array.from(new Set(warnings));
  }, [bundle, selectionAssessment]);
  const completedOutputCount = [
    Boolean(renderResult),
    Boolean(appsScriptResult),
    Boolean(gmailDraftResult),
    Boolean(canvasResult),
  ].filter(Boolean).length;
  const diagnostics = getDiagnosticEntries();
  const taskpaneViews = useMemo(
    () =>
      buildTaskpaneViews({
        isReady,
        isExcelHost,
        selectionReady: Boolean(snapshot),
        bundleReady: isPlanReady,
        outputsReady: completedOutputCount > 0,
        diagnosticsCount: Math.max(activityHistory.length, diagnostics.length),
      }),
    [
      activityHistory.length,
      completedOutputCount,
      diagnostics.length,
      isExcelHost,
      isPlanReady,
      isReady,
      snapshot,
    ]
  );
  const planWorkspaceTabs = useMemo(
    () =>
      buildPlanWorkspaceTabs({
        selectionReady: Boolean(snapshot),
        bundleReady: isPlanReady,
        templateCount: templates.length,
        aiEnabled: appliedLlmConfig.enabled,
        aiConfigured: isAiConfigured,
        aiEnhanced: Boolean(bundle?.aiEnhancement),
      }),
    [appliedLlmConfig.enabled, bundle, isAiConfigured, isPlanReady, snapshot, templates.length]
  );
  const outputWorkspaceTabs = useMemo(
    () =>
      buildOutputWorkspaceTabs({
        selectionReady: Boolean(snapshot),
        bundleReady: isPlanReady,
        excelGenerated: Boolean(renderResult),
        webAppExported: Boolean(appsScriptResult),
        emailGenerated: Boolean(gmailDraftResult),
        slidesReady: Boolean(bundle?.slidesBundle.slides.length),
        canvasEnabled: isCanvasStudioEnabled,
        canvasGenerated: Boolean(canvasResult),
      }),
    [
      appsScriptResult,
      bundle,
      canvasResult,
      gmailDraftResult,
      isCanvasStudioEnabled,
      isPlanReady,
      renderResult,
      snapshot,
    ]
  );
  const outputSummary = useMemo(
    () =>
      [
        {
          label: "Workbook",
          value: renderResult ? "Created" : isPlanReady ? "Ready" : "Pending",
          detail: renderResult ? renderResult.reportSheetName : "Primary Excel output",
        },
        {
          label: "Web App",
          value: appsScriptResult ? "Exported" : bundle ? "Scaffold ready" : "Waiting",
          detail: appsScriptResult ? appsScriptResult.scriptTitle : "Apps Script project",
        },
        {
          label: "Email",
          value: gmailDraftResult ? "Drafted" : bundle ? "Ready" : "Waiting",
          detail: activeEmail?.subject ?? "Client-ready summary",
        },
        {
          label: "Slides",
          value: bundle ? `${bundle.slidesBundle.slides.length} slides` : "Waiting",
          detail: bundle ? bundle.slidesBundle.title : "Presentation outline",
        },
        isCanvasStudioEnabled
          ? {
              label: "Canvas",
              value: canvasResult ? canvasResult.status : bundle ? "Studio ready" : "Waiting",
              detail: canvasResult?.reportPlan.title ?? "Internal multi-format pack",
            }
          : null,
      ].filter(Boolean) as Array<{ label: string; value: string; detail: string }>,
    [
      activeEmail,
      appsScriptResult,
      bundle,
      canvasResult,
      gmailDraftResult,
      isCanvasStudioEnabled,
      isPlanReady,
      renderResult,
    ]
  );
  const completedWorkflowCount = useMemo(
    () =>
      [
        isExcelHost,
        Boolean(snapshot && isPlanReady),
        promptText.trim().length > 0,
        completedOutputCount > 0 || isPlanReady,
      ].filter(Boolean).length,
    [completedOutputCount, isExcelHost, isPlanReady, promptText, snapshot]
  );
  const workflowSteps = useMemo<WorkflowStep[]>(
    () => [
      {
        id: "excel-host",
        title: "Open In Excel",
        description: "Launch the add-in from Excel Desktop or Excel on the web.",
        done: isExcelHost,
      },
      {
        id: "selection",
        title: "Analyze A Range",
        description: "Select a clean range or table, then profile it.",
        done: Boolean(snapshot && isPlanReady),
      },
      {
        id: "prompt",
        title: "Guide The Layout",
        description: "Use a short prompt or apply a saved template.",
        done: promptText.trim().length > 0,
      },
      {
        id: "outputs",
        title: "Generate Outputs",
        description: "Create the Excel report and review the other channels.",
        done: completedOutputCount > 0 || isPlanReady,
      },
      {
        id: "agent",
        title: "Use Agent Mode",
        description: "Optional. Preview a bounded Excel action plan, then approve execution.",
        done: Boolean(agentExecutionResult),
        optional: true,
      },
      {
        id: "ai",
        title: "Enable AI",
        description: "Optional. Add an LLM provider only if you want AI-enhanced narrative.",
        done: !appliedLlmConfig.enabled || Boolean(bundle?.aiEnhancement),
        optional: true,
      },
      {
        id: "google",
        title: "Connect Google",
        description: "Only needed for Gmail drafts and authenticated Apps Script export.",
        done: googleConnection.status === "connected",
        optional: true,
      },
    ],
    [
      agentExecutionResult,
      bundle,
      completedOutputCount,
      googleConnection.status,
      isExcelHost,
      isPlanReady,
      appliedLlmConfig.enabled,
      promptText,
      snapshot,
    ]
  );
  const nextStep = useMemo(() => {
    if (!isExcelHost) {
      return "Open the add-in inside Excel before using ReportForge AI.";
    }

    if (!snapshot) {
      return "Select a clean Excel range or table with headers, then click Analyze Selection.";
    }

    if (!isPlanReady) {
      return "Wait for the task pane to refresh the report plan from the current selection and prompt.";
    }

    if (!renderResult) {
      return "Write the Excel report first so you get a workbook-native output immediately.";
    }

    if (!agentExecutionResult) {
      return "If you want the add-in to carry out workbook operations for you, use Agent Mode to preview and approve a bounded action plan.";
    }

    if (appliedLlmConfig.enabled && !isAiConfigured) {
      return hasManagedLlmPreset
        ? requiresLlmClientSecret(appliedLlmConfig)
          ? "AI enhancement is almost ready. Complete the advanced provider credentials or disable AI if you want to stay fully deterministic."
          : "AI enhancement is almost ready. Save the AI settings or disable AI if you want to stay fully deterministic."
        : requiresLlmClientSecret(appliedLlmConfig)
          ? "AI enhancement is enabled but incomplete. Save an endpoint, model, and provider credentials, or disable AI."
          : "AI enhancement is enabled but incomplete. Save an endpoint and model, or disable AI.";
    }

    if (googleConnection.status === "invalid") {
      return googleSetupIssue;
    }

    if (!isGoogleConfigured) {
      return isManagedGoogleClientId
        ? "Google sign-in will start automatically the first time you create a Gmail draft or export Apps Script."
        : "If you need Gmail drafts or authenticated Apps Script export, save a Google OAuth client ID. Otherwise keep using the local outputs.";
    }

    if (googleConnection.requiresReconnect) {
      return "Reconnect Google before you create a Gmail draft or export Apps Script again.";
    }

    if (googleConnection.status !== "connected") {
      return "Connect Google when you are ready to create a real Gmail draft or export Apps Script. The first action can trigger sign-in automatically.";
    }

    return "You can now save this setup as a template or generate another output channel.";
  }, [
    agentExecutionResult,
    googleConnection.requiresReconnect,
    googleConnection.status,
    isAiConfigured,
    isExcelHost,
    isGoogleConfigured,
    isManagedGoogleClientId,
    isPlanReady,
    hasManagedLlmPreset,
    appliedLlmConfig.enabled,
    renderResult,
    snapshot,
    googleConnection.status,
    googleSetupIssue,
  ]);
  const capabilityNotes = useMemo(
    () => capabilityWarnings(officeCapabilities),
    [officeCapabilities]
  );
  const excelActionHint = !isPlanReady
    ? "Analyze a range first to preview the report plan and unlock workbook generation."
    : !officeCapabilities.excelApiSupported
      ? "Workbook generation is unavailable because this host does not support the required Excel APIs."
      : "This creates new report sheets in the current workbook without overwriting existing ones.";
  const appsScriptActionHint = !isPlanReady
    ? "Analyze a range first. The generated Apps Script files will appear here afterward."
    : googleConnection.status === "invalid"
      ? googleSetupIssue
      : !isGoogleConfigured
        ? googleDeploymentMessage
        : !isGoogleTokenActive(googleToken)
          ? "The first authenticated export will open Google sign-in if needed."
          : !googleScopeState.script
            ? "Export will request Apps Script permissions the first time you run it."
            : appsScriptOptions.deployAsWebApp
              ? "Ready for authenticated Apps Script export. Private web app access is the safe default."
              : "Ready for authenticated project export. Web app deployment is still disabled, which is the safer default.";
  const gmailActionHint =
    !activeEmail || !isPlanReady
      ? "Analyze a range first to generate draft content."
      : !hasRecipients
        ? "Add at least one recipient before creating a real Gmail draft."
        : googleConnection.status === "invalid"
          ? googleSetupIssue
          : !isGoogleConfigured
            ? googleDeploymentMessage
            : !isGoogleTokenActive(googleToken)
              ? "The first Gmail draft action will open Google sign-in if needed."
              : !googleScopeState.gmail
                ? "ReportForge will request Gmail access the first time you create a draft."
                : "Ready to create a Gmail draft in the connected Google account.";
  const aiActionHint = !isPlanReady
    ? "Analyze a range first. AI enhancement upgrades the wording after the base plan is generated."
    : hasPendingAiChanges
      ? "AI settings have unsaved changes. Save them before expecting the report enhancement behavior to change."
      : !appliedLlmConfig.enabled
        ? "AI is optional. Leave it off to keep all generation deterministic and local except for Google actions."
        : !isAiConfigured
          ? hasManagedLlmPreset
            ? requiresLlmClientSecret(llmConfig)
              ? "This deployment already knows the AI provider. Complete only the advanced provider credentials if you are testing a non-standard setup."
              : "This deployment already knows the AI provider and does not require end-user credentials. Save the settings to activate AI enhancement."
            : requiresLlmClientSecret(llmConfig)
              ? "Save a provider endpoint, model, and provider credentials before AI enhancement can run."
              : "Save a provider endpoint and model before AI enhancement can run."
          : isAiBusy
            ? `Enhancing the report narrative with ${appliedLlmConfig.providerLabel || "your LLM provider"}...`
            : bundle?.aiEnhancement
              ? `AI enhancement applied with ${bundle.aiEnhancement.providerLabel} (${bundle.aiEnhancement.model}).`
              : "AI enhancement is configured and will run after each analysis or prompt refresh.";
  const agentActionHint =
    !snapshot || !profile || !isPlanReady
      ? "Analyze a range first. Agent Mode only acts on the current selection and the report sheets it creates."
      : agentPlan
        ? "Review the plan carefully. Agent Mode is bounded to safe reporting actions and ignores destructive requests."
        : "Describe the workbook operation you want, preview the plan, then approve execution.";
  const isActionLocked = isBusy || isAiBusy;
  const isInputLocked = isBusy;
  const isBackgroundRefreshing = isAiBusy && !isBusy;
  const activeWorkLabel = activeActionLabel ?? (isAiBusy ? "Refreshing the plan with AI" : null);
  const complexitySummary = bundle
    ? buildRenderComplexitySummary(bundle.profile, bundle.plan)
    : null;
  const latestOutputMessage = renderResult
    ? `Latest workbook output: ${renderResult.reportSheetName} and ${renderResult.detailSheetName} were created in this workbook.`
    : gmailDraftResult
      ? `Latest Gmail draft: ${gmailDraftResult.id}.`
      : appsScriptResult
        ? `Latest Apps Script project: ${appsScriptResult.scriptTitle} (${appsScriptResult.scriptId}).`
        : bundle
          ? "Plan previews are ready in Outputs. Nothing has been exported live yet."
          : null;
  const workflowSpotlight = !isExcelHost
    ? {
        title: "Open ReportForge inside Excel",
        detail:
          "The add-in needs the Excel host before it can analyze a range or write a workbook report.",
        primaryLabel: "Open Data",
        onPrimaryClick: () => changeView("source"),
        primaryDisabled: false,
        secondaryLabel: "Open Activity",
        onSecondaryClick: () => changeView("activity"),
        secondaryDisabled: false,
      }
    : !snapshot
      ? {
          title: "Start with a real Excel selection",
          detail: "Select a clean table or range with headers, then run the first analysis.",
          primaryLabel: "Analyze Selection",
          onPrimaryClick: () => {
            void analyzeSelection();
          },
          primaryDisabled: !officeCapabilities.selectionRead || isActionLocked,
          secondaryLabel: "Open Data",
          onSecondaryClick: () => changeView("source"),
          secondaryDisabled: false,
        }
      : !isPlanReady
        ? {
            title: "The report plan is refreshing",
            detail:
              "Your previews and outputs unlock again as soon as the current selection and prompt finish recomputing.",
            primaryLabel: "Open Plan",
            onPrimaryClick: () => openPlan("brief"),
            primaryDisabled: false,
            secondaryLabel: "Open Data",
            onSecondaryClick: () => changeView("source"),
            secondaryDisabled: false,
          }
        : !renderResult && officeCapabilities.excelApiSupported
          ? {
              title: "Create the workbook report first",
              detail:
                "This is the clearest first deliverable because it writes visible report sheets into the active workbook.",
              primaryLabel: "Write Workbook Report",
              onPrimaryClick: buildWorkbookReport,
              primaryDisabled: !isReportEligible || isActionLocked,
              secondaryLabel: "Review Outputs",
              onSecondaryClick: () => openOutputs("excel"),
              secondaryDisabled: false,
            }
          : !renderResult
            ? {
                title: "Review the prepared outputs",
                detail:
                  "This host cannot write the workbook report, but the other output previews are still available.",
                primaryLabel: "Review Outputs",
                onPrimaryClick: () => openOutputs("excel"),
                primaryDisabled: !isPlanReady,
                secondaryLabel: "Open Plan",
                onSecondaryClick: () => openPlan("brief"),
                secondaryDisabled: false,
              }
            : completedOutputCount < 2
              ? {
                  title: "Expand beyond the workbook report",
                  detail:
                    "Your Excel sheets exist now. Review email, slides, or Apps Script next from the Outputs area.",
                  primaryLabel: "Review Outputs",
                  onPrimaryClick: () => openOutputs("excel"),
                  primaryDisabled: !isPlanReady,
                  secondaryLabel: "Randomize Report",
                  onSecondaryClick: shuffleVariation,
                  secondaryDisabled: isInputLocked,
                }
              : {
                  title: "Refine or reuse this setup",
                  detail:
                    "You already have generated outputs. Save the pattern as a template or randomize another report variation.",
                  primaryLabel: "Open Plan",
                  onPrimaryClick: () => openPlan("templates"),
                  primaryDisabled: false,
                  secondaryLabel: "Randomize Report",
                  onSecondaryClick: shuffleVariation,
                  secondaryDisabled: isInputLocked,
                };

  function syncPersistenceHealth() {
    setPersistenceStatus(getPersistenceStatus());
  }

  function changeView(nextView: TaskpaneViewId) {
    setActiveView(nextView);
    saveTaskpaneViewPreference(nextView);
    syncPersistenceHealth();
  }

  function changePlanWorkspace(nextWorkspace: PlanWorkspaceId) {
    setActivePlanWorkspace(nextWorkspace);
    savePlanWorkspacePreference(nextWorkspace);
    syncPersistenceHealth();
  }

  function changeOutputWorkspace(nextWorkspace: OutputWorkspaceId) {
    setActiveOutputWorkspace(nextWorkspace);
    saveOutputWorkspacePreference(nextWorkspace);
    syncPersistenceHealth();
  }

  function openPlan(workspace: PlanWorkspaceId = "brief") {
    changeView("brief");
    changePlanWorkspace(workspace);
  }

  function openOutputs(workspace: OutputWorkspaceId = "excel") {
    changeView("outputs");
    changeOutputWorkspace(workspace);
  }

  function shuffleVariation() {
    invalidatePlanOutputs("Variation shuffled. Refreshing the active plan.");
    setMode("variation");
    setVariationSeed(Math.floor(Math.random() * 10_000));
    openPlan("brief");
  }

  function syncCanvasDraft(nextResult: CanvasReportResult) {
    setCanvasResult(nextResult);
    setCanvasDesignSpec(nextResult.designSpec);
    setCanvasDesignIntentDraft(designIntentFromSpec(nextResult.designSpec));
    setCanvasDocumentDraft(normalizeCanvasDocument(nextResult.canvasDocument));
    setCanvasHistory({ undoStack: [], redoStack: [] });
    setCanvasRecoveredDraftAt(null);
    setCanvasAutosaveStatus("Autosave pending...");
    canvasDraftRecoveryAttemptedRef.current = true;
  }

  function replaceCanvasDocument(
    nextDocument: CanvasDocument,
    options: { recordHistory?: boolean; statusMessage?: string } = {}
  ) {
    const normalizedNext = normalizeCanvasDocument({
      ...nextDocument,
      updatedAt: new Date().toISOString(),
    });
    const current = canvasDocumentDraftRef.current;

    if (options.recordHistory !== false && current) {
      setCanvasHistory((history) => pushCanvasHistory(history, current, normalizedNext));
    }

    setCanvasDocumentDraft(normalizedNext);
    if (options.recordHistory !== false) {
      setCanvasRecoveredDraftAt(null);
    }
    setCanvasAutosaveStatus("Autosave pending...");
    canvasDraftRecoveryAttemptedRef.current = true;
    if (options.statusMessage) {
      setStatus(options.statusMessage);
    }
  }

  function updateCanvasDocument(
    updater: (current: CanvasDocument) => CanvasDocument | null,
    options: { recordHistory?: boolean; statusMessage?: string } = {}
  ) {
    const current = canvasDocumentDraftRef.current;
    if (!current) {
      return;
    }

    const normalizedCurrent = normalizeCanvasDocument(current);
    const nextDocument = updater(normalizedCurrent);
    if (!nextDocument) {
      return;
    }

    replaceCanvasDocument(nextDocument, options);
  }

  function undoCanvasEdit() {
    const { history, document } = undoCanvasHistory(canvasHistory, canvasDocumentDraftRef.current);
    if (!document) {
      setStatus("No earlier canvas edit is available to undo.");
      return;
    }

    setCanvasHistory(history);
    setCanvasDocumentDraft(document);
    setCanvasRecoveredDraftAt(null);
    setCanvasAutosaveStatus("Autosave pending...");
    canvasDraftRecoveryAttemptedRef.current = true;
    setStatus("Canvas edit undone.");
  }

  function redoCanvasEdit() {
    const { history, document } = redoCanvasHistory(canvasHistory, canvasDocumentDraftRef.current);
    if (!document) {
      setStatus("No later canvas edit is available to restore.");
      return;
    }

    setCanvasHistory(history);
    setCanvasDocumentDraft(document);
    setCanvasRecoveredDraftAt(null);
    setCanvasAutosaveStatus("Autosave pending...");
    canvasDraftRecoveryAttemptedRef.current = true;
    setStatus("Canvas edit restored.");
  }

  function checkpointCanvasEdit() {
    const current = canvasDocumentDraftRef.current;
    if (!current) {
      return;
    }

    setCanvasHistory((history) => ({
      undoStack: [...history.undoStack, normalizeCanvasDocument(current)].slice(-40),
      redoStack: [],
    }));
  }

  function saveCanvasSnapshotManually() {
    if (!canvasDocumentDraftRef.current) {
      setStatus("Generate or recover a canvas document before saving a snapshot.");
      return;
    }

    const snapshotLabel = `${canvasTemplateName.trim() || selectedCanvasPreset?.label || "Canvas"} snapshot`;
    const nextSnapshot = createCanvasSnapshot(snapshotLabel, canvasDocumentDraftRef.current);
    const nextSnapshots = saveCanvasStudioSnapshot(nextSnapshot);
    setCanvasSnapshots(nextSnapshots);
    setSelectedCanvasSnapshotId(nextSnapshot.id);
    setStatus(`Saved canvas snapshot "${nextSnapshot.label}".`);
    syncPersistenceHealth();
  }

  function restoreCanvasSnapshot(snapshotId: string) {
    const snapshotEntry = canvasSnapshots.find((entry) => entry.id === snapshotId);
    if (!snapshotEntry) {
      setStatus("Select a saved snapshot first.");
      return;
    }

    replaceCanvasDocument(snapshotEntry.document, {
      recordHistory: true,
      statusMessage: `Restored canvas snapshot "${snapshotEntry.label}".`,
    });
    setSelectedCanvasSnapshotId(snapshotEntry.id);
  }

  function deleteCanvasSnapshotById(snapshotId: string) {
    const snapshotEntry = canvasSnapshots.find((entry) => entry.id === snapshotId);
    const nextSnapshots = deleteCanvasStudioSnapshot(snapshotId);
    setCanvasSnapshots(nextSnapshots);
    if (selectedCanvasSnapshotId === snapshotId) {
      setSelectedCanvasSnapshotId("");
    }
    syncPersistenceHealth();
    setStatus(
      snapshotEntry
        ? `Deleted canvas snapshot "${snapshotEntry.label}".`
        : "Canvas snapshot deleted."
    );
  }

  function discardRecoveredCanvasDraft() {
    clearCanvasStudioDraft();
    setCanvasRecoveredDraftAt(null);
    setCanvasAutosaveStatus("No unsaved canvas edits.");
    canvasDraftRecoveryAttemptedRef.current = true;
    syncPersistenceHealth();
    setStatus("Recovered canvas draft cleared from local storage.");
  }

  function createCanvasDraftBlock(
    kind: CanvasComponentKind,
    existingCount: number
  ): CanvasBlockSpec {
    const nextIndex = existingCount + 1;
    return {
      id: `canvas-${kind}-${Date.now().toString(36)}-${nextIndex}`,
      kind,
      title:
        kind === "hero"
          ? "New hero message"
          : kind === "chart-panel"
            ? "New evidence block"
            : kind === "recommendations"
              ? "New action block"
              : `New ${kind.replace("-", " ")}`,
      body:
        kind === "hero"
          ? "Add the main message for this canvas zone."
          : "Add the narrative or evidence this block should show.",
      supportingText: "",
      x: kind === "hero" ? 1 : existingCount % 2 === 0 ? 1 : 7,
      y: 1 + Math.floor(existingCount / 2) * 3,
      w: kind === "hero" ? 8 : 6,
      h: kind === "table" ? 3 : 2,
      priority: 50,
      emphasis: kind === "hero" || kind === "callout" ? "high" : "medium",
      formatTargets: ["canvas", "html", "pptx", "pdf"],
      styleToken: kind,
    };
  }

  function setCanvasLayoutMode(nextMode: CanvasDocument["layoutMode"]) {
    updateCanvasDocument(
      (current) => ({
        ...current,
        layoutMode: nextMode,
        pages: current.pages.map((page) => ({
          ...page,
          layoutMode: nextMode,
        })),
      }),
      { statusMessage: `Canvas layout switched to ${nextMode}.` }
    );
  }

  function addCanvasBlock(pageId: string, kind: CanvasComponentKind) {
    updateCanvasDocument(
      (current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                blocks: [...page.blocks, createCanvasDraftBlock(kind, page.blocks.length)],
              }
            : page
        ),
      }),
      { statusMessage: `${kind} block added to the canvas.` }
    );
  }

  function updateCanvasBlock(
    pageId: string,
    blockId: string,
    patch: Partial<CanvasBlockSpec>
  ) {
    updateCanvasDocument((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              blocks: page.blocks.map((block) =>
                block.id === blockId
                  ? {
                      ...block,
                      ...patch,
                    }
                  : block
              ),
            }
          : page
      ),
    }));
  }

  function setCanvasBlockFrame(
    pageId: string,
    blockId: string,
    frame: CanvasBlockSpec["frame"],
    options: { recordHistory?: boolean } = {}
  ) {
    if (!frame) {
      return;
    }

    updateCanvasDocument(
      (current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                blocks: page.blocks.map((block) =>
                  block.id === blockId
                    ? patchCanvasBlockFrame(block, normalizeCanvasPage(page), frame)
                    : block
                ),
              }
            : page
        ),
      }),
      { recordHistory: options.recordHistory }
    );
  }

  function nudgeCanvasBlock(pageId: string, blockId: string, dx: number, dy: number) {
    updateCanvasDocument(
      (current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                blocks: page.blocks.map((block) =>
                  block.id === blockId
                    ? patchCanvasBlockFrame(block, normalizeCanvasPage(page), {
                        x: (block.frame?.x ?? 0) + dx,
                        y: (block.frame?.y ?? 0) + dy,
                      })
                    : block
                ),
              }
            : page
        ),
      }),
      { statusMessage: "Canvas block nudged." }
    );
  }

  function removeCanvasBlock(pageId: string, blockId: string) {
    updateCanvasDocument(
      (current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId
            ? removeCanvasBlocksFromPage(page, [blockId])
            : page
        ),
      }),
      { statusMessage: "Canvas block removed." }
    );
  }

  function resetCanvasLayoutToAi() {
    if (!canvasResult) {
      return;
    }

    setCanvasDocumentDraft(normalizeCanvasDocument(canvasResult.canvasDocument));
    setCanvasHistory({ undoStack: [], redoStack: [] });
    setStatus("Canvas layout reset to the latest AI composition.");
    setCanvasAutosaveStatus("Autosave pending...");
    canvasDraftRecoveryAttemptedRef.current = true;
  }

  function pushActivity(
    statusLevel: ActivityStatus,
    area: string,
    title: string,
    detail: string,
    operationId?: string
  ) {
    setActivityHistory((current) =>
      addActivityEntry(current, { status: statusLevel, area, title, detail, operationId })
    );
    syncPersistenceHealth();
  }

  function updateAppsScriptOptions(nextOptions: React.SetStateAction<AppsScriptDeploymentOptions>) {
    const current = appsScriptOptionsRef.current;
    const resolved = typeof nextOptions === "function" ? nextOptions(current) : nextOptions;
    setAppsScriptOptions(resolved);
    setAppsScriptDraftState((draftState) => ({
      scriptTitleDirty: draftState.scriptTitleDirty || resolved.scriptTitle !== current.scriptTitle,
      deploymentDescriptionDirty:
        draftState.deploymentDescriptionDirty ||
        resolved.deploymentDescription !== current.deploymentDescription,
    }));
  }

  function beginExclusiveAction(label: string): SingleFlightClaim | null {
    if (isAiBusy) {
      setStatus("Wait for the current plan refresh to finish before starting another action.");
      return null;
    }

    const claim = actionGuardRef.current.tryAcquire(label);
    if (!claim) {
      setStatus(
        activeActionLabel
          ? `${activeActionLabel} is already running. Finish it before starting another action.`
          : "Another action is already running in this task pane."
      );
      return null;
    }

    setIsBusy(true);
    setActiveActionLabel(label);
    return claim;
  }

  function isClaimActive(claim: SingleFlightClaim): boolean {
    return mountedRef.current && actionGuardRef.current.isActive(claim.token);
  }

  function endExclusiveAction(claim: SingleFlightClaim): void {
    if (actionGuardRef.current.release(claim.token) && mountedRef.current) {
      setIsBusy(false);
      setActiveActionLabel(null);
    }
  }

  function clearReportIntakeSession() {
    setReportBriefOverrides({});
    setReportConversationTurns([]);
    setReportIntakeMessage("");
    setPendingGenerateNow(false);
  }

  function clearGeneratedArtifacts(clearSelection = false) {
    if (clearSelection) {
      setSnapshot(null);
      setProfile(null);
      clearReportIntakeSession();
    }

    setBaseBundle(null);
    setBundle(null);
    setAgentPlan(null);
    setAgentExecutionResult(null);
    setRenderResult(null);
    setGmailDraftResult(null);
    setAppsScriptResult(null);
    setCanvasResult(null);
    setCanvasDesignSpec(null);
    setCanvasDocumentDraft(null);
    setCanvasDesignIntentDraft(null);
    setCanvasHistory({ undoStack: [], redoStack: [] });
    setCanvasRecoveredDraftAt(null);
    setCanvasAutosaveStatus("No unsaved canvas edits.");
    clearSlidePdfPreview();
    clearSlidePowerPointDownload();
  }

  function invalidatePlanOutputs(message: string) {
    setAgentPlan(null);
    setAgentExecutionResult(null);
    setCanvasResult(null);
    setCanvasDesignSpec(null);
    setCanvasDocumentDraft(null);
    setCanvasDesignIntentDraft(null);
    clearSlidePdfPreview();
    clearSlidePowerPointDownload();
    dispatchWorkflowFreshness({ type: "plan-invalidated" });
    setError(null);
    setStatus(message);
  }

  function persistGoogleAuthRuntimeState(nextState: GoogleOAuthRuntimeState) {
    saveGoogleAuthState(nextState);
    setGoogleAuthState(nextState);
    syncPersistenceHealth();
  }

  function resetGoogleAuthRuntimeState() {
    clearGoogleAuthState();
    setGoogleAuthState(clearGoogleOAuthRuntimeState());
    syncPersistenceHealth();
  }

  function invalidateGoogleSession(message?: string, reason: "disconnect" | "error" = "error") {
    recordDiagnosticEvent(
      "warning",
      "google",
      "Google session invalidated",
      message ?? "Google session was cleared locally."
    );
    clearGoogleToken();
    setGoogleTokenState(null);
    setGmailDraftResult(null);
    setAppsScriptResult(null);
    if (reason === "disconnect") {
      resetGoogleAuthRuntimeState();
    } else {
      persistGoogleAuthRuntimeState(
        markGoogleOAuthRuntimeError(
          message ?? "Google session was cleared locally.",
          "session_cleared"
        )
      );
    }

    if (message) {
      setStatus(message);
      pushActivity("warning", "google", "Google session cleared", message);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && slidePdfPreviewUrlRef.current) {
        window.URL.revokeObjectURL(slidePdfPreviewUrlRef.current);
      }

      if (typeof window !== "undefined" && slidePowerPointDownloadUrlRef.current) {
        window.URL.revokeObjectURL(slidePowerPointDownloadUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    readyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    if (!error && !startupIssue) {
      runtimeIssueSignatureRef.current = null;
    }
  }, [error, startupIssue]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function recoverFromUnexpectedIssue(message: string, source: string) {
      const signature = buildRuntimeIssueSignature(message);
      if (runtimeIssueSignatureRef.current === signature) {
        return;
      }

      runtimeIssueSignatureRef.current = signature;
      recordDiagnosticEvent("error", readyRef.current ? "runtime" : "startup", source, message);
      actionGuardRef.current = createSingleFlightGuard();

      if (!mountedRef.current) {
        return;
      }

      setIsBusy(false);
      setIsAiBusy(false);
      setActiveActionLabel(null);

      if (readyRef.current) {
        setError(message);
        setStatus(
          "The last action was interrupted by an unexpected task pane error. Retry it or reload the add-in if the issue persists."
        );
      } else {
        setStartupIssue(message);
      }
    }

    function handleWindowError(event: ErrorEvent) {
      const reason = event.error ?? event.message ?? "Unexpected task pane runtime error.";
      if (shouldIgnoreRuntimeIssue(reason)) {
        return;
      }

      recoverFromUnexpectedIssue(createRuntimeRecoveryMessage(reason), "Unhandled window error");
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (shouldIgnoreRuntimeIssue(event.reason)) {
        return;
      }

      recoverFromUnexpectedIssue(
        createRuntimeRecoveryMessage(event.reason),
        "Unhandled promise rejection"
      );
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    appsScriptOptionsRef.current = appsScriptOptions;
  }, [appsScriptOptions]);

  useEffect(() => {
    canvasDocumentDraftRef.current = canvasDocumentDraft;
  }, [canvasDocumentDraft]);

  useEffect(() => {
    const resolvedView = resolveActiveTaskpaneView(activeView, taskpaneViews);
    if (resolvedView !== activeView) {
      setActiveView(resolvedView);
      saveTaskpaneViewPreference(resolvedView);
      syncPersistenceHealth();
    }
  }, [activeView, taskpaneViews]);

  useEffect(() => {
    const resolvedWorkspace = resolveWorkspaceTab(activePlanWorkspace, planWorkspaceTabs);
    if (resolvedWorkspace !== activePlanWorkspace) {
      setActivePlanWorkspace(resolvedWorkspace);
      savePlanWorkspacePreference(resolvedWorkspace);
      syncPersistenceHealth();
    }
  }, [activePlanWorkspace, planWorkspaceTabs]);

  useEffect(() => {
    const resolvedWorkspace = resolveWorkspaceTab(activeOutputWorkspace, outputWorkspaceTabs);
    if (resolvedWorkspace !== activeOutputWorkspace) {
      setActiveOutputWorkspace(resolvedWorkspace);
      saveOutputWorkspacePreference(resolvedWorkspace);
      syncPersistenceHealth();
    }
  }, [activeOutputWorkspace, outputWorkspaceTabs]);

  useEffect(() => {
    let active = true;
    const startupTimeout = globalThis.setTimeout(() => {
      if (active && !readyRef.current) {
        const message =
          "Office is taking longer than expected to initialize. Check that the add-in host is online and fully loaded.";
        recordDiagnosticEvent("warning", "startup", "Office bootstrap delayed", message);
        setStartupIssue(message);
      }
    }, 6000);

    try {
      const session = loadGoogleSessionState();
      const bootstrappedGoogleConfig = resolveGoogleConfigWithRuntimeDefaults(
        session.config,
        runtimeConfig
      );
      const bootstrappedLlmConfig = resolveLlmConfigWithRuntimeDefaults(
        loadLlmProviderConfig(),
        runtimeConfig
      );
      const bootstrappedLlmSecret = loadLlmSessionSecret();
      if (!active) {
        return () => undefined;
      }

      setTemplates(loadSavedTemplates());
      setSlideTemplates(loadSavedSlideTemplates());
      setGoogleConfigState(bootstrappedGoogleConfig);
      setGoogleTokenState(session.token);
      setGoogleAuthState(session.auth);
      setLlmConfigState(bootstrappedLlmConfig);
      setLlmSecretState(bootstrappedLlmSecret);
      setAppliedLlmConfig(bootstrappedLlmConfig);
      setAppliedLlmSecret(bootstrappedLlmSecret);
      syncPersistenceHealth();

      if (typeof Office === "undefined" || typeof Office.onReady !== "function") {
        throw new Error("Office.js did not load correctly in this task pane.");
      }

      void Office.onReady()
        .then((info) => {
          if (!active) {
            return;
          }

          globalThis.clearTimeout(startupTimeout);
          const nextCapabilities = detectOfficeCapabilities(info.host);
          setIsReady(true);
          setIsExcelHost(info.host === Office.HostType.Excel);
          setOfficeCapabilities(nextCapabilities);
          setStartupIssue(null);
          setError(null);

          if (info.host !== Office.HostType.Excel) {
            const message =
              "This add-in only runs inside Excel. Open the workbook in Excel, then launch ReportForge AI from the ribbon.";
            setError(message);
            pushActivity("error", "startup", "Unsupported host", message);
            return;
          }

          if (!nextCapabilities.excelApiSupported) {
            setStartupIssue(
              "This Excel host does not expose the required Excel API support for advanced workbook actions."
            );
          }

          setStatus("Select a range in Excel, then click Analyze Selection.");
        })
        .catch((nextError) => {
          if (!active) {
            return;
          }

          globalThis.clearTimeout(startupTimeout);
          recordDiagnosticEvent(
            "error",
            "startup",
            "Office bootstrap failed",
            nextError instanceof Error ? nextError.message : String(nextError)
          );
          const message = toFriendlyErrorMessage(nextError);
          setStartupIssue(message);
          setError("ReportForge AI could not initialize Office correctly in this host.");
          pushActivity("error", "startup", "Office bootstrap failed", message);
        });
    } catch (nextError) {
      recordDiagnosticEvent(
        "error",
        "startup",
        "Startup initialization failed",
        nextError instanceof Error ? nextError.message : String(nextError)
      );
      const message = toFriendlyErrorMessage(nextError);
      setStartupIssue(message);
      setError("ReportForge AI could not finish startup initialization.");
      syncPersistenceHealth();
      pushActivity("error", "startup", "Startup initialization failed", message);
    }

    return () => {
      active = false;
      globalThis.clearTimeout(startupTimeout);
    };
  }, [runtimeConfig]);

  useEffect(() => {
    if (
      !isCanvasStudioEnabled ||
      canvasResult ||
      canvasDocumentDraft ||
      canvasDraftRecoveryAttemptedRef.current
    ) {
      return;
    }

    canvasDraftRecoveryAttemptedRef.current = true;
    const recoveredDraft = loadCanvasStudioDraft();
    if (!recoveredDraft?.canvasDocument) {
      return;
    }

    setCanvasPrompt(recoveredDraft.promptText ?? "");
    setCanvasTemplateName(recoveredDraft.templateName ?? "");
    setSelectedCanvasPresetId(recoveredDraft.presetId || DEFAULT_CANVAS_PRESET_ID);
    setCanvasPreviewMode(recoveredDraft.previewMode ?? "report");
    setCanvasDesignIntentDraft(recoveredDraft.designIntent ?? null);
    setCanvasDesignSpec(recoveredDraft.designSpec ?? null);
    setReportBriefOverrides(recoveredDraft.reportBrief ?? {});
    setCanvasDocumentDraft(normalizeCanvasDocument(recoveredDraft.canvasDocument));
    setCanvasRecoveredDraftAt(recoveredDraft.savedAt);
    setCanvasAutosaveStatus(`Recovered draft from ${new Date(recoveredDraft.savedAt).toLocaleTimeString()}`);
    setStatus("Recovered the last unsaved Canvas Studio draft from local storage.");
  }, [canvasDocumentDraft, canvasResult, isCanvasStudioEnabled]);

  useEffect(() => {
    if (!isCanvasStudioEnabled || !canvasDocumentDraft) {
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      saveCanvasStudioDraft({
        savedAt: new Date().toISOString(),
        promptText: canvasPrompt,
        templateName: canvasTemplateName,
        presetId: selectedCanvasPresetId,
        businessContext: businessContext.trim(),
        previewMode: canvasPreviewMode,
        designIntent: canvasDesignIntentDraft,
        designSpec: canvasDesignSpec,
        reportBrief: reportIntake?.brief ?? bundle?.plan.brief ?? null,
        canvasDocument: canvasDocumentDraft,
      });
      setCanvasAutosaveStatus(`Autosaved ${new Date().toLocaleTimeString()}`);
      syncPersistenceHealth();
    }, 700);

    return () => {
      globalThis.clearTimeout(timeout);
    };
  }, [
    businessContext,
    canvasDesignIntentDraft,
    canvasDesignSpec,
    canvasDocumentDraft,
    canvasPreviewMode,
    canvasPrompt,
    canvasTemplateName,
    bundle,
    isCanvasStudioEnabled,
    reportIntake,
    selectedCanvasPresetId,
  ]);

  useEffect(() => {
    if (!snapshot || !profile) {
      return;
    }

    const generationId = planGenerationRef.current + 1;
    planGenerationRef.current = generationId;
    dispatchWorkflowFreshness({
      type: "planning-started",
      generationId,
      promptSignature: createPromptSignature(
        deferredPrompt,
        deferredBusinessContext,
        mode,
        variationSeed
      ),
    });

    startTransition(() => {
      setAgentPlan(null);
      setAgentExecutionResult(null);
      setIsAiBusy(false);

      try {
        const nextBundle = createReportBundle(
          snapshot,
          deferredPrompt,
          { mode, variationSeed },
          profile,
          deferredBusinessContext,
          reportBriefOverrides
        );
        if (generationId !== planGenerationRef.current) {
          recordDiagnosticEvent(
            "warning",
            "planning",
            "Ignored stale planning result",
            `generation=${generationId}`
          );
          return;
        }

        setRenderResult(null);
        setGmailDraftResult(null);
        setAppsScriptResult(null);
        setBaseBundle(nextBundle);
        setSelectedEmailAudience((current) =>
          resolveSelectedEmailAudience(current, nextBundle.emailBundle)
        );
        setError(null);
        setStatus(
          "Plan refreshed from the latest selection and prompt. Finalizing the active report bundle now."
        );
      } catch (nextError) {
        if (generationId !== planGenerationRef.current) {
          return;
        }

        setBaseBundle(null);
        setBundle(null);
        dispatchWorkflowFreshness({ type: "planning-failed", generationId });
        setError(toFriendlyErrorMessage(nextError));
      }
    });
  }, [
    snapshot,
    profile,
    deferredPrompt,
    deferredBusinessContext,
    mode,
    reportBriefOverrides,
    variationSeed,
  ]);

  useEffect(() => {
    if (!baseBundle) {
      return;
    }

    const generationId = planGenerationRef.current;
    if (!appliedLlmConfig.enabled || !isAiConfigured) {
      setBundle(baseBundle);
      dispatchWorkflowFreshness({ type: "planning-succeeded", generationId });
      setStatus(
        "Plan refreshed from the latest selection and prompt. Run any output action again to generate updated artifacts."
      );
      return;
    }

    let active = true;
    const controller = new AbortController();
    setBundle(baseBundle);
    dispatchWorkflowFreshness({ type: "planning-succeeded", generationId });
    dispatchWorkflowFreshness({ type: "ai-started", generationId });
    setIsAiBusy(true);
    setStatus(
      `Deterministic plan ready. Enhancing the wording with ${appliedLlmConfig.providerLabel || "your LLM provider"} in the background...`
    );

    enhanceBundleWithLlm(baseBundle, appliedLlmConfig, appliedLlmSecret ?? { apiKey: "" }, {
      signal: controller.signal,
      slideTemplate: llmSlideTemplateContext,
    })
      .then((enhancedBundle) => {
        if (!active || generationId !== planGenerationRef.current) {
          return;
        }

        setBundle(enhancedBundle);
        dispatchWorkflowFreshness({ type: "ai-finished", generationId });
        setError(null);
        setStatus(
          `AI enhancement applied with ${enhancedBundle.aiEnhancement?.providerLabel || "your provider"}.`
        );
        pushActivity(
          "success",
          "ai",
          "AI enhancement applied",
          `Narrative refreshed with ${enhancedBundle.aiEnhancement?.providerLabel || "the configured provider"}.`
        );
      })
      .catch((nextError) => {
        if (!active || generationId !== planGenerationRef.current) {
          return;
        }

        if (nextError instanceof Error && nextError.name === "AbortError") {
          return;
        }

        setBundle(baseBundle);
        dispatchWorkflowFreshness({ type: "ai-finished", generationId });
        setError(toFriendlyErrorMessage(nextError));
        setStatus("The deterministic plan is still available. AI enhancement did not complete.");
        pushActivity("warning", "ai", "AI enhancement failed", toFriendlyErrorMessage(nextError));
      })
      .finally(() => {
        if (active) {
          setIsAiBusy(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [appliedLlmConfig, appliedLlmSecret, baseBundle, isAiConfigured, llmSlideTemplateContext]);

  useEffect(() => {
    if (!pendingGenerateNow || !bundle || !isPlanReady || isAiBusy || isBusy) {
      return;
    }

    setPendingGenerateNow(false);
    void generateCanvasPack();
  }, [bundle, isAiBusy, isBusy, isPlanReady, pendingGenerateNow]);

  useEffect(() => {
    if (!bundle) {
      return;
    }

    setAppsScriptOptions((current) => ({
      ...reconcileAppsScriptOptionsWithPlan(current, appsScriptDraftState, bundle.plan.title),
      deployAsWebApp: current.deployAsWebApp,
      webAppAccess: current.webAppAccess,
      executeAs: current.executeAs,
    }));
  }, [appsScriptDraftState, bundle]);

  useEffect(() => {
    const nextGoogleConnection = getGoogleConnectionState(googleConfig, googleToken);
    setGoogleConnection(nextGoogleConnection);

    if (nextGoogleConnection.requiresReconnect && googleToken) {
      invalidateGoogleSession(
        "Google access expired. Reconnect before running Gmail or Apps Script actions."
      );
    }
  }, [googleConfig, googleToken]);

  useEffect(() => {
    if (!googleToken) {
      return;
    }

    const expiresInMs = new Date(googleToken.expiresAt).getTime() - Date.now();
    if (expiresInMs <= 0) {
      invalidateGoogleSession(
        "Google access expired. Reconnect before running Gmail or Apps Script actions."
      );
      return;
    }

    const expiryTimer = window.setTimeout(() => {
      invalidateGoogleSession(
        "Google access expired during this session. Reconnect before running Gmail or Apps Script actions."
      );
    }, expiresInMs);

    return () => {
      window.clearTimeout(expiryTimer);
    };
  }, [googleToken]);

  async function analyzeSelection(forceOversizedSelection = false) {
    const claim = beginExclusiveAction(
      forceOversizedSelection ? "Analyzing large selection" : "Analyzing selection"
    );
    if (!claim) {
      return;
    }

    if (!isReady || !isExcelHost) {
      setError(
        "This add-in only runs inside Excel. Open the workbook in Excel, then launch ReportForge AI from the ribbon."
      );
      endExclusiveAction(claim);
      return;
    }

    if (!officeCapabilities.selectionRead) {
      setError(
        "This Excel host does not support the required Excel APIs for range analysis in ReportForge AI."
      );
      endExclusiveAction(claim);
      return;
    }

    const operationId = createOperationId("analyze");
    setLastOperationId(operationId);
    setError(null);
    setPendingSelectionPreflight(null);
    analysisRequestRef.current += 1;
    const requestId = analysisRequestRef.current;
    dispatchWorkflowFreshness({ type: "analysis-started", requestId });
    recordDiagnosticEvent("info", "analysis", "Selection analysis started", operationId);

    try {
      const preflight = evaluateSelectionPreflight(await inspectSelectedRange());
      if (!isClaimActive(claim)) {
        return;
      }

      if (preflight.decision === "block") {
        dispatchWorkflowFreshness({ type: "analysis-failed", requestId });
        setStatus("Select a smaller range or table, then analyze it again.");
        setError(preflight.messages[0]);
        pushActivity(
          "warning",
          "analysis",
          "Selection blocked",
          preflight.messages[0],
          operationId
        );
        return;
      }

      if (preflight.decision === "confirm" && !forceOversizedSelection) {
        setPendingSelectionPreflight(preflight);
        setStatus(
          `The selection ${preflight.address} is larger than the normal safe profile. Review the warning and confirm before analysis continues.`
        );
        pushActivity(
          "warning",
          "analysis",
          "Large selection requires confirmation",
          preflight.messages.join(" "),
          operationId
        );
        return;
      }

      clearGeneratedArtifacts(true);
      const nextSnapshot = await getSelectedRangeSnapshot();
      if (!isClaimActive(claim) || requestId !== analysisRequestRef.current) {
        recordDiagnosticEvent("warning", "analysis", "Ignored stale analyze response", operationId);
        return;
      }

      const assessment = assessSelection(nextSnapshot);

      if (assessment.blockers.length > 0) {
        dispatchWorkflowFreshness({ type: "analysis-failed", requestId });
        setStatus("Select a populated range or table, then analyze it again.");
        setError(assessment.blockers[0]);
        pushActivity(
          "warning",
          "analysis",
          "Selection rejected",
          assessment.blockers[0],
          operationId
        );
        return;
      }

      const nextProfile = profileRangeData(nextSnapshot);
      setSnapshot(nextSnapshot);
      setProfile(nextProfile);
      dispatchWorkflowFreshness({
        type: "analysis-succeeded",
        requestId,
        selectionKey: createSelectionKey(
          nextSnapshot.sheetName,
          nextSnapshot.address,
          nextSnapshot.capturedAt
        ),
      });
      setError(null);
      setStatus(
        `Analyzed ${nextSnapshot.address} on ${nextSnapshot.sheetName}. Review the plan preview, then generate the outputs you want.`
      );
      pushActivity(
        "success",
        "analysis",
        "Selection analyzed",
        `Captured ${nextSnapshot.address} on ${nextSnapshot.sheetName}.`,
        operationId
      );
      changeView("source");
    } catch (nextError) {
      dispatchWorkflowFreshness({ type: "analysis-failed", requestId });
      recordDiagnosticEvent(
        "error",
        "analysis",
        "Selection analysis failed",
        `${operationId}: ${nextError instanceof Error ? nextError.message : String(nextError)}`
      );
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "analysis", "Selection analysis failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function buildWorkbookReport() {
    if (!snapshot || !bundle || !isReportEligible) {
      setError("Analyze a range before generating the Excel report.");
      return;
    }

    if (!officeCapabilities.excelApiSupported) {
      setError(
        "Workbook report generation is unavailable because this Excel host does not support the required Excel APIs."
      );
      return;
    }

    const renderPolicy = buildExcelRenderPolicy(
      bundle.profile.dataRowCount + 1,
      bundle.profile.columnCount,
      bundle.plan.excel.charts.length
    );
    if (!renderPolicy.allowRender) {
      setError(renderPolicy.notes[0]);
      return;
    }

    const claim = beginExclusiveAction("Generating workbook report");
    if (!claim) {
      return;
    }

    const operationId = createOperationId("report");
    setLastOperationId(operationId);
    setError(null);
    recordDiagnosticEvent("info", "report", "Workbook report generation started", operationId);

    try {
      const result = await renderExcelReport(snapshot, bundle.profile, bundle.plan);
      if (!isClaimActive(claim)) {
        return;
      }

      setRenderResult(result);
      setError(null);
      setStatus(
        result.notes.length > 0
          ? `Workbook report written to ${result.reportSheetName} and ${result.detailSheetName}. Stabilized render notes: ${result.notes.join(" ")}`
          : `Workbook report written to ${result.reportSheetName} and ${result.detailSheetName}.`
      );
      pushActivity(
        "success",
        "report",
        "Workbook report generated",
        `Created ${result.reportSheetName} and ${result.detailSheetName}.`,
        operationId
      );
      changeView("outputs");
      changeOutputWorkspace("excel");
    } catch (nextError) {
      recordDiagnosticEvent(
        "error",
        "report",
        "Workbook report generation failed",
        `${operationId}: ${nextError instanceof Error ? nextError.message : String(nextError)}`
      );
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "report", "Workbook report failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function openGeneratedWorksheet(sheetName: string, label: string) {
    if (!officeCapabilities.excelApiSupported) {
      setError(
        "Worksheet navigation is unavailable because this Excel host does not support the required Excel APIs."
      );
      return;
    }

    const claim = beginExclusiveAction(`Opening ${label.toLowerCase()}`);
    if (!claim) {
      return;
    }

    setError(null);
    try {
      await activateWorksheetByName(sheetName);
      if (!isClaimActive(claim)) {
        return;
      }

      setStatus(`${label} opened in the current workbook.`);
      changeView("outputs");
      changeOutputWorkspace("excel");
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
    } finally {
      endExclusiveAction(claim);
    }
  }

  function copyText(text: string, label: string) {
    if (!officeCapabilities.clipboard) {
      setError(null);
      setStatus(`Clipboard access is unavailable. Copy the ${label.toLowerCase()} manually.`);
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setError(null);
        setStatus(`${label} copied to the clipboard.`);
      })
      .catch(() => {
        setStatus(`Unable to copy ${label.toLowerCase()} automatically.`);
      });
  }

  function sanitizeFilename(label: string, extension: string): string {
    const safeBase = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);

    return `${safeBase || "reportforge-artifact"}.${extension}`;
  }

  function clearSlidePdfPreview() {
    if (typeof window !== "undefined" && slidePdfPreviewUrlRef.current) {
      window.URL.revokeObjectURL(slidePdfPreviewUrlRef.current);
    }

    slidePdfPreviewUrlRef.current = null;
    setSlidePdfPreviewUrl(null);
  }

  function clearSlidePowerPointDownload() {
    if (typeof window !== "undefined" && slidePowerPointDownloadUrlRef.current) {
      window.URL.revokeObjectURL(slidePowerPointDownloadUrlRef.current);
    }

    slidePowerPointDownloadUrlRef.current = null;
    setSlidePowerPointDownloadUrl(null);
    setSlidePowerPointDownloadFilename("");
  }

  function showSlidePdfPreview(bytes: Uint8Array) {
    if (typeof window === "undefined") {
      setStatus("PDF preview is unavailable in this runtime.");
      return;
    }

    clearSlidePdfPreview();
    const nextUrl = window.URL.createObjectURL(
      new Blob([Uint8Array.from(bytes)], { type: "application/pdf" })
    );
    slidePdfPreviewUrlRef.current = nextUrl;
    setSlidePdfPreviewUrl(nextUrl);
  }

  function prepareSlidePowerPointDownload(filename: string, blob: Blob) {
    if (typeof window === "undefined") {
      return;
    }

    clearSlidePowerPointDownload();
    const nextUrl = window.URL.createObjectURL(blob);
    slidePowerPointDownloadUrlRef.current = nextUrl;
    setSlidePowerPointDownloadUrl(nextUrl);
    setSlidePowerPointDownloadFilename(filename);
  }

  function triggerBlobDownload(filename: string, blob: Blob): boolean {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return false;
    }

    const legacyNavigator = navigator as Navigator & {
      msSaveOrOpenBlob?: (value: Blob, defaultName?: string) => boolean;
    };
    if (typeof legacyNavigator.msSaveOrOpenBlob === "function") {
      legacyNavigator.msSaveOrOpenBlob(blob, filename);
      return true;
    }

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.setAttribute("style", "display:none;");
    anchor.dataset.interception = "off";
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
      if (anchor.parentNode) {
        anchor.parentNode.removeChild(anchor);
      }
    }, 30_000);
    return true;
  }

  function downloadTextArtifact(
    filename: string,
    content: string,
    mimeType = "text/plain;charset=utf-8"
  ) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      setStatus("Artifact download is unavailable in this runtime.");
      return;
    }

    try {
      if (!triggerBlobDownload(filename, new Blob([content], { type: mimeType }))) {
        setStatus("Artifact download is unavailable in this runtime.");
        return;
      }

      setStatus(`${filename} downloaded.`);
    } catch {
      setStatus(`Unable to download ${filename} in this runtime.`);
    }
  }

  function downloadBlobArtifact(filename: string, blob: Blob) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      setStatus("Artifact download is unavailable in this runtime.");
      return;
    }

    try {
      if (!triggerBlobDownload(filename, blob)) {
        setStatus("Artifact download is unavailable in this runtime.");
        return;
      }

      setStatus(`${filename} downloaded.`);
    } catch {
      setStatus(`Unable to download ${filename} in this runtime.`);
    }
  }

  function downloadBytesArtifact(filename: string, bytes: Uint8Array, mimeType: string) {
    downloadBlobArtifact(filename, new Blob([Uint8Array.from(bytes)], { type: mimeType }));
  }

  async function loadSlideExportService() {
    try {
      return await import("../services/slides/exportSlideDeck");
    } catch (nextError) {
      recordDiagnosticEvent(
        "error",
        "slides",
        "Slide export runtime failed to load",
        nextError instanceof Error ? nextError.message : String(nextError)
      );
      throw new Error(
        "Slide export tools could not load in this Excel runtime. Review the HTML preview instead, or retry in a newer Office WebView."
      );
    }
  }

  function openHtmlArtifact(html: string, title: string, autoPrint = false) {
    if (typeof window === "undefined") {
      setStatus("HTML preview is unavailable in this runtime.");
      return;
    }

    const printScript = autoPrint
      ? `<script>window.addEventListener("load",()=>window.setTimeout(()=>window.print(),250));</script>`
      : "";
    const finalHtml = html.includes("</body>")
      ? html.replace("</body>", `${printScript}</body>`)
      : `${html}${printScript}`;

    try {
      const blob = new Blob([finalHtml], { type: "text/html;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) {
        setStatus(`Popup blocked while opening ${title.toLowerCase()}.`);
        return;
      }

      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      setStatus(`${title} opened in a new window.`);
    } catch {
      setStatus(`Unable to open ${title.toLowerCase()} in this runtime.`);
    }
  }

  function mapBriefAudienceToCanvasAudience():
    | "general"
    | "ceo"
    | "cfo"
    | "board"
    | "client"
    | "investor"
    | "project-team"
    | "operations" {
    const audience = reportIntake?.brief.audience ?? bundle?.plan.brief.audience ?? bundle?.prompt.audience;

    switch (audience) {
      case "executive":
      case "management":
        return "ceo";
      case "cfo":
        return "cfo";
      case "board":
        return "board";
      case "client":
        return "client";
      case "risk":
      case "insurance":
      case "banking":
      case "operations":
        return "operations";
      case "analyst":
        return "project-team";
      default:
        return "general";
    }
  }

  function mapBriefToneToCanvasTone():
    | "neutral"
    | "executive"
    | "formal"
    | "analytical"
    | "consultative" {
    const tone = reportIntake?.brief.tone ?? bundle?.plan.brief.tone;
    switch (tone) {
      case "formal":
        return "formal";
      case "analytical":
        return "analytical";
      case "consultative":
        return "consultative";
      case "neutral":
        return "neutral";
      default:
        return "executive";
    }
  }

  function mapBriefObjective():
    | "convince"
    | "inform"
    | "summarize"
    | "alert"
    | "recommend"
    | "sell"
    | "prepare-meeting" {
    const brief = reportIntake?.brief ?? bundle?.plan.brief;
    if (!brief) {
      return "recommend";
    }

    if (brief.outputStyle === "operational-dashboard") {
      return "alert";
    }

    if (brief.outputStyle === "board-deck" || brief.outputStyle === "investor-update") {
      return "prepare-meeting";
    }

    return brief.keyDecision ? "recommend" : "summarize";
  }

  function selectCanvasPreviewMode(nextResult: CanvasReportResult): "report" | "email" | "slides" {
    const hasReport = nextResult.artifacts.some(
      (artifact) => artifact.format === "html" && artifact.status === "ready"
    );
    if (hasReport) {
      return "report";
    }

    if (nextResult.bundle.emailBundle.primary.html) {
      return "email";
    }

    return "slides";
  }

  function buildCanvasReportRequest(
    operationId: string,
    promptOverride: string,
    requestedMode: ReportMode = mode,
    requestedVariationSeed: number = variationSeed
  ): CanvasReportRequest {
    return applyReportingPreset(
      {
        source: {
          kind: "bundle",
          bundle: bundle as ReportForgeBundle,
        },
        context: {
          prompt: promptOverride,
          businessContext: businessContext.trim(),
          brief: reportIntake?.brief ?? bundle?.plan.brief,
          audience: mapBriefAudienceToCanvasAudience(),
          objective: mapBriefObjective(),
          tone: mapBriefToneToCanvasTone(),
          preferredFormats: ["html", "pptx", "pdf", "email-html", "gas-project", "excel-plan"],
          maxSlides: (bundle as ReportForgeBundle).prompt.slideCount,
        },
        options: {
          mode: requestedMode,
          variationSeed: requestedVariationSeed,
          enableLlm: appliedLlmConfig.enabled && isAiConfigured,
          llmConfig: appliedLlmConfig.enabled && isAiConfigured ? appliedLlmConfig : undefined,
          llmSecret:
            appliedLlmConfig.enabled && isAiConfigured ? (appliedLlmSecret ?? undefined) : undefined,
          designIntent: canvasDesignIntentDraft ?? selectedCanvasTemplate?.designIntent,
          canvasDocument: canvasDocumentDraft ?? selectedCanvasTemplate?.canvasDocument,
          designSpec: canvasDesignSpec ?? selectedCanvasTemplate?.designSpec,
          requestId: operationId,
        },
      },
      selectedCanvasPresetId
    );
  }

  function downloadCanvasArtifact(artifact: CanvasRenderArtifact) {
    if (artifact.status !== "ready") {
      setStatus(`${artifact.label} is not ready to download yet.`);
      return;
    }

    if (artifact.binaryContent instanceof Blob) {
      downloadBlobArtifact(
        artifact.filename ?? sanitizeFilename(artifact.label, "bin"),
        artifact.binaryContent
      );
      return;
    }

    if (artifact.binaryContent instanceof Uint8Array) {
      downloadBytesArtifact(
        artifact.filename ?? sanitizeFilename(artifact.label, "bin"),
        artifact.binaryContent,
        artifact.mimeType ?? "application/octet-stream"
      );
      return;
    }

    if (typeof artifact.textContent === "string") {
      downloadTextArtifact(
        artifact.filename ?? sanitizeFilename(artifact.label, "txt"),
        artifact.textContent,
        artifact.mimeType ?? "text/plain;charset=utf-8"
      );
      return;
    }

    if (artifact.jsonContent) {
      downloadTextArtifact(
        artifact.filename ?? sanitizeFilename(artifact.label, "json"),
        JSON.stringify(artifact.jsonContent, null, 2),
        "application/json;charset=utf-8"
      );
      return;
    }

    setStatus(`No downloadable payload is available for ${artifact.label.toLowerCase()}.`);
  }

  async function generateCanvasPack(
    requestedMode: ReportMode = mode,
    requestedVariationSeed: number = variationSeed
  ) {
    if (!snapshot || !bundle || !isPlanReady) {
      setError("Analyze a range before generating a canvas pack.");
      return;
    }

    const claim = beginExclusiveAction("Generating canvas pack");
    if (!claim) {
      return;
    }

    setError(null);
    const operationId = createOperationId("canvas");
    setLastOperationId(operationId);
    setStatus(
      `Generating a canvas pack from the current Excel selection using the ${effectiveCanvasPromptSource.toLowerCase()}.`
    );

    try {
      const engine = await import("../reporting-engine/orchestrator/generateReport");
      const request = buildCanvasReportRequest(
        operationId,
        effectiveCanvasPrompt,
        requestedMode,
        requestedVariationSeed
      );
      const nextResult = await engine.generateReport(request);
      if (!isClaimActive(claim)) {
        return;
      }

      syncCanvasDraft(nextResult);
      setCanvasPreviewMode(selectCanvasPreviewMode(nextResult));
      changeOutputWorkspace("canvas");
      const narrativeWarning = nextResult.logs.find(
        (entry) => entry.step === "narrative-agent" && entry.level === "warning"
      );
      setStatus(
        narrativeWarning
          ? `Canvas pack ready with ${nextResult.artifacts.filter((artifact) => artifact.status === "ready").length} artifact(s). AI enhancement fell back to deterministic reporting for this run.`
          : `Canvas pack ready with ${nextResult.artifacts.filter((artifact) => artifact.status === "ready").length} artifact(s).`
      );
      pushActivity(
        nextResult.status === "failed"
          ? "error"
          : nextResult.status === "partial"
            ? "warning"
            : "success",
        "canvas",
        "Canvas pack generated",
        `${nextResult.reportPlan.title} • ${nextResult.reportPlan.recommendedFormats.join(", ")}`,
        operationId
      );
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "canvas", "Canvas pack generation failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  function generateCanvasVariation() {
    const nextSeed = Math.floor(Math.random() * 10_000);
    setMode("variation");
    setVariationSeed(nextSeed);
    void generateCanvasPack("variation", nextSeed);
  }

  async function coEditCanvasWithAi(request: {
    scope: "selection" | "page";
    pageId: string;
    blockIds: string[];
    instruction: string;
    preset?: "executive" | "analytical" | "visual" | "narrative";
  }): Promise<string> {
    if (!snapshot || !bundle || !isPlanReady || !canvasDocumentDraft) {
      const message = "Analyze a range and generate a canvas pack before using AI co-editing.";
      setError(message);
      return message;
    }

    const targetPage = canvasDocumentDraft.pages.find((page) => page.id === request.pageId);
    if (!targetPage) {
      const message = "The selected canvas page could not be found.";
      setStatus(message);
      return message;
    }

    const targetBlocks = targetPage.blocks.filter((block) => request.blockIds.includes(block.id));
    if (request.scope === "selection" && targetBlocks.length === 0) {
      const message = "Select at least one block before asking the AI to regenerate it.";
      setStatus(message);
      return message;
    }

    const presetInstruction =
      request.preset === "executive"
        ? "Make the composition more executive: fewer words, stronger message titles, tighter spacing, KPI-first hierarchy."
        : request.preset === "analytical"
          ? "Make the composition more analytical: denser evidence, clearer variance commentary, more explicit support tables or comparisons."
          : request.preset === "visual"
            ? "Make the composition more visual: stronger chart prominence, cleaner callouts, lighter prose, clearer page rhythm."
            : request.preset === "narrative"
              ? "Make the composition more narrative: stronger framing copy, more explicit implications, and clearer takeaways."
              : "";
    const scopeLabel =
      request.scope === "selection"
        ? `Selected blocks on ${targetPage.label}`
        : `Entire page ${targetPage.label}`;
    const targetBlockSummary = targetBlocks.length
      ? targetBlocks.map((block) => `${block.kind}: ${block.title}`).join("; ")
      : "Entire page refresh";
    const specificInstruction = [request.instruction.trim(), presetInstruction]
      .filter(Boolean)
      .join(" ");
    const coEditPrompt = [
      effectiveCanvasPrompt,
      "",
      "Canvas Studio co-edit request:",
      `Scope: ${scopeLabel}.`,
      `Target blocks: ${targetBlockSummary}.`,
      "Preserve non-target pages and preserve the current template/design intent unless the instruction explicitly asks for a broader redesign.",
      request.scope === "selection"
        ? "Refresh the selected blocks with stronger message-led copy, sharper evidence, and a production-ready design fit."
        : "Refine this page as a coherent reporting surface while preserving cross-format consistency.",
      `Specific instruction: ${
        specificInstruction ||
        "Improve the reporting quality and keep the output concise, data-grounded, and client-ready."
      }`,
    ].join("\n");

    const claim = beginExclusiveAction(
      request.scope === "selection" ? "AI block co-edit" : "AI page refinement"
    );
    if (!claim) {
      return activeActionLabel
        ? `${activeActionLabel} is already running.`
        : "Another canvas action is already running.";
    }

    setError(null);
    const operationId = createOperationId("canvas-coedit");
    setLastOperationId(operationId);
    setStatus(
      request.scope === "selection"
        ? `Refreshing ${targetBlocks.length} selected block(s) with AI.`
        : `Refining ${targetPage.label} with AI.`
    );

    try {
      const engine = await import("../reporting-engine/orchestrator/generateReport");
      const nextResult = await engine.generateReport(
        buildCanvasReportRequest(operationId, coEditPrompt, "prompt-guided", variationSeed)
      );
      if (!isClaimActive(claim)) {
        return "Canvas AI co-edit was superseded by another action.";
      }

      syncCanvasDraft(nextResult);
      setCanvasPreviewMode(selectCanvasPreviewMode(nextResult));
      changeOutputWorkspace("canvas");
      const message =
        request.scope === "selection"
          ? `AI refreshed the selected canvas block(s) on ${targetPage.label}.`
          : `AI refined ${targetPage.label} and updated the canvas pack.`;
      setStatus(message);
      pushActivity(
        nextResult.status === "failed"
          ? "error"
          : nextResult.status === "partial"
            ? "warning"
            : "success",
        "canvas",
        request.scope === "selection" ? "Canvas blocks regenerated" : "Canvas page refined",
        message,
        operationId
      );
      return message;
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "canvas", "Canvas AI co-edit failed", message, operationId);
      return message;
    } finally {
      endExclusiveAction(claim);
    }
  }

  function saveCurrentCanvasTemplate() {
    const trimmedPrompt = canvasPrompt.trim() || promptText.trim();
    const trimmedName =
      canvasTemplateName.trim() ||
      REPORTING_PRESETS.find((preset) => preset.id === selectedCanvasPresetId)?.label ||
      "Canvas Template";

    const nextTemplates = saveCanvasTemplate({
      id: selectedCanvasTemplateId || createTemplateId(),
      name: trimmedName,
      presetId: selectedCanvasPresetId,
      promptText: trimmedPrompt,
      businessContext: businessContext.trim(),
      variationSeed,
      templateVersion: 2,
      recommendedPrompts: [effectiveCanvasPrompt],
      qualityConstraints: (canvasDesignSpec?.qualityConstraints ?? []).slice(0, 8),
      designIntent:
        canvasDesignIntentDraft ??
        selectedCanvasTemplate?.designIntent ??
        (canvasDesignSpec ? designIntentFromSpec(canvasDesignSpec) : undefined),
      designSpec: canvasDesignSpec ?? selectedCanvasTemplate?.designSpec,
      canvasDocument: canvasDocumentDraft ?? selectedCanvasTemplate?.canvasDocument,
    });

    const saved = nextTemplates[0];
    setCanvasTemplates(nextTemplates);
    setSelectedCanvasTemplateId(saved.id);
    setCanvasTemplateName(saved.name);
    syncPersistenceHealth();
    setStatus(`Canvas template "${saved.name}" saved.`);
  }

  function applySelectedCanvasTemplate() {
    if (!selectedCanvasTemplate) {
      setStatus("Select a saved canvas template first.");
      return;
    }

    setSelectedCanvasPresetId(selectedCanvasTemplate.presetId);
    setCanvasPrompt(selectedCanvasTemplate.promptText);
    setBusinessContext(selectedCanvasTemplate.businessContext ?? "");
    setCanvasTemplateName(selectedCanvasTemplate.name);
    setCanvasDesignIntentDraft(selectedCanvasTemplate.designIntent ?? null);
    setCanvasDesignSpec(selectedCanvasTemplate.designSpec ?? null);
    setCanvasDocumentDraft(
      selectedCanvasTemplate.canvasDocument
        ? normalizeCanvasDocument(selectedCanvasTemplate.canvasDocument)
        : null
    );
    setCanvasHistory({ undoStack: [], redoStack: [] });
    setVariationSeed(selectedCanvasTemplate.variationSeed ?? variationSeed);
    setStatus(`Canvas template "${selectedCanvasTemplate.name}" applied.`);
    changeOutputWorkspace("canvas");
  }

  function removeSelectedCanvasTemplate() {
    if (!selectedCanvasTemplate) {
      setStatus("Select a saved canvas template first.");
      return;
    }

    const nextTemplates = deleteCanvasTemplate(selectedCanvasTemplate.id);
    setCanvasTemplates(nextTemplates);
    setSelectedCanvasTemplateId("");
    setCanvasTemplateName("");
    setCanvasDesignIntentDraft(null);
    syncPersistenceHealth();
    setStatus(`Canvas template "${selectedCanvasTemplate.name}" deleted.`);
  }

  function getDiagnosticsPayload(): string {
    return buildDiagnosticsBundle({
      startupIssue,
      lastOperationId,
      workflowFreshness,
      persistenceStatus,
      officeCapabilities,
      googleConnection,
      selection: snapshot
        ? {
            sheetName: snapshot.sheetName,
            address: snapshot.address,
            rowCount: snapshot.rowCount,
            columnCount: snapshot.columnCount,
          }
        : null,
      bundleReady: Boolean(bundle),
      renderResult,
      gmailDraftResult,
      appsScriptResult,
      diagnosticsCount: diagnostics.length,
    });
  }

  function downloadDiagnosticsBundle() {
    const payload = getDiagnosticsPayload();

    if (typeof window === "undefined" || typeof document === "undefined") {
      setStatus("Diagnostics download is unavailable in this runtime.");
      return;
    }

    try {
      const blob = new Blob([payload], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `reportforge-diagnostics-${Date.now()}.json`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setStatus("Diagnostics bundle downloaded.");
    } catch {
      setStatus("Diagnostics download is unavailable. Copy the diagnostics instead.");
    }
  }

  function applyPromptStarter(starter: (typeof PROMPT_STARTERS)[number]) {
    invalidatePlanOutputs("Prompt starter loaded. Refreshing the plan from the new guidance.");
    clearReportIntakeSession();
    setPromptText(starter.prompt);
    setMode(starter.mode);
    setError(null);
    changeView("brief");
    changePlanWorkspace("brief");
    pushActivity("info", "planning", "Prompt starter applied", `${starter.label} guidance loaded.`);
  }

  function previewAgentPlan() {
    if (!snapshot || !profile || !bundle || !isPlanReady) {
      setError("Analyze a range before planning agent actions.");
      return;
    }

    try {
      const nextPlan = planAgentActions(agentPromptText, snapshot, profile, bundle.plan);
      setAgentPlan(nextPlan);
      setAgentExecutionResult(null);
      setError(null);
      setStatus(
        `Agent plan ready with ${nextPlan.steps.length} step${nextPlan.steps.length === 1 ? "" : "s"}. Review it, then approve execution.`
      );
      changeView("automation");
      pushActivity(
        "info",
        "agent",
        "Agent plan previewed",
        `${nextPlan.steps.length} bounded step${nextPlan.steps.length === 1 ? "" : "s"} ready for review.`
      );
    } catch (nextError) {
      setError(toFriendlyErrorMessage(nextError));
    }
  }

  async function runAgentPlan() {
    if (!snapshot || !profile || !bundle || !isPlanReady) {
      setError("Analyze a range before executing agent actions.");
      return;
    }

    if (!agentPlan) {
      setError("Preview the agent plan before executing it.");
      return;
    }

    const claim = beginExclusiveAction("Executing agent plan");
    if (!claim) {
      return;
    }

    setError(null);
    const operationId = createOperationId("agent");
    setLastOperationId(operationId);

    try {
      const result = await executeAgentPlan(snapshot, profile, bundle.plan, agentPlan);
      if (!isClaimActive(claim)) {
        return;
      }

      setAgentExecutionResult(result);
      if (result.reportResult) {
        setRenderResult(result.reportResult);
      }

      const failedCount = result.stepResults.filter((step) => step.status === "failed").length;
      setStatus(
        failedCount > 0
          ? `Agent execution finished with ${failedCount} issue${failedCount === 1 ? "" : "s"}. Review the execution log below.`
          : "Agent execution finished successfully."
      );
      pushActivity(
        failedCount > 0 ? "warning" : "success",
        "agent",
        "Agent execution completed",
        failedCount > 0
          ? `${failedCount} step issue${failedCount === 1 ? "" : "s"} detected during execution.`
          : "All planned bounded actions completed successfully.",
        operationId
      );
      changeView("automation");
    } catch (nextError) {
      recordDiagnosticEvent(
        "error",
        "agent",
        "Agent execution failed",
        `${operationId}: ${nextError instanceof Error ? nextError.message : String(nextError)}`
      );
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "agent", "Agent execution failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  function saveCurrentTemplate() {
    if (!templateName.trim()) {
      setError("Enter a template name before saving.");
      return;
    }

    const nextTemplate: SavedTemplate = {
      id: createTemplateId(),
      name: templateName.trim(),
      promptText,
      businessContext: businessContext.trim(),
      mode,
      variationSeed,
      emailTo: emailRecipients.to,
      emailCc: emailRecipients.cc,
      emailBcc: emailRecipients.bcc,
      appsScriptTitle: appsScriptOptions.scriptTitle,
      deploymentDescription: appsScriptOptions.deploymentDescription,
      deployAsWebApp: appsScriptOptions.deployAsWebApp,
      appsScriptAccess: appsScriptOptions.webAppAccess,
      appsScriptExecuteAs: appsScriptOptions.executeAs,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextTemplates = saveTemplate(nextTemplate);
    setTemplates(nextTemplates);
    setSelectedTemplateId(nextTemplate.id);
    syncPersistenceHealth();
    const nextPersistenceStatus = getPersistenceStatus();
    setError(null);
    setStatus(
      nextPersistenceStatus.degraded
        ? `Template "${nextTemplate.name}" is available for this session, but persistence is degraded.`
        : `Template "${nextTemplate.name}" saved.`
    );
    changeView("brief");
    changePlanWorkspace("templates");
    pushActivity("success", "templates", "Template saved", `Saved ${nextTemplate.name}.`);
  }

  function applySelectedTemplate() {
    if (!selectedTemplate) {
      setError("Select a template to apply.");
      return;
    }

    clearReportIntakeSession();
    setTemplateName(selectedTemplate.name);
    setPromptText(selectedTemplate.promptText);
    setBusinessContext(selectedTemplate.businessContext ?? "");
    setMode(selectedTemplate.mode);
    setVariationSeed(selectedTemplate.variationSeed);
    setEmailRecipients({
      to: selectedTemplate.emailTo,
      cc: selectedTemplate.emailCc,
      bcc: selectedTemplate.emailBcc,
    });
    setAppsScriptOptions({
      scriptTitle: selectedTemplate.appsScriptTitle,
      deploymentDescription: selectedTemplate.deploymentDescription,
      deployAsWebApp: selectedTemplate.deployAsWebApp,
      webAppAccess: selectedTemplate.appsScriptAccess ?? "MYSELF",
      executeAs: selectedTemplate.appsScriptExecuteAs ?? "USER_ACCESSING",
    });
    setAppsScriptDraftState(
      createAppsScriptDraftStateFromValues({
        scriptTitle: selectedTemplate.appsScriptTitle,
        deploymentDescription: selectedTemplate.deploymentDescription,
      })
    );
    invalidatePlanOutputs(
      `Template "${selectedTemplate.name}" applied. Refreshing the active plan.`
    );
    setError(null);
    changeView("brief");
    changePlanWorkspace("brief");
    pushActivity("info", "templates", "Template applied", `Applied ${selectedTemplate.name}.`);
  }

  function submitReportIntakeMessage(messageOverride?: string) {
    if (!snapshot || !profile || !reportIntake) {
      setError("Analyze a range before adding intake context.");
      return;
    }

    const nextMessage = (messageOverride ?? reportIntakeMessage).trim();
    if (!nextMessage) {
      return;
    }

    const prompt = interpretPrompt(promptText, { mode, variationSeed }, businessContext);
    const nextIntake = applyConversationMessage(
      reportIntake,
      snapshot,
      profile,
      prompt,
      nextMessage
    );

    invalidatePlanOutputs(
      nextIntake.brief.generateNow
        ? "Brief locked. Regenerating the report before export."
        : "Brief updated. Refreshing the plan around the latest reporting intent."
    );
    setReportBriefOverrides(nextIntake.brief);
    setReportConversationTurns(nextIntake.turns);
    setReportIntakeMessage("");
    setError(null);
    if (nextIntake.brief.generateNow) {
      setPendingGenerateNow(true);
    } else {
      setStatus(
        nextIntake.intakeComplete
          ? "Brief updated. The plan is refreshing with the clarified intent."
          : "Brief updated. ReportForge is adjusting the story plan before export."
      );
    }
  }

  function handleReportGenerateNow() {
    if (!reportIntake) {
      setError("Analyze a range before generating.");
      return;
    }

    invalidatePlanOutputs("Brief locked. Regenerating the report before export.");
    setReportBriefOverrides({
      ...reportIntake.brief,
      generateNow: true,
      intakeComplete: true,
    });
    setPendingGenerateNow(true);
    setError(null);
  }

  function removeSelectedTemplate() {
    if (!selectedTemplate) {
      setError("Select a template to delete.");
      return;
    }

    setTemplates(deleteTemplate(selectedTemplate.id));
    setSelectedTemplateId("");
    syncPersistenceHealth();
    setError(null);
    setStatus(`Template "${selectedTemplate.name}" deleted.`);
    changeView("brief");
    changePlanWorkspace("templates");
    pushActivity("warning", "templates", "Template deleted", `Deleted ${selectedTemplate.name}.`);
  }

  function saveCurrentGoogleSettings() {
    if (isManagedGoogleClientId) {
      setError(null);
      setStatus(
        "Google OAuth is managed by this deployment. Sign-in will start automatically on the first Gmail or Apps Script action."
      );
      return;
    }

    const normalized = { clientId: googleConfig.clientId.trim() };

    if (!normalized.clientId) {
      saveGoogleConfig({ clientId: "" });
      clearGoogleToken();
      clearGoogleAuthState();
      setGoogleConfigState({ clientId: "" });
      setGoogleTokenState(null);
      setGoogleAuthState(clearGoogleOAuthRuntimeState());
      setGmailDraftResult(null);
      setAppsScriptResult(null);
      syncPersistenceHealth();
      setError(null);
      setStatus("Google settings cleared.");
      pushActivity("warning", "google", "Google settings cleared", "OAuth client ID removed.");
      return;
    }

    const googleIssue = describeGoogleOAuthClientIdIssue(normalized.clientId);
    if (googleIssue) {
      setError(googleIssue);
      return;
    }

    saveGoogleConfig(normalized);
    setGoogleConfigState(normalized);
    clearGoogleToken();
    clearGoogleAuthState();
    setGoogleTokenState(null);
    setGoogleAuthState(clearGoogleOAuthRuntimeState());
    setGmailDraftResult(null);
    setAppsScriptResult(null);
    syncPersistenceHealth();
    setError(null);
    setStatus("Google settings saved. Connect only when you need Gmail or Apps Script access.");
    pushActivity("success", "google", "Google settings saved", "OAuth client ID stored locally.");
  }

  function saveCurrentLlmSettings() {
    const normalizedConfig: LlmProviderConfig = {
      ...llmConfig,
      providerLabel:
        llmConfig.providerLabel.trim() ||
        (hasManagedLlmPreset ? runtimeConfig.llmPreset.providerLabel : ""),
      endpoint:
        llmConfig.endpoint.trim() || (hasManagedLlmPreset ? runtimeConfig.llmPreset.endpoint : ""),
      model: llmConfig.model.trim() || (hasManagedLlmPreset ? runtimeConfig.llmPreset.model : ""),
      apiKeyHeader:
        llmConfig.apiKeyHeader.trim() ||
        (hasManagedLlmPreset ? runtimeConfig.llmPreset.apiKeyHeader : ""),
      apiKeyPrefix:
        llmConfig.apiKeyPrefix.trim() ||
        (hasManagedLlmPreset ? runtimeConfig.llmPreset.apiKeyPrefix : ""),
      organization:
        llmConfig.organization?.trim() ||
        (hasManagedLlmPreset ? runtimeConfig.llmPreset.organization : ""),
      temperature: Number.isFinite(llmConfig.temperature) ? llmConfig.temperature : 0.3,
    };

    if (normalizedConfig.enabled) {
      if (!normalizedConfig.endpoint || !normalizedConfig.model) {
        setError("When AI is enabled, save at least an endpoint and model.");
        return;
      }

      if (requiresLlmClientSecret(normalizedConfig) && !llmSecret?.apiKey.trim()) {
        setError("When AI is enabled, enter a session API key before saving.");
        return;
      }
    }

    saveLlmProviderConfig(normalizedConfig);
    setLlmConfigState(normalizedConfig);
    setAppliedLlmConfig(normalizedConfig);

    if (llmSecret?.apiKey.trim()) {
      const normalizedSecret = { apiKey: llmSecret.apiKey.trim() };
      saveLlmSessionSecret(normalizedSecret);
      setLlmSecretState(normalizedSecret);
      setAppliedLlmSecret(normalizedSecret);
    } else {
      clearLlmSessionSecret();
      setLlmSecretState(null);
      setAppliedLlmSecret(null);
    }

    syncPersistenceHealth();

    invalidatePlanOutputs(
      normalizedConfig.enabled
        ? "AI provider saved. Refreshing the active plan before outputs can run again."
        : "AI enhancement disabled. Refreshing the deterministic plan."
    );
    setError(null);
    pushActivity(
      "success",
      "ai",
      "AI settings saved",
      normalizedConfig.enabled ? "AI enhancement is configured." : "AI enhancement disabled."
    );
  }

  function clearCurrentLlmKey() {
    clearLlmSessionSecret();
    setLlmSecretState(null);
    setAppliedLlmSecret(null);
    syncPersistenceHealth();
    invalidatePlanOutputs("The AI session API key was cleared. Refreshing the deterministic plan.");
    setError(null);
    pushActivity(
      "warning",
      "ai",
      "AI session key cleared",
      "The session-only API key was removed."
    );
  }

  function restoreManagedLlmPreset() {
    if (!hasManagedLlmPreset) {
      return;
    }

    setLlmConfigState((current) => ({
      ...current,
      providerLabel: runtimeConfig.llmPreset.providerLabel,
      endpoint: runtimeConfig.llmPreset.endpoint,
      model: runtimeConfig.llmPreset.model,
      apiKeyHeader: runtimeConfig.llmPreset.apiKeyHeader,
      apiKeyPrefix: runtimeConfig.llmPreset.apiKeyPrefix,
      organization: runtimeConfig.llmPreset.organization,
    }));
    setError(null);
    setStatus("Managed AI provider defaults restored. Save them when you are ready to use AI.");
  }

  async function testCurrentLlmSettings() {
    if (!llmConfig.enabled) {
      setError("Enable AI enhancement before testing the provider connection.");
      return;
    }

    if (requiresLlmClientSecret(llmConfig) && !llmSecret?.apiKey.trim()) {
      setError("Enter a session API key before testing the AI provider.");
      return;
    }

    const claim = beginExclusiveAction("Testing AI provider");
    if (!claim) {
      return;
    }

    setError(null);
    const operationId = createOperationId("ai-health");
    setLastOperationId(operationId);

    try {
      const result = await probeLlmProvider(
        {
          ...llmConfig,
          providerLabel:
            llmConfig.providerLabel.trim() ||
            (hasManagedLlmPreset ? runtimeConfig.llmPreset.providerLabel : ""),
          endpoint:
            llmConfig.endpoint.trim() ||
            (hasManagedLlmPreset ? runtimeConfig.llmPreset.endpoint : ""),
          model:
            llmConfig.model.trim() || (hasManagedLlmPreset ? runtimeConfig.llmPreset.model : ""),
          apiKeyHeader:
            llmConfig.apiKeyHeader.trim() ||
            (hasManagedLlmPreset ? runtimeConfig.llmPreset.apiKeyHeader : ""),
          apiKeyPrefix:
            llmConfig.apiKeyPrefix.trim() ||
            (hasManagedLlmPreset ? runtimeConfig.llmPreset.apiKeyPrefix : ""),
          organization:
            llmConfig.organization?.trim() ||
            (hasManagedLlmPreset ? runtimeConfig.llmPreset.organization : ""),
        },
        llmSecret?.apiKey.trim() ? { apiKey: llmSecret.apiKey.trim() } : null
      );
      if (!isClaimActive(claim)) {
        return;
      }

      setStatus(`AI provider responded successfully (${result.status}).`);
      pushActivity(
        "success",
        "ai",
        "AI provider validated",
        `${llmConfig.providerLabel || runtimeConfig.llmPreset.providerLabel} responded successfully.`,
        operationId
      );
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "ai", "AI provider validation failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function ensureGoogleToken(scopes: string[], label: string): Promise<GoogleTokenRecord> {
    const normalizedConfig = { clientId: googleConfig.clientId.trim() };
    const googleIssue = describeGoogleOAuthClientIdIssue(normalizedConfig.clientId);
    if (googleIssue) {
      throw new Error(
        normalizedConfig.clientId
          ? googleIssue
          : "Google sign-in is not enabled in this deployment yet. Ask the workspace administrator to enable it for end users."
      );
    }

    saveGoogleConfig(normalizedConfig);
    setGoogleConfigState(normalizedConfig);
    syncPersistenceHealth();

    if (tokenHasScopes(googleToken, scopes)) {
      return googleToken as GoogleTokenRecord;
    }

    const nextToken = await requestGoogleAccessToken(normalizedConfig, scopes, googleToken, {
      runtimeState: googleAuthState,
      onStateChange: persistGoogleAuthRuntimeState,
    });
    saveGoogleToken(nextToken);
    setGoogleTokenState(nextToken);
    syncPersistenceHealth();
    setStatus(`${label} access granted.`);
    return nextToken;
  }

  async function connectGoogleForOutputs() {
    const claim = beginExclusiveAction("Connecting Google");
    if (!claim) {
      return;
    }

    setError(null);
    const operationId = createOperationId("google-connect");
    setLastOperationId(operationId);

    try {
      await ensureGoogleToken([GOOGLE_SCOPES.gmailCompose, GOOGLE_SCOPES.scriptProjects], "Google");
      if (!isClaimActive(claim)) {
        return;
      }

      setStatus("Google connected. Gmail drafts and Apps Script export are now ready.");
      pushActivity(
        "success",
        "google",
        "Google connected",
        "Google access granted for Gmail drafts and Apps Script export.",
        operationId
      );
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "google", "Google connection failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function disconnectGoogle() {
    const claim = beginExclusiveAction("Disconnecting Google");
    if (!claim) {
      return;
    }

    setError(null);

    try {
      await revokeGoogleAccess(googleToken);
      if (!isClaimActive(claim)) {
        return;
      }

      invalidateGoogleSession("Google access disconnected.", "disconnect");
      setError(null);
      pushActivity(
        "success",
        "google",
        "Google disconnected",
        "The current session token was revoked."
      );
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "google", "Google disconnect failed", message);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function createRealGmailDraft() {
    if (!activeEmail || !isPlanReady) {
      setError("Analyze a range before creating a Gmail draft.");
      return;
    }

    if (!hasRecipients) {
      setError("Enter at least one recipient before creating a Gmail draft.");
      return;
    }

    const claim = beginExclusiveAction("Creating Gmail draft");
    if (!claim) {
      return;
    }

    setError(null);
    const operationId = createOperationId("gmail");
    setLastOperationId(operationId);

    try {
      const token = await ensureGoogleToken([GOOGLE_SCOPES.gmailCompose], "Gmail");
      const result = await createGmailDraft(activeEmail, emailRecipients, token);
      if (!isClaimActive(claim)) {
        return;
      }

      setGmailDraftResult(result);
      setError(null);
      setStatus(`Gmail draft created (${result.id}).`);
      pushActivity(
        "success",
        "google",
        "Gmail draft created",
        `Created draft ${result.id}.`,
        operationId
      );
      changeView("outputs");
      changeOutputWorkspace("email");
    } catch (nextError) {
      if (nextError instanceof GoogleApiError && nextError.shouldInvalidateToken) {
        invalidateGoogleSession(
          "Google access is no longer valid. Reconnect before creating Gmail drafts."
        );
      }

      recordDiagnosticEvent(
        "error",
        "google",
        "Gmail draft creation failed",
        `${operationId}: ${nextError instanceof Error ? nextError.message : String(nextError)}`
      );
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "google", "Gmail draft failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function exportRealAppsScript(deployAsWebApp: boolean) {
    if (!bundle || !isPlanReady) {
      setError("Analyze a range before exporting an Apps Script project.");
      return;
    }

    const claim = beginExclusiveAction(
      deployAsWebApp ? "Exporting and deploying Apps Script" : "Exporting Apps Script"
    );
    if (!claim) {
      return;
    }

    setError(null);
    const operationId = createOperationId("apps-script");
    setLastOperationId(operationId);

    try {
      const scopes = deployAsWebApp
        ? [GOOGLE_SCOPES.scriptProjects, GOOGLE_SCOPES.scriptDeployments]
        : [GOOGLE_SCOPES.scriptProjects];
      const token = await ensureGoogleToken(scopes, "Apps Script");
      const result = await exportAppsScriptProject(bundle.gasProject, token, {
        ...appsScriptOptions,
        deployAsWebApp,
      });
      if (!isClaimActive(claim)) {
        return;
      }

      setAppsScriptResult(result);
      setError(null);
      setStatus(
        deployAsWebApp
          ? `Apps Script project exported and deployed (${result.scriptId}).`
          : `Apps Script project exported (${result.scriptId}).`
      );
      pushActivity(
        "success",
        "google",
        deployAsWebApp ? "Apps Script deployed" : "Apps Script exported",
        deployAsWebApp
          ? `Created script ${result.scriptId} and deployment ${result.deploymentId ?? "pending"}.`
          : `Created script ${result.scriptId}.`,
        operationId
      );
      changeView("outputs");
      changeOutputWorkspace("webapp");
    } catch (nextError) {
      if (nextError instanceof GoogleApiError && nextError.shouldInvalidateToken) {
        invalidateGoogleSession(
          "Google access is no longer valid. Reconnect before exporting Apps Script projects."
        );
      }

      recordDiagnosticEvent(
        "error",
        "google",
        "Apps Script export failed",
        `${operationId}: ${nextError instanceof Error ? nextError.message : String(nextError)}`
      );
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "google", "Apps Script export failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function generateSlideTemplate() {
    if (!bundle || !isPlanReady) {
      setError("Analyze a range before generating a slide template.");
      return;
    }

    if (!canGenerateSlideTemplate) {
      setError(
        requiresLlmClientSecret(appliedLlmConfig)
          ? "Save an AI provider and provider credentials before generating a custom slide template."
          : "Save an AI provider before generating a custom slide template."
      );
      return;
    }

    if (!slideTemplatePrompt.trim()) {
      setError("Describe the slide template you want before generating it.");
      return;
    }

    const claim = beginExclusiveAction("Generating slide template");
    if (!claim) {
      return;
    }

    setError(null);
    const operationId = createOperationId("slide-template");
    setLastOperationId(operationId);

    try {
      const nextTemplate = await generateSlideTemplateWithLlm(
        appliedLlmConfig,
        appliedLlmSecret,
        createTemplateId(),
        bundle.slidesBundle.theme,
        {
          userPrompt: slideTemplatePrompt,
          reportPrompt: bundle.prompt.rawPrompt,
          audience: bundle.prompt.audience,
          reportTitle: bundle.plan.title,
          reportSubtitle: bundle.plan.subtitle,
          slideCount: bundle.slidesBundle.slides.length,
          slideTitles: bundle.slidesBundle.slides.map((slide) => slide.title),
          sampleTakeaways: bundle.slidesBundle.slides.slice(0, 4).map((slide) => slide.takeaway),
          visualKinds: bundle.slidesBundle.slides
            .map((slide) => slide.visual?.kind ?? "none")
            .slice(0, 6),
        }
      );
      if (!isClaimActive(claim)) {
        return;
      }

      const nextTemplates = saveSlideTemplate(nextTemplate);
      setSlideTemplates(nextTemplates);
      setSelectedSlideTemplateId(nextTemplate.id);
      syncPersistenceHealth();
      setStatus(`Slide template "${nextTemplate.name}" generated and saved.`);
      pushActivity(
        "success",
        "slides",
        "Slide template generated",
        `Saved ${nextTemplate.name} for reuse.`,
        operationId
      );
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "slides", "Slide template generation failed", message, operationId);
    } finally {
      endExclusiveAction(claim);
    }
  }

  function removeSelectedSlideTemplate() {
    if (!canDeleteSlideTemplate) {
      setError("Select a saved custom slide template to delete it.");
      return;
    }

    const nextTemplates = deleteSlideTemplate(selectedSlideTemplateId);
    const deletedTemplate = slideTemplates.find(
      (template) => template.id === selectedSlideTemplateId
    );
    setSlideTemplates(nextTemplates);
    setSelectedSlideTemplateId(DEFAULT_SLIDE_TEMPLATE_ID);
    syncPersistenceHealth();
    setError(null);
    setStatus(
      deletedTemplate
        ? `Slide template "${deletedTemplate.name}" deleted.`
        : "Slide template deleted."
    );
  }

  async function downloadSlideDeckPowerPoint() {
    if (!bundle || !isPlanReady) {
      setError("Analyze a range before exporting slides.");
      return;
    }

    const claim = beginExclusiveAction("Exporting PowerPoint deck");
    if (!claim) {
      return;
    }

    setError(null);

    try {
      const { buildSlideDeckPowerPoint } = await loadSlideExportService();
      const blob = await buildSlideDeckPowerPoint(bundle.slidesBundle, activeSlideTemplate);
      if (!isClaimActive(claim)) {
        return;
      }

      const filename = sanitizeFilename(bundle.slidesBundle.title, "pptx");
      prepareSlidePowerPointDownload(filename, blob);
      downloadBlobArtifact(filename, blob);
      changeView("outputs");
      changeOutputWorkspace("slides");
      setStatus(
        `${filename} is ready. If the automatic download did not start, use the PowerPoint actions in Slides > Export Status.`
      );
      pushActivity(
        "success",
        "slides",
        "PowerPoint deck exported",
        `Downloaded ${bundle.slidesBundle.title} as a PowerPoint deck.`
      );
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "slides", "PowerPoint export failed", message);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function openSlidePdfPreview() {
    if (!bundle || !isPlanReady) {
      setError("Analyze a range before exporting slides.");
      return;
    }

    const claim = beginExclusiveAction("Building PDF preview");
    if (!claim) {
      return;
    }

    setError(null);

    try {
      const { buildSlideDeckPdf } = await loadSlideExportService();
      const pdfBytes = await buildSlideDeckPdf(bundle.slidesBundle, activeSlideTemplate);
      if (!isClaimActive(claim)) {
        return;
      }

      showSlidePdfPreview(pdfBytes);
      changeView("outputs");
      changeOutputWorkspace("slides");
      setStatus(
        "Slide PDF preview is ready inside the Slides tab. Use the direct PDF link below if the automatic file action does not open."
      );
      pushActivity(
        "success",
        "slides",
        "Slide PDF preview prepared",
        `Prepared an in-pane PDF preview for ${bundle.slidesBundle.title}.`
      );
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "slides", "Slide PDF preview failed", message);
    } finally {
      endExclusiveAction(claim);
    }
  }

  async function downloadSlidePdf() {
    if (!bundle || !isPlanReady) {
      setError("Analyze a range before exporting slides.");
      return;
    }

    const claim = beginExclusiveAction("Downloading slide PDF");
    if (!claim) {
      return;
    }

    setError(null);

    try {
      const { buildSlideDeckPdf } = await loadSlideExportService();
      const pdfBytes = await buildSlideDeckPdf(bundle.slidesBundle, activeSlideTemplate);
      if (!isClaimActive(claim)) {
        return;
      }

      const filename = sanitizeFilename(bundle.slidesBundle.title, "pdf");
      showSlidePdfPreview(pdfBytes);
      downloadBytesArtifact(filename, pdfBytes, "application/pdf");
      setStatus(
        `${filename} is ready. If the automatic download did not start, use the direct PDF link in Slides > Export Status.`
      );
      pushActivity(
        "success",
        "slides",
        "Slide PDF downloaded",
        `Downloaded ${bundle.slidesBundle.title} as a PDF preview.`
      );
    } catch (nextError) {
      const message = toFriendlyErrorMessage(nextError);
      setError(message);
      pushActivity("error", "slides", "Slide PDF download failed", message);
    } finally {
      endExclusiveAction(claim);
    }
  }

  return (
    <div className={`rf-shell ${isReady ? "is-ready" : "is-booting"}`.trim()}>
      <header className="rf-hero">
        <div className="rf-hero__brand">
          <div className="rf-hero__logo-shell" aria-hidden="true">
            <img className="rf-hero__mark" src="assets/reportforge-mark.svg" alt="" />
          </div>
          <div>
            <p className="rf-hero__eyebrow">Excel-Native Reporting Copilot</p>
            <h1>ReportForge AI</h1>
            <p className="rf-hero__subtitle">
              Turn a selected Excel range into workbook, Apps Script, Gmail, slides, and
              canvas-driven reporting outputs.
            </p>
          </div>
        </div>
        <div className="rf-hero__meta">
          <StatusPill
            label={isReady ? "Office Ready" : "Loading Office"}
            tone={isReady ? "success" : "warning"}
          />
          <StatusPill
            label={isExcelHost ? "Excel Host" : "Awaiting Excel"}
            tone={isExcelHost ? "success" : "warning"}
          />
          <StatusPill
            label={snapshot ? "Selection Ready" : "No Selection Yet"}
            tone={snapshot ? "success" : "warning"}
          />
          <StatusPill
            label={
              bundle?.aiEnhancement
                ? "AI Enhanced"
                : hasPendingAiChanges
                  ? "AI Unsaved"
                  : appliedLlmConfig.enabled
                    ? isAiConfigured
                      ? "AI Armed"
                      : "AI Incomplete"
                    : "AI Optional"
            }
            tone={
              bundle?.aiEnhancement || (appliedLlmConfig.enabled && isAiConfigured)
                ? "success"
                : "warning"
            }
          />
          <StatusPill
            label={googleConnection.label}
            tone={googleConnection.status === "connected" ? "success" : "warning"}
          />
        </div>
      </header>

      <div className="rf-banner rf-banner--spotlight">
        <div className="rf-banner__header">
          <div className="rf-banner__content">
            <strong>{workflowSpotlight.title}</strong>
            <span>{status}</span>
            <p className="rf-banner__next">Next step: {nextStep}</p>
            <p className="rf-banner__next">{workflowSpotlight.detail}</p>
            {latestOutputMessage ? <p className="rf-banner__next">{latestOutputMessage}</p> : null}
            {activeWorkLabel ? (
              <p className="rf-banner__next">Current action: {activeWorkLabel}</p>
            ) : null}
            {workflowFreshness.activeGenerationId ? (
              <p className="rf-banner__next">
                Active generation: {workflowFreshness.phase} #{workflowFreshness.activeGenerationId}
              </p>
            ) : null}
            {lastOperationId ? (
              <p className="rf-banner__next">Last operation ID: {lastOperationId}</p>
            ) : null}
          </div>
          <div className="rf-banner__actions">
            <button
              type="button"
              className="rf-button rf-button--primary"
              onClick={workflowSpotlight.onPrimaryClick}
              disabled={workflowSpotlight.primaryDisabled}
            >
              {workflowSpotlight.primaryLabel}
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={workflowSpotlight.onSecondaryClick}
              disabled={workflowSpotlight.secondaryDisabled}
            >
              {workflowSpotlight.secondaryLabel}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rf-error">
          <strong>Needs attention</strong>
          <span>{error}</span>
        </div>
      ) : null}

      {startupIssue ? (
        <div className="rf-error rf-error--soft">
          <strong>Startup Notice</strong>
          <span>{startupIssue}</span>
        </div>
      ) : null}

      {persistenceStatus.degraded ? (
        <div className="rf-error rf-error--soft">
          <strong>Persistence Degraded</strong>
          <span>{persistenceStatus.messages[0]}</span>
        </div>
      ) : null}

      {capabilityNotes.length > 0 ? (
        <div className="rf-error rf-error--soft">
          <strong>Host Limitations</strong>
          <span>{capabilityNotes.join(" ")}</span>
        </div>
      ) : null}

      {!isPlanReady && snapshot ? (
        <div className="rf-error rf-error--soft">
          <strong>Plan Refresh In Progress</strong>
          <span>
            The current selection or configuration changed. Outputs stay locked until the refreshed
            plan is ready.
          </span>
        </div>
      ) : null}

      {isBackgroundRefreshing ? (
        <div className="rf-error rf-error--soft">
          <strong>AI Enhancement In Progress</strong>
          <span>
            The deterministic plan is already available. You can keep editing prompts and
            configuration while the AI narrative refresh completes.
          </span>
        </div>
      ) : null}

      {pendingSelectionPreflight ? (
        <div className="rf-error rf-error--soft">
          <strong>Large Selection Gate</strong>
          <span>{pendingSelectionPreflight.messages.join(" ")}</span>
          <div className="rf-inline-actions">
            <button
              type="button"
              className="rf-button rf-button--primary"
              onClick={() => analyzeSelection(true)}
              disabled={isActionLocked}
            >
              Analyze Large Selection Anyway
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => setPendingSelectionPreflight(null)}
              disabled={isBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <TaskpaneTabs views={taskpaneViews} activeView={activeView} onChange={changeView} />

      <div
        id={`rf-view-${activeView}`}
        role="tabpanel"
        aria-labelledby={`rf-tab-${activeView}`}
        className="rf-view-stack"
      >
        {activeView === "overview" ? (
          <SectionCard
            id="start-here"
            title="Start Here"
            description="Follow the workflow in order so setup, generation, and outputs stay easy to track."
          >
            <div className="rf-grid rf-grid--stats">
              <div className="rf-stat">
                <span className="rf-stat__label">Progress</span>
                <strong>{completedWorkflowCount}/4</strong>
                <p>Core workflow steps done</p>
              </div>
              <div className="rf-stat">
                <span className="rf-stat__label">Selection</span>
                <strong>{snapshot ? snapshot.address : "Not analyzed"}</strong>
                <p>{snapshot ? snapshot.sheetName : "Choose a range in Excel"}</p>
              </div>
              <div className="rf-stat">
                <span className="rf-stat__label">Plan</span>
                <strong>{bundle ? bundle.plan.title : "No active plan"}</strong>
                <p>{isPlanReady ? "Ready for outputs" : "Waiting for analysis"}</p>
              </div>
              <div className="rf-stat">
                <span className="rf-stat__label">Outputs</span>
                <strong>{completedOutputCount}</strong>
                <p>Generated in this session</p>
              </div>
            </div>
            <div className="rf-grid rf-grid--two">
              <div className="rf-checklist">
                {workflowSteps.map((step, index) => (
                  <div key={step.id} className={`rf-step ${step.done ? "is-done" : ""}`}>
                    <div className="rf-step__header">
                      <span className="rf-step__number">{index + 1}</span>
                      <div>
                        <h3>{step.title}</h3>
                        <p>{step.description}</p>
                      </div>
                    </div>
                    <div className="rf-step__footer">
                      <StatusPill
                        label={step.done ? "Done" : step.optional ? "Optional" : "Pending"}
                        tone={step.done ? "success" : "warning"}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rf-grid">
                <div className="rf-panel">
                  <h3>Quick Actions</h3>
                  <p className="rf-helper">
                    Keep the first run simple: analyze the range, confirm the plan, then write the
                    workbook report.
                  </p>
                  <div className="rf-inline-actions">
                    <button
                      type="button"
                      className={`rf-button ${!snapshot ? "rf-button--primary" : ""}`.trim()}
                      onClick={() => {
                        void analyzeSelection();
                      }}
                      disabled={!isExcelHost || !officeCapabilities.selectionRead || isActionLocked}
                    >
                      {isBusy && activeActionLabel?.includes("Analyzing")
                        ? "Analyzing..."
                        : "Analyze Selection"}
                    </button>
                    <button
                      type="button"
                      className={`rf-button ${
                        isPlanReady && !renderResult ? "rf-button--primary" : ""
                      }`.trim()}
                      onClick={buildWorkbookReport}
                      disabled={
                        !isReportEligible || !officeCapabilities.excelApiSupported || isActionLocked
                      }
                    >
                      Generate Excel Report
                    </button>
                    <button
                      type="button"
                      className={`rf-button ${
                        isPlanReady && (Boolean(renderResult) || completedOutputCount > 0)
                          ? "rf-button--primary"
                          : ""
                      }`.trim()}
                      onClick={() => openOutputs("excel")}
                      disabled={!isPlanReady}
                    >
                      Review Outputs
                    </button>
                    <button
                      type="button"
                      className="rf-button"
                      onClick={shuffleVariation}
                      disabled={isInputLocked}
                    >
                      Randomize Report
                    </button>
                  </div>
                </div>
                <div className="rf-panel">
                  <h3>Best Results</h3>
                  <ul className="rf-list">
                    <li>Use a simple rectangular range or a native Excel table.</li>
                    <li>Keep headers on the first row whenever possible.</li>
                    <li>Avoid merged cells and ranges full of formula errors.</li>
                    <li>Start with the Excel report first, then use the other channels.</li>
                    <li>
                      Google connection is optional until you need real Gmail or Apps Script
                      actions.
                    </li>
                  </ul>
                  <p className="rf-note">
                    ReportForge accepts short prompts. You do not need to describe every detail
                    perfectly.
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>
        ) : null}

        {activeView === "source" ? (
          <SectionCard
            id="import"
            title="Source Data"
            description="Profile the active Excel selection before generation."
            actions={
              <button
                type="button"
                className="rf-button rf-button--primary"
                onClick={() => {
                  void analyzeSelection();
                }}
                disabled={!isExcelHost || !officeCapabilities.selectionRead || isActionLocked}
              >
                {isBusy && activeActionLabel?.includes("Analyzing")
                  ? "Analyzing..."
                  : "Analyze Selection"}
              </button>
            }
          >
            {snapshot && bundle ? (
              <>
                <div className="rf-grid rf-grid--stats">
                  <div className="rf-stat">
                    <span className="rf-stat__label">Range</span>
                    <strong>{snapshot.address}</strong>
                    <p>{snapshot.sheetName}</p>
                  </div>
                  <div className="rf-stat">
                    <span className="rf-stat__label">Rows</span>
                    <strong>{bundle.profile.dataRowCount}</strong>
                    <p>{bundle.profile.datasetShape}</p>
                  </div>
                  <div className="rf-stat">
                    <span className="rf-stat__label">Measures</span>
                    <strong>{bundle.profile.primaryMeasures.join(", ") || "None"}</strong>
                    <p>KPI candidates</p>
                  </div>
                  <div className="rf-stat">
                    <span className="rf-stat__label">Dimensions</span>
                    <strong>{bundle.profile.primaryDimensions.join(", ") || "None"}</strong>
                    <p>Filter candidates</p>
                  </div>
                </div>
                <div className="rf-grid rf-grid--two">
                  <div className="rf-panel">
                    <h3>Profiler Notes</h3>
                    <ul className="rf-list">
                      {bundle.profile.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rf-panel">
                    <h3>Selection Guidance</h3>
                    {selectionWarnings.length > 0 ? (
                      <ul className="rf-list">
                        {selectionWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rf-muted">
                        This selection looks healthy for workbook, email, slides, and web scaffold
                        generation.
                      </p>
                    )}
                    <div className="rf-inline-actions">
                      <button
                        type="button"
                        className="rf-button rf-button--primary"
                        onClick={() => openOutputs("excel")}
                        disabled={!isPlanReady}
                      >
                        Open Outputs
                      </button>
                      <button
                        type="button"
                        className="rf-button"
                        onClick={() => openPlan("brief")}
                        disabled={!isPlanReady}
                      >
                        Open Plan
                      </button>
                      <button
                        type="button"
                        className="rf-button"
                        onClick={shuffleVariation}
                        disabled={isInputLocked}
                      >
                        Randomize Report
                      </button>
                    </div>
                    <p className="rf-note">
                      After analysis, use Outputs to review the generated deliverables and use Excel
                      Report to write sheets into the workbook.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rf-grid rf-grid--two">
                <div className="rf-panel rf-panel--soft">
                  <h3>How To Start</h3>
                  <ul className="rf-list">
                    <li>Select a range or table in Excel.</li>
                    <li>Prefer a labeled first row.</li>
                    <li>Click Analyze Selection to unlock the rest of the workflow.</li>
                  </ul>
                </div>
                <div className="rf-panel">
                  <h3>Host Checks</h3>
                  <ul className="rf-list">
                    <li>Office ready: {isReady ? "Yes" : "No"}</li>
                    <li>Excel host: {isExcelHost ? "Yes" : "No"}</li>
                    <li>
                      Selection read API:{" "}
                      {officeCapabilities.selectionRead ? "Available" : "Unavailable"}
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeView === "brief" ? (
          <PlanView
            activeWorkspace={activePlanWorkspace}
            workspaceTabs={planWorkspaceTabs}
            onWorkspaceChange={changePlanWorkspace}
            mode={mode}
            isActionBusy={isInputLocked}
            isBackgroundRefreshing={isBackgroundRefreshing}
            promptStarters={PROMPT_STARTERS}
            promptText={promptText}
            businessContext={businessContext}
            reportIntake={reportIntake}
            intakeMessage={reportIntakeMessage}
            bundle={bundle}
            isPlanReady={isPlanReady}
            templateName={templateName}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            selectedTemplate={selectedTemplate}
            variationSeed={variationSeed}
            aiStatusLabel={aiStatusLabel}
            hasPendingAiChanges={hasPendingAiChanges}
            aiActionHint={aiActionHint}
            llmConfig={llmConfig}
            llmSecret={llmSecret}
            hasManagedPreset={hasManagedLlmPreset}
            managedPresetSummary={`${runtimeConfig.llmPreset.providerLabel} · ${runtimeConfig.llmPreset.model}`}
            onModeChange={(nextMode) => {
              invalidatePlanOutputs("Report mode changed. Refreshing the active plan.");
              setMode(nextMode);
            }}
            onApplyPromptStarter={applyPromptStarter}
            onPromptChange={(nextPrompt) => {
              invalidatePlanOutputs("Prompt changed. Waiting for a refreshed plan.");
              setPromptText(nextPrompt);
            }}
            onBusinessContextChange={(nextContext) => {
              invalidatePlanOutputs("Business context changed. Waiting for a refreshed plan.");
              setBusinessContext(nextContext);
            }}
            onIntakeMessageChange={setReportIntakeMessage}
            onSubmitIntakeMessage={() => submitReportIntakeMessage()}
            onGenerateNow={handleReportGenerateNow}
            onOpenOutputs={() => openOutputs("excel")}
            onShuffleVariation={shuffleVariation}
            onTemplateNameChange={setTemplateName}
            onSelectedTemplateChange={setSelectedTemplateId}
            onSaveTemplate={saveCurrentTemplate}
            onApplyTemplate={applySelectedTemplate}
            onDeleteTemplate={removeSelectedTemplate}
            onLlmConfigChange={setLlmConfigState}
            onLlmSecretChange={setLlmSecretState}
            onSaveAiSettings={saveCurrentLlmSettings}
            onRestoreManagedPreset={restoreManagedLlmPreset}
            onTestAiConnection={() => {
              void testCurrentLlmSettings();
            }}
            onClearAiKey={clearCurrentLlmKey}
          />
        ) : null}

        {activeView === "automation" ? (
          <AutomationView
            agentActionHint={agentActionHint}
            agentPromptText={agentPromptText}
            agentPlan={agentPlan}
            agentExecutionResult={agentExecutionResult}
            isPlanReady={isPlanReady}
            isActionBusy={isInputLocked}
            isBackgroundRefreshing={isBackgroundRefreshing}
            onAgentPromptChange={(nextPrompt) => {
              setAgentPromptText(nextPrompt);
              setAgentPlan(null);
              setAgentExecutionResult(null);
            }}
            onPreviewAgentPlan={previewAgentPlan}
            onRunAgentPlan={runAgentPlan}
          />
        ) : null}

        {activeView === "outputs" ? (
          <OutputsView
            activeWorkspace={activeOutputWorkspace}
            workspaceTabs={outputWorkspaceTabs}
            onWorkspaceChange={changeOutputWorkspace}
            bundle={bundle}
            outputSummary={outputSummary}
            isPlanReady={isPlanReady}
            isActionBusy={isInputLocked}
            isBackgroundRefreshing={isBackgroundRefreshing}
            onCopyText={copyText}
            excel={{
              excelSummary,
              complexitySummary,
              renderResult,
              isReportEligible,
              excelSupported: officeCapabilities.excelApiSupported,
              actionHint: excelActionHint,
              onBuildReport: buildWorkbookReport,
              onOpenReportSheet: () => {
                if (renderResult) {
                  void openGeneratedWorksheet(renderResult.reportSheetName, "Report sheet");
                }
              },
              onOpenDetailSheet: () => {
                if (renderResult) {
                  void openGeneratedWorksheet(renderResult.detailSheetName, "Detail sheet");
                }
              },
            }}
            webApp={{
              actionHint: appsScriptActionHint,
              googleConfig,
              googleToken,
              googleConnection,
              googleAuthState,
              isGoogleConfigured,
              isManagedClientId: isManagedGoogleClientId,
              googleSetupIssue,
              googleScopeState,
              appsScriptOptions,
              appsScriptResult,
              onGoogleConfigChange: setGoogleConfigState,
              onAppsScriptOptionsChange: updateAppsScriptOptions,
              onSaveGoogleSettings: saveCurrentGoogleSettings,
              onConnectGoogle: () => {
                void connectGoogleForOutputs();
              },
              onDisconnectGoogle: disconnectGoogle,
              onExportProject: (deployAsWebApp) => {
                void exportRealAppsScript(deployAsWebApp);
              },
              exportActionLabel: appsScriptPrimaryActionLabel,
              deployActionLabel: appsScriptDeployActionLabel,
            }}
            email={{
              actionHint: gmailActionHint,
              activeEmail,
              selectedAudience: selectedEmailAudience,
              emailRecipients,
              gmailDraftResult,
              hasRecipients,
              actionLabel: gmailPrimaryActionLabel,
              onAudienceChange: setSelectedEmailAudience,
              onRecipientsChange: setEmailRecipients,
              onCreateDraft: () => {
                void createRealGmailDraft();
              },
            }}
            slides={{
              html: slidePreviewHtml,
              markdown: bundle?.slidesBundle.markdown ?? "",
              json: bundle?.slidesBundle.json ?? "",
              title: bundle?.slidesBundle.title ?? "Slide Deck",
              powerPointDownloadUrl: slidePowerPointDownloadUrl,
              powerPointDownloadFilename: slidePowerPointDownloadFilename,
              slides: bundle?.slidesBundle.slides ?? [],
              templateName: activeSlideTemplate.name,
              templateDescription: activeSlideTemplate.description,
              templateAudienceLabel: activeSlideTemplate.audienceLabel,
              templateNarrativeStyle: activeSlideTemplate.narrativeStyle,
              templateVisualDirection: activeSlideTemplate.visualDirection,
              templateStorytellingDirective: activeSlideTemplate.storytellingDirective,
              templateSourcePrompt: selectedSavedSlideTemplate?.sourcePrompt ?? "",
              templatePromptHint: activeSlideTemplate.promptHint,
              templateOptions: slideTemplateOptions,
              selectedTemplateId: selectedSlideTemplateId,
              slideTemplatePrompt,
              pdfPreviewUrl: slidePdfPreviewUrl,
              canGenerateTemplate: canGenerateSlideTemplate,
              canDeleteSelectedTemplate: canDeleteSlideTemplate,
              onSelectedTemplateChange: setSelectedSlideTemplateId,
              onSlideTemplatePromptChange: setSlideTemplatePrompt,
              onGenerateTemplate: () => {
                void generateSlideTemplate();
              },
              onDeleteSelectedTemplate: removeSelectedSlideTemplate,
              onClearPdfPreview: clearSlidePdfPreview,
              onOpenHtmlPreview: () => {
                if (slidePreviewHtml) {
                  openHtmlArtifact(slidePreviewHtml, "slide deck preview");
                }
              },
              onDownloadPowerPoint: () => {
                void downloadSlideDeckPowerPoint();
              },
              onOpenPdfPreview: () => {
                void openSlidePdfPreview();
              },
              onDownloadPdf: () => {
                void downloadSlidePdf();
              },
              onDownloadHtml: () => {
                if (slidePreviewHtml) {
                  downloadTextArtifact(
                    sanitizeFilename(bundle?.slidesBundle.title ?? "Slide Deck", "html"),
                    slidePreviewHtml,
                    "text/html;charset=utf-8"
                  );
                }
              },
              onDownloadMarkdown: () => {
                if (bundle?.slidesBundle.markdown) {
                  downloadTextArtifact(
                    sanitizeFilename(bundle?.slidesBundle.title ?? "Slide Deck", "md"),
                    bundle.slidesBundle.markdown
                  );
                }
              },
              onDownloadJson: () => {
                if (bundle?.slidesBundle.json) {
                  downloadTextArtifact(
                    sanitizeFilename(bundle?.slidesBundle.title ?? "Slide Deck", "json"),
                    bundle.slidesBundle.json,
                    "application/json;charset=utf-8"
                  );
                }
              },
              onCopyMarkdown: () =>
                copyText(bundle?.slidesBundle.markdown ?? "", "Slide outline markdown"),
            }}
            canvas={
              isCanvasStudioEnabled
                ? {
                    isGenerating: isCanvasGenerating,
                    canvasPrompt,
                    canvasTemplateName,
                    selectedTemplateId: selectedCanvasTemplateId,
                    selectedPresetId: selectedCanvasPresetId,
                    effectiveBrief: effectiveCanvasPrompt,
                    effectiveBriefSource: effectiveCanvasPromptSource,
                    businessContext: businessContext.trim(),
                    presetOptions: canvasPresetOptions,
                    savedTemplates: canvasTemplates.map((template) => ({
                      id: template.id,
                      name: template.name,
                      presetId: template.presetId,
                      styleName: template.designIntent?.styleName ?? template.designSpec?.styleName,
                    })),
                    result: canvasResult,
                    designSpec: canvasDesignSpec,
                    canvasDocument: canvasDocumentDraft,
                    comparisonDocument: selectedCanvasSnapshot?.document ?? null,
                    canvasLayoutIssues,
                    previewMode: canvasPreviewMode,
                    reportPreviewHtml: canvasHtmlReportPreview,
                    emailPreviewHtml: canvasEmailPreview,
                    slidesPreviewHtml: canvasSlidesPreview,
                    autosaveStatus: canvasAutosaveStatus,
                    recoveredDraftAt: canvasRecoveredDraftAt,
                    snapshots: canvasSnapshots,
                    selectedSnapshotId: selectedCanvasSnapshotId,
                    snapshotComparison: canvasSnapshotComparison,
                    snapshotDetails: canvasSnapshotDetails,
                    onCanvasPromptChange: setCanvasPrompt,
                    onCanvasTemplateNameChange: setCanvasTemplateName,
                    onSelectedTemplateChange: setSelectedCanvasTemplateId,
                    onPresetChange: (presetId: string) => {
                      setSelectedCanvasPresetId(presetId);
                      if (!canvasTemplateName.trim()) {
                        const preset = REPORTING_PRESETS.find((entry) => entry.id === presetId);
                        if (preset) {
                          setCanvasTemplateName(preset.label);
                        }
                      }
                    },
                    onSaveTemplate: saveCurrentCanvasTemplate,
                    onApplyTemplate: applySelectedCanvasTemplate,
                    onDeleteTemplate: removeSelectedCanvasTemplate,
                    onGenerate: () => {
                      void generateCanvasPack();
                    },
                    onGenerateVariation: generateCanvasVariation,
                    onCanvasAiCoEdit: coEditCanvasWithAi,
                    onPreviewChange: setCanvasPreviewMode,
                    onCanvasLayoutModeChange: setCanvasLayoutMode,
                    onAddCanvasBlock: addCanvasBlock,
                    onUpdateCanvasBlock: updateCanvasBlock,
                    onSetCanvasBlockFrame: setCanvasBlockFrame,
                    onNudgeCanvasBlock: nudgeCanvasBlock,
                    onRemoveCanvasBlock: removeCanvasBlock,
                    onReplaceCanvasDocument: replaceCanvasDocument,
                    onCheckpointCanvasHistory: checkpointCanvasEdit,
                    onUndoCanvas: undoCanvasEdit,
                    onRedoCanvas: redoCanvasEdit,
                    canUndoCanvas: canvasHistory.undoStack.length > 0,
                    canRedoCanvas: canvasHistory.redoStack.length > 0,
                    onResetCanvasLayout: resetCanvasLayoutToAi,
                    onSaveCanvasSnapshot: saveCanvasSnapshotManually,
                    onRestoreCanvasSnapshot: restoreCanvasSnapshot,
                    onDeleteCanvasSnapshot: deleteCanvasSnapshotById,
                    onSelectedCanvasSnapshotChange: setSelectedCanvasSnapshotId,
                    onDiscardRecoveredDraft: discardRecoveredCanvasDraft,
                    onDownloadArtifact: (artifactId: string) => {
                      const artifact = canvasResult?.artifacts.find(
                        (entry) => entry.id === artifactId
                      );
                      if (artifact) {
                        downloadCanvasArtifact(artifact);
                      }
                    },
                    onCopyArtifactText: (label: string, text: string) => copyText(text, label),
                  }
                : undefined
            }
          />
        ) : null}

        {activeView === "activity" ? (
          <SectionCard
            id="activity-log"
            title="Recent Activity"
            description="Review recent actions, outcomes, and the current workflow state."
          >
            {activityHistory.length > 0 ? (
              <div className="rf-checklist">
                {activityHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className={`rf-step ${entry.status === "success" ? "is-done" : ""}`}
                  >
                    <div className="rf-step__header">
                      <span className="rf-step__number">
                        {entry.status === "success"
                          ? "OK"
                          : entry.status === "error"
                            ? "!"
                            : entry.status === "warning"
                              ? "?"
                              : "i"}
                      </span>
                      <div>
                        <h3>{entry.title}</h3>
                        <p>{entry.detail}</p>
                        <p className="rf-note">
                          {new Date(entry.occurredAt).toLocaleString()} • {entry.area}
                          {entry.operationId ? ` • ${entry.operationId}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="rf-step__footer">
                      <StatusPill
                        label={entry.status}
                        tone={
                          entry.status === "success"
                            ? "success"
                            : entry.status === "warning" || entry.status === "error"
                              ? "warning"
                              : "neutral"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rf-panel rf-panel--soft">
                <h3>No Activity Yet</h3>
                <p className="rf-muted">
                  Run an analysis or output action and the recent execution history will appear
                  here.
                </p>
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeView === "activity" ? (
          <SectionCard
            id="support"
            title="Support"
            description="Export a lightweight diagnostics bundle for incident review and client support."
            actions={
              <div className="rf-inline-actions">
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => copyText(getDiagnosticsPayload(), "Diagnostics bundle")}
                >
                  Copy Diagnostics
                </button>
                <button type="button" className="rf-button" onClick={downloadDiagnosticsBundle}>
                  Download Diagnostics
                </button>
              </div>
            }
          >
            <div className="rf-grid rf-grid--two">
              <div className="rf-panel">
                <h3>Runtime State</h3>
                <ul className="rf-list">
                  <li>Workflow phase: {workflowFreshness.phase}</li>
                  <li>Plan ready: {workflowFreshness.planReady ? "Yes" : "No"}</li>
                  <li>Persistence degraded: {persistenceStatus.degraded ? "Yes" : "No"}</li>
                  <li>Google state: {googleConnection.label}</li>
                  <li>Last operation ID: {lastOperationId ?? "None"}</li>
                </ul>
              </div>
              <div className="rf-panel">
                <h3>Recent Diagnostics</h3>
                {diagnostics.length > 0 ? (
                  <ul className="rf-list">
                    {diagnostics.slice(0, 5).map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.area}</strong>: {entry.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rf-muted">No diagnostic events recorded in this session.</p>
                )}
              </div>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
