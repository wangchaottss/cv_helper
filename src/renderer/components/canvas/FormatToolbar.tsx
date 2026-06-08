import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { applyFormat, removeFormat, getActiveFormats } from '../../utils/richText';

interface FormatToolbarProps {
  visible: boolean;
}

export default function FormatToolbar({ visible }: FormatToolbarProps) {
  const [activeFormats, setActiveFormats] = useState(getActiveFormats());

  // Update active formats on selection change
  useEffect(() => {
    if (!visible) return;
    const handler = () => {
      setActiveFormats(getActiveFormats());
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [visible]);

  const handleBold = useCallback(() => {
    const current = getActiveFormats();
    applyFormat('font-weight', current.fontWeight === '700' || current.fontWeight === 'bold' ? '400' : '700');
  }, []);

  const handleItalic = useCallback(() => {
    const current = getActiveFormats();
    applyFormat('font-style', current.fontStyle === 'italic' ? 'normal' : 'italic');
  }, []);

  const handleUnderline = useCallback(() => {
    const current = getActiveFormats();
    applyFormat('text-decoration', current.textDecoration?.includes('underline') ? 'none' : 'underline');
  }, []);

  const handleClearFormat = useCallback(() => {
    removeFormat();
  }, []);

  const isBold = activeFormats.fontWeight === '700' || activeFormats.fontWeight === 'bold';
  const isItalic = activeFormats.fontStyle === 'italic';
  const isUnderline = activeFormats.textDecoration?.includes('underline') ?? false;

  if (!visible) return null;

  return (
    <div
      className="flex items-center gap-1 p-1.5 bg-white border border-gray-300 rounded-lg shadow-lg"
      style={{
        position: 'absolute',
        top: '-48px',
        left: '0',
        zIndex: 10000,
        whiteSpace: 'nowrap',
      }}
      data-testid="format-toolbar"
      onMouseDown={(e) => e.preventDefault()} // Prevent stealing focus
    >
      <ToolbarButton active={isBold} onClick={handleBold} title="Bold">
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton active={isItalic} onClick={handleItalic} title="Italic">
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton active={isUnderline} onClick={handleUnderline} title="Underline">
        <u>U</u>
      </ToolbarButton>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <ToolbarButton active={false} onClick={handleClearFormat} title="Clear formatting">
        <span className="text-xs">Tx</span>
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center text-sm rounded ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}
