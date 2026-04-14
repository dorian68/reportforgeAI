import {
  Audience,
  DatasetProfile,
  PromptInterpretation,
  RangeSnapshot,
  ReportBrief,
  ReportBriefOutputStyle,
  ReportBriefTone,
  ReportConversationTurn,
  ReportIntakeState,
} from "../../shared/types";
import { truncate } from "../../utils/formatting";

const GENERATE_NOW_PATTERNS = [
  /\bgenerate now\b/i,
  /\bthat(?:'| i)?s enough\b/i,
  /\bstop asking\b/i,
  /\bskip questions\b/i,
  /\bgo ahead\b/i,
  /\bproceed now\b/i,
];

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function mergeUnique(current: string[], next: string[]): string[] {
  return unique([...(current ?? []), ...(next ?? [])]);
}

function detectAudienceFromText(text: string, fallback: Audience): Audience {
  const normalized = text.toLowerCase();
  if (/\binvestor|investor relations|investment committee\b/.test(normalized)) {
    return "board";
  }
  if (/\bceo|leadership|executive|leadership team\b/.test(normalized)) {
    return "executive";
  }
  if (/\bboard|directors|governance\b/.test(normalized)) {
    return "board";
  }
  if (/\bcfo|finance|fp&a|controlling\b/.test(normalized)) {
    return "cfo";
  }
  if (/\boperations|ops|plant manager|service manager\b/.test(normalized)) {
    return "operations";
  }
  if (/\bmanagement committee|steerco|codir|committee\b/.test(normalized)) {
    return "management";
  }
  if (/\banalyst|analytics|deep dive\b/.test(normalized)) {
    return "analyst";
  }
  if (/\bclient|customer-facing|customer review\b/.test(normalized)) {
    return "client";
  }
  if (/\brisk|compliance|control\b/.test(normalized)) {
    return "risk";
  }
  if (/\binsurance|underwriting|claims\b/.test(normalized)) {
    return "insurance";
  }
  if (/\bbank|banking|portfolio\b/.test(normalized)) {
    return "banking";
  }
  return fallback;
}

function detectOutputStyle(text: string, audience: Audience): ReportBriefOutputStyle {
  const normalized = text.toLowerCase();
  if (/\bboard|investor\b/.test(normalized)) {
    return "board-deck";
  }
  if (/\boperations|ops|monitoring\b/.test(normalized)) {
    return "operational-dashboard";
  }
  if (/\banalytical|deep dive|workbench\b/.test(normalized)) {
    return "analytical-deep-dive";
  }
  if (/\bclient|proposal|story\b/.test(normalized)) {
    return "client-story";
  }
  if (/\bcfo|finance|margin|variance|budget\b/.test(normalized)) {
    return "finance-review";
  }
  if (/\bsales|pipeline|commercial|revenue\b/.test(normalized)) {
    return "sales-review";
  }
  if (/\bdashboard|web app|interactive\b/.test(normalized)) {
    return "executive-dashboard";
  }
  if (audience === "board") {
    return "board-deck";
  }
  if (audience === "cfo") {
    return "finance-review";
  }
  if (audience === "client") {
    return "client-story";
  }
  return "general-review";
}

function detectBriefTone(text: string, style: ReportBriefOutputStyle): ReportBriefTone {
  const normalized = text.toLowerCase();
  if (/\bformal|institutional|board\b/.test(normalized)) {
    return "formal";
  }
  if (/\bconsultative|premium|client-ready\b/.test(normalized)) {
    return "consultative";
  }
  if (/\banalytical|dense|diagnostic|deep dive\b/.test(normalized)) {
    return "analytical";
  }
  if (style === "client-story") {
    return "consultative";
  }
  if (style === "analytical-deep-dive" || style === "finance-review") {
    return "analytical";
  }
  return "executive";
}

function detectVisualDensity(
  style: ReportBriefOutputStyle,
  tone: ReportBriefTone
): ReportBrief["visualDensity"] {
  if (tone === "analytical" || style === "analytical-deep-dive") {
    return "dense";
  }
  if (style === "board-deck" || tone === "formal") {
    return "light";
  }
  return "balanced";
}

function detectGeographicDimensions(profile: DatasetProfile): string[] {
  return profile.columns
    .filter(
      (column) =>
        column.role === "dimension" &&
        /\bregion|country|state|city|market|territory|zone|area\b/i.test(column.header)
    )
    .map((column) => column.header)
    .slice(0, 2);
}

function inferTimeDimension(profile: DatasetProfile): string | undefined {
  return profile.columns.find((column) => column.kind === "date" && column.role === "dimension")
    ?.header;
}

function inferSegmentDimensions(
  profile: DatasetProfile,
  timeDimension: string | undefined,
  geographicDimensions: string[]
): string[] {
  return profile.columns
    .filter(
      (column) =>
        column.role === "dimension" &&
        column.header !== timeDimension &&
        !geographicDimensions.includes(column.header)
    )
    .map((column) => column.header)
    .slice(0, 3);
}

function inferMeasureCandidates(profile: DatasetProfile): string[] {
  return profile.primaryMeasures.slice(0, 6);
}

function inferTargetOrBenchmark(profile: DatasetProfile): string | undefined {
  return profile.headers.find((header) =>
    /\btarget|budget|plan|forecast|benchmark\b/i.test(header)
  );
}

function inferFocusAreas(
  text: string,
  profile: DatasetProfile,
  timeDimension: string | undefined,
  segmentDimensions: string[],
  geographicDimensions: string[],
  targetOrBenchmark: string | undefined
): string[] {
  const normalized = text.toLowerCase();
  const focusAreas: string[] = [];

  if (/\btrend|trajectory|over time|monthly|weekly|daily\b/.test(normalized) || timeDimension) {
    focusAreas.push("trend");
  }
  if (/\bsegment|mix|split|compare|comparison\b/.test(normalized) || segmentDimensions.length > 0) {
    focusAreas.push("segmentation");
  }
  if (
    /\bregion|country|territory|geography\b/.test(normalized) ||
    geographicDimensions.length > 0
  ) {
    focusAreas.push("geography");
  }
  if (
    /\bproduct|sku|catalog\b/i.test(normalized) ||
    profile.headers.some((header) => /\bproduct|sku|item\b/i.test(header))
  ) {
    focusAreas.push("product");
  }
  if (
    /\bcustomer|client|account\b/i.test(normalized) ||
    profile.headers.some((header) => /\bcustomer|client|account\b/i.test(header))
  ) {
    focusAreas.push("customer");
  }
  if (
    /\bchannel|source|acquisition\b/i.test(normalized) ||
    profile.headers.some((header) => /\bchannel|source|acquisition\b/i.test(header))
  ) {
    focusAreas.push("channel");
  }
  if (
    /\bprofit|margin|cost\b/i.test(normalized) ||
    profile.headers.some((header) => /\bprofit|margin|cost|expense\b/i.test(header))
  ) {
    focusAreas.push("profitability");
  }
  if (/\banomaly|exception|outlier|risk\b/i.test(normalized) || profile.notes.length > 0) {
    focusAreas.push("anomalies");
  }
  if (targetOrBenchmark) {
    focusAreas.push("benchmark");
  }

  return unique(focusAreas);
}

function findMatchingHeaders(text: string, headers: string[]): string[] {
  const normalized = ` ${text.toLowerCase()} `;
  return headers.filter((header) => normalized.includes(` ${header.toLowerCase()} `));
}

function extractPhrase(text: string, patterns: RegExp[], maxLength: number, fallback = ""): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return truncate(match[1].trim().replace(/\s+/g, " "), maxLength);
    }
  }
  return fallback;
}

