import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  alignCanvasBlocksOnPage,
  applyPageUpdate,
  cloneCanvasPageInDocument,
  compareCanvasPages,
  CanvasSelectionPoint,
  copyCanvasBlocksFromPage,
  deleteCanvasPageFromDocument,
  distributeCanvasBlocksOnPage,
  duplicateCanvasBlocksOnPage,
  equalizeCanvasBlocksOnPage,
  getRenderableCanvasBlocks,
  groupCanvasBlocksOnPage,
  offsetCanvasBlocksOnPage,
  pasteCanvasBlocksOnPage,
  reorderCanvasBlocksOnPage,
  removeCanvasBlocksFromPage,
  selectCanvasBlocksInFrame,
  selectCanvasBlocksInPolygon,
  setCanvasBlocksLocked,
  setCanvasBlocksVisible,
  snapCanvasFrame,
  ungroupCanvasGroupOnPage,
} from "../services/canvas/canvasStudio";
import { normalizeCanvasPage, patchCanvasBlockFrame } from "../services/canvas/canvasGeometry";
import {
  buildCanvasRulerTicks,
  buildMiniMapViewport,
  resolveMiniMapScrollTarget,
} from "../services/canvas/canvasViewport";
import {
  CanvasBlockFrame,
  CanvasBlockSpec,
  CanvasComponentKind,
  CanvasDocument,
  CanvasPageSpec,
  ReportDesignSpec,
} from "../shared/types";

const DEFAULT_COMPONENTS: CanvasComponentKind[] = [
  "hero",
  "summary",
  "kpi-strip",
  "chart-panel",
  "narrative-panel",
  "table",
  "recommendations",
  "callout",
  "email-summary",
];

const NUDGE_PIXELS = 12;
const MICRO_NUDGE_PIXELS = 4;
const MINI_MAP_WIDTH = 172;

type DragMode = "move" | "resize-corner";

interface DragState {
  pageId: string;
  primaryBlockId: string;
  selectedIds: string[];
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  startFrames: Record<string, CanvasBlockFrame>;
  scaleX: number;
  scaleY: number;
}

interface MarqueeState {
  pageId: string;
  startX: number;
  startY: number;
}

interface LassoState {
  pageId: string;
  points: CanvasSelectionPoint[];
}

interface PanState {
  startClientX: number;
  startClientY: number;
  scrollLeft: number;
  scrollTop: number;
}

interface MiniMapDragState {
  active: boolean;
}

interface ClipboardState {
  entries: ReturnType<typeof copyCanvasBlocksFromPage>;
  copiedAt: string;
}

interface CanvasViewportState {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
}

type CanvasSelectionMode = "marquee" | "lasso";

interface CanvasLayoutEditorProps {
  document: CanvasDocument | null;
  comparisonDocument?: CanvasDocument | null;
  designSpec: ReportDesignSpec | null;
  isLocked: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onLayoutModeChange: (mode: CanvasDocument["layoutMode"]) => void;
  onAddBlock: (pageId: string, kind: CanvasComponentKind) => void;
  onUpdateBlock: (pageId: string, blockId: string, patch: Partial<CanvasBlockSpec>) => void;
  onSetBlockFrame: (
    pageId: string,
    blockId: string,
    frame: CanvasBlockFrame,
    options?: { recordHistory?: boolean }
  ) => void;
  onNudgeBlock: (pageId: string, blockId: string, dx: number, dy: number) => void;
  onRemoveBlock: (pageId: string, blockId: string) => void;
  onReplaceDocument: (
    nextDocument: CanvasDocument,
    options?: { recordHistory?: boolean; statusMessage?: string }
  ) => void;
  onCheckpointHistory: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetToAiLayout: () => void;
  onGenerateVariation: () => void;
  onAiCoEdit: (request: {
    scope: "selection" | "page";
    pageId: string;
    blockIds: string[];
    instruction: string;
    preset?: "executive" | "analytical" | "visual" | "narrative";
  }) => Promise<string> | string;
}

function toNumericValue(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isInteractiveField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button" ||
    target.isContentEditable
  );
}

function buildBlockStyle(block: CanvasBlockSpec, zoom: number) {
  const frame = block.frame;
  if (!frame) {
    return undefined;
  }

  return {
    left: `${frame.x * zoom}px`,
    top: `${frame.y * zoom}px`,
    width: `${frame.width * zoom}px`,
    height: `${frame.height * zoom}px`,
    zIndex: block.zIndex ?? 0,
    opacity: block.visible === false ? 0.45 : 1,
    transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
  };
}

function createFramePreview(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): CanvasBlockFrame {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

function describeSelectionCount(count: number): string {
  if (count <= 0) {
    return "No blocks selected.";
  }
  if (count === 1) {
    return "1 block selected.";
  }
  return `${count} blocks selected.`;
}

function describeEditorError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Canvas AI assist failed before the update could be applied.";
}

