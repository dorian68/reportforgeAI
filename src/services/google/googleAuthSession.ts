import { GoogleOAuthRuntimeState, GoogleTokenRecord } from "../../shared/types";

function toIsoString(now: number): string {
  return new Date(now).toISOString();
}

function normalizeString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function normalizeGoogleScopeList(scopes: Iterable<string>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const scope of scopes) {
    const nextScope = normalizeString(scope);
    if (!nextScope || seen.has(nextScope)) {
      continue;
    }

    seen.add(nextScope);
    normalized.push(nextScope);
  }

  return normalized;
}

export function createEmptyGoogleOAuthRuntimeState(): GoogleOAuthRuntimeState {
  return {
    status: "idle",
    requestId: null,
    prompt: "",
    requestedScopes: [],
    grantedScopes: [],
    startedAt: null,
    completedAt: null,
    lastError: "",
    lastErrorCode: "",
  };
}

export function beginGoogleOAuthRuntimeState(
  scopes: string[],
  prompt: "" | "consent",
  requestId: string,
  now = Date.now()
): GoogleOAuthRuntimeState {
  return {
    status: "connecting",
    requestId,
    prompt,
    requestedScopes: normalizeGoogleScopeList(scopes),
    grantedScopes: [],
    startedAt: toIsoString(now),
    completedAt: null,
    lastError: "",
    lastErrorCode: "",
  };
}

export function completeGoogleOAuthRuntimeState(
  current: GoogleOAuthRuntimeState,
  token: GoogleTokenRecord,
  requestId: string,
  now = Date.now()
): GoogleOAuthRuntimeState {
  if (current.requestId && current.requestId !== requestId) {
    return current;
  }

  return {
    ...current,
    status: "connected",
    requestId: null,
    grantedScopes: normalizeGoogleScopeList(token.scope.split(/\s+/)),
    completedAt: toIsoString(now),
    lastError: "",
    lastErrorCode: "",
  };
}

export function failGoogleOAuthRuntimeState(
  current: GoogleOAuthRuntimeState,
  requestId: string,
  message: string,
  code = "",
  now = Date.now()
): GoogleOAuthRuntimeState {
  if (current.requestId && current.requestId !== requestId) {
    return current;
  }

  return {
    ...current,
    status: "error",
    requestId: null,
    completedAt: toIsoString(now),
    lastError: normalizeString(message),
    lastErrorCode: normalizeString(code),
  };
}

export function markGoogleOAuthRuntimeError(
  message: string,
  code = "",
  current?: GoogleOAuthRuntimeState | null,
  now = Date.now()
): GoogleOAuthRuntimeState {
  const base = normalizeGoogleOAuthRuntimeState(current);

  return {
    ...base,
    status: "error",
    requestId: null,
    completedAt: toIsoString(now),
    lastError: normalizeString(message),
    lastErrorCode: normalizeString(code),
  };
}

export function clearGoogleOAuthRuntimeState(): GoogleOAuthRuntimeState {
  return createEmptyGoogleOAuthRuntimeState();
}

export function normalizeGoogleOAuthRuntimeState(
  value: GoogleOAuthRuntimeState | null | undefined
): GoogleOAuthRuntimeState {
  if (!value) {
    return createEmptyGoogleOAuthRuntimeState();
  }

  return {
    status:
      value.status === "connecting" || value.status === "connected" || value.status === "error"
        ? value.status
        : "idle",
    requestId: value.requestId ?? null,
    prompt: value.prompt === "consent" ? "consent" : "",
    requestedScopes: normalizeGoogleScopeList(value.requestedScopes ?? []),
    grantedScopes: normalizeGoogleScopeList(value.grantedScopes ?? []),
    startedAt: value.startedAt ?? null,
    completedAt: value.completedAt ?? null,
    lastError: normalizeString(value.lastError),
    lastErrorCode: normalizeString(value.lastErrorCode),
  };
}

export function reconcileGoogleOAuthRuntimeState(
  value: GoogleOAuthRuntimeState | null | undefined,
  token: GoogleTokenRecord | null
): GoogleOAuthRuntimeState {
  const normalized = normalizeGoogleOAuthRuntimeState(value);

  if (token?.accessToken) {
    return {
      ...normalized,
      status: "connected",
      requestId: null,
      prompt: normalized.prompt,
      grantedScopes: normalizeGoogleScopeList(token.scope.split(/\s+/)),
      lastError: "",
      lastErrorCode: "",
    };
  }

  if (normalized.status === "connecting") {
    return markGoogleOAuthRuntimeError(
      "The previous Google sign-in did not complete. Retry the connection step.",
      "interrupted",
      normalized
    );
  }

  if (normalized.status === "connected") {
    return createEmptyGoogleOAuthRuntimeState();
  }

  return normalized;
}

export function createGoogleOAuthRequestId(now = Date.now()): string {
  return `google_oauth_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
