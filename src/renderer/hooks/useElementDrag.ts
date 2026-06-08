import { useCallback, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { detectAlignments, applySnap, getElementRect } from '../utils/alignment';

const DRAG_THRESHOLD = 3; // px

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
  const selection = useEditorStore((s) => s.selection);

  const setSelection = useEditorStore((s) => s.setSelection);
  const addToSelection = useEditorStore((s) => s.addToSelection);
  const toggleSelection = useEditorStore((s) => s.toggleSelection);
  const setGuideLines = useEditorStore((s) => s.setGuideLines);
  const clearGuides = useEditorStore((s) => s.clearGuides);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, elementId: string) => {
      e.stopPropagation();
      e.preventDefault();

      const element = useEditorStore.getState().elements[elementId];
      if (!element) return;

      const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;

      // Handle selection based on modifier keys
      if (isMultiSelect) {
        toggleSelection(elementId);
      } else {
        setSelection([elementId]);
      }
    },
    [setSelection],
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

      const logicalDx = Math.round(dx / zoom);
      const logicalDy = Math.round(dy / zoom);

      pendingDelta.current = { dx: logicalDx, dy: logicalDy };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const delta = pendingDelta.current;
          if (!delta) return;
          pendingDelta.current = null;

          const store = useEditorStore.getState();
          const currentSnapEnabled = store.snapEnabled;
          const currentShowGuides = store.showGuides;
          const canvasBounds = getCanvasBounds();

          const targetIds = selection.includes(dragRef.current!.elementId)
            ? selection
            : [dragRef.current!.elementId];

          // Compute new position for the primary element (for alignment detection)
          const primaryId = dragRef.current!.elementId;
          const primaryEl = store.elements[primaryId];
          if (!primaryEl) return;

          let newX = dragRef.current!.startElementX + delta.dx;
          let newY = dragRef.current!.startElementY + delta.dy;

          // Alignment detection and snap
          if (currentShowGuides || currentSnapEnabled) {
            const movingRect = getElementRect({
              x: newX,
              y: newY,
              width: primaryEl.width,
              height: primaryEl.height,
            });

            const otherRects = Object.values(store.elements)
              .filter((el) => !targetIds.includes(el.id))
              .map((el) => getElementRect(el));

            const alignment = detectAlignments(movingRect, otherRects, canvasBounds);

            if (currentShowGuides) {
              setGuideLines({
                horizontal: alignment.horizontal,
                vertical: alignment.vertical,
              });
            }

            if (currentSnapEnabled) {
              const snapped = applySnap(newX, newY, alignment.snapX, alignment.snapY);
              newX = snapped.x;
              newY = snapped.y;
            }
          }

          // Update all selected elements with the delta
          for (const id of targetIds) {
            const el = store.elements[id];
            if (!el) continue;

            const elNewX = dragRef.current!.startElementX + delta.dx + (el.x - primaryEl.x);
            const elNewY = dragRef.current!.startElementY + delta.dy + (el.y - primaryEl.y);

            const clamped = clampToCanvas(elNewX, elNewY, el.width, el.height, canvasBounds);
            useEditorStore.getState().updateElement(id, {
              x: clamped.x,
              y: clamped.y,
            });
          }
        });
      }
    },
    [zoom, selection, setGuideLines],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;

      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

      if (dragRef.current.isDragging) {
        useEditorStore.getState().pushHistory();
      }

      // Clear guide lines on drag end
      clearGuides();

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingDelta.current = null;
      dragRef.current = null;
    },
    [clearGuides],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}
