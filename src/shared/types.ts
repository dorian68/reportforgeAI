export type PrimitiveCellValue = string | number | boolean | null;

export type ColumnKind = "numeric" | "date" | "categorical" | "text" | "mixed" | "empty";
export type ColumnRole = "measure" | "dimension" | "identifier" | "unknown";
export type ReportMode = "automatic" | "prompt-guided" | "variation";
export type Audience =
  | "general"
  | "executive"
  | "board"
  | "cfo"
  | "operations"
  | "management"
  | "analyst"
  | "client"
  | "risk"
  | "insurance"
  | "banking";
export type Tone = "neutral" | "formal" | "concise" | "direct";
export type ReportStyle = "auto" | "executive-monthly" | "board-summary" | "dashboard" | "simple";
export type SectionId = "hero" | "summary" | "kpis" | "charts" | "detailTable" | "recommendations";
export type ChartKind = "column" | "line" | "doughnut";
export type AppsScriptWebAppAccess = "MYSELF" | "DOMAIN" | "ANYONE";
export type AppsScriptExecuteAs = "USER_ACCESSING" | "USER_DEPLOYING";
export type AgentActionKind =
  | "structure-source-table"
  | "format-source-range"
  | "freeze-source-header"
  | "generate-workbook-report";
export type AgentImpactScope = "selection" | "worksheet" | "new-sheets";
export type WorkflowPhase = "idle" | "analyzing" | "planning" | "enhancing-ai" | "ready" | "error";
export type SelectionPolicyDecision = "allow" | "confirm" | "block";
export type GoogleConnectionStatus =
  | "disconnected"
  | "configured"
  | "connected"
  | "expired"
  | "invalid";
export type GoogleOAuthRuntimeStatus = "idle" | "connecting" | "connected" | "error";
export type DiagnosticLevel = "info" | "warning" | "error";

export interface RangeSnapshot {
  address: string;
  sheetName: string;
  workbookName?: string;
  startRowIndex?: number;
  startColumnIndex?: number;
  rowCount: number;
  columnCount: number;
  values: PrimitiveCellValue[][];
  text: string[][];
  numberFormats: string[][];
  capturedAt: string;
}

export interface RangeSelectionPreflight {
  address: string;
  sheetName: string;
  startRowIndex: number;
  startColumnIndex: number;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  decision: SelectionPolicyDecision;
  messages: string[];
}

export interface NumericSummary {
  min: number;
  max: number;
  sum: number;
  average: number;
}

export interface DateSummary {
  minIso: string;
  maxIso: string;
}

export interface ColumnProfile {
  index: number;
  key: string;
  header: string;
  kind: ColumnKind;
  role: ColumnRole;
  nonEmptyCount: number;
  emptyCount: number;
  uniqueCount: number;
  completeness: number;
  sampleValues: string[];
  numericSummary?: NumericSummary;
  dateSummary?: DateSummary;
}

export interface KpiRecommendation {
  id: string;
  label: string;
  columnKey?: string;
  aggregation: "sum" | "average" | "count";
  rawValue: number;
  formattedValue: string;
  insight: string;
}

export interface ChartPlan {
  id: string;
  title: string;
  kind: ChartKind;
  categoryLabel: string;
  valueLabel: string;
  categories: string[];
  values: number[];
  insight: string;
}

export interface DatasetProfile {
  sourceLabel: string;
  hasHeaders: boolean;
  rowCount: number;
  columnCount: number;
  dataRowCount: number;
  emptyCellCount: number;
  completeness: number;
  datasetShape: "tabular" | "wide" | "sparse" | "compact";
  headers: string[];
  columns: ColumnProfile[];
  primaryMeasures: string[];
  primaryDimensions: string[];
  kpis: KpiRecommendation[];
  chartCandidates: ChartPlan[];
  notes: string[];
}

export interface PromptInterpretation {
  rawPrompt: string;
  businessContext: string;
  audience: Audience;
  tone: Tone;
  reportStyle: ReportStyle;
  desiredOutputs: {
    excel: boolean;
    gas: boolean;
    email: boolean;
    slides: boolean;
  };
  slideCount: number;
  excelLayoutHint: "kpis-top" | "summary-first" | "balanced";
  webAppStyle: "simple-dashboard" | "board-dashboard" | "compact-dashboard";
  mode: ReportMode;
  emphasizesCharts: boolean;
  emphasizesNarrative: boolean;
  keywords: string[];
}

