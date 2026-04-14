import { CanvasDocument, ReportDesignSpec, ReportForgeBundle } from "../../shared/types";
import { ReportPlan } from "../domain/types";
import { renderCanvasDocumentHtml } from "./renderCanvasDocumentHtml";

export function renderHtmlReport(
  plan: ReportPlan,
  bundle: ReportForgeBundle,
  designSpec: ReportDesignSpec,
  canvasDocument: CanvasDocument
): string {
  return renderCanvasDocumentHtml(canvasDocument, designSpec, plan, bundle);
}
