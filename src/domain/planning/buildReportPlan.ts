import { DEFAULT_SUMMARY_ROWS, REPORT_THEMES } from "../../shared/constants";
import {
  DatasetProfile,
  ExcelReportPlan,
  GenerationOptions,
  PromptInterpretation,
  RangeSnapshot,
  ReportBrief,
  ReportPlan,
  SectionId,
} from "../../shared/types";
import { truncate } from "../../utils/formatting";
import { analyzeReportNarrative } from "./analyzeReportNarrative";

export function buildReportPlan(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  options: GenerationOptions,
  briefOverrides: Partial<ReportBrief> = {}
): ReportPlan {
  const variationId = Math.abs(options.variationSeed) % REPORT_THEMES.length;
  const theme = REPORT_THEMES[variationId];
  const narrative = analyzeReportNarrative(snapshot, profile, prompt, briefOverrides);
  const summaryParagraphs = narrative.executiveSummary;
  const reportTableHeaders = profile.headers;
  const reportTableRows = buildPreviewRows(snapshot, profile.hasHeaders);

  const excel: ExcelReportPlan = {
    reportSheetName: `RF Report ${variationId + 1}`,
    detailSheetName: `RF Data ${variationId + 1}`,
    layoutMode: options.mode,
    variationId,
    sectionOrder: buildSectionOrder(prompt, variationId),
    summaryParagraphs,
    kpis: profile.kpis,
    charts: profile.chartCandidates,
    reportTableHeaders,
    reportTableRows,
    theme,
  };

  return {
    title: narrative.title,
    subtitle: narrative.subtitle,
    businessContext: prompt.businessContext.trim() || undefined,
    narrativeSummary: narrative.narrativeSummary,
    executiveSummary: narrative.executiveSummary,
    confidenceCaveat: narrative.confidenceCaveat,
    findings: narrative.findings,
    recommendations: narrative.recommendations,
    brief: narrative.brief,
    storyPages: narrative.storyPages,
    excel,
  };
}

function buildSectionOrder(prompt: PromptInterpretation, variationId: number): SectionId[] {
  if (prompt.excelLayoutHint === "summary-first") {
    return ["hero", "summary", "kpis", "charts", "detailTable", "recommendations"];
  }

  if (prompt.excelLayoutHint === "kpis-top") {
    return ["hero", "kpis", "summary", "charts", "detailTable", "recommendations"];
  }

  return variationId % 2 === 0
    ? ["hero", "kpis", "charts", "summary", "detailTable", "recommendations"]
    : ["hero", "summary", "kpis", "charts", "recommendations", "detailTable"];
}

function buildPreviewRows(snapshot: RangeSnapshot, hasHeaders: boolean): string[][] {
  const startRow = hasHeaders ? 1 : 0;
  return snapshot.text
    .slice(startRow, startRow + DEFAULT_SUMMARY_ROWS)
    .map((row) =>
      Array.from({ length: snapshot.columnCount }, (_, columnIndex) =>
        truncate(String(row[columnIndex] ?? ""), 32)
      )
    );
}
