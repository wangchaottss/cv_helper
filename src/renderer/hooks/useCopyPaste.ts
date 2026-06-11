import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clientToCanvas, clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { setClipboardText, setClipboardElements, getClipboard, hasClipboard, clearCache } from '../utils/clipboard';
import { createDefaultTextElement, createDefaultImageElement } from './useDragDrop';
import type { CanvasElement, TextElement, ImageElement } from '../types/elements';
import type { ContextMenuItem } from '../components/canvas/ContextMenu';

// ---- module globals ----
let _lastMouseClientX = 0;
let _lastMouseClientY = 0;
let _globalCopy: (() => void) | null = null;
let _globalPaste: ((clientX: number, clientY: number) => Promise<void>) | null = null;

export function triggerGlobalCopy() { _globalCopy?.(); }
export async function triggerGlobalPaste() {
  await _globalPaste?.(_lastMouseClientX || window.innerWidth / 2, _lastMouseClientY || window.innerHeight / 2);
}

// ---- helpers ----
function newPastedId() { return `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function getSelectedText(): string {
  const sel = window.getSelection();
  return sel && !sel.isCollapsed ? sel.toString() : '';
}

/** Insert plain text at cursor in contentEditable (if focused) */
function insertTextAtCursor(text: string): boolean {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;
  const r = sel.getRangeAt(0);
  r.deleteContents();
  const tn = document.createTextNode(text);
  r.insertNode(tn);
  r.setStartAfter(tn);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function offsetElement(el: CanvasElement, ox: number, oy: number, newId: string, page: number): any {
  const cb = getCanvasBounds();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = JSON.parse(JSON.stringify(el));
  c.id = newId; c.pageIndex = page;
  if (el.type === 'line') {
    c.x1 = Math.max(0, Math.min(cb.width, el.x1 + ox));
    c.y1 = Math.max(0, Math.min(cb.height, el.y1 + oy));
    c.x2 = Math.max(0, Math.min(cb.width, el.x2 + ox));
    c.y2 = Math.max(0, Math.min(cb.height, el.y2 + oy));
  } else if (el.type === 'guideline') {
    const p = el.position + (el.orientation === 'horizontal' ? oy : ox);
    c.position = Math.max(0, Math.min(el.orientation === 'horizontal' ? cb.height : cb.width, p));
  } else if ('x' in el && 'y' in el && 'width' in el && 'height' in el) {
    const cl = clampToCanvas(el.x + ox, el.y + oy, el.width, el.height, cb);
    c.x = cl.x; c.y = cl.y;
  }
  return c;
}

// ============================================================
export function useCopyPaste() {
  const [ctx, setCtx] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const innerRef = useRef<HTMLElement | null>(null);
  const registerInner = useCallback((el: HTMLElement | null) => { innerRef.current = el; }, []);
  const closeCtx = useCallback(() => setCtx(null), []);

  useEffect(() => {
    const h = (e: MouseEvent) => { _lastMouseClientX = e.clientX; _lastMouseClientY = e.clientY; };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  // ---- Unified Copy: elements > selected text ----
  const handleCopy = useCallback(() => {
    const s = useEditorStore.getState();
    // Elements selected → copy elements
    if (s.selection.length) {
      const els = s.selection.map((id) => s.elements[id]).filter(Boolean) as CanvasElement[];
      if (els.length) {
        setClipboardElements(els);
        // Also write text to system clipboard
        const parts: string[] = [];
        for (const el of els) {
          if (el.type === 'text') {
            const div = document.createElement('div');
            div.innerHTML = el.contentHTML;
            parts.push(div.textContent || '');
          }
        }
        if (parts.length) navigator.clipboard?.writeText(parts.join('\n')).catch(() => {});
        return;
      }
    }
    // No elements → check text selection
    const text = getSelectedText();
    if (text) {
      setClipboardText(text);
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  }, []);

  // ---- Unified Paste ----
  const doPaste = useCallback(async (cx: number, cy: number) => {
    const cache = getClipboard();
    if (!cache.type) return; // nothing to paste

    if (cache.type === 'text' && cache.text) {
      const inner = innerRef.current;
      // Try inline paste first (cursor in contentEditable)
      const active = document.activeElement as HTMLElement | null;
      const inEditable = active && (active.isContentEditable || active.closest('[contenteditable="true"]'));
      if (inEditable && insertTextAtCursor(cache.text)) {
        const wrapper = active?.closest('[data-testid^="element-"]') as HTMLElement | null;
        const ceEl = wrapper?.querySelector('[contenteditable="true"]') as HTMLElement | null;
        if (wrapper && ceEl) {
          const id = (wrapper.dataset.testid || '').replace('element-', '');
          useEditorStore.getState().updateElement(id, { contentHTML: ceEl.innerHTML });
        }
        return;
      }
      // Create new text element on canvas
      if (inner) {
        const st = useEditorStore.getState();
        const rect = inner.getBoundingClientRect();
        const { x, y } = clientToCanvas(cx, cy, rect, st.zoom);
        const cb = getCanvasBounds();
        const cl = clampToCanvas(x - 150, y - 50, 300, 200, cb);
        const html = cache.text.split('\n').map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>');
        st.addElement({ ...createDefaultTextElement(cl.x, cl.y, st.currentPage), contentHTML: html });
      }
      clearCache();
      return;
    }

    if (cache.type === 'elements' && cache.elements.length) {
      const inner = innerRef.current;
      if (!inner) return;
      const st = useEditorStore.getState();
      const rect = inner.getBoundingClientRect();
      const { x, y } = clientToCanvas(cx, cy, rect, st.zoom);

      let mx = Infinity, my = Infinity;
      for (const el of cache.elements) {
        if (el.type === 'line') { mx = Math.min(mx, el.x1, el.x2); my = Math.min(my, el.y1, el.y2); }
        else if (el.type === 'guideline') { if (el.orientation === 'horizontal') my = Math.min(my, el.position); else mx = Math.min(mx, el.position); }
        else if ('x' in el && 'y' in el) { mx = Math.min(mx, el.x); my = Math.min(my, el.y); }
      }
      const ox = x - mx, oy = y - my;
      const nids: string[] = [];
      for (const el of cache.elements) {
        const nid = newPastedId(); nids.push(nid);
        st.addElement(offsetElement(el, ox, oy, nid, st.currentPage) as CanvasElement);
      }
      st.setSelection(nids);
      clearCache();
    }
  }, []);

  // ---- Global refs for menu IPC ----
  useEffect(() => {
    _globalCopy = handleCopy; _globalPaste = doPaste;
    return () => { _globalCopy = null; _globalPaste = null; };
  }, [handleCopy, doPaste]);

  // ---- Keyboard: Cmd+C / Cmd+V ----
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.code === 'KeyC' && !e.shiftKey) {
        e.preventDefault();
        handleCopy();
        return;
      }

      if (e.code === 'KeyV' && !e.shiftKey) {
        e.preventDefault();
        await doPaste(_lastMouseClientX, _lastMouseClientY);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCopy, doPaste]);

  // ---- Context menu (canvas area only) ----
  const showContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();

    const st = useEditorStore.getState();
    const t = e.target as HTMLElement;
    const wrapper = t.closest('[data-testid^="element-"]') as HTMLElement | null;
    if (wrapper) {
      const id = (wrapper.dataset.testid || '').replace('element-', '');
      if (id && !st.selection.includes(id)) st.setSelection([id]);
    }

    const items: ContextMenuItem[] = [];
    items.push({ label: 'Copy', shortcut: '⌘C', action: () => handleCopy() });
    items.push({ label: 'Paste', shortcut: '⌘V', action: () => doPaste(e.clientX, e.clientY) });

    setCtx({ x: e.clientX, y: e.clientY, items });
  }, [handleCopy, doPaste]);

  return { contextMenu: ctx, closeContextMenu: closeCtx, registerCanvasInner: registerInner, showContextMenu, handleCopy, doPaste };
}
