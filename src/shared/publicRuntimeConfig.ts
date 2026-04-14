import { DEFAULT_LLM_PROVIDER_CONFIG } from "./constants";
import { GoogleOAuthConfig, LlmProviderConfig } from "./types";
import { normalizeGoogleOAuthClientId } from "../utils/googleIdentity";

type EnvShape = Record<string, string | undefined>;
declare const process: {
  env: EnvShape;
};

export interface PublicRuntimeConfig {
  googleOAuthClientId: string;
  hasManagedGoogleClientId: boolean;
  internalReportingEngine: {
    enabled: boolean;
    adminOnly: boolean;
  };
  llmPreset: {
    available: boolean;
    providerLabel: string;
    endpoint: string;
    model: string;
    apiKeyHeader: string;
    apiKeyPrefix: string;
    organization: string;
  };
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizeBoolean(value: string | undefined): boolean {
  const normalized = normalize(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function shouldAutoEnableManagedPreset(
  storedConfig: LlmProviderConfig,
  runtimeConfig: PublicRuntimeConfig
): boolean {
  if (!runtimeConfig.llmPreset.available || storedConfig.enabled) {
    return false;
  }

  return Boolean(
    !storedConfig.providerLabel.trim() &&
    !storedConfig.endpoint.trim() &&
    !storedConfig.model.trim() &&
    !storedConfig.apiKeyHeader.trim() &&
    !storedConfig.apiKeyPrefix.trim() &&
    !storedConfig.organization?.trim()
  );
}

export function buildPublicRuntimeConfig(env: EnvShape): PublicRuntimeConfig {
  const googleOAuthClientId = normalizeGoogleOAuthClientId(env.REPORTFORGE_GOOGLE_CLIENT_ID);
  const providerLabel = normalize(env.REPORTFORGE_LLM_PROVIDER_LABEL);
  const endpoint = normalize(env.REPORTFORGE_LLM_ENDPOINT);
  const model = normalize(env.REPORTFORGE_LLM_MODEL);
  const apiKeyHeader = normalize(env.REPORTFORGE_LLM_API_KEY_HEADER);
  const apiKeyPrefix = normalize(env.REPORTFORGE_LLM_API_KEY_PREFIX);
  const organization = normalize(env.REPORTFORGE_LLM_ORGANIZATION);

  return {
    googleOAuthClientId,
    hasManagedGoogleClientId: googleOAuthClientId.length > 0,
    internalReportingEngine: {
      enabled:
        env.REPORTFORGE_INTERNAL_REPORTING_ENGINE == null
          ? true
          : normalizeBoolean(env.REPORTFORGE_INTERNAL_REPORTING_ENGINE),
      adminOnly: false,
    },
    llmPreset: {
      available: Boolean(
        providerLabel || endpoint || model || apiKeyHeader || apiKeyPrefix || organization
      ),
      providerLabel: providerLabel || DEFAULT_LLM_PROVIDER_CONFIG.providerLabel,
      endpoint: endpoint || DEFAULT_LLM_PROVIDER_CONFIG.endpoint,
      model: model || DEFAULT_LLM_PROVIDER_CONFIG.model,
      apiKeyHeader: apiKeyHeader || DEFAULT_LLM_PROVIDER_CONFIG.apiKeyHeader,
      apiKeyPrefix: apiKeyPrefix || DEFAULT_LLM_PROVIDER_CONFIG.apiKeyPrefix,
      organization,
    },
  };
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  return buildPublicRuntimeConfig({
    REPORTFORGE_GOOGLE_CLIENT_ID: process.env.REPORTFORGE_GOOGLE_CLIENT_ID,
    REPORTFORGE_INTERNAL_REPORTING_ENGINE: process.env.REPORTFORGE_INTERNAL_REPORTING_ENGINE,
    REPORTFORGE_LLM_PROVIDER_LABEL: process.env.REPORTFORGE_LLM_PROVIDER_LABEL,
    REPORTFORGE_LLM_ENDPOINT: process.env.REPORTFORGE_LLM_ENDPOINT,
    REPORTFORGE_LLM_MODEL: process.env.REPORTFORGE_LLM_MODEL,
    REPORTFORGE_LLM_API_KEY_HEADER: process.env.REPORTFORGE_LLM_API_KEY_HEADER,
    REPORTFORGE_LLM_API_KEY_PREFIX: process.env.REPORTFORGE_LLM_API_KEY_PREFIX,
    REPORTFORGE_LLM_ORGANIZATION: process.env.REPORTFORGE_LLM_ORGANIZATION,
  });
}

export function resolveGoogleConfigWithRuntimeDefaults(
  storedConfig: GoogleOAuthConfig,
  runtimeConfig: PublicRuntimeConfig
): GoogleOAuthConfig {
  if (runtimeConfig.hasManagedGoogleClientId) {
    return {
      clientId: runtimeConfig.googleOAuthClientId,
    };
  }

  return {
    clientId: normalizeGoogleOAuthClientId(storedConfig.clientId),
  };
}

export function resolveLlmConfigWithRuntimeDefaults(
  storedConfig: LlmProviderConfig,
  runtimeConfig: PublicRuntimeConfig
): LlmProviderConfig {
  if (!runtimeConfig.llmPreset.available) {
    return storedConfig;
  }

  return {
    ...storedConfig,
    enabled: storedConfig.enabled || shouldAutoEnableManagedPreset(storedConfig, runtimeConfig),
    providerLabel: storedConfig.providerLabel.trim() || runtimeConfig.llmPreset.providerLabel,
    endpoint: storedConfig.endpoint.trim() || runtimeConfig.llmPreset.endpoint,
    model: storedConfig.model.trim() || runtimeConfig.llmPreset.model,
    apiKeyHeader: storedConfig.apiKeyHeader.trim() || runtimeConfig.llmPreset.apiKeyHeader,
    apiKeyPrefix: storedConfig.apiKeyPrefix.trim() || runtimeConfig.llmPreset.apiKeyPrefix,
    organization: storedConfig.organization?.trim() || runtimeConfig.llmPreset.organization,
  };
}
