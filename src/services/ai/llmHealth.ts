import { requestLlmJson } from "./llmClient";
import { LlmProviderConfig, LlmSessionSecret } from "../../shared/types";

export interface LlmHealthCheckResult {
  status: string;
}

export async function probeLlmProvider(
  config: LlmProviderConfig,
  secret: LlmSessionSecret | null
): Promise<LlmHealthCheckResult> {
  const response = await requestLlmJson<{ status?: string }>(
    config,
    secret,
    'Return JSON only in the form {"status":"ok"}.',
    {
      check: "connectivity",
      expectation: "json-status-ok",
    }
  );

  return {
    status: response.status?.trim() || "ok",
  };
}
