import {
  AppsScriptDeploymentOptions,
  GeneratedEmailBundle,
  LlmProviderConfig,
  LlmSessionSecret,
} from "../shared/types";

export interface AppsScriptDraftState {
  scriptTitleDirty: boolean;
  deploymentDescriptionDirty: boolean;
}

export const DEFAULT_APPS_SCRIPT_DRAFT_STATE: AppsScriptDraftState = {
  scriptTitleDirty: false,
  deploymentDescriptionDirty: false,
};

export function reconcileAppsScriptOptionsWithPlan(
  current: AppsScriptDeploymentOptions,
  draftState: AppsScriptDraftState,
  planTitle: string
): AppsScriptDeploymentOptions {
  return {
    ...current,
    scriptTitle: draftState.scriptTitleDirty ? current.scriptTitle : `${planTitle} Web App`,
    deploymentDescription: draftState.deploymentDescriptionDirty
      ? current.deploymentDescription
      : `${planTitle} automated deployment`,
  };
}

export function createAppsScriptDraftStateFromValues(
  options: Pick<AppsScriptDeploymentOptions, "scriptTitle" | "deploymentDescription">
): AppsScriptDraftState {
  return {
    scriptTitleDirty: options.scriptTitle.trim().length > 0,
    deploymentDescriptionDirty: options.deploymentDescription.trim().length > 0,
  };
}

export function resolveSelectedEmailAudience(
  currentAudience: string,
  emailBundle: GeneratedEmailBundle
): string {
  if (currentAudience === "primary") {
    return "primary";
  }

  return emailBundle.variants.some((draft) => draft.audience === currentAudience)
    ? currentAudience
    : "primary";
}

export function hasPendingLlmDraftChanges(
  draftConfig: LlmProviderConfig,
  appliedConfig: LlmProviderConfig,
  draftSecret: LlmSessionSecret | null,
  appliedSecret: LlmSessionSecret | null
): boolean {
  return (
    JSON.stringify(normalizeLlmConfig(draftConfig)) !==
      JSON.stringify(normalizeLlmConfig(appliedConfig)) ||
    normalizeSecret(draftSecret) !== normalizeSecret(appliedSecret)
  );
}

function normalizeLlmConfig(config: LlmProviderConfig) {
  return {
    enabled: config.enabled,
    providerLabel: config.providerLabel.trim(),
    endpoint: config.endpoint.trim(),
    model: config.model.trim(),
    apiKeyHeader: config.apiKeyHeader.trim(),
    apiKeyPrefix: config.apiKeyPrefix.trim(),
    organization: config.organization?.trim() ?? "",
    temperature: Number.isFinite(config.temperature) ? config.temperature : 0.3,
  };
}

function normalizeSecret(secret: LlmSessionSecret | null): string {
  return secret?.apiKey.trim() ?? "";
}
