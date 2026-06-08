import { describe, it, expect } from 'vitest';
import { serializeToHTML, deserializeFromHTML } from './serialization';
import type { TextElement, ImageElement, CanvasElement } from '../types/elements';

function makeTextEl(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1', type: 'text', x: 100, y: 200, width: 300, height: 100,
    rotation: 0, zIndex: 1, contentHTML: 'Hello World',
    defaultFontFamily: 'Inter', defaultFontSize: 16, defaultColor: '#000000',
    defaultFontWeight: 400, defaultFontStyle: 'normal',
    defaultTextAlign: 'left', defaultLineHeight: 1.5,
    defaultBackgroundColor: 'transparent', ...overrides,
  };
}

function makeImageEl(overrides: Partial<ImageElement> = {}): ImageElement {
  return {
    id: 'img-1', type: 'image', x: 50, y: 50, width: 200, height: 200,
    rotation: 0, zIndex: 1, src: 'data:image/png;base64,abc',
    objectFit: 'contain', ...overrides,
  };
}

describe('serializeToHTML', () => {
  it('produces valid HTML string', () => {
    const html = serializeToHTML([makeTextEl()], { version: '0.1.0', timestamp: 1000, zoom: 1 });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('cv-editor-data');
  });

  it('includes element data in metadata JSON', () => {
    const elements = [makeTextEl({ id: 'test-id', contentHTML: 'Test Content' })];
    const html = serializeToHTML(elements, { version: '0.1.0', timestamp: 1, zoom: 1 });
    expect(html).toContain('"contentHTML":"Test Content"');
  });

  it('includes font-face CSS when provided', () => {
    const fontCSS = '@font-face { font-family: "Inter"; src: url(data:) format("woff2"); }';
    const html = serializeToHTML([makeTextEl()], { version: '0.1.0', timestamp: 1, zoom: 1 }, fontCSS);
    expect(html).toContain('@font-face');
  });

  it('handles empty elements array', () => {
    const html = serializeToHTML([], { version: '0.1.0', timestamp: 1, zoom: 1 });
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('includes image src in output', () => {
    const elements = [makeImageEl({ src: 'data:image/png;base64,xyz' })];
    const html = serializeToHTML(elements, { version: '0.1.0', timestamp: 1, zoom: 1 });
    expect(html).toContain('data:image/png;base64,xyz');
  });
});

describe('deserializeFromHTML', () => {
  it('round-trips elements through serialize/deserialize', () => {
    const elements: CanvasElement[] = [
      makeTextEl({ id: 't1', x: 50, y: 100, contentHTML: 'Round trip test' }),
    ];
    const html = serializeToHTML(elements, { version: '0.1.0', timestamp: 1, zoom: 1 });
    const result = deserializeFromHTML(html);

    expect(result).not.toBeNull();
    expect(result!.elements).toHaveLength(1);
    expect(result!.elements[0].id).toBe('t1');
    expect((result!.elements[0] as TextElement).contentHTML).toBe('Round trip test');
  });

  it('returns null for invalid HTML', () => {
    const result = deserializeFromHTML('<html><body>Not a CV file</body></html>');
    expect(result).toBeNull();
  });

  it('restores element positions', () => {
    const elements = [makeTextEl({ id: 'pos-test', x: 300, y: 400 })];
    const html = serializeToHTML(elements, { version: '0.1.0', timestamp: 1, zoom: 1 });
    const result = deserializeFromHTML(html);
    expect(result!.elements[0].x).toBe(300);
    expect(result!.elements[0].y).toBe(400);
  });
});
