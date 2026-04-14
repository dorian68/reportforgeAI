import { safeReadJson, safeWriteJson, StorageLike } from "../services/persistence/safeStorage";
import { STORAGE_KEYS } from "../shared/constants";

export type PlanWorkspaceId = "brief" | "templates" | "ai";
export type OutputWorkspaceId = "excel" | "webapp" | "email" | "slides" | "canvas";

export interface WorkspaceTabDefinition<T extends string> {
  id: T;
  label: string;
  description: string;
}

export interface WorkspaceTabModel<T extends string> extends WorkspaceTabDefinition<T> {
  disabled: boolean;
  badge: string;
}

interface PlanWorkspaceContext {
  selectionReady: boolean;
  bundleReady: boolean;
  templateCount: number;
  aiEnabled: boolean;
  aiConfigured: boolean;
  aiEnhanced: boolean;
}

interface OutputWorkspaceContext {
  selectionReady: boolean;
  bundleReady: boolean;
  excelGenerated: boolean;
  webAppExported: boolean;
  emailGenerated: boolean;
  slidesReady: boolean;
  canvasEnabled: boolean;
  canvasGenerated: boolean;
}

const PLAN_WORKSPACES: WorkspaceTabDefinition<PlanWorkspaceId>[] = [
  {
    id: "brief",
    label: "Brief",
    description: "Prompt, layout direction, and interpretation summary.",
  },
  {
    id: "templates",
    label: "Templates",
    description: "Save, reuse, and manage repeatable report setups.",
  },
  {
    id: "ai",
    label: "AI",
    description: "Configure optional narrative enhancement safely.",
  },
];

const OUTPUT_WORKSPACES: WorkspaceTabDefinition<OutputWorkspaceId>[] = [
  {
    id: "excel",
    label: "Workbook",
    description: "Create the native Excel report sheets.",
  },
  {
    id: "webapp",
    label: "Web App",
    description: "Review or export the Apps Script scaffold.",
  },
  {
    id: "email",
    label: "Email",
    description: "Review the email draft or create a Gmail draft.",
  },
  {
    id: "slides",
    label: "Slides",
    description: "Review the presentation outline and export JSON or markdown.",
  },
  {
    id: "canvas",
    label: "Canvas",
    description: "Run the internal multi-format reporting engine and review its artifacts.",
  },
];

export function buildPlanWorkspaceTabs(
  context: PlanWorkspaceContext
): WorkspaceTabModel<PlanWorkspaceId>[] {
  return PLAN_WORKSPACES.map((workspace) => {
    if (workspace.id === "brief") {
      return {
        ...workspace,
        disabled: false,
        badge: context.bundleReady ? "Ready" : context.selectionReady ? "Drafting" : "Needs data",
      };
    }

    if (workspace.id === "templates") {
      return {
        ...workspace,
        disabled: false,
        badge: context.templateCount > 0 ? `${context.templateCount} saved` : "No saved sets",
      };
    }

    return {
      ...workspace,
      disabled: false,
      badge: context.aiEnhanced
        ? "Enhanced"
        : context.aiEnabled
          ? context.aiConfigured
            ? "Armed"
            : "Incomplete"
          : "Optional",
    };
  });
}

export function buildOutputWorkspaceTabs(
  context: OutputWorkspaceContext
): WorkspaceTabModel<OutputWorkspaceId>[] {
  const workspaces = OUTPUT_WORKSPACES.filter(
    (workspace) => workspace.id !== "canvas" || context.canvasEnabled
  );

  return workspaces.map((workspace) => {
    if (workspace.id === "excel") {
      return {
        ...workspace,
        disabled: !context.selectionReady,
        badge: context.excelGenerated ? "Created" : context.bundleReady ? "Ready" : "Pending",
      };
    }

    if (workspace.id === "webapp") {
      return {
        ...workspace,
        disabled: !context.selectionReady,
        badge: context.webAppExported ? "Exported" : context.bundleReady ? "Scaffold" : "Pending",
      };
    }

    if (workspace.id === "email") {
      return {
        ...workspace,
        disabled: !context.selectionReady,
        badge: context.emailGenerated ? "Drafted" : context.bundleReady ? "Ready" : "Pending",
      };
    }

    if (workspace.id === "canvas") {
      return {
        ...workspace,
        disabled: !context.selectionReady,
        badge: context.canvasGenerated ? "Generated" : context.bundleReady ? "Studio" : "Pending",
      };
    }

    return {
      ...workspace,
      disabled: !context.selectionReady,
      badge: context.slidesReady ? "Ready" : "Pending",
    };
  });
}

export function resolveWorkspaceTab<T extends string>(
  preferredTab: T,
  tabs: WorkspaceTabModel<T>[]
): T {
  const preferred = tabs.find((tab) => tab.id === preferredTab);
  if (preferred && !preferred.disabled) {
    return preferred.id;
  }

  return tabs.find((tab) => !tab.disabled)?.id ?? tabs[0]?.id ?? preferredTab;
}

export function loadPlanWorkspacePreference(storage?: StorageLike): PlanWorkspaceId {
  return loadWorkspacePreference(STORAGE_KEYS.planWorkspace, "brief", PLAN_WORKSPACES, storage);
}

export function savePlanWorkspacePreference(
  workspace: PlanWorkspaceId,
  storage?: StorageLike
): PlanWorkspaceId {
  safeWriteJson(STORAGE_KEYS.planWorkspace, workspace, "local", storage, "plan workspace");
  return workspace;
}

export function loadOutputWorkspacePreference(storage?: StorageLike): OutputWorkspaceId {
  return loadWorkspacePreference(STORAGE_KEYS.outputWorkspace, "excel", OUTPUT_WORKSPACES, storage);
}

export function saveOutputWorkspacePreference(
  workspace: OutputWorkspaceId,
  storage?: StorageLike
): OutputWorkspaceId {
  safeWriteJson(STORAGE_KEYS.outputWorkspace, workspace, "local", storage, "output workspace");
  return workspace;
}

function loadWorkspacePreference<T extends string>(
  key: string,
  fallback: T,
  definitions: WorkspaceTabDefinition<T>[],
  storage?: StorageLike
): T {
  const stored = safeReadJson<T>(key, fallback, "local", storage, `${key} preference`);
  return definitions.some((definition) => definition.id === stored) ? stored : fallback;
}
