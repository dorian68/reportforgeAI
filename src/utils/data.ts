import { PrimitiveCellValue } from "../shared/types";

export function normalizeCellValue(value: PrimitiveCellValue): PrimitiveCellValue {
  if (value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return value;
}

export function cellToDisplay(value: PrimitiveCellValue, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

export function tryParseNumber(value: PrimitiveCellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (normalized.length === 0) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function isDateFormat(format: string): boolean {
  return /[dymhs]/i.test(format) && !format.includes("@");
}

export function tryParseDate(
  value: PrimitiveCellValue,
  textValue: string,
  numberFormat?: string
): string | null {
  if (numberFormat && isDateFormat(numberFormat)) {
    if (typeof value === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
      return excelEpoch.toISOString().slice(0, 10);
    }
  }

  const candidate = textValue || (typeof value === "string" ? value : "");
  if (!candidate) {
    return null;
  }

  const normalizedCandidate = candidate.trim();
  const looksLikePlainNumber = /^-?\d+(\.\d+)?$/.test(normalizedCandidate);
  const hasDateSeparators = /[-/:]/.test(normalizedCandidate);
  const hasMonthText = /[a-z]/i.test(normalizedCandidate);
  if (!hasDateSeparators && !hasMonthText && looksLikePlainNumber) {
    return null;
  }

  const parsed = Date.parse(normalizedCandidate);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

export function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

export function topRows<T>(rows: T[], maxRows: number): T[] {
  return rows.slice(0, Math.max(maxRows, 0));
}
