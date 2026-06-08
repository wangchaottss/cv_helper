import { describe, it, expect } from 'vitest';
import { buildPrintHTML } from './printHtml';
import type { TextElement } from '../types/elements';

function makeTextEl(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 't1', type: 'text', x: 0, y: 0, width: 100, height: 50,
    rotation: 0, zIndex: 1, contentHTML: 'Hello',
    defaultFontFamily: 'Inter', defaultFontSize: 16, defaultColor: '#000',
    defaultFontWeight: 400, defaultFontStyle: 'normal',
    defaultTextAlign: 'left', defaultLineHeight: 1.5,
    defaultBackgroundColor: 'transparent', ...overrides,
  };
}

describe('buildPrintHTML', () => {
  it('produces valid HTML with @page rule', () => {
    const html = buildPrintHTML([makeTextEl()]);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('@page');
    expect(html).toContain('size: A4');
    expect(html).toContain('margin: 0');
  });

  it('includes print-color-adjust: exact', () => {
    const html = buildPrintHTML([makeTextEl()]);
    expect(html).toContain('-webkit-print-color-adjust: exact');
  });

  it('does not include metadata JSON (unlike serializeToHTML)', () => {
    const html = buildPrintHTML([makeTextEl()]);
    expect(html).not.toContain('cv-editor-data');
    expect(html).not.toContain('application/json');
  });

  it('includes font CSS when provided', () => {
    const fontCSS = '@font-face { font-family: "Inter"; src: url(data:) format("woff2"); }';
    const html = buildPrintHTML([makeTextEl()], fontCSS);
    expect(html).toContain('@font-face');
  });

  it('renders text element content', () => {
    const html = buildPrintHTML([makeTextEl({ contentHTML: 'Print Test' })]);
    expect(html).toContain('Print Test');
  });

  it('handles empty elements array', () => {
    const html = buildPrintHTML([]);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('cv-a4-canvas');
  });
});
