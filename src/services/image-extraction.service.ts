import { promises as fs } from 'fs';
import * as path from 'path';
import { fromPath } from 'pdf2pic';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { storageService } from './storage.service';

export interface ExtractedImage {
  id: string;
  pageNumber: number;
  imageNumber: number; // Index of image on the page
  filePath: string; // Local file path
  fileName: string; // Original filename
  format: 'png' | 'jpeg' | 'tiff';
  width: number;
  height: number;
  size: number; // File size in bytes
  dpi: number;
  method: 'pdf2pic' | 'pdfjs' | 'fallback';
  metadata?: {
    colorSpace?: string;
    hasAlpha?: boolean;
    compression?: string;
    storageId?: string;
    mimeType?: string;
    [key: string]: any; // Allow additional metadata
  };
}

export interface ImageExtractionOptions {
  pages?: number | number[]; // Specific pages to scan (default: all)
  format?: 'png' | 'jpeg' | 'tiff'; // Output format (default: png)
  dpi?: number; // Resolution (default: 150)
  quality?: number; // JPEG quality 1-100 (default: 90)
  maxWidth?: number; // Maximum width constraint
  maxHeight?: number; // Maximum height constraint
}

export class ImageExtractionService {
  private pdf2picOptions: any = null;

  constructor() {
    this.initializeLibraries();
  }

  private initializeLibraries() {
    try {
      // Configure pdf2pic with default options
      this.pdf2picOptions = {
        density: 150, // DPI
        saveFilename: 'page',
        savePath: './temp',
        format: 'png',
        width: 2000, // Max width
        height: 2000, // Max height
      };

      logger.info('ImageExtractionService: Initialized with pdf2pic support');
    } catch (error) {
      logger.error(
        'ImageExtractionService: Failed to initialize libraries:',
        error
      );
      throw new AppError(
        'Failed to initialize image extraction libraries',
        500,
        'IMAGE_EXTRACTION_INIT_FAILED'
      );
    }
  }

