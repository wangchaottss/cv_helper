import { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clampToCanvas, getCanvasBounds } from '../utils/coordinates';

const MIN_SIZE = 20;
type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
const HANDLE_MAP: ResizeHandle[] = ['nw', 'ne', 'sw', 'se', 'n', 'e', 's', 'w'];

interface ResizeState {
  elementId: string; handle: ResizeHandle;
  startMouseX: number; startMouseY: number;
  startX: number; startY: number; startW: number; startH: number;
}

export function useResize() {
  const resizeRef = useRef<ResizeState | null>(null);

  const handleWindowPointerMove = useCallback((e: PointerEvent) => {
    const rs = resizeRef.current; if (!rs) return;
    const dx = e.clientX - rs.startMouseX, dy = e.clientY - rs.startMouseY;
    const store = useEditorStore.getState(), zoom = store.zoom;
    let newX = rs.startX, newY = rs.startY, newW = rs.startW, newH = rs.startH;
    const logicalDx = Math.round(dx / zoom), logicalDy = Math.round(dy / zoom);
    switch (rs.handle) {
      case 'nw': newX += logicalDx; newY += logicalDy; newW -= logicalDx; newH -= logicalDy; break;
      case 'ne': newY += logicalDy; newW += logicalDx; newH -= logicalDy; break;
      case 'sw': newX += logicalDx; newW -= logicalDx; newH += logicalDy; break;
      case 'se': newW += logicalDx; newH += logicalDy; break;
      case 'n': newY += logicalDy; newH -= logicalDy; break;
      case 's': newH += logicalDy; break;
      case 'e': newW += logicalDx; break;
      case 'w': newX += logicalDx; newW -= logicalDx; break;
    }
    if (newW < MIN_SIZE) { if (rs.handle.includes('w')) newX = rs.startX + rs.startW - MIN_SIZE; newW = MIN_SIZE; }
    if (newH < MIN_SIZE) { if (rs.handle.includes('n')) newY = rs.startY + rs.startH - MIN_SIZE; newH = MIN_SIZE; }

    const canvasBounds = getCanvasBounds();
    if (store.snapEnabled) {
      const allOtherEls = Object.values(store.elements).filter((el: any) => el.id !== rs.elementId);
      interface RefEdge { edge: string; pos: number; elId: string }
      const refEdges: RefEdge[] = [];
      for (const el of allOtherEls) {
        if (el.type === 'guideline') {
          if (el.orientation === 'horizontal') { refEdges.push({ edge: 'top', pos: el.position, elId: el.id }, { edge: 'bottom', pos: el.position, elId: el.id }, { edge: 'centerY', pos: el.position, elId: el.id }); }
          else { refEdges.push({ edge: 'left', pos: el.position, elId: el.id }, { edge: 'right', pos: el.position, elId: el.id }, { edge: 'centerX', pos: el.position, elId: el.id }); }
        } else if (el.type === 'line') {
          refEdges.push({ edge: 'left', pos: el.x1, elId: el.id }, { edge: 'right', pos: el.x1, elId: el.id }, { edge: 'centerX', pos: el.x1, elId: el.id });
          refEdges.push({ edge: 'left', pos: el.x2, elId: el.id }, { edge: 'right', pos: el.x2, elId: el.id }, { edge: 'centerX', pos: el.x2, elId: el.id });
          refEdges.push({ edge: 'top', pos: el.y1, elId: el.id }, { edge: 'bottom', pos: el.y1, elId: el.id }, { edge: 'centerY', pos: el.y1, elId: el.id });
          refEdges.push({ edge: 'top', pos: el.y2, elId: el.id }, { edge: 'bottom', pos: el.y2, elId: el.id }, { edge: 'centerY', pos: el.y2, elId: el.id });
        } else if (el.type === 'text' || el.type === 'image' || el.type === 'box') {
          refEdges.push({ edge: 'left', pos: el.x, elId: el.id }, { edge: 'right', pos: el.x + el.width, elId: el.id }, { edge: 'centerX', pos: el.x + el.width / 2, elId: el.id });
          refEdges.push({ edge: 'top', pos: el.y, elId: el.id }, { edge: 'bottom', pos: el.y + el.height, elId: el.id }, { edge: 'centerY', pos: el.y + el.height / 2, elId: el.id });
        }
      }
      refEdges.push({ edge: 'left', pos: 0, elId: '__canvas__' }, { edge: 'right', pos: canvasBounds.width, elId: '__canvas__' }, { edge: 'centerX', pos: canvasBounds.width / 2, elId: '__canvas__' });
      refEdges.push({ edge: 'top', pos: 0, elId: '__canvas__' }, { edge: 'bottom', pos: canvasBounds.height, elId: '__canvas__' }, { edge: 'centerY', pos: canvasBounds.height / 2, elId: '__canvas__' });

      const T = 8; const targets: string[] = []; let aX = false, aY = false;
      if (rs.handle.includes('w')) { const v = newX; let best: { o: number; id: string } | null = null;
        for (const r of refEdges) { if (r.edge === 'left' || r.edge === 'right' || r.edge === 'centerX') { const o = r.pos - v; if (Math.abs(o) < T && (!best || Math.abs(o) < Math.abs(best.o))) best = { o, id: r.elId }; } }
        if (best) { newX += best.o; newW -= best.o; targets.push(best.id); aX = true; } }
      if (rs.handle.includes('e') && !aX) { const v = newX + newW; let best: { o: number; id: string } | null = null;
        for (const r of refEdges) { if (r.edge === 'left' || r.edge === 'right' || r.edge === 'centerX') { const o = r.pos - v; if (Math.abs(o) < T && (!best || Math.abs(o) < Math.abs(best.o))) best = { o, id: r.elId }; } }
        if (best) { newW += best.o; targets.push(best.id); } }
      if (rs.handle.includes('n')) { const v = newY; let best: { o: number; id: string } | null = null;
        for (const r of refEdges) { if (r.edge === 'top' || r.edge === 'bottom' || r.edge === 'centerY') { const o = r.pos - v; if (Math.abs(o) < T && (!best || Math.abs(o) < Math.abs(best.o))) best = { o, id: r.elId }; } }
        if (best) { newY += best.o; newH -= best.o; targets.push(best.id); aY = true; } }
      if (rs.handle.includes('s') && !aY) { const v = newY + newH; let best: { o: number; id: string } | null = null;
        for (const r of refEdges) { if (r.edge === 'top' || r.edge === 'bottom' || r.edge === 'centerY') { const o = r.pos - v; if (Math.abs(o) < T && (!best || Math.abs(o) < Math.abs(best.o))) best = { o, id: r.elId }; } }
        if (best) { newH += best.o; targets.push(best.id); } }
      if (newW < MIN_SIZE) { newW = MIN_SIZE; if (rs.handle.includes('w')) newX = rs.startX + rs.startW - MIN_SIZE; }
      if (newH < MIN_SIZE) { newH = MIN_SIZE; if (rs.handle.includes('n')) newY = rs.startY + rs.startH - MIN_SIZE; }
      store.setSnapTargets(targets.length > 0 ? [...new Set(targets)] : []);
    }
    const clamped = clampToCanvas(newX, newY, newW, newH, canvasBounds);
    store.updateElement(rs.elementId, { x: clamped.x, y: clamped.y, width: newW, height: newH });
  }, []);

  const handleWindowPointerUp = useCallback((_e: PointerEvent) => {
    if (resizeRef.current) useEditorStore.getState().pushHistory();
    resizeRef.current = null; useEditorStore.getState().setSnapTargets([]);
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [handleWindowPointerMove]);

  useEffect(() => { return () => { window.removeEventListener('pointermove', handleWindowPointerMove); window.removeEventListener('pointerup', handleWindowPointerUp); }; }, [handleWindowPointerMove, handleWindowPointerUp]);

  const onResizeStart = useCallback((e: React.PointerEvent, elementId: string, handleIndex: number) => {
    e.stopPropagation(); e.preventDefault();
    const el = useEditorStore.getState().elements[elementId];
    if (!el || el.type === 'guideline' || el.type === 'line') return;
    resizeRef.current = { elementId, handle: HANDLE_MAP[handleIndex], startMouseX: e.clientX, startMouseY: e.clientY, startX: el.x, startY: el.y, startW: el.width, startH: el.height };
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp, { once: true });
  }, [handleWindowPointerMove, handleWindowPointerUp]);

  return { onResizeStart };
}
