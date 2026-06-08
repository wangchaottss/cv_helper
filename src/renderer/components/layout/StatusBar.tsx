import React from 'react';
import { useEditorStore } from '../../store/editorStore';

export default function StatusBar() {
  const zoom = useEditorStore((s) => s.zoom);
  const showGuides = useEditorStore((s) => s.showGuides);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const selection = useEditorStore((s) => s.selection);
  const elements = useEditorStore((s) => s.elements);
  const toggleGuides = useEditorStore((s) => s.toggleGuides);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const setZoom = useEditorStore((s) => s.setZoom);

  return (
    <footer className="h-8 bg-gray-100 border-t border-gray-300 flex items-center justify-between px-4 text-xs text-gray-600 flex-shrink-0">
      <div className="flex items-center gap-4">
        <span data-testid="zoom-display">Zoom: {Math.round(zoom * 100)}%</span>
        <span>
          Elements: {Object.keys(elements).length} | Selected: {selection.length}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
          className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Reset Zoom"
        >
          100%
        </button>
        <button
          onClick={() => setZoom(Math.min(3, zoom + 0.1))}
          className="px-2 py-0.5 bg-white border border-gray-300 rounded hover:bg-gray-50"
          title="Zoom In"
        >
          +
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={toggleGuides}
          className={`px-2 py-0.5 rounded border ${
            showGuides
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-500'
          }`}
          data-testid="toggle-guides"
        >
          Guides: {showGuides ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={toggleSnap}
          className={`px-2 py-0.5 rounded border ${
            snapEnabled
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-500'
          }`}
          data-testid="toggle-snap"
        >
          Snap: {snapEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </footer>
  );
}
