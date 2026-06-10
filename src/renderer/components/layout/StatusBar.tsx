import React, { useCallback, useMemo, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';

export default function StatusBar() {
  const zoom = useEditorStore((s) => s.zoom);
  const showGuides = useEditorStore((s) => s.showGuides);
  const snapEnabled = useEditorStore((s) => s.snapEnabled);
  const selection = useEditorStore((s) => s.selection);
  const elements = useEditorStore((s) => s.elements);
  const currentPage = useEditorStore((s) => s.currentPage);
  const toggleGuides = useEditorStore((s) => s.toggleGuides);
  const toggleSnap = useEditorStore((s) => s.toggleSnap);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage);
  const addPage = useEditorStore((s) => s.addPage);

  const totalPages = useMemo(() => {
    const all = Object.values(elements);
    if (all.length === 0) return 1;
    return all.reduce((max, el) => Math.max(max, el.pageIndex), 0) + 1;
  }, [elements]);

  const [jumpInput, setJumpInput] = useState('');

  const handleJump = useCallback(() => {
    const page = parseInt(jumpInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page - 1);
    }
    setJumpInput('');
  }, [jumpInput, totalPages, setCurrentPage]);

  const handleJumpKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleJump();
    },
    [handleJump],
  );

  const canPrev = currentPage > 0;
  const canNext = currentPage < totalPages - 1;

  return (
    <footer className="h-8 bg-gray-100 border-t border-gray-300 flex items-center justify-between px-4 text-xs text-gray-600 flex-shrink-0">
      {/* Left: zoom + element count */}
      <div className="flex items-center gap-3">
        <span data-testid="zoom-display">Zoom: {Math.round(zoom * 100)}%</span>
        <span>
          Elements: {Object.keys(elements).length} | Selected: {selection.length}
        </span>
      </div>

      {/* Center: page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={!canPrev}
          className={`px-1.5 py-0.5 rounded border text-[11px] ${
            canPrev ? 'bg-white border-gray-300 hover:bg-gray-50' : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
          }`}
          title="Previous page"
        >
          ◀
        </button>

        <span className="mx-1 text-[11px] font-medium whitespace-nowrap">
          Page {currentPage + 1} / {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={!canNext}
          className={`px-1.5 py-0.5 rounded border text-[11px] ${
            canNext ? 'bg-white border-gray-300 hover:bg-gray-50' : 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
          }`}
          title="Next page"
        >
          ▶
        </button>

        <button
          onClick={addPage}
          className="px-2 py-0.5 rounded border text-[11px] bg-white border-blue-300 text-blue-600 hover:bg-blue-50 ml-1"
          title="Add new page"
        >
          + New
        </button>

        <span className="text-gray-300 mx-1">|</span>

        <input
          type="number"
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          onKeyDown={handleJumpKey}
          placeholder="#"
          min={1}
          max={totalPages}
          className="w-10 px-1 py-0.5 text-[11px] border border-gray-300 rounded text-center"
          data-testid="page-jump-input"
        />
        <button
          onClick={handleJump}
          className="px-1.5 py-0.5 rounded border text-[10px] bg-white border-gray-300 hover:bg-gray-50"
          title="Go to page"
        >
          Go
        </button>
      </div>

      {/* Right: zoom controls + guides/snap toggles */}
      <div className="flex items-center gap-2">
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
            showGuides ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-500'
          }`}
          data-testid="toggle-guides"
        >
          Guides: {showGuides ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={toggleSnap}
          className={`px-2 py-0.5 rounded border ${
            snapEnabled ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-500'
          }`}
          data-testid="toggle-snap"
        >
          Snap: {snapEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </footer>
  );
}
