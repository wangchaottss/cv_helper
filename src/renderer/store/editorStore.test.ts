import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';
import type { TextElement, ImageElement } from '../types/elements';

function createTextElement(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    x: 100,
    y: 200,
    width: 300,
    height: 100,
    rotation: 0,
    zIndex: 1,
    contentHTML: 'Hello World',
    defaultFontFamily: 'Inter',
    defaultFontSize: 16,
    defaultColor: '#000000',
    defaultFontWeight: 400,
    defaultFontStyle: 'normal',
    defaultTextAlign: 'left',
    defaultLineHeight: 1.5,
    defaultBackgroundColor: 'transparent',
    ...overrides,
  };
}

function createImageElement(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: 'img-1',
    type: 'image',
    x: 50,
    y: 50,
    width: 200,
    height: 200,
    rotation: 0,
    zIndex: 2,
    src: '',
    objectFit: 'contain',
    ...overrides,
  };
}

describe('editorStore', () => {
  // Reset store between tests
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

  describe('addElement', () => {
    it('adds an element to the store', () => {
      const element = createTextElement();
      useEditorStore.getState().addElement(element);

      const state = useEditorStore.getState();
      expect(Object.keys(state.elements)).toHaveLength(1);
      expect(state.elements['text-1']).toEqual(element);
    });

    it('preserves existing elements when adding', () => {
      const e1 = createTextElement({ id: 'e1' });
      const e2 = createImageElement({ id: 'e2' });

      useEditorStore.getState().addElement(e1);
      useEditorStore.getState().addElement(e2);

      const state = useEditorStore.getState();
      expect(Object.keys(state.elements)).toHaveLength(2);
    });
  });

  describe('updateElement', () => {
    it('updates an existing element with partial data', () => {
      const element = createTextElement();
      useEditorStore.getState().addElement(element);
      useEditorStore.getState().updateElement('text-1', { x: 150, y: 250 });

      const state = useEditorStore.getState();
      expect(state.elements['text-1'].x).toBe(150);
      expect(state.elements['text-1'].y).toBe(250);
      // Other props unchanged
      expect(state.elements['text-1'].width).toBe(300);
    });

    it('does nothing for non-existent element', () => {
      useEditorStore.getState().updateElement('nonexistent', { x: 999 });
      const state = useEditorStore.getState();
      expect(state.elements['nonexistent']).toBeUndefined();
    });
  });

  describe('removeElements', () => {
    it('removes elements by ID array', () => {
      useEditorStore.getState().addElement(createTextElement({ id: 'e1' }));
      useEditorStore.getState().addElement(createTextElement({ id: 'e2' }));
      useEditorStore.getState().removeElements(['e1']);

      const state = useEditorStore.getState();
      expect(state.elements['e1']).toBeUndefined();
      expect(state.elements['e2']).toBeDefined();
    });

    it('clears selection for removed elements', () => {
      useEditorStore.getState().addElement(createTextElement({ id: 'e1' }));
      useEditorStore.getState().setSelection(['e1']);
      useEditorStore.getState().removeElements(['e1']);

      const state = useEditorStore.getState();
      expect(state.selection).toHaveLength(0);
    });
  });

  describe('selection', () => {
    it('sets selection by ID array', () => {
      useEditorStore.getState().setSelection(['id1', 'id2']);
      expect(useEditorStore.getState().selection).toEqual(['id1', 'id2']);
    });

    it('adds to selection', () => {
      useEditorStore.getState().setSelection(['id1']);
      useEditorStore.getState().addToSelection('id2');
      expect(useEditorStore.getState().selection).toEqual(['id1', 'id2']);
    });

    it('does not duplicate in addToSelection', () => {
      useEditorStore.getState().setSelection(['id1']);
      useEditorStore.getState().addToSelection('id1');
      expect(useEditorStore.getState().selection).toEqual(['id1']);
    });

    it('toggles selection — adds if not present', () => {
      useEditorStore.getState().setSelection(['id1']);
      useEditorStore.getState().toggleSelection('id2');
      expect(useEditorStore.getState().selection).toEqual(['id1', 'id2']);
    });

    it('toggles selection — removes if present', () => {
      useEditorStore.getState().setSelection(['id1', 'id2']);
      useEditorStore.getState().toggleSelection('id1');
      expect(useEditorStore.getState().selection).toEqual(['id2']);
    });
  });

  describe('zoom', () => {
    it('sets zoom within allowed range', () => {
      useEditorStore.getState().setZoom(2);
      expect(useEditorStore.getState().zoom).toBe(2);
    });

    it('clamps zoom to minimum 0.25', () => {
      useEditorStore.getState().setZoom(0.1);
      expect(useEditorStore.getState().zoom).toBe(0.25);
    });

    it('clamps zoom to maximum 3', () => {
      useEditorStore.getState().setZoom(5);
      expect(useEditorStore.getState().zoom).toBe(3);
    });
  });

  describe('guides', () => {
    it('toggles showGuides', () => {
      expect(useEditorStore.getState().showGuides).toBe(true);
      useEditorStore.getState().toggleGuides();
      expect(useEditorStore.getState().showGuides).toBe(false);
    });

    it('toggles snapEnabled', () => {
      expect(useEditorStore.getState().snapEnabled).toBe(true);
      useEditorStore.getState().toggleSnap();
      expect(useEditorStore.getState().snapEnabled).toBe(false);
    });

    it('sets and clears guide lines', () => {
      useEditorStore.getState().setGuideLines({ horizontal: [100], vertical: [200] });
      expect(useEditorStore.getState().guideLines.horizontal).toEqual([100]);
      expect(useEditorStore.getState().guideLines.vertical).toEqual([200]);

      useEditorStore.getState().clearGuides();
      expect(useEditorStore.getState().guideLines.horizontal).toHaveLength(0);
      expect(useEditorStore.getState().guideLines.vertical).toHaveLength(0);
    });
  });

  describe('undo/redo', () => {
    it('undo restores previous state', () => {
      const e1 = createTextElement({ id: 'e1', x: 100 });
      const e2 = createTextElement({ id: 'e2', x: 200 });

      useEditorStore.getState().addElement(e1);

      useEditorStore.getState().addElement(e2);
      const afterSecond = useEditorStore.getState().elements;
      expect(Object.keys(afterSecond)).toHaveLength(2);

      useEditorStore.getState().undo();
      const afterUndo = useEditorStore.getState().elements;
      expect(Object.keys(afterUndo)).toHaveLength(1);
      expect(afterUndo['e1']).toBeDefined();
    });

    it('redo restores undone state', () => {
      const e1 = createTextElement({ id: 'e1' });
      useEditorStore.getState().addElement(e1);
      const e2 = createTextElement({ id: 'e2' });
      useEditorStore.getState().addElement(e2);

      useEditorStore.getState().undo();
      expect(Object.keys(useEditorStore.getState().elements)).toHaveLength(1);

      useEditorStore.getState().redo();
      expect(Object.keys(useEditorStore.getState().elements)).toHaveLength(2);
    });

    it('undo does nothing when history is empty', () => {
      const initialState = { ...useEditorStore.getState() };
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().elements).toEqual(initialState.elements);
    });

    it('new action after undo clears future', () => {
      const e1 = createTextElement({ id: 'e1' });
      const e2 = createTextElement({ id: 'e2' });
      const e3 = createTextElement({ id: 'e3' });

      useEditorStore.getState().addElement(e1);
      useEditorStore.getState().addElement(e2);
      useEditorStore.getState().undo(); // back to just e1
      useEditorStore.getState().addElement(e3); // new branch

      // redo should do nothing (future was cleared)
      useEditorStore.getState().redo();
      const state = useEditorStore.getState();
      expect(Object.keys(state.elements)).toHaveLength(2);
      expect(state.elements['e3']).toBeDefined();
    });
  });
});
