// ============================================================
// Font usage detection for archive and export
// ============================================================

import type { CanvasElement } from '../types/elements';
import { isBuiltInFont, isGenericFont } from './fontRegistry';

export type FontSource = 'built-in' | 'system' | 'generic';

export interface FontUsage {
  family: string;
  source: FontSource;
  weights: Set<number>;
}

/**
 * Detect all fonts used across text elements, classified by source.
 */
export function detectUsedFonts(elements: CanvasElement[]): FontUsage[] {
  const fontMap = new Map<string, FontUsage>();

  for (const el of elements) {
    if (el.type !== 'text') continue;

    // Check default font
    addFontUsage(fontMap, el.defaultFontFamily, el.defaultFontWeight);

    // Check inline spans in contentHTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(el.contentHTML, 'text/html');
    const spans = doc.querySelectorAll('span[style]');

    for (const span of spans) {
      const style = span.getAttribute('style') || '';
      // Extract font-family
      const familyMatch = style.match(/font-family:\s*([^;]+)/);
      const weightMatch = style.match(/font-weight:\s*(\d+)/);

      if (familyMatch) {
        const family = familyMatch[1].trim().replace(/['"]/g, '');
        const weight = weightMatch ? parseInt(weightMatch[1]) : 400;
        addFontUsage(fontMap, family, weight);
      }
    }
  }

  return Array.from(fontMap.values());
}

function addFontUsage(
  map: Map<string, FontUsage>,
  family: string,
  weight: number,
): void {
  const normalized = family.trim();
  if (!normalized) return;

  const source: FontSource = isGenericFont(normalized)
    ? 'generic'
    : isBuiltInFont(normalized)
      ? 'built-in'
      : 'system';

  const existing = map.get(normalized.toLowerCase());
  if (existing) {
    existing.weights.add(weight);
  } else {
    map.set(normalized.toLowerCase(), {
      family: normalized,
      source,
      weights: new Set([weight]),
    });
  }
}

/**
 * Generate @font-face CSS for embedding built-in fonts.
 * In a real implementation, this would read actual woff2 files.
 * For now it generates a placeholder that the main process fills in.
 */
export function generateFontEmbedCSS(
  usedFonts: FontUsage[],
  fontDataUrls: Record<string, string>, // family -> base64 dataURL
): string {
  const builtInFonts = usedFonts.filter((f) => f.source === 'built-in');
  if (builtInFonts.length === 0) return '';

  let css = '';

  for (const font of builtInFonts) {
    const url = fontDataUrls[font.family];
    if (!url) continue;

    for (const weight of font.weights) {
      css += `@font-face {
  font-family: '${font.family}';
  src: url(${url}) format('woff2');
  font-weight: ${weight};
  font-style: normal;
  font-display: swap;
}\n`;
    }
  }

  return css;
}

/**
 * Get system font families used in elements (for warning)
 */
export function getSystemFontsUsed(elements: CanvasElement[]): string[] {
  const usage = detectUsedFonts(elements);
  return usage.filter((f) => f.source === 'system').map((f) => f.family);
}
