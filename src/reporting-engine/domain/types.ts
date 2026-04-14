/* eslint-disable no-undef */

import {
  CanvasDesignIntent,
  CanvasDocument,
  ChartKind,
  DatasetProfile,
  GeneratedGasProject,
  GeneratedSlidesBundle,
  LlmProviderConfig,
  LlmSessionSecret,
  PrimitiveCellValue,
  ReportDesignSpec,
  ReportBrief,
  RangeSnapshot,
  ReportForgeBundle,
  ReportMode,
  ReportPlan as CoreReportPlan,
  StoryPagePlan,
} from "../../shared/types";

export type ReportAudience =
  | "general"
  | "ceo"
  | "cfo"
  | "board"
  | "client"
  | "investor"
  | "project-team"
  | "operations";

export type ReportObjective =
  | "convince"
  | "inform"
  | "summarize"
  | "alert"
  | "recommend"
  | "sell"
  | "prepare-meeting";

export type ReportTone = "neutral" | "executive" | "formal" | "analytical" | "consultative";

export type ReportFormat =
  | "html"
  | "pptx"
  | "pdf"
  | "slides-json"
  | "email-html"
  | "gas-project"
  | "excel-plan";

export type ArtifactStatus = "ready" | "skipped" | "error";
export type GenerationStatus = "success" | "partial" | "failed";
export type NarrativeBlockKind =
  | "headline"
  | "summary"
  | "insight"
  | "recommendation"
  | "speaker-note"
  | "limitation";
export type NarrativeSource = "data" | "llm" | "hybrid";
export type VisualKind = ChartKind | "scorecard" | "table" | "timeline" | "heatmap";
export type EngineLogLevel = "info" | "warning" | "error";
export type FindingKind =
  | "trend"
  | "variance"
  | "segment"
  | "concentration"
  | "kpi"
  | "quality"
  | "risk";
export type ValidationSeverity = "critical" | "warning";
export type NarrativeQualityCode =
  | "generic-title"
  | "instruction-leak"
  | "repetition"
  | "weak-insight"
  | "unsupported-trend"
  | "speaker-note-heavier-than-body"
  | "placeholder";

export interface StructuredDatasetInput {
  sourceLabel: string;
  headers: string[];
  rows: PrimitiveCellValue[][];
  workbookName?: string;
  sheetName?: string;
  capturedAt?: string;
}

export type ReportSourceInput =
  | { kind: "snapshot"; snapshot: RangeSnapshot }
  | { kind: "dataset"; dataset: StructuredDatasetInput }
  | { kind: "bundle"; bundle: ReportForgeBundle };

export interface ReportRequest {
  source: ReportSourceInput;
  context: {
    prompt?: string;
    businessContext?: string;
    brief?: Partial<ReportBrief>;
    audience?: ReportAudience;
    objective?: ReportObjective;
    tone?: ReportTone;
    language?: string;
    preferredFormats?: ReportFormat[];
    maxSlides?: number;
    reportType?: string;
  };
  options?: {
    mode?: ReportMode;
    variationSeed?: number;
    maxRows?: number;
    adminOnly?: boolean;
    enableLlm?: boolean;
    llmConfig?: LlmProviderConfig;
    llmSecret?: LlmSessionSecret;
    designIntent?: CanvasDesignIntent;
    canvasDocument?: CanvasDocument;
    designSpec?: ReportDesignSpec;
    requestId?: string;
  };
}

export interface NarrativeBlock {
  id: string;
  kind: NarrativeBlockKind;
  text: string;
  source: NarrativeSource;
}

export interface VisualSpec {
  id: string;
  title: string;
  kind: VisualKind;
  rationale: string;
  emphasis: string;
  sourceChartId?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  purpose: string;
  narrativeBlocks: NarrativeBlock[];
  visuals: VisualSpec[];
  callToAction?: string;
  limitations?: string[];
}

export interface ReportPlan {
  title: string;
  subtitle: string;
  audience: ReportAudience;
  objective: ReportObjective;
  tone: ReportTone;
  primaryMessage: string;
  recommendedFormats: ReportFormat[];
  sections: ReportSection[];
  brief: ReportBrief;
  storyPages: StoryPagePlan[];
  limitations: string[];
  confidenceStatement: string;
}

export interface RenderArtifact {
  id: string;
  format: ReportFormat;
  label: string;
  summary: string;
  status: ArtifactStatus;
  mimeType?: string;
  filename?: string;
  textContent?: string;
  binaryContent?: Uint8Array | Blob;
  jsonContent?: unknown;
  error?: string;
}

export interface GenerationLogEntry {
  level: EngineLogLevel;
  step: string;
  message: string;
  timestamp: string;
}

export interface NormalizedReportRequest {
  sourceSnapshot: RangeSnapshot;
  existingBundle: ReportForgeBundle | null;
  profile: DatasetProfile | null;
  promptText: string;
  businessContext: string;
  brief?: Partial<ReportBrief>;
  audience: ReportAudience;
  objective: ReportObjective;
  tone: ReportTone;
  language: string;
  preferredFormats: ReportFormat[];
  maxSlides: number;
  mode: ReportMode;
  variationSeed: number;
  enableLlm: boolean;
  llmConfig?: LlmProviderConfig;
  llmSecret?: LlmSessionSecret;
  designIntent?: CanvasDesignIntent;
  canvasDocument?: CanvasDocument;
  designSpec?: ReportDesignSpec;
  requestId: string;
}

export interface DatasetSemanticProfile {
  sourceLabel: string;
  enterpriseLens: "general" | "finance" | "banking" | "insurance" | "risk" | "client";
  timeDimension: string | null;
  metricColumns: string[];
  dimensionColumns: string[];
  identifierColumns: string[];
  comparisonModes: string[];
  notes: string[];
}

export interface AnalyticalFinding {
  id: string;
  kind: FindingKind;
  title: string;
  summary: string;
  implication: string;
  recommendation?: string;
  evidencePoints: string[];
  sourceMetrics: string[];
  sourceChartId?: string;
  priority: number;
}

export interface StorylineStep {
  id: string;
  title: string;
  purpose: string;
  message: string;
  findingIds: string[];
  recommendedVisual: string;
}

export interface ValidationIssue {
  code: NarrativeQualityCode;
  severity: ValidationSeverity;
  message: string;
  slideIndex?: number;
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
}

export interface ReportResult {
  status: GenerationStatus;
  request: NormalizedReportRequest;
  bundle: ReportForgeBundle;
  corePlan: CoreReportPlan;
  reportPlan: ReportPlan;
  designSpec: ReportDesignSpec;
  canvasDocument: CanvasDocument;
  semanticProfile: DatasetSemanticProfile;
  analyticalFindings: AnalyticalFinding[];
  storyline: StorylineStep[];
  validation: ValidationResult;
  slidesBundle: GeneratedSlidesBundle;
  gasProject: GeneratedGasProject;
  artifacts: RenderArtifact[];
  logs: GenerationLogEntry[];
  featureFlagEnabled: boolean;
  usedLlm: boolean;
}
