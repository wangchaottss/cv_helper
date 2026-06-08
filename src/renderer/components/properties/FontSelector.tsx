import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getBuiltInFonts } from '../../utils/fontRegistry';
import type { SystemFont } from '../../types/elements';

interface FontOption {
  family: string;
  source: 'built-in' | 'system';
}

interface FontSelectorProps {
  value: string;
  onChange: (fontFamily: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function FontSelector({ value, onChange, disabled, placeholder }: FontSelectorProps) {
  const [systemFonts, setSystemFonts] = useState<SystemFont[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFonts() {
      try {
        if (window.electronAPI?.getSystemFonts) {
          const fonts = await window.electronAPI.getSystemFonts();
          setSystemFonts(fonts);
        }
      } catch {
        // Electron API not available (e.g., in tests)
      } finally {
        setLoading(false);
      }
    }
    loadFonts();
  }, []);

  const fontOptions: FontOption[] = useMemo(() => {
    const builtIn = getBuiltInFonts().map((f) => ({
      family: f.family,
      source: 'built-in' as const,
    }));

    const system = systemFonts
      .filter((f) => {
        // Filter out fonts already in built-in list
        const builtInNames = new Set(builtIn.map((b) => b.family.toLowerCase()));
        return !builtInNames.has(f.family.toLowerCase());
      })
      .map((f) => ({
        family: f.family,
        source: 'system' as const,
      }));

    return [...builtIn, ...system];
  }, [systemFonts]);

  const filteredOptions = useMemo(() => {
    if (!search) return fontOptions;
    const q = search.toLowerCase();
    return fontOptions.filter((f) => f.family.toLowerCase().includes(q));
  }, [fontOptions, search]);

  const handleSelect = useCallback(
    (family: string) => {
      onChange(family);
      setIsOpen(false);
      setSearch('');
    },
    [onChange],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      setIsOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div className="relative" data-testid="font-selector" onKeyDown={handleKeyDown}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between px-2 py-1.5 text-sm border rounded ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 cursor-pointer'
        }`}
        data-testid="font-selector-trigger"
      >
        <span style={{ fontFamily: value }} className="truncate">
          {placeholder || value || 'Select font...'}
        </span>
        <svg className="w-3.5 h-3.5 ml-1 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 flex flex-col"
          onClick={(e) => e.stopPropagation()}
          data-testid="font-selector-dropdown"
        >
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fonts..."
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-400"
              autoFocus
              data-testid="font-search-input"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && <p className="text-xs text-gray-400 p-2">Loading fonts...</p>}
            {filteredOptions.length === 0 && !loading && (
              <p className="text-xs text-gray-400 p-2">No fonts found</p>
            )}
            {filteredOptions.map((font, i) => {
              const isBuiltIn = font.source === 'built-in';
              // Show separator before first system font
              const prevIsSystem = i > 0 && filteredOptions[i - 1].source === 'built-in';
              const isFirstSystem = !prevIsSystem && font.source === 'system' && i > 0;

              return (
                <React.Fragment key={font.family}>
                  {isFirstSystem && (
                    <div className="px-2 py-0.5 text-[10px] text-gray-400 uppercase bg-gray-50 border-y border-gray-100">
                      System Fonts
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelect(font.family)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 text-sm text-left hover:bg-blue-50 ${
                      value === font.family ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span style={{ fontFamily: font.family }} className="truncate">
                      {font.family}
                    </span>
                    {isBuiltIn && (
                      <span className="text-[10px] text-blue-500 bg-blue-50 px-1 rounded ml-1 flex-shrink-0">
                        Built-in
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
