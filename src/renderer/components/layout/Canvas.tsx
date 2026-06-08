import React, { useCallback, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { clientToCanvas, clampToCanvas, getCanvasBounds } from '../../utils/coordinates';
import { getDefaultFontFamily } from '../../utils/fontRegistry';
import type { CanvasElement, TextElement, ImageElement } from '../../types/elements';

let _elementIdCounter = 0;
function generateId(): string {
  _elementIdCounter += 1;
  return `elem-${Date.now()}-${_elementIdCounter}`;
}

function createDefaultTextElement(x: number, y: number): TextElement {
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

function createDefaultImageElement(x: number, y: number): ImageElement {
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

export default function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const zoom = useEditorStore((s) => s.zoom);
  const elements = useEditorStore((s) => s.elements);
  const selection = useEditorStore((s) => s.selection);
  const addElement = useEditorStore((s) => s.addElement);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setZoom = useEditorStore((s) => s.setZoom);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const jsonData = e.dataTransfer.getData('application/json');
      if (!jsonData) return;

      let templateData: { type: string; defaultWidth: number; defaultHeight: number };
      try {
        templateData = JSON.parse(jsonData);
      } catch {
        return;
      }

      const canvasRect = canvasInnerRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const { x, y } = clientToCanvas(e.clientX, e.clientY, canvasRect, zoom);

      // Center the element at the drop point
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

  // Canvas click to deselect
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on canvas background
      if (e.target === canvasInnerRef.current || e.target === canvasRef.current) {
        setSelection([]);
      }
    },
    [setSelection],
  );

  // Zoom with mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(zoom + delta);
      }
    },
    [zoom, setZoom],
  );

  const elementList = Object.values(elements);

  return (
    <main
      ref={canvasRef}
      className="flex-1 bg-canvas-bg flex items-center justify-center overflow-auto p-8"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      data-testid="canvas-area"
    >
      <div
        className="flex items-center justify-center"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s ease-out',
        }}
      >
        <div
          ref={canvasInnerRef}
          className={`bg-white shadow-xl relative ${
            isDragOver ? 'ring-2 ring-blue-400 ring-offset-4' : ''
          }`}
          style={{
            width: `${getCanvasBounds().width}px`,
            height: `${getCanvasBounds().height}px`,
          }}
          data-testid="a4-canvas"
        >
          {/* Render elements */}
          {elementList.map((el) => (
            <CanvasElementView
              key={el.id}
              element={el}
              isSelected={selection.includes(el.id)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

// Simple inline element view for P0 (will be extracted to CanvasElement component in P1)
function CanvasElementView({
  element,
  isSelected,
}: {
  element: CanvasElement;
  isSelected: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    zIndex: element.zIndex,
    boxSizing: 'border-box',
  };

  if (isSelected) {
    baseStyle.outline = '2px solid #2563eb';
    baseStyle.outlineOffset = '0px';
  }

  if (element.type === 'text') {
    return (
      <div
        style={{
          ...baseStyle,
          fontFamily: element.defaultFontFamily,
          fontSize: `${element.defaultFontSize}px`,
          color: element.defaultColor,
          fontWeight: element.defaultFontWeight,
          fontStyle: element.defaultFontStyle,
          textAlign: element.defaultTextAlign,
          lineHeight: element.defaultLineHeight,
          backgroundColor: element.defaultBackgroundColor,
          padding: '4px',
          overflow: 'hidden',
          cursor: isSelected ? 'move' : 'pointer',
        }}
        data-testid={`element-${element.id}`}
      >
        {element.contentHTML}
      </div>
    );
  }

  // Image element
  return (
    <div
      style={{
        ...baseStyle,
        border: '2px dashed #d1d5db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        cursor: isSelected ? 'move' : 'pointer',
      }}
      data-testid={`element-${element.id}`}
    >
      {element.src ? (
        <img
          src={element.src}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: element.objectFit,
          }}
        />
      ) : (
        <span className="text-gray-400 text-sm">Image Placeholder</span>
      )}
    </div>
  );
}
