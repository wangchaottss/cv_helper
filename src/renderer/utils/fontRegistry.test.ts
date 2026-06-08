import { describe, it, expect } from 'vitest';
import { isBuiltInFont, isGenericFont, isSystemFont, getDefaultFontFamily } from './fontRegistry';

describe('fontRegistry', () => {
  describe('isBuiltInFont', () => {
    it('returns true for built-in fonts', () => {
      expect(isBuiltInFont('Source Han Sans SC')).toBe(true);
      expect(isBuiltInFont('Source Han Serif SC')).toBe(true);
      expect(isBuiltInFont('Inter')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isBuiltInFont('source han sans sc')).toBe(true);
      expect(isBuiltInFont('INTER')).toBe(true);
    });

    it('returns false for non-built-in fonts', () => {
      expect(isBuiltInFont('Arial')).toBe(false);
      expect(isBuiltInFont('PingFang SC')).toBe(false);
    });
  });

  describe('isGenericFont', () => {
    it('returns true for generic font families', () => {
      expect(isGenericFont('serif')).toBe(true);
      expect(isGenericFont('sans-serif')).toBe(true);
      expect(isGenericFont('monospace')).toBe(true);
      expect(isGenericFont('cursive')).toBe(true);
      expect(isGenericFont('fantasy')).toBe(true);
      expect(isGenericFont('system-ui')).toBe(true);
    });

    it('returns false for specific font families', () => {
      expect(isGenericFont('Arial')).toBe(false);
      expect(isGenericFont('Inter')).toBe(false);
    });
  });

  describe('isSystemFont', () => {
    it('returns true for fonts that are neither built-in nor generic', () => {
      expect(isSystemFont('Arial')).toBe(true);
      expect(isSystemFont('PingFang SC')).toBe(true);
    });

    it('returns false for built-in fonts', () => {
      expect(isSystemFont('Inter')).toBe(false);
      expect(isSystemFont('Source Han Sans SC')).toBe(false);
    });

    it('returns false for generic fonts', () => {
      expect(isSystemFont('serif')).toBe(false);
      expect(isSystemFont('sans-serif')).toBe(false);
    });
  });

  describe('getDefaultFontFamily', () => {
    it('returns a built-in font', () => {
      const font = getDefaultFontFamily();
      expect(isBuiltInFont(font)).toBe(true);
    });
  });
});
