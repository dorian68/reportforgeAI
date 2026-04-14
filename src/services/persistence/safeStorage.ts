/* global window */

import { DEFAULT_PERSISTENCE_STATUS } from "../../shared/constants";
import { PersistenceStatus } from "../../shared/types";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type StorageScope = "local" | "session";

let persistenceStatus: PersistenceStatus = { ...DEFAULT_PERSISTENCE_STATUS };

function cloneStatus(): PersistenceStatus {
  return {
    localAvailable: persistenceStatus.localAvailable,
    sessionAvailable: persistenceStatus.sessionAvailable,
    degraded: persistenceStatus.degraded,
    messages: [...persistenceStatus.messages],
  };
}

function markPersistenceIssue(scope: StorageScope, message: string): void {
  const nextMessages = persistenceStatus.messages.includes(message)
    ? persistenceStatus.messages
    : [...persistenceStatus.messages, message];

  persistenceStatus = {
    localAvailable: scope === "local" ? false : persistenceStatus.localAvailable,
    sessionAvailable: scope === "session" ? false : persistenceStatus.sessionAvailable,
    degraded: true,
    messages: nextMessages,
  };
}

function resolveWindowStorage(scope: StorageScope): StorageLike | null {
  if (typeof window === "undefined") {
    markPersistenceIssue(scope, "Browser storage is unavailable in the current runtime.");
    return null;
  }

  try {
    return scope === "session" ? (window.sessionStorage ?? null) : (window.localStorage ?? null);
  } catch (error) {
    markPersistenceIssue(
      scope,
      `Unable to access ${scope} storage in this Office runtime: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}

export function resetPersistenceStatus(): void {
  persistenceStatus = { ...DEFAULT_PERSISTENCE_STATUS };
}

export function getPersistenceStatus(): PersistenceStatus {
  return cloneStatus();
}

export function safeReadJson<T>(
  key: string,
  fallback: T,
  scope: StorageScope,
  storage?: StorageLike,
  label?: string
): T {
  const activeStorage = storage ?? resolveWindowStorage(scope);
  if (!activeStorage) {
    return fallback;
  }

  try {
    const raw = activeStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    markPersistenceIssue(
      scope,
      `Unable to read ${label ?? key} from ${scope} storage. Falling back to session defaults.`
    );
    return fallback;
  }
}

export function safeWriteJson<T>(
  key: string,
  value: T,
  scope: StorageScope,
  storage?: StorageLike,
  label?: string
): boolean {
  const activeStorage = storage ?? resolveWindowStorage(scope);
  if (!activeStorage) {
    return false;
  }

  try {
    activeStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    markPersistenceIssue(
      scope,
      `Unable to save ${label ?? key} to ${scope} storage. Persistence is running in degraded mode.`
    );
    return false;
  }
}

export function safeRemoveItem(
  key: string,
  scope: StorageScope,
  storage?: StorageLike,
  label?: string
): boolean {
  const activeStorage = storage ?? resolveWindowStorage(scope);
  if (!activeStorage) {
    return false;
  }

  try {
    activeStorage.removeItem(key);
    return true;
  } catch {
    markPersistenceIssue(scope, `Unable to clear ${label ?? key} from ${scope} storage.`);
    return false;
  }
}
