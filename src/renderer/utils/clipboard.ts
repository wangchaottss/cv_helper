// Unified internal clipboard — stores either text or elements.
// Both Cmd+C (text/elements) and menu Copy feed into the same cache.
// Paste reads from cache and handles accordingly.

import type { CanvasElement } from '../types/elements';

export interface ClipBoardCache {
  type: 'text' | 'elements' | null;
  text: string;
  elements: CanvasElement[];
}

let _cache: ClipBoardCache = { type: null, text: '', elements: [] };

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function setClipboardText(text: string): void {
  _cache = { type: 'text', text, elements: [] };
}

export function setClipboardElements(elements: CanvasElement[]): void {
  _cache = { type: 'elements', text: '', elements: deepClone(elements) };
}

export function getClipboard(): ClipBoardCache {
  return deepClone(_cache);
}

export function hasClipboard(): boolean {
  return _cache.type !== null;
}

export function clearCache(): void {
  _cache = { type: null, text: '', elements: [] };
}
