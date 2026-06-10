import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getCanvasBounds } from '../../utils/coordinates';
import { useDragDrop } from '../../hooks/useDragDrop';
import { useElementDrag } from '../../hooks/useElementDrag';
import { useResize } from '../../hooks/useResize';
import { useMarqueeSelect } from '../../hooks/useMarqueeSelect';
import CanvasElement from '../canvas/CanvasElement';
import GuideLines from '../canvas/GuideLines';
import MultiSelectOverlay from '../canvas/MultiSelectOverlay';

const PADDING_LOGICAL = 8;

export default function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement | null>(null);

  const zoom = useEditorStore((s) => s.zoom);
  const elements = useEditorStore((s) => s.elements);
  const selection = useEditorStore((s) => s.selection);
  const currentPage = useEditorStore((s) => s.currentPage);
  const setZoom = useEditorStore((s) => s.setZoom);

  const { setCanvasRef, handleDragOver, handleDragLeave, handleDrop } = useDragDrop();
  const { onPointerDown } = useElementDrag();
  const { onResizeStart } = useResize();
  const { marquee, onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp } = useMarqueeSelect();

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

  // Zoom with Ctrl+wheel
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

  // Combined ref: wire dragDrop ref + keep canvasInnerRef
  const innerRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      setCanvasRef(el);
      canvasInnerRef.current = el;
    },
    [setCanvasRef],
  );

  const elementList = Object.values(elements).filter((el) => el.pageIndex === currentPage);

  return (
    <main
      ref={canvasRef}
      className="flex-1 bg-canvas-bg overflow-auto"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={(e) => onCanvasMouseDown(e, canvasInnerRef.current)}
      onMouseMove={(e) => onCanvasMouseMove(e, canvasInnerRef.current)}
      onMouseUp={onCanvasMouseUp}
      onWheel={handleWheel}
      data-testid="canvas-area"
    >
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
                  onResizeStart={onResizeStart}
                />
              ))}
              <MultiSelectOverlay />
              <GuideLines />

              {/* Marquee selection rectangle */}
              {marquee && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${marquee.x}px`,
                    top: `${marquee.y}px`,
                    width: `${marquee.width}px`,
                    height: `${marquee.height}px`,
                    border: '1.5px dashed #2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    pointerEvents: 'none',
                    zIndex: 9999,
                  }}
                  data-testid="marquee-selection"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
