import { useCallback, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { CanvasElement } from '../types/elements';

interface MarqueeRect {
  x: number; // canvas logical coords
  y: number;
  width: number;
  height: number;
}

export function useMarqueeSelect() {
  const marqueeRef = useRef<MarqueeRect | null>(null);
  const startMouseRef = useRef<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent, canvasInnerEl: HTMLElement | null) => {
      // Only start marquee if clicking on empty canvas background
      const target = e.target as HTMLElement;
      if (
        target !== canvasInnerEl &&
        target.dataset['canvasInner'] !== 'true' &&
        !target.closest('[data-canvas-inner]')
      ) {
        return;
      }

      if (!canvasInnerEl) return;

      const rect = canvasInnerEl.getBoundingClientRect();
      startMouseRef.current = { x: e.clientX, y: e.clientY };

      const store = useEditorStore.getState();
      const zoom = store.zoom;

      // Convert client coords to canvas logical coords
      const logicalX = (e.clientX - rect.left) / zoom;
      const logicalY = (e.clientY - rect.top) / zoom;

      marqueeRef.current = {
        x: logicalX,
        y: logicalY,
        width: 0,
        height: 0,
      };

      setMarquee({ x: logicalX, y: logicalY, width: 0, height: 0 });
    },
    [],
  );

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent, canvasInnerEl: HTMLElement | null) => {
      if (!marqueeRef.current || !startMouseRef.current || !canvasInnerEl) return;

      const store = useEditorStore.getState();
      const zoom = store.zoom;
      const rect = canvasInnerEl.getBoundingClientRect();

      const currentLogicalX = (e.clientX - rect.left) / zoom;
      const currentLogicalY = (e.clientY - rect.top) / zoom;

      const startX = marqueeRef.current.x;
      const startY = marqueeRef.current.y;

      const newMarquee: MarqueeRect = {
        x: Math.min(startX, currentLogicalX),
        y: Math.min(startY, currentLogicalY),
        width: Math.abs(currentLogicalX - startX),
        height: Math.abs(currentLogicalY - startY),
      };

      marqueeRef.current = newMarquee;
      setMarquee({ ...newMarquee });
    },
    [],
  );

  const onCanvasMouseUp = useCallback(() => {
    if (!marqueeRef.current) return;

    const m = marqueeRef.current;

    // Only select if marquee has meaningful size (> 3px)
    if (m.width > 3 && m.height > 3) {
      const store = useEditorStore.getState();
      const elements = Object.values(store.elements) as CanvasElement[];
      const selected: string[] = [];

      for (const el of elements) {
        // Element must be FULLY inside the marquee (not just intersecting)
        if (
          el.x >= m.x &&
          el.y >= m.y &&
          el.x + el.width <= m.x + m.width &&
          el.y + el.height <= m.y + m.height
        ) {
          selected.push(el.id);
        }
      }

      store.setSelection(selected);
    }

    marqueeRef.current = null;
    startMouseRef.current = null;
    setMarquee(null);
  }, []);

  return { marquee, onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp };
}
