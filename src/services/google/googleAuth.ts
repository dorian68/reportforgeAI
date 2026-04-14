/* global document, window, HTMLScriptElement */

import { GOOGLE_OAUTH_TIMEOUT_MS, GOOGLE_TOKEN_EXPIRY_SKEW_MS } from "../../shared/constants";
import {
  GoogleConnectionState,
  GoogleOAuthConfig,
  GoogleOAuthRuntimeState,
  GoogleTokenRecord,
} from "../../shared/types";
import {
  describeGoogleOAuthClientIdIssue,
  isGoogleOAuthClientId,
  isLikelyGoogleApiKey,
} from "../../utils/googleIdentity";
import {
  beginGoogleOAuthRuntimeState,
  completeGoogleOAuthRuntimeState,
  createGoogleOAuthRequestId,
  failGoogleOAuthRuntimeState,
} from "./googleAuthSession";

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
let googleIdentityLoadPromise: Promise<void> | null = null;

export interface GoogleOAuthLifecycleOptions {
  runtimeState?: GoogleOAuthRuntimeState | null;
  onStateChange?: (state: GoogleOAuthRuntimeState) => void;
  now?: () => number;
}

export function hasGoogleClientId(config: GoogleOAuthConfig): boolean {
  return isGoogleOAuthClientId(config.clientId);
}

export function tokenHasScopes(token: GoogleTokenRecord | null, scopes: string[]): boolean {
  if (!isGoogleTokenActive(token)) {
    return false;
  }

  const activeToken = token as GoogleTokenRecord;
  const grantedScopes = new Set(activeToken.scope.split(/\s+/).filter(Boolean));
  return scopes.every((scope) => grantedScopes.has(scope));
}

export function isGoogleTokenActive(token: GoogleTokenRecord | null | undefined): boolean {
  if (!token?.accessToken) {
    return false;
  }

  return getGoogleTokenTimeRemainingMs(token) > 0;
}

export function getGoogleTokenTimeRemainingMs(
  token: Pick<GoogleTokenRecord, "expiresAt"> | null | undefined,
  now = Date.now()
): number {
  if (!token?.expiresAt) {
    return 0;
  }

  return new Date(token.expiresAt).getTime() - now - GOOGLE_TOKEN_EXPIRY_SKEW_MS;
}

export function getGoogleConnectionState(
  config: GoogleOAuthConfig,
  token: GoogleTokenRecord | null
): GoogleConnectionState {
  if (!hasGoogleClientId(config)) {
    if (config.clientId.trim().length > 0) {
      return {
        status: "invalid",
        label: isLikelyGoogleApiKey(config.clientId)
          ? "Google API Key Invalid"
          : "Google OAuth Invalid",
        requiresReconnect: false,
      };
    }

    return {
      status: "disconnected",
      label: "Google Optional",
      requiresReconnect: false,
    };
  }

  if (!token) {
    return {
      status: "configured",
      label: "Google Configured",
      requiresReconnect: false,
    };
  }

  if (!isGoogleTokenActive(token)) {
    return {
      status: "expired",
      label: "Google Expired",
      requiresReconnect: true,
    };
  }

  return {
    status: "connected",
    label: "Google Connected",
    requiresReconnect: false,
  };
}

