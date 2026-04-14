import { requestLlmJson } from "../ai/llmClient";
import {
  GeneratedSlidesBundle,
  LlmProviderConfig,
  LlmSessionSecret,
  ReportTheme,
  SavedSlideTemplate,
  SlideTemplateCardStyle,
  SlideTemplateContentLayout,
  SlideTemplateDefinition,
  SlideTemplateHeroStyle,
} from "../../shared/types";
import { renderSlideVisualHtml } from "./slideVisuals";

const DEFAULT_FONT_FAMILY = '"Aptos", "Segoe UI", sans-serif';
export const DEFAULT_SLIDE_TEMPLATE_ID = "executive-spotlight";

export const BUILT_IN_SLIDE_TEMPLATES: SlideTemplateDefinition[] = [
  {
    id: "executive-spotlight",
    name: "Executive Spotlight",
    description: "Clean board-style deck with a strong header ribbon and balanced content panels.",
    audienceLabel: "Executive leadership",
    narrativeStyle: "Lead with headline business movement, then move to proof and decisions.",
    visualDirection: "Premium scorecards, restrained charts, and clear decision framing.",
    storytellingDirective: "Make every slide easy to retell after the meeting and close on action.",
    fontFamily: DEFAULT_FONT_FAMILY,
    accent: "#0f766e",
    surface: "#f5fbfa",
    border: "#c3dfda",
    ink: "#17353a",
    muted: "#5f7b81",
    heroStyle: "ribbon",
    contentLayout: "balanced",
    cardStyle: "soft",
    promptHint: "Best for leadership updates, monthly reviews, and board-facing output.",
  },
  {
    id: "analytics-workbench",
    name: "Analytics Workbench",
    description:
      "Sharper analytical layout for KPI-heavy reporting and operational review meetings.",
    audienceLabel: "Finance and operations stakeholders",
    narrativeStyle: "Use evidence-heavy headlines with tighter analytical pacing.",
    visualDirection: "Give more room to charts, diagnostic visuals, and benchmark comparisons.",
    storytellingDirective:
      "Help the audience move from variance review to concrete operating follow-up.",
    fontFamily: DEFAULT_FONT_FAMILY,
    accent: "#1d4ed8",
    surface: "#f6f8fe",
    border: "#ccdafc",
    ink: "#182a4e",
    muted: "#657aa7",
    heroStyle: "spotlight",
    contentLayout: "insight",
    cardStyle: "outlined",
    promptHint: "Best for operational, finance, and data-heavy client presentations.",
  },
  {
    id: "client-storyboard",
    name: "Client Storyboard",
    description: "Narrative-first deck with warmer surfaces for client-facing recommendations.",
    audienceLabel: "Client-facing commercial audience",
    narrativeStyle:
      "Tell a persuasive before/after story that lands on a confident recommendation.",
    visualDirection:
      "Use warmer surfaces, stronger takeaways, and visuals that support persuasion.",
    storytellingDirective:
      "Keep the tone consultative and make the next client decision feel obvious.",
    fontFamily: DEFAULT_FONT_FAMILY,
    accent: "#b45309",
    surface: "#fff9f2",
    border: "#f0d7bc",
    ink: "#4a2800",
    muted: "#876138",
    heroStyle: "minimal",
    contentLayout: "stacked",
    cardStyle: "solid",
    promptHint: "Best for customer-facing recaps, proposals, and decision walkthroughs.",
  },
];

interface SlideTemplatePayload {
  name?: string;
  description?: string;
  audienceLabel?: string;
  narrativeStyle?: string;
  visualDirection?: string;
  storytellingDirective?: string;
  fontFamily?: string;
  accent?: string;
  surface?: string;
  border?: string;
  ink?: string;
  muted?: string;
  heroStyle?: SlideTemplateHeroStyle;
  contentLayout?: SlideTemplateContentLayout;
  cardStyle?: SlideTemplateCardStyle;
  promptHint?: string;
}

