import React from 'react';
import type { BoxElement, BorderStyle } from '../../types/elements';

export default function BoxProperties({ element, onUpdate }: { element: BoxElement; onUpdate: (p: Partial<BoxElement>) => void }) {
  const maxRadius = Math.min(element.width, element.height) / 2;

  return (
    <div className="space-y-4">
      {/* Border style */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Border</label>
        <div className="flex gap-1">
          {(['solid', 'dashed', 'none'] as BorderStyle[]).map((s) => (
            <button key={s} onClick={() => onUpdate({ borderStyle: s })}
              className={`flex-1 px-2 py-1 text-xs rounded border capitalize ${
                element.borderStyle === s ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Border color */}
      {element.borderStyle !== 'none' && (
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Border Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={element.borderColor} onChange={(e) => onUpdate({ borderColor: e.target.value })} className="w-8 h-8 rounded border border-gray-300" />
            <input type="text" value={element.borderColor} onChange={(e) => onUpdate({ borderColor: e.target.value })} className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded" />
          </div>
        </div>
      )}

      {/* Border width */}
      {element.borderStyle !== 'none' && (
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Border Width</label>
          <input type="number" value={element.borderWidth} min={1} max={20}
            onChange={(e) => onUpdate({ borderWidth: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
          <span className="text-xs text-gray-400 ml-1">px</span>
        </div>
      )}

      {/* Border radius */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Corner Radius</label>
        <div className="flex items-center gap-1">
          <input type="number" value={Math.round(element.borderRadius)} min={0} max={Math.floor(maxRadius)}
            onChange={(e) => {
              let v = parseInt(e.target.value) || 0;
              if (v > maxRadius) v = Math.floor(maxRadius);
              if (v < 0) v = 0;
              onUpdate({ borderRadius: v });
            }}
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
          <span className="text-xs text-gray-400">px (max {Math.floor(maxRadius)})</span>
        </div>
      </div>

      {/* Fill color */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Fill</label>
        <div className="flex items-center gap-2">
          <input type="color" value={element.fillColor || '#ffffff'} onChange={(e) => onUpdate({ fillColor: e.target.value })} className="w-8 h-8 rounded border border-gray-300" />
          <input type="text" value={element.fillColor} onChange={(e) => onUpdate({ fillColor: e.target.value })} className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded" />
          <button onClick={() => onUpdate({ fillColor: 'transparent' })} className="text-[10px] px-1.5 py-1 border border-gray-300 rounded hover:bg-gray-50">✕</button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Name</label>
        <p className="text-sm text-gray-700">{element.name}</p>
      </div>
    </div>
  );
}
