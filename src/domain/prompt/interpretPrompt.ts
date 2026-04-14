import { DEFAULT_SLIDE_COUNT } from "../../shared/constants";
import { GenerationOptions, PromptInterpretation } from "../../shared/types";

const OUTPUT_KEYWORDS = {
  excel: ["excel", "worksheet", "workbook", "report", "rapport", "classeur", "feuille"],
  gas: [
    "google",
    "apps script",
    "dashboard",
    "web app",
    "webapp",
    "site",
    "tableau de bord",
    "application web",
  ],
  email: ["email", "mail", "outreach", "memo", "e-mail", "courriel", "message"],
  slides: [
    "slide",
    "deck",
    "presentation",
    "powerpoint",
    "slides",
    "diapositive",
    "diapositives",
    "présentation",
  ],
};

export function interpretPrompt(
  prompt: string,
  options: GenerationOptions,
  businessContext = ""
): PromptInterpretation {
  const normalized = prompt.trim().toLowerCase();
  const keywords = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  const audience = detectAudience(normalized, businessContext);
  const tone = detectTone(normalized);
  const reportStyle = detectReportStyle(normalized);
  const slideCount = detectSlideCount(normalized);
  const desiredOutputs = {
    excel: shouldIncludeOutput(normalized, OUTPUT_KEYWORDS.excel),
    gas: shouldIncludeOutput(normalized, OUTPUT_KEYWORDS.gas),
    email: shouldIncludeOutput(normalized, OUTPUT_KEYWORDS.email),
    slides: shouldIncludeOutput(normalized, OUTPUT_KEYWORDS.slides),
  };

  const noExplicitOutputs = Object.values(desiredOutputs).every((value) => !value);
  if (noExplicitOutputs) {
    desiredOutputs.excel = true;
    desiredOutputs.gas = true;
    desiredOutputs.email = true;
    desiredOutputs.slides = true;
  }

  return {
    rawPrompt: prompt,
    businessContext: businessContext.trim(),
    audience,
    tone,
    reportStyle,
    desiredOutputs,
    slideCount,
    excelLayoutHint: detectLayoutHint(normalized),
    webAppStyle: detectWebAppStyle(normalized),
    mode: options.mode,
    emphasizesCharts: /\bchart|trend|visual|dashboard|graphique|tableau\b/.test(normalized),
    emphasizesNarrative: /\bsummary|narrative|story|board|executive|résumé|resume|direction\b/.test(
      normalized
    ),
    keywords: Array.from(
      new Set(
        [
          ...keywords,
          ...businessContext
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(Boolean),
        ].filter(Boolean)
      )
    ),
  };
}

function shouldIncludeOutput(prompt: string, tokens: string[]): boolean {
  return tokens.some((token) => prompt.includes(token));
}

function containsWholeWord(prompt: string, token: string): boolean {
  return new RegExp(`\\b${escapeRegExp(token)}\\b`, "i").test(prompt);
}

function detectAudience(prompt: string, businessContext: string): PromptInterpretation["audience"] {
  const combined = `${prompt} ${businessContext.toLowerCase()}`;

  if (prompt.includes("cfo") || prompt.includes("finance") || prompt.includes("daf")) {
    return "cfo";
  }

  if (containsWholeWord(prompt, "board") || prompt.includes("conseil")) {
    return "board";
  }

  if (
    prompt.includes("executive") ||
    prompt.includes("leadership") ||
    prompt.includes("direction")
  ) {
    return "executive";
  }

  if (prompt.includes("operations") || prompt.includes("ops") || prompt.includes("opérations")) {
    return "operations";
  }

  if (/\bcommittee|management committee|codir|steerco|steering committee|comité\b/.test(combined)) {
    return "management";
  }

  if (
    /\banalyst|analysis|analytics|reporting team|controle de gestion|contrôle de gestion\b/.test(
      combined
    )
  ) {
    return "analyst";
  }

  if (/\brisk|compliance|control|incident|contrôle|risque\b/.test(combined)) {
    return "risk";
  }

  if (/\binsurance|claims|policy|renewal|premium|underwriting|sinistre\b/.test(combined)) {
    return "insurance";
  }

  if (/\bbanking|bank|portfolio|loan|deposit|desk|exposure\b/.test(combined)) {
    return "banking";
  }

  if (/\bclient|customer|prospect|commercial\b/.test(combined)) {
    return "client";
  }

  return "general";
}

function detectTone(prompt: string): PromptInterpretation["tone"] {
  if (
    prompt.includes("formal") ||
    containsWholeWord(prompt, "board") ||
    prompt.includes("cfo") ||
    prompt.includes("formel") ||
    prompt.includes("conseil")
  ) {
    return "formal";
  }

  if (prompt.includes("concise") || prompt.includes("simple") || prompt.includes("concis")) {
    return "concise";
  }

  if (prompt.includes("direct")) {
    return "direct";
  }

  return "neutral";
}

function detectReportStyle(prompt: string): PromptInterpretation["reportStyle"] {
  if (
    prompt.includes("monthly") ||
    prompt.includes("executive") ||
    prompt.includes("mensuel") ||
    prompt.includes("direction")
  ) {
    return "executive-monthly";
  }

  if (containsWholeWord(prompt, "board") || prompt.includes("conseil")) {
    return "board-summary";
  }

  if (
    prompt.includes("dashboard") ||
    prompt.includes("web app") ||
    prompt.includes("tableau de bord") ||
    prompt.includes("application web")
  ) {
    return "dashboard";
  }

  if (prompt.includes("simple") || prompt.includes("sobre")) {
    return "simple";
  }

  return "auto";
}

function detectLayoutHint(prompt: string): PromptInterpretation["excelLayoutHint"] {
  if (
    (prompt.includes("kpi") && prompt.includes("top")) ||
    (prompt.includes("kpi") && prompt.includes("haut"))
  ) {
    return "kpis-top";
  }

  if (
    (prompt.includes("summary") && prompt.includes("first")) ||
    (prompt.includes("résumé") && prompt.includes("d'abord")) ||
    (prompt.includes("resume") && prompt.includes("d'abord"))
  ) {
    return "summary-first";
  }

  return "balanced";
}

function detectWebAppStyle(prompt: string): PromptInterpretation["webAppStyle"] {
  if (containsWholeWord(prompt, "board") || prompt.includes("conseil")) {
    return "board-dashboard";
  }

  if (prompt.includes("simple") || prompt.includes("sobre")) {
    return "compact-dashboard";
  }

  return "simple-dashboard";
}

function detectSlideCount(prompt: string): number {
  const match = prompt.match(
    /\b(\d{1,2})\s+(?:business\s+)?(?:slides?|diapositives?|présentations?)\b/
  );
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return DEFAULT_SLIDE_COUNT;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