function buildDatasetSummary(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  timeDimension: string | undefined,
  segmentDimensions: string[],
  geographicDimensions: string[]
): string {
  const summaryParts = [
    `${profile.dataRowCount.toLocaleString()} data rows`,
    `${profile.primaryMeasures.length} measure${profile.primaryMeasures.length === 1 ? "" : "s"}`,
    timeDimension ? `time tracked by ${timeDimension}` : "no reliable time axis",
  ];

  if (segmentDimensions.length > 0) {
    summaryParts.push(`segments: ${segmentDimensions.join(", ")}`);
  }
  if (geographicDimensions.length > 0) {
    summaryParts.push(`geography: ${geographicDimensions.join(", ")}`);
  }

  return `${summaryParts.join(" • ")} from ${snapshot.sheetName} ${snapshot.address}.`;
}

function buildImportantQuestions(
  focusAreas: string[],
  audience: Audience,
  preferredKpis: string[]
): string[] {
  const questions: string[] = [];
  if (preferredKpis.length > 0) {
    questions.push(
      `Which movements in ${preferredKpis.slice(0, 3).join(", ")} matter most right now?`
    );
  }
  if (focusAreas.includes("trend")) {
    questions.push("What changed over time, and did the latest period strengthen or weaken?");
  }
  if (focusAreas.includes("segmentation")) {
    questions.push("Which segments explain the bulk of the result?");
  }
  if (focusAreas.includes("geography")) {
    questions.push("Where is performance concentrated geographically?");
  }
  if (focusAreas.includes("benchmark")) {
    questions.push("Where is the gap versus target, plan, or benchmark most visible?");
  }
  if (focusAreas.includes("anomalies")) {
    questions.push("Which exceptions need attention before this goes to stakeholders?");
  }
  if (audience === "board" || audience === "executive") {
    questions.push("What should leadership decide or monitor next?");
  }
  return unique(questions).slice(0, 5);
}

