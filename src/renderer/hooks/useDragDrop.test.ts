import { describe, it, expect, beforeEach } from 'vitest';
import { generateId, createDefaultTextElement, createDefaultImageElement } from './useDragDrop';
import { useEditorStore } from '../store/editorStore';

describe('generateId', () => {
  it('generates unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('generates IDs with expected prefix', () => {
    const id = generateId();
    expect(id).toMatch(/^elem-/);
  });
});

describe('createDefaultTextElement', () => {
  it('creates a text element at given position', () => {
    const el = createDefaultTextElement(100, 200);
    expect(el.type).toBe('text');
    expect(el.x).toBe(100);
    expect(el.y).toBe(200);
    expect(el.width).toBe(300);
    expect(el.height).toBe(100);
    expect(el.contentHTML).toBe('New Text');
    expect(el.defaultFontFamily).toBeDefined();
    expect(el.defaultFontSize).toBe(16);
    expect(el.defaultColor).toBe('#000000');
  });
});

describe('createDefaultImageElement', () => {
  it('creates an image element at given position', () => {
    const el = createDefaultImageElement(50, 50);
    expect(el.type).toBe('image');
    expect(el.x).toBe(50);
    expect(el.y).toBe(50);
    expect(el.width).toBe(200);
    expect(el.height).toBe(200);
    expect(el.src).toBe('');
    expect(el.objectFit).toBe('contain');
  });
});

describe('useDragDrop store integration', () => {
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

  it('addElement adds to store', () => {
    const el = createDefaultTextElement(10, 20);
    useEditorStore.getState().addElement(el);
    expect(Object.keys(useEditorStore.getState().elements)).toHaveLength(1);
  });
});
