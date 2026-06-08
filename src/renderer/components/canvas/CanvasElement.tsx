import React, { useCallback } from 'react';
import type { CanvasElement as CanvasElementType } from '../../types/elements';

interface CanvasElementProps {
  element: CanvasElementType;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent, elementId: string) => void;
}

const CONTROL_POINT_SIZE = 8;

function ControlPoint({
  x,
  y,
  cursor,
}: {
  x: number;
  y: number;
  cursor: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x - CONTROL_POINT_SIZE / 2}px`,
        top: `${y - CONTROL_POINT_SIZE / 2}px`,
        width: `${CONTROL_POINT_SIZE}px`,
        height: `${CONTROL_POINT_SIZE}px`,
        backgroundColor: 'white',
        border: '1.5px solid #2563eb',
        cursor,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function CanvasElement({ element, isSelected, onPointerDown }: CanvasElementProps) {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      onPointerDown(e, element.id);
    },
    [element.id, onPointerDown],
  );

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    zIndex: element.zIndex + (isSelected ? 1000 : 0),
    boxSizing: 'border-box',
    cursor: 'move',
    touchAction: 'none',
  };

  if (isSelected) {
    baseStyle.outline = '2px solid #2563eb';
    baseStyle.outlineOffset = '0px';
  }

  if (element.type === 'text') {
    const textStyle: React.CSSProperties = {
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
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
    };

    return (
      <div style={textStyle} onPointerDown={handlePointerDown} data-testid={`element-${element.id}`}>
        {element.contentHTML}
        {isSelected && renderControlPoints(element.width, element.height)}
      </div>
    );
  }

  // Image element
  const imageContainerStyle: React.CSSProperties = {
    ...baseStyle,
    border: element.src ? 'none' : '2px dashed #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: element.src ? 'transparent' : '#f9fafb',
    overflow: 'hidden',
  };

  return (
    <div
      style={imageContainerStyle}
      onPointerDown={handlePointerDown}
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
          draggable={false}
        />
      ) : (
        <span className="text-gray-400 text-sm">Image Placeholder</span>
      )}
      {isSelected && renderControlPoints(element.width, element.height)}
    </div>
  );
}

function renderControlPoints(width: number, height: number) {
  const positions = [
    // Corners
    { x: 0, y: 0, cursor: 'nwse-resize' },
    { x: width, y: 0, cursor: 'nesw-resize' },
    { x: 0, y: height, cursor: 'nesw-resize' },
    { x: width, y: height, cursor: 'nwse-resize' },
    // Midpoints
    { x: width / 2, y: 0, cursor: 'ns-resize' },
    { x: width, y: height / 2, cursor: 'ew-resize' },
    { x: width / 2, y: height, cursor: 'ns-resize' },
    { x: 0, y: height / 2, cursor: 'ew-resize' },
  ];

  return (
    <>
      {positions.map((p, i) => (
        <ControlPoint key={i} x={p.x} y={p.y} cursor={p.cursor} />
      ))}
    </>
  );
}
