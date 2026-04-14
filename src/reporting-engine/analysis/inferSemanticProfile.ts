import { ReportForgeBundle } from "../../shared/types";
import { NormalizedReportRequest, DatasetSemanticProfile } from "../domain/types";

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function inferEnterpriseLens(
  bundle: ReportForgeBundle,
  request: NormalizedReportRequest
): DatasetSemanticProfile["enterpriseLens"] {
  const signature = [
    request.audience,
    request.objective,
    request.businessContext,
    bundle.prompt.rawPrompt,
    ...bundle.profile.headers,
    ...bundle.profile.notes,
  ]
    .join(" ")
    .toLowerCase();

  if (
    /\bclaim|policy|premium|renewal|underwriting|reserve|severity|broker|branch\b/.test(signature)
  ) {
    return "insurance";
  }

  if (/\bportfolio|exposure|loan|deposit|branch|desk|npl|liquidity|bank\b/.test(signature)) {
    return "banking";
  }

  if (/\brisk|incident|control|compliance|breach|loss event\b/.test(signature)) {
    return "risk";
  }

  if (/\bfinance|margin|budget|target|variance|cfo|controlling\b/.test(signature)) {
    return "finance";
  }

  if (request.audience === "client") {
    return "client";
  }

  return "general";
}

function inferTimeDimension(bundle: ReportForgeBundle): string | null {
  const dateColumn = bundle.profile.columns.find(
    (column) =>
      column.kind === "date" &&
      column.role === "dimension" &&
      column.uniqueCount >= 3 &&
      column.uniqueCount < Math.max(4, bundle.profile.dataRowCount)
  );

  if (dateColumn) {
    return dateColumn.header;
  }

  const semanticDateColumn = bundle.profile.columns.find((column) => {
    const header = normalize(column.header);
    return (
      column.role === "dimension" &&
      /\bdate|month|week|quarter|year|period\b/.test(header) &&
      column.uniqueCount >= 3 &&
      column.uniqueCount < Math.max(4, bundle.profile.dataRowCount)
    );
  });

  return semanticDateColumn?.header ?? null;
}

export function inferSemanticProfile(
  bundle: ReportForgeBundle,
  request: NormalizedReportRequest
): DatasetSemanticProfile {
  const timeDimension = inferTimeDimension(bundle);
  const metricColumns = bundle.profile.columns
    .filter((column) => column.role === "measure")
    .map((column) => column.header);
  const identifierColumns = bundle.profile.columns
    .filter(
      (column) =>
        column.role === "identifier" ||
        /\b(id|identifier|ticket|reference|account|policy|claim)\b/i.test(column.header)
    )
    .map((column) => column.header);
  const dimensionColumns = bundle.profile.columns
    .filter(
      (column) =>
        column.role === "dimension" &&
        column.header !== timeDimension &&
        !identifierColumns.includes(column.header)
    )
    .map((column) => column.header);

  const comparisonModes = [
    timeDimension ? "trend" : "",
    dimensionColumns.length > 0 ? "segment" : "",
    metricColumns.some((metric) => /\btarget|budget|plan|forecast\b/i.test(metric))
      ? "variance-vs-target"
      : "",
    metricColumns.some((metric) => /\bmargin|rate|ratio|severity|loss\b/i.test(metric))
      ? "ratio-quality"
      : "",
    dimensionColumns.length > 0 && metricColumns.length > 0 ? "ranking-and-concentration" : "",
  ].filter(Boolean);

  const notes: string[] = [];
  if (!timeDimension) {
    notes.push(
      "No reliable time dimension was detected, so the story should avoid artificial trend commentary."
    );
  }
  if (identifierColumns.length > 0) {
    notes.push(
      `Identifier-style fields excluded from trend logic: ${identifierColumns.join(", ")}.`
    );
  }
  if (metricColumns.length === 0) {
    notes.push(
      "No numeric measure was detected, so the report should emphasize coverage, quality, and operational signals."
    );
  }

  return {
    sourceLabel: bundle.profile.sourceLabel,
    enterpriseLens: inferEnterpriseLens(bundle, request),
    timeDimension,
    metricColumns,
    dimensionColumns,
    identifierColumns,
    comparisonModes,
    notes,
  };
}
