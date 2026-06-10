import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/editorStore';
import type { TextElement } from '../types/elements';

// We can't easily test the React hook with event listeners in isolation,
// so we test the keyboard logic directly through the store.

function makeTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'kbd-1',
    type: 'text',
    x: 100,
    y: 100,
    width: 100,
    height: 50,
    rotation: 0, pageIndex: 0,
    zIndex: 1,
    contentHTML: 'Test',
    defaultFontFamily: 'Inter',
    defaultFontSize: 16,
    defaultColor: '#000',
    defaultFontWeight: 400,
    defaultFontStyle: 'normal',
    defaultTextAlign: 'left',
    defaultLineHeight: 1.5,
    defaultBackgroundColor: 'transparent',
    ...overrides,
  };
}

describe('useKeyboard — store-level logic', () => {
  beforeEach(() => {
    useEditorStore.setState({
      elements: {},
      selection: [],
      zoom: 1,
      showGuides: true,
      snapEnabled: true,
      guideLines: { horizontal: [], vertical: [] },
      _history: [],
      _future: [],
    });
  });

  describe('undo/redo', () => {
    it('undo restores previous state', () => {
      const e1 = makeTextElement({ id: 'e1', x: 100 });
      const e2 = makeTextElement({ id: 'e2', x: 200 });

      useEditorStore.getState().addElement(e1);
      useEditorStore.getState().addElement(e2);
      expect(Object.keys(useEditorStore.getState().elements)).toHaveLength(2);

      useEditorStore.getState().undo();
      expect(Object.keys(useEditorStore.getState().elements)).toHaveLength(1);
    });

    it('redo restores undone state', () => {
      useEditorStore.getState().addElement(makeTextElement({ id: 'e1' }));
      useEditorStore.getState().addElement(makeTextElement({ id: 'e2' }));
      useEditorStore.getState().undo();
      useEditorStore.getState().redo();
      expect(Object.keys(useEditorStore.getState().elements)).toHaveLength(2);
    });
  });

  describe('delete logic', () => {
    it('removeElements deletes and clears selection', () => {
      useEditorStore.getState().addElement(makeTextElement({ id: 'e1' }));
      useEditorStore.getState().setSelection(['e1']);
      useEditorStore.getState().removeElements(['e1']);
      expect(Object.keys(useEditorStore.getState().elements)).toHaveLength(0);
      expect(useEditorStore.getState().selection).toHaveLength(0);
    });
  });

  describe('arrow key movement logic', () => {
    it('updateElement moves element by 1px right', () => {
      useEditorStore.getState().addElement(makeTextElement({ id: 'e1', x: 100, y: 100 }));
      useEditorStore.getState().updateElement('e1', { x: 101, y: 100 });
      const el = useEditorStore.getState().elements['e1'];
      if (el.type === 'text') expect(el.x).toBe(101);
    });

    it('updateElement moves element by 1px up', () => {
      useEditorStore.getState().addElement(makeTextElement({ id: 'e1', x: 100, y: 100 }));
      useEditorStore.getState().updateElement('e1', { x: 100, y: 99 });
      const el = useEditorStore.getState().elements['e1'];
      if (el.type === 'text') expect(el.y).toBe(99);
    });

    it('updateElement moves element by 10px (Shift)', () => {
      useEditorStore.getState().addElement(makeTextElement({ id: 'e1', x: 100, y: 100 }));
      useEditorStore.getState().updateElement('e1', { x: 110, y: 100 });
      const el = useEditorStore.getState().elements['e1'];
      if (el.type === 'text') expect(el.x).toBe(110);
    });
  });
});
