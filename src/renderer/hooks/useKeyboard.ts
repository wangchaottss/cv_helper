import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clampToCanvas, getCanvasBounds } from '../utils/coordinates';

export function useKeyboard() {
  const selection = useEditorStore((s) => s.selection);
  const elements = useEditorStore((s) => s.elements);
  const updateElement = useEditorStore((s) => s.updateElement);
  const removeElements = useEditorStore((s) => s.removeElements);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if an input/textarea is focused
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Undo / Redo
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (isMeta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.length > 0) {
          e.preventDefault();
          removeElements(selection);
        }
        return;
      }

      // Arrow key movement
      if (selection.length === 0) return;

      const moveAmount = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowLeft':
          dx = -moveAmount;
          break;
        case 'ArrowRight':
          dx = moveAmount;
          break;
        case 'ArrowUp':
          dy = -moveAmount;
          break;
        case 'ArrowDown':
          dy = moveAmount;
          break;
        default:
          return;
      }

      e.preventDefault();
      const canvasBounds = getCanvasBounds();

      // Push history before batch move
      useEditorStore.getState().pushHistory();

      for (const id of selection) {
        const el = useEditorStore.getState().elements[id];
        if (!el) continue;

        const newX = el.x + dx;
        const newY = el.y + dy;
        const clamped = clampToCanvas(newX, newY, el.width, el.height, canvasBounds);
        updateElement(id, { x: clamped.x, y: clamped.y });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, elements, updateElement, removeElements, undo, redo]);
}