export type ReportBriefOutputStyle =
  | "board-deck"
  | "executive-dashboard"
  | "operational-dashboard"
  | "analytical-deep-dive"
  | "client-story"
  | "finance-review"
  | "sales-review"
  | "investor-update"
  | "general-review";
export type ReportBriefTone = "executive" | "analytical" | "formal" | "consultative" | "neutral";
export type ReportVisualDensity = "light" | "balanced" | "dense";
export type StoryPagePurpose =
  | "executive-summary"
  | "kpi-scorecard"
  | "trend-analysis"
  | "driver-analysis"
  | "segment-comparison"
  | "product-mix"
  | "geography"
  | "customer-channel-mix"
  | "anomaly"
  | "recommendation"
  | "methodology";
export type StoryLayoutFamily =
  | "hero-metrics"
  | "scorecard-grid"
  | "trend-focus"
  | "comparison-grid"
  | "mix-dashboard"
  | "exception-focus"
  | "action-checklist"
  | "detail-table";
export type StoryVisualKind =
  | "kpi-strip"
  | "line"
  | "area"
  | "bar"
  | "stacked-bar"
  | "donut"
  | "table"
  | "map"
  | "highlight";

export interface ReportBrief {
  reportType: string;
  outputStyle: ReportBriefOutputStyle;
  audience: Audience;
  businessGoal: string;
  keyDecision: string;
  titleHint: string;
  themeHint?: string;
  datasetSummary: string;
  timeDimension?: string;
  measureCandidates: string[];
  segmentDimensions: string[];
  geographicDimensions: string[];
  targetOrBenchmark?: string;
  importantQuestions: string[];
  focusAreas: string[];
  preferredKpis: string[];
  requiredVisuals: string[];
  bannedVisuals: string[];
  tone: ReportBriefTone;
  visualDensity: ReportVisualDensity;
  desiredOutputs: {
    excel: boolean;
    gas: boolean;
    email: boolean;
    slides: boolean;
  };
  brandHints: string[];
  constraints: string[];
  assumptions: string[];
  missingRequired: string[];
  missingOptional: string[];
  intakeComplete: boolean;
  generateNow: boolean;
  userNotes: string[];
  conversationSummary?: string;
}

export interface StoryPagePlan {
  id: string;
  title: string;
  subtitle: string;
  purpose: StoryPagePurpose;
  distinctJob: string;
  storyBeat: string;
  layoutFamily: StoryLayoutFamily;
  visualKind: StoryVisualKind;
  visualTitle: string;
  visualRationale: string;
  narrativeAngle: string;
  metricLabels: string[];
  chartId?: string;
  dimensionKey?: string;
  headlineMetricLabel?: string;
  evidence: string[];
  implication?: string;
  recommendation?: string;
  callToAction?: string;
}

export interface StoryPlanValidationIssue {
  code:
    | "duplicate-purpose"
    | "duplicate-layout"
    | "repeated-kpis"
    | "similar-title"
    | "missing-action";
  severity: "warning" | "critical";
  message: string;
  pageId?: string;
}

export interface ReportConversationTurn {
  role: "assistant" | "user";
  text: string;
  timestamp: string;
}

export interface ReportIntakeState {
  brief: ReportBrief;
  turns: ReportConversationTurn[];
  summary: string;
  nextPrompt: string;
  assumptions: string[];
  missingRequired: string[];
  missingOptional: string[];
  intakeComplete: boolean;
}

export interface GenerationOptions {
  mode: ReportMode;
  variationSeed: number;
}

export interface ReportTheme {
  accent: string;
  surface: string;
  border: string;
  ink: string;
  muted: string;
}

export interface ReportFinding {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  evidencePoints: string[];
  chartCaption: string;
  implication: string;
  recommendation?: string;
  confidenceCaveat?: string;
  sourceMetrics: string[];
  sourceChartId?: string;
}

export interface ExcelReportPlan {
  reportSheetName: string;
  detailSheetName: string;
  layoutMode: ReportMode;
  variationId: number;
  sectionOrder: SectionId[];
  summaryParagraphs: string[];
  kpis: KpiRecommendation[];
  charts: ChartPlan[];
  reportTableHeaders: string[];
  reportTableRows: string[][];
  theme: ReportTheme;
}

export interface ReportPlan {
  title: string;
  subtitle: string;
  businessContext?: string;
  narrativeSummary: string;
  executiveSummary?: string[];
  confidenceCaveat?: string;
  findings?: ReportFinding[];
  recommendations: string[];
  brief: ReportBrief;
  storyPages: StoryPagePlan[];
  excel: ExcelReportPlan;
}

