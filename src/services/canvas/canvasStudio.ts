import {
  CanvasBlockFrame,
  CanvasBlockSpec,
  CanvasDocument,
  CanvasDocumentSnapshot,
  CanvasGroup,
  CanvasGuide,
  CanvasPageSpec,
} from "../../shared/types";
import {
  DEFAULT_CANVAS_PADDING,
  NormalizedCanvasPage,
  clampCanvasFrame,
  normalizeCanvasDocument,
  normalizeCanvasPage,
  patchCanvasBlockFrame,
} from "./canvasGeometry";

export type CanvasAlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type CanvasDistributeAxis = "horizontal" | "vertical";
export type CanvasEqualizeDimension = "width" | "height";
export type CanvasReorderMode = "front" | "back" | "forward" | "backward";
export type CanvasLayoutIssueCode =
  | "overlap"
  | "out-of-bounds"
  | "duplicate-block"
  | "overloaded-page"
  | "missing-visible-layer";

export interface CanvasSelectionFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasSelectionPoint {
  x: number;
  y: number;
}

export interface CanvasSnapResult {
  frame: CanvasBlockFrame;
  guides: CanvasGuide[];
}

export interface CanvasLayoutIssue {
  code: CanvasLayoutIssueCode;
  severity: "warning" | "error";
  pageId: string;
  message: string;
  blockIds?: string[];
}

export interface CanvasPageComparison {
  pageId: string;
  label: string;
  addedBlockTitles: string[];
  removedBlockTitles: string[];
  changedBlockTitles: string[];
}

export interface CanvasDocumentComparison {
  pageDelta: number;
  blockDelta: number;
  changedPages: CanvasPageComparison[];
}

export interface CanvasPageComparisonDetail {
  pageId: string;
  addedBlockIds: string[];
  changedBlockIds: string[];
  removedBlocks: CanvasBlockSpec[];
  currentBlockStates: Record<string, "unchanged" | "added" | "changed">;
}

export interface CanvasClipboardEntry {
  kind: CanvasBlockSpec["kind"];
  title: string;
  body: string;
  supportingText?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  frame?: CanvasBlockFrame;
  priority: number;
  emphasis: CanvasBlockSpec["emphasis"];
  chartId?: string;
  findingIds?: string[];
  metricIds?: string[];
  formatTargets?: CanvasBlockSpec["formatTargets"];
  styleToken?: string;
  layerId?: string;
  groupId?: string;
  visible?: boolean;
  locked?: boolean;
  zIndex?: number;
  rotation?: number;
}

function intersects(left: CanvasBlockFrame, right: CanvasBlockFrame): boolean {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

function isPointInPolygon(point: CanvasSelectionPoint, polygon: CanvasSelectionPoint[]): boolean {
  let inside = false;
  for (
    let index = 0, compareIndex = polygon.length - 1;
    index < polygon.length;
    compareIndex = index, index += 1
  ) {
    const current = polygon[index];
    const previous = polygon[compareIndex];
    const intersectsEdge =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y || 1e-9) +
          current.x;

    if (intersectsEdge) {
      inside = !inside;
    }
  }

  return inside;
}

function orientation(
  left: CanvasSelectionPoint,
  middle: CanvasSelectionPoint,
  right: CanvasSelectionPoint
): number {
  return (middle.y - left.y) * (right.x - middle.x) - (middle.x - left.x) * (right.y - middle.y);
}

function onSegment(
  left: CanvasSelectionPoint,
  middle: CanvasSelectionPoint,
  right: CanvasSelectionPoint
): boolean {
  return (
    middle.x <= Math.max(left.x, right.x) &&
    middle.x >= Math.min(left.x, right.x) &&
    middle.y <= Math.max(left.y, right.y) &&
    middle.y >= Math.min(left.y, right.y)
  );
}

function segmentsIntersect(
  leftStart: CanvasSelectionPoint,
  leftEnd: CanvasSelectionPoint,
  rightStart: CanvasSelectionPoint,
  rightEnd: CanvasSelectionPoint
): boolean {
  const orientationOne = orientation(leftStart, leftEnd, rightStart);
  const orientationTwo = orientation(leftStart, leftEnd, rightEnd);
  const orientationThree = orientation(rightStart, rightEnd, leftStart);
  const orientationFour = orientation(rightStart, rightEnd, leftEnd);

  if (
    ((orientationOne > 0 && orientationTwo < 0) || (orientationOne < 0 && orientationTwo > 0)) &&
    ((orientationThree > 0 && orientationFour < 0) || (orientationThree < 0 && orientationFour > 0))
  ) {
    return true;
  }

  if (orientationOne === 0 && onSegment(leftStart, rightStart, leftEnd)) {
    return true;
  }
  if (orientationTwo === 0 && onSegment(leftStart, rightEnd, leftEnd)) {
    return true;
  }
  if (orientationThree === 0 && onSegment(rightStart, leftStart, rightEnd)) {
    return true;
  }
  if (orientationFour === 0 && onSegment(rightStart, leftEnd, rightEnd)) {
    return true;
  }

  return false;
}

