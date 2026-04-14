export { generateReport } from "./orchestrator/generateReport";
export { applyReportingPreset, REPORTING_PRESETS } from "./templates/reportingPresets";
export type {
  AnalyticalFinding,
  DatasetSemanticProfile,
  GenerationLogEntry,
  GenerationStatus,
  NarrativeBlock,
  NormalizedReportRequest,
  RenderArtifact,
  ReportAudience,
  ReportFormat,
  ReportObjective,
  ReportPlan,
  ReportRequest,
  ReportResult,
  ReportSection,
  StorylineStep,
  StructuredDatasetInput,
  ValidationIssue,
  ValidationResult,
  VisualSpec,
} from "./domain/types";
export { designIntentFromSpec } from "./agents/designAgent";
