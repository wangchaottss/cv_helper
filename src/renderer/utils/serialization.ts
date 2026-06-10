import type { CanvasElement, TextElement, ImageElement, GuideLineElement } from '../types/elements';

const META_SCRIPT_ID = 'cv-editor-data';
const CANVAS_CLASS = 'cv-a4-canvas';
const ELEMENT_CLASS = 'cv-element';

interface ArchiveMeta {
  version: string;
  timestamp: number;
  zoom: number;
}

export function serializeToHTML(
  elements: CanvasElement[],
  meta: ArchiveMeta,
  fontFaceCSS?: string,
): string {
  const a4Width = 794;
  const a4Height = 1123;

  const elementsHTML = elements
    .map((el) => {
      if (el.type === 'guideline') {
        const glColor = el.color;
        if (el.orientation === 'horizontal') {
          return `<div class="${ELEMENT_CLASS}" data-id="${el.id}" data-type="guideline" data-orientation="horizontal" data-color="${glColor}" data-name="${el.name}" style="position:absolute;left:0;top:${el.position}px;width:100%;height:0;border-top:1.5px solid ${glColor};"><span style="position:absolute;left:4px;top:-14px;font-size:11px;font-weight:600;color:${glColor}">${el.name}</span></div>`;
        }
        return `<div class="${ELEMENT_CLASS}" data-id="${el.id}" data-type="guideline" data-orientation="vertical" data-color="${glColor}" data-name="${el.name}" style="position:absolute;top:0;left:${el.position}px;height:100%;width:0;border-left:1.5px solid ${glColor};"><span style="position:absolute;top:4px;left:6px;font-size:11px;font-weight:600;color:${glColor}">${el.name}</span></div>`;
      }
      if (el.type === 'text') {
        const common = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${el.zIndex};box-sizing:border-box;`;
        const textStyle = `font-family:${el.defaultFontFamily};font-size:${el.defaultFontSize}px;color:${el.defaultColor};font-weight:${el.defaultFontWeight};font-style:${el.defaultFontStyle};text-align:${el.defaultTextAlign};line-height:${el.defaultLineHeight};background-color:${el.defaultBackgroundColor};padding:4px;overflow:hidden;word-break:break-word;`;
        return `<div class="${ELEMENT_CLASS}" data-id="${el.id}" data-type="text" style="${common}${textStyle}">${el.contentHTML}</div>`;
      }
      const common = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${el.zIndex};box-sizing:border-box;`;
      const imgStyle = `display:flex;align-items:center;justify-content:center;overflow:hidden;`;
      const imgTag = el.src
        ? `<img src="${el.src}" style="width:100%;height:100%;object-fit:${el.objectFit};" alt="" />`
        : `<span style="color:#9ca3af;font-size:14px;">Image Placeholder</span>`;
      return `<div class="${ELEMENT_CLASS}" data-id="${el.id}" data-type="image" data-object-fit="${el.objectFit}" style="${common}${imgStyle}">${imgTag}</div>`;
    })
    .join('\n');

  const metaJSON = JSON.stringify({
    version: meta.version,
    timestamp: meta.timestamp,
    zoom: meta.zoom,
    elements: elements.map((el) => {
      if (el.type === 'guideline') {
        return { id: el.id, type: 'guideline', orientation: el.orientation, position: el.position, color: el.color, name: el.name, pageIndex: el.pageIndex };
      }
      const base = { id: el.id, type: el.type, x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation, zIndex: el.zIndex, pageIndex: el.pageIndex };
      if (el.type === 'text') {
        return { ...base, type: 'text', contentHTML: el.contentHTML, defaultFontFamily: el.defaultFontFamily, defaultFontSize: el.defaultFontSize, defaultColor: el.defaultColor, defaultFontWeight: el.defaultFontWeight, defaultFontStyle: el.defaultFontStyle, defaultTextAlign: el.defaultTextAlign, defaultLineHeight: el.defaultLineHeight, defaultBackgroundColor: el.defaultBackgroundColor };
      }
      return { ...base, type: 'image', src: el.src, objectFit: el.objectFit };
    }),
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CV Resume</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; justify-content: center; align-items: flex-start; padding: 20px; background: #e5e7eb; font-family: sans-serif; }
  .${CANVAS_CLASS} { position: relative; width: ${a4Width}px; height: ${a4Height}px; background: #ffffff; box-shadow: 0 4px 24px rgba(0,0,0,0.12); overflow: hidden; }
  .${ELEMENT_CLASS} { position: absolute; }
  @media print {
    body { padding: 0; background: white; }
    .${CANVAS_CLASS} { box-shadow: none; }
  }
${fontFaceCSS || ''}
</style>
</head>
<body>
<div class="${CANVAS_CLASS}">
${elementsHTML}
</div>
<script type="application/json" id="${META_SCRIPT_ID}">
${metaJSON}
</script>
</body>
</html>`;
}

export function deserializeFromHTML(
  htmlString: string,
): { elements: CanvasElement[]; meta: ArchiveMeta } | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const metaScript = doc.getElementById(META_SCRIPT_ID);
    if (!metaScript || !metaScript.textContent) {
      return parseFromDOM(doc);
    }

    const data = JSON.parse(metaScript.textContent);
    const meta: ArchiveMeta = {
      version: data.version || '0.1.0',
      timestamp: data.timestamp || Date.now(),
      zoom: data.zoom || 1,
    };

    if (data.elements && Array.isArray(data.elements)) {
      const elements: CanvasElement[] = data.elements.map((raw: Record<string, unknown>) => {
        if (raw.type === 'guideline') {
          return {
            id: raw.id as string,
            type: 'guideline',
            orientation: (raw.orientation as 'horizontal' | 'vertical') || 'horizontal',
            position: (raw.position as number) || 561,
            color: (raw.color as string) || '#3b82f6',
            name: (raw.name as string) || 'A?',
            pageIndex: (raw.pageIndex as number) ?? 0,
          } as GuideLineElement;
        }
        if (raw.type === 'text') {
          return {
            id: raw.id as string,
            type: 'text',
            x: raw.x as number, y: raw.y as number,
            width: raw.width as number, height: raw.height as number,
            rotation: (raw.rotation as number) || 0,
            zIndex: (raw.zIndex as number) || 1,
            pageIndex: (raw.pageIndex as number) ?? 0,
            contentHTML: (raw.contentHTML as string) || '',
            defaultFontFamily: (raw.defaultFontFamily as string) || 'Inter',
            defaultFontSize: (raw.defaultFontSize as number) || 16,
            defaultColor: (raw.defaultColor as string) || '#000000',
            defaultFontWeight: (raw.defaultFontWeight as number) || 400,
            defaultFontStyle: (raw.defaultFontStyle as 'normal' | 'italic') || 'normal',
            defaultTextAlign: (raw.defaultTextAlign as 'left' | 'center' | 'right') || 'left',
            defaultLineHeight: (raw.defaultLineHeight as number) || 1.5,
            defaultBackgroundColor: (raw.defaultBackgroundColor as string) || 'transparent',
          } as TextElement;
        }
        return {
          id: raw.id as string, type: 'image',
          x: raw.x as number, y: raw.y as number,
          width: raw.width as number, height: raw.height as number,
          rotation: (raw.rotation as number) || 0,
          zIndex: (raw.zIndex as number) || 1,
          pageIndex: (raw.pageIndex as number) ?? 0,
          src: (raw.src as string) || '',
          objectFit: ((raw.objectFit as string) || 'contain') as ImageElement['objectFit'],
        } as ImageElement;
      });
      return { elements, meta };
    }
    return parseFromDOM(doc);
  } catch (err) {
    console.error('Failed to deserialize HTML:', err);
    return null;
  }
}

function parseFromDOM(doc: Document): { elements: CanvasElement[]; meta: ArchiveMeta } | null {
  const elementDivs = doc.querySelectorAll(`.${ELEMENT_CLASS}`);
  if (elementDivs.length === 0) return null;

  const elements: CanvasElement[] = [];
  let idCounter = 0;

  for (const div of elementDivs) {
    const el = div as HTMLElement;
    const style = el.style;
    const dataId = el.dataset['id'] || `restored-${idCounter++}`;
    const dataType = el.dataset['type'] || 'text';

    if (dataType === 'guideline') {
      const orientation = (el.dataset['orientation'] as 'horizontal' | 'vertical') || 'horizontal';
      elements.push({
        id: dataId, type: 'guideline', orientation,
        position: orientation === 'horizontal' ? (parseFloat(style.top) || 0) : (parseFloat(style.left) || 0),
        color: el.dataset['color'] || '#3b82f6',
        name: el.dataset['name'] || 'A?',
        pageIndex: 0,
      } as GuideLineElement);
      continue;
    }

    const x = parseFloat(style.left) || 0;
    const y = parseFloat(style.top) || 0;
    const width = parseFloat(style.width) || 100;
    const height = parseFloat(style.height) || 50;

    if (dataType === 'text') {
      elements.push({
        id: dataId, type: 'text', x, y, width, height,
        rotation: 0, pageIndex: 0,
        zIndex: parseInt(style.zIndex) || 1,
        contentHTML: el.innerHTML || '',
        defaultFontFamily: style.fontFamily?.replace(/['"]/g, '') || 'Inter',
        defaultFontSize: parseFloat(style.fontSize) || 16,
        defaultColor: style.color || '#000000',
        defaultFontWeight: parseInt(style.fontWeight) || 400,
        defaultFontStyle: style.fontStyle === 'italic' ? 'italic' : 'normal',
        defaultTextAlign: (style.textAlign as 'left' | 'center' | 'right') || 'left',
        defaultLineHeight: parseFloat(style.lineHeight) || 1.5,
        defaultBackgroundColor: style.backgroundColor || 'transparent',
      } as TextElement);
    } else {
      const img = el.querySelector('img');
      elements.push({
        id: dataId, type: 'image', x, y, width, height,
        rotation: 0, pageIndex: 0,
        zIndex: parseInt(style.zIndex) || 1,
        src: img?.src || '',
        objectFit: (el.dataset['objectFit'] as ImageElement['objectFit']) || 'contain',
      } as ImageElement);
    }
  }
  return { elements, meta: { version: '0.1.0', timestamp: Date.now(), zoom: 1 } };
}
