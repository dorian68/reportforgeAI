import { NormalizedReportRequest } from "../domain/types";

function audienceHint(audience: NormalizedReportRequest["audience"]): string {
  switch (audience) {
    case "ceo":
      return "CEO / executive leadership";
    case "cfo":
      return "CFO / finance leadership";
    case "board":
      return "board / investors";
    case "client":
      return "client-facing stakeholders";
    case "investor":
      return "investor audience";
    case "project-team":
      return "project team";
    case "operations":
      return "operations leaders";
    default:
      return "multi-stakeholder audience";
  }
}

export function buildEnginePrompt(request: NormalizedReportRequest): string {
  const brief = request.brief;
  const segments = [
    request.promptText,
    request.businessContext ? `Business context: ${request.businessContext}.` : "",
    `Audience: ${audienceHint(request.audience)}.`,
    `Objective: ${request.objective}.`,
    `Tone: ${request.tone}.`,
    brief?.keyDecision ? `Key decision: ${brief.keyDecision}.` : "",
    brief?.businessGoal ? `Business goal: ${brief.businessGoal}.` : "",
    brief?.preferredKpis?.length
      ? `Priority KPIs: ${brief.preferredKpis.slice(0, 4).join(", ")}.`
      : "",
    brief?.focusAreas?.length ? `Focus areas: ${brief.focusAreas.slice(0, 4).join(", ")}.` : "",
    brief?.requiredVisuals?.length
      ? `Preferred visual patterns: ${brief.requiredVisuals.slice(0, 4).join(", ")}.`
      : "",
    brief?.bannedVisuals?.length
      ? `Avoid these visuals unless there is no better option: ${brief.bannedVisuals.join(", ")}.`
      : "",
    "Behave like an enterprise reporting analyst: identify the performance angle, write message-led titles, and keep the visible narrative data-grounded.",
    "Do not output slide instructions or authoring notes. The result should read like a finished first-pass deliverable.",
    request.preferredFormats.includes("pptx") ? "Include a client-ready slide deck." : "",
    request.preferredFormats.includes("html") ? "Include an elegant HTML report." : "",
    request.preferredFormats.includes("gas-project")
      ? "Include an interactive web reporting scaffold."
      : "",
    `Target ${request.maxSlides} slides when a deck is produced.`,
  ];

  return segments.filter(Boolean).join(" ");
}
