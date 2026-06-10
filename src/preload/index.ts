import { contextBridge, ipcRenderer } from 'electron';
import type { SystemFont } from '../renderer/types/elements';

const electronAPI = {
  // Fonts
  getSystemFonts: (): Promise<SystemFont[]> => ipcRenderer.invoke('get-system-fonts'),

  // Dialogs
  showSaveDialog: (options?: { defaultPath?: string }): Promise<string | null> =>
    ipcRenderer.invoke('dialog:showSaveDialog', options),
  showOpenDialog: (options?: { filters?: Array<{ name: string; extensions: string[] }> }): Promise<string | null> =>
    ipcRenderer.invoke('dialog:showOpenDialog', options),

  // File I/O
  writeHtml: (path: string, html: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('file:writeHtml', path, html),
  readHtml: (path: string): Promise<string> =>
    ipcRenderer.invoke('file:readHtml', path),
  readImage: (path: string): Promise<string | null> =>
    ipcRenderer.invoke('file:readImage', path),

  // Font embedding
  readBuiltInFont: (family: string, weight: number): Promise<string | null> =>
    ipcRenderer.invoke('font:readBuiltInFont', family, weight),

  // PDF Export
  exportPDF: (elementsJson: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('pdf:export', elementsJson),

  // Menu event listeners
  onMenuCommand: (callback: (command: string) => void): (() => void) => {
    const commands = ['menu-save', 'menu-open', 'menu-export-pdf', 'menu-undo', 'menu-redo', 'menu-delete', 'menu-new'];
    const handlers = commands.map((cmd) => {
      const handler = () => callback(cmd);
      ipcRenderer.on(cmd, handler);
      return { cmd, handler };
    });
    // Return cleanup function
    return () => {
      for (const { cmd, handler } of handlers) {
        ipcRenderer.removeListener(cmd, handler);
      }
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type { SystemFont };
