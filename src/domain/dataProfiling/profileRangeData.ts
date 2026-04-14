import { MAX_CHART_POINTS } from "../../shared/constants";
import {
  ChartPlan,
  ColumnKind,
  ColumnProfile,
  ColumnRole,
  DatasetProfile,
  KpiRecommendation,
  PrimitiveCellValue,
  RangeSnapshot,
} from "../../shared/types";
import {
  formatMetricValue,
  formatPercent,
  makeUniqueLabels,
  safeHeaderName,
  slugify,
  truncate,
} from "../../utils/formatting";
import {
  normalizeCellValue,
  topRows,
  tryParseDate,
  tryParseNumber,
  uniqueNonEmpty,
} from "../../utils/data";

interface ColumnAccumulator {
  header: string;
  key: string;
  rawValues: PrimitiveCellValue[];
  textValues: string[];
  numberFormats: string[];
}

interface AggregatePoint {
  category: string;
  value: number;
}

export function profileRangeData(snapshot: RangeSnapshot): DatasetProfile {
  const hasHeaders = detectHeaders(snapshot);
  const headerRow = hasHeaders ? (snapshot.text[0] ?? []) : [];
  const headers = makeUniqueLabels(
    Array.from({ length: snapshot.columnCount }, (_, index) =>
      safeHeaderName(headerRow[index] ?? "", index)
    )
  );
  const dataStart = hasHeaders ? 1 : 0;
  const dataValues = snapshot.values.slice(dataStart);
  const dataText = snapshot.text.slice(dataStart);
  const dataFormats = snapshot.numberFormats.slice(dataStart);

  const columnAccumulators = headers.map<ColumnAccumulator>((header, index) => ({
    header,
    key: slugify(header || `column-${index + 1}`),
    rawValues: dataValues.map((row) => normalizeCellValue(row[index] ?? null)),
    textValues: dataText.map((row) => String(row[index] ?? "").trim()),
    numberFormats: dataFormats.map((row) => String(row[index] ?? "")),
  }));

  const columns = columnAccumulators.map((column, index) => buildColumnProfile(column, index));
  const dataRowCount = dataValues.length;
  const emptyCellCount = columns.reduce((sum, column) => sum + column.emptyCount, 0);
  const completeness =
    snapshot.rowCount * snapshot.columnCount === 0
      ? 0
      : 1 - emptyCellCount / Math.max(dataRowCount * snapshot.columnCount, 1);
  const primaryMeasures = columns
    .filter((column) => column.role === "measure")
    .map((column) => column.header);
  const primaryDimensions = columns
    .filter((column) => column.role === "dimension")
    .map((column) => column.header)
    .slice(0, 3);

  const kpis = buildKpis(columns, dataRowCount, completeness);
  const chartCandidates = buildChartCandidates(columns, columnAccumulators);
  const notes = buildNotes(columns, completeness, dataRowCount, chartCandidates.length);

  return {
    sourceLabel: `${snapshot.sheetName} ${snapshot.address}`,
    hasHeaders,
    rowCount: snapshot.rowCount,
    columnCount: snapshot.columnCount,
    dataRowCount,
    emptyCellCount,
    completeness,
    datasetShape: classifyDatasetShape(snapshot.columnCount, dataRowCount, completeness),
    headers,
    columns,
    primaryMeasures,
    primaryDimensions,
    kpis,
    chartCandidates,
    notes,
  };
}

function detectHeaders(snapshot: RangeSnapshot): boolean {
  const firstRowValues = snapshot.values[0] ?? [];
  const secondRowValues = snapshot.values[1] ?? [];
  const firstRowText = snapshot.text[0] ?? [];

  const firstRowStringCount = firstRowValues.filter((value, index) => {
    const textValue = String(firstRowText[index] ?? "").trim();
    return typeof normalizeCellValue(value ?? null) === "string" && textValue.length > 0;
  }).length;
  const firstRowNumericCount = firstRowValues.filter(
    (value) => tryParseNumber(value ?? null) !== null
  ).length;
  const secondRowNumericCount = secondRowValues.filter(
    (value) => tryParseNumber(value ?? null) !== null
  ).length;

  const nonEmptyFirstRow = firstRowValues.filter(
    (value) => normalizeCellValue(value ?? null) !== null
  ).length;
  if (nonEmptyFirstRow === 0) {
    return false;
  }

  const stringRatio = firstRowStringCount / nonEmptyFirstRow;
  const numericRatio = firstRowNumericCount / nonEmptyFirstRow;
  return stringRatio >= 0.6 && numericRatio <= 0.4 && secondRowNumericCount >= firstRowNumericCount;
}

