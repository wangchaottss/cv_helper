// ============================================================
// Element type definitions for CV Helper
// Unified model merging plan.md and font_plan.md
// ============================================================

export interface BaseElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  contentHTML: string;
  defaultFontFamily: string;
  defaultFontSize: number;
  defaultColor: string;
  defaultFontWeight: number;
  defaultFontStyle: 'normal' | 'italic';
  defaultTextAlign: 'left' | 'center' | 'right';
  defaultLineHeight: number;
  defaultBackgroundColor: string;
}

export type ImageObjectFit = 'fill' | 'contain' | 'cover';

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  objectFit: ImageObjectFit;
}

export type CanvasElement = TextElement | ImageElement;

export interface SystemFont {
  family: string;
  style: string;
  weight: number;
  italic: boolean;
  postscriptName: string;
}

export interface GuideLinesData {
  horizontal: number[];
  vertical: number[];
}

export interface EditorState {
  elements: Record<string, CanvasElement>;
  selection: string[];
  zoom: number;
  showGuides: boolean;
  snapEnabled: boolean;
  guideLines: GuideLinesData;
  snapTargets: string[];

  // Actions
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeElements: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  setZoom: (zoom: number) => void;
  toggleGuides: () => void;
  toggleSnap: () => void;
  setGuideLines: (lines: GuideLinesData) => void;
  clearGuides: () => void;
  setSnapTargets: (ids: string[]) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}
