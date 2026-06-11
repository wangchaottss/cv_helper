import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clientToCanvas, clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { setCopiedElements, getCopiedElements, hasCopiedElements, clearClipboard } from '../utils/clipboard';
import { createDefaultTextElement, createDefaultImageElement } from './useDragDrop';
import type { CanvasElement, TextElement, ImageElement } from '../types/elements';
import type { ContextMenuItem } from '../components/canvas/ContextMenu';

// ============================================================
// Module-level globals — survive outside React lifecycle so
// menu IPC and keyboard handlers can always access them.
// ============================================================

let _lastMouseClientX = 0;
let _lastMouseClientY = 0;

let _globalCopy: (() => void) | null = null;
let _globalPaste: ((clientX: number, clientY: number) => Promise<void>) | null = null;

/** Called from App.tsx when menu-copy is received (via Electron menu Cmd+C) */
export function triggerGlobalCopy(): void {
  _globalCopy?.();
}

/** Called from App.tsx when menu-paste is received (via Electron menu Cmd+V) */
export async function triggerGlobalPaste(): Promise<void> {
  const x = _lastMouseClientX || window.innerWidth / 2;
  const y = _lastMouseClientY || window.innerHeight / 2;
  await _globalPaste?.(x, y);
}

// ============================================================
// Helpers
// ============================================================

