import { DEFAULT_LLM_PROVIDER_CONFIG, STORAGE_KEYS } from "../../shared/constants";
import {
  CanvasDocumentSnapshot,
  CanvasStudioDraft,
  GoogleOAuthConfig,
  GoogleOAuthRuntimeState,
  GoogleSessionState,
  GoogleTokenRecord,
  LlmProviderConfig,
  LlmSessionSecret,
  SavedCanvasTemplate,
  SavedTemplate,
  SavedSlideTemplate,
} from "../../shared/types";
import { isGoogleTokenActive } from "../google/googleAuth";
import {
  clearGoogleOAuthRuntimeState,
  reconcileGoogleOAuthRuntimeState,
} from "../google/googleAuthSession";
import { safeReadJson, safeRemoveItem, safeWriteJson, StorageLike } from "./safeStorage";

export function loadSavedTemplates(storage?: StorageLike): SavedTemplate[] {
  return safeReadJson<SavedTemplate[]>(
    STORAGE_KEYS.templates,
    [],
    "local",
    storage,
    "saved templates"
  ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function saveTemplate(
  template: Omit<SavedTemplate, "createdAt" | "updatedAt"> &
    Partial<Pick<SavedTemplate, "createdAt" | "updatedAt">>,
  storage?: StorageLike
): SavedTemplate[] {
  const existing = loadSavedTemplates(storage);
  const now = new Date().toISOString();
  const nextTemplate: SavedTemplate = {
    ...template,
    createdAt: template.createdAt ?? now,
    updatedAt: now,
  };
  const withoutCurrent = existing.filter((entry) => entry.id !== nextTemplate.id);
  const nextTemplates = [nextTemplate, ...withoutCurrent];
  safeWriteJson(STORAGE_KEYS.templates, nextTemplates, "local", storage, "saved templates");
  return nextTemplates;
}

export function deleteTemplate(templateId: string, storage?: StorageLike): SavedTemplate[] {
  const nextTemplates = loadSavedTemplates(storage).filter((entry) => entry.id !== templateId);
  safeWriteJson(STORAGE_KEYS.templates, nextTemplates, "local", storage, "saved templates");
  return nextTemplates;
}

export function loadSavedSlideTemplates(storage?: StorageLike): SavedSlideTemplate[] {
  return safeReadJson<SavedSlideTemplate[]>(
    STORAGE_KEYS.slideTemplates,
    [],
    "local",
    storage,
    "saved slide templates"
  ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function loadSavedCanvasTemplates(storage?: StorageLike): SavedCanvasTemplate[] {
  return safeReadJson<SavedCanvasTemplate[]>(
    STORAGE_KEYS.canvasTemplates,
    [],
    "local",
    storage,
    "saved canvas templates"
  ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function saveCanvasTemplate(
  template: Omit<SavedCanvasTemplate, "createdAt" | "updatedAt"> &
    Partial<Pick<SavedCanvasTemplate, "createdAt" | "updatedAt">>,
  storage?: StorageLike
): SavedCanvasTemplate[] {
  const existing = loadSavedCanvasTemplates(storage);
  const now = new Date().toISOString();
  const nextTemplate: SavedCanvasTemplate = {
    ...template,
    createdAt: template.createdAt ?? now,
    updatedAt: now,
  };
  const withoutCurrent = existing.filter((entry) => entry.id !== nextTemplate.id);
  const nextTemplates = [nextTemplate, ...withoutCurrent];
  safeWriteJson(
    STORAGE_KEYS.canvasTemplates,
    nextTemplates,
    "local",
    storage,
    "saved canvas templates"
  );
  return nextTemplates;
}

export function loadCanvasStudioDraft(storage?: StorageLike): CanvasStudioDraft | null {
  return safeReadJson<CanvasStudioDraft | null>(
    STORAGE_KEYS.canvasStudioDraft,
    null,
    "local",
    storage,
    "canvas studio draft"
  );
}

export function saveCanvasStudioDraft(
  draft: CanvasStudioDraft,
  storage?: StorageLike
): CanvasStudioDraft {
  safeWriteJson(STORAGE_KEYS.canvasStudioDraft, draft, "local", storage, "canvas studio draft");
  return draft;
}

export function clearCanvasStudioDraft(storage?: StorageLike): void {
  safeRemoveItem(STORAGE_KEYS.canvasStudioDraft, "local", storage, "canvas studio draft");
}

export function loadCanvasStudioSnapshots(storage?: StorageLike): CanvasDocumentSnapshot[] {
  return safeReadJson<CanvasDocumentSnapshot[]>(
    STORAGE_KEYS.canvasStudioSnapshots,
    [],
    "local",
    storage,
    "canvas studio snapshots"
  ).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function saveCanvasStudioSnapshot(
  snapshot: CanvasDocumentSnapshot,
  storage?: StorageLike,
  maxSnapshots = 12
): CanvasDocumentSnapshot[] {
  const existing = loadCanvasStudioSnapshots(storage);
  const withoutCurrent = existing.filter((entry) => entry.id !== snapshot.id);
  const nextSnapshots = [snapshot, ...withoutCurrent].slice(0, maxSnapshots);
  safeWriteJson(
    STORAGE_KEYS.canvasStudioSnapshots,
    nextSnapshots,
    "local",
    storage,
    "canvas studio snapshots"
  );
  return nextSnapshots;
}

export function deleteCanvasStudioSnapshot(
  snapshotId: string,
  storage?: StorageLike
): CanvasDocumentSnapshot[] {
  const nextSnapshots = loadCanvasStudioSnapshots(storage).filter(
    (entry) => entry.id !== snapshotId
  );
  safeWriteJson(
    STORAGE_KEYS.canvasStudioSnapshots,
    nextSnapshots,
    "local",
    storage,
    "canvas studio snapshots"
  );
  return nextSnapshots;
}

export function deleteCanvasTemplate(
  templateId: string,
  storage?: StorageLike
): SavedCanvasTemplate[] {
  const nextTemplates = loadSavedCanvasTemplates(storage).filter(
    (entry) => entry.id !== templateId
  );
  safeWriteJson(
    STORAGE_KEYS.canvasTemplates,
    nextTemplates,
    "local",
    storage,
    "saved canvas templates"
  );
  return nextTemplates;
}

export function saveSlideTemplate(
  template: Omit<SavedSlideTemplate, "createdAt" | "updatedAt"> &
    Partial<Pick<SavedSlideTemplate, "createdAt" | "updatedAt">>,
  storage?: StorageLike
): SavedSlideTemplate[] {
  const existing = loadSavedSlideTemplates(storage);
  const now = new Date().toISOString();
  const nextTemplate: SavedSlideTemplate = {
    ...template,
    createdAt: template.createdAt ?? now,
    updatedAt: now,
  };
  const withoutCurrent = existing.filter((entry) => entry.id !== nextTemplate.id);
  const nextTemplates = [nextTemplate, ...withoutCurrent];
  safeWriteJson(
    STORAGE_KEYS.slideTemplates,
    nextTemplates,
    "local",
    storage,
    "saved slide templates"
  );
  return nextTemplates;
}

export function deleteSlideTemplate(
  templateId: string,
  storage?: StorageLike
): SavedSlideTemplate[] {
  const nextTemplates = loadSavedSlideTemplates(storage).filter((entry) => entry.id !== templateId);
  safeWriteJson(
    STORAGE_KEYS.slideTemplates,
    nextTemplates,
    "local",
    storage,
    "saved slide templates"
  );
  return nextTemplates;
}

export function createTemplateId(): string {
  return `tpl_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function loadGoogleSessionState(storage?: StorageLike): GoogleSessionState {
  const config = safeReadJson<GoogleOAuthConfig>(
    STORAGE_KEYS.googleConfig,
    { clientId: "" },
    "local",
    storage,
    "Google configuration"
  );
  const token = safeReadJson<GoogleTokenRecord | null>(
    STORAGE_KEYS.googleToken,
    null,
    "session",
    storage,
    "Google session token"
  );
  const activeToken = isGoogleTokenActive(token) ? token : null;
  const auth = safeReadJson<GoogleOAuthRuntimeState>(
    STORAGE_KEYS.googleAuthState,
    clearGoogleOAuthRuntimeState(),
    "session",
    storage,
    "Google OAuth runtime state"
  );
  return {
    config,
    token: activeToken,
    auth: reconcileGoogleOAuthRuntimeState(auth, activeToken),
  };
}

export function saveGoogleConfig(
  config: GoogleOAuthConfig,
  storage?: StorageLike
): GoogleOAuthConfig {
  safeWriteJson(STORAGE_KEYS.googleConfig, config, "local", storage, "Google configuration");
  return config;
}

export function saveGoogleToken(
  token: GoogleTokenRecord,
  storage?: StorageLike
): GoogleTokenRecord {
  safeWriteJson(STORAGE_KEYS.googleToken, token, "session", storage, "Google session token");
  return token;
}

export function saveGoogleAuthState(
  authState: GoogleOAuthRuntimeState,
  storage?: StorageLike
): GoogleOAuthRuntimeState {
  safeWriteJson(
    STORAGE_KEYS.googleAuthState,
    authState,
    "session",
    storage,
    "Google OAuth runtime state"
  );
  return authState;
}

export function clearGoogleToken(storage?: StorageLike): void {
  safeRemoveItem(STORAGE_KEYS.googleToken, "session", storage, "Google session token");
}

export function clearGoogleAuthState(storage?: StorageLike): void {
  safeRemoveItem(STORAGE_KEYS.googleAuthState, "session", storage, "Google OAuth runtime state");
}

export function loadLlmProviderConfig(storage?: StorageLike): LlmProviderConfig {
  return safeReadJson<LlmProviderConfig>(
    STORAGE_KEYS.llmConfig,
    DEFAULT_LLM_PROVIDER_CONFIG,
    "local",
    storage,
    "AI provider configuration"
  );
}

export function saveLlmProviderConfig(
  config: LlmProviderConfig,
  storage?: StorageLike
): LlmProviderConfig {
  safeWriteJson(STORAGE_KEYS.llmConfig, config, "local", storage, "AI provider configuration");
  return config;
}

export function loadLlmSessionSecret(storage?: StorageLike): LlmSessionSecret | null {
  const secret = safeReadJson<LlmSessionSecret | null>(
    STORAGE_KEYS.llmApiKey,
    null,
    "session",
    storage,
    "AI session API key"
  );
  return secret?.apiKey?.trim() ? secret : null;
}

export function saveLlmSessionSecret(
  secret: LlmSessionSecret,
  storage?: StorageLike
): LlmSessionSecret {
  safeWriteJson(STORAGE_KEYS.llmApiKey, secret, "session", storage, "AI session API key");
  return secret;
}

export function clearLlmSessionSecret(storage?: StorageLike): void {
  safeRemoveItem(STORAGE_KEYS.llmApiKey, "session", storage, "AI session API key");
}
