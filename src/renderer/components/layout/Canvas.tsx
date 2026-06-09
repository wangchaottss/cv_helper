import React, { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getCanvasBounds } from '../../utils/coordinates';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useElementDrag } from '../../hooks/useElementDrag';
import CanvasElement from '../canvas/CanvasElement';
import GuideLines from '../canvas/GuideLines';
import MultiSelectOverlay from '../canvas/MultiSelectOverlay';

const PADDING_LOGICAL = 8; // logical px around A4 — scales with zoom

export default function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);

  const zoom = useEditorStore((s) => s.zoom);
  const elements = useEditorStore((s) => s.elements);
  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setZoom = useEditorStore((s) => s.setZoom);

  const { setCanvasRef, handleDragOver, handleDragLeave, handleDrop } = useDragDrop();
  const { onPointerDown } = useElementDrag();

  const canvasBounds = getCanvasBounds();
  // Padding scales with zoom — always PADDING_LOGICAL logical pixels
  const pad = PADDING_LOGICAL * zoom;
  const wrapperW = canvasBounds.width * zoom + pad * 2;
  const wrapperH = canvasBounds.height * zoom + pad * 2;

  // Initial zoom-to-fit when window first opens
  useEffect(() => {
    const el = canvasRef.current?.parentElement;
    if (!el) return;
    const fitW = (el.clientWidth - pad * 2) / canvasBounds.width;
    const fitH = (el.clientHeight - pad * 2) / canvasBounds.height;
    const fit = Math.min(fitW, fitH, 1); // never start > 100%
    setZoom(Math.max(0.25, fit));
  }, []); // only on mount

  // Center the canvas inside the viewport initially and after zoom
  const centerCanvas = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, (wrapperW - el.clientWidth) / 2);
    el.scrollTop = Math.max(0, (wrapperH - el.clientHeight) / 2);
  }, [wrapperW, wrapperH]);

  useEffect(() => {
    centerCanvas();
  }, [zoom, centerCanvas]); // re-center on zoom change

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

  // Zoom with pinch / Ctrl+wheel — low sensitivity
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.03 : 0.03;
        setZoom(Math.max(0.25, Math.min(3, zoom + delta)));
      }
    },
    [zoom, setZoom],
  );

  const elementList = Object.values(elements);

  const innerRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      setCanvasRef(el);
    },
    [setCanvasRef],
  );

  return (
    <main
      ref={canvasRef}
      className="flex-1 bg-canvas-bg overflow-auto"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      data-testid="canvas-area"
    >
      {/*
        Wrapper with exact visual dimensions: A4 * zoom + padding.
        transformOrigin '0 0' means the scaled A4 starts at wrapper position.
        When content > viewport → native scrolling in all directions.
      */}
      <div
        style={{
          width: `${wrapperW}px`,
          height: `${wrapperH}px`,
          padding: `${pad}px`,
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
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
    </main>
  );
}
