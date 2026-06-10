// ============================================================
// Coordinate conversion utilities
// All mouse/client coordinates are converted to logical canvas
// coordinates (at 100% zoom) before touching the store.
// CSS transform: scale(zoom) handles visual rendering.
// ============================================================

export interface CanvasBounds {
  width: number;
  height: number;
}

/**
 * A4 dimensions in pixels at 96dpi
 */
export function getCanvasBounds(): CanvasBounds {
  return { width: 794, height: 1123 };
}

/**
 * Convert client (screen) coordinates to logical canvas coordinates
 */
export function clientToCanvas(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  zoom: number,
): { x: number; y: number } {
  const x = Math.round((clientX - canvasRect.left) / zoom);
  const y = Math.round((clientY - canvasRect.top) / zoom);
  return { x, y };
}

/**
 * Convert logical canvas coordinates to client (screen) coordinates
 */
export function canvasToClient(
  logicalX: number,
  logicalY: number,
  canvasRect: DOMRect,
  zoom: number,
): { x: number; y: number } {
  const x = canvasRect.left + logicalX * zoom;
  const y = canvasRect.top + logicalY * zoom;
  return { x, y };
}

/**
 * Clamp element position so it stays fully inside the A4 canvas bounds.
 * No part of the element is allowed outside.
 */
export function clampToCanvas(
  x: number,
  y: number,
  elementWidth: number,
  elementHeight: number,
  canvasBounds: CanvasBounds,
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, canvasBounds.width - elementWidth)),
    y: Math.max(0, Math.min(y, canvasBounds.height - elementHeight)),
  };
}
