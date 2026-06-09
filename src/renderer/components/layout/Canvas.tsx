import React, { useCallback, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getCanvasBounds } from '../../utils/coordinates';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useElementDrag } from '../../hooks/useElementDrag';
import CanvasElement from '../canvas/CanvasElement';
import GuideLines from '../canvas/GuideLines';
import MultiSelectOverlay from '../canvas/MultiSelectOverlay';

export default function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);

  const zoom = useEditorStore((s) => s.zoom);
  const elements = useEditorStore((s) => s.elements);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setZoom = useEditorStore((s) => s.setZoom);

  const { setCanvasRef, handleDragOver, handleDragLeave, handleDrop } = useDragDrop();
  const { onPointerDown } = useElementDrag();

  // Handle click on canvas background to deselect
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target.dataset['canvasInner'] === 'true') {
        setSelection([]);
      }
    },
    [setSelection],
  );

  // Zoom with Ctrl/Cmd + mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(zoom + delta);
      }
    },
    [zoom, setZoom],
  );

  const elementList = Object.values(elements);
  const canvasBounds = getCanvasBounds();

  // Ref callback that wires dragDrop ref
  const innerRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      setCanvasRef(el);
    },
    [setCanvasRef],
  );

  return (
    <main
      ref={canvasRef}
      className="flex-1 bg-canvas-bg overflow-auto p-8"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      data-testid="canvas-area"
    >
      {/*
        margin: auto centers when content fits viewport;
        when zoomed content overflows, margins shrink to 0 → natural scrolling.
      */}
      <div
        style={{
          minWidth: `${canvasBounds.width * zoom + 64}px`,
          minHeight: `${canvasBounds.height * zoom + 64}px`,
          display: 'flex',
        }}
      >
        <div style={{ margin: 'auto' }}>
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <div
              ref={innerRefCallback}
              data-canvas-inner="true"
              className="bg-white shadow-xl relative"
              style={{
                width: `${canvasBounds.width}px`,
                height: `${canvasBounds.height}px`,
              }}
              data-testid="a4-canvas"
            >
          {elementList.map((el) => (
            <CanvasElement
              key={el.id}
              element={el}
              isSelected={selection.includes(el.id)}
              onPointerDown={onPointerDown}
            />
          ))}

          {/* Multi-select bounding box */}
          <MultiSelectOverlay />

          {/* Guide lines layer */}
          <GuideLines />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