function polygonIntersectsFrame(polygon: CanvasSelectionPoint[], frame: CanvasBlockFrame): boolean {
  const framePoints: CanvasSelectionPoint[] = [
    { x: frame.x, y: frame.y },
    { x: frame.x + frame.width, y: frame.y },
    { x: frame.x + frame.width, y: frame.y + frame.height },
    { x: frame.x, y: frame.y + frame.height },
  ];
  const frameCenter = {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  };

  if (
    isPointInPolygon(frameCenter, polygon) ||
    framePoints.some((point) => isPointInPolygon(point, polygon))
  ) {
    return true;
  }

  if (
    polygon.some(
      (point) =>
        point.x >= frame.x &&
        point.x <= frame.x + frame.width &&
        point.y >= frame.y &&
        point.y <= frame.y + frame.height
    )
  ) {
    return true;
  }

  for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex += 1) {
    const polygonStart = polygon[polygonIndex];
    const polygonEnd = polygon[(polygonIndex + 1) % polygon.length];

    for (let frameIndex = 0; frameIndex < framePoints.length; frameIndex += 1) {
      const frameStart = framePoints[frameIndex];
      const frameEnd = framePoints[(frameIndex + 1) % framePoints.length];
      if (segmentsIntersect(polygonStart, polygonEnd, frameStart, frameEnd)) {
        return true;
      }
    }
  }

  return false;
}

function midpoint(start: number, size: number): number {
  return start + size / 2;
}

function sortByFrame(blocks: CanvasBlockSpec[], axis: CanvasDistributeAxis): CanvasBlockSpec[] {
  return [...blocks].sort((left, right) =>
    axis === "horizontal"
      ? (left.frame?.x ?? 0) - (right.frame?.x ?? 0)
      : (left.frame?.y ?? 0) - (right.frame?.y ?? 0)
  );
}

function replacePage(document: CanvasDocument, nextPage: CanvasPageSpec): CanvasDocument {
  return normalizeCanvasDocument({
    ...document,
    updatedAt: new Date().toISOString(),
    pages: document.pages.map((page) => (page.id === nextPage.id ? nextPage : page)),
  });
}

function createGuide(axis: CanvasGuide["axis"], position: number, label: string): CanvasGuide {
  return {
    id: `smart-${axis}-${label}-${Math.round(position)}`,
    axis,
    position,
    kind: "smart",
    label,
  };
}

function getSnapTolerance(page: NormalizedCanvasPage, kind: CanvasGuide["kind"]): number {
  const ruleKind = kind === "smart" ? "blocks" : kind === "safe-margin" ? "safe-margin" : "guides";
  return page.snapRules?.find((rule) => rule.kind === ruleKind && rule.enabled)?.tolerance ?? 10;
}

export function getRenderableCanvasBlocks(
  page: CanvasPageSpec,
  format?: CanvasPageSpec["format"]
): CanvasBlockSpec[] {
  return [...normalizeCanvasPage(page).blocks]
    .filter((block) => block.visible !== false)
    .filter(
      (block) => !format || !block.formatTargets?.length || block.formatTargets.includes(format)
    )
    .sort(
      (left, right) =>
        (left.zIndex ?? 0) - (right.zIndex ?? 0) ||
        left.y - right.y ||
        left.x - right.x ||
        right.priority - left.priority
    );
}

export function selectCanvasBlocksInFrame(
  page: CanvasPageSpec,
  selection: CanvasSelectionFrame
): string[] {
  const normalizedPage = normalizeCanvasPage(page);
  const normalizedSelection = clampCanvasFrame(selection, normalizedPage);
  return normalizedPage.blocks
    .filter((block) => block.visible !== false)
    .filter((block) => block.frame && intersects(block.frame, normalizedSelection))
    .map((block) => block.id);
}

