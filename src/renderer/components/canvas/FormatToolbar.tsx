import React, { useCallback } from 'react';
import type { Editor } from '@tiptap/react';

interface FormatToolbarProps {
  visible: boolean;
  editor: Editor | null;
}

export default function FormatToolbar({ visible, editor }: FormatToolbarProps) {
  const handleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const handleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const handleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
  const handleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const handleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const handleClear = useCallback(() => editor?.chain().focus().clearNodes().unsetAllMarks().run(), [editor]);

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
      onMouseDown={(e) => e.preventDefault()}
    >
      <TBtn active={isBold} onClick={handleBold} title="Bold"><strong>B</strong></TBtn>
      <TBtn active={isItalic} onClick={handleItalic} title="Italic"><em>I</em></TBtn>
      <TBtn active={isUnderline} onClick={handleUnderline} title="Underline"><u>U</u></TBtn>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <TBtn active={isBullet} onClick={handleBulletList} title="Bullet list"><span className="text-sm">•</span></TBtn>
      <TBtn active={isOrdered} onClick={handleOrderedList} title="Numbered list"><span className="text-xs font-medium">1.</span></TBtn>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <TBtn active={false} onClick={handleClear} title="Clear formatting"><span className="text-xs">Tx</span></TBtn>
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
