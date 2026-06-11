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
      console.warn('[paste] IPC text:', t ? `"${t.slice(0, 50)}"` : '(empty)');
      if (t?.trim()) return t;
    } catch (e) { console.warn('[paste] IPC readText error:', e); }
  } else { console.warn('[paste] electronAPI.readClipboardText not available'); }
  return null;
}

async function readSystemClipboardImage(): Promise<string | null> {
  if (window.electronAPI?.readClipboardImage) {
    try {
      const d = await window.electronAPI.readClipboardImage();
      if (d) { console.warn('[paste] IPC image found'); return d; }
    } catch (e) { console.warn('[paste] IPC readImage error:', e); }
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

  // ---- Copy ----
  const handleCopy = useCallback(() => {
    const s = useEditorStore.getState();
    if (!s.selection.length) return;
    const els = s.selection.map((id) => s.elements[id]).filter(Boolean) as CanvasElement[];
    if (!els.length) return;
    setCopiedElements(els);
    console.warn('[copy] Copied', els.length, 'element(s)');
  }, []);

  // ---- Paste as new element ----
  const doPaste = useCallback(async (cx: number, cy: number) => {
    console.warn('[paste] doPaste client:', cx, cy);
    const el = innerRef.current;
    if (!el) { console.warn('[paste] SKIP: no canvasInner'); return; }

    const st = useEditorStore.getState();
    const rect = el.getBoundingClientRect();
    const { x, y } = clientToCanvas(cx, cy, rect, st.zoom);
    const pg = st.currentPage;
    console.warn('[paste] logical:', x, y, 'page:', pg);

    // 1) system text
    const txt = await readSystemClipboardText();
    if (txt) {
      const cb = getCanvasBounds();
      const cl = clampToCanvas(x - 150, y - 50, 300, 200, cb);
      const html = txt.split('\n').map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>');
      const te: TextElement = { ...createDefaultTextElement(cl.x, cl.y, pg), contentHTML: html };
      st.addElement(te); st.setSelection([te.id]);
      console.warn('[paste] text element created:', te.id);
      clearClipboard(); return;
    }
    // 2) system image
    const img = await readSystemClipboardImage();
    if (img) {
      const cb = getCanvasBounds();
      const cl = clampToCanvas(x - 100, y - 100, 200, 200, cb);
      const ie: ImageElement = { ...createDefaultImageElement(cl.x, cl.y, pg), src: img, width: 200, height: 200 };
      st.addElement(ie); st.setSelection([ie.id]);
      console.warn('[paste] image element created:', ie.id);
      clearClipboard(); return;
    }
    // 3) internal elements
    if (hasCopiedElements()) {
      console.warn('[paste] using internal clipboard');
      const copied = getCopiedElements();
      let mx = Infinity, my = Infinity;
      for (const el of copied) {
        if (el.type === 'line') { mx = Math.min(mx, el.x1, el.x2); my = Math.min(my, el.y1, el.y2); }
        else if (el.type === 'guideline') { if (el.orientation === 'horizontal') my = Math.min(my, el.position); else mx = Math.min(mx, el.position); }
        else if ('x' in el && 'y' in el) { mx = Math.min(mx, el.x); my = Math.min(my, el.y); }
      }
      const ox = x - mx, oy = y - my;
      const idMap = new Map<string, string>(); const nids: string[] = [];
      for (const el of copied) { const nid = newPastedId(); idMap.set(el.id, nid); nids.push(nid); }
      for (const el of copied) st.addElement(offsetElement(el, ox, oy, idMap.get(el.id)!, pg) as CanvasElement);
      st.setSelection(nids);
      clearClipboard(); return;
    }
    console.warn('[paste] Nothing to paste');
  }, []);

  // ---- Reg globals ----
  useEffect(() => {
    _globalCopy = handleCopy; _globalPaste = doPaste;
    return () => { _globalCopy = null; _globalPaste = null; };
  }, [handleCopy, doPaste]);

  // ================================================================
  // KEY DOWN: Cmd+C (copy elements) + Cmd+V (paste on canvas)
  // We need keydown for Cmd+V because the browser 'paste' event only
  // fires on editable elements, not on our canvas div.
  // ================================================================
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      // Cmd+C
      if (e.code === 'KeyC' && !e.shiftKey) {
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
        if (t.isContentEditable && window.getSelection() && !window.getSelection()!.isCollapsed) return;
        e.preventDefault();
        handleCopy();
        return;
      }

      // Cmd+V
      if (e.code === 'KeyV' && !e.shiftKey) {
        const t = e.target as HTMLElement;
        // native inputs → let browser handle
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;

        if (t.isContentEditable) {
          // Editing text → insert clipboard text at cursor
          console.warn('[keydown] Cmd+V in contentEditable');
          e.preventDefault();
          const txt = await readSystemClipboardText();
          if (txt) {
            const sel = window.getSelection();
            if (sel?.rangeCount) {
              const r = sel.getRangeAt(0);
              r.deleteContents();
              const tn = document.createTextNode(txt);
              r.insertNode(tn);
              r.setStartAfter(tn);
              r.collapse(true);
              sel.removeAllRanges();
              sel.addRange(r);
              // Sync to store
              const wrapper = r.commonAncestorContainer.parentElement?.closest('[data-testid^="element-"]') as HTMLElement | null;
              if (wrapper) {
                const id = (wrapper.dataset.testid || '').replace('element-', '');
                const ceEl = wrapper.querySelector('[contenteditable="true"]') as HTMLElement | null;
                if (ceEl && id) {
                  useEditorStore.getState().updateElement(id, { contentHTML: ceEl.innerHTML });
                  console.warn('[keydown] pasted into contentEditable, synced to store');
                }
              }
            }
          }
          return;
        }

        // canvas → paste as new element
        console.warn('[keydown] Cmd+V on canvas, target:', t.tagName);
        e.preventDefault();
        doPaste(_lastMouseClientX, _lastMouseClientY);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCopy, doPaste]);

  // ================================================================
  // PASTE EVENT: handles Cmd+V on editable elements (native browser)
  // Also catches paste when triggered other ways. On editable elements
  // we just let the browser handle it natively.
  // ================================================================
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      console.warn('[paste-event] target:', t.tagName, 'contentEditable:', t.isContentEditable);

      // Editable → browser handles natively
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.closest('[contenteditable="true"]')) {
        console.warn('[paste-event] → native');
        return;
      }

      // Non-editable → our custom paste
      console.warn('[paste-event] → custom');
      e.preventDefault();
      // Use paste event's clipboard data if available (synchronous, fast)
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
        const te: TextElement = { ...createDefaultTextElement(cl.x, cl.y, st.currentPage), contentHTML: html };
        st.addElement(te); st.setSelection([te.id]);
        console.warn('[paste-event] element created from event data:', te.id);
        clearClipboard();
        return;
      }
      // Fallback
      doPaste(_lastMouseClientX, _lastMouseClientY);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [doPaste]);

  // ---- Context menu ----
  // Must save selection range BEFORE menu appears, because clicking
  // a menu button will steal focus and change the selection.
  let _savedRange: Range | null = null;

  const showContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();

    const st = useEditorStore.getState();
    const t = e.target as HTMLElement;

    const wrapper = t.closest('[data-testid^="element-"]') as HTMLElement | null;
    if (wrapper) {
      const id = (wrapper.dataset.testid || '').replace('element-', '');
      if (id && !st.selection.includes(id)) st.setSelection([id]);
    }

    const isEditing = t.isContentEditable || !!t.closest('[contenteditable="true"]');
    console.warn('[ctxmenu] isEditing:', isEditing, 'hasSel:', st.selection.length > 0);

    // Save cursor range before menu steals focus
    _savedRange = null;
    if (isEditing) {
      const sel = window.getSelection();
      if (sel?.rangeCount) {
        _savedRange = sel.getRangeAt(0).cloneRange();
        console.warn('[ctxmenu] saved range for paste');
      }
    }

    const items: ContextMenuItem[] = [];

    if (st.selection.length > 0 || wrapper) {
      items.push({ label: 'Copy', shortcut: '⌘C', action: () => handleCopy() });
    }

    items.push({
      label: 'Paste', shortcut: '⌘V',
      action: async () => {
        if (isEditing) {
          // Paste at saved cursor position. Focus is preserved because
          // ContextMenu prevents mousedown (no blur, no React re-render).
          const txt = await readSystemClipboardText();
          if (!txt || !_savedRange) { _savedRange = null; return; }
          const r = _savedRange;
          _savedRange = null;
          const sel = window.getSelection();
          if (!sel) return;
          sel.removeAllRanges();
          sel.addRange(r);
          r.deleteContents();
          const tn = document.createTextNode(txt);
          r.insertNode(tn);
          r.setStartAfter(tn);
          r.collapse(true);
          sel.removeAllRanges();
          sel.addRange(r);
          console.warn('[ctxmenu] pasted into contentEditable');
        } else {
          await doPaste(e.clientX, e.clientY);
        }
      },
    });

    setCtx({ x: e.clientX, y: e.clientY, items });
  }, [handleCopy, doPaste]);

  return { contextMenu: ctx, closeContextMenu: closeCtx, registerCanvasInner: registerInner, showContextMenu, handleCopy, doPaste };
}
