import assert from "node:assert/strict";
import test from "node:test";

import {
  getGoogleAccessPrompt,
  getGoogleConnectionState,
  isGoogleTokenActive,
  requestGoogleAccessToken,
  tokenHasScopes,
} from "../src/services/google/googleAuth";
import {
  beginGoogleOAuthRuntimeState,
  clearGoogleOAuthRuntimeState,
  completeGoogleOAuthRuntimeState,
  failGoogleOAuthRuntimeState,
  reconcileGoogleOAuthRuntimeState,
} from "../src/services/google/googleAuthSession";
import { GoogleOAuthRuntimeState } from "../src/shared/types";

interface MockGoogleTokenClientConfig {
  callback: (response: {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    error?: string;
    error_description?: string;
  }) => void;
  error_callback?: (error: { type: string; message?: string }) => void;
}

function installGoogleIdentityTestHarness() {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  let latestConfig: MockGoogleTokenClientConfig | undefined;
  let latestPrompt = "";

  const mockWindow = {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: MockGoogleTokenClientConfig) => {
            latestConfig = config;
            return {
              requestAccessToken: (options?: { prompt?: string }) => {
                latestPrompt = options?.prompt ?? "";
              },
            };
          },
          revoke: (_token: string, callback: () => void) => callback(),
        },
      },
    },
  } as unknown as Window & typeof globalThis;

  const mockDocument = {
    querySelector: () => null,
    createElement: () => ({ src: "", async: false, defer: false, onerror: null }),
    head: {
      appendChild: () => undefined,
    },
  } as unknown as Document;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: mockDocument,
  });

  return {
    getLatestConfig() {
      assert.ok(latestConfig);
      return latestConfig;
    },
    getLatestPrompt() {
      return latestPrompt;
    },
    restore() {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    },
  };
}

