import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clientToCanvas, clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { setCopiedElements, getCopiedElements, hasCopiedElements } from '../utils/clipboard';
import { createDefaultTextElement, createDefaultImageElement } from './useDragDrop';
import type { CanvasElement, TextElement, ImageElement } from '../types/elements';
import type { ContextMenuItem } from '../components/canvas/ContextMenu';

// Global references — allow the App menu to trigger copy/paste
// even when the hook is not directly accessible
let _globalCopy: (() => void) | null = null;
let _globalPaste: ((clientX: number, clientY: number) => Promise<void>) | null = null;

/** Called from App.tsx when menu-copy is received */
export function triggerGlobalCopy(): void {
  _globalCopy?.();
}

/** Called from App.tsx when menu-paste is received */
export async function triggerGlobalPaste(): Promise<void> {
  // Use last known mouse position or center of viewport
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2;
  await _globalPaste?.(x, y);
}

/**
 * Generate a unique ID for pasted elements.
 */
function newPastedId(): string {
  return `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Read text from the system clipboard.
 */
async function readSystemClipboardText(): Promise<string | null> {
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) return text;
    }
  } catch {
    // Permission denied or API unavailable
  }
  return null;
}

/**
 * Read an image from the system clipboard, returned as a data URL.
 */
async function readSystemClipboardImage(): Promise<string | null> {
  try {
    if (!navigator.clipboard?.read) return null;
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      }
    }
  } catch {
    // Permission denied or API unavailable
  }
  return null;
}

/**
 * Write text to the system clipboard (so pasting in other apps works).
 */
async function writeSystemClipboard(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch {
    // Silently fail
  }
}

/** Offset-and-clamp a single pasted element, returning the modified clone. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function offsetElement(el: CanvasElement, offsetX: number, offsetY: number, newId: string, pageIndex: number): any {
  const canvasBounds = getCanvasBounds();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cloned: any = JSON.parse(JSON.stringify(el));
  cloned.id = newId;
  cloned.pageIndex = pageIndex;

  if (el.type === 'line') {
    cloned.x1 = Math.max(0, Math.min(canvasBounds.width, el.x1 + offsetX));
    cloned.y1 = Math.max(0, Math.min(canvasBounds.height, el.y1 + offsetY));
    cloned.x2 = Math.max(0, Math.min(canvasBounds.width, el.x2 + offsetX));
    cloned.y2 = Math.max(0, Math.min(canvasBounds.height, el.y2 + offsetY));
  } else if (el.type === 'guideline') {
    const pos = el.position + (el.orientation === 'horizontal' ? offsetY : offsetX);
    cloned.position = Math.max(0, Math.min(
      el.orientation === 'horizontal' ? canvasBounds.height : canvasBounds.width,
      pos,
    ));
  } else if ('x' in el && 'y' in el && 'width' in el && 'height' in el) {
    const clamped = clampToCanvas(el.x + offsetX, el.y + offsetY, el.width, el.height, canvasBounds);
    cloned.x = clamped.x;
    cloned.y = clamped.y;
  }

  return cloned;
}

export function useCopyPaste() {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const lastMouseRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const canvasInnerRef = useRef<HTMLElement | null>(null);

  const registerCanvasInner = useCallback((el: HTMLElement | null) => {
    canvasInnerRef.current = el;
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Track global mouse position for paste placement via Cmd+V
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      lastMouseRef.current = { clientX: e.clientX, clientY: e.clientY };
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // ---------- Copy ----------
  const handleCopy = useCallback(() => {
    const state = useEditorStore.getState();
    const selectedIds = state.selection;
    if (selectedIds.length === 0) return;

    const elements = selectedIds
      .map((id) => state.elements[id])
      .filter(Boolean) as CanvasElement[];

    if (elements.length === 0) return;

    setCopiedElements(elements);

    // Also write text representation to system clipboard
    const textParts: string[] = [];
    for (const el of elements) {
      if (el.type === 'text') {
        const div = document.createElement('div');
        div.innerHTML = el.contentHTML;
        textParts.push(div.textContent || '');
      }
    }
    if (textParts.length > 0) {
      writeSystemClipboard(textParts.join('\n'));
    }
  }, []);

  // ---------- Paste ----------
  const doPaste = useCallback(
    async (clientX: number, clientY: number) => {
      const canvasInner = canvasInnerRef.current;
      if (!canvasInner) return;

      const store = useEditorStore.getState();
      const zoom = store.zoom;
      const rect = canvasInner.getBoundingClientRect();
      const { x, y } = clientToCanvas(clientX, clientY, rect, zoom);
      const pageIndex = store.currentPage;

      // 1. Internal clipboard elements take priority
      if (hasCopiedElements()) {
        const copied = getCopiedElements();

        // Compute anchor point: the top-left-most position among all copied elements
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

        const offsetX = x - minX;
        const offsetY = y - minY;

        // Generate new IDs upfront and map them
        const idMap = new Map<string, string>();
        const newIds: string[] = [];
        for (const el of copied) {
          const newId = newPastedId();
          idMap.set(el.id, newId);
          newIds.push(newId);
        }

        // Add each cloned element
        for (const el of copied) {
          const newId = idMap.get(el.id)!;
          const cloned = offsetElement(el, offsetX, offsetY, newId, pageIndex);
          store.addElement(cloned as CanvasElement);
        }

        store.setSelection(newIds);
        return;
      }

      // 2. Try system clipboard — text
      const sysText = await readSystemClipboardText();
      if (sysText) {
        const canvasBounds = getCanvasBounds();
        const clamped = clampToCanvas(x - 150, y - 50, 300, 200, canvasBounds);
        const escapedHTML = sysText
          .split('\n')
          .map((line) =>
            line
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;'),
          )
          .join('<br>');
        const textEl: TextElement = {
          ...createDefaultTextElement(clamped.x, clamped.y, pageIndex),
          contentHTML: escapedHTML,
        };
        store.addElement(textEl);
        store.setSelection([textEl.id]);
        return;
      }

      // 3. Try system clipboard — image
      const sysImage = await readSystemClipboardImage();
      if (sysImage) {
        const canvasBounds = getCanvasBounds();
        const clamped = clampToCanvas(x - 100, y - 100, 200, 200, canvasBounds);
        const imgEl: ImageElement = {
          ...createDefaultImageElement(clamped.x, clamped.y, pageIndex),
          src: sysImage,
          width: 200,
          height: 200,
        };
        store.addElement(imgEl);
        store.setSelection([imgEl.id]);
      }
    },
    [],
  );

  // Register global copy/paste handlers for the App menu (Edit > Copy / Paste)
  useEffect(() => {
    _globalCopy = handleCopy;
    _globalPaste = doPaste;
    return () => {
      _globalCopy = null;
      _globalPaste = null;
    };
  }, [handleCopy, doPaste]);

  // ---------- Keyboard handlers (Cmd+C / Cmd+V) ----------
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === 'c' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        // Let the browser handle copy for native inputs and contentEditable with selection
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (target.isContentEditable) {
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) return;
        }
        e.preventDefault();
        handleCopy();
        return;
      }

      if (isMeta && e.key === 'v' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        // Let the browser handle paste for native inputs and contentEditable
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        if (target.isContentEditable) return;
        e.preventDefault();
        const { clientX, clientY } = lastMouseRef.current;
        await doPaste(clientX, clientY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, doPaste]);

  // ---------- Context menu ----------
  const showContextMenu = useCallback(
    (e: React.MouseEvent, _canvasInnerEl: HTMLElement | null) => {
      e.preventDefault();
      e.stopPropagation();

      const store = useEditorStore.getState();
      const hasSelection = store.selection.length > 0;

      // If clicking on an unselected element, select it first
      const target = e.target as HTMLElement;
      const elementWrapper = target.closest('[data-testid^="element-"]') as HTMLElement | null;
      if (elementWrapper) {
        const raw = elementWrapper.dataset.testid || '';
        const elementId = raw.replace('element-', '');
        if (elementId && !store.selection.includes(elementId)) {
          store.setSelection([elementId]);
        }
      }

      const items: ContextMenuItem[] = [];

      if (hasSelection || elementWrapper) {
        items.push({
          label: 'Copy',
          shortcut: '⌘C',
          action: () => handleCopy(),
        });
      }

      items.push({
        label: 'Paste',
        shortcut: '⌘V',
        action: () => {
          doPaste(e.clientX, e.clientY);
        },
      });

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
