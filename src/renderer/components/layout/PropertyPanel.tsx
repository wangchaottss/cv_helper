import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import TextProperties from '../properties/TextProperties';
import ImageProperties from '../properties/ImageProperties';
import GuidelineProperties from '../properties/GuidelineProperties';
import LineProperties from '../properties/LineProperties';
import BoxProperties from '../properties/BoxProperties';
import ElementList from '../properties/ElementList';
import type { TextElement, ImageElement, CanvasElement } from '../../types/elements';

// ============================================================
// Z-order helpers
// ============================================================

// Exclude guidelines from z-order — they don't have zIndex
function zElements() {
  return Object.values(useEditorStore.getState().elements).filter((el: any) => el.type !== 'guideline' && el.type !== 'line' && el.type !== 'box') as Array<TextElement | ImageElement>;
}

function bringToFront(id: string) {
  const store = useEditorStore.getState();
  const maxZ = zElements().reduce((max, el) => Math.max(max, el.zIndex), 0);
  store.updateElement(id, { zIndex: maxZ + 1 });
}

function sendToBack(id: string) {
  const store = useEditorStore.getState();
  const minZ = zElements().reduce((min, el) => Math.min(min, el.zIndex), Infinity);
  store.updateElement(id, { zIndex: minZ - 1 });
}

function bringForward(id: string) {
  const store = useEditorStore.getState();
  const current = store.elements[id];
  if (!current || current.type === 'guideline' || current.type === 'line' || current.type === 'box') return;
  const nextHigher = zElements()
    .filter((el) => el.zIndex > current.zIndex)
    .sort((a, b) => a.zIndex - b.zIndex)[0];
  if (nextHigher) {
    store.updateElement(id, { zIndex: nextHigher.zIndex });
    store.updateElement(nextHigher.id, { zIndex: current.zIndex });
  }
}

function sendBackward(id: string) {
  const store = useEditorStore.getState();
  const current = store.elements[id];
  if (!current || current.type === 'guideline' || current.type === 'line' || current.type === 'box') return;
  const nextLower = zElements()
    .filter((el) => el.zIndex < current.zIndex)
    .sort((a, b) => b.zIndex - a.zIndex)[0];
  if (nextLower) {
    store.updateElement(id, { zIndex: nextLower.zIndex });
    store.updateElement(nextLower.id, { zIndex: current.zIndex });
  }
}

function LayerButton({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="px-2 py-1 text-[10px] bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600"
    >
      {label}
    </button>
  );
}

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

        {selectedElement && selectedElement.type === 'guideline' && (
          <GuidelineProperties element={selectedElement} onUpdate={handleUpdate} />
        )}
        {selectedElement && selectedElement.type === 'line' && (
          <LineProperties element={selectedElement} onUpdate={handleUpdate} />
        )}
        {selectedElement && selectedElement.type === 'box' && (
          <BoxProperties element={selectedElement} onUpdate={handleUpdate} />
        )}

        {/* Z-order controls (not for guidelines) */}
        {selectedElement && selectedElement.type !== 'guideline' && (
          <div className="pt-3 border-t border-gray-100">
            <label className="block text-[11px] font-medium text-gray-500 mb-2 uppercase tracking-wide">
              Layer Order
            </label>
            <div className="grid grid-cols-2 gap-1">
              <LayerButton
                label="To Front"
                title="Bring to front"
                onClick={() => bringToFront(selection[0])}
              />
              <LayerButton
                label="Forward"
                title="Bring forward"
                onClick={() => bringForward(selection[0])}
              />
              <LayerButton
                label="Backward"
                title="Send backward"
                onClick={() => sendBackward(selection[0])}
              />
              <LayerButton
                label="To Back"
                title="Send to back"
                onClick={() => sendToBack(selection[0])}
              />
            </div>
          </div>
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

        {/* Element List */}
        <ElementList />
      </div>
    </aside>
  );
}
