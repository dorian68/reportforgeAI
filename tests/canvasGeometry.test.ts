import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeCanvasDocument,
  normalizeCanvasPage,
  patchCanvasBlockFrame,
} from "../src/services/canvas/canvasGeometry";
import { CanvasDocument } from "../src/shared/types";

test("normalizeCanvasDocument hydrates absolute frames from legacy grid coordinates", () => {
  const document: CanvasDocument = {
    version: 1,
    layoutMode: "freeform",
    pages: [
      {
        id: "page-1",
        label: "Canvas Overview",
        format: "canvas",
        layoutMode: "freeform",
        narrativeDensity: "balanced",
        pageRhythm: "message -> proof",
        blocks: [
          {
            id: "hero",
            kind: "hero",
            title: "Revenue improved",
            body: "Revenue improved across the latest period.",
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

  const normalized = normalizeCanvasDocument(document);
  const page = normalized.pages[0];
  const block = page?.blocks[0];

  assert.equal(page?.canvasWidth, 1200);
  assert.equal(page?.canvasHeight, 675);
  assert.equal(Boolean(block?.frame), true);
  assert.equal((block?.frame?.width ?? 0) > 0, true);
});

test("patchCanvasBlockFrame keeps grid placement synchronized with pixel edits", () => {
  const page = normalizeCanvasPage({
    id: "page-1",
    label: "Canvas Overview",
    format: "canvas",
    layoutMode: "freeform",
    narrativeDensity: "balanced",
    pageRhythm: "message -> proof",
    blocks: [
      {
        id: "chart",
        kind: "chart-panel",
        title: "Chart",
        body: "Trend evidence",
        x: 1,
        y: 1,
        w: 6,
        h: 3,
        priority: 80,
        emphasis: "medium",
      },
    ],
  });

  const updated = patchCanvasBlockFrame(page.blocks[0], page, {
    x: 420,
    y: 128,
    width: 360,
    height: 210,
  });

  assert.equal(updated.frame?.x, 420);
  assert.equal(updated.frame?.width, 360);
  assert.equal(updated.x >= 1, true);
  assert.equal(updated.w >= 1, true);
});
