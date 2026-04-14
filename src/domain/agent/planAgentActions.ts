import {
  AgentPlan,
  AgentPlanStep,
  DatasetProfile,
  RangeSnapshot,
  ReportPlan,
} from "../../shared/types";

const DEFAULT_AGENT_PROMPT =
  "Prepare this selection for an executive monthly report: structure it as a table, format the headers, freeze the top row, and generate the workbook report.";

export function getDefaultAgentPrompt(): string {
  return DEFAULT_AGENT_PROMPT;
}

export function planAgentActions(
  agentPrompt: string,
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  reportPlan: ReportPlan
): AgentPlan {
  const normalizedPrompt = normalizePrompt(agentPrompt);
  const wantsTable =
    matchesAny(normalizedPrompt, [
      "table",
      "structured",
      "structure",
      "filters",
      "filter",
      "tableau",
      "filtre",
    ]) || normalizedPrompt.length === 0;
  const wantsFormatting =
    matchesAny(normalizedPrompt, [
      "format",
      "clean",
      "tidy",
      "prepare",
      "prep",
      "style",
      "professional",
      "nettoie",
      "preparer",
      "prepare",
      "mise en forme",
    ]) ||
    wantsTable ||
    normalizedPrompt.length === 0;
  const wantsFreeze = matchesAny(normalizedPrompt, [
    "freeze",
    "frozen",
    "pin",
    "header row",
    "top row",
    "geler",
    "figer",
  ]);
  const wantsWorkbookReport =
    matchesAny(normalizedPrompt, [
      "report",
      "board",
      "monthly",
      "executive",
      "kpi",
      "dashboard",
      "summary",
      "rapport",
      "direction",
      "synthese",
      "charts",
      "graphiques",
    ]) || normalizedPrompt.length === 0;

  const steps: AgentPlanStep[] = [];

  if (wantsTable) {
    steps.push({
      id: "structure-source-table",
      kind: "structure-source-table",
      title: "Structure The Selection As A Table",
      description:
        "Create an Excel table on the current selection so filters, styles, and later refreshes behave more predictably.",
      impact: "selection",
    });
  }

  if (wantsFormatting) {
    steps.push({
      id: "format-source-range",
      kind: "format-source-range",
      title: "Format The Source Range",
      description:
        "Apply header styling, autofit, and data-aware number/date formatting inside the current selection.",
      impact: "selection",
    });
  }

  if (wantsFreeze) {
    steps.push({
      id: "freeze-source-header",
      kind: "freeze-source-header",
      title: "Freeze The Header Row",
      description:
        "Freeze the source worksheet at the header line so the selection stays readable during review.",
      impact: "worksheet",
    });
  }

  if (wantsWorkbookReport) {
    steps.push({
      id: "generate-workbook-report",
      kind: "generate-workbook-report",
      title: "Generate The Workbook Report",
      description: `Create new workbook report sheets from the current reporting plan: ${reportPlan.title}.`,
      impact: "new-sheets",
    });
  }

  if (steps.length === 0) {
    steps.push({
      id: "format-source-range",
      kind: "format-source-range",
      title: "Format The Source Range",
      description:
        "No supported agent action was detected clearly, so the agent falls back to safe formatting inside the current selection.",
      impact: "selection",
    });
  }

  const warnings = buildWarnings(normalizedPrompt, profile, steps);
  const notes = [
    `Agent Mode is bounded to the active selection on ${snapshot.sheetName} and to new sheets it explicitly creates.`,
    "It will not delete worksheets, remove formulas outside the current selection, or send external data anywhere by itself.",
  ];

  return {
    title: buildPlanTitle(reportPlan, steps),
    summary: buildSummary(steps, reportPlan),
    userPrompt: agentPrompt.trim() || DEFAULT_AGENT_PROMPT,
    steps,
    warnings,
    notes,
  };
}

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesAny(prompt: string, tokens: string[]): boolean {
  return tokens.some((token) => prompt.includes(token));
}

function buildPlanTitle(reportPlan: ReportPlan, steps: AgentPlanStep[]): string {
  if (steps.some((step) => step.kind === "generate-workbook-report")) {
    return `Agent Plan For ${reportPlan.title}`;
  }

  return `Agent Plan For ${steps[0].title}`;
}

function buildSummary(steps: AgentPlanStep[], reportPlan: ReportPlan): string {
  const labels = steps.map((step) => step.title.toLowerCase());
  if (steps.some((step) => step.kind === "generate-workbook-report")) {
    return `The agent will ${labels.join(", ")}, then leave the workbook ready for ${reportPlan.title}.`;
  }

  return `The agent will ${labels.join(", ")} inside the current workbook without creating external side effects.`;
}

function buildWarnings(
  normalizedPrompt: string,
  profile: DatasetProfile,
  steps: AgentPlanStep[]
): string[] {
  const warnings: string[] = [];

  if (!profile.hasHeaders && steps.some((step) => step.kind !== "freeze-source-header")) {
    warnings.push(
      "Headers were not clearly detected. Table creation and workbook report titles may be less clean than expected."
    );
  }

  if (
    steps.some((step) => step.kind === "generate-workbook-report") &&
    profile.primaryMeasures.length === 0
  ) {
    warnings.push(
      "No strong numeric measures were detected, so the generated workbook report may emphasize structure and narrative more than KPI charts."
    );
  }

  if (
    normalizedPrompt &&
    matchesAny(normalizedPrompt, ["delete", "remove", "supprime", "efface", "overwrite", "replace"])
  ) {
    warnings.push(
      "Destructive actions were requested in the prompt, but Agent Mode ignores them in this MVP and stays within safe reporting operations."
    );
  }

  return warnings;
}
