import { LlmProviderConfig, PersistenceStatus, ReportTheme } from "./types";

export const REPORT_THEMES: ReportTheme[] = [
  {
    accent: "#0f766e",
    surface: "#f4fbfa",
    border: "#b7e4df",
    ink: "#153b3f",
    muted: "#5e7d81",
  },
  {
    accent: "#b45309",
    surface: "#fff8ef",
    border: "#f4d7b2",
    ink: "#4a2800",
    muted: "#8a6130",
  },
  {
    accent: "#1d4ed8",
    surface: "#f5f9ff",
    border: "#c2d4fb",
    ink: "#16325c",
    muted: "#5f77a6",
  },
];

export const DEFAULT_SUMMARY_ROWS = 12;
export const DEFAULT_SLIDE_COUNT = 5;
export const MAX_GAS_DATA_ROWS = 200;
export const MAX_CHART_POINTS = 8;
export const DIAGNOSTICS_MAX_ENTRIES = 80;
export const ACTIVITY_HISTORY_MAX_ENTRIES = 25;

export const EXCEL_SELECTION_GUARDRAILS = {
  safeMaxRows: 2000,
  safeMaxColumns: 30,
  safeMaxCells: 40000,
  confirmMaxRows: 5000,
  confirmMaxColumns: 50,
  confirmMaxCells: 100000,
} as const;

export const EXCEL_RENDER_GUARDRAILS = {
  maxRows: 5000,
  maxColumns: 50,
  maxCells: 100000,
  detailAutofitCellLimit: 15000,
  reportAutofitCellLimit: 20000,
  chartCellLimit: 20000,
  maxCharts: 2,
  numberFormatCellLimit: 25000,
} as const;

export const GOOGLE_HTTP_TIMEOUT_MS = 20000;
export const GOOGLE_OAUTH_TIMEOUT_MS = 60000;
export const GOOGLE_TOKEN_EXPIRY_SKEW_MS = 60000;

export const DEFAULT_LLM_PROVIDER_CONFIG: LlmProviderConfig = {
  enabled: false,
  providerLabel: "OpenAI-Compatible Gateway",
  endpoint: "https://api.openai.com/v1/chat/completions",
  model: "gpt-4.1-mini",
  apiKeyHeader: "Authorization",
  apiKeyPrefix: "Bearer",
  organization: "",
  temperature: 0.3,
};

export const DEFAULT_PERSISTENCE_STATUS: PersistenceStatus = {
  localAvailable: true,
  sessionAvailable: true,
  degraded: false,
  messages: [],
};

export const STORAGE_KEYS = {
  templates: "reportforge.templates.v1",
  slideTemplates: "reportforge.slide-templates.v1",
  canvasTemplates: "reportforge.canvas-templates.v1",
  canvasStudioDraft: "reportforge.canvas-studio.draft.v1",
  canvasStudioSnapshots: "reportforge.canvas-studio.snapshots.v1",
  googleConfig: "reportforge.google.config.v1",
  googleToken: "reportforge.google.token.session.v1",
  googleAuthState: "reportforge.google.auth-state.session.v1",
  llmConfig: "reportforge.llm.config.v1",
  llmApiKey: "reportforge.llm.api-key.session.v1",
  activityHistory: "reportforge.activity.session.v1",
  taskpaneView: "reportforge.taskpane.view.v1",
  planWorkspace: "reportforge.plan-workspace.view.v1",
  outputWorkspace: "reportforge.output-workspace.view.v1",
} as const;

export const GOOGLE_SCOPES = {
  gmailCompose: "https://www.googleapis.com/auth/gmail.compose",
  scriptProjects: "https://www.googleapis.com/auth/script.projects",
  scriptDeployments: "https://www.googleapis.com/auth/script.deployments",
} as const;