export function selectCanvasBlocksInPolygon(
  page: CanvasPageSpec,
  points: CanvasSelectionPoint[]
): string[] {
  const normalizedPage = normalizeCanvasPage(page);
  if (points.length < 3) {
    return [];
  }

  return normalizedPage.blocks
    .filter((block) => block.visible !== false)
    .filter((block) => block.frame && polygonIntersectsFrame(points, block.frame))
    .map((block) => block.id);
}

export function snapCanvasFrame(
  page: CanvasPageSpec,
  blockId: string,
  frame: CanvasBlockFrame
): CanvasSnapResult {
  const normalizedPage = normalizeCanvasPage(page);
  let nextFrame = clampCanvasFrame(frame, normalizedPage);
  const guides: CanvasGuide[] = [];

  const gridTolerance =
    normalizedPage.snapRules?.find((rule) => rule.kind === "grid" && rule.enabled)?.tolerance ?? 12;
  const gridFrame = clampCanvasFrame(
    patchCanvasBlockFrame(
      normalizedPage.blocks.find((block) => block.id === blockId) ?? normalizedPage.blocks[0],
      normalizedPage,
      nextFrame
    ).frame ?? nextFrame,
    normalizedPage
  );

  (["x", "y", "width", "height"] as const).forEach((key) => {
    if (Math.abs(nextFrame[key] - gridFrame[key]) <= gridTolerance) {
      nextFrame = {
        ...nextFrame,
        [key]: gridFrame[key],
      };
      if (key === "x") {
        guides.push(createGuide("x", gridFrame.x, "grid-left"));
      }
      if (key === "y") {
        guides.push(createGuide("y", gridFrame.y, "grid-top"));
      }
    }
  });

  const visibleBlocks = normalizedPage.blocks.filter(
    (block) => block.id !== blockId && block.visible !== false && block.frame
  );
  const axisCandidates = visibleBlocks.flatMap((block) => {
    const candidateFrame = block.frame as CanvasBlockFrame;
    return [
      { axis: "x" as const, label: "left", value: candidateFrame.x },
      {
        axis: "x" as const,
        label: "center",
        value: midpoint(candidateFrame.x, candidateFrame.width),
      },
      { axis: "x" as const, label: "right", value: candidateFrame.x + candidateFrame.width },
      { axis: "y" as const, label: "top", value: candidateFrame.y },
      {
        axis: "y" as const,
        label: "middle",
        value: midpoint(candidateFrame.y, candidateFrame.height),
      },
      { axis: "y" as const, label: "bottom", value: candidateFrame.y + candidateFrame.height },
    ];
  });

  const activeGuides = normalizedPage.guides ?? [];
  activeGuides.forEach((guide) => {
    axisCandidates.push({
      axis: guide.axis,
      label: guide.label ?? guide.id,
      value: guide.position,
    });
  });

  const horizontalTargets = [
    { key: "x" as const, value: nextFrame.x, delta: (target: number) => target },
    {
      key: "x" as const,
      value: midpoint(nextFrame.x, nextFrame.width),
      delta: (target: number) => target - nextFrame.width / 2,
    },
    {
      key: "x" as const,
      value: nextFrame.x + nextFrame.width,
      delta: (target: number) => target - nextFrame.width,
    },
  ];
  const verticalTargets = [
    { key: "y" as const, value: nextFrame.y, delta: (target: number) => target },
    {
      key: "y" as const,
      value: midpoint(nextFrame.y, nextFrame.height),
      delta: (target: number) => target - nextFrame.height / 2,
    },
    {
      key: "y" as const,
      value: nextFrame.y + nextFrame.height,
      delta: (target: number) => target - nextFrame.height,
    },
  ];

  const axes = [
    {
      candidates: axisCandidates.filter((candidate) => candidate.axis === "x"),
      targets: horizontalTargets,
      axis: "x" as const,
    },
    {
      candidates: axisCandidates.filter((candidate) => candidate.axis === "y"),
      targets: verticalTargets,
      axis: "y" as const,
    },
  ];

  axes.forEach(({ candidates, targets, axis }) => {
    const tolerance = Math.max(
      getSnapTolerance(normalizedPage, "smart"),
      getSnapTolerance(normalizedPage, "safe-margin")
    );
    let best:
      | {
          difference: number;
          targetValue: number;
          candidateLabel: string;
          targetIndex: number;
        }
      | undefined;

    targets.forEach((target, targetIndex) => {
      candidates.forEach((candidate) => {
        const difference = Math.abs(candidate.value - target.value);
        if (difference > tolerance) {
          return;
        }
        if (!best || difference < best.difference) {
          best = {
            difference,
            targetValue: candidate.value,
            candidateLabel: candidate.label,
            targetIndex,
          };
        }
      });
    });

    if (best) {
      const resolved = targets[best.targetIndex];
      nextFrame = {
        ...nextFrame,
        [resolved.key]: resolved.delta(best.targetValue),
      };
      guides.push(createGuide(axis, best.targetValue, best.candidateLabel));
    }
  });

  return {
    frame: clampCanvasFrame(nextFrame, normalizedPage),
    guides,
  };
}

