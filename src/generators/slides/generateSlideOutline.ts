import {
  DatasetProfile,
  GeneratedSlidesBundle,
  PromptInterpretation,
  ReportPlan,
  ReportTheme,
  SlideOutline,
  StoryPagePlan,
} from "../../shared/types";
import { escapeHtml as escapeHtmlValue } from "../../utils/formatting";
import {
  createChartVisual,
  createKpiScorecardVisual,
  createProfileScorecardVisual,
  renderSlideVisualHtml,
} from "../../services/slides/slideVisuals";

export function generateSlideOutline(
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  plan: ReportPlan
): GeneratedSlidesBundle {
  const slides = buildSlides(profile, prompt, plan);

  return composeSlidesBundle(plan.title, plan.excel.theme, slides);
}

export function composeSlidesBundle(
  reportTitle: string,
  theme: ReportTheme,
  slides: SlideOutline[]
): GeneratedSlidesBundle {
  return {
    title: `${reportTitle} Slide Outline`,
    slides,
    markdown: buildMarkdown(reportTitle, slides),
    json: JSON.stringify(
      {
        title: `${reportTitle} Slide Outline`,
        slides,
      },
      null,
      2
    ),
    html: buildSlideDeckHtml(reportTitle, slides),
    theme,
  };
}

function buildSlides(
  profile: DatasetProfile,
  prompt: PromptInterpretation,
  plan: ReportPlan
): SlideOutline[] {
  const storyPages = plan.storyPages.slice(0, prompt.slideCount);
  const slides = storyPages.map((page, index) =>
    buildStoryPageSlide(page, index + 1, plan, profile)
  );

  while (slides.length < prompt.slideCount) {
    slides.push(buildMethodologySlide(slides.length + 1, plan, profile));
  }

  return slides.slice(0, prompt.slideCount);
}

function buildStoryPageSlide(
  page: StoryPagePlan,
  index: number,
  plan: ReportPlan,
  profile: DatasetProfile
): SlideOutline {
  const kpis = plan.excel.kpis.filter((entry) => page.metricLabels.includes(entry.label));
  const firstKpi = kpis[0] ?? plan.excel.kpis[0];
  const matchingChart = page.chartId
    ? plan.excel.charts.find((entry) => entry.id === page.chartId)
    : undefined;
  const narrativeLabel = resolveNarrativeLabel(page);
  const visualLabel = resolveVisualLabel(page);

  return {
    index,
    title: page.title,
    subtitle: page.subtitle,
    purpose: page.purpose,
    layoutFamily: page.layoutFamily,
    storyBeat: page.storyBeat,
    narrativeLabel,
    visualLabel,
    bullets: page.evidence,
    evidencePoints: page.evidence,
    takeaway: page.narrativeAngle,
    chartSuggestion: page.visualRationale,
    chartCaption: `${page.visualTitle}. ${page.visualRationale}`,
    implication: page.implication,
    recommendation: page.recommendation ?? page.callToAction,
    speakerNotes: [page.distinctJob, page.implication, page.recommendation, page.callToAction]
      .filter(Boolean)
      .join(" "),
    confidenceCaveat: plan.confidenceCaveat,
    sourceMetrics: page.metricLabels,
    headlineMetric: firstKpi
      ? {
          label: firstKpi.label,
          value: firstKpi.formattedValue,
          detail: firstKpi.insight,
        }
      : matchingChart
        ? {
            label: matchingChart.valueLabel,
            value: matchingChart.values[matchingChart.values.length - 1]?.toLocaleString() ?? "0",
            detail: matchingChart.insight,
          }
        : undefined,
    visual: buildPageVisual(page, plan, profile),
  };
}

