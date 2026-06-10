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

  it('clamps x to 0 when negative', () => {
    const result = clampToCanvas(-50, 200, 100, 50, bounds);
    expect(result.x).toBe(0);
  });

  it('clamps y to 0 when negative', () => {
    const result = clampToCanvas(100, -30, 100, 100, bounds);
    expect(result.y).toBe(0);
  });

  it('clamps x to canvas right edge', () => {
    const result = clampToCanvas(800, 200, 100, 50, bounds);
    expect(result.x).toBe(694); // 794 - 100
  });

  it('clamps y to canvas bottom edge', () => {
    const result = clampToCanvas(100, 1200, 100, 100, bounds);
    expect(result.y).toBe(1023); // 1123 - 100
  });
});
