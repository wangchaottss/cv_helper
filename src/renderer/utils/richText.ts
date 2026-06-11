// ============================================================
// Lightweight text utilities for the Tiptap-powered editor.
// Formatting is now handled entirely by Tiptap commands.
// ============================================================

/**
 * Check if an HTML string contains mixed fonts (more than one font-family).
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
      if (family !== defaultFontFamily) fonts.add(family);
    }
  }
  return fonts.size > 0;
}

/**
 * Clean/sanitize HTML content.
 */
export function sanitizeHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const allSpans = doc.querySelectorAll('span');
  for (const span of allSpans) {
    if (!span.textContent?.trim()) span.remove();
  }
  return doc.body.innerHTML;
}
