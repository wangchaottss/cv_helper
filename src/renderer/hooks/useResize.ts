import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clampToCanvas, getCanvasBounds } from '../utils/coordinates';

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

    // Clamp to canvas bounds
    const canvasBounds = getCanvasBounds();
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
      if (!element) return;

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
