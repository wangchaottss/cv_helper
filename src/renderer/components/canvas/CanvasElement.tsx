import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { FontSize, setActiveEditor } from '../../utils/tiptapExtensions';
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

function ControlPoint({ x, y, cursor, onPointerDown }: {
  x: number; y: number; cursor: string;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div style={{
      position: 'absolute',
      left: `${x - CONTROL_POINT_SIZE / 2}px`,
      top: `${y - CONTROL_POINT_SIZE / 2}px`,
      width: `${CONTROL_POINT_SIZE}px`,
      height: `${CONTROL_POINT_SIZE}px`,
      backgroundColor: 'white', border: '1.5px solid #2563eb',
      cursor, zIndex: 10,
    }} onPointerDown={onPointerDown} />
  );
}

// ---- Text element using Tiptap editor ----
function TextElementView({ element, isSelected, isEditing, onPointerDown, onResizeStart, onDoubleClick }: {
  element: CanvasElementType;
  isSelected: boolean;
  isEditing: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, elementId: string, handleIndex: number) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
}) {
  if (element.type !== 'text') return null;
  const updateElement = useEditorStore((s) => s.updateElement);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEditingRef = useRef(false);

  // Create editor once with initial content, always editable.
  // Overlay div controls click behavior (edit vs drag) based on isEditing.
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Underline, TextStyle, Color, FontFamily, FontSize,
      TextAlign.configure({ types: ['paragraph'] }),
      Highlight.configure({ multicolor: true }),
    ],
    content: element.contentHTML,
    editable: true,
    onUpdate: ({ editor: ed }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateElement(element.id, { contentHTML: ed.getHTML() });
      }, 300);
    },
    editorProps: {
      transformPastedHTML: (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent?.replace(/\n/g, '<br>') || '';
      },
      attributes: {
        style: `font-family: ${element.defaultFontFamily}; font-size: ${element.defaultFontSize}px; color: ${element.defaultColor}; font-weight: ${element.defaultFontWeight}; font-style: ${element.defaultFontStyle}; text-align: ${element.defaultTextAlign}; line-height: ${element.defaultLineHeight}; background-color: ${element.defaultBackgroundColor}; padding: 4px; overflow: hidden; word-break: break-word; white-space: pre-wrap; outline: none; cursor: text;`,
      },
      handleDOMEvents: {
        focus: () => { setActiveEditor(editor); return false; },
        blur: () => {
          setActiveEditor(null);
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
          }
          updateElement(element.id, { contentHTML: editor?.getHTML() || element.contentHTML });
          return false;
        },
      },
    },
    immediatelyRender: false,
  });

  // Sync content from store when entering edit mode or when changed externally
  useEffect(() => {
    if (!editor) return;
    const wasEditing = prevEditingRef.current;
    prevEditingRef.current = isEditing;

    if (isEditing && !wasEditing) {
      // Entering edit mode: sync latest content from store, then focus
      editor.commands.setContent(element.contentHTML);
      setTimeout(() => editor.commands.focus('end'), 50);
    } else if (!isEditing && wasEditing) {
      // Exiting edit mode: blur to clear selection, then flush content
      editor.commands.blur();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      updateElement(element.id, { contentHTML: editor.getHTML() });
    }
  }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}px`, top: `${element.y}px`,
    width: `${element.width}px`, height: `${element.height}px`,
    zIndex: element.zIndex, boxSizing: 'border-box',
    cursor: isEditing ? 'default' : 'move',
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

  return (
    <div
      style={baseStyle}
      data-testid={`element-${element.id}`}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <FormatToolbar visible={isEditing} editor={editor} />
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Tiptap editor — always rendered, always editable */}
        <EditorContent editor={editor} />

        {/* Overlay: when NOT editing, blocks all pointer events from reaching
            Tiptap. Clicks go to outer wrapper (select/drag), double-click → edit */}
        {!isEditing && (
          <div
            style={{
              position: 'absolute', inset: 0,
              cursor: 'move',
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onDoubleClick(e);
            }}
          />
        )}
      </div>
      {isSelected && !isEditing && renderControlPoints(element.width, element.height, element.id, onResizeStart)}
    </div>
  );
}

// ---- Main CanvasElement ----
export default function CanvasElement({ element, isSelected, onPointerDown, onResizeStart }: CanvasElementProps) {
  const updateElement = useEditorStore((s) => s.updateElement);
  const [isEditing, setIsEditing] = useState(false);

  if (element.type === 'guideline' || element.type === 'line' || element.type === 'box') return null;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => { onPointerDown(e, element.id); },
    [element.id, onPointerDown],
  );

  const handleDoubleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation(); e.preventDefault();
      if (element.type === 'text') {
        setIsEditing(true);
      } else if (element.type === 'image' && window.electronAPI) {
        const filePath = await window.electronAPI.showOpenDialog({
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
        });
        if (filePath) {
          const dataUrl = await window.electronAPI.readImage(filePath);
          if (dataUrl) useEditorStore.getState().updateElement(element.id, { src: dataUrl });
        }
      }
    },
    [element.type, element.id],
  );

  // Exit edit mode only when element is deselected
  useEffect(() => {
    if (!isSelected && isEditing) setIsEditing(false);
  }, [isSelected, isEditing]);

  if (element.type === 'text') {
    return (
      <TextElementView
        element={element} isSelected={isSelected} isEditing={isEditing}
        onPointerDown={handlePointerDown} onResizeStart={onResizeStart}
        onDoubleClick={handleDoubleClick}
      />
    );
  }

  // Image element
  const baseStyle: React.CSSProperties = {
    position: 'absolute', left: `${element.x}px`, top: `${element.y}px`,
    width: `${element.width}px`, height: `${element.height}px`,
    zIndex: element.zIndex, boxSizing: 'border-box',
    cursor: 'move', touchAction: 'none',
    border: element.src ? 'none' : '2px dashed #d1d5db',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: element.src ? 'transparent' : '#f9fafb',
    overflow: 'hidden',
  };
  if (isSelected) { baseStyle.outline = '2px solid #2563eb'; baseStyle.outlineOffset = '0px'; }

  return (
    <div style={baseStyle} onPointerDown={handlePointerDown} data-testid={`element-${element.id}`}>
      {element.src ? (
        <img src={element.src} alt="" style={{ width: '100%', height: '100%', objectFit: element.objectFit }} draggable={false} />
      ) : (
        <span className="text-gray-400 text-sm">Image Placeholder</span>
      )}
      {isSelected && renderControlPoints(element.width, element.height, element.id, onResizeStart)}
    </div>
  );
}

function renderControlPoints(width: number, height: number, elementId: string, onResizeStart: (e: React.PointerEvent, elementId: string, handleIndex: number) => void) {
  const positions = [
    { x: 0, y: 0, cursor: 'nwse-resize' }, { x: width, y: 0, cursor: 'nesw-resize' },
    { x: 0, y: height, cursor: 'nesw-resize' }, { x: width, y: height, cursor: 'nwse-resize' },
    { x: width / 2, y: 0, cursor: 'ns-resize' }, { x: width, y: height / 2, cursor: 'ew-resize' },
    { x: width / 2, y: height, cursor: 'ns-resize' }, { x: 0, y: height / 2, cursor: 'ew-resize' },
  ];
  return <>{positions.map((p, i) => <ControlPoint key={i} x={p.x} y={p.y} cursor={p.cursor} onPointerDown={(e) => onResizeStart(e, elementId, i)} />)}</>;
}