function defaultBusinessGoal(style: ReportBriefOutputStyle, audience: Audience): string {
  if (style === "board-deck") {
    return "Summarize the business situation in a decision-ready deck.";
  }
  if (style === "operational-dashboard") {
    return "Create an operational view that makes performance, exceptions, and follow-up visible.";
  }
  if (style === "analytical-deep-dive") {
    return "Explain the drivers behind the numbers with enough evidence for analyst review.";
  }
  if (style === "client-story") {
    return "Produce a polished client narrative that explains performance and the recommended next step.";
  }
  if (style === "finance-review") {
    return "Clarify topline, cost, margin, and variance drivers for finance leadership.";
  }
  if (style === "sales-review") {
    return "Show commercial performance, mix shifts, and where to focus sales attention next.";
  }
  if (audience === "operations") {
    return "Highlight execution performance, bottlenecks, and actions for the next review.";
  }
  return "Turn the selected data into a finished report with a clear message and a useful decision angle.";
}

function defaultKeyDecision(style: ReportBriefOutputStyle, focusAreas: string[]): string {
  if (style === "board-deck") {
    return "Decide what leadership should prioritise, monitor, or escalate next.";
  }
  if (style === "operational-dashboard") {
    return "Decide where the team should intervene operationally in the next cycle.";
  }
  if (style === "finance-review") {
    return "Decide which financial driver or variance needs owner attention now.";
  }
  if (focusAreas.includes("benchmark")) {
    return "Decide which gap versus target needs action first.";
  }
  return "Decide what matters most, why it matters, and what should happen next.";
}

function inferTitleHint(
  prompt: PromptInterpretation,
  profile: DatasetProfile,
  preferredKpis: string[],
  outputStyle: ReportBriefOutputStyle
): string {
  const explicit = extractPhrase(
    `${prompt.rawPrompt} ${prompt.businessContext}`,
    [/\btitle(?: it| as)?[:\s]+(.+?)(?:[.!?]|$)/i, /\btheme(?: it| as)?[:\s]+(.+?)(?:[.!?]|$)/i],
    70
  );
  if (explicit) {
    return explicit;
  }

  const metricLabel = preferredKpis[0] ?? profile.primaryMeasures[0] ?? "Performance";
  if (outputStyle === "operational-dashboard") {
    return `${metricLabel} operating dashboard`;
  }
  if (outputStyle === "board-deck") {
    return `${metricLabel} executive review`;
  }
  return `${metricLabel} performance review`;
}

function inferRequiredVisuals(
  focusAreas: string[],
  timeDimension: string | undefined,
  geographicDimensions: string[]
): string[] {
  const visuals: string[] = ["kpi-strip"];
  if (timeDimension || focusAreas.includes("trend")) {
    visuals.push("trend");
  }
  if (focusAreas.includes("segmentation") || focusAreas.includes("product")) {
    visuals.push("comparison");
  }
  if (geographicDimensions.length > 0) {
    visuals.push("geography");
  }
  if (focusAreas.includes("anomalies")) {
    visuals.push("exceptions");
  }
  return unique(visuals);
}

