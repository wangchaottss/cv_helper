import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { detectAlignments, applySnap, getElementRect } from '../utils/alignment';

const DRAG_THRESHOLD = 3;

interface DragState {
  elementId: string;
  startMouseX: number;
  startMouseY: number;
  startElementX: number;
  startElementY: number;
  isDragging: boolean;
  pointerId: number;
}

export function useElementDrag() {
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingDelta = useRef<{ dx: number; dy: number } | null>(null);

  const processFrame = useCallback(() => {
    rafRef.current = null;
    const drag = dragRef.current;
    if (!drag || !drag.isDragging) return;

    const delta = pendingDelta.current;
    if (!delta) return;
    pendingDelta.current = null;

    const store = useEditorStore.getState();
    const zoom = store.zoom;
    const currentSnapEnabled = store.snapEnabled;
    const currentShowGuides = store.showGuides;
    const canvasBounds = getCanvasBounds();
    const selection = store.selection;

    const logicalDx = Math.round(delta.dx / zoom);
    const logicalDy = Math.round(delta.dy / zoom);

    const targetIds = selection.includes(drag.elementId)
      ? selection
      : [drag.elementId];

    const primaryEl = store.elements[drag.elementId];
    if (!primaryEl || primaryEl.type === 'guideline' || primaryEl.type === 'line') return;

    let newX = drag.startElementX + logicalDx;
    let newY = drag.startElementY + logicalDy;

    // Alignment detection and snap
    if (currentShowGuides || currentSnapEnabled) {
      const movingRect = getElementRect({
        x: newX, y: newY,
        width: primaryEl.width, height: primaryEl.height,
      });

      const otherElements = Object.values(store.elements).filter(
        (el) => !targetIds.includes(el.id),
      );
const otherRects = otherElements.map((el) => { if (el.type === 'guideline') { return el.orientation === 'horizontal' ? { left: 0, right: canvasBounds.width, top: el.position, bottom: el.position, centerX: canvasBounds.width / 2, centerY: el.position } : { left: el.position, right: el.position, top: 0, bottom: canvasBounds.height, centerX: el.position, centerY: canvasBounds.height / 2 }; } if (el.type === 'line') { const l = Math.min(el.x1, el.x2), r = Math.max(el.x1, el.x2), t = Math.min(el.y1, el.y2), b = Math.max(el.y1, el.y2); return { left: l, right: r, top: t, bottom: b, centerX: (l+r)/2, centerY: (t+b)/2 }; } return getElementRect(el); });

      const alignment = detectAlignments(movingRect, otherRects, canvasBounds);

      // Find snap targets for visual highlight (only when snap is enabled)
      if (currentSnapEnabled && (alignment.snapX !== null || alignment.snapY !== null)) {
        const sx = alignment.snapX ?? 0;
        const sy = alignment.snapY ?? 0;
        const snappedRect = getElementRect({
          x: newX + sx, y: newY + sy,
          width: primaryEl.width, height: primaryEl.height,
        });
        const targets: string[] = [];
        for (let i = 0; i < otherElements.length; i++) {
          const r = otherRects[i];
          if (
            Math.abs(snappedRect.left - r.left) < 1 || Math.abs(snappedRect.right - r.right) < 1 ||
            Math.abs(snappedRect.left - r.right) < 1 || Math.abs(snappedRect.right - r.left) < 1 ||
            Math.abs(snappedRect.top - r.top) < 1 || Math.abs(snappedRect.bottom - r.bottom) < 1 ||
            Math.abs(snappedRect.top - r.bottom) < 1 || Math.abs(snappedRect.bottom - r.top) < 1 ||
            Math.abs(snappedRect.centerX - r.centerX) < 1 || Math.abs(snappedRect.centerY - r.centerY) < 1
          ) {
            targets.push(otherElements[i].id);
          }
        }
        // Canvas border/midline
        const cw = canvasBounds.width;
        const ch = canvasBounds.height;
        if (
          Math.abs(snappedRect.left) < 1 || Math.abs(snappedRect.top) < 1 ||
          Math.abs(snappedRect.right - cw) < 1 || Math.abs(snappedRect.bottom - ch) < 1 ||
          Math.abs(snappedRect.centerX - cw / 2) < 1 || Math.abs(snappedRect.centerY - ch / 2) < 1
        ) {
          targets.push('__canvas__');
        }
        useEditorStore.getState().setSnapTargets(targets);
      } else {
        useEditorStore.getState().setSnapTargets([]);
      }

      if (currentShowGuides) {
        useEditorStore.getState().setGuideLines({
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

    // Use the snap-corrected position to compute the effective delta
    const effectiveDx = newX - drag.startElementX;
    const effectiveDy = newY - drag.startElementY;

    for (const id of targetIds) {
      const el = store.elements[id];
      if (!el || el.type === 'guideline' || el.type === 'line') continue;
      const elNewX = drag.startElementX + effectiveDx + (el.x - primaryEl.x);
      const elNewY = drag.startElementY + effectiveDy + (el.y - primaryEl.y);
      const clamped = clampToCanvas(elNewX, elNewY, el.width, el.height, canvasBounds);
      useEditorStore.getState().updateElement(id, { x: clamped.x, y: clamped.y });
    }
  }, []);

  // Use window-level pointer events during drag for reliable capture
  const handleWindowPointerMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return;

    const dx = e.clientX - dragRef.current.startMouseX;
    const dy = e.clientY - dragRef.current.startMouseY;

    if (!dragRef.current.isDragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      dragRef.current.isDragging = true;
    }

    pendingDelta.current = { dx, dy };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(processFrame);
    }
  }, [processFrame]);

  const handleWindowPointerUp = useCallback((_e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.isDragging) {
      useEditorStore.getState().pushHistory();
      // Final frame flush
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      processFrame();
    }

    useEditorStore.getState().clearGuides();
    useEditorStore.getState().setSnapTargets([]);
    pendingDelta.current = null;
    dragRef.current = null;

    // Remove window listeners
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [processFrame, handleWindowPointerMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleWindowPointerMove, handleWindowPointerUp]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, elementId: string) => {
      e.stopPropagation();

      const target = e.target as HTMLElement;

      // If clicking inside a contentEditable element, skip drag entirely —
      // let the browser handle text selection
      if (target.isContentEditable) {
        return;
      }

      e.preventDefault();

      const store = useEditorStore.getState();
      const element = store.elements[elementId];
      if (!element || element.type === 'guideline' || element.type === 'line') return;

      const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
      const alreadySelected = store.selection.includes(elementId);

      if (isMultiSelect) {
        store.toggleSelection(elementId);
      } else if (!alreadySelected) {
        // Click on unselected element — select only this one
        store.setSelection([elementId]);
      }
      // If already selected and not multi-select: keep existing selection for drag

      // Initialize drag state
      dragRef.current = {
        elementId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startElementX: element.x,
        startElementY: element.y,
        isDragging: false,
        pointerId: e.pointerId,
      };

      // Add window-level listeners for reliable move/up tracking
      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerUp, { once: true });
    },
    [handleWindowPointerMove, handleWindowPointerUp],
  );

  return { onPointerDown };
}
