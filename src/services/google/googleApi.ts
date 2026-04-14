/* global fetch, RequestInit, Response, AbortController, setTimeout, clearTimeout */

import { GOOGLE_HTTP_TIMEOUT_MS } from "../../shared/constants";
import { GoogleTokenRecord } from "../../shared/types";

export type GoogleApiErrorKind =
  | "timeout"
  | "network"
  | "auth"
  | "permission"
  | "rate-limit"
  | "server"
  | "unknown";

export class GoogleApiError extends Error {
  kind: GoogleApiErrorKind;
  status?: number;
  shouldInvalidateToken: boolean;

  constructor(
    message: string,
    kind: GoogleApiErrorKind,
    status?: number,
    shouldInvalidateToken = false
  ) {
    super(message);
    this.name = "GoogleApiError";
    this.kind = kind;
    this.status = status;
    this.shouldInvalidateToken = shouldInvalidateToken;
  }
}

interface GoogleRequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function callGoogleApi<TResponse>(
  token: GoogleTokenRecord,
  url: string,
  init?: GoogleRequestOptions
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(init?.timeoutMs ?? GOOGLE_HTTP_TIMEOUT_MS, 1)
  );

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.accessToken}`,
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await buildGoogleApiError(response);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    if (error instanceof GoogleApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GoogleApiError(
        "Google request timed out. Retry after checking network access and popup blockers.",
        "timeout"
      );
    }

    throw new GoogleApiError("Google request failed before a response was received.", "network");
  } finally {
    clearTimeout(timeout);
  }
}

async function buildGoogleApiError(response: Response): Promise<GoogleApiError> {
  const rawText = await response.text();
  const parsed = parseGoogleApiErrorPayload(rawText);
  const message =
    parsed?.message || rawText || `Google API request failed with status ${response.status}.`;
  const normalized = message.toLowerCase();

  if (response.status === 401) {
    return new GoogleApiError(message, "auth", response.status, true);
  }

  if (
    response.status === 403 &&
    (normalized.includes("insufficient authentication scopes") ||
      normalized.includes("permission") ||
      normalized.includes("access denied"))
  ) {
    return new GoogleApiError(message, "permission", response.status, true);
  }

  if (response.status === 403) {
    return new GoogleApiError(message, "permission", response.status);
  }

  if (response.status === 429) {
    return new GoogleApiError(message, "rate-limit", response.status);
  }

  if (response.status >= 500) {
    return new GoogleApiError(message, "server", response.status);
  }

  return new GoogleApiError(message, "unknown", response.status);
}

function parseGoogleApiErrorPayload(rawText: string): { message?: string; status?: string } | null {
  try {
    const payload = JSON.parse(rawText) as {
      error?: {
        message?: string;
        status?: string;
      };
    };
    return payload.error ?? null;
  } catch {
    return null;
  }
}