export function alignCanvasBlocksOnPage(
  page: CanvasPageSpec,
  blockIds: string[],
  mode: CanvasAlignMode
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  const selectedBlocks = normalizedPage.blocks.filter((block) => blockIds.includes(block.id));
  if (selectedBlocks.length < 2) {
    return normalizedPage;
  }

  const xs = selectedBlocks.map((block) => block.frame?.x ?? 0);
  const ys = selectedBlocks.map((block) => block.frame?.y ?? 0);
  const rights = selectedBlocks.map((block) => (block.frame?.x ?? 0) + (block.frame?.width ?? 0));
  const bottoms = selectedBlocks.map((block) => (block.frame?.y ?? 0) + (block.frame?.height ?? 0));
  const target =
    mode === "left"
      ? Math.min(...xs)
      : mode === "center"
        ? midpoint(Math.min(...xs), Math.max(...rights) - Math.min(...xs))
        : mode === "right"
          ? Math.max(...rights)
          : mode === "top"
            ? Math.min(...ys)
            : mode === "middle"
              ? midpoint(Math.min(...ys), Math.max(...bottoms) - Math.min(...ys))
              : Math.max(...bottoms);

  const nextBlocks = normalizedPage.blocks.map((block) => {
    if (!blockIds.includes(block.id)) {
      return block;
    }
    const frame = block.frame ?? { x: 0, y: 0, width: 320, height: 180 };
    const nextFrame =
      mode === "left"
        ? { ...frame, x: target }
        : mode === "center"
          ? { ...frame, x: target - frame.width / 2 }
          : mode === "right"
            ? { ...frame, x: target - frame.width }
            : mode === "top"
              ? { ...frame, y: target }
              : mode === "middle"
                ? { ...frame, y: target - frame.height / 2 }
                : { ...frame, y: target - frame.height };
    return patchCanvasBlockFrame(block, normalizedPage, nextFrame);
  });

  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: nextBlocks,
  });
}

export function distributeCanvasBlocksOnPage(
  page: CanvasPageSpec,
  blockIds: string[],
  axis: CanvasDistributeAxis
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  const selectedBlocks = sortByFrame(
    normalizedPage.blocks.filter((block) => blockIds.includes(block.id)),
    axis
  );
  if (selectedBlocks.length < 3) {
    return normalizedPage;
  }

  const first = selectedBlocks[0].frame as CanvasBlockFrame;
  const last = selectedBlocks[selectedBlocks.length - 1].frame as CanvasBlockFrame;
  const availableSpace =
    axis === "horizontal" ? last.x + last.width - first.x : last.y + last.height - first.y;
  const occupiedSpace = selectedBlocks.reduce(
    (sum, block) =>
      sum + (axis === "horizontal" ? (block.frame?.width ?? 0) : (block.frame?.height ?? 0)),
    0
  );
  const gap = (availableSpace - occupiedSpace) / (selectedBlocks.length - 1);
  let cursor = axis === "horizontal" ? first.x : first.y;
  const nextFrames = new Map<string, CanvasBlockFrame>();

  selectedBlocks.forEach((block) => {
    const frame = block.frame as CanvasBlockFrame;
    nextFrames.set(
      block.id,
      axis === "horizontal" ? { ...frame, x: cursor } : { ...frame, y: cursor }
    );
    cursor += (axis === "horizontal" ? frame.width : frame.height) + gap;
  });

  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: normalizedPage.blocks.map((block) =>
      nextFrames.has(block.id)
        ? patchCanvasBlockFrame(block, normalizedPage, nextFrames.get(block.id) as CanvasBlockFrame)
        : block
    ),
  });
}

export function equalizeCanvasBlocksOnPage(
  page: CanvasPageSpec,
  blockIds: string[],
  dimension: CanvasEqualizeDimension
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  const selectedBlocks = normalizedPage.blocks.filter((block) => blockIds.includes(block.id));
  if (selectedBlocks.length < 2) {
    return normalizedPage;
  }

  const target = Math.max(
    ...selectedBlocks.map((block) =>
      dimension === "width" ? (block.frame?.width ?? 0) : (block.frame?.height ?? 0)
    )
  );
  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: normalizedPage.blocks.map((block) =>
      blockIds.includes(block.id)
        ? patchCanvasBlockFrame(block, normalizedPage, {
            [dimension]: target,
          } as Partial<CanvasBlockFrame>)
        : block
    ),
  });
}

