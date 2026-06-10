import React from 'react';
import type { GuideLineElement } from '../../types/elements';

interface Props {
  element: GuideLineElement;
  onUpdate: (patch: Partial<GuideLineElement>) => void;
}

export default function GuidelineProperties({ element, onUpdate }: Props) {
  return (
    <div className="space-y-4" data-testid="guideline-properties">
      {/* Orientation toggle */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Orientation
        </label>
        <button
          type="button"
          onClick={() =>
            onUpdate({
              orientation: element.orientation === 'horizontal' ? 'vertical' : 'horizontal',
            })
          }
          className="w-full px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          {element.orientation === 'horizontal' ? '━ Horizontal' : '┃ Vertical'}
        </button>
      </div>

      {/* Color */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={element.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={element.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
      </div>

      {/* Position */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Position
        </label>
        <p className="text-sm text-gray-700">
          {element.orientation === 'horizontal' ? 'Y' : 'X'}: {Math.round(element.position)} px
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Name
        </label>
        <p className="text-sm text-gray-700">{element.name}</p>
      </div>
    </div>
  );
}
