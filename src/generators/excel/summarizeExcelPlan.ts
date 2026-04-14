import { ReportPlan } from "../../shared/types";

export interface ExcelPlanSummary {
  sheetCount: number;
  chartCount: number;
  kpiCount: number;
  sectionOrder: string[];
}

export function summarizeExcelPlan(plan: ReportPlan): ExcelPlanSummary {
  return {
    sheetCount: 3,
    chartCount: plan.excel.charts.length,
    kpiCount: plan.excel.kpis.length,
    sectionOrder: plan.excel.sectionOrder,
  };
}
