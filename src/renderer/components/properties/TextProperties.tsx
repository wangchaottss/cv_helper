import React, { useCallback } from 'react';
import type { TextElement } from '../../types/elements';
import FontSelector from './FontSelector';

interface TextPropertiesProps {
  element: TextElement;
  onUpdate: (patch: Partial<TextElement>) => void;
  disabled?: boolean;
}

export default function TextProperties({ element, onUpdate, disabled }: TextPropertiesProps) {
  const handleChange = useCallback(
    (field: keyof TextElement, value: string | number) => {
      onUpdate({ [field]: value });
    },
    [onUpdate],
  );

  return (
    <div className="space-y-4" data-testid="text-properties">
      {/* Font Family */}
      <PropertyGroup label="Font">
        <FontSelector
          value={element.defaultFontFamily}
          onChange={(font) => handleChange('defaultFontFamily', font)}
          disabled={disabled}
        />
      </PropertyGroup>

      {/* Font Size */}
      <PropertyGroup label="Size">
        <div className="flex items-center gap-1">
          <NumberInput
            value={element.defaultFontSize}
            min={8}
            max={72}
            onChange={(v) => handleChange('defaultFontSize', v)}
            disabled={disabled}
          />
          <span className="text-xs text-gray-400">px</span>
        </div>
      </PropertyGroup>

      {/* Font Color */}
      <PropertyGroup label="Color">
        <ColorInput
          value={element.defaultColor}
          onChange={(v) => handleChange('defaultColor', v)}
          disabled={disabled}
        />
      </PropertyGroup>

      {/* Bold / Italic */}
      <PropertyGroup label="Style">
        <div className="flex gap-1">
          <ToggleButton
            active={element.defaultFontWeight >= 700}
            onClick={() =>
              handleChange('defaultFontWeight', element.defaultFontWeight >= 700 ? 400 : 700)
            }
            disabled={disabled}
            title="Bold"
          >
            <strong>B</strong>
          </ToggleButton>
          <ToggleButton
            active={element.defaultFontStyle === 'italic'}
            onClick={() =>
              handleChange(
                'defaultFontStyle',
                element.defaultFontStyle === 'italic' ? 'normal' : 'italic',
              )
            }
            disabled={disabled}
            title="Italic"
          >
            <em>I</em>
          </ToggleButton>
        </div>
      </PropertyGroup>

      {/* Text Alignment */}
      <PropertyGroup label="Align">
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <ToggleButton
              key={align}
              active={element.defaultTextAlign === align}
              onClick={() => handleChange('defaultTextAlign', align)}
              disabled={disabled}
              title={`Align ${align}`}
            >
              {align === 'left' ? '⫷' : align === 'center' ? '⫿' : '⫸'}
            </ToggleButton>
          ))}
        </div>
      </PropertyGroup>

      {/* Line Height */}
      <PropertyGroup label="Line Height">
        <NumberInput
          value={element.defaultLineHeight}
          min={1}
          max={3}
          step={0.1}
          onChange={(v) => handleChange('defaultLineHeight', v)}
          disabled={disabled}
        />
      </PropertyGroup>

      {/* Background Color */}
      <PropertyGroup label="Background">
        <ColorInput
          value={element.defaultBackgroundColor === 'transparent' ? '#ffffff' : element.defaultBackgroundColor}
          onChange={(v) => handleChange('defaultBackgroundColor', v)}
          disabled={disabled}
          showTransparent
        />
      </PropertyGroup>

      {/* ID display */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 truncate" title={element.id}>
          ID: {element.id}
        </p>
      </div>
    </div>
  );
}

// === Sub-components ===

function PropertyGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
      className={`w-16 px-2 py-1 text-sm border rounded text-right ${
        disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
          : 'bg-white text-gray-700 border-gray-300 focus:outline-none focus:border-blue-400'
      }`}
    />
  );
}

function ColorInput({
  value,
  onChange,
  disabled,
  showTransparent,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  showTransparent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={value.startsWith('#') ? value : '#ffffff'}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-8 h-8 rounded border cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'border-gray-300'
        }`}
      />
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 px-2 py-1 text-sm border rounded ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white text-gray-700 border-gray-300 focus:outline-none focus:border-blue-400'
        }`}
      />
      {showTransparent && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('transparent')}
          className={`text-[10px] px-1.5 py-1 rounded border ${
            disabled
              ? 'bg-gray-100 text-gray-400 border-gray-200'
              : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
          }`}
          title="Transparent"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`w-8 h-7 text-sm flex items-center justify-center rounded border ${
        disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
          : active
            ? 'bg-blue-50 text-blue-700 border-blue-300'
            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
