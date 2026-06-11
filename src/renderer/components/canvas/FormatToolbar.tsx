import React, { useCallback, useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import FontSelector from '../properties/FontSelector';

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];

interface FormatToolbarProps {
  visible: boolean;
  editor: Editor | null;
}

export default function FormatToolbar({ visible, editor }: FormatToolbarProps) {
  const [fontSize, setFontSize] = useState('16');
  const [color, setColor] = useState('#000000');

  // Sync displayed size/color from current selection
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const attrs = editor.getAttributes('textStyle');
      if (attrs.fontSize) setFontSize(parseInt(attrs.fontSize)?.toString() || '16');
      if (attrs.color) setColor(attrs.color);
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  if (!visible || !editor) return null;

  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isUnderline = editor.isActive('underline');
  const isBullet = editor.isActive('bulletList');
  const isOrdered = editor.isActive('orderedList');

  return (
    <div
      className="flex items-center gap-1 p-1.5 bg-white border border-gray-300 rounded-lg shadow-lg"
      style={{ position: 'absolute', top: '-48px', left: '0', zIndex: 10000, whiteSpace: 'nowrap' }}
      data-testid="format-toolbar"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        const el = e.target as HTMLElement;
        if (!el.closest('select') && !el.closest('input')) e.preventDefault();
      }}
    >
      {/* Font family */}
      <div style={{ width: 130 }}>
        <FontSelector
          value={editor.getAttributes('textStyle').fontFamily || ''}
          onChange={(font) => editor.chain().focus().setFontFamily(font).run()}
        />
      </div>
      <div className="w-px h-5 bg-gray-200" />

      {/* Font size */}
      <select
        value={fontSize}
        onChange={(e) => {
          setFontSize(e.target.value);
          editor.chain().focus().setMark('textStyle', { fontSize: `${e.target.value}px` }).run();
        }}
        className="h-7 text-xs border border-gray-300 rounded px-1 bg-white"
      >
        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <div className="w-px h-5 bg-gray-200" />

      {/* Text color */}
      <input
        type="color"
        value={color}
        onChange={(e) => {
          setColor(e.target.value);
          editor.chain().focus().setColor(e.target.value).run();
        }}
        className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0"
        title="Text color"
      />
      <div className="w-px h-5 bg-gray-200 mx-0.5" />

      {/* Bold / Italic / Underline */}
      <TBtn active={isBold} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><strong>B</strong></TBtn>
      <TBtn active={isItalic} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><em>I</em></TBtn>
      <TBtn active={isUnderline} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></TBtn>
      <div className="w-px h-5 bg-gray-200" />

      {/* Lists */}
      <TBtn active={isBullet} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><span className="text-sm">•</span></TBtn>
      <TBtn active={isOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><span className="text-xs font-medium">1.</span></TBtn>
      <div className="w-px h-5 bg-gray-200" />

      {/* Clear formatting */}
      <TBtn active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting"><span className="text-xs">Tx</span></TBtn>
    </div>
  );
}

function TBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className={`w-7 h-7 flex items-center justify-center text-sm rounded ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
      {children}
    </button>
  );
}
