import { describe, it, expect } from 'vitest';
import { clientToCanvas, canvasToClient, clampToCanvas, getCanvasBounds } from './coordinates';

describe('getCanvasBounds', () => {
  it('returns A4 dimensions at 96dpi', () => {
    const bounds = getCanvasBounds();
    expect(bounds.width).toBe(794);
    expect(bounds.height).toBe(1123);
  });
});

describe('clientToCanvas', () => {
  const canvasRect = new DOMRect(100, 50, 794, 1123);

  it('converts client coordinates to logical coordinates at zoom 1', () => {
    const result = clientToCanvas(200, 150, canvasRect, 1);
    expect(result.x).toBe(100); // 200 - 100
    expect(result.y).toBe(100); // 150 - 50
  });

  it('converts client coordinates at zoom 2', () => {
    const result = clientToCanvas(300, 250, canvasRect, 2);
    expect(result.x).toBe(100); // (300 - 100) / 2
    expect(result.y).toBe(100); // (250 - 50) / 2
  });

  it('converts client coordinates at zoom 0.5', () => {
    const result = clientToCanvas(200, 150, canvasRect, 0.5);
    expect(result.x).toBe(200); // (200 - 100) / 0.5
    expect(result.y).toBe(200); // (150 - 50) / 0.5
  });

  it('rounds coordinates to integers', () => {
    const result = clientToCanvas(203, 153, canvasRect, 2);
    expect(result.x).toBe(52); // Math.round((203-100)/2) = Math.round(51.5) = 52
    expect(result.y).toBe(52); // Math.round((153-50)/2) = Math.round(51.5) = 52
  });
});

describe('canvasToClient', () => {
  const canvasRect = new DOMRect(100, 50, 794, 1123);

  it('converts logical coordinates to client at zoom 1', () => {
    const result = canvasToClient(50, 100, canvasRect, 1);
    expect(result.x).toBe(150); // 100 + 50 * 1
    expect(result.y).toBe(150); // 50 + 100 * 1
  });

  it('converts logical coordinates to client at zoom 2', () => {
    const result = canvasToClient(50, 100, canvasRect, 2);
    expect(result.x).toBe(200); // 100 + 50 * 2
    expect(result.y).toBe(250); // 50 + 100 * 2
  });

  it('converts logical coordinates to client at zoom 0.5', () => {
    const result = canvasToClient(50, 100, canvasRect, 0.5);
    expect(result.x).toBe(125); // 100 + 50 * 0.5
    expect(result.y).toBe(100); // 50 + 100 * 0.5
  });

  it('round-trips with clientToCanvas', () => {
    const logical = { x: 200, y: 300 };
    const client = canvasToClient(logical.x, logical.y, canvasRect, 1.5);
    const back = clientToCanvas(client.x, client.y, canvasRect, 1.5);
    expect(back.x).toBe(logical.x);
    expect(back.y).toBe(logical.y);
  });
});

describe('clampToCanvas', () => {
  const bounds = { width: 794, height: 1123 };

  it('does not clamp elements fully inside canvas', () => {
    const result = clampToCanvas(100, 200, 100, 50, bounds);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('clamps x so at least 20% is visible', () => {
    const result = clampToCanvas(-100, 200, 100, 50, bounds);
    // -elementWidth + minVisibleW = -100 + 20 = -80
    expect(result.x).toBe(-80);
    expect(result.y).toBe(200);
  });

  it('clamps y so at least 20% is visible', () => {
    // y=-90 means only 10% visible (10px of 100), needs clamp to -80
    const result = clampToCanvas(100, -90, 100, 100, bounds);
    // -elementHeight + minVisibleH = -100 + 20 = -80
    expect(result.y).toBe(-80);
  });

  it('clamps x to right edge', () => {
    const result = clampToCanvas(800, 200, 100, 50, bounds);
    // canvasBounds.width - minVisibleW = 794 - 20 = 774
    expect(result.x).toBe(774);
  });

  it('clamps y to bottom edge', () => {
    const result = clampToCanvas(100, 1200, 100, 100, bounds);
    // canvasBounds.height - minVisibleH = 1123 - 20 = 1103
    expect(result.y).toBe(1103);
  });
});
