import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clientToCanvas, clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { setCopiedElements, getCopiedElements, hasCopiedElements, clearClipboard } from '../utils/clipboard';
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

async function readSystemClipboardText(): Promise<string | null> {
  if (window.electronAPI?.readClipboardText) {
    try {
      const t = await window.electronAPI.readClipboardText();
      if (t?.trim()) return t;
    } catch { /* ignore */ }
  }
  return null;
}

async function readSystemClipboardImage(): Promise<string | null> {
  if (window.electronAPI?.readClipboardImage) {
    try {
      const d = await window.electronAPI.readClipboardImage();
      if (d) return d;
    } catch { /* ignore */ }
  }
  return null;
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

/** Insert plain text at the current cursor position in a contentEditable. */
function insertTextAtCursor(text: string): void {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const r = sel.getRangeAt(0);
  r.deleteContents();
  const tn = document.createTextNode(text);
  r.insertNode(tn);
  r.setStartAfter(tn);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

// ============================================================
export function useCopyPaste() {
  const [ctx, setCtx] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const innerRef = useRef<HTMLElement | null>(null);
  const registerInner = useCallback((el: HTMLElement | null) => { innerRef.current = el; }, []);
  const closeCtx = useCallback(() => setCtx(null), []);

  // Track mouse for paste placement
  useEffect(() => {
    const h = (e: MouseEvent) => { _lastMouseClientX = e.clientX; _lastMouseClientY = e.clientY; };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  // ---- Copy elements ----
  const handleCopy = useCallback(() => {
    const s = useEditorStore.getState();
    if (!s.selection.length) return;
    const els = s.selection.map((id) => s.elements[id]).filter(Boolean) as CanvasElement[];
    if (!els.length) return;
    setCopiedElements(els);
  }, []);

  // ---- Paste as new element on canvas ----
  const doPaste = useCallback(async (cx: number, cy: number) => {
    const el = innerRef.current;
    if (!el) return;
    const st = useEditorStore.getState();
    const rect = el.getBoundingClientRect();
    const { x, y } = clientToCanvas(cx, cy, rect, st.zoom);
    const pg = st.currentPage;

    // 1) system text
    const txt = await readSystemClipboardText();
    if (txt) {
      const cb = getCanvasBounds();
      const cl = clampToCanvas(x - 150, y - 50, 300, 200, cb);
      const html = txt.split('\n').map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>');
      st.addElement({ ...createDefaultTextElement(cl.x, cl.y, pg), contentHTML: html });
      clearClipboard(); return;
    }
    // 2) system image
    const img = await readSystemClipboardImage();
    if (img) {
      const cb = getCanvasBounds();
      const cl = clampToCanvas(x - 100, y - 100, 200, 200, cb);
      st.addElement({ ...createDefaultImageElement(cl.x, cl.y, pg), src: img, width: 200, height: 200 });
      clearClipboard(); return;
    }
    // 3) internal elements
    if (hasCopiedElements()) {
      const copied = getCopiedElements();
      let mx = Infinity, my = Infinity;
      for (const el of copied) {
        if (el.type === 'line') { mx = Math.min(mx, el.x1, el.x2); my = Math.min(my, el.y1, el.y2); }
        else if (el.type === 'guideline') { if (el.orientation === 'horizontal') my = Math.min(my, el.position); else mx = Math.min(mx, el.position); }
        else if ('x' in el && 'y' in el) { mx = Math.min(mx, el.x); my = Math.min(my, el.y); }
      }
      const ox = x - mx, oy = y - my, nids: string[] = [];
      for (const el of copied) { const nid = newPastedId(); nids.push(nid); st.addElement(offsetElement(el, ox, oy, nid, pg) as CanvasElement); }
      st.setSelection(nids);
      clearClipboard();
    }
  }, []);

  // ---- Global refs for menu IPC ----
  useEffect(() => {
    _globalCopy = handleCopy; _globalPaste = doPaste;
    return () => { _globalCopy = null; _globalPaste = null; };
  }, [handleCopy, doPaste]);

  // ---- Keyboard: Cmd+C (copy elements) + Cmd+V ----
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      const active = document.activeElement as HTMLElement | null;
      const inEditable = !!(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable || active.closest('[contenteditable="true"]')));

      // Cmd+C
      if (e.code === 'KeyC' && !e.shiftKey) {
        if (inEditable) return; // browser handles copy natively
        e.preventDefault();
        handleCopy();
        return;
      }

      // Cmd+V
      if (e.code === 'KeyV' && !e.shiftKey) {
        if (inEditable) {
          e.preventDefault();
          const txt = await readSystemClipboardText();
          if (txt) {
            insertTextAtCursor(txt);
            const wrapper = active?.closest('[data-testid^="element-"]') as HTMLElement | null;
            const ceEl = wrapper?.querySelector('[contenteditable="true"]') as HTMLElement | null;
            if (wrapper && ceEl) {
              const id = (wrapper.dataset.testid || '').replace('element-', '');
              useEditorStore.getState().updateElement(id, { contentHTML: ceEl.innerHTML });
            }
          }
          return;
        }
        e.preventDefault();
        doPaste(_lastMouseClientX, _lastMouseClientY);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCopy, doPaste]);

  // ---- Document paste event (secondary path) ----
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;

      // ContentEditable → insert plain text (avoid bringing external
      // formatting like Helvetica 12px into the document)
      if (t.isContentEditable || t.closest('[contenteditable="true"]')) {
        e.preventDefault();
        const txt = e.clipboardData?.getData('text/plain');
        if (txt) {
          insertTextAtCursor(txt);
          const wrapper = (t.isContentEditable ? t : t.closest('[contenteditable="true"]'))?.closest('[data-testid^="element-"]') as HTMLElement | null;
          const ceEl = wrapper?.querySelector('[contenteditable="true"]') as HTMLElement | null;
          if (wrapper && ceEl) {
            const id = (wrapper.dataset.testid || '').replace('element-', '');
            useEditorStore.getState().updateElement(id, { contentHTML: ceEl.innerHTML });
          }
        }
        return;
      }

      // INPUT/TEXTAREA → let browser handle
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;

      // Non-editable → paste as new element
      e.preventDefault();
      const txt = e.clipboardData?.getData('text/plain');
      if (txt) {
        const inner = innerRef.current;
        if (!inner) return;
        const st = useEditorStore.getState();
        const rect = inner.getBoundingClientRect();
        const { x, y } = clientToCanvas(_lastMouseClientX, _lastMouseClientY, rect, st.zoom);
        const cb = getCanvasBounds();
        const cl = clampToCanvas(x - 150, y - 50, 300, 200, cb);
        const html = txt.split('\n').map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>');
        st.addElement({ ...createDefaultTextElement(cl.x, cl.y, st.currentPage), contentHTML: html });
        clearClipboard();
        return;
      }
      doPaste(_lastMouseClientX, _lastMouseClientY);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [doPaste]);

  // ---- Context menu (canvas area only — contentEditable uses native menu) ----
  const showContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();

    const st = useEditorStore.getState();
    const t = e.target as HTMLElement;

    // Select element under cursor if not already selected
    const wrapper = t.closest('[data-testid^="element-"]') as HTMLElement | null;
    if (wrapper) {
      const id = (wrapper.dataset.testid || '').replace('element-', '');
      if (id && !st.selection.includes(id)) st.setSelection([id]);
    }

    const items: ContextMenuItem[] = [];
    if (st.selection.length > 0 || wrapper) {
      items.push({ label: 'Copy', shortcut: '⌘C', action: () => handleCopy() });
    }
    items.push({
      label: 'Paste', shortcut: '⌘V',
      action: () => doPaste(e.clientX, e.clientY),
    });

    setCtx({ x: e.clientX, y: e.clientY, items });
  }, [handleCopy, doPaste]);

  return { contextMenu: ctx, closeContextMenu: closeCtx, registerCanvasInner: registerInner, showContextMenu, handleCopy, doPaste };
}
