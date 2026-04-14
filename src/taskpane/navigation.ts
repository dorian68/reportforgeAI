import { safeReadJson, safeWriteJson, StorageLike } from "../services/persistence/safeStorage";
import { STORAGE_KEYS } from "../shared/constants";

export type TaskpaneViewId =
  | "overview"
  | "source"
  | "brief"
  | "automation"
  | "outputs"
  | "activity";

export interface TaskpaneViewDefinition {
  id: TaskpaneViewId;
  label: string;
  description: string;
}

export interface TaskpaneViewModel extends TaskpaneViewDefinition {
  disabled: boolean;
  badge: string;
}

export interface TaskpaneNavigationContext {
  isReady: boolean;
  isExcelHost: boolean;
  selectionReady: boolean;
  bundleReady: boolean;
  outputsReady: boolean;
  diagnosticsCount: number;
}

export const TASKPANE_VIEWS: TaskpaneViewDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Readiness, workflow status, and quick actions.",
  },
  {
    id: "source",
    label: "Data",
    description: "Selection analysis and dataset profiling.",
  },
  {
    id: "brief",
    label: "Plan",
    description: "Prompting, templates, and AI planning settings.",
  },
  {
    id: "automation",
    label: "Automate",
    description: "Bounded workbook automation through Agent Mode.",
  },
  {
    id: "outputs",
    label: "Outputs",
    description: "Workbook, Apps Script, email, and slides.",
  },
  {
    id: "activity",
    label: "Activity",
    description: "Recent run history, diagnostics, and support state.",
  },
];

export function buildTaskpaneViews(context: TaskpaneNavigationContext): TaskpaneViewModel[] {
  return TASKPANE_VIEWS.map((view) => {
    if (view.id === "source") {
      return {
        ...view,
        disabled: !context.isReady,
        badge: context.selectionReady
          ? "Analyzed"
          : context.isExcelHost
            ? "Awaiting selection"
            : "Excel only",
      };
    }

    if (view.id === "brief") {
      return {
        ...view,
        disabled: !context.isReady,
        badge: context.bundleReady ? "Ready" : context.selectionReady ? "Drafting" : "Needs data",
      };
    }

    if (view.id === "automation") {
      return {
        ...view,
        disabled: !context.bundleReady,
        badge: context.bundleReady ? "Ready" : "Locked",
      };
    }

    if (view.id === "outputs") {
      return {
        ...view,
        disabled: !context.selectionReady,
        badge: context.outputsReady
          ? "Generated"
          : context.bundleReady
            ? "Ready"
            : context.selectionReady
              ? "Pending"
              : "Locked",
      };
    }

    if (view.id === "activity") {
      return {
        ...view,
        disabled: false,
        badge:
          context.diagnosticsCount > 0 ? `${context.diagnosticsCount} events` : "Session state",
      };
    }

    return {
      ...view,
      disabled: false,
      badge: context.bundleReady ? "Ready" : context.isReady ? "In progress" : "Starting",
    };
  });
}

export function resolveActiveTaskpaneView(
  preferredView: TaskpaneViewId,
  views: TaskpaneViewModel[]
): TaskpaneViewId {
  const preferred = views.find((view) => view.id === preferredView);
  if (preferred && !preferred.disabled) {
    return preferred.id;
  }

  return views.find((view) => !view.disabled)?.id ?? "overview";
}

export function loadTaskpaneViewPreference(storage?: StorageLike): TaskpaneViewId {
  const stored = safeReadJson<TaskpaneViewId | "configure">(
    STORAGE_KEYS.taskpaneView,
    "overview",
    "local",
    storage,
    "task pane view"
  );

  const normalized = stored === "configure" ? "brief" : stored;
  return TASKPANE_VIEWS.some((view) => view.id === normalized) ? normalized : "overview";
}

export function saveTaskpaneViewPreference(
  view: TaskpaneViewId,
  storage?: StorageLike
): TaskpaneViewId {
  safeWriteJson(STORAGE_KEYS.taskpaneView, view, "local", storage, "task pane view");
  return view;
}
