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
  snapTargets: [],
  currentPage: 0,
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

  setSnapTargets: (ids: string[]) => {
    set({ snapTargets: ids });
  },

  setCurrentPage: (page: number) => {
    if (page >= 0) set({ currentPage: page, selection: [] });
  },

  addPage: () => {
    const state = get();
    const allElements = Object.values(state.elements);
    const maxPage = allElements.reduce((max, el) => Math.max(max, el.pageIndex), 0);
    set({ currentPage: maxPage + 1, selection: [] });
  },

  removePage: (pageIndex: number) => {
    const state = get();
    // Don't remove the last page
    const allElements = Object.values(state.elements);
    const maxPage = allElements.reduce((max, el) => Math.max(max, el.pageIndex), 0);
    if (maxPage === 0) return;

    // Remove elements on this page
    const idsToRemove = allElements
      .filter((el) => el.pageIndex === pageIndex)
      .map((el) => el.id);
    state.removeElements(idsToRemove);

    // Shift elements from later pages down
    for (const [id, el] of Object.entries(state.elements)) {
      if (el.pageIndex > pageIndex) {
        state.updateElement(id, { pageIndex: el.pageIndex - 1 });
      }
    }

    // Adjust current page
    const newMax = Math.max(0, maxPage - 1);
    const newCurrent = Math.min(state.currentPage, newMax);
    set({ currentPage: newCurrent, selection: [] });
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
