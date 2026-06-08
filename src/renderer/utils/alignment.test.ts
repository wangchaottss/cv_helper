import { describe, it, expect } from 'vitest';
import { detectAlignments, applySnap, getElementRect, getBoundingRect } from './alignment';

const CANVAS_BOUNDS = { width: 794, height: 1123 };

describe('getElementRect', () => {
  it('computes rect from element bounds', () => {
    const rect = getElementRect({ x: 100, y: 200, width: 300, height: 100 });
    expect(rect.left).toBe(100);
    expect(rect.right).toBe(400);
    expect(rect.top).toBe(200);
    expect(rect.bottom).toBe(300);
    expect(rect.centerX).toBe(250);
    expect(rect.centerY).toBe(250);
  });
});

describe('getBoundingRect', () => {
  it('computes bounding box of multiple elements', () => {
    const rect = getBoundingRect([
      { x: 100, y: 50, width: 100, height: 100 },
      { x: 300, y: 200, width: 200, height: 50 },
    ]);
    expect(rect.left).toBe(100);
    expect(rect.right).toBe(500);
    expect(rect.top).toBe(50);
    expect(rect.bottom).toBe(250);
    expect(rect.centerX).toBe(300);
    expect(rect.centerY).toBe(150);
  });

  it('returns zero rect for empty array', () => {
    const rect = getBoundingRect([]);
    expect(rect.centerX).toBe(0);
    expect(rect.centerY).toBe(0);
  });
});

describe('detectAlignments', () => {
  it('detects left edge alignment', () => {
    const moving = getElementRect({ x: 97, y: 100, width: 100, height: 50 });
    const refs = [getElementRect({ x: 100, y: 50, width: 100, height: 50 })];
    const result = detectAlignments(moving, refs, CANVAS_BOUNDS);

    expect(result.vertical).toContain(100);
    expect(result.snapX).toBe(3);
  });

  it('detects right edge alignment', () => {
    const moving = getElementRect({ x: 203, y: 100, width: 100, height: 50 });
    const refs = [getElementRect({ x: 100, y: 50, width: 200, height: 50 })];
    const result = detectAlignments(moving, refs, CANVAS_BOUNDS);

    expect(result.vertical).toContain(300);
    expect(result.snapX).toBe(-3);
  });

  it('detects top edge alignment', () => {
    const moving = getElementRect({ x: 100, y: 48, width: 100, height: 50 });
    const refs = [getElementRect({ x: 50, y: 50, width: 100, height: 100 })];
    const result = detectAlignments(moving, refs, CANVAS_BOUNDS);

    expect(result.horizontal).toContain(50);
    expect(result.snapY).toBe(2);
  });

  it('detects center alignment', () => {
    const moving = getElementRect({ x: 200, y: 100, width: 100, height: 50 });
    const refs = [getElementRect({ x: 100, y: 100, width: 300, height: 50 })];
    const result = detectAlignments(moving, refs, CANVAS_BOUNDS);

    // Both centers should align
    expect(result.vertical).toContain(250); // ref centerX = 250
    expect(result.snapX).toBeDefined();
  });

  it('detects canvas horizontal midline', () => {
    // Test with an element close to canvas vertical midline
    // centerY = 535 + 25 = 560. canvasMidY = 561.5. Difference = 1.5 < 5
    const moving2 = getElementRect({ x: 100, y: 535, width: 100, height: 50 });
    const result2 = detectAlignments(moving2, [], CANVAS_BOUNDS);
    // centerY = 535 + 25 = 560. canvasMidY = 561.5. Difference = 1.5 < 5
    expect(result2.horizontal.length).toBeGreaterThan(0);
  });

  it('detects canvas vertical midline', () => {
    const moving = getElementRect({ x: 395, y: 100, width: 100, height: 50 });
    const result = detectAlignments(moving, [], CANVAS_BOUNDS);

    expect(result.vertical).toContain(397);
  });

  it('returns no alignment when distance > threshold', () => {
    const moving = getElementRect({ x: 100, y: 100, width: 100, height: 50 });
    const refs = [getElementRect({ x: 300, y: 300, width: 100, height: 50 })];
    const result = detectAlignments(moving, refs, CANVAS_BOUNDS);

    expect(result.horizontal).toHaveLength(0);
    expect(result.vertical).toHaveLength(0);
    expect(result.snapX).toBeNull();
    expect(result.snapY).toBeNull();
  });
});

describe('applySnap', () => {
  it('applies snap offset when provided', () => {
    const result = applySnap(100, 200, 3, -2);
    expect(result.x).toBe(103);
    expect(result.y).toBe(198);
  });

  it('returns original coordinates when snap is null', () => {
    const result = applySnap(100, 200, null, null);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });
});
