import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { detectAlignments, getElementRect } from '../utils/alignment';

const MIN_SIZE = 20; // minimum width/height in px

type ResizeHandle =
  | 'nw' | 'ne' | 'sw' | 'se'   // corners
  | 'n'  | 's'  | 'e'  | 'w';  // edges

// Map control point index to resize handle
const HANDLE_MAP: ResizeHandle[] = [
  'nw', 'ne', 'sw', 'se',  // corners
  'n',  'e',  's',  'w',   // edges
];

interface ResizeState {
  elementId: string;
  handle: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
}

export function useResize() {
  const resizeRef = useRef<ResizeState | null>(null);

  const handleWindowPointerMove = useCallback((e: PointerEvent) => {
    const rs = resizeRef.current;
    if (!rs) return;

    const dx = e.clientX - rs.startMouseX;
    const dy = e.clientY - rs.startMouseY;
    const store = useEditorStore.getState();
    const zoom = store.zoom;

    const logicalDx = Math.round(dx / zoom);
    const logicalDy = Math.round(dy / zoom);

    let newX = rs.startX;
    let newY = rs.startY;
    let newW = rs.startW;
    let newH = rs.startH;

    switch (rs.handle) {
      case 'nw':
        newX = rs.startX + logicalDx;
        newY = rs.startY + logicalDy;
        newW = rs.startW - logicalDx;
        newH = rs.startH - logicalDy;
        break;
      case 'ne':
        newY = rs.startY + logicalDy;
        newW = rs.startW + logicalDx;
        newH = rs.startH - logicalDy;
        break;
      case 'sw':
        newX = rs.startX + logicalDx;
        newW = rs.startW - logicalDx;
        newH = rs.startH + logicalDy;
        break;
      case 'se':
        newW = rs.startW + logicalDx;
        newH = rs.startH + logicalDy;
        break;
      case 'n':
        newY = rs.startY + logicalDy;
        newH = rs.startH - logicalDy;
        break;
      case 's':
        newH = rs.startH + logicalDy;
        break;
      case 'e':
        newW = rs.startW + logicalDx;
        break;
      case 'w':
        newX = rs.startX + logicalDx;
        newW = rs.startW - logicalDx;
        break;
    }

    // Enforce minimum size
    if (newW < MIN_SIZE) {
      if (rs.handle.includes('w')) newX = rs.startX + rs.startW - MIN_SIZE;
      newW = MIN_SIZE;
    }
    if (newH < MIN_SIZE) {
      if (rs.handle.includes('n')) newY = rs.startY + rs.startH - MIN_SIZE;
      newH = MIN_SIZE;
    }

    // Alignment detection and snap during resize
    const canvasBounds = getCanvasBounds();
    if (store.snapEnabled) {
      const movingRect = getElementRect({ x: newX, y: newY, width: newW, height: newH });
      const otherRects = Object.values(store.elements)
        .filter((el) => el.id !== rs.elementId)
        .map((el) => {
          if (el.type === 'guideline') {
            return el.orientation === 'horizontal'
              ? { left: 0, right: canvasBounds.width, top: el.position, bottom: el.position, centerX: canvasBounds.width / 2, centerY: el.position }
              : { left: el.position, right: el.position, top: 0, bottom: canvasBounds.height, centerX: el.position, centerY: canvasBounds.height / 2 };
          }
          return getElementRect(el);
        });

      const alignment = detectAlignments(movingRect, otherRects, canvasBounds);

      // Find snap targets for visual highlight
      if (alignment.snapX !== null || alignment.snapY !== null) {
        const sx = alignment.snapX ?? 0;
        const sy = alignment.snapY ?? 0;
        const targets: string[] = [];
        // Find which elements contributed to the snap
        const allOtherEls = Object.values(store.elements).filter((el) => el.id !== rs.elementId);
        for (const otherEl of allOtherEls) {
          let r: { left: number; right: number; top: number; bottom: number; centerX: number; centerY: number };
          if (otherEl.type === 'guideline') {
            r = otherEl.orientation === 'horizontal'
              ? { left: 0, right: canvasBounds.width, top: otherEl.position, bottom: otherEl.position, centerX: canvasBounds.width / 2, centerY: otherEl.position }
              : { left: otherEl.position, right: otherEl.position, top: 0, bottom: canvasBounds.height, centerX: otherEl.position, centerY: canvasBounds.height / 2 };
          } else {
            r = getElementRect(otherEl);
          }
          const snappedRect = getElementRect({ x: newX + sx, y: newY + sy, width: newW, height: newH });
          if (
            Math.abs(snappedRect.left - r.left) < 1 || Math.abs(snappedRect.right - r.right) < 1 ||
            Math.abs(snappedRect.left - r.right) < 1 || Math.abs(snappedRect.right - r.left) < 1 ||
            Math.abs(snappedRect.top - r.top) < 1 || Math.abs(snappedRect.bottom - r.bottom) < 1 ||
            Math.abs(snappedRect.top - r.bottom) < 1 || Math.abs(snappedRect.bottom - r.top) < 1 ||
            Math.abs(snappedRect.centerX - r.centerX) < 1 || Math.abs(snappedRect.centerY - r.centerY) < 1
          ) {
            targets.push(otherEl.id);
          }
        }
        // Canvas borders
        if (Math.abs(newX + sx) < 1 || Math.abs(newY + sy) < 1 ||
            Math.abs(newX + sx + newW - canvasBounds.width) < 1 ||
            Math.abs(newY + sy + newH - canvasBounds.height) < 1 ||
            Math.abs(newX + sx + newW / 2 - canvasBounds.width / 2) < 1 ||
            Math.abs(newY + sy + newH / 2 - canvasBounds.height / 2) < 1) {
          targets.push('__canvas__');
        }
        store.setSnapTargets(targets);

        // Apply snap correction based on which edge is being resized
        if (alignment.snapX !== null) {
          if (rs.handle.includes('w')) { newX += alignment.snapX; newW -= alignment.snapX; }
          else if (rs.handle.includes('e')) { newW += alignment.snapX; }
        }
        if (alignment.snapY !== null) {
          if (rs.handle.includes('n')) { newY += alignment.snapY; newH -= alignment.snapY; }
          else if (rs.handle.includes('s')) { newH += alignment.snapY; }
        }

        // Re-check min size after snap
        if (newW < MIN_SIZE) { newW = MIN_SIZE; if (rs.handle.includes('w')) newX = rs.startX + rs.startW - MIN_SIZE; }
        if (newH < MIN_SIZE) { newH = MIN_SIZE; if (rs.handle.includes('n')) newY = rs.startY + rs.startH - MIN_SIZE; }
      } else {
        store.setSnapTargets([]);
      }
    }
    const clamped = clampToCanvas(newX, newY, newW, newH, canvasBounds);

    store.updateElement(rs.elementId, {
      x: clamped.x,
      y: clamped.y,
      width: newW,
      height: newH,
    });
  }, []);

  const handleWindowPointerUp = useCallback((_e: PointerEvent) => {
    if (resizeRef.current) {
      useEditorStore.getState().pushHistory();
    }
    resizeRef.current = null;
    useEditorStore.getState().setSnapTargets([]);
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [handleWindowPointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [handleWindowPointerMove, handleWindowPointerUp]);

  const onResizeStart = useCallback(
    (e: React.PointerEvent, elementId: string, handleIndex: number) => {
      e.stopPropagation();
      e.preventDefault();

      const element = useEditorStore.getState().elements[elementId];
      if (!element || element.type === 'guideline') return;

      resizeRef.current = {
        elementId,
        handle: HANDLE_MAP[handleIndex],
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: element.x,
        startY: element.y,
        startW: element.width,
        startH: element.height,
      };

      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerUp, { once: true });
    },
    [handleWindowPointerMove, handleWindowPointerUp],
  );

  return { onResizeStart };
}
