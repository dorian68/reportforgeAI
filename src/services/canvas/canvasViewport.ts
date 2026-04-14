export interface CanvasRulerTick {
  value: number;
  label: string;
  major: boolean;
}

export interface CanvasViewportState {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
}

export interface MiniMapViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MiniMapScrollTarget {
  scrollLeft: number;
  scrollTop: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function buildCanvasRulerTicks(
  length: number,
  step = 40,
  majorEvery = 4
): CanvasRulerTick[] {
  const tickCount = Math.max(0, Math.floor(length / step));
  return Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = index * step;
    const major = index % majorEvery === 0;
    return {
      value,
      major,
      label: major ? String(value) : "",
    };
  });
}

export function buildMiniMapViewport(
  pageWidth: number,
  pageHeight: number,
  viewport: CanvasViewportState,
  zoom: number,
  miniMapWidth: number,
  miniMapHeight: number
): MiniMapViewport {
  const renderedWidth = pageWidth * zoom;
  const renderedHeight = pageHeight * zoom;
  const scaleX = miniMapWidth / Math.max(renderedWidth, 1);
  const scaleY = miniMapHeight / Math.max(renderedHeight, 1);

  return {
    left: viewport.scrollLeft * scaleX,
    top: viewport.scrollTop * scaleY,
    width: Math.min(viewport.clientWidth * scaleX, miniMapWidth),
    height: Math.min(viewport.clientHeight * scaleY, miniMapHeight),
  };
}

export function resolveMiniMapScrollTarget(
  pageWidth: number,
  pageHeight: number,
  viewport: CanvasViewportState,
  zoom: number,
  miniMapWidth: number,
  miniMapHeight: number,
  pointX: number,
  pointY: number
): MiniMapScrollTarget {
  const renderedWidth = pageWidth * zoom;
  const renderedHeight = pageHeight * zoom;
  const scaleX = renderedWidth / Math.max(miniMapWidth, 1);
  const scaleY = renderedHeight / Math.max(miniMapHeight, 1);
  const desiredLeft = pointX * scaleX - viewport.clientWidth / 2;
  const desiredTop = pointY * scaleY - viewport.clientHeight / 2;

  return {
    scrollLeft: clamp(desiredLeft, 0, Math.max(renderedWidth - viewport.clientWidth, 0)),
    scrollTop: clamp(desiredTop, 0, Math.max(renderedHeight - viewport.clientHeight, 0)),
  };
}