export function offsetCanvasBlocksOnPage(
  page: CanvasPageSpec,
  blockIds: string[],
  dx: number,
  dy: number
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  if (blockIds.length === 0 || (!dx && !dy)) {
    return normalizedPage;
  }

  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: normalizedPage.blocks.map((block) =>
      blockIds.includes(block.id)
        ? patchCanvasBlockFrame(block, normalizedPage, {
            x: (block.frame?.x ?? 0) + dx,
            y: (block.frame?.y ?? 0) + dy,
          })
        : block
    ),
  });
}

export function copyCanvasBlocksFromPage(
  page: CanvasPageSpec,
  blockIds: string[]
): CanvasClipboardEntry[] {
  const normalizedPage = normalizeCanvasPage(page);
  return normalizedPage.blocks
    .filter((block) => blockIds.includes(block.id))
    .map((block) => ({
      kind: block.kind,
      title: block.title,
      body: block.body,
      supportingText: block.supportingText,
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
      frame: block.frame ? { ...block.frame } : undefined,
      priority: block.priority,
      emphasis: block.emphasis,
      chartId: block.chartId,
      findingIds: block.findingIds ? [...block.findingIds] : undefined,
      metricIds: block.metricIds ? [...block.metricIds] : undefined,
      formatTargets: block.formatTargets ? [...block.formatTargets] : undefined,
      styleToken: block.styleToken,
      layerId: block.layerId,
      groupId: block.groupId,
      visible: block.visible,
      locked: false,
      zIndex: block.zIndex,
      rotation: block.rotation,
    }));
}

export function pasteCanvasBlocksOnPage(
  page: CanvasPageSpec,
  entries: CanvasClipboardEntry[],
  offset: { x: number; y: number } = { x: 24, y: 24 }
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  if (entries.length === 0) {
    return normalizedPage;
  }

  const nextBaseZIndex =
    Math.max(...normalizedPage.blocks.map((entry) => entry.zIndex ?? 0), 0) + 1;
  const copies = entries.map((entry, index) =>
    patchCanvasBlockFrame(
      {
        ...entry,
        id: `canvas-paste-${Date.now().toString(36)}-${index + 1}`,
        title: `${entry.title} Copy`,
        zIndex: nextBaseZIndex + index,
      },
      normalizedPage,
      {
        x: (entry.frame?.x ?? DEFAULT_CANVAS_PADDING) + offset.x,
        y: (entry.frame?.y ?? DEFAULT_CANVAS_PADDING) + offset.y,
      }
    )
  );

  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: [...normalizedPage.blocks, ...copies],
  });
}

export function duplicateCanvasBlocksOnPage(
  page: CanvasPageSpec,
  blockIds: string[]
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  const duplicates = normalizedPage.blocks
    .filter((block) => blockIds.includes(block.id))
    .map((block, index) => {
      const nextZIndex =
        Math.max(...normalizedPage.blocks.map((entry) => entry.zIndex ?? 0), 0) + index + 1;
      return patchCanvasBlockFrame(
        {
          ...block,
          id: `${block.id}-copy-${Date.now().toString(36)}-${index + 1}`,
          title: `${block.title} Copy`,
          zIndex: nextZIndex,
        },
        normalizedPage,
        {
          x: (block.frame?.x ?? 0) + 24,
          y: (block.frame?.y ?? 0) + 24,
        }
      );
    });

  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: [...normalizedPage.blocks, ...duplicates],
  });
}

export function setCanvasBlocksLocked(
  page: CanvasPageSpec,
  blockIds: string[],
  locked: boolean
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: normalizedPage.blocks.map((block) =>
      blockIds.includes(block.id) ? { ...block, locked } : block
    ),
  });
}

export function setCanvasBlocksVisible(
  page: CanvasPageSpec,
  blockIds: string[],
  visible: boolean
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: normalizedPage.blocks.map((block) =>
      blockIds.includes(block.id) ? { ...block, visible } : block
    ),
  });
}

