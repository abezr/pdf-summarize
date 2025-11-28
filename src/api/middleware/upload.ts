import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/environment';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

// Ensure upload directory exists
const ensureUploadDir = async (dir: string): Promise<void> => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    logger.info('Created upload directory', { directory: dir });
  }
};

// Memory storage for small files or when processing immediately
export const memoryStorage = multer.memoryStorage();

// Disk storage for larger files
const createDiskStorage = (destination: string): StorageEngine => {
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      await ensureUploadDir(destination);
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and random suffix
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const extension = path.extname(file.originalname).toLowerCase();
      const basename = path.basename(file.originalname, extension);
      const filename = `${basename}-${uniqueSuffix}${extension}`;
      cb(null, filename);
    },
  });
};

// File filter for PDF files
export const pdfFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  // Check MIME type
  const allowedMimes = ['application/pdf', 'application/x-pdf'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF files are allowed', 400));
  }
};

// File filter for images (for future OCR support)
export const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/tiff',
    'image/bmp',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400));
  }
};

// General file validation middleware
export const validateFileSize = (
  maxSize: number = config.upload.maxFileSize
) => {
  return (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (file.size > maxSize) {
      cb(
        new AppError(
          `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
          400
        )
      );
      return;
    }
    cb(null, true);
  };
};

// Multer configurations
export const uploadSinglePDF = multer({
  storage: createDiskStorage(config.upload.dir),
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1,
  },
}).single('pdf');

export const uploadMultiplePDFs = multer({
  storage: createDiskStorage(config.upload.dir),
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10, // Allow up to 10 files
  },
}).array('pdfs', 10);

export const uploadPDFToMemory = multer({
  storage: memoryStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1,
  },
}).single('pdf');

export const uploadImageToMemory = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1,
  },
}).single('image');

// Error handling middleware for multer
export const handleMulterError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File size exceeds ${config.upload.maxFileSize / (1024 * 1024)}MB limit`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
    }

    logger.error('Multer error', { error: error.message, code: error.code });
    res.status(400).json({
      error: 'UploadError',
      message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Pass other errors to the general error handler
  next(error);
};

// Cleanup utility for temporary files
export const cleanupTempFile = async (filePath: string): Promise<void> => {
  try {
    await fs.unlink(filePath);
    logger.info('Cleaned up temporary file', { filePath });
  } catch (error) {
    logger.error('Failed to cleanup temporary file', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Batch cleanup for multiple files
export const cleanupTempFiles = async (filePaths: string[]): Promise<void> => {
  await Promise.all(filePaths.map(cleanupTempFile));
};