function buildMethodologySlide(
  index: number,
  plan: ReportPlan,
  profile: DatasetProfile
): SlideOutline {
  return {
    index,
    title: "Scope, caveats, and evidence base stay visible",
    subtitle: "Reserve the final page for assumptions only when the audience needs them.",
    purpose: "methodology",
    layoutFamily: "detail-table",
    storyBeat: "Keep the evidence base defensible",
    narrativeLabel: "Evidence Base",
    visualLabel: "Scope View",
    bullets: [
      plan.brief.datasetSummary,
      `Preferred KPIs: ${plan.brief.preferredKpis.join(", ") || "Not specified"}.`,
      ...plan.brief.constraints.slice(0, 1),
    ].filter(Boolean),
    evidencePoints: [
      `Rows analysed: ${profile.dataRowCount.toLocaleString()}.`,
      `Completeness: ${Math.round(profile.completeness * 100)}%.`,
      ...profile.notes.slice(0, 1),
    ].filter(Boolean),
    takeaway:
      "Keep the methodology page optional so it supports, rather than repeats, the core story.",
    chartSuggestion: "Use a compact scope card rather than another headline chart.",
    chartCaption: "The scope card protects credibility without diluting the main storyline.",
    implication: plan.confidenceCaveat,
    speakerNotes: [plan.confidenceCaveat, ...plan.brief.assumptions].filter(Boolean).join(" "),
    confidenceCaveat: plan.confidenceCaveat,
    sourceMetrics: plan.brief.preferredKpis,
    visual: createProfileScorecardVisual(profile),
  };
}

function buildPageVisual(page: StoryPagePlan, plan: ReportPlan, profile: DatasetProfile) {
  if (page.visualKind === "kpi-strip" || page.visualKind === "highlight") {
    const kpis = plan.excel.kpis.filter((entry) => page.metricLabels.includes(entry.label));
    return createKpiScorecardVisual(
      kpis.length > 0 ? kpis : plan.excel.kpis.slice(0, 4),
      page.visualTitle,
      page.visualRationale
    );
  }

  const chart = page.chartId
    ? plan.excel.charts.find((entry) => entry.id === page.chartId)
    : undefined;
  if (chart) {
    return createChartVisual(chart);
  }

  const kpis = plan.excel.kpis.filter((entry) => page.metricLabels.includes(entry.label));
  if (kpis.length > 0) {
    return createKpiScorecardVisual(kpis, page.visualTitle, page.visualRationale);
  }

  return createProfileScorecardVisual(profile);
}

function resolveNarrativeLabel(page: StoryPagePlan): string {
  switch (page.purpose) {
    case "executive-summary":
      return "What Matters Now";
    case "kpi-scorecard":
      return "KPI Story";
    case "trend-analysis":
      return "Trend Evidence";
    case "segment-comparison":
    case "product-mix":
    case "customer-channel-mix":
    case "geography":
      return "Comparison Evidence";
    case "anomaly":
      return "Watchouts";
    case "recommendation":
      return "Action Plan";
    default:
      return "Evidence Base";
  }
}

function resolveVisualLabel(page: StoryPagePlan): string {
  switch (page.purpose) {
    case "executive-summary":
      return "Opening Scorecard";
    case "kpi-scorecard":
      return "Priority Metrics";
    case "trend-analysis":
      return "Trend View";
    case "segment-comparison":
    case "product-mix":
    case "customer-channel-mix":
      return "Mix View";
    case "geography":
      return "Territory View";
    case "anomaly":
      return "Exception View";
    case "recommendation":
      return "Decision View";
    default:
      return "Scope View";
  }
}

function buildMarkdown(title: string, slides: SlideOutline[]): string {
  const lines = [`# ${title} Slide Outline`, ""];

  slides.forEach((slide) => {
    lines.push(`## Slide ${slide.index}: ${slide.title}`);
    if (slide.subtitle) {
      lines.push(`- Subtitle: ${slide.subtitle}`);
    }
    lines.push(`- Story beat: ${slide.storyBeat}`);
    lines.push(`- Visible message: ${slide.takeaway}`);
    if (slide.headlineMetric) {
      lines.push(
        `- Headline metric: ${slide.headlineMetric.label} = ${slide.headlineMetric.value} (${slide.headlineMetric.detail})`
      );
    }
    (slide.evidencePoints ?? slide.bullets).forEach((bullet) => {
      lines.push(`- ${bullet}`);
    });
    lines.push(`- Visual rationale: ${slide.chartSuggestion}`);
    if (slide.implication) {
      lines.push(`- Implication: ${slide.implication}`);
    }
    if (slide.recommendation) {
      lines.push(`- Recommendation: ${slide.recommendation}`);
    }
    if (slide.confidenceCaveat) {
      lines.push(`- Caveat: ${slide.confidenceCaveat}`);
    }
    if (slide.visual) {
      lines.push(`- Visual: ${slide.visual.title} (${slide.visual.kind})`);
    }
    lines.push(`- Speaker notes: ${slide.speakerNotes}`);
    lines.push("");
  });

  return lines.join("\n").trim();
}

