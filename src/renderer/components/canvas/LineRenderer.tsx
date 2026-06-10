import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { getCanvasBounds } from '../../utils/coordinates';
import type { LineElement } from '../../types/elements';

const SNAP_THRESHOLD = 8;
const H_SNAP_ANGLE = 3; // degrees — snap to horizontal/vertical within this

function getAngle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI);
}

interface SnapRef { pos: number; elId: string }

function findSnapX(val: number, refs: SnapRef[]): { offset: number; elId: string } | null {
  let best: { offset: number; elId: string } | null = null;
  for (const r of refs) {
    const offset = r.pos - val;
    const dist = Math.abs(offset);
    if (dist < SNAP_THRESHOLD && (!best || dist < Math.abs(best.offset))) {
      best = { offset, elId: r.elId };
    }
  }
  return best;
}

export default function LineRenderer({ element }: { element: LineElement }) {
  const isSelected = useEditorStore((s) => s.selection.includes(element.id));

  const handleEndpointDown = useCallback(
    (e: React.PointerEvent, endpoint: 1 | 2) => {
      e.stopPropagation();
      e.preventDefault();
      const store = useEditorStore.getState();
      store.setSelection([element.id]);

      const startX = endpoint === 1 ? element.x1 : element.x2;
      const startY = endpoint === 1 ? element.y1 : element.y2;
      const fixedX = endpoint === 1 ? element.x2 : element.x1;
      const fixedY = endpoint === 1 ? element.y2 : element.y1;
      const zoom = store.zoom;
      const canvasBounds = getCanvasBounds();
      const startMouse = { x: e.clientX, y: e.clientY };

      // Build snap references
      const allElements = Object.values(store.elements).filter((el) => el.id !== element.id);
      const snapXRefs: SnapRef[] = [{ pos: 0, elId: '__canvas__' }, { pos: canvasBounds.width, elId: '__canvas__' }, { pos: canvasBounds.width / 2, elId: '__canvas__' }];
      const snapYRefs: SnapRef[] = [{ pos: 0, elId: '__canvas__' }, { pos: canvasBounds.height, elId: '__canvas__' }, { pos: canvasBounds.height / 2, elId: '__canvas__' }];
      for (const el of allElements) {
        if (el.type === 'guideline') {
          if (el.orientation === 'vertical') snapXRefs.push({ pos: el.position, elId: el.id });
          else snapYRefs.push({ pos: el.position, elId: el.id });
        } else if (el.type === 'text' || el.type === 'image' || el.type === 'box') {
          snapXRefs.push({ pos: el.x, elId: el.id }, { pos: el.x + el.width, elId: el.id }, { pos: el.x + el.width / 2, elId: el.id });
          snapYRefs.push({ pos: el.y, elId: el.id }, { pos: el.y + el.height, elId: el.id }, { pos: el.y + el.height / 2, elId: el.id });
        } else if (el.type === 'line') {
          snapXRefs.push({ pos: el.x1, elId: el.id }, { pos: el.x2, elId: el.id });
          snapYRefs.push({ pos: el.y1, elId: el.id }, { pos: el.y2, elId: el.id });
        }
      }

      const onMove = (me: PointerEvent) => {
        const dx = Math.round((me.clientX - startMouse.x) / zoom);
        const dy = Math.round((me.clientY - startMouse.y) / zoom);
        let newX = startX + dx;
        let newY = startY + dy;

        // Horizontal/vertical snap
        const angle = getAngle(fixedX, fixedY, newX, newY);
        if (Math.abs(angle) < H_SNAP_ANGLE || Math.abs(angle - 180) < H_SNAP_ANGLE) {
          newY = fixedY; // snap to horizontal
        } else if (Math.abs(angle - 90) < H_SNAP_ANGLE) {
          newX = fixedX; // snap to vertical
        }

        // Edge snap
        const sx = findSnapX(newX, snapXRefs);
        const sy = findSnapX(newY, snapYRefs);
        const targets: string[] = [];
        if (sx) { newX += sx.offset; targets.push(sx.elId); }
        if (sy) { newY += sy.offset; targets.push(sy.elId); }

        // Clamp
        newX = Math.max(0, Math.min(canvasBounds.width, newX));
        newY = Math.max(0, Math.min(canvasBounds.height, newY));

        store.setSnapTargets(targets.length > 0 ? [...new Set(targets)] : []);

        const patch = endpoint === 1 ? { x1: newX, y1: newY } : { x2: newX, y2: newY };
        useEditorStore.getState().updateElement(element.id, patch);
      };

      const onUp = () => {
        useEditorStore.getState().pushHistory();
        useEditorStore.getState().setSnapTargets([]);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    },
    [element.id, element.x1, element.y1, element.x2, element.y2],
  );

  const dashArray = element.lineStyle === 'dashed' ? `${element.thickness * 4} ${element.thickness * 2}` : element.lineStyle === 'dotted' ? `${element.thickness} ${element.thickness * 2}` : 'none';

  const handleLineClick = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const store = useEditorStore.getState();
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      store.toggleSelection(element.id);
    } else {
      store.setSelection([element.id]);
    }
  }, [element.id]);

  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
      data-testid={`element-${element.id}`}
    >
      {/* Invisible wider hit area for easier click selection */}
      <line
        x1={element.x1} y1={element.y1} x2={element.x2} y2={element.y2}
        stroke="transparent"
        strokeWidth={Math.max(element.thickness, 8)}
        strokeLinecap="round"
        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        onPointerDown={handleLineClick}
      />
      {/* Visible line */}
      <line
        x1={element.x1} y1={element.y1} x2={element.x2} y2={element.y2}
        stroke={element.color}
        strokeWidth={element.thickness}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
      {/* Clickable endpoint handles */}
      {isSelected && (
        <>
          <circle cx={element.x1} cy={element.y1} r={6} fill="white" stroke="#2563eb" strokeWidth={1.5}
            style={{ cursor: 'move', pointerEvents: 'auto' }}
            onPointerDown={(e) => handleEndpointDown(e, 1)} />
          <circle cx={element.x2} cy={element.y2} r={6} fill="white" stroke="#2563eb" strokeWidth={1.5}
            style={{ cursor: 'move', pointerEvents: 'auto' }}
            onPointerDown={(e) => handleEndpointDown(e, 2)} />
          {/* Name label */}
          <text x={(element.x1 + element.x2) / 2} y={Math.min(element.y1, element.y2) - 8}
            fill={element.color} fontSize={11} fontWeight={600} textAnchor="middle"
            style={{ pointerEvents: 'none', userSelect: 'none' }}>
            {element.name}
          </text>
        </>
      )}
    </svg>
  );
}