function newPastedId(): string {
  return `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readSystemClipboardText(): Promise<string | null> {
  if (window.electronAPI?.readClipboardText) {
    try {
      const text = await window.electronAPI.readClipboardText();
      console.log('[useCopyPaste] IPC text:', text ? `"${text.slice(0, 50)}"` : '(empty)');
      if (text && text.trim()) return text;
    } catch (err) {
      console.error('[useCopyPaste] IPC readText error:', err);
    }
  }
  // Fallback
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      console.log('[useCopyPaste] nav text:', text ? `"${text.slice(0, 50)}"` : '(empty)');
      if (text && text.trim()) return text;
    }
  } catch (err) {
    console.error('[useCopyPaste] nav readText error:', err);
  }
  return null;
}

async function readSystemClipboardImage(): Promise<string | null> {
  if (window.electronAPI?.readClipboardImage) {
    try {
      const dataUrl = await window.electronAPI.readClipboardImage();
      if (dataUrl) {
        console.log('[useCopyPaste] IPC image OK');
        return dataUrl;
      }
    } catch (err) {
      console.error('[useCopyPaste] IPC readImage error:', err);
    }
  }
  return null;
}

async function writeSystemClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    // silently fail
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function offsetElement(el: CanvasElement, offsetX: number, offsetY: number, newId: string, pageIndex: number): any {
  const cb = getCanvasBounds();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = JSON.parse(JSON.stringify(el));
  c.id = newId;
  c.pageIndex = pageIndex;

  if (el.type === 'line') {
    c.x1 = Math.max(0, Math.min(cb.width, el.x1 + offsetX));
    c.y1 = Math.max(0, Math.min(cb.height, el.y1 + offsetY));
    c.x2 = Math.max(0, Math.min(cb.width, el.x2 + offsetX));
    c.y2 = Math.max(0, Math.min(cb.height, el.y2 + offsetY));
  } else if (el.type === 'guideline') {
    const pos = el.position + (el.orientation === 'horizontal' ? offsetY : offsetX);
    c.position = Math.max(0, Math.min(
      el.orientation === 'horizontal' ? cb.height : cb.width, pos));
  } else if ('x' in el && 'y' in el && 'width' in el && 'height' in el) {
    const clamped = clampToCanvas(el.x + offsetX, el.y + offsetY, el.width, el.height, cb);
    c.x = clamped.x;
    c.y = clamped.y;
  }
  return c;
}

// ============================================================
// Hook
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

  // Track mouse position globally (module level) so menu IPC can use it
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

    const elements = ids
      .map((id) => state.elements[id])
      .filter(Boolean) as CanvasElement[];
    if (elements.length === 0) return;

    setCopiedElements(elements);
    console.log('[useCopyPaste] Copied', elements.length, 'element(s)');

    // Write text to system clipboard
    const parts: string[] = [];
    for (const el of elements) {
      if (el.type === 'text') {
        const div = document.createElement('div');
        div.innerHTML = el.contentHTML;
        parts.push(div.textContent || '');
      }
    }
    if (parts.length > 0) writeSystemClipboard(parts.join('\n'));
  }, []);

  // ---------- Paste ----------
  const doPaste = useCallback(
    async (clientX: number, clientY: number) => {
      console.log('[useCopyPaste] doPaste at client', clientX, clientY);

      const inner = canvasInnerRef.current;
      if (!inner) {
        console.log('[useCopyPaste] SKIP: no canvasInner');
        return;
      }

      const store = useEditorStore.getState();
      const rect = inner.getBoundingClientRect();
      const { x, y } = clientToCanvas(clientX, clientY, rect, store.zoom);
      const page = store.currentPage;
      console.log('[useCopyPaste] logical', x, y, 'page', page);

      // 1) System clipboard text (external content always wins)
      const sysText = await readSystemClipboardText();
      if (sysText) {
        console.log('[useCopyPaste] → creating text element');
        const cb = getCanvasBounds();
        const clamped = clampToCanvas(x - 150, y - 50, 300, 200, cb);
        const html = sysText
          .split('\n')
          .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
          .join('<br>');
        const el: TextElement = {
          ...createDefaultTextElement(clamped.x, clamped.y, page),
          contentHTML: html,
        };
        store.addElement(el);
        store.setSelection([el.id]);
        console.log('[useCopyPaste] text element created:', el.id);
        clearClipboard();
        return;
      }

      // 2) System clipboard image
      const sysImg = await readSystemClipboardImage();
      if (sysImg) {
        console.log('[useCopyPaste] → creating image element');
        const cb = getCanvasBounds();
        const clamped = clampToCanvas(x - 100, y - 100, 200, 200, cb);
        const el: ImageElement = {
          ...createDefaultImageElement(clamped.x, clamped.y, page),
          src: sysImg,
          width: 200, height: 200,
        };
        store.addElement(el);
        store.setSelection([el.id]);
        console.log('[useCopyPaste] image element created:', el.id);
        clearClipboard();
        return;
      }

      // 3) Internal clipboard elements (fallback)
      if (hasCopiedElements()) {
        console.log('[useCopyPaste] → pasting internal elements');
        const copied = getCopiedElements();

        let minX = Infinity, minY = Infinity;
        for (const el of copied) {
          if (el.type === 'line') {
            minX = Math.min(minX, el.x1, el.x2);
            minY = Math.min(minY, el.y1, el.y2);
          } else if (el.type === 'guideline') {
            if (el.orientation === 'horizontal') minY = Math.min(minY, el.position);
            else minX = Math.min(minX, el.position);
          } else if ('x' in el && 'y' in el) {
            minX = Math.min(minX, el.x);
            minY = Math.min(minY, el.y);
          }
        }

        const ox = x - minX;
        const oy = y - minY;
        const idMap = new Map<string, string>();
        const newIds: string[] = [];
        for (const el of copied) {
          const nid = newPastedId();
          idMap.set(el.id, nid);
          newIds.push(nid);
        }
        for (const el of copied) {
          store.addElement(offsetElement(el, ox, oy, idMap.get(el.id)!, page) as CanvasElement);
        }
        store.setSelection(newIds);
        clearClipboard();
        return;
      }

      console.log('[useCopyPaste] Nothing to paste');
    },
    [],
  );

  // Register global handlers for menu IPC
  useEffect(() => {
    _globalCopy = handleCopy;
    _globalPaste = doPaste;
    return () => {
      _globalCopy = null;
      _globalPaste = null;
    };
  }, [handleCopy, doPaste]);

  // ---------- Keyboard shortcuts (Cmd+C / Cmd+V) ----------
  // Handled here (not via menu accelerator) so we can check contentEditable state.
  // If the user is editing text in a contentEditable, let the browser handle
  // copy/paste natively (pasting text into the element, not creating a new one).
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      const active = document.activeElement as HTMLElement | null;
      const inEditable =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable);

      // Cmd+C: copy selected elements (only when NOT in an editable field
      // with text selected — in that case browser handles text copy)
      if (e.key === 'c' && !e.shiftKey) {
        if (inEditable && active!.isContentEditable) {
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) return; // text selected → browser handles
        }
        if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        handleCopy();
        return;
      }

      // Cmd+V: paste from clipboard (only when NOT in editable field)
      if (e.key === 'v' && !e.shiftKey) {
        if (inEditable) return; // browser handles paste into input/textarea/contentEditable
        e.preventDefault();
        const cx = _lastMouseClientX;
        const cy = _lastMouseClientY;
        await doPaste(cx, cy);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCopy, doPaste]);

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
        if (id && !store.selection.includes(id)) {
          store.setSelection([id]);
        }
      }

      // Check if right-click is inside a contentEditable (editing text)
      const isEditing = target.isContentEditable ||
        target.closest('[contenteditable="true"]') !== null;

      const items: ContextMenuItem[] = [];

      if (hasSel || wrapper) {
        items.push({
          label: 'Copy', shortcut: '⌘C',
          action: () => handleCopy(),
        });
      }

      if (isEditing) {
        // Paste text into contentEditable at cursor position
        items.push({
          label: 'Paste', shortcut: '⌘V',
          action: async () => {
            const text = await readSystemClipboardText();
            if (text) {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(text));
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                // Fire input event so the store syncs up
                (sel.anchorNode?.parentElement || document.activeElement)?.dispatchEvent(
                  new Event('input', { bubbles: true }),
                );
              }
            }
          },
        });
      } else {
        // Paste as new element at mouse position
        items.push({
          label: 'Paste', shortcut: '⌘V',
          action: () => doPaste(e.clientX, e.clientY),
        });
      }

      setContextMenu({ x: e.clientX, y: e.clientY, items });
    },
    [handleCopy, doPaste],
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
