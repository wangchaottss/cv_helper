import { useCallback, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { CanvasElement } from '../types/elements';

interface MarqueeRect {
  x: number; y: number; width: number; height: number;
}

export function useMarqueeSelect() {
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const currentRef = useRef<MarqueeRect | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent, canvasInnerEl: HTMLElement | null) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-testid^="element-"]')) return;
      if (!canvasInnerEl) return;

      e.preventDefault();
      const store = useEditorStore.getState();
      const zoom = store.zoom;
      const rect = canvasInnerEl.getBoundingClientRect();

      const lx = (e.clientX - rect.left) / zoom;
      const ly = (e.clientY - rect.top) / zoom;

      originRef.current = { x: lx, y: ly };
      currentRef.current = { x: lx, y: ly, width: 0, height: 0 };
      setMarquee({ x: lx, y: ly, width: 0, height: 0 });
    },
    [],
  );

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent, canvasInnerEl: HTMLElement | null) => {
      const origin = originRef.current;
      if (!origin || !canvasInnerEl) return;

      e.preventDefault();

      const store = useEditorStore.getState();
      const zoom = store.zoom;
      const rect = canvasInnerEl.getBoundingClientRect();

      const cx = (e.clientX - rect.left) / zoom;
      const cy = (e.clientY - rect.top) / zoom;

      const m: MarqueeRect = {
        x: Math.min(origin.x, cx),
        y: Math.min(origin.y, cy),
        width: Math.abs(cx - origin.x),
        height: Math.abs(cy - origin.y),
      };

      currentRef.current = m;
      setMarquee(m);
    },
    [],
  );

  const onCanvasMouseUp = useCallback(() => {
    const origin = originRef.current;
    const m = currentRef.current;
    if (!origin || !m) return;

    if (m.width > 3 && m.height > 3) {
      const store = useEditorStore.getState();
      const elements = Object.values(store.elements) as CanvasElement[];
      const selected: string[] = [];

      for (const el of elements) {
        if (el.type === 'guideline') continue;
        if (el.type === 'line') {
          if (el.x1 >= m.x && el.x1 <= m.x + m.width && el.y1 >= m.y && el.y1 <= m.y + m.height &&
              el.x2 >= m.x && el.x2 <= m.x + m.width && el.y2 >= m.y && el.y2 <= m.y + m.height) {
            selected.push(el.id);
          }
          continue;
        }
        if (el.x >= m.x && el.y >= m.y && el.x + el.width <= m.x + m.width && el.y + el.height <= m.y + m.height) {
          selected.push(el.id);
        }
      }
      store.setSelection(selected);
    } else {
      useEditorStore.getState().setSelection([]);
    }

    originRef.current = null;
    currentRef.current = null;
    setMarquee(null);
  }, []);

  return { marquee, onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp };
}
