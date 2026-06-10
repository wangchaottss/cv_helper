import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getCanvasBounds } from '../../utils/coordinates';
import type { GuideLineElement } from '../../types/elements';

export default function GuideLineRenderer({ element }: { element: GuideLineElement }) {
  const isSelected = useEditorStore((s) => s.selection.includes(element.id));
  const isSnapTarget = useEditorStore((s) => s.snapTargets.includes(element.id));
  const isHorizontal = element.orientation === 'horizontal';

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const store = useEditorStore.getState();
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        store.toggleSelection(element.id);
      } else {
        store.setSelection([element.id]);
      }

      const startPos = element.position;
      const startMouse = isHorizontal ? e.clientY : e.clientX;
      const zoom = store.zoom;
      const canvasBounds = getCanvasBounds();
      const maxPos = isHorizontal ? canvasBounds.height : canvasBounds.width;

      const onMove = (me: PointerEvent) => {
        const mouseNow = isHorizontal ? me.clientY : me.clientX;
        const delta = Math.round((mouseNow - startMouse) / zoom);
        const newPos = Math.max(0, Math.min(maxPos, startPos + delta));
        useEditorStore.getState().updateElement(element.id, { position: newPos });
      };

      const onUp = () => {
        useEditorStore.getState().pushHistory();
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    },
    [element.id, element.position, element.orientation, isHorizontal],
  );

  const lineColor = isSelected ? element.color : isSnapTarget ? '#22c55e' : element.color;
  const lineWidth = isSelected || isSnapTarget ? 2 : 1.5;

  return (
    <div
      data-testid={`element-${element.id}`}
      style={{
        position: 'absolute',
        ...(isHorizontal
          ? { left: 0, top: element.position, width: '100%', height: 0 }
          : { top: 0, left: element.position, height: '100%', width: 0 }),
        zIndex: isSelected ? 5000 : 500,
        cursor: isHorizontal ? 'ns-resize' : 'ew-resize',
        pointerEvents: 'auto',
      }}
      onPointerDown={handlePointerDown}
    >
      {/* The line itself */}
      <div
        style={{
          position: 'absolute',
          ...(isHorizontal
            ? { left: 0, right: 0, top: 0, borderTop: `${lineWidth}px solid ${lineColor}` }
            : { top: 0, bottom: 0, left: 0, borderLeft: `${lineWidth}px solid ${lineColor}` }),
        }}
      />

      {/* Selection handles */}
      {(isSelected || isSnapTarget) && (
        <div
          style={{
            position: 'absolute',
            ...(isHorizontal
              ? { left: 0, top: -4, width: '100%', height: 8 }
              : { top: 0, left: -4, height: '100%', width: 8 }),
            backgroundColor: `${lineColor}22`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Name label */}
      <span
        style={{
          position: 'absolute',
          ...(isHorizontal ? { left: 4, top: -14 } : { top: 4, left: 6 }),
          fontSize: 11,
          fontWeight: 600,
          color: element.color,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '0 3px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: '16px',
        }}
      >
        {element.name}
      </span>
    </div>
  );
}
