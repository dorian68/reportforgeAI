import {
  CanvasBlockFrame,
  CanvasBlockSpec,
  CanvasDocument,
  CanvasGuide,
  CanvasPageSpec,
  CanvasSafeMargin,
  CanvasSnapRule,
  CanvasLayer,
  CanvasGroup,
} from "../../shared/types";

export const DEFAULT_CANVAS_WIDTH = 1200;
export const DEFAULT_CANVAS_HEIGHT = 675;
export const DEFAULT_CANVAS_GRID_COLUMNS = 12;
export const DEFAULT_CANVAS_ROW_HEIGHT = 88;
export const DEFAULT_CANVAS_GAP = 16;
export const DEFAULT_CANVAS_PADDING = 16;
export const DEFAULT_CANVAS_SAFE_MARGIN = 24;
const DEFAULT_MAX_GRID_ROWS = 24;
const MIN_CANVAS_BLOCK_WIDTH = 120;
const MIN_CANVAS_BLOCK_HEIGHT = 72;
const DEFAULT_LAYER_ID = "layer-main";

function createDefaultSafeMargin(): CanvasSafeMargin {
  return {
    top: DEFAULT_CANVAS_SAFE_MARGIN,
    right: DEFAULT_CANVAS_SAFE_MARGIN,
    bottom: DEFAULT_CANVAS_SAFE_MARGIN,
    left: DEFAULT_CANVAS_SAFE_MARGIN,
  };
}

function createDefaultLayers(): CanvasLayer[] {
  return [
    {
      id: DEFAULT_LAYER_ID,
      name: "Content",
      order: 1,
      visible: true,
      locked: false,
    },
  ];
}

function createSafeMarginGuides(page: {
  canvasWidth: number;
  canvasHeight: number;
  safeMargin: CanvasSafeMargin;
}): CanvasGuide[] {
  return [
    {
      id: "guide-safe-left",
      axis: "x",
      position: page.safeMargin.left,
      kind: "safe-margin",
      label: "Safe left",
    },
    {
      id: "guide-safe-right",
      axis: "x",
      position: page.canvasWidth - page.safeMargin.right,
      kind: "safe-margin",
      label: "Safe right",
    },
    {
      id: "guide-safe-top",
      axis: "y",
      position: page.safeMargin.top,
      kind: "safe-margin",
      label: "Safe top",
    },
    {
      id: "guide-safe-bottom",
      axis: "y",
      position: page.canvasHeight - page.safeMargin.bottom,
      kind: "safe-margin",
      label: "Safe bottom",
    },
  ];
}

function createDefaultSnapRules(): CanvasSnapRule[] {
  return [
    { id: "snap-grid", kind: "grid", enabled: true, tolerance: 12 },
    { id: "snap-blocks", kind: "blocks", enabled: true, tolerance: 12 },
    { id: "snap-guides", kind: "guides", enabled: true, tolerance: 10 },
    { id: "snap-safe-margin", kind: "safe-margin", enabled: true, tolerance: 10 },
  ];
}