export function reorderCanvasBlocksOnPage(
  page: CanvasPageSpec,
  blockIds: string[],
  mode: CanvasReorderMode
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  const ordered = [...normalizedPage.blocks].sort(
    (left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0)
  );
  const selectedSet = new Set(blockIds);
  const selected = ordered.filter((block) => selectedSet.has(block.id));
  const unselected = ordered.filter((block) => !selectedSet.has(block.id));
  let nextOrder = ordered;

  if (mode === "front") {
    nextOrder = [...unselected, ...selected];
  } else if (mode === "back") {
    nextOrder = [...selected, ...unselected];
  } else if (mode === "forward") {
    nextOrder = [...ordered];
    for (let index = nextOrder.length - 2; index >= 0; index -= 1) {
      if (selectedSet.has(nextOrder[index].id) && !selectedSet.has(nextOrder[index + 1].id)) {
        [nextOrder[index], nextOrder[index + 1]] = [nextOrder[index + 1], nextOrder[index]];
      }
    }
  } else {
    nextOrder = [...ordered];
    for (let index = 1; index < nextOrder.length; index += 1) {
      if (selectedSet.has(nextOrder[index].id) && !selectedSet.has(nextOrder[index - 1].id)) {
        [nextOrder[index], nextOrder[index - 1]] = [nextOrder[index - 1], nextOrder[index]];
      }
    }
  }

  return normalizeCanvasPage({
    ...normalizedPage,
    blocks: nextOrder.map((block, index) => ({
      ...block,
      zIndex: index,
    })),
  });
}

export function groupCanvasBlocksOnPage(page: CanvasPageSpec, blockIds: string[]): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  if (blockIds.length < 2) {
    return normalizedPage;
  }

  const group: CanvasGroup = {
    id: `group-${Date.now().toString(36)}`,
    name: `Group ${(normalizedPage.groups?.length ?? 0) + 1}`,
    blockIds,
  };
  return normalizeCanvasPage({
    ...normalizedPage,
    groups: [...(normalizedPage.groups ?? []), group],
    blocks: normalizedPage.blocks.map((block) =>
      blockIds.includes(block.id) ? { ...block, groupId: group.id } : block
    ),
  });
}

export function removeCanvasBlocksFromPage(
  page: CanvasPageSpec,
  blockIds: string[]
): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  if (blockIds.length === 0) {
    return normalizedPage;
  }

  return normalizeCanvasPage({
    ...normalizedPage,
    groups: (normalizedPage.groups ?? [])
      .map((group) => ({
        ...group,
        blockIds: group.blockIds.filter((blockId) => !blockIds.includes(blockId)),
      }))
      .filter((group) => group.blockIds.length > 0),
    blocks: normalizedPage.blocks.filter((block) => !blockIds.includes(block.id)),
  });
}

export function ungroupCanvasGroupOnPage(page: CanvasPageSpec, groupId: string): CanvasPageSpec {
  const normalizedPage = normalizeCanvasPage(page);
  return normalizeCanvasPage({
    ...normalizedPage,
    groups: (normalizedPage.groups ?? []).filter((group) => group.id !== groupId),
    blocks: normalizedPage.blocks.map((block) =>
      block.groupId === groupId ? { ...block, groupId: undefined } : block
    ),
  });
}

export function cloneCanvasPageInDocument(
  document: CanvasDocument,
  pageId: string
): CanvasDocument {
  const normalizedDocument = normalizeCanvasDocument(document);
  const page = normalizedDocument.pages.find((entry) => entry.id === pageId);
  if (!page) {
    return normalizedDocument;
  }

  const cloneId = `${page.id}-copy-${Date.now().toString(36)}`;
  const clonedPage = normalizeCanvasPage({
    ...page,
    id: cloneId,
    label: `${page.label} Copy`,
    blocks: page.blocks.map((block, index) => ({
      ...block,
      id: `${block.id}-copy-${index + 1}-${Date.now().toString(36)}`,
      zIndex: index,
    })),
  });

  return normalizeCanvasDocument({
    ...normalizedDocument,
    pages: [...normalizedDocument.pages, clonedPage],
    updatedAt: new Date().toISOString(),
  });
}

export function deleteCanvasPageFromDocument(
  document: CanvasDocument,
  pageId: string
): CanvasDocument {
  const normalizedDocument = normalizeCanvasDocument(document);
  if (normalizedDocument.pages.length <= 1) {
    return normalizedDocument;
  }

  return normalizeCanvasDocument({
    ...normalizedDocument,
    pages: normalizedDocument.pages.filter((page) => page.id !== pageId),
    updatedAt: new Date().toISOString(),
  });
}

