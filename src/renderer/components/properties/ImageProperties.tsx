import React, { useCallback } from 'react';
import type { ImageElement, ImageObjectFit } from '../../types/elements';

interface ImagePropertiesProps {
  element: ImageElement;
  onUpdate: (patch: Partial<ImageElement>) => void;
  disabled?: boolean;
}

export default function ImageProperties({ element, onUpdate, disabled }: ImagePropertiesProps) {
  const handleObjectFitChange = useCallback(
    (fit: ImageObjectFit) => {
      onUpdate({ objectFit: fit });
    },
    [onUpdate],
  );

  const handleImportImage = useCallback(async () => {
    if (!window.electronAPI) return;

    const filePath = await window.electronAPI.showOpenDialog({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
    });
    if (!filePath) return;

    const dataUrl = await window.electronAPI.readImage(filePath);
    if (dataUrl) {
      onUpdate({ src: dataUrl });
    }
  }, [onUpdate]);

  return (
    <div className="space-y-4" data-testid="image-properties">
      {/* Import Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleImportImage}
        className={`w-full py-2 text-sm rounded border ${
          disabled
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
        }`}
      >
        {element.src ? 'Replace Image' : 'Import Image'}
      </button>

      {/* Image Preview */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Preview
        </label>
        <div className="w-full h-32 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden">
          {element.src ? (
            <img src={element.src} alt="Preview" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">No image loaded</span>
          )}
        </div>
      </div>

      {/* Object Fit */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Fit
        </label>
        <div className="flex gap-1">
          {(['fill', 'contain', 'cover'] as ImageObjectFit[]).map((fit) => (
            <button
              key={fit}
              type="button"
              disabled={disabled}
              onClick={() => handleObjectFitChange(fit)}
              className={`flex-1 px-2 py-1 text-xs rounded border capitalize ${
                element.objectFit === fit
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : disabled
                    ? 'bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {fit}
            </button>
          ))}
        </div>
      </div>

      {/* Image Size Info */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Size
        </label>
        <p className="text-xs text-gray-500">
          {Math.round(element.width)} × {Math.round(element.height)} px
        </p>
      </div>

      {/* Position */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Position
        </label>
        <div className="flex gap-2 text-xs text-gray-500">
          <span>X: {Math.round(element.x)}</span>
          <span>Y: {Math.round(element.y)}</span>
        </div>
      </div>

      {/* ID display */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 truncate" title={element.id}>
          ID: {element.id}
        </p>
      </div>
    </div>
  );
}
