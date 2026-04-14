/* global fetch, Headers, AbortController, AbortSignal, setTimeout, clearTimeout */

import { LlmProviderConfig, LlmSessionSecret } from "../../shared/types";
import { truncate } from "../../utils/formatting";

interface ChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>;
    };
  }>;
  output_text?: string;
}

interface LlmRequestOptions {
  signal?: AbortSignal;
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function clampTemperature(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.3;
  }

  return Math.min(Math.max(value, 0), 1.5);
}

function toAuthHeaderValue(config: LlmProviderConfig, secret: LlmSessionSecret): string {
  const prefix = normalize(config.apiKeyPrefix);
  const key = normalize(secret.apiKey);
  return [prefix, key].filter(Boolean).join(" ").trim();
}

export function requiresLlmClientSecret(config: LlmProviderConfig | null | undefined): boolean {
  return Boolean(normalize(config?.apiKeyHeader));
}

function extractContentString(content: ChatCompletionsResponse["choices"]): string {
  const messageContent = content?.[0]?.message?.content;
  if (typeof messageContent === "string") {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => normalize(part.text))
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

export function canUseLlm(
  config: LlmProviderConfig | null | undefined,
  secret: LlmSessionSecret | null | undefined
): boolean {
  const endpoint = normalize(config?.endpoint);
  const model = normalize(config?.model);
  const apiKey = normalize(secret?.apiKey);
  const clientSecretRequired = requiresLlmClientSecret(config);

  return Boolean(config?.enabled && endpoint && model && (!clientSecretRequired || apiKey));
}

export async function requestLlmJson<T>(
  config: LlmProviderConfig,
  secret: LlmSessionSecret | null,
  systemPrompt: string,
  userPayload: unknown,
  options?: LlmRequestOptions
): Promise<T> {
  if (!canUseLlm(config, secret)) {
    throw new Error(
      requiresLlmClientSecret(config)
        ? "AI enhancement is not configured yet. Save a provider and provider credentials first."
        : "AI enhancement is not configured yet. Save a provider first."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const abortListener = () => controller.abort();
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (options?.signal?.aborted) {
    const abortedError = new Error("AI enhancement was canceled.");
    abortedError.name = "AbortError";
    throw abortedError;
  }

  options?.signal?.addEventListener("abort", abortListener, { once: true });

  if (requiresLlmClientSecret(config) && secret) {
    headers.set(normalize(config.apiKeyHeader), toAuthHeaderValue(config, secret));
  }

  if (normalize(config.organization)) {
    headers.set("OpenAI-Organization", normalize(config.organization));
  }

  try {
    const response = await fetch(normalize(config.endpoint), {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: normalize(config.model),
        temperature: clampTemperature(config.temperature),
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify(userPayload, null, 2),
          },
        ],
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `LLM provider request failed (${response.status}): ${truncate(responseText, 240)}`
      );
    }

    return parseLlmJsonResponse<T>(responseText);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (options?.signal?.aborted) {
        const abortedError = new Error("AI enhancement was canceled.");
        abortedError.name = "AbortError";
        throw abortedError;
      }

      throw new Error("AI enhancement timed out. Retry or use a faster model.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", abortListener);
  }
}

export function extractFirstJsonObject(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("The LLM provider returned an empty response.");
  }

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace < 0) {
    throw new Error("The LLM provider did not return a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = firstBrace; index < trimmed.length; index += 1) {
    const character = trimmed[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (character === "\\") {
      escapeNext = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return trimmed.slice(firstBrace, index + 1);
      }
    }
  }

  throw new Error("The LLM provider returned malformed JSON.");
}

function parseLlmJsonResponse<T>(responseText: string): T {
  const parsedResponse = JSON.parse(responseText) as ChatCompletionsResponse;

  if (parsedResponse.output_text?.trim()) {
    return JSON.parse(extractFirstJsonObject(parsedResponse.output_text)) as T;
  }

  const content = extractContentString(parsedResponse.choices);
  if (content) {
    return JSON.parse(extractFirstJsonObject(content)) as T;
  }

  if (
    typeof parsedResponse === "object" &&
    parsedResponse !== null &&
    !("choices" in parsedResponse)
  ) {
    return parsedResponse as T;
  }

  throw new Error("The LLM provider response format is unsupported.");
}
