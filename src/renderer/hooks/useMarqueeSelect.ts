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
      // Only start marquee on empty canvas, not on elements
      const target = e.target as HTMLElement;
      if (target.closest('[data-testid^="element-"]')) return;

      if (!canvasInnerEl) return;

      e.preventDefault(); // prevent text selection / scrolling during drag

      const store = useEditorStore.getState();
      const zoom = store.zoom;
      const rect = canvasInnerEl.getBoundingClientRect();

      // Convert viewport coords → A4 logical coords
      const logicalX = (e.clientX - rect.left) / zoom;
      const logicalY = (e.clientY - rect.top) / zoom;

      startMouseRef.current = { x: e.clientX, y: e.clientY };

      marqueeRef.current = { x: logicalX, y: logicalY, width: 0, height: 0 };
      setMarquee({ x: logicalX, y: logicalY, width: 0, height: 0 });
    },
    [],
  );

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent, canvasInnerEl: HTMLElement | null) => {
      if (!marqueeRef.current || !canvasInnerEl) return;

      e.preventDefault();

      const store = useEditorStore.getState();
      const zoom = store.zoom;
      const rect = canvasInnerEl.getBoundingClientRect();

      const currentX = (e.clientX - rect.left) / zoom;
      const currentY = (e.clientY - rect.top) / zoom;

      const originX = marqueeRef.current.x;
      const originY = marqueeRef.current.y;

      // Build rect that works regardless of drag direction
      const m = {
        x: Math.min(originX, currentX),
        y: Math.min(originY, currentY),
        width: Math.abs(currentX - originX),
        height: Math.abs(currentY - originY),
      };

      marqueeRef.current = m;
      setMarquee({ ...m });
    },
    [],
  );

  const onCanvasMouseUp = useCallback(() => {
    if (!marqueeRef.current) return;

    const m = marqueeRef.current;

    // Only select if marquee has meaningful size (> 3px), otherwise deselect
    if (m.width > 3 && m.height > 3) {
      const store = useEditorStore.getState();
      const elements = Object.values(store.elements) as CanvasElement[];
      const selected: string[] = [];

      for (const el of elements) {
        if (el.type === 'guideline' || el.type === 'line') continue; // guidelines don't have x/y/width/height
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
    } else {
      // Tiny drag or single click on empty space → deselect
      useEditorStore.getState().setSelection([]);
    }

    marqueeRef.current = null;
    startMouseRef.current = null;
    setMarquee(null);
  }, []);

  return { marquee, onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp };
}