export interface NormalizedCanvasPage extends CanvasPageSpec {
  canvasWidth: number;
  canvasHeight: number;
  gridColumns: number;
  gridUnitHeight: number;
  blocks: CanvasBlockSpec[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToPixel(value: number): number {
  return Math.round(value);
}

function toColumnWidth(page: NormalizedCanvasPage): number {
  return (
    (page.canvasWidth - DEFAULT_CANVAS_PADDING * 2 - (page.gridColumns - 1) * DEFAULT_CANVAS_GAP) /
    page.gridColumns
  );
}

function toColumnStart(page: NormalizedCanvasPage, x: number): number {
  const columnWidth = toColumnWidth(page);
  return DEFAULT_CANVAS_PADDING + (x - 1) * (columnWidth + DEFAULT_CANVAS_GAP);
}

function toRowStart(y: number, rowHeight: number): number {
  return DEFAULT_CANVAS_PADDING + (y - 1) * (rowHeight + DEFAULT_CANVAS_GAP);
}

export function gridToCanvasFrame(
  block: Pick<CanvasBlockSpec, "x" | "y" | "w" | "h">,
  page: NormalizedCanvasPage
): CanvasBlockFrame {
  const columnWidth = toColumnWidth(page);
  return {
    x: roundToPixel(toColumnStart(page, clamp(block.x, 1, page.gridColumns))),
    y: roundToPixel(toRowStart(clamp(block.y, 1, DEFAULT_MAX_GRID_ROWS), page.gridUnitHeight)),
    width: roundToPixel(columnWidth * block.w + DEFAULT_CANVAS_GAP * Math.max(block.w - 1, 0)),
    height: roundToPixel(
      page.gridUnitHeight * block.h + DEFAULT_CANVAS_GAP * Math.max(block.h - 1, 0)
    ),
  };
}

export function canvasFrameToGrid(
  frame: CanvasBlockFrame,
  page: NormalizedCanvasPage
): Pick<CanvasBlockSpec, "x" | "y" | "w" | "h"> {
  const columnWidth = toColumnWidth(page);
  const unitWidth = columnWidth + DEFAULT_CANVAS_GAP;
  const unitHeight = page.gridUnitHeight + DEFAULT_CANVAS_GAP;
  const x = clamp(
    Math.round((frame.x - DEFAULT_CANVAS_PADDING) / unitWidth) + 1,
    1,
    page.gridColumns
  );
  const y = clamp(
    Math.round((frame.y - DEFAULT_CANVAS_PADDING) / unitHeight) + 1,
    1,
    DEFAULT_MAX_GRID_ROWS
  );
  const w = clamp(Math.round((frame.width + DEFAULT_CANVAS_GAP) / unitWidth), 1, page.gridColumns);
  const h = clamp(Math.round((frame.height + DEFAULT_CANVAS_GAP) / unitHeight), 1, 12);

  return { x, y, w, h };
}

export function clampCanvasFrame(
  frame: CanvasBlockFrame,
  page: NormalizedCanvasPage
): CanvasBlockFrame {
  const width = clamp(
    frame.width,
    MIN_CANVAS_BLOCK_WIDTH,
    page.canvasWidth - DEFAULT_CANVAS_PADDING * 2
  );
  const height = clamp(
    frame.height,
    MIN_CANVAS_BLOCK_HEIGHT,
    page.canvasHeight - DEFAULT_CANVAS_PADDING * 2
  );

  return {
    x: roundToPixel(
      clamp(frame.x, DEFAULT_CANVAS_PADDING, page.canvasWidth - DEFAULT_CANVAS_PADDING - width)
    ),
    y: roundToPixel(
      clamp(frame.y, DEFAULT_CANVAS_PADDING, page.canvasHeight - DEFAULT_CANVAS_PADDING - height)
    ),
    width: roundToPixel(width),
    height: roundToPixel(height),
  };
}

export function normalizeCanvasBlock(
  block: CanvasBlockSpec,
  page: NormalizedCanvasPage
): CanvasBlockSpec {
  const clampedFrame = clampCanvasFrame(block.frame ?? gridToCanvasFrame(block, page), page);
  const layerId = block.layerId ?? page.layers?.[0]?.id ?? DEFAULT_LAYER_ID;
  return {
    ...block,
    ...canvasFrameToGrid(clampedFrame, page),
    frame: clampedFrame,
    layerId,
    visible: block.visible ?? true,
    locked: block.locked ?? false,
    zIndex: block.zIndex ?? 0,
    rotation: block.rotation ?? 0,
  };
}

export function normalizeCanvasPage(page: CanvasPageSpec): NormalizedCanvasPage {
  const safeMargin = page.safeMargin ?? createDefaultSafeMargin();
  const layers = (page.layers?.length ? page.layers : createDefaultLayers()).map(
    (layer, index) => ({
      ...layer,
      order: layer.order ?? index + 1,
      visible: layer.visible ?? true,
      locked: layer.locked ?? false,
    })
  );
  const groups = (page.groups ?? []).filter(
    (group): group is CanvasGroup => group.blockIds.length > 0
  );
  const normalizedPage: NormalizedCanvasPage = {
    ...page,
    canvasWidth: page.canvasWidth ?? DEFAULT_CANVAS_WIDTH,
    canvasHeight: page.canvasHeight ?? DEFAULT_CANVAS_HEIGHT,
    gridColumns: page.gridColumns ?? DEFAULT_CANVAS_GRID_COLUMNS,
    gridUnitHeight: page.gridUnitHeight ?? DEFAULT_CANVAS_ROW_HEIGHT,
    safeMargin,
    layers,
    groups,
    snapRules: page.snapRules?.length ? page.snapRules : createDefaultSnapRules(),
    guides: [],
    blocks: [],
  };
  const normalizedBlocks = page.blocks.map((block, index) =>
    normalizeCanvasBlock(
      {
        ...block,
        zIndex: block.zIndex ?? index,
      },
      normalizedPage
    )
  );
  const blockIds = new Set(normalizedBlocks.map((block) => block.id));
  normalizedPage.groups = groups
    .map((group) => ({
      ...group,
      blockIds: group.blockIds.filter((blockId) => blockIds.has(blockId)),
    }))
    .filter((group) => group.blockIds.length > 0);
  normalizedPage.guides = [
    ...createSafeMarginGuides({
      canvasWidth: normalizedPage.canvasWidth,
      canvasHeight: normalizedPage.canvasHeight,
      safeMargin,
    }),
    ...(page.guides ?? []).filter((guide) => guide.kind !== "safe-margin"),
  ];
  normalizedPage.blocks = normalizedBlocks;
  return normalizedPage;
}

export function normalizeCanvasDocument(document: CanvasDocument): CanvasDocument {
  return {
    ...document,
    pages: document.pages.map((page) => normalizeCanvasPage(page)),
  };
}

export function patchCanvasBlockFrame(
  block: CanvasBlockSpec,
  page: NormalizedCanvasPage,
  patch: Partial<CanvasBlockFrame>
): CanvasBlockSpec {
  return normalizeCanvasBlock(
    {
      ...block,
      frame: {
        ...(block.frame ?? gridToCanvasFrame(block, page)),
        ...patch,
      },
    },
    page
  );
}

export function createCanvasPageFrameStyle(
  frame: CanvasBlockFrame,
  page: NormalizedCanvasPage
): string {
  const left = ((frame.x / page.canvasWidth) * 100).toFixed(4);
  const top = ((frame.y / page.canvasHeight) * 100).toFixed(4);
  const width = ((frame.width / page.canvasWidth) * 100).toFixed(4);
  const height = ((frame.height / page.canvasHeight) * 100).toFixed(4);
  return `left:${left}%;top:${top}%;width:${width}%;height:${height}%;`;
}
