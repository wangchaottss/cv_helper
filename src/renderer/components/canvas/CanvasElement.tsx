import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { CanvasElement as CanvasElementType } from '../../types/elements';
import FormatToolbar from './FormatToolbar';

interface CanvasElementProps {
  element: CanvasElementType;
  isSelected: boolean;
  onPointerDown: (e: React.PointerEvent, elementId: string) => void;
  onResizeStart: (e: React.PointerEvent, elementId: string, handleIndex: number) => void;
}

const CONTROL_POINT_SIZE = 8;

function ControlPoint({
  x, y, cursor, onPointerDown,
}: {
  x: number; y: number; cursor: string;
  onPointerDown: (e: React.PointerEvent) => void;
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
      }}
      onPointerDown={onPointerDown}
    />
  );
}

export default function CanvasElement({ element, isSelected, onPointerDown, onResizeStart }: CanvasElementProps) {
  const updateElement = useEditorStore((s) => s.updateElement);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composingRef = useRef(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // PointerDown: select + start drag
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      onPointerDown(e, element.id);
    },
    [element.id, onPointerDown],
  );

  // Save content before React clears it when entering edit mode
  const savedContentRef = useRef('');

  // Double-click: edit text or import image
  const handleDoubleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (element.type === 'text') {
        savedContentRef.current = elementRef.current?.innerHTML || element.contentHTML;
        setIsEditing(true);
      } else if (element.type === 'image' && window.electronAPI) {
        // Double-click image → import
        const filePath = await window.electronAPI.showOpenDialog({
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
        });
        if (filePath) {
          const dataUrl = await window.electronAPI.readImage(filePath);
          if (dataUrl) {
            useEditorStore.getState().updateElement(element.id, { src: dataUrl });
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [element.type, element.id],
  );

  // When entering edit mode, React clears the DOM (removes dangerouslySetInnerHTML).
  // Restore content immediately after, before the browser paints.
  useLayoutEffect(() => {
    if (isEditing && elementRef.current) {
      if (elementRef.current.innerHTML === '' || elementRef.current.innerHTML !== savedContentRef.current) {
        elementRef.current.innerHTML = savedContentRef.current;
      }
      elementRef.current.focus();
    }
  }, [isEditing]);

  // Focus element when entering edit mode
  useEffect(() => {
    if (isEditing && elementRef.current) {
      const timer = setTimeout(() => {
        elementRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  // Exit edit mode if element is no longer selected
  useEffect(() => {
    if (!isSelected && isEditing) {
      if (elementRef.current) {
        updateElement(element.id, { contentHTML: elementRef.current.innerHTML });
      }
      setIsEditing(false);
    }
  }, [isSelected, isEditing, element.id, updateElement]);

  // IME composition handling — skip syncing during composition
  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    composingRef.current = false;
    // Immediately sync after composition ends
    if (elementRef.current) {
      updateElement(element.id, { contentHTML: elementRef.current.innerHTML });
    }
  }, [element.id, updateElement]);

  // Sync contentHTML to store on input (debounced, skips during IME composition)
  const handleInput = useCallback(() => {
    if (!elementRef.current || composingRef.current) return;
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
    zIndex: element.zIndex,
    boxSizing: 'border-box',
    cursor: isEditing ? 'text' : 'move',
    touchAction: 'none',
  };

  const snapTargets = useEditorStore((s) => s.snapTargets);
  const isSnapTarget = snapTargets.includes(element.id);

  if (isSelected && !isEditing) {
    baseStyle.outline = '2px solid #2563eb';
    baseStyle.outlineOffset = '0px';
  } else if (isSnapTarget && !isSelected) {
    baseStyle.outline = '2px dashed #22c55e';
    baseStyle.outlineOffset = '2px';
  }

  if (element.type === 'text') {
    const textInnerStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
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
      outline: 'none',
    };

    return (
      <div
        style={{
          ...baseStyle,
          // Override cursor for the wrapper — inner div handles text cursor when editing
          cursor: isEditing ? 'default' : 'move',
        }}
        data-testid={`element-${element.id}`}
      >
        {/* Format toolbar — outside contentEditable, positioned above */}
        <FormatToolbar visible={isEditing} />

        {/* Editable text area */}
        <div
          ref={elementRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          style={{
            ...textInnerStyle,
            cursor: isEditing ? 'text' : 'move',
          }}
          onPointerDown={handlePointerDown}
          onDoubleClick={handleDoubleClick}
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onBlur={handleBlur}
          // Only set innerHTML from store when NOT editing —
          // during editing the browser manages contentEditable content,
          // and store-triggered re-renders would reset cursor position
          {...(isEditing ? {} : { dangerouslySetInnerHTML: { __html: element.contentHTML } })}
        />

        {/* Control points — shown when selected but not editing */}
        {isSelected && !isEditing && renderControlPoints(element.width, element.height, element.id, onResizeStart)}
      </div>
    );
  }

  // Image element
  return (
    <div
      style={{
        ...baseStyle,
        border: element.src ? 'none' : '2px dashed #d1d5db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: element.src ? 'transparent' : '#f9fafb',
        overflow: 'hidden',
      }}
      onPointerDown={handlePointerDown}
      data-testid={`element-${element.id}`}
    >
      {element.src ? (
        <img
          src={element.src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: element.objectFit }}
          draggable={false}
        />
      ) : (
        <span className="text-gray-400 text-sm">Image Placeholder</span>
      )}
      {isSelected && renderControlPoints(element.width, element.height, element.id, onResizeStart)}
    </div>
  );
}

function renderControlPoints(
  width: number,
  height: number,
  elementId: string,
  onResizeStart: (e: React.PointerEvent, elementId: string, handleIndex: number) => void,
) {
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
        <ControlPoint
          key={i}
          x={p.x}
          y={p.y}
          cursor={p.cursor}
          onPointerDown={(e) => onResizeStart(e, elementId, i)}
        />
      ))}
    </>
  );
}
