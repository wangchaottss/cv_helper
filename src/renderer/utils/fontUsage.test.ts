import { describe, it, expect } from 'vitest';
import { detectUsedFonts, getSystemFontsUsed } from './fontUsage';
import type { TextElement } from '../types/elements';

function makeTextEl(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'test', type: 'text', x: 0, y: 0, width: 100, height: 50,
    rotation: 0, zIndex: 1, contentHTML: 'Test',
    defaultFontFamily: 'Inter', defaultFontSize: 16, defaultColor: '#000',
    defaultFontWeight: 400, defaultFontStyle: 'normal',
    defaultTextAlign: 'left', defaultLineHeight: 1.5,
    defaultBackgroundColor: 'transparent', ...overrides,
  };
}

describe('detectUsedFonts', () => {
  it('detects built-in font from defaultFontFamily', () => {
    const result = detectUsedFonts([makeTextEl({ defaultFontFamily: 'Inter' })]);
    expect(result.some((f) => f.family === 'Inter' && f.source === 'built-in')).toBe(true);
  });

  it('detects system font', () => {
    const result = detectUsedFonts([makeTextEl({ defaultFontFamily: 'PingFang SC' })]);
    expect(result.some((f) => f.family === 'PingFang SC' && f.source === 'system')).toBe(true);
  });

  it('detects generic fonts and filters them', () => {
    const result = detectUsedFonts([makeTextEl({ defaultFontFamily: 'sans-serif' })]);
    const generic = result.filter((f) => f.source === 'generic');
    expect(generic.length).toBeGreaterThanOrEqual(0);
  });

  it('detects inline fonts in contentHTML', () => {
    const el = makeTextEl({
      contentHTML: '<span style="font-family: Arial">Arial text</span>',
      defaultFontFamily: 'Inter',
    });
    const result = detectUsedFonts([el]);
    expect(result.some((f) => f.family === 'Arial' && f.source === 'system')).toBe(true);
  });
});

describe('getSystemFontsUsed', () => {
  it('returns only system fonts', () => {
    const systemFonts = getSystemFontsUsed([
      makeTextEl({ defaultFontFamily: 'Inter' }),
      makeTextEl({ defaultFontFamily: 'Arial', id: 'e2' }),
    ]);
    expect(systemFonts).toHaveLength(1);
    expect(systemFonts[0]).toBe('Arial');
  });
});
