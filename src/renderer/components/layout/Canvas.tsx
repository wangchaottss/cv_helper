import React, { useCallback, useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getCanvasBounds } from '../../utils/coordinates';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useElementDrag } from '../../hooks/useElementDrag';
import CanvasElement from '../canvas/CanvasElement';
import GuideLines from '../canvas/GuideLines';
import MultiSelectOverlay from '../canvas/MultiSelectOverlay';

const PADDING_LOGICAL = 8; // logical px — scales with zoom

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
  const pad = PADDING_LOGICAL * zoom;
  const wrapperW = canvasBounds.width * zoom + pad * 2;
  const wrapperH = canvasBounds.height * zoom + pad * 2;

  // Initial zoom-to-fit on mount
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const fitW = (el.clientWidth - pad * 2) / canvasBounds.width;
    const fitH = (el.clientHeight - pad * 2) / canvasBounds.height;
    const fit = Math.min(fitW, fitH, 1);
    setZoom(Math.max(0.25, fit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click on canvas background to deselect
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target.dataset['canvasInner'] === 'true') {
        setSelection([]);
      }
    },
    [setSelection],
  );

  // Zoom with pinch / Ctrl+wheel
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
    (el: HTMLDivElement | null) => setCanvasRef(el),
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
      {/* Flex wrapper: margin:auto centers A4 when it fits; margins → 0 when overflow */}
      <div style={{ display: 'flex', minHeight: '100%', minWidth: 'fit-content' }}>
        <div
          style={{
            margin: 'auto',
            width: `${wrapperW}px`,
            height: `${wrapperH}px`,
            padding: `${pad}px`,
          }}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
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
              <MultiSelectOverlay />
              <GuideLines />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
