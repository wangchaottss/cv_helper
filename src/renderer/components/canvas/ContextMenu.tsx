import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay adding listener so the right-click that opened the menu
    // doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Clamp position to viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 180),
    top: Math.min(y, window.innerHeight - items.length * 36 - 8),
    zIndex: 50000,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
    >
      {items.map((item, i) => (
        <button
          key={i}
          disabled={item.disabled}
          onClick={(e) => {
            e.stopPropagation();
            item.action();
            onClose();
          }}
          className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left
            ${item.disabled
              ? 'text-gray-300 cursor-default'
              : item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-blue-50'
            }`}
        >
          <span>{item.label}</span>
          {item.shortcut && (
            <span className="text-xs text-gray-400 ml-4">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );
}