export function createCanvasSnapshot(
  label: string,
  document: CanvasDocument
): CanvasDocumentSnapshot {
  return {
    id: `canvas-snapshot-${Date.now().toString(36)}`,
    label,
    createdAt: new Date().toISOString(),
    designSpecId: document.designSpecId,
    document: normalizeCanvasDocument(document),
  };
}

export function summarizeCanvasSnapshotDiff(
  current: CanvasDocument | null,
  snapshot: CanvasDocumentSnapshot | null
): string {
  if (!current || !snapshot) {
    return "No saved snapshot selected.";
  }

  const currentBlockCount = current.pages.reduce((sum, page) => sum + page.blocks.length, 0);
  const savedBlockCount = snapshot.document.pages.reduce(
    (sum, page) => sum + page.blocks.length,
    0
  );
  const pageDelta = current.pages.length - snapshot.document.pages.length;
  const blockDelta = currentBlockCount - savedBlockCount;

  return `${pageDelta === 0 ? "Same number of pages" : `${pageDelta > 0 ? "+" : ""}${pageDelta} page(s)`} • ${
    blockDelta === 0 ? "same block count" : `${blockDelta > 0 ? "+" : ""}${blockDelta} block(s)`
  } • saved ${new Date(snapshot.createdAt).toLocaleString()}`;
}

function buildBlockFingerprint(block: CanvasBlockSpec): string {
  return [
    block.kind,
    block.title,
    block.body,
    block.frame?.x ?? block.x,
    block.frame?.y ?? block.y,
    block.frame?.width ?? block.w,
    block.frame?.height ?? block.h,
    block.visible !== false ? "visible" : "hidden",
    block.locked ? "locked" : "editable",
  ].join("|");
}

export function compareCanvasPages(
  currentPage: CanvasPageSpec | null,
  snapshotPage: CanvasPageSpec | null
): CanvasPageComparisonDetail | null {
  if (!currentPage || !snapshotPage) {
    return null;
  }

  const normalizedCurrent = normalizeCanvasPage(currentPage);
  const normalizedSnapshot = normalizeCanvasPage(snapshotPage);
  const currentBlocks = new Map(
    normalizedCurrent.blocks.map((block) => [block.id, block] as const)
  );
  const snapshotBlocks = new Map(
    normalizedSnapshot.blocks.map((block) => [block.id, block] as const)
  );
  const currentBlockStates: Record<string, "unchanged" | "added" | "changed"> = {};
  const addedBlockIds: string[] = [];
  const changedBlockIds: string[] = [];

  normalizedCurrent.blocks.forEach((block) => {
    const snapshotBlock = snapshotBlocks.get(block.id);
    if (!snapshotBlock) {
      currentBlockStates[block.id] = "added";
      addedBlockIds.push(block.id);
      return;
    }

    if (buildBlockFingerprint(block) !== buildBlockFingerprint(snapshotBlock)) {
      currentBlockStates[block.id] = "changed";
      changedBlockIds.push(block.id);
      return;
    }

    currentBlockStates[block.id] = "unchanged";
  });

  const removedBlocks = normalizedSnapshot.blocks.filter((block) => !currentBlocks.has(block.id));

  return {
    pageId: normalizedCurrent.id,
    addedBlockIds,
    changedBlockIds,
    removedBlocks,
    currentBlockStates,
  };
}

