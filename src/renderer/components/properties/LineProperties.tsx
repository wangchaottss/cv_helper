import React from 'react';
import type { LineElement, LineStyle } from '../../types/elements';

export default function LineProperties({ element, onUpdate }: { element: LineElement; onUpdate: (p: Partial<LineElement>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} className="w-8 h-8 rounded border border-gray-300" />
          <input type="text" value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded" />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Style</label>
        <div className="flex gap-1">
          {(['solid', 'dashed', 'dotted'] as LineStyle[]).map((s) => (
            <button key={s} onClick={() => onUpdate({ lineStyle: s })}
              className={`flex-1 px-2 py-1 text-xs rounded border capitalize ${
                element.lineStyle === s ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Thickness</label>
        <input type="number" value={element.thickness} min={1} max={20}
          onChange={(e) => onUpdate({ thickness: Math.max(1, parseInt(e.target.value) || 1) })}
          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded" />
        <span className="text-xs text-gray-400 ml-1">px</span>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">Name</label>
        <p className="text-sm text-gray-700">{element.name}</p>
      </div>
    </div>
  );
}
