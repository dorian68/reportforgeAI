import { ReportPlan, VisualSpec } from "../domain/types";

export function collectVisualSpecs(plan: ReportPlan): VisualSpec[] {
  return plan.sections.flatMap((section) => section.visuals);
}
