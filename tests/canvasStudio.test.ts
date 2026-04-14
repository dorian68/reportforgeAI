import assert from "node:assert/strict";
import test from "node:test";

import {
  alignCanvasBlocksOnPage,
  compareCanvasPages,
  compareCanvasDocuments,
  copyCanvasBlocksFromPage,
  distributeCanvasBlocksOnPage,
  duplicateCanvasBlocksOnPage,
  offsetCanvasBlocksOnPage,
  pasteCanvasBlocksOnPage,
  removeCanvasBlocksFromPage,
  selectCanvasBlocksInFrame,
  selectCanvasBlocksInPolygon,
  snapCanvasFrame,
  validateCanvasDocumentLayout,
} from "../src/services/canvas/canvasStudio";
import { normalizeCanvasPage } from "../src/services/canvas/canvasGeometry";
import { CanvasDocument, CanvasDocumentSnapshot, CanvasPageSpec } from "../src/shared/types";

function createPage(): CanvasPageSpec {
  return {
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
        title: "Revenue improved",
        body: "Top line improved.",
        x: 1,
        y: 1,
        w: 5,
        h: 3,
        priority: 100,
        emphasis: "high",
      },
      {
        id: "evidence-a",
        kind: "chart-panel",
        title: "Region West drove growth",
        body: "West accelerated month-on-month.",
        x: 7,
        y: 1,
        w: 5,
        h: 3,
        priority: 80,
        emphasis: "medium",
      },
      {
        id: "evidence-b",
        kind: "narrative-panel",
        title: "Margin pressure remained visible",
        body: "Costs rose faster than revenue in two segments.",
        x: 1,
        y: 5,
        w: 5,
        h: 3,
        priority: 70,
        emphasis: "medium",
      },
    ],
  };
}

test("snapCanvasFrame aligns to nearby block guides and returns smart guide metadata", () => {
  const page = normalizeCanvasPage(createPage());
  const startX = (page.blocks[0].frame?.x ?? 0) + 5;
  const snapped = snapCanvasFrame(page, "evidence-b", {
    x: startX,
    y: page.blocks[2].frame?.y ?? 0,
    width: page.blocks[2].frame?.width ?? 320,
    height: page.blocks[2].frame?.height ?? 180,
  });

  assert.equal(snapped.frame.x !== startX, true);
  assert.equal(snapped.guides.some((guide) => guide.axis === "x"), true);
});

test("selectCanvasBlocksInFrame supports marquee multi-selection", () => {
  const page = normalizeCanvasPage(createPage());
  const selectedIds = selectCanvasBlocksInFrame(page, {
    x: 0,
    y: 0,
    width: 900,
    height: 300,
  });

  assert.deepEqual(selectedIds.sort(), ["evidence-a", "hero"]);
});

test("selectCanvasBlocksInPolygon supports freeform lasso selection", () => {
  const page = normalizeCanvasPage(createPage());
  const selectedIds = selectCanvasBlocksInPolygon(page, [
    { x: 10, y: 10 },
    { x: 760, y: 10 },
    { x: 760, y: 330 },
    { x: 420, y: 330 },
    { x: 420, y: 210 },
    { x: 10, y: 210 },
  ]);

  assert.deepEqual(selectedIds.sort(), ["evidence-a", "hero"]);
});

test("align and distribute helpers keep a page coherent for multi-block editing", () => {
  const page = normalizeCanvasPage(createPage());
  const aligned = alignCanvasBlocksOnPage(page, ["hero", "evidence-a"], "top");
  assert.equal(aligned.blocks.find((block) => block.id === "hero")?.frame?.y, aligned.blocks.find((block) => block.id === "evidence-a")?.frame?.y);

  const distributed = distributeCanvasBlocksOnPage(
    normalizeCanvasPage({
      ...page,
      blocks: [
        ...page.blocks,
        {
          id: "evidence-c",
          kind: "summary",
          title: "Third block",
          body: "Summary block",
          x: 7,
          y: 5,
          w: 5,
          h: 3,
          priority: 60,
          emphasis: "low",
        },
      ],
    }),
    ["hero", "evidence-b", "evidence-c"],
    "vertical"
  );

  const orderedFrames = distributed.blocks
    .filter((block) => ["hero", "evidence-b", "evidence-c"].includes(block.id))
    .map((block) => block.frame?.y ?? 0)
    .sort((left, right) => left - right);
  assert.equal(orderedFrames.length, 3);
  assert.equal(orderedFrames[0] < orderedFrames[1] && orderedFrames[1] < orderedFrames[2], true);
});

test("duplicateCanvasBlocksOnPage preserves original blocks and offsets copies", () => {
  const page = normalizeCanvasPage(createPage());
  const duplicated = duplicateCanvasBlocksOnPage(page, ["hero"]);
  assert.equal(duplicated.blocks.length, 4);
  const copy = duplicated.blocks.find((block) => block.id !== "hero" && block.title === "Revenue improved Copy");
  assert.ok(copy);
  assert.equal((copy?.frame?.x ?? 0) > (page.blocks[0].frame?.x ?? 0), true);
});

