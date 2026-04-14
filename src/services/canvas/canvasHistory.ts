import { CanvasDocument } from "../../shared/types";
import { normalizeCanvasDocument } from "./canvasGeometry";

export interface CanvasHistoryState {
  undoStack: CanvasDocument[];
  redoStack: CanvasDocument[];
}

export function areCanvasDocumentsEqual(
  left: CanvasDocument | null,
  right: CanvasDocument | null
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    JSON.stringify(normalizeCanvasDocument(left)) === JSON.stringify(normalizeCanvasDocument(right))
  );
}

export function pushCanvasHistory(
  history: CanvasHistoryState,
  current: CanvasDocument | null,
  next: CanvasDocument,
  limit = 40
): CanvasHistoryState {
  if (!current || areCanvasDocumentsEqual(current, next)) {
    return history;
  }

  return {
    undoStack: [...history.undoStack, normalizeCanvasDocument(current)].slice(-limit),
    redoStack: [],
  };
}

export function undoCanvasHistory(
  history: CanvasHistoryState,
  current: CanvasDocument | null
): { history: CanvasHistoryState; document: CanvasDocument | null } {
  const previous = history.undoStack[history.undoStack.length - 1] ?? null;
  if (!previous) {
    return { history, document: current };
  }

  return {
    history: {
      undoStack: history.undoStack.slice(0, -1),
      redoStack: current
        ? [...history.redoStack, normalizeCanvasDocument(current)]
        : history.redoStack,
    },
    document: normalizeCanvasDocument(previous),
  };
}

export function redoCanvasHistory(
  history: CanvasHistoryState,
  current: CanvasDocument | null
): { history: CanvasHistoryState; document: CanvasDocument | null } {
  const next = history.redoStack[history.redoStack.length - 1] ?? null;
  if (!next) {
    return { history, document: current };
  }

  return {
    history: {
      undoStack: current
        ? [...history.undoStack, normalizeCanvasDocument(current)]
        : history.undoStack,
      redoStack: history.redoStack.slice(0, -1),
    },
    document: normalizeCanvasDocument(next),
  };
}
