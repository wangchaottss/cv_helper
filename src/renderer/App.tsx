import React, { useEffect, useCallback } from 'react';
import AppLayout from './components/layout/AppLayout';
import { registerBuiltInFonts } from './utils/fontRegistry';
import { useKeyboard } from './hooks/useKeyboard';
import { useEditorStore } from './store/editorStore';
import { serializeToHTML, deserializeFromHTML } from './utils/serialization';
import { detectUsedFonts, generateFontEmbedCSS } from './utils/fontUsage';
import { buildPrintHTML } from './utils/printHtml';
import type { CanvasElement } from './types/elements';

export default function App() {
  useEffect(() => {
    registerBuiltInFonts();
  }, []);

  useKeyboard();

  // Save handler
  const handleSave = useCallback(async () => {
    const state = useEditorStore.getState();
    const elementList = Object.values(state.elements) as CanvasElement[];
    if (elementList.length === 0) return;

    // Check for system fonts
    const usedFonts = detectUsedFonts(elementList);
    const systemFonts = usedFonts.filter((f) => f.source === 'system');

    if (systemFonts.length > 0 && window.electronAPI) {
      const fontNames = systemFonts.map((f) => f.family).join(', ');
      // Soft warning — in real Electron, we'd use dialog.showMessageBox
      console.warn(
        `Document uses system fonts that may not be available on other devices: ${fontNames}`,
      );
    }

    // Generate font embed CSS (placeholder for now — real woff2 embedding in future optimization)
    const fontDataUrls: Record<string, string> = {};
    const fontCSS = generateFontEmbedCSS(usedFonts, fontDataUrls);

    const html = serializeToHTML(elementList, {
      version: '0.1.0',
      timestamp: Date.now(),
      zoom: state.zoom,
    }, fontCSS);

    if (window.electronAPI) {
      const filePath = await window.electronAPI.showSaveDialog({ defaultPath: 'resume.html' });
      if (filePath) {
        const result = await window.electronAPI.writeHtml(filePath, html);
        if (!result.success) {
          console.error('Save failed:', result.error);
        }
      }
    }
  }, []);

  // Load handler
  const handleOpen = useCallback(async () => {
    if (!window.electronAPI) return;

    const filePath = await window.electronAPI.showOpenDialog({
      filters: [{ name: 'HTML Files', extensions: ['html'] }],
    });
    if (!filePath) return;

    const html = await window.electronAPI.readHtml(filePath);
    const result = deserializeFromHTML(html);
    if (!result) {
      console.error('Failed to parse HTML file');
      return;
    }

    const store = useEditorStore.getState();
    // Clear existing elements and load new ones
    store.removeElements(Object.keys(store.elements));
    for (const el of result.elements) {
      store.addElement(el);
    }
    if (result.meta.zoom) {
      store.setZoom(result.meta.zoom);
    }
  }, []);

  // PDF export handler
  const handleExportPDF = useCallback(async () => {
    const state = useEditorStore.getState();
    const elementList = Object.values(state.elements) as CanvasElement[];
    if (elementList.length === 0) return;

    const usedFonts = detectUsedFonts(elementList);
    const fontDataUrls: Record<string, string> = {};
    const fontCSS = generateFontEmbedCSS(usedFonts, fontDataUrls);

    const printHTML = buildPrintHTML(elementList, fontCSS);

    if (window.electronAPI) {
      const result = await window.electronAPI.exportPDF(printHTML);
      if (result.error) {
        console.error('PDF export failed:', result.error);
      }
    }
  }, []);

  // Listen for menu events from Electron main process
  useEffect(() => {
    if (!window.electronAPI?.onMenuCommand) return;

    const cleanup = window.electronAPI.onMenuCommand((command: string) => {
      switch (command) {
        case 'menu-save':
          handleSave();
          break;
        case 'menu-open':
          handleOpen();
          break;
        case 'menu-undo':
          useEditorStore.getState().undo();
          break;
        case 'menu-redo':
          useEditorStore.getState().redo();
          break;
        case 'menu-delete': {
          const sel = useEditorStore.getState().selection;
          if (sel.length > 0) useEditorStore.getState().removeElements(sel);
          break;
        }
        case 'menu-export-pdf':
          handleExportPDF();
          break;
      }
    });

    return cleanup;
  }, [handleSave, handleOpen, handleExportPDF]);

  return <AppLayout />;
}