export function compareCanvasDocuments(
  current: CanvasDocument | null,
  snapshot: CanvasDocumentSnapshot | null
): CanvasDocumentComparison | null {
  if (!current || !snapshot) {
    return null;
  }

  const normalizedCurrent = normalizeCanvasDocument(current);
  const normalizedSnapshot = normalizeCanvasDocument(snapshot.document);
  const changedPages: CanvasPageComparison[] = [];

  normalizedCurrent.pages.forEach((page, pageIndex) => {
    const snapshotPage =
      normalizedSnapshot.pages.find((entry) => entry.id === page.id) ??
      normalizedSnapshot.pages[pageIndex];
    if (!snapshotPage) {
      changedPages.push({
        pageId: page.id,
        label: page.label,
        addedBlockTitles: page.blocks.map((block) => block.title),
        removedBlockTitles: [],
        changedBlockTitles: [],
      });
      return;
    }

    const pageComparison = compareCanvasPages(page, snapshotPage);
    const addedBlockTitles =
      pageComparison?.addedBlockIds
        .map((blockId) => page.blocks.find((block) => block.id === blockId)?.title ?? "")
        .filter(Boolean) ?? [];
    const removedBlockTitles = pageComparison?.removedBlocks.map((block) => block.title) ?? [];
    const changedBlockTitles =
      pageComparison?.changedBlockIds
        .map((blockId) => page.blocks.find((block) => block.id === blockId)?.title ?? "")
        .filter(Boolean) ?? [];

    if (addedBlockTitles.length || removedBlockTitles.length || changedBlockTitles.length) {
      changedPages.push({
        pageId: page.id,
        label: page.label,
        addedBlockTitles,
        removedBlockTitles,
        changedBlockTitles,
      });
    }
  });

  normalizedSnapshot.pages.forEach((page) => {
    if (!normalizedCurrent.pages.some((entry) => entry.id === page.id)) {
      changedPages.push({
        pageId: page.id,
        label: page.label,
        addedBlockTitles: [],
        removedBlockTitles: page.blocks.map((block) => block.title),
        changedBlockTitles: [],
      });
    }
  });

  const currentBlockCount = normalizedCurrent.pages.reduce(
    (sum, page) => sum + page.blocks.length,
    0
  );
  const snapshotBlockCount = normalizedSnapshot.pages.reduce(
    (sum, page) => sum + page.blocks.length,
    0
  );

  return {
    pageDelta: normalizedCurrent.pages.length - normalizedSnapshot.pages.length,
    blockDelta: currentBlockCount - snapshotBlockCount,
    changedPages,
  };
}

export function validateCanvasDocumentLayout(document: CanvasDocument | null): CanvasLayoutIssue[] {
  if (!document) {
    return [];
  }

  const normalizedDocument = normalizeCanvasDocument(document);
  const issues: CanvasLayoutIssue[] = [];

  normalizedDocument.pages.forEach((page) => {
    const normalizedPage = normalizeCanvasPage(page);
    const visibleBlocks = getRenderableCanvasBlocks(normalizedPage);
    if (visibleBlocks.length > 8) {
      issues.push({
        code: "overloaded-page",
        severity: "warning",
        pageId: page.id,
        message: `${page.label} is visually dense with ${visibleBlocks.length} visible blocks.`,
      });
    }

    if (!page.layers?.some((layer) => layer.visible)) {
      issues.push({
        code: "missing-visible-layer",
        severity: "error",
        pageId: page.id,
        message: `${page.label} has no visible layer enabled.`,
      });
    }

    visibleBlocks.forEach((block) => {
      const frame = block.frame as CanvasBlockFrame;
      if (
        frame.x < DEFAULT_CANVAS_PADDING ||
        frame.y < DEFAULT_CANVAS_PADDING ||
        frame.x + frame.width > normalizedPage.canvasWidth ||
        frame.y + frame.height > normalizedPage.canvasHeight
      ) {
        issues.push({
          code: "out-of-bounds",
          severity: "error",
          pageId: normalizedPage.id,
          blockIds: [block.id],
          message: `${block.title} extends outside the printable canvas on ${normalizedPage.label}.`,
        });
      }
    });

    for (let index = 0; index < visibleBlocks.length; index += 1) {
      const current = visibleBlocks[index];
      for (let compareIndex = index + 1; compareIndex < visibleBlocks.length; compareIndex += 1) {
        const candidate = visibleBlocks[compareIndex];
        if (current.frame && candidate.frame && intersects(current.frame, candidate.frame)) {
          issues.push({
            code: "overlap",
            severity: "error",
            pageId: normalizedPage.id,
            blockIds: [current.id, candidate.id],
            message: `${current.title} overlaps ${candidate.title} on ${normalizedPage.label}.`,
          });
        }
      }
    }

    const signatures = new Map<string, string>();
    visibleBlocks.forEach((block) => {
      const signature = `${block.kind}:${block.title}`.trim().toLowerCase();
      const existing = signatures.get(signature);
      if (existing) {
        issues.push({
          code: "duplicate-block",
          severity: "warning",
          pageId: normalizedPage.id,
          blockIds: [existing, block.id],
          message: `${normalizedPage.label} repeats the same ${block.kind} message twice.`,
        });
      } else {
        signatures.set(signature, block.id);
      }
    });
  });

  return issues;
}

export function applyPageUpdate(
  document: CanvasDocument,
  pageId: string,
  updater: (page: CanvasPageSpec) => CanvasPageSpec
): CanvasDocument {
  const normalizedDocument = normalizeCanvasDocument(document);
  const page = normalizedDocument.pages.find((entry) => entry.id === pageId);
  if (!page) {
    return normalizedDocument;
  }
  return replacePage(normalizedDocument, updater(page));
}
