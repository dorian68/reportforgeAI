import assert from "node:assert/strict";
import test from "node:test";

import {
  pushCanvasHistory,
  redoCanvasHistory,
  undoCanvasHistory,
} from "../src/services/canvas/canvasHistory";
import { CanvasDocument } from "../src/shared/types";

function createDocument(title: string): CanvasDocument {
  return {
    version: 1,
    layoutMode: "freeform",
    pages: [
      {
        id: "page-1",
        label: "Overview",
        format: "canvas",
        layoutMode: "freeform",
        narrativeDensity: "balanced",
        pageRhythm: "headline -> proof",
        blocks: [
          {
            id: "hero",
            kind: "hero",
            title,
            body: "Body",
            x: 1,
            y: 1,
            w: 8,
            h: 3,
            priority: 100,
            emphasis: "high",
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

test("canvas history supports undo and redo over document commits", () => {
  const first = createDocument("Version one");
  const second = createDocument("Version two");
  const third = createDocument("Version three");

  const afterSecond = pushCanvasHistory({ undoStack: [], redoStack: [] }, first, second);
  const afterThird = pushCanvasHistory(afterSecond, second, third);
  assert.equal(afterThird.undoStack.length, 2);

  const undone = undoCanvasHistory(afterThird, third);
  assert.equal(undone.document?.pages[0]?.blocks[0]?.title, "Version two");
  assert.equal(undone.history.redoStack.length, 1);

  const redone = redoCanvasHistory(undone.history, undone.document);
  assert.equal(redone.document?.pages[0]?.blocks[0]?.title, "Version three");
});