const SLIDE_TEMPLATE_SYSTEM_PROMPT = `You design premium business presentation templates for an Excel reporting product.
Return one JSON object and nothing else.
Do not output HTML, markdown, or explanations.
Generate a slide template spec that stays professional, readable, and narrow enough for both preview and export.
Treat the template as a reusable client presentation system:
- who the deck is for
- how the story should sound
- how the visuals should feel
- what kind of close or decision posture the deck should encourage
Use only these enum values:
- heroStyle: "ribbon" | "spotlight" | "minimal"
- contentLayout: "balanced" | "insight" | "stacked"
- cardStyle: "soft" | "outlined" | "solid"
Return colors as 6-digit hex strings.
Schema:
{
  "name": "string <= 40 chars",
  "description": "string <= 140 chars",
  "audienceLabel": "string <= 60 chars",
  "narrativeStyle": "string <= 160 chars",
  "visualDirection": "string <= 160 chars",
  "storytellingDirective": "string <= 180 chars",
  "fontFamily": "safe CSS font-family string",
  "accent": "#RRGGBB",
  "surface": "#RRGGBB",
  "border": "#RRGGBB",
  "ink": "#RRGGBB",
  "muted": "#RRGGBB",
  "heroStyle": "ribbon",
  "contentLayout": "balanced",
  "cardStyle": "soft",
  "promptHint": "string <= 120 chars"
}`;

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function coerceEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeFontFamily(value: string | undefined): string {
  const nextValue = normalize(value).replace(/[<>`]/g, "");
  return nextValue || DEFAULT_FONT_FAMILY;
}

function sanitizeTemplatePayload(
  id: string,
  payload: SlideTemplatePayload,
  fallbackTheme: ReportTheme,
  sourcePrompt = ""
): SavedSlideTemplate {
  const fallbackTemplate = buildDefaultSlideTemplate(fallbackTheme);
  return {
    id,
    name: normalize(payload.name).slice(0, 40) || "Custom Slide Template",
    description:
      normalize(payload.description).slice(0, 140) ||
      "Custom template generated for deck rendering and export.",
    audienceLabel: normalize(payload.audienceLabel).slice(0, 60) || fallbackTemplate.audienceLabel,
    narrativeStyle:
      normalize(payload.narrativeStyle).slice(0, 160) || fallbackTemplate.narrativeStyle,
    visualDirection:
      normalize(payload.visualDirection).slice(0, 160) || fallbackTemplate.visualDirection,
    storytellingDirective:
      normalize(payload.storytellingDirective).slice(0, 180) ||
      fallbackTemplate.storytellingDirective,
    fontFamily: normalizeFontFamily(payload.fontFamily),
    accent: isHexColor(normalize(payload.accent))
      ? normalize(payload.accent)
      : fallbackTemplate.accent,
    surface: isHexColor(normalize(payload.surface))
      ? normalize(payload.surface)
      : fallbackTemplate.surface,
    border: isHexColor(normalize(payload.border))
      ? normalize(payload.border)
      : fallbackTemplate.border,
    ink: isHexColor(normalize(payload.ink)) ? normalize(payload.ink) : fallbackTemplate.ink,
    muted: isHexColor(normalize(payload.muted)) ? normalize(payload.muted) : fallbackTemplate.muted,
    heroStyle: coerceEnum(
      payload.heroStyle,
      ["ribbon", "spotlight", "minimal"],
      fallbackTemplate.heroStyle
    ),
    contentLayout: coerceEnum(
      payload.contentLayout,
      ["balanced", "insight", "stacked"],
      fallbackTemplate.contentLayout
    ),
    cardStyle: coerceEnum(
      payload.cardStyle,
      ["soft", "outlined", "solid"],
      fallbackTemplate.cardStyle
    ),
    promptHint:
      normalize(payload.promptHint).slice(0, 120) ||
      "Generated template for presentation-ready executive reporting.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourcePrompt: normalize(sourcePrompt).slice(0, 240),
  };
}

export function buildDefaultSlideTemplate(theme: ReportTheme): SlideTemplateDefinition {
  const builtIn = BUILT_IN_SLIDE_TEMPLATES.find(
    (template) => template.id === DEFAULT_SLIDE_TEMPLATE_ID
  );
  return {
    ...(builtIn ?? BUILT_IN_SLIDE_TEMPLATES[0]),
    accent: theme.accent,
    surface: theme.surface,
    border: theme.border,
    ink: theme.ink,
    muted: theme.muted,
  };
}

export function getAllSlideTemplates(
  fallbackTheme: ReportTheme,
  savedTemplates: SavedSlideTemplate[]
): SlideTemplateDefinition[] {
  return [
    buildDefaultSlideTemplate(fallbackTheme),
    ...BUILT_IN_SLIDE_TEMPLATES.filter((template) => template.id !== DEFAULT_SLIDE_TEMPLATE_ID),
    ...savedTemplates,
  ];
}

export function resolveSlideTemplate(
  templateId: string,
  fallbackTheme: ReportTheme,
  savedTemplates: SavedSlideTemplate[]
): SlideTemplateDefinition {
  const allTemplates = getAllSlideTemplates(fallbackTheme, savedTemplates);
  return allTemplates.find((template) => template.id === templateId) ?? allTemplates[0];
}

export function renderSlideDeckHtml(
  slidesBundle: GeneratedSlidesBundle,
  template: SlideTemplateDefinition
): string {
  const slideMarkup = slidesBundle.slides
    .map((slide) => {
      const bulletMarkup = (slide.evidencePoints ?? slide.bullets)
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("");
      return `
        <section class="slide slide--${template.contentLayout}">
          <header class="slide__header slide__header--${template.heroStyle}">
            <div class="slide__index">Slide ${slide.index}</div>
            <div>
              <h2>${escapeHtml(slide.title)}</h2>
              ${slide.subtitle ? `<p class="slide__subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
              <div class="slide__beat">${escapeHtml(slide.storyBeat)}</div>
              <p>${escapeHtml(slide.takeaway)}</p>
            </div>
            ${
              slide.headlineMetric
                ? `
                  <div class="slide__headline">
                    <span class="slide__headline-label">${escapeHtml(slide.headlineMetric.label)}</span>
                    <strong class="slide__headline-value">${escapeHtml(slide.headlineMetric.value)}</strong>
                    <p class="slide__headline-detail">${escapeHtml(slide.headlineMetric.detail)}</p>
                  </div>
                `
                : ""
            }
          </header>
          <div class="slide__body slide__body--${template.contentLayout}">
            <section class="slide__panel slide__panel--primary slide__panel--${template.cardStyle}">
              <h3>${escapeHtml(slide.narrativeLabel ?? "Key Message")}</h3>
              <ul>${bulletMarkup}</ul>
            </section>
            <section class="slide__panel slide__panel--secondary slide__panel--${template.cardStyle}">
              ${
                slide.visual
                  ? renderSlideVisualHtml(slide.visual, {
                      accent: template.accent,
                      border: template.border,
                      ink: template.ink,
                      muted: template.muted,
                      surface: template.surface,
                    })
                  : `
                    <div class="slide__meta">
                      <h3>${escapeHtml(slide.visualLabel ?? "Visual Direction")}</h3>
                      <p>${escapeHtml(slide.chartSuggestion)}</p>
                    </div>
                  `
              }
              ${
                slide.visual
                  ? `
                    <div class="slide__meta">
                      <h3>${escapeHtml(slide.visualLabel ?? "Chart Direction")}</h3>
                      <p>${escapeHtml(slide.chartCaption ?? slide.chartSuggestion)}</p>
                    </div>
                  `
                  : ""
              }
              <div class="slide__meta">
                <h3>${escapeHtml(resolveImplicationLabel(slide))}</h3>
                <p>${escapeHtml(slide.implication ?? slide.speakerNotes)}</p>
              </div>
              ${
                slide.recommendation
                  ? `
                    <div class="slide__meta">
                      <h3>${escapeHtml(resolveRecommendationLabel(slide))}</h3>
                      <p>${escapeHtml(slide.recommendation)}</p>
                    </div>
                  `
                  : ""
              }
              <div class="slide__meta">
                <h3>${escapeHtml(resolveNotesLabel(slide))}</h3>
                <p>${escapeHtml(slide.speakerNotes)}</p>
              </div>
              ${
                slide.confidenceCaveat
                  ? `
                    <div class="slide__meta">
                      <h3>Caveat</h3>
                      <p>${escapeHtml(slide.confidenceCaveat)}</p>
                    </div>
                  `
                  : ""
              }
            </section>
          </div>
        </section>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(slidesBundle.title)}</title>
    <style>
      :root {
        color-scheme: light;
        --deck-accent: ${template.accent};
        --deck-surface: ${template.surface};
        --deck-border: ${template.border};
        --deck-ink: ${template.ink};
        --deck-muted: ${template.muted};
        --deck-paper: #ffffff;
        --deck-font: ${template.fontFamily};
        --deck-shadow: rgba(15, 34, 44, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, rgba(255,255,255,0.85), transparent 32%),
          linear-gradient(180deg, var(--deck-surface), #ffffff);
        color: var(--deck-ink);
        font-family: var(--deck-font);
      }
      .deck {
        width: min(1280px, 100%);
        margin: 0 auto;
        padding: 24px 16px 48px;
        display: grid;
        gap: 20px;
      }
      .deck__hero {
        border: 1px solid var(--deck-border);
        border-radius: 24px;
        background: linear-gradient(135deg, var(--deck-surface), #ffffff 74%);
        padding: 24px;
        box-shadow: 0 20px 42px -28px var(--deck-shadow);
      }
      .deck__eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border-radius: 999px;
        padding: 7px 12px;
        background: var(--deck-surface);
        color: var(--deck-accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .deck__hero h1 {
        margin: 14px 0 8px;
        font-size: 34px;
        line-height: 1.05;
      }
      .deck__hero p {
        margin: 0;
        max-width: 760px;
        color: var(--deck-muted);
        line-height: 1.55;
      }
      .deck__hero-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .deck__hero-chip {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--deck-border);
        border-radius: 999px;
        padding: 7px 12px;
        background: rgba(255, 255, 255, 0.78);
        color: var(--deck-ink);
        font-size: 12px;
        font-weight: 600;
      }
      .deck__hero-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .deck__hero-card {
        border: 1px solid var(--deck-border);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.8);
        padding: 14px 16px;
        display: grid;
        gap: 6px;
      }
      .deck__hero-card strong {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--deck-accent);
      }
      .deck__hero-card p {
        max-width: none;
      }
      .slide {
        border: 1px solid var(--deck-border);
        border-radius: 28px;
        background: var(--deck-paper);
        padding: 24px;
        min-height: 660px;
        display: grid;
        gap: 22px;
        box-shadow: 0 28px 70px -42px var(--deck-shadow);
        break-after: page;
        page-break-after: always;
      }
      .slide__header {
        display: grid;
        gap: 10px;
      }
      .slide__header--ribbon {
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
      }
      .slide__header--spotlight {
        grid-template-columns: minmax(0, 1fr) auto;
        padding: 18px;
        border-radius: 22px;
        background: linear-gradient(135deg, var(--deck-surface), #ffffff);
      }
      .slide__header--minimal {
        grid-template-columns: minmax(0, 1fr) auto;
        border-bottom: 1px solid var(--deck-border);
        padding-bottom: 14px;
      }
      .slide__index {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 110px;
        border-radius: 999px;
        padding: 8px 14px;
        background: var(--deck-accent);
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .slide__header h2 {
        margin: 0;
        font-size: 28px;
        line-height: 1.1;
      }
      .slide__subtitle {
        margin: 8px 0 0;
        color: var(--deck-muted);
      }
      .slide__header p {
        margin: 0;
        color: var(--deck-muted);
      }
      .slide__beat {
        display: inline-flex;
        align-items: center;
        margin: 8px 0;
        border-radius: 999px;
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.78);
        color: var(--deck-accent);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .slide__headline {
        min-width: 220px;
        border: 1px solid var(--deck-border);
        border-radius: 20px;
        background: #ffffff;
        padding: 14px 16px;
        display: grid;
        gap: 4px;
      }
      .slide__headline-label {
        color: var(--deck-muted);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .slide__headline-value {
        font-size: 24px;
        line-height: 1.05;
      }
      .slide__headline-detail {
        font-size: 12px;
      }
      .slide__body {
        display: grid;
        gap: 18px;
      }
      .slide__body--balanced {
        grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.92fr);
      }
      .slide__body--insight {
        grid-template-columns: minmax(0, 1.1fr) minmax(320px, 1fr);
      }
      .slide__body--stacked {
        grid-template-columns: 1fr;
      }
      .slide__panel {
        border-radius: 24px;
        padding: 20px;
        display: grid;
        gap: 16px;
      }
      .slide__panel--soft {
        background: var(--deck-surface);
        border: 1px solid var(--deck-border);
      }
      .slide__panel--outlined {
        background: #ffffff;
        border: 2px solid var(--deck-border);
      }
      .slide__panel--solid {
        background: linear-gradient(180deg, var(--deck-surface), #ffffff);
        border: 1px solid var(--deck-border);
      }
      .slide__panel h3,
      .slide__meta h3 {
        margin: 0;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--deck-accent);
      }
      .slide__panel ul {
        margin: 0;
        padding-left: 20px;
        display: grid;
        gap: 12px;
      }
      .slide__panel li {
        line-height: 1.55;
      }
      .slide__meta {
        border-top: 1px solid var(--deck-border);
        padding-top: 14px;
        display: grid;
        gap: 8px;
      }
      .slide__meta:first-child {
        border-top: none;
        padding-top: 0;
      }
      .slide__meta p {
        margin: 0;
        color: var(--deck-muted);
        line-height: 1.55;
      }
      .slide-visual {
        display: grid;
        gap: 14px;
      }
      .slide-visual__header {
        display: grid;
        gap: 6px;
      }
      .slide-visual__header h3 {
        margin: 0;
      }
      .slide-visual__scorecards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .slide-visual__scorecard,
      .slide-visual__bar-row,
      .slide-visual__line-legend-item {
        border: 1px solid var(--deck-border);
        border-radius: 16px;
        background: #ffffff;
        padding: 12px;
      }
      .slide-visual__label {
        color: var(--deck-muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .slide-visual__value {
        display: block;
        margin-top: 6px;
        font-size: 24px;
        line-height: 1.1;
      }
      .slide-visual__note {
        margin: 8px 0 0;
        font-size: 12px;
        line-height: 1.45;
      }
      .slide-visual__bars {
        display: grid;
        gap: 12px;
      }
      .slide-visual__bar-copy {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .slide-visual__bar-track {
        margin-top: 10px;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.08);
        height: 12px;
        overflow: hidden;
      }
      .slide-visual__bar-fill {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--deck-accent), #40b3a6);
      }
      .slide-visual__line-shell {
        display: grid;
        gap: 12px;
      }
      .slide-visual__line-svg {
        width: 100%;
        max-height: 240px;
        border: 1px solid var(--deck-border);
        border-radius: 18px;
        background: #ffffff;
      }
      .slide-visual__line-legend {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      @media (max-width: 900px) {
        .slide {
          min-height: auto;
        }
        .slide__body,
        .slide__body--balanced,
        .slide__body--insight,
        .slide__body--stacked {
          grid-template-columns: 1fr;
        }
        .slide__header--ribbon,
        .slide__header--spotlight,
        .slide__header--minimal,
        .slide-visual__scorecards,
        .slide-visual__line-legend {
          grid-template-columns: 1fr;
        }
        .deck__hero-grid {
          grid-template-columns: 1fr;
        }
      }
      @media print {
        @page {
          size: landscape;
          margin: 10mm;
        }
        body {
          background: #ffffff;
        }
        .deck {
          width: 100%;
          padding: 0;
          gap: 0;
        }
        .deck__hero {
          display: none;
        }
        .slide {
          border-radius: 0;
          box-shadow: none;
          border: none;
          min-height: auto;
        }
      }
    </style>
  </head>
  <body>
    <main class="deck">
      <section class="deck__hero">
        <div class="deck__eyebrow">ReportForge Slide Deck</div>
        <h1>${escapeHtml(slidesBundle.title)}</h1>
        <p>${escapeHtml(template.description)}</p>
        <div class="deck__hero-meta">
          <span class="deck__hero-chip">${escapeHtml(template.audienceLabel)}</span>
          <span class="deck__hero-chip">${escapeHtml(template.narrativeStyle)}</span>
        </div>
        <div class="deck__hero-grid">
          <div class="deck__hero-card">
            <strong>Visual Direction</strong>
            <p>${escapeHtml(template.visualDirection)}</p>
          </div>
          <div class="deck__hero-card">
            <strong>Storytelling Brief</strong>
            <p>${escapeHtml(template.storytellingDirective)}</p>
          </div>
        </div>
      </section>
      ${slideMarkup}
    </main>
  </body>
</html>`;
}

export async function generateSlideTemplateWithLlm(
  config: LlmProviderConfig,
  secret: LlmSessionSecret | null,
  templateId: string,
  fallbackTheme: ReportTheme,
  context: {
    userPrompt: string;
    reportPrompt: string;
    audience: string;
    reportTitle: string;
    reportSubtitle: string;
    slideCount: number;
    slideTitles?: string[];
    sampleTakeaways?: string[];
    visualKinds?: string[];
  }
): Promise<SavedSlideTemplate> {
  const payload = await requestLlmJson<SlideTemplatePayload>(
    config,
    secret,
    SLIDE_TEMPLATE_SYSTEM_PROMPT,
    context
  );
  return sanitizeTemplatePayload(templateId, payload, fallbackTheme, context.userPrompt);
}

function resolveImplicationLabel(slide: GeneratedSlidesBundle["slides"][number]): string {
  switch (slide.purpose) {
    case "recommendation":
      return "Why This Action";
    case "anomaly":
      return "Risk Read";
    default:
      return "Business Read";
  }
}

function resolveRecommendationLabel(slide: GeneratedSlidesBundle["slides"][number]): string {
  return slide.purpose === "recommendation" ? "Next Move" : "Action Cue";
}

function resolveNotesLabel(slide: GeneratedSlidesBundle["slides"][number]): string {
  return slide.purpose === "methodology" ? "Assumptions" : "Presenter Notes";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
