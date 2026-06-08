// ============================================================
// Font registry — built-in font management
// ============================================================

export interface BuiltInFontInfo {
  family: string;
  weights: { weight: number; fileName: string }[];
  category: 'sans-serif' | 'serif';
}

const BUILT_IN_FONTS: BuiltInFontInfo[] = [
  {
    family: 'Source Han Sans SC',
    weights: [
      { weight: 400, fileName: 'SourceHanSansSC-Regular.woff2' },
      { weight: 700, fileName: 'SourceHanSansSC-Bold.woff2' },
    ],
    category: 'sans-serif',
  },
  {
    family: 'Source Han Serif SC',
    weights: [
      { weight: 400, fileName: 'SourceHanSerifSC-Regular.woff2' },
      { weight: 700, fileName: 'SourceHanSerifSC-Bold.woff2' },
    ],
    category: 'serif',
  },
  {
    family: 'Inter',
    weights: [
      { weight: 400, fileName: 'Inter-Regular.woff2' },
      { weight: 700, fileName: 'Inter-Bold.woff2' },
    ],
    category: 'sans-serif',
  },
];

const GENERIC_FONTS = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui']);

const builtInFamilySet = new Set(BUILT_IN_FONTS.map((f) => f.family.toLowerCase()));

export function getBuiltInFonts(): BuiltInFontInfo[] {
  return BUILT_IN_FONTS;
}

export function isBuiltInFont(family: string): boolean {
  return builtInFamilySet.has(family.toLowerCase());
}

export function isGenericFont(family: string): boolean {
  return GENERIC_FONTS.has(family.toLowerCase());
}

export function isSystemFont(family: string): boolean {
  return !isBuiltInFont(family) && !isGenericFont(family);
}

/**
 * Register built-in fonts as @font-face CSS rules.
 * Called once on app startup.
 */
export function registerBuiltInFonts(): void {
  const style = document.createElement('style');
  style.id = 'built-in-fonts';
  let css = '';

  for (const font of BUILT_IN_FONTS) {
    for (const w of font.weights) {
      css += `
@font-face {
  font-family: '${font.family}';
  src: url('/src/assets/fonts/${w.fileName}') format('woff2');
  font-weight: ${w.weight};
  font-style: normal;
  font-display: swap;
}`;
    }
  }

  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Get the default font family for new text elements
 */
export function getDefaultFontFamily(): string {
  return 'Source Han Sans SC';
}
