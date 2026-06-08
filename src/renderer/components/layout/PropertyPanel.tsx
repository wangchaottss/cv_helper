import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import TextProperties from '../properties/TextProperties';
import ImageProperties from '../properties/ImageProperties';
import type { TextElement, ImageElement, CanvasElement } from '../../types/elements';

export default function PropertyPanel() {
  const selection = useEditorStore((s) => s.selection);
  const elements = useEditorStore((s) => s.elements);
  const updateElement = useEditorStore((s) => s.updateElement);

  const selectedElement = selection.length === 1 ? elements[selection[0]] : null;

  const handleUpdate = useCallback(
    (patch: Partial<CanvasElement>) => {
      if (selection.length === 1) {
        updateElement(selection[0], patch);
      } else if (selection.length > 1) {
        // Batch update for multi-select
        for (const id of selection) {
          updateElement(id, patch);
        }
      }
    },
    [selection, updateElement],
  );

  return (
    <aside className="w-72 bg-white border-l border-gray-300 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Properties</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {!selectedElement && selection.length === 0 && (
          <div className="text-sm text-gray-400 text-center mt-8" data-testid="properties-placeholder">
            Select an element to edit its properties
          </div>
        )}

        {selection.length > 1 && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mb-4" data-testid="properties-multi">
            {selection.length} elements selected. Editing common properties below.
          </div>
        )}

        {selectedElement && selectedElement.type === 'text' && (
          <TextProperties
            element={selectedElement as TextElement}
            onUpdate={handleUpdate}
            disabled={selection.length > 1}
          />
        )}

        {selectedElement && selectedElement.type === 'image' && (
          <ImageProperties
            element={selectedElement as ImageElement}
            onUpdate={handleUpdate}
            disabled={selection.length > 1}
          />
        )}

        {/* Multi-select position info */}
        {selection.length > 1 && (
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Count
              </label>
              <p className="text-sm text-gray-700">{selection.length} elements</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
