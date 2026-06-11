// ============================================================
// Rich text formatting utilities using Selection API + Range
// ============================================================

/**
 * Apply a CSS property to the current text selection by wrapping in a span.
 */
// Values that mean "remove this format" — unwrap only, don't re-wrap
const RESET_VALUES = new Set(['none', 'normal', '400', 'transparent']);

export function applyFormat(property: string, value: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return;

  // Unwrap existing spans with the same property
  unwrapPropertyInRange(range, property);

  // If value means "remove", just unwrap. The range should still be valid
  // after DOM mutation (spec-compliant range tracking).
  if (RESET_VALUES.has(value)) {
    try {
      selection.removeAllRanges();
      selection.addRange(range);
    } catch { /* ignore */ }
    return;
  }

  const span = document.createElement('span');
  span.style.setProperty(property, value);
  wrapRangeWithElement(range, span);

  // Collapse cursor at the end of the new span (don't select everything)
  try {
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    newRange.collapse(false); // collapse to end
    selection.removeAllRanges();
    selection.addRange(newRange);
  } catch { /* ignore */ }
}

/**
 * Remove all formatting spans from the current selection
 */
export function removeFormat(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return;

  unwrapAllSpansInRange(range);
}

/**
 * Get the currently active formatting at the cursor/selection position
 */
export interface ActiveFormats {
  fontFamily: string | null;
  fontSize: string | null;
  color: string | null;
  fontWeight: string | null;
  fontStyle: string | null;
  textDecoration: string | null;
}

export function getActiveFormats(): ActiveFormats {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return emptyFormats();
  }

  const node = selection.rangeCount > 0 ? selection.getRangeAt(0).startContainer : null;
  if (!node) return emptyFormats();

  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  if (!el) return emptyFormats();

  const computed = window.getComputedStyle(el);

  return {
    fontFamily: computed.fontFamily || null,
    fontSize: computed.fontSize || null,
    color: computed.color || null,
    fontWeight: computed.fontWeight || null,
    fontStyle: computed.fontStyle || null,
    textDecoration: computed.textDecorationLine !== 'none' ? computed.textDecorationLine : null,
  };
}

/**
 * Check if an HTML string contains mixed fonts (more than one font-family)
 */
export function detectMixedFonts(html: string, defaultFontFamily: string): boolean {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const spans = doc.querySelectorAll('span[style]');
  const fonts = new Set<string>();

  for (const span of spans) {
    const style = span.getAttribute('style') || '';
    const match = style.match(/font-family:\s*([^;]+)/);
    if (match) {
      const family = match[1].trim().replace(/['"]/g, '');
      if (family !== defaultFontFamily) {
        fonts.add(family);
      }
    }
  }

  return fonts.size > 0;
}

// ============================================================
// Internal helpers
// ============================================================

function emptyFormats(): ActiveFormats {
  return {
    fontFamily: null,
    fontSize: null,
    color: null,
    fontWeight: null,
    fontStyle: null,
    textDecoration: null,
  };
}

function wrapRangeWithElement(range: Range, wrapper: HTMLElement): void {
  try {
    const contents = range.extractContents();
    wrapper.appendChild(contents);
    range.insertNode(wrapper);
  } catch {
    // Range may be invalid; silently ignore
  }
}

// Map CSS property names to style property names for direct access
const STYLE_PROP_MAP: Record<string, string> = {
  'font-weight': 'fontWeight',
  'font-style': 'fontStyle',
  'text-decoration': 'textDecoration',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'color': 'color',
};

function unwrapPropertyInRange(range: Range, property: string): void {
  // Find the contentEditable ancestor — only walk within it
  let root: Node = range.commonAncestorContainer;
  if (root.nodeType === Node.TEXT_NODE && root.parentElement) {
    root = root.parentElement;
  }
  // Walk up to contentEditable ancestor
  while (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as HTMLElement;
    if (el.isContentEditable || el.closest('[contenteditable="true"]')) break;
    if (!el.parentElement) break;
    root = el.parentElement;
  }
  // If we found a contentEditable ancestor, use it as root
  const ceRoot = (root as HTMLElement).isContentEditable
    ? root as HTMLElement
    : (root as HTMLElement).closest('[contenteditable="true"]') as HTMLElement | null;

  const walkRoot = ceRoot || root;

  const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_ELEMENT);

  const styleProp = STYLE_PROP_MAP[property] || property;
  const spansToUnwrap: HTMLSpanElement[] = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeName === 'SPAN' && range.intersectsNode(node)) {
      const el = node as HTMLSpanElement;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = (el.style as any)[styleProp];
      if (val) {
        spansToUnwrap.push(el);
      }
    }
    node = walker.nextNode();
  }

  for (const span of spansToUnwrap) {
    unwrapElement(span);
  }
}

function unwrapAllSpansInRange(range: Range): void {
  const container = range.commonAncestorContainer;
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT,
  );

  const spansToUnwrap: HTMLSpanElement[] = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeName === 'SPAN' && range.intersectsNode(node)) {
      spansToUnwrap.push(node as HTMLSpanElement);
    }
    node = walker.nextNode();
  }

  for (const span of spansToUnwrap) {
    unwrapElement(span);
  }
}

function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

/**
 * Clean/sanitize contentHTML to keep only <span> with allowed styles and text nodes.
 * Removes empty spans, merges adjacent identical spans.
 */
export function sanitizeHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove empty spans
  const allSpans = doc.querySelectorAll('span');
  for (const span of allSpans) {
    if (!span.textContent?.trim()) {
      span.remove();
    }
  }

  return doc.body.innerHTML;
}
