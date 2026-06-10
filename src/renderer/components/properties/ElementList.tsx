import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { CanvasElement, TextElement, ImageElement } from '../../types/elements';

function getElementLabel(el: CanvasElement): string {
  if (el.type === 'text') {
    const text = (el as TextElement).contentHTML.replace(/<[^>]*>/g, '').trim();
    if (!text) return '[Empty text]';
    return text.length > 10 ? text.slice(0, 10) + '...' : text;
  }
  // Image
  const img = el as ImageElement;
  if (!img.src) return '[Image placeholder]';
  // Extract filename from data URL or path
  const match = img.src.match(/\/([^/]+\.(png|jpg|jpeg|gif|webp|bmp|svg))/i);
  return match ? match[1] : '[Image]';
}

function getElementIcon(el: CanvasElement): string {
  return el.type === 'text' ? 'T' : '🖼';
}

export default function ElementList() {
  const elements = useEditorStore((s) => s.elements);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);

  const elementList = Object.values(elements);

  const handleClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        const store = useEditorStore.getState();
        store.toggleSelection(id);
      } else {
        setSelection([id]);
      }
    },
    [setSelection],
  );

  if (elementList.length === 0) {
    return (
      <div className="pt-3 border-t border-gray-100">
        <label className="block text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wide">
          Elements
        </label>
        <p className="text-xs text-gray-400 text-center py-2">No elements yet</p>
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-gray-100">
      <label className="block text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wide">
        Elements ({elementList.length})
      </label>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {elementList.map((el) => {
          const isSelected = selection.includes(el.id);
          return (
            <button
              key={el.id}
              type="button"
              onClick={(e) => handleClick(e, el.id)}
              className={`w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded ${
                isSelected
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              data-testid={`element-list-item-${el.id}`}
            >
              <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-[10px] font-medium flex-shrink-0">
                {getElementIcon(el)}
              </span>
              <span className="truncate flex-1">{getElementLabel(el)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
