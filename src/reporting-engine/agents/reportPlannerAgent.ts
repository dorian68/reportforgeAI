import { mapBundleToReportPlan } from "../adapters/mapBundleToReportPlan";
import { NormalizedReportRequest, ReportPlan } from "../domain/types";
import { ReportForgeBundle } from "../../shared/types";

export function runReportPlannerAgent(
  bundle: ReportForgeBundle,
  request: NormalizedReportRequest
): ReportPlan {
  return mapBundleToReportPlan(bundle, {
    audience: request.audience,
    objective: request.objective,
    tone: request.tone,
    preferredFormats: request.preferredFormats,
  });
}
