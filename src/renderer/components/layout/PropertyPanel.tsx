import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export default function PropertyPanel() {
  const selection = useEditorStore((s) => s.selection);
  const elements = useEditorStore((s) => s.elements);

  const selectedElement = selection.length === 1 ? elements[selection[0]] : null;

  return (
    <aside className="w-72 bg-white border-l border-gray-300 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Properties</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {!selectedElement && (
          <div className="text-sm text-gray-400 text-center mt-8" data-testid="properties-placeholder">
            Select an element to edit its properties
          </div>
        )}
        {selectedElement && (
          <div className="space-y-4" data-testid="properties-content">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <p className="text-sm text-gray-700 capitalize">{selectedElement.type}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Position</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <span className="text-xs text-gray-400">X</span>
                  <p className="text-sm text-gray-700">{Math.round(selectedElement.x)}px</p>
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-400">Y</span>
                  <p className="text-sm text-gray-700">{Math.round(selectedElement.y)}px</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Size</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <span className="text-xs text-gray-400">W</span>
                  <p className="text-sm text-gray-700">{Math.round(selectedElement.width)}px</p>
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-400">H</span>
                  <p className="text-sm text-gray-700">{Math.round(selectedElement.height)}px</p>
                </div>
              </div>
            </div>
            {selection.length > 1 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                {selection.length} elements selected. Common properties only.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