  /**
   * Extract images from a PDF file by converting pages to images
   */
  async extractImages(
    pdfPath: string,
    outputDir: string,
    options: ImageExtractionOptions = {}
  ): Promise<ExtractedImage[]> {
    const startTime = Date.now();

    try {
      // Validate inputs
      await fs.access(pdfPath);
      await fs.mkdir(outputDir, { recursive: true });

      const images: ExtractedImage[] = [];

      // Configure extraction options
      const config = {
        density: options.dpi || 150,
        format: options.format || 'png',
        quality: options.quality || 90,
        width: options.maxWidth || 2000,
        height: options.maxHeight || 2000,
        ...this.pdf2picOptions,
      };

      // Validate format
      const supportedFormats = ['png', 'jpeg', 'tiff'];
      if (!supportedFormats.includes(config.format)) {
        throw new AppError(
          `Unsupported image format: ${config.format}. Supported: ${supportedFormats.join(', ')}`,
          400,
          'UNSUPPORTED_FORMAT'
        );
      }

      // Validate DPI range
      if (config.density < 72 || config.density > 600) {
        logger.warn(
          `ImageExtractionService: DPI ${config.density} is outside recommended range 72-600`
        );
      }

      // Determine pages to process
      let pages: number[] = [];
      if (options.pages) {
        pages = Array.isArray(options.pages) ? options.pages : [options.pages];
      }

      // Use pdf2pic to convert PDF pages to images
      const convert = fromPath(pdfPath, config);

      // Determine which pages to process
      let pagesToProcess: number[];
      if (pages.length > 0) {
        pagesToProcess = pages;
      } else {
        // Process all pages
        const pageCount = await this.getPageCount(pdfPath);
        pagesToProcess = Array.from({ length: pageCount }, (_, i) => i + 1);
        logger.info(
          `ImageExtractionService: Processing all ${pageCount} pages`
        );
      }

      // Validate page numbers
      const maxPages = await this.getPageCount(pdfPath);
      const validPages = pagesToProcess.filter(
        (pageNum) => pageNum >= 1 && pageNum <= maxPages
      );

      if (validPages.length !== pagesToProcess.length) {
        const invalidPages = pagesToProcess.filter(
          (pageNum) => pageNum < 1 || pageNum > maxPages
        );
        logger.warn(
          `ImageExtractionService: Skipping invalid page numbers: ${invalidPages.join(', ')} (valid range: 1-${maxPages})`
        );
      }

      // Process pages with progress tracking
      let processedCount = 0;
      const totalPages = validPages.length;

      for (const pageNum of validPages) {
        try {
          logger.debug(
            `ImageExtractionService: Processing page ${pageNum}/${totalPages}`
          );
          const result = await convert(pageNum);

          if (result && result.path) {
            const imageInfo = await this.processConvertedPage(
              result,
              pageNum,
              0, // Single image per page for now
              outputDir,
              config
            );
            if (imageInfo) {
              images.push(imageInfo);
              processedCount++;
            }
          } else {
            logger.warn(
              `ImageExtractionService: No result returned for page ${pageNum}`
            );
          }
        } catch (error) {
          logger.error(
            `ImageExtractionService: Failed to extract image from page ${pageNum}:`,
            error
          );
          // Continue processing other pages
        }
      }

      logger.info(
        `ImageExtractionService: Successfully processed ${processedCount}/${totalPages} pages`
      );

      const duration = Date.now() - startTime;
      logger.info(
        `ImageExtractionService: Extracted ${images.length} images in ${duration}ms`
      );

      return images;
    } catch (error) {
      logger.error('ImageExtractionService: Image extraction failed:', error);
      throw new AppError(
        `Image extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'IMAGE_EXTRACTION_FAILED'
      );
    }
  }

  /**
   * Process a converted page result into ExtractedImage format
   */
  private async processConvertedPage(
    result: any,
    pageNumber: number,
    imageNumber: number,
    outputDir: string,
    config: any
  ): Promise<ExtractedImage | null> {
    try {
      // pdf2pic saves the file directly, result.path contains the file path
      const sourcePath = result.path;

      if (!sourcePath || !(await this.fileExists(sourcePath))) {
        logger.warn(
          'ImageExtractionService: Source image file not found or invalid result'
        );
        return null;
      }

      // Read the generated image file
      const imageBuffer = await fs.readFile(sourcePath);

      // Generate filename for storage
      const timestamp = Date.now();
      const fileName = `page_${pageNumber}_image_${imageNumber}_${timestamp}.${config.format}`;

      // Save to storage service
      const storageResult = await storageService.saveImage(
        imageBuffer,
        fileName,
        {
          baseDir: outputDir,
          createSubdirs: true,
          namingStrategy: 'original', // Use our generated filename
        }
      );

      // Clean up the temporary file created by pdf2pic
      try {
        await fs.unlink(sourcePath);
      } catch (cleanupError) {
        logger.warn(
          'ImageExtractionService: Failed to clean up temporary file:',
          cleanupError
        );
      }

      // Get image metadata using sharp
      let metadata;
      try {
        metadata = await sharp(imageBuffer).metadata();
      } catch (metadataError) {
        logger.warn(
          'ImageExtractionService: Failed to extract image metadata:',
          metadataError
        );
        metadata = {}; // Continue with empty metadata
      }

      // Create the extracted image object
      const extractedImage: ExtractedImage = {
        id: `image_${pageNumber}_${imageNumber}_${timestamp}`,
        pageNumber,
        imageNumber,
        filePath: storageResult.filePath,
        fileName: storageResult.fileName,
        format: config.format as 'png' | 'jpeg' | 'tiff',
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: storageResult.size,
        dpi: config.density,
        method: 'pdf2pic',
        metadata: {
          colorSpace: metadata.space,
          hasAlpha: metadata.hasAlpha || false,
          compression: metadata.compression,
          storageId: storageResult.id,
          mimeType: storageResult.mimeType,
        },
      };

      logger.debug(
        `ImageExtractionService: Created image ${extractedImage.id} (${extractedImage.width}x${extractedImage.height}, ${extractedImage.size} bytes)`
      );

      return extractedImage;
    } catch (error) {
      logger.error(
        'ImageExtractionService: Failed to process converted page:',
        error
      );
      return null;
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get page count using file size estimation
   * Note: For accurate page counting, consider using pdfjs-dist with proper Jest configuration
   */
  private async getPageCount(pdfPath: string): Promise<number> {
    try {
      const stats = await fs.stat(pdfPath);

      // Improved estimation based on typical PDF sizes:
      // - Small documents (1-10 pages): ~20-100KB per page
      // - Medium documents (10-50 pages): ~50-200KB per page
      // - Large documents (50+ pages): ~100-500KB per page

      let estimatedPages: number;
      const fileSizeKB = stats.size / 1024;

      if (fileSizeKB < 500) {
        // Small document
        estimatedPages = Math.max(1, Math.ceil(fileSizeKB / 50));
      } else if (fileSizeKB < 5000) {
        // Medium document
        estimatedPages = Math.max(1, Math.ceil(fileSizeKB / 150));
      } else {
        // Large document
        estimatedPages = Math.max(1, Math.ceil(fileSizeKB / 300));
      }

      // Cap at reasonable limits
      estimatedPages = Math.min(estimatedPages, 500);

      logger.debug(
        `ImageExtractionService: Estimated ${estimatedPages} pages for ${fileSizeKB.toFixed(1)}KB file`
      );
      return estimatedPages;
    } catch (error) {
      logger.error('ImageExtractionService: Failed to get page count:', error);
      return 1; // Safe fallback
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      pdf2picAvailable: !!this.pdf2picOptions,
      sharpAvailable: true, // sharp is imported
      overallHealthy: !!this.pdf2picOptions,
    };
  }
}

// Export singleton instance
export const imageExtractionService = new ImageExtractionService();
