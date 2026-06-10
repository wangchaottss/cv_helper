import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { BoxElement } from '../../types/elements';

interface Props {
  element: BoxElement;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent, elementId: string) => void;
  onResizeStart: (e: React.PointerEvent, elementId: string, handleIndex: number) => void;
}

const CONTROL_POINT_SIZE = 8;

function ControlPoint({ x, y, cursor, onPointerDown }: { x: number; y: number; cursor: string; onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div style={{
      position: 'absolute', left: x - CONTROL_POINT_SIZE / 2, top: y - CONTROL_POINT_SIZE / 2,
      width: CONTROL_POINT_SIZE, height: CONTROL_POINT_SIZE,
      backgroundColor: 'white', border: '1.5px solid #2563eb', cursor, zIndex: 10,
    }} onPointerDown={onPointerDown} />
  );
}

export default function BoxRenderer({ element, isSelected, onPointerDown, onResizeStart }: Props) {
  const borderWidth = element.borderStyle === 'none' ? 0 : element.borderWidth;
  const borderColor = element.borderColor;
  const borderDash = element.borderStyle === 'dashed' ? `${borderWidth * 3} ${borderWidth * 2}` : 'none';

  return (
    <div
      data-testid={`element-${element.id}`}
      style={{
        position: 'absolute',
        left: element.x, top: element.y,
        width: element.width, height: element.height,
        borderRadius: element.borderRadius,
        backgroundColor: element.fillColor,
        border: borderWidth > 0 ? `${borderWidth}px ${element.borderStyle === 'dashed' ? 'dashed' : 'solid'} ${borderColor}` : 'none',
        boxSizing: 'border-box',
        cursor: 'move',
        ...(isSelected ? { outline: '2px solid #2563eb', outlineOffset: '1px' } : {}),
      }}
      onPointerDown={(e) => onPointerDown(e, element.id)}
    >
      {/* Control points */}
      {isSelected && renderControlPoints(element.width, element.height, element.id, onResizeStart)}
    </div>
  );
}

function renderControlPoints(width: number, height: number, elementId: string, onResizeStart: Props['onResizeStart']) {
  const positions = [
    { x: 0, y: 0, cursor: 'nwse-resize' }, { x: width, y: 0, cursor: 'nesw-resize' },
    { x: 0, y: height, cursor: 'nesw-resize' }, { x: width, y: height, cursor: 'nwse-resize' },
    { x: width / 2, y: 0, cursor: 'ns-resize' }, { x: width, y: height / 2, cursor: 'ew-resize' },
    { x: width / 2, y: height, cursor: 'ns-resize' }, { x: 0, y: height / 2, cursor: 'ew-resize' },
  ];
  return positions.map((p, i) => (
    <ControlPoint key={i} {...p} onPointerDown={(e) => onResizeStart(e, elementId, i)} />
  ));
}
