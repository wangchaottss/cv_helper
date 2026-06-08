import { useCallback, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clampToCanvas, getCanvasBounds } from '../utils/coordinates';

const DRAG_THRESHOLD = 3; // px — minimum movement before drag starts

interface DragState {
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startElementX: number;
  startElementY: number;
  isDragging: boolean;
}

export function useElementDrag() {
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDelta = useRef<{ dx: number; dy: number } | null>(null);

  const zoom = useEditorStore((s) => s.zoom);
  const elements = useEditorStore((s) => s.elements);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, elementId: string) => {
      e.stopPropagation();
      e.preventDefault();

      const element = elements[elementId];
      if (!element) return;

      const canvasRect = (e.currentTarget as HTMLElement)
        .closest('[data-canvas-inner]')
        ?.getBoundingClientRect();

      if (!canvasRect) return;

      dragRef.current = {
        elementId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startElementX: element.x,
        startElementY: element.y,
        isDragging: false,
      };

      // Set pointer capture for reliable tracking
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      // Select the element
      setSelection([elementId]);
    },
    [elements, setSelection],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;

      const dx = e.clientX - dragRef.current.startMouseX;
      const dy = e.clientY - dragRef.current.startMouseY;

      if (!dragRef.current.isDragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
          return;
        }
        dragRef.current.isDragging = true;
      }

      // Convert screen delta to logical delta
      const logicalDx = Math.round(dx / zoom);
      const logicalDy = Math.round(dy / zoom);

      const canvasBounds = getCanvasBounds();
      const targetIds = selection.includes(dragRef.current.elementId)
        ? selection
        : [dragRef.current.elementId];

      // Batch update all selected elements
      pendingDelta.current = { dx: logicalDx, dy: logicalDy };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const delta = pendingDelta.current;
          if (!delta) return;
          pendingDelta.current = null;

          for (const id of targetIds) {
            const el = useEditorStore.getState().elements[id];
            if (!el) continue;

            const newX = dragRef.current!.startElementX + delta.dx;
            const newY = dragRef.current!.startElementY + delta.dy;

            const clamped = clampToCanvas(newX, newY, el.width, el.height, canvasBounds);
            useEditorStore.getState().updateElement(id, {
              x: clamped.x,
              y: clamped.y,
            });
          }
        });
      }
    },
    [zoom, selection],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;

      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

      if (dragRef.current.isDragging) {
        // Push history on drag end
        useEditorStore.getState().pushHistory();
      }

      // Reset
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingDelta.current = null;
      dragRef.current = null;
    },
    [],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
