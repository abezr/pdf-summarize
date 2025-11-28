import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';

/**
 * Run Tesseract OCR on an image buffer and return extracted text.
 * Requires the `tesseract` binary to be installed and on PATH.
 */
export async function ocrImageToText(
  imageBuffer: Buffer,
  lang: string = process.env.OCR_LANG || 'eng'
): Promise<string> {
  const tmpDir = path.resolve('./temp/ocr');
  await fs.mkdir(tmpDir, { recursive: true });

  const timestamp = Date.now();
  const inputPath = path.join(tmpDir, `ocr-${timestamp}.png`);
  const outputBase = path.join(tmpDir, `ocr-${timestamp}`);

  await fs.writeFile(inputPath, imageBuffer);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('tesseract', [inputPath, outputBase, '-l', lang, '--dpi', '150']);
    let stderr = '';

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `tesseract exited with code ${code}`));
      }
    });
  });

  const textPath = `${outputBase}.txt`;
  const text = await fs.readFile(textPath, 'utf8').catch(() => '');

  // Best-effort cleanup
  await fs.unlink(inputPath).catch(() => undefined);
  await fs.unlink(textPath).catch(() => undefined);

  const cleaned = text.trim();
  if (!cleaned) {
    logger.debug('OCR produced empty text');
  }
  return cleaned;
}
