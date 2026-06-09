import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { exportToPDF } from './pdfExport';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
  app.setAppUserModelId(app.name);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CV Helper — Resume Builder',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // In dev mode, load electron-vite dev server URL
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    // In production, load the built HTML file
    const rendererPath = join(__dirname, '../../dist/renderer/index.html');
    mainWindow.loadFile(rendererPath);
  }

  // Build application menu
  buildMenu();
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu-new') },
        { type: 'separator' },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save'),
        },
        { type: 'separator' },
        {
          label: 'Export PDF...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu-export-pdf'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow?.webContents.send('menu-undo'),
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => mainWindow?.webContents.send('menu-redo'),
        },
        { type: 'separator' },
        { label: 'Delete', accelerator: 'Backspace', click: () => mainWindow?.webContents.send('menu-delete') },
        { type: 'separator' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About CV Helper',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'About CV Helper',
              message: 'CV Helper — Resume Builder',
              detail: 'Version 0.1.0\nA graphical resume/CV builder for macOS.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================================
// IPC Handlers
// ============================================================

// System font enumeration
ipcMain.handle('get-system-fonts', async () => {
  try {
    // Dynamic import of font-list to avoid issues in dev
    const fontList = await import('font-list');
    const fonts = await fontList.getFonts();
    // Deduplicate by family name
    const seen = new Set<string>();
    const result: Array<{
      family: string;
      style: string;
      weight: number;
      italic: boolean;
      postscriptName: string;
    }> = [];

    for (const font of fonts) {
      const family = font.replace(/Neue\s+/g, 'Neue ').trim();
      if (!seen.has(family)) {
        seen.add(family);
        result.push({
          family,
          style: 'Regular',
          weight: 400,
          italic: false,
          postscriptName: family,
        });
      }
    }
    return result;
  } catch (err) {
    console.error('Failed to get system fonts:', err);
    return [];
  }
});

// File dialog: Save
ipcMain.handle('dialog:showSaveDialog', async (_event, options?: { defaultPath?: string }) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options?.defaultPath || 'resume.html',
    filters: [{ name: 'HTML Files', extensions: ['html'] }],
  });
  return result.canceled ? null : result.filePath;
});

// File dialog: Open
ipcMain.handle('dialog:showOpenDialog', async (_event, options?: { filters?: Array<{ name: string; extensions: string[] }> }) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [{ name: 'HTML Files', extensions: ['html'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// File write: HTML
ipcMain.handle('file:writeHtml', async (_event, filePath: string, html: string) => {
  try {
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, html, 'utf-8');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
});

// File read: HTML
ipcMain.handle('file:readHtml', async (_event, filePath: string) => {
  const content = await readFile(filePath, 'utf-8');
  return content;
});

// Read built-in font file
ipcMain.handle('font:readBuiltInFont', async (_event, family: string, weight: number) => {
  try {
    const fontMap: Record<string, Record<number, string>> = {
      'Source Han Sans SC': {
        400: 'SourceHanSansSC-Regular.woff2',
        700: 'SourceHanSansSC-Bold.woff2',
      },
      'Source Han Serif SC': {
        400: 'SourceHanSerifSC-Regular.woff2',
        700: 'SourceHanSerifSC-Bold.woff2',
      },
      'Inter': {
        400: 'Inter-Regular.woff2',
        700: 'Inter-Bold.woff2',
      },
    };

    const fontForWeight = fontMap[family];
    if (!fontForWeight) return null;

    const fileName = fontForWeight[weight];
    if (!fileName) return null;

    const fontPath = join(app.getAppPath(), 'src', 'assets', 'fonts', fileName);
    const buffer = await readFile(fontPath);
    return `data:font/woff2;base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('Failed to read built-in font:', err);
    return null;
  }
});

// PDF export
ipcMain.handle('pdf:export', async (_event, htmlString: string) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  return exportToPDF(htmlString, mainWindow);
});

// ============================================================
// App lifecycle
// ============================================================

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