export async function requestGoogleAccessToken(
  config: GoogleOAuthConfig,
  scopes: string[],
  existingToken: GoogleTokenRecord | null,
  options?: GoogleOAuthLifecycleOptions
): Promise<GoogleTokenRecord> {
  if (!hasGoogleClientId(config)) {
    throw new Error(describeGoogleOAuthClientIdIssue(config.clientId));
  }

  await ensureGoogleIdentityLoaded();

  return new Promise<GoogleTokenRecord>((resolve, reject) => {
    const now = options?.now ?? (() => Date.now());
    const prompt = getGoogleAccessPrompt(existingToken, scopes);
    const requestId = createGoogleOAuthRequestId(now());
    let runtimeState = beginGoogleOAuthRuntimeState(scopes, prompt, requestId, now());
    let settled = false;
    const emitState = (state: GoogleOAuthRuntimeState) => {
      runtimeState = state;
      options?.onStateChange?.(state);
    };
    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeout);
      callback();
    };
    emitState(runtimeState);
    const timeout = window.setTimeout(() => {
      const nextState = failGoogleOAuthRuntimeState(
        runtimeState,
        requestId,
        "Google OAuth request timed out.",
        "timeout",
        now()
      );
      emitState(nextState);
      settle(() => reject(new Error("Google OAuth request timed out.")));
    }, GOOGLE_OAUTH_TIMEOUT_MS);
    const googleOauth = window.google?.accounts.oauth2;
    if (!googleOauth) {
      const message = "Google Identity Services did not initialize correctly.";
      emitState(
        failGoogleOAuthRuntimeState(runtimeState, requestId, message, "gis_unavailable", now())
      );
      settle(() => reject(new Error(message)));
      return;
    }

    const client = googleOauth.initTokenClient({
      client_id: config.clientId,
      scope: scopes.join(" "),
      include_granted_scopes: true,
      callback: (response) => {
        if (response.error) {
          const message = response.error_description || response.error;
          emitState(
            failGoogleOAuthRuntimeState(runtimeState, requestId, message, response.error, now())
          );
          settle(() => reject(new Error(message)));
          return;
        }

        const token = {
          accessToken: response.access_token,
          tokenType: response.token_type,
          scope: response.scope,
          expiresAt: new Date(now() + response.expires_in * 1000).toISOString(),
        };
        emitState(completeGoogleOAuthRuntimeState(runtimeState, token, requestId, now()));
        settle(() => resolve(token));
      },
      error_callback: (error) => {
        const code = error.type || "oauth_error";
        const message = error.message || error.type || "Google OAuth request failed.";
        emitState(failGoogleOAuthRuntimeState(runtimeState, requestId, message, code, now()));
        settle(() => reject(new Error(message)));
      },
    });

    client.requestAccessToken({
      prompt,
    });
  });
}

export function getGoogleAccessPrompt(
  existingToken: GoogleTokenRecord | null,
  scopes: string[]
): "" | "consent" {
  return isGoogleTokenActive(existingToken) && tokenHasScopes(existingToken, scopes)
    ? ""
    : "consent";
}

export async function revokeGoogleAccess(token: GoogleTokenRecord | null): Promise<void> {
  if (!token?.accessToken) {
    return;
  }

  await ensureGoogleIdentityLoaded();

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Google disconnect timed out."));
    }, GOOGLE_OAUTH_TIMEOUT_MS);

    window.google?.accounts.oauth2.revoke(token.accessToken, () => {
      window.clearTimeout(timeout);
      resolve();
    });
  });
}

async function ensureGoogleIdentityLoaded(): Promise<void> {
  if (window.google?.accounts.oauth2) {
    return;
  }

  if (!googleIdentityLoadPromise) {
    googleIdentityLoadPromise = new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error("Unable to load Google Identity Services."));
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`
      );

      if (existing) {
        existing.addEventListener("error", fail, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = GOOGLE_IDENTITY_SCRIPT;
        script.async = true;
        script.defer = true;
        script.onerror = fail;
        document.head.appendChild(script);
      }

      waitForGoogleOauthReady(6000)
        .then(resolve)
        .catch(() => reject(new Error("Google Identity Services did not initialize correctly.")));
    }).catch((error: Error) => {
      googleIdentityLoadPromise = null;
      throw error;
    });
  }

  await googleIdentityLoadPromise;
}

function waitForGoogleOauthReady(timeoutMs = 2500): Promise<void> {
  if (window.google?.accounts.oauth2) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const interval = window.setInterval(() => {
      if (window.google?.accounts.oauth2) {
        window.clearInterval(interval);
        resolve();
        return;
      }

      if (Date.now() >= deadline) {
        window.clearInterval(interval);
        reject(new Error("Google Identity Services timed out."));
      }
    }, 100);
  });
}
