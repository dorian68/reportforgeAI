/* global TextEncoder, btoa, globalThis */

import {
  EmailDraft,
  GmailDraftRecipients,
  GmailDraftResult,
  GoogleTokenRecord,
} from "../../shared/types";

import { callGoogleApi } from "./googleApi";

interface GmailDraftApiResponse {
  id: string;
  message?: {
    id?: string;
  };
}

export async function createGmailDraft(
  emailDraft: EmailDraft,
  recipients: GmailDraftRecipients,
  token: GoogleTokenRecord
): Promise<GmailDraftResult> {
  const rawMessage = buildRawGmailMessage(emailDraft, recipients);
  const encodedMessage = toBase64Url(rawMessage);
  const response = await callGoogleApi<GmailDraftApiResponse>(
    token,
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      body: JSON.stringify({
        message: {
          raw: encodedMessage,
        },
      }),
    }
  );

  return {
    id: response.id,
    messageId: response.message?.id,
    encodedSize: encodedMessage.length,
  };
}

export function buildRawGmailMessage(
  emailDraft: EmailDraft,
  recipients: GmailDraftRecipients
): string {
  const boundary = `reportforge_${Date.now().toString(36)}`;
  const headers = [
    buildAddressHeader("To", recipients.to),
    buildAddressHeader("Cc", recipients.cc),
    buildAddressHeader("Bcc", recipients.bcc),
    `Subject: ${encodeMimeHeader(emailDraft.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean);

  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    emailDraft.plainText,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    emailDraft.html,
    "",
    `--${boundary}--`,
    "",
  ];

  return [...headers, "", ...parts].join("\r\n");
}

function buildAddressHeader(label: "To" | "Cc" | "Bcc", value: string): string {
  const normalized = value
    .split(/[,\n;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(", ");

  return normalized ? `${label}: ${normalized}` : "";
}

function encodeMimeHeader(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return `=?UTF-8?B?${encodeBase64(bytes)}?=`;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return encodeBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeBase64(bytes: Uint8Array): string {
  const bufferCtor = (
    globalThis as {
      Buffer?: { from: (value: Uint8Array) => { toString: (encoding: string) => string } };
    }
  ).Buffer;
  if (bufferCtor) {
    return bufferCtor.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
