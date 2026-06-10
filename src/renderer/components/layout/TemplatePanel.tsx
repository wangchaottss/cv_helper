import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getCanvasBounds } from '../../utils/coordinates';
import type { GuideLineElement } from '../../types/elements';

let _guideCounter = 0;
function nextGuideName(): string { _guideCounter += 1; return `A${_guideCounter}`; }

function createGuideLine(pageIndex: number): GuideLineElement {
  const bounds = getCanvasBounds();
  return {
    id: `gl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'guideline',
    orientation: 'horizontal',
    position: bounds.height / 2, // center of A4 page
    color: '#3b82f6', // blue
    name: nextGuideName(),
    pageIndex,
  };
}

const TEMPLATE_ITEMS = [
  { type: 'text' as const, label: 'Text Block', icon: 'T', defaultWidth: 300, defaultHeight: 100 },
  { type: 'image' as const, label: 'Image Block', icon: '🖼', defaultWidth: 200, defaultHeight: 200 },
  { type: 'line' as const, label: 'Line', icon: '╱', defaultWidth: 100, defaultHeight: 2 },
  { type: 'box' as const, label: 'Box', icon: '▢', defaultWidth: 150, defaultHeight: 100 },
];

export default function TemplatePanel() {
  const addElement = useEditorStore((s) => s.addElement);
  const currentPage = useEditorStore((s) => s.currentPage);

  const handleDragStart = useCallback(
    (e: React.DragEvent, item: (typeof TEMPLATE_ITEMS)[0]) => {
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const handleAddGuideLine = useCallback(() => { addElement(createGuideLine(currentPage)); }, [currentPage, addElement]);

  return (
    <aside className="w-60 bg-white border-r border-gray-300 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Elements</h2>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {TEMPLATE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-grab hover:bg-blue-50 hover:border-blue-300 active:cursor-grabbing transition-colors"
            data-testid={`template-${item.type}`}
          >
            <span className="text-xl w-8 h-8 flex items-center justify-center bg-white rounded border border-gray-300">
              {item.icon}
            </span>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
          </div>
        ))}

        {/* Separator */}
        <div className="border-t border-gray-200 pt-2">
          <p className="text-[10px] text-gray-400 uppercase px-1 mb-1">Guides</p>
          <button
            onClick={handleAddGuideLine}
            className="w-full flex items-center gap-3 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors text-left"
            data-testid="template-guideline"
          >
            <span className="text-lg w-8 h-8 flex items-center justify-center bg-white rounded border border-gray-300 text-blue-500">
              ─
            </span>
            <span className="text-sm font-medium text-gray-700">Add Guide Line</span>
          </button>
        </div>
      </div>
      <div className="p-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          Drag elements or click to add guides
        </p>
      </div>
    </aside>
  );
}
