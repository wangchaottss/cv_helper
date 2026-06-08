// ============================================================
// Print HTML builder for PDF export
// ============================================================

import type { CanvasElement } from '../types/elements';

/**
 * Build a clean HTML document for printing/PDF export.
 * No UI chrome, no guidelines, no metadata — only canvas content.
 */
export function buildPrintHTML(
  elements: CanvasElement[],
  fontFaceCSS?: string,
): string {
  const a4Width = 794;
  const a4Height = 1123;

  const elementsHTML = elements
    .map((el) => {
      const common = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${el.zIndex};box-sizing:border-box;`;

      if (el.type === 'text') {
        const style = `font-family:${el.defaultFontFamily};font-size:${el.defaultFontSize}px;color:${el.defaultColor};font-weight:${el.defaultFontWeight};font-style:${el.defaultFontStyle};text-align:${el.defaultTextAlign};line-height:${el.defaultLineHeight};background-color:${el.defaultBackgroundColor};padding:4px;overflow:hidden;word-break:break-word;`;
        return `<div style="${common}${style}">${el.contentHTML}</div>`;
      }
      return `<div style="${common}display:flex;align-items:center;justify-content:center;overflow:hidden;">${el.src ? `<img src="${el.src}" style="width:100%;height:100%;object-fit:${el.objectFit};" />` : ''}</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; background: white; }
  .cv-a4-canvas {
    position: relative;
    width: ${a4Width}px;
    height: ${a4Height}px;
    background: white;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
${fontFaceCSS || ''}
</style>
</head>
<body>
<div class="cv-a4-canvas">
${elementsHTML}
</div>
</body>
</html>`;
}
