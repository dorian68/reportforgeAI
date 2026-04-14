import { DIAGNOSTICS_MAX_ENTRIES } from "../../shared/constants";
import { DiagnosticEntry, DiagnosticLevel } from "../../shared/types";

const diagnostics: DiagnosticEntry[] = [];

function createEntryId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createOperationId(area: string): string {
  return createEntryId(area.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "op");
}

export function recordDiagnosticEvent(
  level: DiagnosticLevel,
  area: string,
  message: string,
  details?: string
): DiagnosticEntry {
  const entry: DiagnosticEntry = {
    id: createEntryId("diag"),
    timestamp: new Date().toISOString(),
    level,
    area,
    message,
    details,
  };

  diagnostics.unshift(entry);
  if (diagnostics.length > DIAGNOSTICS_MAX_ENTRIES) {
    diagnostics.length = DIAGNOSTICS_MAX_ENTRIES;
  }

  return entry;
}

export function getDiagnosticEntries(): DiagnosticEntry[] {
  return diagnostics.map((entry) => ({ ...entry }));
}

export function buildDiagnosticsBundle(context: Record<string, unknown>): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      context,
      entries: getDiagnosticEntries(),
    },
    null,
    2
  );
}

export function clearDiagnostics(): void {
  diagnostics.length = 0;
}
