import {
  StoryLayoutFamily,
  StoryPagePlan,
  StoryPagePurpose,
  StoryPlanValidationIssue,
} from "../../shared/types";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

function titleSimilarity(left: string, right: string): number {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / Math.max(union, 1);
}

function alternateLayout(purpose: StoryPagePurpose, current: StoryLayoutFamily): StoryLayoutFamily {
  switch (purpose) {
    case "executive-summary":
      return current === "hero-metrics" ? "scorecard-grid" : "hero-metrics";
    case "trend-analysis":
      return current === "trend-focus" ? "comparison-grid" : "trend-focus";
    case "segment-comparison":
    case "product-mix":
    case "customer-channel-mix":
    case "geography":
      return current === "comparison-grid" ? "mix-dashboard" : "comparison-grid";
    case "anomaly":
      return "exception-focus";
    case "recommendation":
      return "action-checklist";
    default:
      return current;
  }
}

function hasRepeatedMetrics(previous: StoryPagePlan | undefined, current: StoryPagePlan): boolean {
  if (!previous) {
    return false;
  }
  const previousMetrics = new Set(previous.metricLabels);
  const overlap = current.metricLabels.filter((metric) => previousMetrics.has(metric)).length;
  return (
    overlap > 0 &&
    overlap === current.metricLabels.length &&
    overlap === previous.metricLabels.length
  );
}

export function validateStoryPages(pages: StoryPagePlan[]): StoryPlanValidationIssue[] {
  const issues: StoryPlanValidationIssue[] = [];

  pages.forEach((page, index) => {
    const previous = index > 0 ? pages[index - 1] : undefined;

    if (previous && previous.purpose === page.purpose) {
      issues.push({
        code: "duplicate-purpose",
        severity: "warning",
        message: `${page.title} repeats the same page purpose as the previous page.`,
        pageId: page.id,
      });
    }

    if (previous && previous.layoutFamily === page.layoutFamily) {
      issues.push({
        code: "duplicate-layout",
        severity: "warning",
        message: `${page.title} reuses the same layout family as the previous page.`,
        pageId: page.id,
      });
    }

    if (previous && hasRepeatedMetrics(previous, page) && page.purpose !== "executive-summary") {
      issues.push({
        code: "repeated-kpis",
        severity: "warning",
        message: `${page.title} repeats the same KPI cluster without adding a distinct job.`,
        pageId: page.id,
      });
    }

    if (previous && titleSimilarity(previous.title, page.title) >= 0.6) {
      issues.push({
        code: "similar-title",
        severity: "warning",
        message: `${page.title} is too close to the previous page title.`,
        pageId: page.id,
      });
    }
  });

  if (!pages.some((page) => page.purpose === "recommendation")) {
    issues.push({
      code: "missing-action",
      severity: "critical",
      message: "The story plan never closes on a decision or action page.",
    });
  }

  return issues;
}

function distinguishTitle(page: StoryPagePlan): string {
  if (page.dimensionKey) {
    return `${page.title} by ${page.dimensionKey}`;
  }
  if (page.metricLabels[0]) {
    return `${page.title} on ${page.metricLabels[0]}`;
  }
  return `${page.title} with a distinct follow-up angle`;
}

function trimRepeatedMetrics(
  previous: StoryPagePlan | undefined,
  current: StoryPagePlan
): string[] {
  if (!previous) {
    return current.metricLabels;
  }
  const previousMetrics = new Set(previous.metricLabels);
  const filtered = current.metricLabels.filter((metric) => !previousMetrics.has(metric));
  return filtered.length > 0 ? filtered : current.metricLabels.slice(0, 1);
}

export function repairStoryPages(pages: StoryPagePlan[]): StoryPagePlan[] {
  const repaired: StoryPagePlan[] = [];

  pages.forEach((page) => {
    const previous = repaired[repaired.length - 1];
    let nextPage = page;

    if (previous && previous.purpose === nextPage.purpose) {
      nextPage = {
        ...nextPage,
        layoutFamily: alternateLayout(nextPage.purpose, nextPage.layoutFamily),
      };
    }

    if (previous && previous.layoutFamily === nextPage.layoutFamily) {
      nextPage = {
        ...nextPage,
        layoutFamily: alternateLayout(nextPage.purpose, nextPage.layoutFamily),
      };
    }

    if (
      previous &&
      hasRepeatedMetrics(previous, nextPage) &&
      nextPage.purpose !== "executive-summary"
    ) {
      nextPage = {
        ...nextPage,
        metricLabels: trimRepeatedMetrics(previous, nextPage),
      };
    }

    if (previous && titleSimilarity(previous.title, nextPage.title) >= 0.6) {
      nextPage = {
        ...nextPage,
        title: distinguishTitle(nextPage),
      };
    }

    repaired.push(nextPage);
  });

  return repaired;
}
