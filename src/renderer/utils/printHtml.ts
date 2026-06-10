import type { CanvasElement } from '../types/elements';

export function buildPrintHTML(elements: CanvasElement[], fontFaceCSS?: string): string {
  const a4Width = 794, a4Height = 1123;
  const html = elements.filter((el) => el.type !== 'guideline').map((el) => {
    if (el.type === 'line') {
      const dash = el.lineStyle === 'dashed' ? `${el.thickness*4},${el.thickness*2}` : el.lineStyle === 'dotted' ? `${el.thickness},${el.thickness*2}` : 'none';
      return `<svg style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible"><line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="${el.color}" stroke-width="${el.thickness}" stroke-dasharray="${dash}" stroke-linecap="round"/></svg>`;
    }
    if (el.type === 'box') {
      const bw = el.borderStyle === 'none' ? 0 : el.borderWidth;
      const s = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;border-radius:${el.borderRadius}px;background-color:${el.fillColor};${bw>0?`border:${bw}px ${el.borderStyle} ${el.borderColor};`:''}box-sizing:border-box;`;
      return `<div style="${s}"></div>`;
    }
    if (el.type === 'text') {
      const c = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${el.zIndex};box-sizing:border-box;`;
      const t = `font-family:${el.defaultFontFamily};font-size:${el.defaultFontSize}px;color:${el.defaultColor};font-weight:${el.defaultFontWeight};font-style:${el.defaultFontStyle};text-align:${el.defaultTextAlign};line-height:${el.defaultLineHeight};background-color:${el.defaultBackgroundColor};padding:4px;overflow:hidden;word-break:break-word;`;
      return `<div style="${c}${t}">${el.contentHTML}</div>`;
    }
    const c = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${el.zIndex};box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:hidden;`;
    return `<div style="${c}">${el.src?`<img src="${el.src}" style="width:100%;height:100%;object-fit:${el.objectFit};"/>`:''}</div>`;
  }).join('\n');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>
@page{size:A4;margin:0}*{margin:0;padding:0;box-sizing:border-box}body{margin:0;padding:0;background:white}
.cv-a4-canvas{position:relative;width:${a4Width}px;height:${a4Height}px;background:white;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${fontFaceCSS||''}</style></head><body><div class="cv-a4-canvas">${html}</div></body></html>`;
}
