import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clientToCanvas, clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { setCopiedElements, getCopiedElements, hasCopiedElements, clearClipboard } from '../utils/clipboard';
import { createDefaultTextElement, createDefaultImageElement } from './useDragDrop';
import type { CanvasElement, TextElement, ImageElement } from '../types/elements';
import type { ContextMenuItem } from '../components/canvas/ContextMenu';

// Module-level globals
let _lastMouseClientX = 0;
let _lastMouseClientY = 0;

let _globalCopy: (() => void) | null = null;
let _globalPaste: ((clientX: number, clientY: number) => Promise<void>) | null = null;
let _globalPasteText: ((text: string, savedRange?: Range | null) => void) | null = null;

// Saved selection range (captured before context menu opens) to restore on paste
let _savedRange: Range | null = null;

export function triggerGlobalCopy(): void {
  _globalCopy?.();
}

export async function triggerGlobalPaste(): Promise<void> {
  const x = _lastMouseClientX || window.innerWidth / 2;
  const y = _lastMouseClientY || window.innerHeight / 2;
  await _globalPaste?.(x, y);
}

// Helpers
function newPastedId(): string {
  return `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readSystemClipboardText(): Promise<string | null> {
  if (window.electronAPI?.readClipboardText) {
    try {
      const text = await window.electronAPI.readClipboardText();
      console.warn('[paste] IPC clipboard text:', text ? `"${text.slice(0, 50)}"` : '(empty)');
      if (text && text.trim()) return text;
    } catch (err) {
      console.warn('[paste] IPC readText error:', err);
    }
  } else {
    console.warn('[paste] window.electronAPI?.readClipboardText NOT available');
  }
  return null;
}

async function readSystemClipboardImage(): Promise<string | null> {
  if (window.electronAPI?.readClipboardImage) {
    try {
      const dataUrl = await window.electronAPI.readClipboardImage();
      if (dataUrl) {
        console.warn('[paste] IPC image found');
        return dataUrl;
      }
    } catch (err) {
      console.warn('[paste] IPC readImage error:', err);
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function offsetElement(el: CanvasElement, ox: number, oy: number, newId: string, page: number): any {
  const cb = getCanvasBounds();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = JSON.parse(JSON.stringify(el));
  c.id = newId;
  c.pageIndex = page;
  if (el.type === 'line') {
    c.x1 = Math.max(0, Math.min(cb.width, el.x1 + ox));
    c.y1 = Math.max(0, Math.min(cb.height, el.y1 + oy));
    c.x2 = Math.max(0, Math.min(cb.width, el.x2 + ox));
    c.y2 = Math.max(0, Math.min(cb.height, el.y2 + oy));
  } else if (el.type === 'guideline') {
    const pos = el.position + (el.orientation === 'horizontal' ? oy : ox);
    c.position = Math.max(0, Math.min(el.orientation === 'horizontal' ? cb.height : cb.width, pos));
  } else if ('x' in el && 'y' in el && 'width' in el && 'height' in el) {
    const clamped = clampToCanvas(el.x + ox, el.y + oy, el.width, el.height, cb);
    c.x = clamped.x;
    c.y = clamped.y;
  }
  return c;
}

// ============================================================
export function useCopyPaste() {
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; items: ContextMenuItem[];
  } | null>(null);

  const canvasInnerRef = useRef<HTMLElement | null>(null);

  const registerCanvasInner = useCallback((el: HTMLElement | null) => {
    canvasInnerRef.current = el;
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      _lastMouseClientX = e.clientX;
      _lastMouseClientY = e.clientY;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // ---------- Copy ----------
  const handleCopy = useCallback(() => {
    const state = useEditorStore.getState();
    const ids = state.selection;
    if (ids.length === 0) return;
    const elements = ids.map((id) => state.elements[id]).filter(Boolean) as CanvasElement[];
    if (elements.length === 0) return;
    setCopiedElements(elements);
    console.warn('[copy] Copied', elements.length, 'element(s)');
  }, []);

  // ---------- Paste as new element ----------
  const doPaste = useCallback(
    async (clientX: number, clientY: number) => {
      console.warn('[paste] doPaste called, client:', clientX, clientY);

      const inner = canvasInnerRef.current;
      if (!inner) {
        console.warn('[paste] SKIP: canvasInner ref is null');
        return;
      }

      const store = useEditorStore.getState();
      const rect = inner.getBoundingClientRect();
      const { x, y } = clientToCanvas(clientX, clientY, rect, store.zoom);
      const page = store.currentPage;
      console.warn('[paste] logical coords:', x, y, 'page:', page);

      // 1) System clipboard text
      const sysText = await readSystemClipboardText();
      if (sysText) {
        console.warn('[paste] → creating text element');
        const cb = getCanvasBounds();
        const clamped = clampToCanvas(x - 150, y - 50, 300, 200, cb);
        const html = sysText
          .split('\n')
          .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
          .join('<br>');
        const el: TextElement = { ...createDefaultTextElement(clamped.x, clamped.y, page), contentHTML: html };
        store.addElement(el);
        store.setSelection([el.id]);
        console.warn('[paste] text element created:', el.id);
        clearClipboard();
        return;
      }

      // 2) System clipboard image
      const sysImg = await readSystemClipboardImage();
      if (sysImg) {
        console.warn('[paste] → creating image element');
        const cb = getCanvasBounds();
        const clamped = clampToCanvas(x - 100, y - 100, 200, 200, cb);
        const el: ImageElement = { ...createDefaultImageElement(clamped.x, clamped.y, page), src: sysImg, width: 200, height: 200 };
        store.addElement(el);
        store.setSelection([el.id]);
        console.warn('[paste] image element created:', el.id);
        clearClipboard();
        return;
      }

      // 3) Internal clipboard elements
      if (hasCopiedElements()) {
        console.warn('[paste] → pasting internal elements');
        const copied = getCopiedElements();
        let minX = Infinity, minY = Infinity;
        for (const el of copied) {
          if (el.type === 'line') { minX = Math.min(minX, el.x1, el.x2); minY = Math.min(minY, el.y1, el.y2); }
          else if (el.type === 'guideline') {
            if (el.orientation === 'horizontal') minY = Math.min(minY, el.position);
            else minX = Math.min(minX, el.position);
          } else if ('x' in el && 'y' in el) { minX = Math.min(minX, el.x); minY = Math.min(minY, el.y); }
        }
        const ox = x - minX, oy = y - minY;
        const idMap = new Map<string, string>();
        const newIds: string[] = [];
        for (const el of copied) { const nid = newPastedId(); idMap.set(el.id, nid); newIds.push(nid); }
        for (const el of copied) { store.addElement(offsetElement(el, ox, oy, idMap.get(el.id)!, page) as CanvasElement); }
        store.setSelection(newIds);
        clearClipboard();
        return;
      }

      console.warn('[paste] Nothing to paste (all clipboards empty)');
    },
    [],
  );

  // ---------- Paste text into contentEditable at saved cursor position ----------
  const pasteTextAtCursor = useCallback((text: string, savedRange?: Range | null) => {
    console.warn('[paste] pasteTextAtCursor, text length:', text.length, 'has savedRange:', !!savedRange);

    // Use saved range (captured before context menu opened), or current selection
    let range: Range | null = savedRange || null;
    if (!range) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        range = sel.getRangeAt(0);
      }
    }

    if (!range) {
      console.warn('[paste] No range/cursor position available');
      return;
    }

    // Focus the contentEditable element first
    const editableEl = range.commonAncestorContainer.parentElement?.closest('[contenteditable="true"]') as HTMLElement | null;
    if (editableEl) {
      editableEl.focus();
    }

    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);

    // Delete any selected content, then insert text
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move cursor after inserted text
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    console.warn('[paste] Text inserted at cursor, new cursor after text');
  }, []);

  // Register globals
  useEffect(() => {
    _globalCopy = handleCopy;
    _globalPaste = doPaste;
    _globalPasteText = pasteTextAtCursor;
    return () => { _globalCopy = null; _globalPaste = null; _globalPasteText = null; };
  }, [handleCopy, doPaste, pasteTextAtCursor]);

  // ---------- Keyboard: Cmd+C (copy elements) ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta || e.key !== 'c' || e.shiftKey) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (target.isContentEditable) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) return; // text selected → browser copy
      }
      e.preventDefault();
      handleCopy();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCopy]);

  // ---------- Document paste event (Cmd+V / right-click Paste) ----------
  // This is the most reliable way to intercept paste because:
  // 1. It fires regardless of menu accelerators
  // 2. We can check the target to decide browser-native vs custom
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      console.warn('[paste] Document paste event, target:', target.tagName,
        'contentEditable:', target.isContentEditable,
        'closest editable:', !!target.closest('[contenteditable="true"]'));

      // If the target is an editable element, let the browser handle it natively
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        console.warn('[paste] → native (input/textarea)');
        return;
      }
      if (target.isContentEditable || target.closest('[contenteditable="true"]')) {
        console.warn('[paste] → native (contentEditable)');
        return;
      }

      // Not editable → our custom paste as new element
      console.warn('[paste] → custom (create element)');
      e.preventDefault();
      e.stopPropagation();

      // Try to get text from the paste event first (sync, fast)
      const clipboardText = e.clipboardData?.getData('text/plain');
      if (clipboardText) {
        console.warn('[paste] Got text from paste event:', clipboardText.slice(0, 50));
        const inner = canvasInnerRef.current;
        if (inner) {
          const store = useEditorStore.getState();
          const rect = inner.getBoundingClientRect();
          const { x, y } = clientToCanvas(_lastMouseClientX, _lastMouseClientY, rect, store.zoom);
          const page = store.currentPage;
          const cb = getCanvasBounds();
          const clamped = clampToCanvas(x - 150, y - 50, 300, 200, cb);
          const html = clipboardText
            .split('\n')
            .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
            .join('<br>');
          const el: TextElement = { ...createDefaultTextElement(clamped.x, clamped.y, page), contentHTML: html };
          store.addElement(el);
          store.setSelection([el.id]);
          console.warn('[paste] Text element created from paste event:', el.id);
          clearClipboard();
          return;
        }
      }

      // Fallback to IPC clipboard read
      console.warn('[paste] No text in paste event, trying IPC...');
      await doPaste(_lastMouseClientX, _lastMouseClientY);
    };

    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [doPaste]);

  // ---------- Context menu ----------
  const showContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const store = useEditorStore.getState();
      const hasSel = store.selection.length > 0;
      const target = e.target as HTMLElement;

      const wrapper = target.closest('[data-testid^="element-"]') as HTMLElement | null;
      if (wrapper) {
        const id = (wrapper.dataset.testid || '').replace('element-', '');
        if (id && !store.selection.includes(id)) store.setSelection([id]);
      }

      // Save the current selection range BEFORE showing menu
      // (menu click will steal focus and change the selection)
      const isEditing = target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null;
      console.warn('[ctxmenu] isEditing:', isEditing);

      if (isEditing) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          _savedRange = sel.getRangeAt(0).cloneRange();
          console.warn('[ctxmenu] saved selection range');
        } else {
          _savedRange = null;
        }
      }

      const items: ContextMenuItem[] = [];

      if (hasSel || wrapper) {
        items.push({
          label: 'Copy', shortcut: '⌘C',
          action: () => handleCopy(),
        });
      }

      items.push({
        label: 'Paste', shortcut: '⌘V',
        action: async () => {
          console.warn('[ctxmenu] Paste action, isEditing:', isEditing, 'has savedRange:', !!_savedRange);
          if (isEditing) {
            // Paste text into contentEditable at saved cursor position
            const text = await readSystemClipboardText();
            if (text) {
              pasteTextAtCursor(text, _savedRange);
              _savedRange = null;
            }
          } else {
            // Paste as new element
            await doPaste(e.clientX, e.clientY);
          }
        },
      });

      setContextMenu({ x: e.clientX, y: e.clientY, items });
    },
    [handleCopy, doPaste, pasteTextAtCursor],
  );

  return {
    contextMenu,
    closeContextMenu,
    registerCanvasInner,
    showContextMenu,
    handleCopy,
    doPaste,
  };
}