function buildSlideDeckHtml(title: string, slides: SlideOutline[]): string {
  const slideMarkup = slides
    .map(
      (slide) => `
        <section class="slide">
          <header class="slide__header">
            <div class="slide__index">Slide ${escapeHtml(slide.index.toString())}</div>
            <div>
              <h2>${escapeHtml(slide.title)}</h2>
              ${slide.subtitle ? `<p class="slide__subtitle">${escapeHtml(slide.subtitle)}</p>` : ""}
              <div class="slide__beat">${escapeHtml(slide.storyBeat)}</div>
              <p class="slide__takeaway">${escapeHtml(slide.takeaway)}</p>
            </div>
            ${
              slide.headlineMetric
                ? `
                  <div class="slide__headline">
                    <span>${escapeHtml(slide.headlineMetric.label)}</span>
                    <strong>${escapeHtml(slide.headlineMetric.value)}</strong>
                    <p>${escapeHtml(slide.headlineMetric.detail)}</p>
                  </div>
                `
                : ""
            }
          </header>
          <div class="slide__body">
            <div class="slide__content">
              <h3>${escapeHtml(slide.narrativeLabel ?? "Key Message")}</h3>
              <ul>
                ${(slide.evidencePoints ?? slide.bullets)
                  .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
                  .join("")}
              </ul>
              ${
                slide.implication
                  ? `
                    <div class="slide__block slide__block--inline">
                      <h3>${escapeHtml(resolveImplicationLabel(slide))}</h3>
                      <p>${escapeHtml(slide.implication)}</p>
                    </div>
                  `
                  : ""
              }
              ${
                slide.recommendation
                  ? `
                    <div class="slide__block slide__block--inline">
                      <h3>${escapeHtml(resolveRecommendationLabel(slide))}</h3>
                      <p>${escapeHtml(slide.recommendation)}</p>
                    </div>
                  `
                  : ""
              }
            </div>
            <aside class="slide__aside">
              <div class="slide__block">
                ${renderSlideVisualHtml(slide.visual, {
                  accent: "#0f766e",
                  border: "#d6e7e4",
                  ink: "#17353a",
                  muted: "#617d81",
                  surface: "#f7fbfb",
                })}
                ${
                  !slide.visual
                    ? `
                      <h3>${escapeHtml(slide.visualLabel ?? "Visual Direction")}</h3>
                      <p>${escapeHtml(slide.chartSuggestion)}</p>
                    `
                    : `
                      <p class="slide__visual-caption">${escapeHtml(slide.chartCaption ?? slide.chartSuggestion)}</p>
                    `
                }
              </div>
              <div class="slide__block">
                <h3>${escapeHtml(resolveNotesLabel(slide))}</h3>
                <p>${escapeHtml(slide.speakerNotes)}</p>
                ${
                  slide.confidenceCaveat
                    ? `<p class="slide__visual-caption">${escapeHtml(slide.confidenceCaveat)}</p>`
                    : ""
                }
              </div>
            </aside>
          </div>
        </section>
      `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} Slide Deck</title>
    <style>
      :root {
        color-scheme: light;
        --deck-ink: #17353a;
        --deck-muted: #617d81;
        --deck-accent: #0f766e;
        --deck-surface: #f7fbfb;
        --deck-border: #d6e7e4;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "Aptos", sans-serif;
        background: linear-gradient(180deg, #eef5f5, #f9fcfc);
        color: var(--deck-ink);
      }
      .deck {
        width: min(1200px, 100%);
        margin: 0 auto;
        padding: 32px 20px 48px;
        display: grid;
        gap: 24px;
      }
      .deck__hero {
        display: grid;
        gap: 10px;
      }
      .deck__hero h1 {
        margin: 0;
        font-size: 32px;
      }
      .deck__hero p {
        margin: 0;
        color: var(--deck-muted);
      }
      .slide {
        background: #ffffff;
        border: 1px solid var(--deck-border);
        border-radius: 24px;
        box-shadow: 0 18px 40px rgba(15, 55, 60, 0.08);
        min-height: 620px;
        padding: 28px;
        display: grid;
        gap: 20px;
        page-break-after: always;
      }
      .slide__header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
      }
      .slide__index {
        color: var(--deck-accent);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .slide__header h2 {
        margin: 0;
        font-size: 28px;
      }
      .slide__subtitle {
        margin-top: 8px;
        color: var(--deck-muted);
      }
      .slide__takeaway {
        margin-top: 8px;
        font-weight: 600;
      }
      .slide__beat {
        display: inline-flex;
        align-items: center;
        margin-top: 8px;
        border-radius: 999px;
        padding: 5px 10px;
        background: rgba(15, 118, 110, 0.1);
        color: var(--deck-accent);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .slide__headline {
        min-width: 220px;
        border: 1px solid var(--deck-border);
        border-radius: 18px;
        background: #ffffff;
        padding: 14px 16px;
        display: grid;
        gap: 4px;
      }
      .slide__headline span {
        color: var(--deck-muted);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .slide__headline strong {
        font-size: 24px;
      }
      .slide__headline p {
        font-size: 12px;
      }
      .slide__body {
        display: grid;
        grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.9fr);
        gap: 20px;
      }
      .slide__content,
      .slide__block {
        border: 1px solid var(--deck-border);
        border-radius: 18px;
        background: var(--deck-surface);
        padding: 18px;
      }
      .slide__aside {
        display: grid;
        gap: 18px;
      }
      .slide__block--inline {
        margin-top: 16px;
      }
      h3 {
        margin: 0 0 10px;
        font-size: 15px;
      }
      ul {
        margin: 0;
        padding-left: 20px;
        display: grid;
        gap: 10px;
      }
      p {
        margin: 0;
        color: var(--deck-muted);
        line-height: 1.5;
      }
      .slide__visual-caption {
        margin-top: 12px;
        font-size: 12px;
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
        margin-top: 8px;
        font-size: 12px;
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
      @media (max-width: 860px) {
        .slide {
          min-height: auto;
        }
        .slide__body {
          grid-template-columns: 1fr;
        }
        .slide__header {
          grid-template-columns: 1fr;
        }
        .slide-visual__scorecards,
        .slide-visual__line-legend {
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
          box-shadow: none;
          border-radius: 0;
          border: none;
          min-height: auto;
          break-after: page;
        }
      }
    </style>
  </head>
  <body>
    <main class="deck">
      <section class="deck__hero">
        <p>ReportForge PowerPoint-ready deck</p>
        <h1>${escapeHtml(title)} Slide Deck</h1>
        <p>Open this view in a browser for review, or print it to PDF for sharing.</p>
      </section>
      ${slideMarkup}
    </main>
  </body>
</html>`;
}

function resolveImplicationLabel(slide: SlideOutline): string {
  switch (slide.purpose) {
    case "recommendation":
      return "Why This Action";
    case "anomaly":
      return "Risk Read";
    default:
      return "Business Read";
  }
}

function resolveRecommendationLabel(slide: SlideOutline): string {
  return slide.purpose === "recommendation" ? "Next Move" : "Action Cue";
}

function resolveNotesLabel(slide: SlideOutline): string {
  return slide.purpose === "methodology" ? "Assumptions" : "Presenter Notes";
}

function escapeHtml(value: string): string {
  return escapeHtmlValue(value);
}