test("google connection state reflects config and token expiry", () => {
  const config = { clientId: "client-id.apps.googleusercontent.com" };
  const activeToken = {
    accessToken: "token",
    tokenType: "Bearer",
    scope: "scope-a scope-b",
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
  const expiredToken = {
    ...activeToken,
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  };

  assert.equal(getGoogleConnectionState({ clientId: "" }, null).status, "disconnected");
  assert.equal(getGoogleConnectionState(config, null).status, "configured");
  assert.equal(getGoogleConnectionState({ clientId: "AIzaSyBYb0RnXf6aSjkZnVIRybJJMdCjOu_qHQE" }, null).status, "invalid");
  assert.equal(getGoogleConnectionState(config, expiredToken).status, "expired");
  assert.equal(getGoogleConnectionState(config, activeToken).status, "connected");
  assert.equal(isGoogleTokenActive(expiredToken), false);
  assert.equal(tokenHasScopes(activeToken, ["scope-a"]), true);
  assert.equal(tokenHasScopes(expiredToken, ["scope-a"]), false);
});

test("google auth requests consent for missing scopes or near-expiry tokens", () => {
  const almostExpiredToken = {
    accessToken: "token",
    tokenType: "Bearer",
    scope: "scope-a",
    expiresAt: new Date(Date.now() + 10_000).toISOString(),
  };
  const activeToken = {
    accessToken: "token",
    tokenType: "Bearer",
    scope: "scope-a scope-b",
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };

  assert.equal(isGoogleTokenActive(almostExpiredToken), false);
  assert.equal(getGoogleAccessPrompt(activeToken, ["scope-a"]), "");
  assert.equal(getGoogleAccessPrompt(activeToken, ["scope-a", "scope-c"]), "consent");
  assert.equal(getGoogleAccessPrompt(almostExpiredToken, ["scope-a"]), "consent");
});

test("google oauth runtime state tracks connecting, success, and failure explicitly", () => {
  const pending = beginGoogleOAuthRuntimeState(["scope-a", "scope-a", "scope-b"], "consent", "req_1", 1000);
  const connected = completeGoogleOAuthRuntimeState(
    pending,
    {
      accessToken: "token",
      tokenType: "Bearer",
      scope: "scope-a scope-b",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    "req_1",
    2000
  );
  const failed = failGoogleOAuthRuntimeState(
    beginGoogleOAuthRuntimeState(["scope-a"], "", "req_2", 3000),
    "req_2",
    "access_denied",
    "access_denied",
    4000
  );

  assert.equal(pending.status, "connecting");
  assert.deepEqual(pending.requestedScopes, ["scope-a", "scope-b"]);
  assert.equal(connected.status, "connected");
  assert.deepEqual(connected.grantedScopes, ["scope-a", "scope-b"]);
  assert.equal(failed.status, "error");
  assert.equal(failed.lastErrorCode, "access_denied");
});

test("google oauth runtime reconciliation turns interrupted sessions into actionable errors", () => {
  const interrupted = reconcileGoogleOAuthRuntimeState(
    {
      status: "connecting",
      requestId: "req_1",
      prompt: "consent",
      requestedScopes: ["scope-a"],
      grantedScopes: [],
      startedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      lastError: "",
      lastErrorCode: "",
    },
    null
  );
  const restored = reconcileGoogleOAuthRuntimeState(
    clearGoogleOAuthRuntimeState(),
    {
      accessToken: "token",
      tokenType: "Bearer",
      scope: "scope-a scope-b",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }
  );

  assert.equal(interrupted.status, "error");
  assert.match(interrupted.lastError, /did not complete/i);
  assert.equal(restored.status, "connected");
  assert.deepEqual(restored.grantedScopes, ["scope-a", "scope-b"]);
});

test("requestGoogleAccessToken emits runtime state updates and reuses granted scopes without consent", async () => {
  const harness = installGoogleIdentityTestHarness();
  const runtimeStates: GoogleOAuthRuntimeState[] = [];
  const existingToken = {
    accessToken: "existing",
    tokenType: "Bearer",
    scope: "scope-a scope-b",
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };

  try {
    const requestPromise = requestGoogleAccessToken(
      { clientId: "client-id.apps.googleusercontent.com" },
      ["scope-a"],
      existingToken,
      {
        onStateChange: (state) => runtimeStates.push(state),
      }
    );

    await Promise.resolve();
    assert.equal(harness.getLatestPrompt(), "");
    harness.getLatestConfig().callback({
      access_token: "fresh-token",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "scope-a scope-b",
    });

    const token = await requestPromise;
    assert.equal(token.accessToken, "fresh-token");
    assert.equal(runtimeStates[0].status, "connecting");
    assert.equal(runtimeStates[1].status, "connected");
    assert.deepEqual(runtimeStates[1].grantedScopes, ["scope-a", "scope-b"]);
  } finally {
    harness.restore();
  }
});

test("requestGoogleAccessToken surfaces callback and popup errors through runtime state", async () => {
  const harness = installGoogleIdentityTestHarness();
  const callbackStates: GoogleOAuthRuntimeState[] = [];
  const popupStates: GoogleOAuthRuntimeState[] = [];

  try {
    const callbackPromise = requestGoogleAccessToken(
      { clientId: "client-id.apps.googleusercontent.com" },
      ["scope-a"],
      null,
      {
        onStateChange: (state) => callbackStates.push(state),
      }
    );

    await Promise.resolve();
    harness.getLatestConfig().callback({
      access_token: "",
      token_type: "",
      expires_in: 0,
      scope: "",
      error: "access_denied",
      error_description: "User denied access",
    });

    await assert.rejects(() => callbackPromise, /User denied access/);
    assert.equal(callbackStates[callbackStates.length - 1]?.status, "error");
    assert.equal(callbackStates[callbackStates.length - 1]?.lastErrorCode, "access_denied");

    const popupPromise = requestGoogleAccessToken(
      { clientId: "client-id.apps.googleusercontent.com" },
      ["scope-a"],
      null,
      {
        onStateChange: (state) => popupStates.push(state),
      }
    );

    await Promise.resolve();
    harness.getLatestConfig().error_callback?.({
      type: "popup_closed",
      message: "Popup was closed",
    });

    await assert.rejects(() => popupPromise, /Popup was closed/);
    assert.equal(popupStates[popupStates.length - 1]?.status, "error");
    assert.equal(popupStates[popupStates.length - 1]?.lastErrorCode, "popup_closed");
  } finally {
    harness.restore();
  }
});
