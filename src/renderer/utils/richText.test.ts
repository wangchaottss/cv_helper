import { describe, it, expect } from 'vitest';
import { detectMixedFonts, sanitizeHTML } from './richText';

describe('detectMixedFonts', () => {
  it('returns false for plain text', () => {
    expect(detectMixedFonts('Hello World', 'Inter')).toBe(false);
  });

  it('returns false when all spans use default font', () => {
    const html = '<span style="font-family: Inter">Hello</span> <span>World</span>';
    expect(detectMixedFonts(html, 'Inter')).toBe(false);
  });

  it('returns true when spans use different fonts', () => {
    const html =
      '<span style="font-family: Inter">Hello</span> <span style="font-family: Arial">World</span>';
    expect(detectMixedFonts(html, 'Inter')).toBe(true);
  });

  it('handles quoted font families', () => {
    const html = '<span style="font-family: \'Source Han Sans SC\'">Hello</span>';
    expect(detectMixedFonts(html, 'Inter')).toBe(true);
  });
});

describe('sanitizeHTML', () => {
  it('removes empty spans', () => {
    const html = 'Text <span></span> more <span> </span> text';
    const result = sanitizeHTML(html);
    expect(result).not.toContain('<span></span>');
  });

  it('preserves text content', () => {
    const html = 'Hello World';
    expect(sanitizeHTML(html)).toContain('Hello World');
  });
});
