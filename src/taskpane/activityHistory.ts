import { ACTIVITY_HISTORY_MAX_ENTRIES, STORAGE_KEYS } from "../shared/constants";
import { safeReadJson, safeWriteJson, StorageLike } from "../services/persistence/safeStorage";

export type ActivityStatus = "info" | "success" | "warning" | "error";

export interface ActivityEntry {
  id: string;
  area: string;
  title: string;
  detail: string;
  status: ActivityStatus;
  occurredAt: string;
  operationId?: string;
}

export interface ActivityDraft {
  area: string;
  title: string;
  detail: string;
  status: ActivityStatus;
  operationId?: string;
}

export function createActivityEntry(draft: ActivityDraft): ActivityEntry {
  return {
    id: `activity_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: new Date().toISOString(),
    ...draft,
  };
}

export function mergeActivityEntry(
  currentEntries: ActivityEntry[],
  entry: ActivityEntry
): ActivityEntry[] {
  return [entry, ...currentEntries].slice(0, ACTIVITY_HISTORY_MAX_ENTRIES);
}

export function loadActivityHistory(storage?: StorageLike): ActivityEntry[] {
  const entries = safeReadJson<ActivityEntry[]>(
    STORAGE_KEYS.activityHistory,
    [],
    "session",
    storage,
    "activity history"
  );

  return Array.isArray(entries) ? entries.slice(0, ACTIVITY_HISTORY_MAX_ENTRIES) : [];
}

export function saveActivityHistory(
  entries: ActivityEntry[],
  storage?: StorageLike
): ActivityEntry[] {
  const trimmed = entries.slice(0, ACTIVITY_HISTORY_MAX_ENTRIES);
  safeWriteJson(STORAGE_KEYS.activityHistory, trimmed, "session", storage, "activity history");
  return trimmed;
}

export function addActivityEntry(
  currentEntries: ActivityEntry[],
  draft: ActivityDraft,
  storage?: StorageLike
): ActivityEntry[] {
  const nextEntries = mergeActivityEntry(currentEntries, createActivityEntry(draft));
  saveActivityHistory(nextEntries, storage);
  return nextEntries;
}
