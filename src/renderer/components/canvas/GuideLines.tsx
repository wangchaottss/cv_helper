import React from 'react';
import { useEditorStore } from '../../store/editorStore';

const LINE_COLOR = '#4A90D9';
const LINE_STYLE: React.CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 9998,
};

export default function GuideLines() {
  const guideLines = useEditorStore((s) => s.guideLines);
  const showGuides = useEditorStore((s) => s.showGuides);

  if (!showGuides) return null;
  if (guideLines.horizontal.length === 0 && guideLines.vertical.length === 0) return null;

  return (
    <>
      {guideLines.horizontal.map((y, i) => (
        <div
          key={`h-${i}`}
          style={{
            ...LINE_STYLE,
            top: `${y}px`,
            left: 0,
            width: '100%',
            height: 0,
            borderTop: `1px dashed ${LINE_COLOR}`,
          }}
          data-testid={`guide-h-${y}`}
        />
      ))}
      {guideLines.vertical.map((x, i) => (
        <div
          key={`v-${i}`}
          style={{
            ...LINE_STYLE,
            left: `${x}px`,
            top: 0,
            height: '100%',
            width: 0,
            borderLeft: `1px dashed ${LINE_COLOR}`,
          }}
          data-testid={`guide-v-${x}`}
        />
      ))}
    </>
  );
}