export interface GeneratedTextFile {
  filename: string;
  language: string;
  content: string;
}

export interface GeneratedGasProject {
  title: string;
  summary: string;
  files: GeneratedTextFile[];
  deploymentSteps: string[];
}

export interface EmailDraft {
  audience: Audience;
  subject: string;
  plainText: string;
  html: string;
}

export interface GeneratedEmailBundle {
  primary: EmailDraft;
  variants: EmailDraft[];
  futureIntegrationNotes: string[];
}

export type SlideVisualKind = "scorecard" | "bar" | "line";

export interface SlideHeadlineMetric {
  label: string;
  value: string;
  detail: string;
}

export interface SlideVisualPoint {
  label: string;
  value: number;
  formattedValue: string;
  note: string;
}

export interface SlideVisualSpec {
  kind: SlideVisualKind;
  title: string;
  subtitle: string;
  emphasis: string;
  points: SlideVisualPoint[];
}

export interface SlideOutline {
  index: number;
  title: string;
  subtitle?: string;
  storyBeat: string;
  purpose?: StoryPagePurpose;
  layoutFamily?: StoryLayoutFamily;
  narrativeLabel?: string;
  visualLabel?: string;
  bullets: string[];
  evidencePoints?: string[];
  takeaway: string;
  chartSuggestion: string;
  chartCaption?: string;
  implication?: string;
  recommendation?: string;
  speakerNotes: string;
  confidenceCaveat?: string;
  sourceMetrics?: string[];
  headlineMetric?: SlideHeadlineMetric;
  visual?: SlideVisualSpec | null;
}

export type SlideTemplateHeroStyle = "ribbon" | "spotlight" | "minimal";
export type SlideTemplateContentLayout = "balanced" | "insight" | "stacked";
export type SlideTemplateCardStyle = "soft" | "outlined" | "solid";

export interface SlideTemplateDefinition {
  id: string;
  name: string;
  description: string;
  audienceLabel: string;
  narrativeStyle: string;
  visualDirection: string;
  storytellingDirective: string;
  fontFamily: string;
  accent: string;
  surface: string;
  border: string;
  ink: string;
  muted: string;
  heroStyle: SlideTemplateHeroStyle;
  contentLayout: SlideTemplateContentLayout;
  cardStyle: SlideTemplateCardStyle;
  promptHint: string;
}

export interface SavedSlideTemplate extends SlideTemplateDefinition {
  createdAt: string;
  updatedAt: string;
  sourcePrompt: string;
}

export type CanvasFormatTarget =
  | "canvas"
  | "html"
  | "pptx"
  | "pdf"
  | "email-html"
  | "gas-project"
  | "excel-plan";

export type CanvasLayoutMode = "structured" | "freeform";
export type CanvasNarrativeDensity = "compact" | "balanced" | "dense";
export type CanvasGuideAxis = "x" | "y";
export type CanvasGuideKind = "safe-margin" | "manual" | "smart";
export type CanvasSnapRuleKind = "grid" | "blocks" | "guides" | "safe-margin";
export type CanvasStyleTokenKind =
  | "color"
  | "spacing"
  | "typography"
  | "border"
  | "shadow"
  | "radius";
export type CanvasVisualProminence = "primary" | "secondary" | "support";
export type CanvasComponentKind =
  | "hero"
  | "summary"
  | "kpi-strip"
  | "chart-panel"
  | "narrative-panel"
  | "table"
  | "recommendations"
  | "callout"
  | "email-summary";
export type CanvasBlockEmphasis = "high" | "medium" | "low";
export type CanvasSpacingMode = "tight" | "balanced" | "airy";
export type CanvasVisualEmphasis = "kpi-first" | "narrative-first" | "visual-first";

export interface CanvasRendererHint {
  columns: number;
  spacing: CanvasSpacingMode;
  emphasis: CanvasVisualEmphasis;
}

export interface CanvasBlockFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasGuide {
  id: string;
  axis: CanvasGuideAxis;
  position: number;
  kind: CanvasGuideKind;
  label?: string;
}

export interface CanvasSnapRule {
  id: string;
  kind: CanvasSnapRuleKind;
  enabled: boolean;
  tolerance: number;
}

export interface CanvasStyleToken {
  id: string;
  label: string;
  kind: CanvasStyleTokenKind;
  value: string;
}

export interface CanvasTheme {
  id: string;
  name: string;
  brandingTokens?: Record<string, string>;
  styleTokens: CanvasStyleToken[];
}

