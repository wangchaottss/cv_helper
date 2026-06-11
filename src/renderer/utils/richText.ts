// ============================================================
// Rich text formatting utilities using Selection API + Range
// ============================================================

/**
 * Apply a CSS property to the current text selection by wrapping in a span.
 */
export function applyFormat(property: string, value: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return;

  // Save selection boundaries before DOM mutation
  const startContainer = range.startContainer;
  const startOffset = range.startOffset;
  const endContainer = range.endContainer;
  const endOffset = range.endOffset;

  // Unwrap existing spans with the same property before re-wrapping
  unwrapPropertyInRange(range, property);

  const span = document.createElement('span');
  span.style.setProperty(property, value);
  wrapRangeWithElement(range, span);

  // Restore selection inside the new span
  try {
    const newRange = document.createRange();
    // The content is now inside the <span>
    if (span.firstChild) {
      newRange.setStart(span.firstChild, 0);
      newRange.setEnd(span.lastChild!, (span.lastChild as Text).length || (span.lastChild?.textContent?.length || 0));
    } else {
      newRange.selectNodeContents(span);
    }
    selection.removeAllRanges();
    selection.addRange(newRange);
  } catch {
    // If restoration fails, at least collapse to the end of the span
    try {
      const fallback = document.createRange();
      fallback.selectNodeContents(span);
      fallback.collapse(false);
      selection.removeAllRanges();
      selection.addRange(fallback);
    } catch { /* give up */ }
  }
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

function unwrapPropertyInRange(range: Range, property: string): void {
  const container = range.commonAncestorContainer;
  const parent = container.nodeType === Node.ELEMENT_NODE
    ? (container as HTMLElement)
    : container.parentElement;

  if (!parent) return;

  // Walk up and find spans with the target property
  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ELEMENT,
  );

  const spansToUnwrap: HTMLSpanElement[] = [];
  let node: Node | null = walker.nextNode();
  while (node) {
    if (node.nodeName === 'SPAN' && range.intersectsNode(node)) {
      const el = node as HTMLSpanElement;
      if (el.style.getPropertyValue(property)) {
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