test("copy and paste helpers preserve block content while generating new positioned copies", () => {
  const page = normalizeCanvasPage(createPage());
  const clipboard = copyCanvasBlocksFromPage(page, ["hero", "evidence-b"]);
  assert.equal(clipboard.length, 2);

  const pasted = pasteCanvasBlocksOnPage(page, clipboard, { x: 48, y: 32 });
  assert.equal(pasted.blocks.length, 5);
  const copies = pasted.blocks.filter((block) => block.title.endsWith("Copy"));
  assert.equal(copies.length, 2);
  assert.equal((copies[0].frame?.x ?? 0) > (page.blocks[0].frame?.x ?? 0), true);
});

test("removeCanvasBlocksFromPage clears dangling groups when blocks are deleted", () => {
  const groupedPage = normalizeCanvasPage({
    ...createPage(),
    groups: [
      {
        id: "group-1",
        name: "Group 1",
        blockIds: ["hero", "evidence-a"],
      },
    ],
    blocks: createPage().blocks.map((block) =>
      block.id === "hero" || block.id === "evidence-a"
        ? { ...block, groupId: "group-1" }
        : block
    ),
  });

  const cleaned = removeCanvasBlocksFromPage(groupedPage, ["hero"]);
  assert.equal(cleaned.groups?.length, 1);
  assert.deepEqual(cleaned.groups?.[0].blockIds, ["evidence-a"]);

  const removedAll = removeCanvasBlocksFromPage(groupedPage, ["hero", "evidence-a"]);
  assert.equal(removedAll.groups?.length ?? 0, 0);
});

test("offsetCanvasBlocksOnPage nudges all selected blocks while keeping their relative spacing", () => {
  const page = normalizeCanvasPage(createPage());
  const moved = offsetCanvasBlocksOnPage(page, ["hero", "evidence-a"], 32, 16);
  const nextHero = moved.blocks.find((block) => block.id === "hero");
  const nextEvidence = moved.blocks.find((block) => block.id === "evidence-a");

  assert.equal(nextHero?.frame?.x, (page.blocks[0].frame?.x ?? 0) + 32);
  assert.equal(nextEvidence?.frame?.x, (page.blocks[1].frame?.x ?? 0) + 32);
  assert.equal(nextEvidence?.frame?.y, (page.blocks[1].frame?.y ?? 0) + 16);
});

test("validateCanvasDocumentLayout flags overlap corruption and duplicate content", () => {
  const page = normalizeCanvasPage(createPage());
  const overlappingDocument: CanvasDocument = {
    version: 1,
    layoutMode: "freeform",
    pages: [
      {
        ...page,
        blocks: [
          page.blocks[0],
          {
            ...page.blocks[1],
            kind: page.blocks[0].kind,
            title: page.blocks[0].title,
            frame: page.blocks[0].frame,
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  const issues = validateCanvasDocumentLayout(overlappingDocument);
  assert.equal(issues.some((issue) => issue.code === "overlap"), true);
  assert.equal(issues.some((issue) => issue.code === "duplicate-block"), true);
});

test("compareCanvasDocuments highlights changed, added, and removed blocks per page", () => {
  const page = normalizeCanvasPage(createPage());
  const current: CanvasDocument = {
    version: 1,
    layoutMode: "freeform",
    pages: [
      {
        ...page,
        blocks: [
          {
            ...page.blocks[0],
            body: "Updated narrative.",
          },
          page.blocks[1],
          {
            id: "new-block",
            kind: "callout",
            title: "New emphasis",
            body: "Fresh block",
            x: 1,
            y: 9,
            w: 4,
            h: 2,
            priority: 50,
            emphasis: "low",
          },
        ],
      },
    ],
    updatedAt: new Date().toISOString(),
  };
  const snapshot: CanvasDocumentSnapshot = {
    id: "snapshot-1",
    label: "Earlier",
    createdAt: new Date().toISOString(),
    document: {
      version: 1,
      layoutMode: "freeform",
      pages: [page],
      updatedAt: new Date().toISOString(),
    },
  };

  const comparison = compareCanvasDocuments(current, snapshot);
  assert.ok(comparison);
  assert.equal(comparison?.changedPages.length, 1);
  assert.equal(comparison?.changedPages[0].changedBlockTitles.includes("Revenue improved"), true);
  assert.equal(comparison?.changedPages[0].addedBlockTitles.includes("New emphasis"), true);
  assert.equal(comparison?.changedPages[0].removedBlockTitles.includes("Margin pressure remained visible"), true);
});

test("compareCanvasPages returns block-level states for richer visual diffing", () => {
  const page = normalizeCanvasPage(createPage());
  const currentPage = normalizeCanvasPage({
    ...page,
    blocks: [
      {
        ...page.blocks[0],
        body: "Updated narrative.",
      },
      page.blocks[1],
      {
        id: "new-block",
        kind: "callout",
        title: "New emphasis",
        body: "Fresh block",
        x: 1,
        y: 9,
        w: 4,
        h: 2,
        priority: 50,
        emphasis: "low",
      },
    ],
  });

  const pageComparison = compareCanvasPages(currentPage, page);
  assert.ok(pageComparison);
  assert.equal(pageComparison?.currentBlockStates.hero, "changed");
  assert.equal(pageComparison?.currentBlockStates["new-block"], "added");
  assert.equal(pageComparison?.removedBlocks.some((block) => block.id === "evidence-b"), true);
});
