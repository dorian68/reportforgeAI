import assert from "node:assert/strict";
import test from "node:test";

import { callGoogleApi, GoogleApiError } from "../src/services/google/googleApi";

const TEST_TOKEN = {
  accessToken: "token",
  tokenType: "Bearer",
  scope: "scope-a",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

test("callGoogleApi times out instead of hanging indefinitely", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) =>
    new Promise((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => callGoogleApi(TEST_TOKEN, "https://example.com", { timeoutMs: 10 }),
      (error: unknown) => error instanceof GoogleApiError && error.kind === "timeout"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("callGoogleApi marks 401 responses as token-invalidating auth errors", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: "Invalid Credentials" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => callGoogleApi(TEST_TOKEN, "https://example.com"),
      (error: unknown) =>
        error instanceof GoogleApiError &&
        error.kind === "auth" &&
        error.shouldInvalidateToken === true
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("callGoogleApi classifies 429 responses as rate limits", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: { message: "Rate limit exceeded" } }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => callGoogleApi(TEST_TOKEN, "https://example.com"),
      (error: unknown) => error instanceof GoogleApiError && error.kind === "rate-limit"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
