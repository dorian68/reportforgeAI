export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function safeHeaderName(raw: string, index: number): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : `Column ${index + 1}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function toTitleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function truncate(value: string, maxLength: number): string {
  if (maxLength <= 0) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 3) {
    return ".".repeat(maxLength);
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

export function makeUniqueLabels(values: string[]): string[] {
  const counts = new Map<string, number>();

  return values.map((value) => {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    return count === 1 ? value : `${value} ${count}`;
  });
}

export function formatMetricValue(value: number, header?: string): string {
  const lowerHeader = header?.toLowerCase() ?? "";
  if (lowerHeader.includes("rate") || lowerHeader.includes("margin") || lowerHeader.includes("%")) {
    return `${value.toFixed(1)}%`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }

  return value.toFixed(2);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
