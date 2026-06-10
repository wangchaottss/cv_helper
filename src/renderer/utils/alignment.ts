// Alignment detection & snap engine

export interface CanvasBounds {
  width: number;
  height: number;
}

export interface ElementRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

const SNAP_THRESHOLD = 5; // px

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

export function getBoundingRect(elements: Array<{ x: number; y: number; width: number; height: number }>): ElementRect {
  if (elements.length === 0) {
    return { left: 0, right: 0, top: 0, bottom: 0, centerX: 0, centerY: 0 };
  }
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const el of elements) {
    left = Math.min(left, el.x);
    right = Math.max(right, el.x + el.width);
    top = Math.min(top, el.y);
    bottom = Math.max(bottom, el.y + el.height);
  }
  return { left, right, top, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
}

export interface AlignmentResult {
  horizontal: number[];
  vertical: number[];
  snapX: number | null;
  snapY: number | null;
}

interface SnapCandidate {
  pos: number;    // guide line position
  offset: number; // correction to apply to element
  dist: number;   // distance
}

/**
 * Detect closest alignment between moving element and canvas borders/midlines + other element edges.
 * Returns guide line positions AND the correction (snap) for the single closest match per axis.
 */
export function detectAlignments(
  movingRect: ElementRect,
  otherRects: ElementRect[],
  canvasBounds: CanvasBounds,
  threshold: number = SNAP_THRESHOLD,
): AlignmentResult {
  // Build reference points — each has left/right/top/bottom/centerX/centerY
  const refs: ElementRect[] = [...otherRects];

  // Canvas borders as a full-rect reference (edges + center)
  refs.push({
    left: 0,
    right: canvasBounds.width,
    top: 0,
    bottom: canvasBounds.height,
    centerX: canvasBounds.width / 2,
    centerY: canvasBounds.height / 2,
  });

  // Collect ALL vertical snap candidates (x-axis guides)
  const vCandidates: SnapCandidate[] = [];
  for (const ref of refs) {
    // Moving left ↔ ref left
    vCandidates.push({ pos: ref.left, offset: ref.left - movingRect.left, dist: Math.abs(movingRect.left - ref.left) });
    // Moving right ↔ ref right
    vCandidates.push({ pos: ref.right, offset: ref.right - movingRect.right, dist: Math.abs(movingRect.right - ref.right) });
    // Moving centerX ↔ ref centerX
    vCandidates.push({ pos: ref.centerX, offset: ref.centerX - movingRect.centerX, dist: Math.abs(movingRect.centerX - ref.centerX) });
  }

  // Collect ALL horizontal snap candidates (y-axis guides)
  const hCandidates: SnapCandidate[] = [];
  for (const ref of refs) {
    hCandidates.push({ pos: ref.top, offset: ref.top - movingRect.top, dist: Math.abs(movingRect.top - ref.top) });
    hCandidates.push({ pos: ref.bottom, offset: ref.bottom - movingRect.bottom, dist: Math.abs(movingRect.bottom - ref.bottom) });
    hCandidates.push({ pos: ref.centerY, offset: ref.centerY - movingRect.centerY, dist: Math.abs(movingRect.centerY - ref.centerY) });
  }

  // Find the single closest snap per axis
  let bestV: SnapCandidate | null = null;
  for (const c of vCandidates) {
    if (c.dist < threshold && (!bestV || c.dist < bestV.dist)) {
      bestV = c;
    }
  }

  let bestH: SnapCandidate | null = null;
  for (const c of hCandidates) {
    if (c.dist < threshold && (!bestH || c.dist < bestH.dist)) {
      bestH = c;
    }
  }

  // Collect all guide lines within threshold (for visual rendering)
  const vertical: number[] = [];
  for (const c of vCandidates) {
    if (c.dist < threshold) vertical.push(c.pos);
  }
  const horizontal: number[] = [];
  for (const c of hCandidates) {
    if (c.dist < threshold) horizontal.push(c.pos);
  }

  return {
    horizontal: [...new Set(horizontal)],
    vertical: [...new Set(vertical)],
    snapX: bestV?.offset ?? null,
    snapY: bestH?.offset ?? null,
  };
}

export function applySnap(
  x: number, y: number,
  snapX: number | null, snapY: number | null,
): { x: number; y: number } {
  return {
    x: snapX !== null ? x + snapX : x,
    y: snapY !== null ? y + snapY : y,
  };
}