function buildColumnProfile(column: ColumnAccumulator, index: number): ColumnProfile {
  const nonEmptyValues = column.rawValues.filter((value) => value !== null);
  const emptyCount = column.rawValues.length - nonEmptyValues.length;
  const textValues = column.textValues.map((value) => value.trim());
  const nonEmptyTextValues = textValues.filter((value) => value.length > 0);
  const uniqueValues = uniqueNonEmpty(nonEmptyTextValues);
  const numericValues = column.rawValues
    .map((value) => tryParseNumber(value))
    .filter((value): value is number => value !== null);
  const dateValues = column.rawValues
    .map((value, rowIndex) =>
      tryParseDate(value, column.textValues[rowIndex] ?? "", column.numberFormats[rowIndex] ?? "")
    )
    .filter((value): value is string => value !== null);

  const nonEmptyCount = nonEmptyValues.length;
  const completeness = column.rawValues.length === 0 ? 0 : nonEmptyCount / column.rawValues.length;
  const kind = detectColumnKind(
    nonEmptyCount,
    numericValues.length,
    dateValues.length,
    uniqueValues.length,
    column.rawValues.length
  );
  const role = detectColumnRole(kind, uniqueValues.length, nonEmptyCount);

  return {
    index,
    key: column.key,
    header: column.header,
    kind,
    role,
    nonEmptyCount,
    emptyCount,
    uniqueCount: uniqueValues.length,
    completeness,
    sampleValues: topRows(nonEmptyTextValues, 3).map((value) => truncate(value, 24)),
    numericSummary: buildNumericSummary(numericValues),
    dateSummary:
      dateValues.length > 0
        ? {
            minIso: [...dateValues].sort()[0],
            maxIso: [...dateValues].sort()[dateValues.length - 1],
          }
        : undefined,
  };
}

function buildNumericSummary(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  let min = values[0];
  let max = values[0];
  let sum = 0;

  for (const value of values) {
    if (value < min) {
      min = value;
    }

    if (value > max) {
      max = value;
    }

    sum += value;
  }

  return {
    min,
    max,
    sum,
    average: sum / values.length,
  };
}

function detectColumnKind(
  nonEmptyCount: number,
  numericCount: number,
  dateCount: number,
  uniqueCount: number,
  totalCount: number
): ColumnKind {
  if (nonEmptyCount === 0) {
    return "empty";
  }

  if (dateCount / nonEmptyCount >= 0.6) {
    return "date";
  }

  if (numericCount / nonEmptyCount >= 0.7) {
    return "numeric";
  }

  if (uniqueCount <= Math.max(12, Math.floor(totalCount * 0.4))) {
    return "categorical";
  }

  if (numericCount > 0 || dateCount > 0) {
    return "mixed";
  }

  return "text";
}

function detectColumnRole(
  kind: ColumnKind,
  uniqueCount: number,
  nonEmptyCount: number
): ColumnRole {
  if (kind === "numeric") {
    return "measure";
  }

  if (kind === "date" || kind === "categorical") {
    return "dimension";
  }

  if (kind === "text" && nonEmptyCount > 0 && uniqueCount / nonEmptyCount > 0.85) {
    return "identifier";
  }

  return "unknown";
}

