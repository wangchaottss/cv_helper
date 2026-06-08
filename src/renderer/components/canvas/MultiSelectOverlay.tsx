import React, { useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore';

export default function MultiSelectOverlay() {
  const selection = useEditorStore((s) => s.selection);
  const elements = useEditorStore((s) => s.elements);

  const boundingBox = useMemo(() => {
    if (selection.length < 2) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const id of selection) {
      const el = elements[id];
      if (!el) continue;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }

    if (!isFinite(minX)) return null;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selection, elements]);

  if (!boundingBox) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${boundingBox.x - 2}px`,
        top: `${boundingBox.y - 2}px`,
        width: `${boundingBox.width + 4}px`,
        height: `${boundingBox.height + 4}px`,
        border: '1.5px dashed #2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.04)',
        pointerEvents: 'none',
        zIndex: 999,
      }}
      data-testid="multi-select-overlay"
    />
  );
}
