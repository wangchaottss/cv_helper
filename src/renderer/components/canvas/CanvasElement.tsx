import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { CanvasElement as CanvasElementType } from '../../types/elements';
import FormatToolbar from './FormatToolbar';

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
  const updateElement = useEditorStore((s) => s.updateElement);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Double click to enter edit mode on text elements
      if (element.type === 'text' && e.detail >= 2) {
        e.stopPropagation();
        if (!isEditing) {
          setIsEditing(true);
        }
        return; // Don't trigger drag on double-click
      }

      onPointerDown(e, element.id);
    },
    [element.id, element.type, isEditing, onPointerDown],
  );

  // Focus element when entering edit mode
  useEffect(() => {
    if (isEditing && elementRef.current) {
      // Small delay to let React commit the contentEditable attribute
      const timer = setTimeout(() => {
        elementRef.current?.focus();
        // Place cursor at the end
        const range = document.createRange();
        range.selectNodeContents(elementRef.current!);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  // Exit edit mode if element is no longer selected
  useEffect(() => {
    if (!isSelected && isEditing) {
      // Flush changes before exiting
      if (elementRef.current) {
        updateElement(element.id, { contentHTML: elementRef.current.innerHTML });
      }
      setIsEditing(false);
    }
  }, [isSelected, isEditing, element.id, updateElement]);

  // Sync contentHTML to store on input (debounced)
  const handleInput = useCallback(() => {
    if (!elementRef.current) return;
    const html = elementRef.current.innerHTML;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateElement(element.id, { contentHTML: html });
    }, 300);
  }, [element.id, updateElement]);

  // Flush on blur immediately
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (elementRef.current) {
      updateElement(element.id, { contentHTML: elementRef.current.innerHTML });
    }
  }, [element.id, updateElement]);

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
      <div style={{ position: 'relative' }}>
        {/* Format toolbar — shown when editing */}
        <FormatToolbar visible={isEditing} />
        <div
          ref={elementRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          style={textStyle}
          onPointerDown={handlePointerDown}
          onInput={handleInput}
          onBlur={handleBlur}
          dangerouslySetInnerHTML={{ __html: element.contentHTML }}
          data-testid={`element-${element.id}`}
        />
        {isSelected && !isEditing && renderControlPoints(element.width, element.height)}
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