export interface CanvasComponentPreset {
  id: string;
  kind: CanvasComponentKind;
  label: string;
  description: string;
  defaultFrame: CanvasBlockFrame;
  defaultFormats: CanvasFormatTarget[];
}

export interface CanvasLayer {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
}

export interface CanvasGroup {
  id: string;
  name: string;
  blockIds: string[];
}

export interface CanvasSafeMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CanvasBlockSpec {
  id: string;
  kind: CanvasComponentKind;
  title: string;
  body: string;
  supportingText?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  frame?: CanvasBlockFrame;
  priority: number;
  emphasis: CanvasBlockEmphasis;
  chartId?: string;
  findingIds?: string[];
  metricIds?: string[];
  formatTargets?: CanvasFormatTarget[];
  styleToken?: string;
  layerId?: string;
  groupId?: string;
  visible?: boolean;
  locked?: boolean;
  zIndex?: number;
  rotation?: number;
}

export interface CanvasPageSpec {
  id: string;
  label: string;
  format: CanvasFormatTarget;
  layoutMode: CanvasLayoutMode;
  narrativeDensity: CanvasNarrativeDensity;
  pageRhythm: string;
  canvasWidth?: number;
  canvasHeight?: number;
  gridColumns?: number;
  gridUnitHeight?: number;
  safeMargin?: CanvasSafeMargin;
  guides?: CanvasGuide[];
  snapRules?: CanvasSnapRule[];
  layers?: CanvasLayer[];
  groups?: CanvasGroup[];
  blocks: CanvasBlockSpec[];
}

export interface LayoutPlanPage {
  pageId: string;
  format: CanvasFormatTarget;
  summaryPlacement: string;
  primaryBlockIds: string[];
  supportingBlockIds: string[];
  density: CanvasNarrativeDensity;
}

export interface LayoutPlan {
  pages: LayoutPlanPage[];
  globalRules: string[];
}

export interface ComponentTreeNode {
  id: string;
  pageId: string;
  blockId: string;
  kind: CanvasComponentKind;
  priority: number;
  children?: string[];
}

export interface ComponentTree {
  rootIds: string[];
  nodes: Record<string, ComponentTreeNode>;
}

export interface VisualHierarchyItem {
  pageId: string;
  blockId: string;
  prominence: CanvasVisualProminence;
  reason: string;
}

export interface VisualHierarchy {
  pageIds: string[];
  items: VisualHierarchyItem[];
}

export interface CanvasDesignIntent {
  styleName: string;
  audienceBehavior: string;
  designTone: string;
  narrativeDensity: CanvasNarrativeDensity;
  pageRhythm: string;
  summaryPlacement: string;
  chartPreference: string;
  componentGrammar: CanvasComponentKind[];
  allowedComponents: CanvasComponentKind[];
  layoutRules: string[];
  titleStyle: string;
  annotationStyle: string;
  rendererHints: Partial<Record<CanvasFormatTarget, CanvasRendererHint>>;
  promptHint?: string;
}

export interface ReportDesignSpec extends CanvasDesignIntent {
  id: string;
  pages: CanvasPageSpec[];
  theme?: CanvasTheme;
  componentPresets?: CanvasComponentPreset[];
  layoutPlan?: LayoutPlan;
  componentTree?: ComponentTree;
  visualHierarchy?: VisualHierarchy;
  qualityConstraints?: string[];
  rationale: string[];
  variationSeed: number;
  generatedBy: "llm" | "deterministic" | "hybrid";
  sourcePrompt?: string;
}

export interface CanvasDocument {
  version: number;
  layoutMode: CanvasLayoutMode;
  designSpecId?: string;
  theme?: CanvasTheme;
  componentPresets?: CanvasComponentPreset[];
  pages: CanvasPageSpec[];
  updatedAt: string;
}

export interface CanvasDocumentSnapshot {
  id: string;
  label: string;
  createdAt: string;
  document: CanvasDocument;
  designSpecId?: string;
}

export interface CanvasStudioDraft {
  savedAt: string;
  promptText: string;
  templateName: string;
  presetId: string;
  businessContext?: string;
  reportBrief?: ReportBrief | null;
  previewMode: "report" | "email" | "slides";
  designIntent?: CanvasDesignIntent | null;
  designSpec?: ReportDesignSpec | null;
  canvasDocument?: CanvasDocument | null;
}

