import React, { useCallback } from 'react';

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
  const handleDragStart = useCallback(
    (e: React.DragEvent, item: (typeof TEMPLATE_ITEMS)[0]) => {
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

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
      </div>
      <div className="p-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">
          Drag elements onto the canvas
        </p>
      </div>
    </aside>
  );
}