export function CanvasLayoutEditor({
  document,
  comparisonDocument,
  designSpec,
  isLocked,
  canUndo,
  canRedo,
  onLayoutModeChange,
  onAddBlock,
  onUpdateBlock,
  onSetBlockFrame,
  onNudgeBlock,
  onRemoveBlock,
  onReplaceDocument,
  onCheckpointHistory,
  onUndo,
  onRedo,
  onResetToAiLayout,
  onGenerateVariation,
  onAiCoEdit,
}: CanvasLayoutEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<CanvasSelectionMode>("marquee");
  const [zoom, setZoom] = useState(1);
  const [smartGuides, setSmartGuides] = useState<Array<{ id: string; axis: "x" | "y"; position: number }>>([]);
  const [marqueeFrame, setMarqueeFrame] = useState<CanvasBlockFrame | null>(null);
  const [lassoPoints, setLassoPoints] = useState<CanvasSelectionPoint[]>([]);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showCompareOverlay, setShowCompareOverlay] = useState(true);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [aiAssistPrompt, setAiAssistPrompt] = useState("");
  const [aiAssistStatus, setAiAssistStatus] = useState("");
  const [isAiAssistBusy, setIsAiAssistBusy] = useState(false);
  const [viewportState, setViewportState] = useState<CanvasViewportState>({
    scrollLeft: 0,
    scrollTop: 0,
    clientWidth: 0,
    clientHeight: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const marqueeStateRef = useRef<MarqueeState | null>(null);
  const lassoStateRef = useRef<LassoState | null>(null);
  const panStateRef = useRef<PanState | null>(null);
  const miniMapDragStateRef = useRef<MiniMapDragState | null>(null);
  const miniMapStageRef = useRef<HTMLButtonElement | null>(null);
  const suppressStageClickRef = useRef(false);
  const documentRef = useRef(document);

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    if (!document || document.pages.length === 0) {
      setSelectedPageId("");
      setSelectedBlockIds([]);
      return;
    }

    if (!document.pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(document.pages[0].id);
    }
  }, [document, selectedPageId]);

  const selectedPageIndex = useMemo(
    () => document?.pages.findIndex((entry) => entry.id === selectedPageId) ?? -1,
    [document, selectedPageId]
  );

  const page = useMemo(() => {
    if (!document || document.pages.length === 0) {
      return null;
    }

    return normalizeCanvasPage(
      document.pages.find((entry) => entry.id === selectedPageId) ?? document.pages[0]
    );
  }, [document, selectedPageId]);

  const comparisonPage = useMemo(() => {
    if (!comparisonDocument || !page) {
      return null;
    }

    const byId = comparisonDocument.pages.find((entry) => entry.id === page.id);
    if (byId) {
      return normalizeCanvasPage(byId);
    }

    if (selectedPageIndex >= 0 && comparisonDocument.pages[selectedPageIndex]) {
      return normalizeCanvasPage(comparisonDocument.pages[selectedPageIndex]);
    }

    const byFormat = comparisonDocument.pages.find((entry) => entry.format === page.format);
    return byFormat ? normalizeCanvasPage(byFormat) : null;
  }, [comparisonDocument, page, selectedPageIndex]);

  useEffect(() => {
    if (!page) {
      return;
    }

    setSelectedBlockIds((current) =>
      current.filter((blockId) => page.blocks.some((block) => block.id === blockId))
    );
    setMarqueeFrame(null);
    setLassoPoints([]);
    marqueeStateRef.current = null;
    lassoStateRef.current = null;
  }, [page]);

  const visibleBlocks = useMemo(
    () => (page ? getRenderableCanvasBlocks(page, page.format) : []),
    [page]
  );
  const comparisonBlocks = useMemo(
    () =>
      showCompareOverlay && comparisonPage
        ? getRenderableCanvasBlocks(comparisonPage, comparisonPage.format)
        : [],
    [comparisonPage, showCompareOverlay]
  );
  const comparisonDetails = useMemo(
    () => (page && comparisonPage ? compareCanvasPages(page, comparisonPage) : null),
    [comparisonPage, page]
  );
  const removedComparisonBlocks = comparisonDetails?.removedBlocks ?? [];
  const selectedBlocks = useMemo(
    () => page?.blocks.filter((block) => selectedBlockIds.includes(block.id)) ?? [],
    [page, selectedBlockIds]
  );
  const selectedBlock = selectedBlocks.length === 1 ? selectedBlocks[0] : null;
  const selectedGroupId =
    selectedBlocks.length > 0 &&
    selectedBlocks.every((block) => block.groupId && block.groupId === selectedBlocks[0].groupId)
      ? (selectedBlocks[0].groupId ?? "")
      : "";
  const availableComponents = useMemo(
    () => designSpec?.allowedComponents ?? DEFAULT_COMPONENTS,
    [designSpec]
  );
  const rulerTicksX = useMemo(
    () => (page ? buildCanvasRulerTicks(page.canvasWidth) : []),
    [page]
  );
  const rulerTicksY = useMemo(
    () => (page ? buildCanvasRulerTicks(page.canvasHeight) : []),
    [page]
  );
  const miniMapHeight = page ? Math.round((page.canvasHeight / page.canvasWidth) * MINI_MAP_WIDTH) : 96;
  const miniMapViewport = useMemo(
    () =>
      page
        ? buildMiniMapViewport(
            page.canvasWidth,
            page.canvasHeight,
            viewportState,
            zoom,
            MINI_MAP_WIDTH,
            miniMapHeight
          )
        : null,
    [miniMapHeight, page, viewportState, zoom]
  );

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    function syncViewport() {
      if (!viewportRef.current) {
        return;
      }

      setViewportState({
        scrollLeft: viewportRef.current.scrollLeft,
        scrollTop: viewportRef.current.scrollTop,
        clientWidth: viewportRef.current.clientWidth,
        clientHeight: viewportRef.current.clientHeight,
      });
    }

    syncViewport();
    const viewport = viewportRef.current;
    viewport.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      viewport.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, [page, zoom]);

  function commitPageUpdate(
    updater: (currentPage: CanvasPageSpec) => CanvasPageSpec,
    options: { recordHistory?: boolean; statusMessage?: string } = {}
  ) {
    const currentDocument = documentRef.current;
    if (!currentDocument || !page) {
      return;
    }

    const nextDocument = applyPageUpdate(currentDocument, page.id, updater);
    onReplaceDocument(nextDocument, options);
  }

  function fitCanvas(mode: "page" | "width") {
    if (!viewportRef.current || !page) {
      return;
    }

    const widthRatio = (viewportRef.current.clientWidth - (showRulers ? 74 : 32)) / page.canvasWidth;
    const heightRatio = (viewportRef.current.clientHeight - (showRulers ? 74 : 32)) / page.canvasHeight;
    setZoom(
      Math.max(
        0.35,
        Math.min(mode === "width" ? widthRatio : Math.min(widthRatio, heightRatio), 2.25)
      )
    );
  }

  function pasteClipboard() {
    const currentDocument = documentRef.current;
    if (!page || !clipboard?.entries.length || !currentDocument) {
      return;
    }
    onCheckpointHistory();
    const nextPage = pasteCanvasBlocksOnPage(page, clipboard.entries);
    const existingIds = new Set(page.blocks.map((block) => block.id));
    setSelectedBlockIds(
      nextPage.blocks.filter((block) => !existingIds.has(block.id)).map((block) => block.id)
    );
    onReplaceDocument(applyPageUpdate(currentDocument, page.id, () => nextPage), {
      recordHistory: false,
      statusMessage: "Canvas blocks pasted.",
    });
  }

  async function runAiAssist(
    scope: "selection" | "page",
    preset?: "executive" | "analytical" | "visual" | "narrative"
  ) {
    if (!page) {
      return;
    }

    setIsAiAssistBusy(true);
    setAiAssistStatus(
      scope === "selection"
        ? `AI is refreshing ${selectedBlockIds.length} selected block(s)...`
        : `AI is refining ${page.label}...`
    );
    try {
      const nextStatus = await onAiCoEdit({
        scope,
        pageId: page.id,
        blockIds: selectedBlockIds,
        instruction: aiAssistPrompt,
        preset,
      });
      setAiAssistStatus(nextStatus || "Canvas AI co-edit completed.");
    } catch (error) {
      setAiAssistStatus(describeEditorError(error));
    } finally {
      setIsAiAssistBusy(false);
    }
  }

  function removeSelectedBlocks() {
    if (!selectedBlockIds.length) {
      return;
    }

    onCheckpointHistory();
    commitPageUpdate((entry) => removeCanvasBlocksFromPage(entry, selectedBlockIds), {
      recordHistory: false,
      statusMessage: "Selected canvas blocks removed.",
    });
    setSelectedBlockIds([]);
  }

  function startBlockInteraction(
    event: React.PointerEvent<HTMLElement>,
    block: CanvasBlockSpec,
    mode: DragMode
  ) {
    if (!page || isLocked || block.locked || !stageRef.current) {
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();
    if (!stageRect.width || !stageRect.height) {
      return;
    }

    const selectedIds =
      mode === "move" && selectedBlockIds.includes(block.id) && selectedBlockIds.length > 1
        ? selectedBlockIds
        : [block.id];
    const startFrames = selectedIds.reduce<Record<string, CanvasBlockFrame>>((accumulator, blockId) => {
      const target = page.blocks.find((entry) => entry.id === blockId);
      if (target?.frame) {
        accumulator[blockId] = target.frame;
      }
      return accumulator;
    }, {});

    onCheckpointHistory();
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockIds(selectedIds);
    dragStateRef.current = {
      pageId: page.id,
      primaryBlockId: block.id,
      selectedIds,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFrames,
      scaleX: page.canvasWidth / stageRect.width,
      scaleY: page.canvasHeight / stageRect.height,
    };
  }

  function startMarqueeSelection(event: React.PointerEvent<HTMLDivElement>) {
    if (!page || isLocked || !stageRef.current || event.target !== stageRef.current) {
      return;
    }

    if (spacePressed || event.altKey || event.button === 1) {
      if (!viewportRef.current) {
        return;
      }
      panStateRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        scrollLeft: viewportRef.current.scrollLeft,
        scrollTop: viewportRef.current.scrollTop,
      };
      setIsPanning(true);
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();
    const pointerPoint = {
      x: event.clientX - stageRect.left,
      y: event.clientY - stageRect.top,
    };

    if (selectionMode === "lasso") {
      lassoStateRef.current = {
        pageId: page.id,
        points: [pointerPoint],
      };
      setSelectedBlockIds([]);
      setMarqueeFrame(null);
      setLassoPoints([pointerPoint]);
      return;
    }

    marqueeStateRef.current = {
      pageId: page.id,
      startX: pointerPoint.x,
      startY: pointerPoint.y,
    };
    setSelectedBlockIds([]);
    setLassoPoints([]);
    setMarqueeFrame({
      x: pointerPoint.x,
      y: pointerPoint.y,
      width: 0,
      height: 0,
    });
  }

  function updateMiniMapViewportFromClientPosition(clientX: number, clientY: number) {
    if (!page || !miniMapStageRef.current || !viewportRef.current) {
      return;
    }

    const rect = miniMapStageRef.current.getBoundingClientRect();
    const target = resolveMiniMapScrollTarget(
      page.canvasWidth,
      page.canvasHeight,
      viewportState,
      zoom,
      MINI_MAP_WIDTH,
      miniMapHeight,
      clientX - rect.left,
      clientY - rect.top
    );
    viewportRef.current.scrollLeft = target.scrollLeft;
    viewportRef.current.scrollTop = target.scrollTop;
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!page || isLocked || isInteractiveField(event.target)) {
        return;
      }

      const modifier = event.metaKey || event.ctrlKey;
      if (event.key === " ") {
        setSpacePressed(true);
        return;
      }

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        return;
      }

      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        onRedo();
        return;
      }

      if (modifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedBlockIds(visibleBlocks.map((block) => block.id));
        return;
      }

      if (modifier && event.key.toLowerCase() === "c" && selectedBlockIds.length > 0) {
        event.preventDefault();
        setClipboard({
          entries: copyCanvasBlocksFromPage(page, selectedBlockIds),
          copiedAt: new Date().toISOString(),
        });
        return;
      }

      if (modifier && event.key.toLowerCase() === "v" && clipboard?.entries.length) {
        event.preventDefault();
        pasteClipboard();
        return;
      }

      if (modifier && event.key.toLowerCase() === "d" && selectedBlockIds.length > 0) {
        event.preventDefault();
        onCheckpointHistory();
        commitPageUpdate((entry) => duplicateCanvasBlocksOnPage(entry, selectedBlockIds), {
          recordHistory: false,
          statusMessage: "Canvas selection duplicated.",
        });
        return;
      }

      if (modifier && event.shiftKey && event.key.toLowerCase() === "g" && selectedGroupId) {
        event.preventDefault();
        commitPageUpdate((entry) => ungroupCanvasGroupOnPage(entry, selectedGroupId));
        return;
      }

      if (modifier && event.key.toLowerCase() === "g" && selectedBlockIds.length > 1) {
        event.preventDefault();
        commitPageUpdate((entry) => groupCanvasBlocksOnPage(entry, selectedBlockIds));
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedBlockIds.length > 0) {
        event.preventDefault();
        removeSelectedBlocks();
        return;
      }

      if (event.key === "Escape") {
        setSelectedBlockIds([]);
        return;
      }

      const nudgeDistance = event.shiftKey ? NUDGE_PIXELS : MICRO_NUDGE_PIXELS;
      const nudges: Record<string, { dx: number; dy: number }> = {
        ArrowLeft: { dx: -nudgeDistance, dy: 0 },
        ArrowRight: { dx: nudgeDistance, dy: 0 },
        ArrowUp: { dx: 0, dy: -nudgeDistance },
        ArrowDown: { dx: 0, dy: nudgeDistance },
      };
      if (selectedBlockIds.length > 0 && nudges[event.key]) {
        event.preventDefault();
        const { dx, dy } = nudges[event.key];
        onCheckpointHistory();
        commitPageUpdate((entry) => offsetCanvasBlocksOnPage(entry, selectedBlockIds, dx, dy), {
          recordHistory: false,
        });
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === " ") {
        setSpacePressed(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [clipboard, isLocked, onCheckpointHistory, onRedo, onUndo, page, selectedBlockIds, selectedGroupId, visibleBlocks]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const miniMapDragState = miniMapDragStateRef.current;
      if (miniMapDragState?.active) {
        updateMiniMapViewportFromClientPosition(event.clientX, event.clientY);
        return;
      }

      const panState = panStateRef.current;
      if (panState && viewportRef.current) {
        viewportRef.current.scrollLeft = panState.scrollLeft - (event.clientX - panState.startClientX);
        viewportRef.current.scrollTop = panState.scrollTop - (event.clientY - panState.startClientY);
        return;
      }

      const dragState = dragStateRef.current;
      if (dragState && !isLocked) {
        const currentDocument = documentRef.current;
        const currentPage = currentDocument?.pages.find((entry) => entry.id === dragState.pageId);
        if (!currentDocument || !currentPage) {
          return;
        }

        const normalizedPage = normalizeCanvasPage(currentPage);
        const deltaX = (event.clientX - dragState.startClientX) * dragState.scaleX;
        const deltaY = (event.clientY - dragState.startClientY) * dragState.scaleY;

        if (dragState.mode === "move") {
          const primaryFrame = dragState.startFrames[dragState.primaryBlockId];
          const snapped = snapCanvasFrame(normalizedPage, dragState.primaryBlockId, {
            ...primaryFrame,
            x: primaryFrame.x + deltaX,
            y: primaryFrame.y + deltaY,
          });
          const offsetX = snapped.frame.x - primaryFrame.x;
          const offsetY = snapped.frame.y - primaryFrame.y;
          const nextDocument = applyPageUpdate(currentDocument, dragState.pageId, (pageValue) => {
            const workingPage = normalizeCanvasPage(pageValue);
            return normalizeCanvasPage({
              ...workingPage,
              blocks: workingPage.blocks.map((block) =>
                dragState.selectedIds.includes(block.id)
                  ? patchCanvasBlockFrame(block, workingPage, {
                      x: (dragState.startFrames[block.id]?.x ?? 0) + offsetX,
                      y: (dragState.startFrames[block.id]?.y ?? 0) + offsetY,
                    })
                  : block
              ),
            });
          });
          onReplaceDocument(nextDocument, { recordHistory: false });
          setSmartGuides(
            snapped.guides.map((guide) => ({
              id: guide.id,
              axis: guide.axis,
              position: guide.position,
            }))
          );
        } else {
          const startFrame = dragState.startFrames[dragState.primaryBlockId];
          const snapped = snapCanvasFrame(normalizedPage, dragState.primaryBlockId, {
            ...startFrame,
            width: startFrame.width + deltaX,
            height: startFrame.height + deltaY,
          });
          onSetBlockFrame(dragState.pageId, dragState.primaryBlockId, snapped.frame, {
            recordHistory: false,
          });
          setSmartGuides(
            snapped.guides.map((guide) => ({
              id: guide.id,
              axis: guide.axis,
              position: guide.position,
            }))
          );
        }
        return;
      }

      const marqueeState = marqueeStateRef.current;
      if (marqueeState && stageRef.current) {
        const stageRect = stageRef.current.getBoundingClientRect();
        setMarqueeFrame(
          createFramePreview(
            marqueeState.startX,
            marqueeState.startY,
            event.clientX - stageRect.left,
            event.clientY - stageRect.top
          )
        );
        return;
      }

      const lassoState = lassoStateRef.current;
      if (lassoState && stageRef.current) {
        const stageRect = stageRef.current.getBoundingClientRect();
        const nextPoint = {
          x: event.clientX - stageRect.left,
          y: event.clientY - stageRect.top,
        };
        const lastPoint = lassoState.points[lassoState.points.length - 1];
        if (
          !lastPoint ||
          Math.abs(nextPoint.x - lastPoint.x) >= 8 ||
          Math.abs(nextPoint.y - lastPoint.y) >= 8
        ) {
          const nextPoints = [...lassoState.points, nextPoint];
          lassoStateRef.current = {
            ...lassoState,
            points: nextPoints,
          };
          setLassoPoints(nextPoints);
        }
      }
    }

    function clearInteractions() {
      if (miniMapDragStateRef.current) {
        miniMapDragStateRef.current = null;
      }

      if (dragStateRef.current) {
        dragStateRef.current = null;
        setSmartGuides([]);
      }

      if (panStateRef.current) {
        panStateRef.current = null;
        setIsPanning(false);
        suppressStageClickRef.current = true;
      }

      if (marqueeStateRef.current && page && marqueeFrame) {
        suppressStageClickRef.current = marqueeFrame.width > 6 || marqueeFrame.height > 6;
        setSelectedBlockIds(
          selectCanvasBlocksInFrame(page, {
            x: marqueeFrame.x / zoom,
            y: marqueeFrame.y / zoom,
            width: marqueeFrame.width / zoom,
            height: marqueeFrame.height / zoom,
          })
        );
        marqueeStateRef.current = null;
        setMarqueeFrame(null);
      }

      if (lassoStateRef.current && page && lassoPoints.length >= 3) {
        suppressStageClickRef.current = true;
        setSelectedBlockIds(
          selectCanvasBlocksInPolygon(
            page,
            lassoPoints.map((point) => ({
              x: point.x / zoom,
              y: point.y / zoom,
            }))
          )
        );
      }

      if (lassoStateRef.current) {
        lassoStateRef.current = null;
        setLassoPoints([]);
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", clearInteractions);
    window.addEventListener("pointercancel", clearInteractions);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", clearInteractions);
      window.removeEventListener("pointercancel", clearInteractions);
    };
  }, [isLocked, lassoPoints, marqueeFrame, onReplaceDocument, onSetBlockFrame, page, zoom]);

  if (!document || !page) {
    return (
      <div className="rf-panel">
        <h3>Canvas Layout Studio</h3>
        <p className="rf-muted">
          Generate a canvas pack first to edit the AI-composed layout block by block.
        </p>
      </div>
    );
  }

  return (
    <div className="rf-grid rf-grid--canvas-studio">
      <div className="rf-panel">
        <div className="rf-inline-actions">
          <h3>Canvas Layout Studio</h3>
          <div className="rf-inline-actions">
            <button
              type="button"
              className="rf-button"
              onClick={() => onLayoutModeChange("freeform")}
              disabled={document.layoutMode === "freeform" || isLocked}
            >
              Freeform
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => onLayoutModeChange("structured")}
              disabled={document.layoutMode === "structured" || isLocked}
            >
              Structured
            </button>
            <button type="button" className="rf-button" onClick={onUndo} disabled={!canUndo || isLocked}>
              Undo
            </button>
            <button type="button" className="rf-button" onClick={onRedo} disabled={!canRedo || isLocked}>
              Redo
            </button>
            <button type="button" className="rf-button" onClick={onResetToAiLayout} disabled={isLocked}>
              Reset To AI Layout
            </button>
            <button
              type="button"
              className="rf-button rf-button--primary"
              onClick={onGenerateVariation}
              disabled={isLocked}
            >
              Generate AI Variation
            </button>
          </div>
        </div>
        <div className="rf-inline-actions">
          <label className="rf-canvas-editor__field">
            Canvas page
            <select
              value={page.id}
              disabled={isLocked}
              onChange={(event) => setSelectedPageId(event.target.value)}
            >
              {document.pages.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rf-inline-actions">
            <button type="button" className="rf-button" onClick={() => fitCanvas("width")}>
              Fit Width
            </button>
            <button type="button" className="rf-button" onClick={() => fitCanvas("page")}>
              Fit Page
            </button>
            <select value={String(zoom)} onChange={(event) => setZoom(Number(event.target.value))}>
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
            </select>
            <button
              type="button"
              className={`rf-button ${showRulers ? "rf-button--primary" : ""}`}
              onClick={() => setShowRulers((current) => !current)}
            >
              Rulers
            </button>
            <button
              type="button"
              className={`rf-button ${showMiniMap ? "rf-button--primary" : ""}`}
              onClick={() => setShowMiniMap((current) => !current)}
            >
              Mini-map
            </button>
            {comparisonPage ? (
              <button
                type="button"
                className={`rf-button ${showCompareOverlay ? "rf-button--primary" : ""}`}
                onClick={() => setShowCompareOverlay((current) => !current)}
              >
                Compare Overlay
              </button>
            ) : null}
            <button
              type="button"
              className="rf-button"
              onClick={() => onReplaceDocument(cloneCanvasPageInDocument(document, page.id))}
              disabled={isLocked}
            >
              Clone Page
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => onReplaceDocument(deleteCanvasPageFromDocument(document, page.id))}
              disabled={document.pages.length <= 1 || isLocked}
            >
              Delete Page
            </button>
          </div>
        </div>
        <p className="rf-note">
          Shift-click to multi-select. Drag on the background to {selectionMode}-select. Hold
          space or alt to pan. Shortcuts: Cmd/Ctrl+A, C, V, D, Z, Shift+Z, arrows, Delete.
        </p>
        <div className="rf-inline-actions">
          <button
            type="button"
            className={`rf-button ${selectionMode === "marquee" ? "rf-button--primary" : ""}`}
            onClick={() => setSelectionMode("marquee")}
            disabled={isLocked}
          >
            Marquee Select
          </button>
          <button
            type="button"
            className={`rf-button ${selectionMode === "lasso" ? "rf-button--primary" : ""}`}
            onClick={() => setSelectionMode("lasso")}
            disabled={isLocked}
          >
            Lasso Select
          </button>
          {availableComponents.map((kind) => (
            <button
              key={kind}
              type="button"
              className="rf-button rf-button--ghost"
              onClick={() => onAddBlock(page.id, kind)}
              disabled={isLocked}
            >
              Add {kind}
            </button>
          ))}
        </div>
        <div className="rf-inline-actions">
          <span className="rf-canvas-editor__chip">{describeSelectionCount(selectedBlockIds.length)}</span>
          <span className="rf-canvas-editor__chip">
            {clipboard?.entries.length ? `Clipboard: ${clipboard.entries.length} block(s)` : "Clipboard empty"}
          </span>
          <span className="rf-canvas-editor__chip">Selection mode: {selectionMode}</span>
          {spacePressed ? <span className="rf-canvas-editor__chip">Pan mode active</span> : null}
          {comparisonDetails ? (
            <>
              <span className="rf-canvas-editor__chip">
                Added: {comparisonDetails.addedBlockIds.length}
              </span>
              <span className="rf-canvas-editor__chip">
                Changed: {comparisonDetails.changedBlockIds.length}
              </span>
              <span className="rf-canvas-editor__chip">
                Removed: {comparisonDetails.removedBlocks.length}
              </span>
            </>
          ) : null}
        </div>
        <div className="rf-canvas-editor__toolbar">
          <label>
            AI co-edit instruction
            <textarea
              className="rf-textarea"
              value={aiAssistPrompt}
              disabled={isLocked || isAiAssistBusy}
              onChange={(event) => setAiAssistPrompt(event.target.value)}
              placeholder="Example: tighten the opening message, make the KPI block more executive, and reduce repeated wording."
            />
          </label>
          <div className="rf-inline-actions">
            <button
              type="button"
              className="rf-button rf-button--primary"
              onClick={() => {
                void runAiAssist("selection");
              }}
              disabled={isLocked || isAiAssistBusy || selectedBlockIds.length === 0}
            >
              Regenerate Selection
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => {
                void runAiAssist("page");
              }}
              disabled={isLocked || isAiAssistBusy}
            >
              Refine Page
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => {
                void runAiAssist("selection", "executive");
              }}
              disabled={isLocked || isAiAssistBusy || selectedBlockIds.length === 0}
            >
              More Executive
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => {
                void runAiAssist("selection", "analytical");
              }}
              disabled={isLocked || isAiAssistBusy || selectedBlockIds.length === 0}
            >
              More Analytical
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => {
                void runAiAssist("page", "visual");
              }}
              disabled={isLocked || isAiAssistBusy}
            >
              More Visual
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => {
                void runAiAssist("page", "narrative");
              }}
              disabled={isLocked || isAiAssistBusy}
            >
              More Narrative
            </button>
          </div>
          {aiAssistStatus ? <p className="rf-note">{aiAssistStatus}</p> : null}
        </div>
        {selectedBlockIds.length > 1 ? (
          <div className="rf-canvas-editor__toolbar">
            <div className="rf-inline-actions">
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => alignCanvasBlocksOnPage(entry, selectedBlockIds, "left"))}
              >
                Align Left
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => alignCanvasBlocksOnPage(entry, selectedBlockIds, "center"))}
              >
                Center
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => alignCanvasBlocksOnPage(entry, selectedBlockIds, "right"))}
              >
                Align Right
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => alignCanvasBlocksOnPage(entry, selectedBlockIds, "top"))}
              >
                Align Top
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => alignCanvasBlocksOnPage(entry, selectedBlockIds, "middle"))}
              >
                Align Middle
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() =>
                  commitPageUpdate((entry) => distributeCanvasBlocksOnPage(entry, selectedBlockIds, "horizontal"))
                }
              >
                Distribute H
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() =>
                  commitPageUpdate((entry) => distributeCanvasBlocksOnPage(entry, selectedBlockIds, "vertical"))
                }
              >
                Distribute V
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() =>
                  commitPageUpdate((entry) => equalizeCanvasBlocksOnPage(entry, selectedBlockIds, "width"))
                }
              >
                Equalize Width
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() =>
                  commitPageUpdate((entry) => equalizeCanvasBlocksOnPage(entry, selectedBlockIds, "height"))
                }
              >
                Equalize Height
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => duplicateCanvasBlocksOnPage(entry, selectedBlockIds))}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() =>
                  setClipboard({
                    entries: copyCanvasBlocksFromPage(page, selectedBlockIds),
                    copiedAt: new Date().toISOString(),
                  })
                }
              >
                Copy
              </button>
              <button type="button" className="rf-button" onClick={pasteClipboard} disabled={!clipboard?.entries.length}>
                Paste
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => groupCanvasBlocksOnPage(entry, selectedBlockIds))}
              >
                Group
              </button>
              {selectedGroupId ? (
                <button
                  type="button"
                  className="rf-button"
                  onClick={() => commitPageUpdate((entry) => ungroupCanvasGroupOnPage(entry, selectedGroupId))}
                >
                  Ungroup
                </button>
              ) : null}
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => reorderCanvasBlocksOnPage(entry, selectedBlockIds, "front"))}
              >
                Bring Front
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => reorderCanvasBlocksOnPage(entry, selectedBlockIds, "back"))}
              >
                Send Back
              </button>
            </div>
          </div>
        ) : null}
        <div className="rf-canvas-editor">
          <div
            className={`rf-canvas-editor__workspace ${showRulers ? "has-rulers" : ""} ${showMiniMap ? "has-minimap" : ""}`}
          >
            {showRulers ? (
              <>
                <div className="rf-canvas-editor__corner" />
                <div className="rf-canvas-editor__ruler rf-canvas-editor__ruler--horizontal">
                  {rulerTicksX.map((tick) => (
                    <span
                      key={`x-${tick.value}`}
                      className={`rf-canvas-editor__ruler-tick ${tick.major ? "is-major" : ""}`}
                      style={{ left: `${tick.value * zoom}px` }}
                    >
                      {tick.label ? <small>{tick.label}</small> : null}
                    </span>
                  ))}
                </div>
                <div className="rf-canvas-editor__ruler rf-canvas-editor__ruler--vertical">
                  {rulerTicksY.map((tick) => (
                    <span
                      key={`y-${tick.value}`}
                      className={`rf-canvas-editor__ruler-tick ${tick.major ? "is-major" : ""}`}
                      style={{ top: `${tick.value * zoom}px` }}
                    >
                      {tick.label ? <small>{tick.label}</small> : null}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
            <div
              ref={viewportRef}
              className={`rf-canvas-editor__viewport ${isPanning ? "is-panning" : ""}`}
            >
              <div
                ref={stageRef}
                className={`rf-canvas-editor__stage rf-canvas-editor__stage--${document.layoutMode}`}
                style={{ width: `${page.canvasWidth * zoom}px`, height: `${page.canvasHeight * zoom}px` }}
                onPointerDown={startMarqueeSelection}
                onClick={(event) => {
                  if (suppressStageClickRef.current) {
                    suppressStageClickRef.current = false;
                    return;
                  }
                  if (event.target === stageRef.current) {
                    setSelectedBlockIds([]);
                  }
                }}
              >
                <div
                  className="rf-canvas-editor__safe-margin"
                  style={{
                    left: `${(page.safeMargin?.left ?? 0) * zoom}px`,
                    top: `${(page.safeMargin?.top ?? 0) * zoom}px`,
                    right: `${(page.safeMargin?.right ?? 0) * zoom}px`,
                    bottom: `${(page.safeMargin?.bottom ?? 0) * zoom}px`,
                  }}
                />
                {smartGuides.map((guide) => (
                  <span
                    key={guide.id}
                    className={`rf-canvas-editor__guide rf-canvas-editor__guide--${guide.axis}`}
                    style={
                      guide.axis === "x"
                        ? { left: `${guide.position * zoom}px` }
                        : { top: `${guide.position * zoom}px` }
                    }
                  />
                ))}
                {comparisonBlocks.map((block) => (
                  <div
                    key={`compare-${block.id}`}
                    className={`rf-canvas-editor__compare-block ${
                      removedComparisonBlocks.some((entry) => entry.id === block.id)
                        ? "is-removed"
                        : comparisonDetails?.changedBlockIds.includes(block.id)
                          ? "is-changed"
                          : ""
                    }`}
                    style={buildBlockStyle(block, zoom)}
                    aria-hidden="true"
                  />
                ))}
                {marqueeFrame ? (
                  <span
                    className="rf-canvas-editor__marquee"
                    style={{
                      left: `${marqueeFrame.x}px`,
                      top: `${marqueeFrame.y}px`,
                      width: `${marqueeFrame.width}px`,
                      height: `${marqueeFrame.height}px`,
                    }}
                  />
                ) : null}
                {lassoPoints.length >= 3 ? (
                  <svg className="rf-canvas-editor__lasso" aria-hidden="true">
                    <polygon
                      points={lassoPoints.map((point) => `${point.x},${point.y}`).join(" ")}
                    />
                  </svg>
                ) : null}
                {visibleBlocks.map((block) => (
                  <div
                    key={block.id}
                    className={`rf-canvas-editor__block ${selectedBlockIds.includes(block.id) ? "is-selected" : ""} ${block.locked ? "is-locked" : ""} ${
                      comparisonDetails?.currentBlockStates[block.id] === "added"
                        ? "is-added"
                        : comparisonDetails?.currentBlockStates[block.id] === "changed"
                          ? "is-changed"
                          : ""
                    }`}
                    style={buildBlockStyle(block, zoom)}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (event.shiftKey || event.ctrlKey || event.metaKey) {
                        setSelectedBlockIds((current) =>
                          current.includes(block.id)
                            ? current.filter((entry) => entry !== block.id)
                            : [...current, block.id]
                        );
                      } else {
                        setSelectedBlockIds([block.id]);
                      }
                    }}
                    onPointerDown={(event) => startBlockInteraction(event, block, "move")}
                  >
                    <span className="rf-canvas-editor__kind">{block.kind}</span>
                    <strong>{block.title}</strong>
                    <p>{block.body}</p>
                    <div className="rf-inline-actions">
                      {block.locked ? <span className="rf-canvas-editor__chip">Locked</span> : null}
                      {block.groupId ? <span className="rf-canvas-editor__chip">Grouped</span> : null}
                    </div>
                    <span
                      className="rf-canvas-editor__handle"
                      onPointerDown={(event) => startBlockInteraction(event, block, "resize-corner")}
                    />
                  </div>
                ))}
              </div>
            </div>
            {showMiniMap && miniMapViewport ? (
              <aside className="rf-canvas-editor__minimap">
                <div className="rf-canvas-editor__minimap-header">
                  <strong>Mini-map</strong>
                  <small>
                    {Math.round(zoom * 100)}% • {page.label}
                  </small>
                </div>
                <button
                  ref={miniMapStageRef}
                  type="button"
                  className="rf-canvas-editor__minimap-stage"
                  style={{ width: `${MINI_MAP_WIDTH}px`, height: `${miniMapHeight}px` }}
                  onPointerDown={(event) => {
                    miniMapDragStateRef.current = { active: true };
                    updateMiniMapViewportFromClientPosition(event.clientX, event.clientY);
                  }}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const target = resolveMiniMapScrollTarget(
                      page.canvasWidth,
                      page.canvasHeight,
                      viewportState,
                      zoom,
                      MINI_MAP_WIDTH,
                      miniMapHeight,
                      event.clientX - rect.left,
                      event.clientY - rect.top
                    );
                    if (!viewportRef.current) {
                      return;
                    }
                    viewportRef.current.scrollLeft = target.scrollLeft;
                    viewportRef.current.scrollTop = target.scrollTop;
                  }}
                >
                  {visibleBlocks.map((block) => {
                    const frame = block.frame;
                    if (!frame) {
                      return null;
                    }
                    return (
                      <span
                        key={`mini-${block.id}`}
                        className={`rf-canvas-editor__minimap-block ${selectedBlockIds.includes(block.id) ? "is-selected" : ""}`}
                        style={{
                          left: `${(frame.x / page.canvasWidth) * MINI_MAP_WIDTH}px`,
                          top: `${(frame.y / page.canvasHeight) * miniMapHeight}px`,
                          width: `${(frame.width / page.canvasWidth) * MINI_MAP_WIDTH}px`,
                          height: `${(frame.height / page.canvasHeight) * miniMapHeight}px`,
                        }}
                      />
                    );
                  })}
                  <span
                    className="rf-canvas-editor__minimap-viewport"
                    style={{
                      left: `${miniMapViewport.left}px`,
                      top: `${miniMapViewport.top}px`,
                      width: `${miniMapViewport.width}px`,
                      height: `${miniMapViewport.height}px`,
                    }}
                  />
                </button>
              </aside>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rf-panel">
        <h3>Inspector</h3>
        {selectedBlock ? (
          <>
            <p className="rf-note">
              {selectedBlock.kind} • {Math.round(selectedBlock.frame?.x ?? 0)} x{" "}
              {Math.round(selectedBlock.frame?.y ?? 0)} • {Math.round(selectedBlock.frame?.width ?? 0)} x{" "}
              {Math.round(selectedBlock.frame?.height ?? 0)}
            </p>
            <label>
              Title
              <input
                className="rf-input"
                type="text"
                value={selectedBlock.title}
                disabled={isLocked}
                onChange={(event) => onUpdateBlock(page.id, selectedBlock.id, { title: event.target.value })}
              />
            </label>
            <label>
              Body
              <textarea
                className="rf-textarea"
                value={selectedBlock.body}
                disabled={isLocked}
                onChange={(event) => onUpdateBlock(page.id, selectedBlock.id, { body: event.target.value })}
              />
            </label>
            <div className="rf-grid rf-grid--two">
              <label>
                X
                <input
                  className="rf-input"
                  type="number"
                  value={Math.round(selectedBlock.frame?.x ?? 0)}
                  disabled={isLocked || selectedBlock.locked}
                  onChange={(event) =>
                    onSetBlockFrame(
                      page.id,
                      selectedBlock.id,
                      {
                        ...(selectedBlock.frame ?? { x: 0, y: 0, width: 320, height: 180 }),
                        x: toNumericValue(event.target.value, selectedBlock.frame?.x ?? 0),
                      },
                      { recordHistory: true }
                    )
                  }
                />
              </label>
              <label>
                Y
                <input
                  className="rf-input"
                  type="number"
                  value={Math.round(selectedBlock.frame?.y ?? 0)}
                  disabled={isLocked || selectedBlock.locked}
                  onChange={(event) =>
                    onSetBlockFrame(
                      page.id,
                      selectedBlock.id,
                      {
                        ...(selectedBlock.frame ?? { x: 0, y: 0, width: 320, height: 180 }),
                        y: toNumericValue(event.target.value, selectedBlock.frame?.y ?? 0),
                      },
                      { recordHistory: true }
                    )
                  }
                />
              </label>
              <label>
                Width
                <input
                  className="rf-input"
                  type="number"
                  value={Math.round(selectedBlock.frame?.width ?? 0)}
                  disabled={isLocked || selectedBlock.locked}
                  onChange={(event) =>
                    onSetBlockFrame(
                      page.id,
                      selectedBlock.id,
                      {
                        ...(selectedBlock.frame ?? { x: 0, y: 0, width: 320, height: 180 }),
                        width: toNumericValue(event.target.value, selectedBlock.frame?.width ?? 0),
                      },
                      { recordHistory: true }
                    )
                  }
                />
              </label>
              <label>
                Height
                <input
                  className="rf-input"
                  type="number"
                  value={Math.round(selectedBlock.frame?.height ?? 0)}
                  disabled={isLocked || selectedBlock.locked}
                  onChange={(event) =>
                    onSetBlockFrame(
                      page.id,
                      selectedBlock.id,
                      {
                        ...(selectedBlock.frame ?? { x: 0, y: 0, width: 320, height: 180 }),
                        height: toNumericValue(event.target.value, selectedBlock.frame?.height ?? 0),
                      },
                      { recordHistory: true }
                    )
                  }
                />
              </label>
            </div>
            <div className="rf-inline-actions">
              <button
                type="button"
                className="rf-button"
                onClick={() => onNudgeBlock(page.id, selectedBlock.id, -NUDGE_PIXELS, 0)}
                disabled={isLocked || selectedBlock.locked}
              >
                Left
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => onNudgeBlock(page.id, selectedBlock.id, NUDGE_PIXELS, 0)}
                disabled={isLocked || selectedBlock.locked}
              >
                Right
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => onNudgeBlock(page.id, selectedBlock.id, 0, -NUDGE_PIXELS)}
                disabled={isLocked || selectedBlock.locked}
              >
                Up
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => onNudgeBlock(page.id, selectedBlock.id, 0, NUDGE_PIXELS)}
                disabled={isLocked || selectedBlock.locked}
              >
                Down
              </button>
            </div>
            <div className="rf-inline-actions">
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => reorderCanvasBlocksOnPage(entry, [selectedBlock.id], "forward"))}
              >
                Forward
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => reorderCanvasBlocksOnPage(entry, [selectedBlock.id], "backward"))}
              >
                Backward
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => setCanvasBlocksLocked(entry, [selectedBlock.id], !selectedBlock.locked))}
              >
                {selectedBlock.locked ? "Unlock" : "Lock"}
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() =>
                  commitPageUpdate((entry) =>
                    setCanvasBlocksVisible(entry, [selectedBlock.id], selectedBlock.visible === false)
                  )
                }
              >
                {selectedBlock.visible === false ? "Show" : "Hide"}
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() =>
                  setClipboard({
                    entries: copyCanvasBlocksFromPage(page, [selectedBlock.id]),
                    copiedAt: new Date().toISOString(),
                  })
                }
              >
                Copy
              </button>
              <button
                type="button"
                className="rf-button"
                onClick={() => commitPageUpdate((entry) => duplicateCanvasBlocksOnPage(entry, [selectedBlock.id]))}
              >
                Duplicate
              </button>
              <button type="button" className="rf-button" onClick={() => onRemoveBlock(page.id, selectedBlock.id)} disabled={isLocked}>
                Remove
              </button>
            </div>
          </>
        ) : selectedBlockIds.length > 1 ? (
          <div className="rf-inline-actions">
            <button
              type="button"
              className="rf-button"
              onClick={() => commitPageUpdate((entry) => reorderCanvasBlocksOnPage(entry, selectedBlockIds, "front"))}
            >
              Bring Front
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => commitPageUpdate((entry) => reorderCanvasBlocksOnPage(entry, selectedBlockIds, "back"))}
            >
              Send Back
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => commitPageUpdate((entry) => setCanvasBlocksLocked(entry, selectedBlockIds, true))}
            >
              Lock
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() => commitPageUpdate((entry) => setCanvasBlocksVisible(entry, selectedBlockIds, false))}
            >
              Hide
            </button>
            <button
              type="button"
              className="rf-button"
              onClick={() =>
                setClipboard({
                  entries: copyCanvasBlocksFromPage(page, selectedBlockIds),
                  copiedAt: new Date().toISOString(),
                })
              }
            >
              Copy
            </button>
          </div>
        ) : (
          <p className="rf-muted">Select one or more blocks to edit properties and layout.</p>
        )}

        <div className="rf-panel rf-panel--soft">
          <h3>Layers</h3>
          <div className="rf-canvas-editor__layers">
            {[...page.blocks]
              .sort((left, right) => (right.zIndex ?? 0) - (left.zIndex ?? 0))
              .map((block) => (
                <div
                  key={block.id}
                  className={`rf-canvas-editor__layer ${selectedBlockIds.includes(block.id) ? "is-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBlockIds([block.id])}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedBlockIds([block.id]);
                    }
                  }}
                >
                  <span>
                    <strong>{block.title}</strong>
                    <small>{block.kind}</small>
                  </span>
                  <span className="rf-inline-actions">
                    <button
                      type="button"
                      className="rf-canvas-editor__layer-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        commitPageUpdate((entry) => reorderCanvasBlocksOnPage(entry, [block.id], "forward"));
                      }}
                    >
                      +Z
                    </button>
                    <button
                      type="button"
                      className="rf-canvas-editor__layer-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        commitPageUpdate((entry) => reorderCanvasBlocksOnPage(entry, [block.id], "backward"));
                      }}
                    >
                      -Z
                    </button>
                    <button
                      type="button"
                      className="rf-canvas-editor__layer-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        commitPageUpdate((entry) => setCanvasBlocksVisible(entry, [block.id], block.visible === false));
                      }}
                    >
                      {block.visible === false ? "Show" : "Hide"}
                    </button>
                    <button
                      type="button"
                      className="rf-canvas-editor__layer-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        commitPageUpdate((entry) => setCanvasBlocksLocked(entry, [block.id], !block.locked));
                      }}
                    >
                      {block.locked ? "Unlock" : "Lock"}
                    </button>
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