export interface SavedCanvasTemplate {
  id: string;
  name: string;
  presetId: string;
  promptText: string;
  businessContext?: string;
  variationSeed?: number;
  templateVersion?: number;
  recommendedPrompts?: string[];
  qualityConstraints?: string[];
  designIntent?: CanvasDesignIntent;
  designSpec?: ReportDesignSpec;
  canvasDocument?: CanvasDocument;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedSlidesBundle {
  title: string;
  slides: SlideOutline[];
  markdown: string;
  json: string;
  html: string;
  theme: ReportTheme;
}

export interface SavedTemplate {
  id: string;
  name: string;
  promptText: string;
  businessContext?: string;
  mode: ReportMode;
  variationSeed: number;
  emailTo: string;
  emailCc: string;
  emailBcc: string;
  appsScriptTitle: string;
  deploymentDescription: string;
  deployAsWebApp: boolean;
  appsScriptAccess?: AppsScriptWebAppAccess;
  appsScriptExecuteAs?: AppsScriptExecuteAs;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
}

export interface GoogleTokenRecord {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt: string;
}

export interface GoogleOAuthRuntimeState {
  status: GoogleOAuthRuntimeStatus;
  requestId: string | null;
  prompt: "" | "consent";
  requestedScopes: string[];
  grantedScopes: string[];
  startedAt: string | null;
  completedAt: string | null;
  lastError: string;
  lastErrorCode: string;
}

export interface GoogleSessionState {
  config: GoogleOAuthConfig;
  token: GoogleTokenRecord | null;
  auth: GoogleOAuthRuntimeState;
}

export interface GoogleConnectionState {
  status: GoogleConnectionStatus;
  label: string;
  requiresReconnect: boolean;
}

export interface GmailDraftRecipients {
  to: string;
  cc: string;
  bcc: string;
}

export interface GmailDraftResult {
  id: string;
  messageId?: string;
  encodedSize: number;
}

export interface AppsScriptDeploymentOptions {
  scriptTitle: string;
  deploymentDescription: string;
  deployAsWebApp: boolean;
  webAppAccess: AppsScriptWebAppAccess;
  executeAs: AppsScriptExecuteAs;
}

export interface AppsScriptProjectResult {
  scriptId: string;
  scriptTitle: string;
  scriptUrl: string;
  versionNumber?: number;
  deploymentId?: string;
  webAppUrl?: string;
}

export interface AiEnhancementMetadata {
  providerLabel: string;
  model: string;
  enhancedAt: string;
}

export interface ReportForgeBundle {
  snapshot: RangeSnapshot;
  profile: DatasetProfile;
  prompt: PromptInterpretation;
  plan: ReportPlan;
  gasProject: GeneratedGasProject;
  emailBundle: GeneratedEmailBundle;
  slidesBundle: GeneratedSlidesBundle;
  aiEnhancement?: AiEnhancementMetadata;
}

export interface LlmProviderConfig {
  enabled: boolean;
  providerLabel: string;
  endpoint: string;
  model: string;
  apiKeyHeader: string;
  apiKeyPrefix: string;
  organization?: string;
  temperature: number;
}

export interface LlmSessionSecret {
  apiKey: string;
}

export interface AgentPlanStep {
  id: string;
  kind: AgentActionKind;
  title: string;
  description: string;
  impact: AgentImpactScope;
}

export interface AgentPlan {
  title: string;
  summary: string;
  userPrompt: string;
  steps: AgentPlanStep[];
  warnings: string[];
  notes: string[];
}

export interface PersistenceStatus {
  localAvailable: boolean;
  sessionAvailable: boolean;
  degraded: boolean;
  messages: string[];
}

export interface OfficeCapabilityState {
  officeJsReady: boolean;
  excelHost: boolean;
  excelApiSupported: boolean;
  selectionRead: boolean;
  workbookTables: boolean;
  charts: boolean;
  freezePanes: boolean;
  clipboard: boolean;
}

export interface WorkflowFreshnessState {
  analysisRequestId: number;
  selectionVersion: number;
  activeGenerationId: number | null;
  readyGenerationId: number | null;
  phase: WorkflowPhase;
  selectionReady: boolean;
  analysisReady: boolean;
  planReady: boolean;
  reportEligible: boolean;
  selectionKey: string | null;
  promptSignature: string | null;
}

export interface ExcelRenderPolicy {
  allowRender: boolean;
  useDetailTable: boolean;
  freezeHeader: boolean;
  applyDetailAutofit: boolean;
  applyReportAutofit: boolean;
  maxCharts: number;
  notes: string[];
}

export interface DiagnosticEntry {
  id: string;
  timestamp: string;
  level: DiagnosticLevel;
  area: string;
  message: string;
  details?: string;
}
