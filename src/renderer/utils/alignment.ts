// ============================================================
// Alignment detection & snap engine
// ============================================================

export interface CanvasBounds {
  width: number;
  height: number;
}

const DEFAULT_THRESHOLD = 5; // px

export interface ElementRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export function getElementRect(element: { x: number; y: number; width: number; height: number }): ElementRect {
  return {
    left: element.x,
    right: element.x + element.width,
    top: element.y,
    bottom: element.y + element.height,
    centerX: element.x + element.width / 2,
    centerY: element.y + element.height / 2,
  };
}

/**
 * Compute the bounding box of multiple elements (for multi-select alignment)
 */
export function getBoundingRect(elements: Array<{ x: number; y: number; width: number; height: number }>): ElementRect {
  if (elements.length === 0) {
    return { left: 0, right: 0, top: 0, bottom: 0, centerX: 0, centerY: 0 };
  }

  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const el of elements) {
    left = Math.min(left, el.x);
    right = Math.max(right, el.x + el.width);
    top = Math.min(top, el.y);
    bottom = Math.max(bottom, el.y + el.height);
  }

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

export interface AlignmentResult {
  horizontal: number[];
  vertical: number[];
  snapX: number | null;
  snapY: number | null;
}

/**
 * Detect alignment between a moving element and other elements + canvas midlines.
 * Returns guide line positions and optional snap correction.
 */
export function detectAlignments(
  movingRect: ElementRect,
  otherRects: ElementRect[],
  canvasBounds: CanvasBounds,
  threshold: number = DEFAULT_THRESHOLD,
): AlignmentResult {
  const horizontal: number[] = [];
  const vertical: number[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;
  let minDistX = threshold + 1;
  let minDistY = threshold + 1;

  // Canvas midlines are always reference points
  const canvasMidX = canvasBounds.width / 2;
  const canvasMidY = canvasBounds.height / 2;

  const allRefs = [
    ...otherRects,
    // Virtual canvas midline "element" (center only)
    {
      left: canvasMidX,
      right: canvasMidX,
      top: canvasMidY,
      bottom: canvasMidY,
      centerX: canvasMidX,
      centerY: canvasMidY,
    },
  ];

  for (const ref of allRefs) {
    // --- Horizontal alignments (vertical guide lines) ---
    // Left edge alignment
    const distLeft = Math.abs(movingRect.left - ref.left);
    if (distLeft < threshold && distLeft <= minDistX) {
      if (distLeft < minDistX) { vertical.length = 0; minDistX = distLeft; }
      vertical.push(ref.left);
      snapX = ref.left - movingRect.left;
    }
    // Right edge alignment
    const distRight = Math.abs(movingRect.right - ref.right);
    if (distRight < threshold && distRight <= minDistX) {
      if (distRight < minDistX) { vertical.length = 0; minDistX = distRight; }
      vertical.push(ref.right);
      snapX = ref.right - movingRect.right;
    }
    // Horizontal center alignment
    const distCenterX = Math.abs(movingRect.centerX - ref.centerX);
    if (distCenterX < threshold && distCenterX <= minDistX) {
      if (distCenterX < minDistX) { vertical.length = 0; minDistX = distCenterX; }
      vertical.push(ref.centerX);
      snapX = ref.centerX - movingRect.centerX;
    }

    // --- Vertical alignments (horizontal guide lines) ---
    // Top edge alignment
    const distTop = Math.abs(movingRect.top - ref.top);
    if (distTop < threshold && distTop <= minDistY) {
      if (distTop < minDistY) { horizontal.length = 0; minDistY = distTop; }
      horizontal.push(ref.top);
      snapY = ref.top - movingRect.top;
    }
    // Bottom edge alignment
    const distBottom = Math.abs(movingRect.bottom - ref.bottom);
    if (distBottom < threshold && distBottom <= minDistY) {
      if (distBottom < minDistY) { horizontal.length = 0; minDistY = distBottom; }
      horizontal.push(ref.bottom);
      snapY = ref.bottom - movingRect.bottom;
    }
    // Vertical center alignment
    const distCenterY = Math.abs(movingRect.centerY - ref.centerY);
    if (distCenterY < threshold && distCenterY <= minDistY) {
      if (distCenterY < minDistY) { horizontal.length = 0; minDistY = distCenterY; }
      horizontal.push(ref.centerY);
      snapY = ref.centerY - movingRect.centerY;
    }
  }

  // Deduplicate guide line positions
  return {
    horizontal: [...new Set(horizontal)],
    vertical: [...new Set(vertical)],
    snapX,
    snapY,
  };
}

/**
 * Apply snap correction to element coordinates
 */
export function applySnap(
  x: number,
  y: number,
  snapX: number | null,
  snapY: number | null,
): { x: number; y: number } {
  return {
    x: snapX !== null ? x + snapX : x,
    y: snapY !== null ? y + snapY : y,
  };
}
