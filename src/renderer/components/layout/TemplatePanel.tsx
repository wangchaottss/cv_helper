import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getCanvasBounds } from '../../utils/coordinates';
import type { GuideLineElement, LineElement, BoxElement } from '../../types/elements';

let _guideCounter = 0;
function nextGuideName(): string { _guideCounter += 1; return `A${_guideCounter}`; }

let _lineCounter = 0;
function nextLineName(): string { _lineCounter += 1; return `L${_lineCounter}`; }

let _boxCounter = 0;
function nextBoxName(): string { _boxCounter += 1; return `B${_boxCounter}`; }

function createDefaultLine(pageIndex: number): LineElement {
  const c = getCanvasBounds();
  return { id: `ln-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type: 'line', x1: c.width/2-50, y1: c.height/2, x2: c.width/2+50, y2: c.height/2, color: '#3b82f6', lineStyle: 'solid', thickness: 2, name: nextLineName(), pageIndex };
}

function createDefaultBox(pageIndex: number): BoxElement {
  const c = getCanvasBounds();
  return { id: `bx-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type: 'box', x: c.width/2-75, y: c.height/2-50, width: 150, height: 100, borderStyle: 'solid', borderColor: '#3b82f6', borderWidth: 2, borderRadius: 0, fillColor: 'transparent', name: nextBoxName(), pageIndex };
}

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
  {
    type: 'text' as const,
    label: 'Text Block',
    icon: 'T',
    defaultWidth: 300,
    defaultHeight: 100,
  },
  {
    type: 'image' as const,
    label: 'Image Block',
    icon: '🖼',
    defaultWidth: 200,
    defaultHeight: 200,
  },
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
  const handleAddLine = useCallback(() => { addElement(createDefaultLine(currentPage)); }, [currentPage, addElement]);
  const handleAddBox = useCallback(() => { addElement(createDefaultBox(currentPage)); }, [currentPage, addElement]);

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
          <button onClick={handleAddLine} className="w-full flex items-center gap-3 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors text-left mt-1"
            data-testid="template-line">
            <span className="text-lg w-8 h-8 flex items-center justify-center bg-white rounded border border-gray-300 text-blue-500">╱</span>
            <span className="text-sm font-medium text-gray-700">Add Line</span>
          </button>
          <button onClick={handleAddBox} className="w-full flex items-center gap-3 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors text-left mt-1"
            data-testid="template-box">
            <span className="text-lg w-8 h-8 flex items-center justify-center bg-white rounded border border-gray-300 text-blue-500">▢</span>
            <span className="text-sm font-medium text-gray-700">Add Box</span>
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
