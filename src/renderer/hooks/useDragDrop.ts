import { useCallback, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { clientToCanvas, clampToCanvas, getCanvasBounds } from '../utils/coordinates';
import { getDefaultFontFamily } from '../utils/fontRegistry';
import type { TextElement, ImageElement } from '../types/elements';

let _elementIdCounter = 0;
export function generateId(): string {
  _elementIdCounter += 1;
  return `elem-${Date.now()}-${_elementIdCounter}`;
}

export function createDefaultTextElement(x: number, y: number): TextElement {
  return {
    id: generateId(),
    type: 'text',
    x,
    y,
    width: 300,
    height: 100,
    rotation: 0,
    zIndex: _elementIdCounter,
    contentHTML: 'New Text',
    defaultFontFamily: getDefaultFontFamily(),
    defaultFontSize: 16,
    defaultColor: '#000000',
    defaultFontWeight: 400,
    defaultFontStyle: 'normal',
    defaultTextAlign: 'left',
    defaultLineHeight: 1.5,
    defaultBackgroundColor: 'transparent',
  };
}

export function createDefaultImageElement(x: number, y: number): ImageElement {
  return {
    id: generateId(),
    type: 'image',
    x,
    y,
    width: 200,
    height: 200,
    rotation: 0,
    zIndex: _elementIdCounter,
    src: '',
    objectFit: 'contain',
  };
}

interface TemplateData {
  type: string;
  defaultWidth: number;
  defaultHeight: number;
}

export function useDragDrop() {
  const canvasInnerRef = useRef<HTMLDivElement | null>(null);
  const isDragOverRef = useRef(false);

  const addElement = useEditorStore((s) => s.addElement);
  const zoom = useEditorStore((s) => s.zoom);

  const setCanvasRef = useCallback((el: HTMLDivElement | null) => {
    canvasInnerRef.current = el;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    isDragOverRef.current = true;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    isDragOverRef.current = false;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      isDragOverRef.current = false;

      const jsonData = e.dataTransfer.getData('application/json');
      if (!jsonData) return;

      let templateData: TemplateData;
      try {
        templateData = JSON.parse(jsonData);
      } catch {
        return;
      }

      const canvasRect = canvasInnerRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const { x, y } = clientToCanvas(e.clientX, e.clientY, canvasRect, zoom);
      const posX = x - templateData.defaultWidth / 2;
      const posY = y - templateData.defaultHeight / 2;

      const canvasBounds = getCanvasBounds();
      const clamped = clampToCanvas(
        posX,
        posY,
        templateData.defaultWidth,
        templateData.defaultHeight,
        canvasBounds,
      );

      if (templateData.type === 'text') {
        addElement(createDefaultTextElement(clamped.x, clamped.y));
      } else if (templateData.type === 'image') {
        addElement(createDefaultImageElement(clamped.x, clamped.y));
      }
    },
    [zoom, addElement],
  );

  return { setCanvasRef, handleDragOver, handleDragLeave, handleDrop, isDragOverRef };
}