function inferBannedVisuals(text: string): string[] {
  const normalized = text.toLowerCase();
  const visuals: string[] = [];
  if (/\bno pie|avoid pie|avoid donut\b/.test(normalized)) {
    visuals.push("donut");
  }
  if (/\bno map|avoid map\b/.test(normalized)) {
    visuals.push("map");
  }
  if (/\bno table|avoid table\b/.test(normalized)) {
    visuals.push("table");
  }
  return visuals;
}

function inferBrandHints(text: string): string[] {
  const hint = extractPhrase(
    text,
    [
      /\bbrand(?:ing)?(?: hints?)?[:\s]+(.+?)(?:[.!?]|$)/i,
      /\bpalette[:\s]+(.+?)(?:[.!?]|$)/i,
      /\btemplate[:\s]+(.+?)(?:[.!?]|$)/i,
    ],
    120
  );
  return hint ? [hint] : [];
}

function inferAssumptions(
  audience: Audience,
  businessGoal: string,
  keyDecision: string,
  timeDimension: string | undefined,
  preferredKpis: string[],
  prompt: PromptInterpretation
): string[] {
  const assumptions: string[] = [];
  if (audience === "general") {
    assumptions.push("Audience defaulted to a general stakeholder view.");
  }
  if (!timeDimension) {
    assumptions.push(
      "The report will avoid trend-heavy commentary because no reliable time field was detected."
    );
  }
  if (preferredKpis.length === 0) {
    assumptions.push(
      "The report will lean on coverage and quality signals because no clear KPI was detected."
    );
  }
  if (!prompt.businessContext.trim()) {
    assumptions.push("Business context was inferred from headers and value patterns.");
  }
  if (
    businessGoal === defaultBusinessGoal(detectOutputStyle(prompt.rawPrompt, audience), audience)
  ) {
    assumptions.push("The business goal was inferred from the requested report style.");
  }
  if (keyDecision === defaultKeyDecision(detectOutputStyle(prompt.rawPrompt, audience), [])) {
    assumptions.push(
      "The decision focus was inferred from the prompt rather than specified explicitly."
    );
  }
  return unique(assumptions).slice(0, 4);
}

function computeMissingFields(
  brief: ReportBrief
): Pick<ReportBrief, "missingRequired" | "missingOptional"> {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  if (brief.audience === "general") {
    missingRequired.push("audience");
  }
  if (!brief.businessGoal || brief.businessGoal.includes("inferred")) {
    missingRequired.push("business goal");
  }
  if (!brief.keyDecision || brief.keyDecision.includes("Decide what matters most")) {
    missingRequired.push("decision goal");
  }
  if (brief.preferredKpis.length === 0) {
    missingRequired.push("priority KPIs");
  }
  if (!brief.targetOrBenchmark) {
    missingOptional.push("target or benchmark");
  }
  if (brief.brandHints.length === 0) {
    missingOptional.push("brand or template direction");
  }
  if (brief.requiredVisuals.length <= 1) {
    missingOptional.push("must-have visuals");
  }

  return {
    missingRequired,
    missingOptional,
  };
}

