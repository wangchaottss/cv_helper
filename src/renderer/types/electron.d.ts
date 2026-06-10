import type { SystemFont } from './elements';

export interface ElectronAPI {
  getSystemFonts: () => Promise<SystemFont[]>;
  showSaveDialog: (options?: { defaultPath?: string }) => Promise<string | null>;
  showOpenDialog: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>;
  writeHtml: (path: string, html: string) => Promise<{ success: boolean; error?: string }>;
  readHtml: (path: string) => Promise<string>;
  readImage: (path: string) => Promise<string | null>;
  readBuiltInFont: (family: string, weight: number) => Promise<string | null>;
  exportPDF: (elementsJson: string) => Promise<{ success: boolean; error?: string }>;
  onMenuCommand: (callback: (command: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
