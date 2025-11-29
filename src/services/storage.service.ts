import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface StorageResult {
  id: string;
  filePath: string;
  fileName: string;
  size: number;
  mimeType?: string;
  url?: string; // For cloud storage
  metadata?: Record<string, any>;
}

export interface StorageOptions {
  baseDir?: string;
  createSubdirs?: boolean;
  namingStrategy?: 'timestamp' | 'uuid' | 'original';
  overwrite?: boolean;
}

export abstract class StorageBackend {
  abstract save(
    buffer: Buffer,
    fileName: string,
    options?: StorageOptions
  ): Promise<StorageResult>;
  abstract get(filePath: string): Promise<Buffer>;
  abstract delete(filePath: string): Promise<void>;
  abstract exists(filePath: string): Promise<boolean>;
  abstract getHealthStatus(): { healthy: boolean; message?: string };
}

export class LocalStorageBackend extends StorageBackend {
  private baseDir: string;

  constructor(baseDir: string = './data/storage') {
    super();
    this.baseDir = baseDir;
  }

  async save(
    buffer: Buffer,
    fileName: string,
    options: StorageOptions = {}
  ): Promise<StorageResult> {
    const baseDir = options.baseDir || this.baseDir;
    const namingStrategy = options.namingStrategy || 'timestamp';

    // Create base directory if it doesn't exist
    await fs.mkdir(baseDir, { recursive: true });

    // Generate unique filename
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    let finalFileName: string;

    switch (namingStrategy) {
      case 'uuid':
        finalFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${extension}`;
        break;
      case 'original':
        finalFileName = fileName;
        break;
      case 'timestamp':
      default:
        finalFileName = `${baseName}_${Date.now()}${extension}`;
        break;
    }

    // Create subdirectories if requested
    let targetDir = baseDir;
    if (options.createSubdirs) {
      const date = new Date();
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      targetDir = path.join(baseDir, year, month, day);
      await fs.mkdir(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, finalFileName);

    // Check if file exists and handle overwrite
    if (!options.overwrite && (await this.exists(filePath))) {
      throw new AppError(
        `File already exists: ${filePath}`,
        409,
        'FILE_EXISTS'
      );
    }

    // Write file
    await fs.writeFile(filePath, buffer);

    // Get file stats
    const stats = await fs.stat(filePath);

    logger.debug(
      `LocalStorageBackend: Saved file ${filePath} (${stats.size} bytes)`
    );

    return {
      id: path.relative(this.baseDir, filePath),
      filePath,
      fileName: finalFileName,
      size: stats.size,
      mimeType: this.getMimeType(extension),
      metadata: {
        created: stats.birthtime,
        modified: stats.mtime,
      },
    };
  }

  async get(filePath: string): Promise<Buffer> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.baseDir, filePath);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      throw new AppError(`File not found: ${filePath}`, 404, 'FILE_NOT_FOUND');
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.baseDir, filePath);

    try {
      await fs.unlink(fullPath);
      logger.debug(`LocalStorageBackend: Deleted file ${fullPath}`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new AppError(
          `File not found: ${filePath}`,
          404,
          'FILE_NOT_FOUND'
        );
      }
      throw new AppError(
        `Failed to delete file: ${filePath}`,
        500,
        'DELETE_FAILED'
      );
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.baseDir, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getHealthStatus() {
    // Check if base directory is accessible
    return {
      healthy: true, // Local filesystem is always accessible in this context
      message: `Base directory: ${this.baseDir}`,
    };
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }
}

export class StorageService {
  private backend: StorageBackend;
  private defaultOptions: StorageOptions;

  constructor(backend?: StorageBackend, defaultOptions: StorageOptions = {}) {
    this.backend = backend || new LocalStorageBackend();
    this.defaultOptions = {
      createSubdirs: false,
      namingStrategy: 'timestamp',
      overwrite: false,
      ...defaultOptions,
    };
  }

  /**
   * Save a file to storage
   */
  async save(
    buffer: Buffer,
    fileName: string,
    options: StorageOptions = {}
  ): Promise<StorageResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    return this.backend.save(buffer, fileName, mergedOptions);
  }

  /**
   * Save an image with specific options optimized for images
   */
  async saveImage(
    buffer: Buffer,
    fileName: string,
    options: StorageOptions = {}
  ): Promise<StorageResult> {
    const imageOptions = {
      ...this.defaultOptions,
      createSubdirs: true, // Organize images by date
      ...options,
    };

    return this.backend.save(buffer, fileName, imageOptions);
  }

  /**
   * Get a file from storage
   */
  async get(filePath: string): Promise<Buffer> {
    return this.backend.get(filePath);
  }

  /**
   * Delete a file from storage
   */
  async delete(filePath: string): Promise<void> {
    return this.backend.delete(filePath);
  }

  /**
   * Check if a file exists in storage
   */
  async exists(filePath: string): Promise<boolean> {
    return this.backend.exists(filePath);
  }

  /**
   * Get storage health status
   */
  getHealthStatus() {
    return this.backend.getHealthStatus();
  }

  /**
   * Set a different storage backend
   */
  setBackend(backend: StorageBackend): void {
    this.backend = backend;
  }

  /**
   * Get the current backend
   */
  getBackend(): StorageBackend {
    return this.backend;
  }
}

// Export singleton instance
export const storageService = new StorageService();