export function hasGenerateNowIntent(text: string): boolean {
  return GENERATE_NOW_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildReportBrief(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  overrides: Partial<ReportBrief> = {}
): ReportBrief {
  const combinedText =
    `${prompt.rawPrompt} ${prompt.businessContext} ${overrides.userNotes?.join(" ") ?? ""}`.trim();
  const audience = overrides.audience ?? detectAudienceFromText(combinedText, prompt.audience);
  const outputStyle = overrides.outputStyle ?? detectOutputStyle(combinedText, audience);
  const tone = overrides.tone ?? detectBriefTone(combinedText, outputStyle);
  const timeDimension = normalize(overrides.timeDimension) || inferTimeDimension(profile);
  const geographicDimensions =
    overrides.geographicDimensions && overrides.geographicDimensions.length > 0
      ? overrides.geographicDimensions
      : detectGeographicDimensions(profile);
  const segmentDimensions =
    overrides.segmentDimensions && overrides.segmentDimensions.length > 0
      ? overrides.segmentDimensions
      : inferSegmentDimensions(profile, timeDimension, geographicDimensions);
  const measureCandidates =
    overrides.measureCandidates && overrides.measureCandidates.length > 0
      ? overrides.measureCandidates
      : inferMeasureCandidates(profile);
  const targetOrBenchmark = overrides.targetOrBenchmark ?? inferTargetOrBenchmark(profile);
  const focusAreas =
    overrides.focusAreas && overrides.focusAreas.length > 0
      ? overrides.focusAreas
      : inferFocusAreas(
          combinedText,
          profile,
          timeDimension,
          segmentDimensions,
          geographicDimensions,
          targetOrBenchmark
        );
  const preferredKpis =
    overrides.preferredKpis && overrides.preferredKpis.length > 0
      ? overrides.preferredKpis
      : measureCandidates.slice(0, 4);
  const importantQuestions =
    overrides.importantQuestions && overrides.importantQuestions.length > 0
      ? overrides.importantQuestions
      : buildImportantQuestions(focusAreas, audience, preferredKpis);
  const businessGoal =
    overrides.businessGoal ||
    extractPhrase(
      combinedText,
      [
        /\bgoal(?: is|:)?\s+(.+?)(?:[.!?]|$)/i,
        /\bobjective(?: is|:)?\s+(.+?)(?:[.!?]|$)/i,
        /\bhelp(?: me| us| leadership)?\s+(.+?)(?:[.!?]|$)/i,
      ],
      160
    ) ||
    defaultBusinessGoal(outputStyle, audience);
  const keyDecision =
    overrides.keyDecision ||
    extractPhrase(
      combinedText,
      [
        /\bdecision(?: is|:)?\s+(.+?)(?:[.!?]|$)/i,
        /\bdecide(?: whether| if)?\s+(.+?)(?:[.!?]|$)/i,
        /\bshould help(?: us)?\s+(.+?)(?:[.!?]|$)/i,
      ],
      180
    ) ||
    defaultKeyDecision(outputStyle, focusAreas);
  const titleHint =
    overrides.titleHint || inferTitleHint(prompt, profile, preferredKpis, outputStyle);
  const requiredVisuals =
    overrides.requiredVisuals && overrides.requiredVisuals.length > 0
      ? overrides.requiredVisuals
      : inferRequiredVisuals(focusAreas, timeDimension, geographicDimensions);
  const bannedVisuals =
    overrides.bannedVisuals && overrides.bannedVisuals.length > 0
      ? overrides.bannedVisuals
      : inferBannedVisuals(combinedText);
  const brandHints =
    overrides.brandHints && overrides.brandHints.length > 0
      ? overrides.brandHints
      : inferBrandHints(combinedText);
  const assumptions =
    overrides.assumptions && overrides.assumptions.length > 0
      ? overrides.assumptions
      : inferAssumptions(audience, businessGoal, keyDecision, timeDimension, preferredKpis, prompt);

  const brief: ReportBrief = {
    reportType: overrides.reportType || outputStyle.replace(/-/g, " "),
    outputStyle,
    audience,
    businessGoal,
    keyDecision,
    titleHint,
    themeHint: overrides.themeHint,
    datasetSummary:
      overrides.datasetSummary ||
      buildDatasetSummary(
        snapshot,
        profile,
        timeDimension,
        segmentDimensions,
        geographicDimensions
      ),
    timeDimension,
    measureCandidates,
    segmentDimensions,
    geographicDimensions,
    targetOrBenchmark,
    importantQuestions,
    focusAreas,
    preferredKpis,
    requiredVisuals,
    bannedVisuals,
    tone,
    visualDensity: overrides.visualDensity ?? detectVisualDensity(outputStyle, tone),
    desiredOutputs: overrides.desiredOutputs ?? prompt.desiredOutputs,
    brandHints,
    constraints: unique([...(overrides.constraints ?? []), ...profile.notes]).slice(0, 6),
    assumptions,
    missingRequired: [],
    missingOptional: [],
    intakeComplete: overrides.intakeComplete ?? false,
    generateNow: overrides.generateNow ?? false,
    userNotes: unique(
      [...(overrides.userNotes ?? []), prompt.rawPrompt, prompt.businessContext].filter(Boolean)
    ),
    conversationSummary: overrides.conversationSummary,
  };

  const missing = computeMissingFields(brief);
  return {
    ...brief,
    missingRequired: missing.missingRequired,
    missingOptional: missing.missingOptional,
    intakeComplete:
      brief.intakeComplete ||
      brief.generateNow ||
      (missing.missingRequired.length === 0 && normalize(prompt.businessContext).length > 0),
  };
}

function buildIntakeSummary(brief: ReportBrief): string {
  const lines = [
    `Audience: ${brief.audience}`,
    `Style: ${brief.outputStyle}`,
    `Decision: ${brief.keyDecision}`,
    `KPIs: ${brief.preferredKpis.join(", ") || "not specified"}`,
    `Focus: ${brief.focusAreas.join(", ") || "general performance"}`,
  ];
  return lines.join(" | ");
}

function buildNextPrompt(brief: ReportBrief, profile: DatasetProfile): string {
  if (brief.generateNow || brief.intakeComplete) {
    return "The brief is complete enough to generate. Say anything else only if you want to override the assumptions.";
  }

  if (brief.missingRequired.includes("audience")) {
    return "Who is the audience for this report: CEO, board, finance, operations, investor, client, or another stakeholder?";
  }
  if (brief.missingRequired.includes("decision goal")) {
    return "What main decision should this report support?";
  }
  if (brief.missingRequired.includes("business goal")) {
    return "Do you want a board-style deck, an operational dashboard, or a deeper analytical readout?";
  }
  if (brief.missingRequired.includes("priority KPIs")) {
    const measures = profile.primaryMeasures.slice(0, 4).join(", ");
    return measures
      ? `Which KPIs matter most from this dataset: ${measures}?`
      : "Which outcomes should the report emphasise most?";
  }
  if (!brief.targetOrBenchmark) {
    return "Is there a target, budget, prior period, or benchmark I should compare against?";
  }
  return "Any brand, title, or visual preferences before I generate?";
}

function appendTurn(
  turns: ReportConversationTurn[],
  role: ReportConversationTurn["role"],
  text: string
): ReportConversationTurn[] {
  return [
    ...turns,
    {
      role,
      text,
      timestamp: new Date().toISOString(),
    },
  ];
}

function extractBriefPatch(
  message: string,
  currentBrief: ReportBrief,
  profile: DatasetProfile
): Partial<ReportBrief> {
  const patch: Partial<ReportBrief> = {};
  const audience = detectAudienceFromText(message, currentBrief.audience);
  if (audience !== currentBrief.audience) {
    patch.audience = audience;
  }

  const outputStyle = detectOutputStyle(message, audience);
  if (outputStyle !== currentBrief.outputStyle) {
    patch.outputStyle = outputStyle;
    patch.reportType = outputStyle.replace(/-/g, " ");
  }

  const tone = detectBriefTone(message, outputStyle);
  if (
    tone !== currentBrief.tone &&
    /\bstyle|tone|formal|analytical|executive|premium|consultative\b/i.test(message)
  ) {
    patch.tone = tone;
  }

  const keyDecision = extractPhrase(
    message,
    [
      /\bdecision(?: is|:)?\s+(.+?)(?:[.!?]|$)/i,
      /\bdecide(?: whether| if)?\s+(.+?)(?:[.!?]|$)/i,
      /\bshould help(?: us)?\s+(.+?)(?:[.!?]|$)/i,
    ],
    180
  );
  if (keyDecision) {
    patch.keyDecision = keyDecision;
  }

  const businessGoal = extractPhrase(
    message,
    [
      /\bgoal(?: is|:)?\s+(.+?)(?:[.!?]|$)/i,
      /\bobjective(?: is|:)?\s+(.+?)(?:[.!?]|$)/i,
      /\bi want(?: this)?\s+(.+?)(?:[.!?]|$)/i,
    ],
    160
  );
  if (businessGoal) {
    patch.businessGoal = businessGoal;
  }

  const titleHint = extractPhrase(
    message,
    [
      /\btitle(?: it| as)?[:\s]+(.+?)(?:[.!?]|$)/i,
      /\bcall it[:\s]+(.+?)(?:[.!?]|$)/i,
      /\btheme(?: it| as)?[:\s]+(.+?)(?:[.!?]|$)/i,
    ],
    70
  );
  if (titleHint) {
    patch.titleHint = titleHint;
  }

  const matchingHeaders = findMatchingHeaders(message, profile.headers);
  const matchingMeasures = matchingHeaders.filter((header) =>
    profile.primaryMeasures.includes(header)
  );
  if (matchingMeasures.length > 0) {
    patch.preferredKpis = mergeUnique(currentBrief.preferredKpis, matchingMeasures);
  }

  const focusAreas = inferFocusAreas(
    message,
    profile,
    currentBrief.timeDimension,
    currentBrief.segmentDimensions,
    currentBrief.geographicDimensions,
    currentBrief.targetOrBenchmark
  );
  if (focusAreas.length > 0) {
    patch.focusAreas = mergeUnique(currentBrief.focusAreas, focusAreas);
  }

  const nextFocusAreas = patch.focusAreas ?? currentBrief.focusAreas;
  const requiredVisuals = inferRequiredVisuals(
    nextFocusAreas,
    currentBrief.timeDimension,
    currentBrief.geographicDimensions
  );
  if (
    requiredVisuals.length > 0 &&
    /\bchart|visual|dashboard|map|table|trend|scorecard\b/i.test(message)
  ) {
    patch.requiredVisuals = mergeUnique(currentBrief.requiredVisuals, requiredVisuals);
  }

  const bannedVisuals = inferBannedVisuals(message);
  if (bannedVisuals.length > 0) {
    patch.bannedVisuals = mergeUnique(currentBrief.bannedVisuals, bannedVisuals);
  }

  const benchmark = extractPhrase(
    message,
    [
      /\bbenchmark(?: is|:)?\s+(.+?)(?:[.!?]|$)/i,
      /\bcompare(?: against| to)?\s+(.+?)(?:[.!?]|$)/i,
      /\btarget(?: is|:)?\s+(.+?)(?:[.!?]|$)/i,
    ],
    120
  );
  if (benchmark) {
    patch.targetOrBenchmark = benchmark;
  }

  const brandHints = inferBrandHints(message);
  if (brandHints.length > 0) {
    patch.brandHints = mergeUnique(currentBrief.brandHints, brandHints);
  }

  patch.generateNow = hasGenerateNowIntent(message);
  patch.userNotes = mergeUnique(currentBrief.userNotes, [message]);
  return patch;
}

export function createInitialIntakeState(
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  overrides: Partial<ReportBrief> = {}
): ReportIntakeState {
  const brief = buildReportBrief(snapshot, profile, prompt, overrides);
  return {
    brief,
    turns: [],
    summary: buildIntakeSummary(brief),
    nextPrompt: buildNextPrompt(brief, profile),
    assumptions: brief.assumptions,
    missingRequired: brief.missingRequired,
    missingOptional: brief.missingOptional,
    intakeComplete: brief.intakeComplete,
  };
}

export function applyConversationMessage(
  state: ReportIntakeState,
  snapshot: RangeSnapshot,
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  message: string
): ReportIntakeState {
  const userMessage = normalize(message);
  if (!userMessage) {
    return state;
  }

  const patch = extractBriefPatch(userMessage, state.brief, profile);
  const conversationSummary = truncate(
    [state.brief.conversationSummary, userMessage].filter(Boolean).join(" "),
    260
  );
  const brief = buildReportBrief(snapshot, profile, prompt, {
    ...state.brief,
    ...patch,
    conversationSummary,
    generateNow: patch.generateNow ?? state.brief.generateNow,
    intakeComplete: (patch.generateNow ?? false) || state.brief.intakeComplete,
  });
  const assistantPrompt = buildNextPrompt(brief, profile);
  const turns = appendTurn(
    appendTurn(state.turns, "user", userMessage),
    "assistant",
    assistantPrompt
  );

  return {
    brief,
    turns,
    summary: buildIntakeSummary(brief),
    nextPrompt: assistantPrompt,
    assumptions: brief.assumptions,
    missingRequired: brief.missingRequired,
    missingOptional: brief.missingOptional,
    intakeComplete: brief.generateNow || brief.intakeComplete,
  };
}
