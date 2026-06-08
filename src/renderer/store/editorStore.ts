// ============================================================
// Zustand store — central editor state management
// ============================================================

import { create } from 'zustand';
import type { CanvasElement, EditorState, GuideLinesData } from '../types/elements';

const MAX_HISTORY = 50;

type ElementSnapshot = Record<string, CanvasElement>;

// Internal state includes history stacks not exposed in the public interface
interface InternalState extends EditorState {
  _history: ElementSnapshot[];
  _future: ElementSnapshot[];
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const useEditorStore = create<InternalState>((set, get) => ({
  elements: {},
  selection: [],
  zoom: 1,
  showGuides: true,
  snapEnabled: true,
  guideLines: { horizontal: [], vertical: [] },
  _history: [],
  _future: [],

  addElement: (element: CanvasElement) => {
    get().pushHistory();
    set((state) => ({
      elements: { ...state.elements, [element.id]: element },
    }));
  },

  updateElement: (id: string, patch: Partial<CanvasElement>) => {
    set((state) => {
      const current = state.elements[id];
      if (!current) return state;
      return {
        elements: {
          ...state.elements,
          [id]: { ...current, ...patch } as CanvasElement,
        },
      };
    });
  },

  removeElements: (ids: string[]) => {
    get().pushHistory();
    set((state) => {
      const newElements = { ...state.elements };
      for (const id of ids) {
        delete newElements[id];
      }
      return {
        elements: newElements,
        selection: state.selection.filter((sid) => !ids.includes(sid)),
      };
    });
  },

  setSelection: (ids: string[]) => {
    set({ selection: ids });
  },

  addToSelection: (id: string) => {
    set((state) => {
      if (state.selection.includes(id)) return state;
      return { selection: [...state.selection, id] };
    });
  },

  toggleSelection: (id: string) => {
    set((state) => {
      if (state.selection.includes(id)) {
        return { selection: state.selection.filter((s) => s !== id) };
      }
      return { selection: [...state.selection, id] };
    });
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.max(0.25, Math.min(3, zoom)) });
  },

  toggleGuides: () => {
    set((state) => ({ showGuides: !state.showGuides }));
  },

  toggleSnap: () => {
    set((state) => ({ snapEnabled: !state.snapEnabled }));
  },

  setGuideLines: (lines: GuideLinesData) => {
    set({ guideLines: lines });
  },

  clearGuides: () => {
    set({ guideLines: { horizontal: [], vertical: [] } });
  },

  pushHistory: () => {
    set((state) => {
      const snapshot = deepClone(state.elements);
      const history = [...state._history, snapshot];
      if (history.length > MAX_HISTORY) {
        history.shift();
      }
      return { _history: history, _future: [] };
    });
  },

  undo: () => {
    const state = get();
    const { _history: history } = state;
    if (history.length === 0) return;

    const current = deepClone(state.elements);
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const future = [...state._future, current];

    set({
      elements: previous,
      _history: newHistory,
      _future: future,
      selection: [],
    });
  },

  redo: () => {
    const state = get();
    const { _future: future } = state;
    if (future.length === 0) return;

    const current = deepClone(state.elements);
    const next = future[future.length - 1];
    const newFuture = future.slice(0, -1);
    const history = [...state._history, current];

    set({
      elements: next,
      _history: history,
      _future: newFuture,
      selection: [],
    });
  },
}));