function buildKpis(
  columns: ColumnProfile[],
  rowCount: number,
  completeness: number
): KpiRecommendation[] {
  const measureColumns = columns
    .filter((column) => column.role === "measure" && column.numericSummary)
    .sort((left, right) => right.completeness - left.completeness)
    .slice(0, 4);

  if (measureColumns.length === 0) {
    return [
      {
        id: "rows-covered",
        label: "Rows Analyzed",
        aggregation: "count",
        rawValue: rowCount,
        formattedValue: rowCount.toLocaleString(),
        insight: "Selected data rows available for reporting outputs.",
      },
      {
        id: "completeness",
        label: "Completeness",
        aggregation: "count",
        rawValue: completeness * 100,
        formattedValue: formatPercent(completeness),
        insight: "Share of populated cells across the selected range.",
      },
    ];
  }

  return measureColumns.map((column) => {
    const lowerHeader = column.header.toLowerCase();
    const aggregation =
      lowerHeader.includes("avg") || lowerHeader.includes("rate") || lowerHeader.includes("margin")
        ? "average"
        : "sum";
    const rawValue =
      aggregation === "average" ? column.numericSummary!.average : column.numericSummary!.sum;

    return {
      id: column.key,
      label: column.header,
      columnKey: column.key,
      aggregation,
      rawValue,
      formattedValue: formatMetricValue(rawValue, column.header),
      insight:
        aggregation === "average"
          ? `Average value across ${column.nonEmptyCount.toLocaleString()} populated records.`
          : `Total contribution across ${column.nonEmptyCount.toLocaleString()} populated records.`,
    };
  });
}

function buildChartCandidates(
  columns: ColumnProfile[],
  accumulators: ColumnAccumulator[]
): ChartPlan[] {
  const dimensionColumns = columns.filter((column) => column.role === "dimension");
  const measureColumns = columns.filter(
    (column) => column.role === "measure" && column.numericSummary
  );
  const charts: ChartPlan[] = [];

  for (const dimension of dimensionColumns) {
    for (const measure of measureColumns) {
      const aggregate = aggregateDimensionValues(
        accumulators[dimension.index],
        accumulators[measure.index],
        dimension.kind
      );
      if (aggregate.length < 2) {
        continue;
      }

      charts.push({
        id: `${dimension.key}-${measure.key}`,
        title: `${measure.header} by ${dimension.header}`,
        kind: dimension.kind === "date" ? "line" : aggregate.length <= 5 ? "doughnut" : "column",
        categoryLabel: dimension.header,
        valueLabel: measure.header,
        categories: aggregate.map((point) => point.category),
        values: aggregate.map((point) => point.value),
        insight:
          dimension.kind === "date"
            ? "Trend view for the leading measure over time."
            : `Grouped comparison across ${aggregate.length} ${dimension.header.toLowerCase()} values.`,
      });

      if (charts.length >= 3) {
        return charts;
      }
    }
  }

  return charts;
}

function aggregateDimensionValues(
  dimension: ColumnAccumulator,
  measure: ColumnAccumulator,
  dimensionKind: ColumnKind
): AggregatePoint[] {
  const grouped = new Map<string, number>();

  dimension.textValues.forEach((label, index) => {
    const category = label.trim();
    const numericValue = tryParseNumber(measure.rawValues[index] ?? null);
    if (!category || numericValue === null) {
      return;
    }

    grouped.set(category, (grouped.get(category) ?? 0) + numericValue);
  });

  const points = Array.from(grouped.entries()).map(([category, value]) => ({ category, value }));

  points.sort((left, right) =>
    dimensionKind === "date"
      ? left.category.localeCompare(right.category)
      : right.value - left.value
  );

  return points.slice(0, MAX_CHART_POINTS);
}

function classifyDatasetShape(
  columnCount: number,
  dataRowCount: number,
  completeness: number
): DatasetProfile["datasetShape"] {
  if (completeness < 0.7) {
    return "sparse";
  }

  if (columnCount >= 10) {
    return "wide";
  }

  if (dataRowCount <= 20) {
    return "compact";
  }

  return "tabular";
}

function buildNotes(
  columns: ColumnProfile[],
  completeness: number,
  dataRowCount: number,
  chartCount: number
): string[] {
  const notes: string[] = [];

  if (columns.some((column) => column.kind === "date")) {
    notes.push("Date-oriented fields detected, so trend reporting can be emphasized.");
  }

  if (columns.filter((column) => column.role === "measure").length === 0) {
    notes.push(
      "No strong numeric measure was detected; fallback KPI blocks will focus on scope and completeness."
    );
  }

  if (completeness < 0.85) {
    notes.push(
      `Dataset completeness is ${formatPercent(completeness)}, so report copy should acknowledge data gaps.`
    );
  }

  if (chartCount === 0) {
    notes.push(
      "No clean dimension/measure pair was found for charts, so the report will bias toward tables and summary copy."
    );
  }

  if (dataRowCount < 5) {
    notes.push(
      "The selected dataset is small; outputs will focus on compact summaries rather than trend analysis."
    );
  }

  return notes;
}
