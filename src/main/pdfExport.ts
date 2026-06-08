import { BrowserWindow, dialog } from 'electron';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const PDF_EXPORT_TIMEOUT = 30000; // 30 seconds

/**
 * Export the given print HTML to a PDF file.
 * Creates a hidden BrowserWindow, renders the HTML, and uses printToPDF.
 */
export async function exportToPDF(
  htmlString: string,
  parentWindow: BrowserWindow,
): Promise<{ success: boolean; error?: string }> {
  // Ask user for save location first
  const saveResult = await dialog.showSaveDialog(parentWindow, {
    defaultPath: 'resume.pdf',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
  });

  if (saveResult.canceled || !saveResult.filePath) {
    return { success: false, error: 'Save cancelled' };
  }

  const outputPath = saveResult.filePath;
  const tempPath = join(tmpdir(), `cv-print-${randomUUID()}.html`);

  try {
    // Write HTML to a temporary file (avoids data: URL length limits)
    await writeFile(tempPath, htmlString, 'utf-8');

    // Create hidden window for PDF rendering
    const win = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load the temp file
    await win.loadFile(tempPath);

    // Wait for fonts to load
    try {
      await win.webContents.executeJavaScript('document.fonts.ready');
    } catch {
      // Font loading may fail; continue with fallback
    }

    // Extra delay to ensure rendering is complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate PDF
    const pdfBuffer = await win.webContents.printToPDF({
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
    });

    // Close hidden window
    win.close();

    // Write PDF to output path
    await writeFile(outputPath, pdfBuffer);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during PDF export';
    return { success: false, error: message };
  } finally {
    // Clean up temp file
    try {
      const { unlink } = await import('fs/promises');
      await unlink(tempPath);
    } catch {
      // Temp file cleanup failure is non-critical
    }
  }
}
