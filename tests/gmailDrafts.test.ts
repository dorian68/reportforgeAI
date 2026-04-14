import assert from "node:assert/strict";
import test from "node:test";

import { buildRawGmailMessage, createGmailDraft } from "../src/services/google/gmailDrafts";

test("buildRawGmailMessage creates a multipart MIME payload with encoded subject", () => {
  const raw = buildRawGmailMessage(
    {
      audience: "executive",
      subject: "Résumé board update",
      plainText: "Plain summary",
      html: "<p>HTML summary</p>",
    },
    {
      to: "ceo@company.com",
      cc: "finance@company.com",
      bcc: "",
    }
  );

  assert.equal(raw.includes("To: ceo@company.com"), true);
  assert.equal(raw.includes("Cc: finance@company.com"), true);
  assert.equal(raw.includes("multipart/alternative"), true);
  assert.equal(raw.includes("=?UTF-8?B?"), true);
  assert.equal(raw.includes("<p>HTML summary</p>"), true);
});

test("buildRawGmailMessage normalizes semicolon and line-break recipient lists", () => {
  const raw = buildRawGmailMessage(
    {
      audience: "executive",
      subject: "Draft recipients",
      plainText: "Plain summary",
      html: "<p>HTML summary</p>",
    },
    {
      to: "ceo@company.com; cfo@company.com",
      cc: "ops@company.com\nfinance@company.com",
      bcc: "",
    }
  );

  assert.equal(raw.includes("To: ceo@company.com, cfo@company.com"), true);
  assert.equal(raw.includes("Cc: ops@company.com, finance@company.com"), true);
});

test("createGmailDraft posts a Gmail draft payload with bearer auth", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedAuth = "";
  let capturedBody = "";

  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedAuth = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? "");
    capturedBody = String(init?.body ?? "");

    return new Response(JSON.stringify({ id: "draft_123", message: { id: "msg_456" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const result = await createGmailDraft(
      {
        audience: "executive",
        subject: "Board update",
        plainText: "Plain summary",
        html: "<p>HTML summary</p>",
      },
      {
        to: "ceo@company.com",
        cc: "finance@company.com",
        bcc: "",
      },
      {
        accessToken: "google-token",
        tokenType: "Bearer",
        scope: "scope-a",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }
    );

    assert.equal(capturedUrl, "https://gmail.googleapis.com/gmail/v1/users/me/drafts");
    assert.equal(capturedAuth, "Bearer google-token");
    assert.equal(capturedBody.includes("\"raw\""), true);
    assert.equal(result.id, "draft_123");
    assert.equal(result.messageId, "msg_456");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
