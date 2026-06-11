// ============================================================
// Internal clipboard — stores copied canvas elements for
// in-app copy/paste. Separate from the system clipboard,
// which is used for importing external text/images.
// ============================================================

import type { CanvasElement } from '../types/elements';

let _clipboard: CanvasElement[] = [];

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Copy elements to the internal clipboard */
export function setCopiedElements(elements: CanvasElement[]): void {
  _clipboard = deepClone(elements);
}

/** Get (a clone of) the copied elements */
export function getCopiedElements(): CanvasElement[] {
  return deepClone(_clipboard);
}

/** Check if the internal clipboard has any elements */
export function hasCopiedElements(): boolean {
  return _clipboard.length > 0;
}

/** Clear the internal clipboard */
export function clearClipboard(): void {
  _clipboard = [];
}
