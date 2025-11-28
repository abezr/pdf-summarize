/**
 * Document Routes
 * API endpoints for document management and processing
 */

import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { uploadSinglePDF } from '../middleware/upload';
import {
  createValidationMiddleware,
  DocumentQuerySchema,
  SummarizationOptionsSchema,
  FileUploadSchema,
} from '../schemas';

const router = Router();

/**
 * Upload and process a PDF document
 * POST /api/documents/upload
 */
router.post(
  '/upload',
  uploadSinglePDF,
  createValidationMiddleware(FileUploadSchema),
  documentController.uploadDocument.bind(documentController)
);

/**
 * Get documents list with pagination and filtering
 * GET /api/documents
 */
router.get(
  '/',
  createValidationMiddleware(DocumentQuerySchema),
  documentController.getDocuments.bind(documentController)
);

/**
 * Get document statistics
 * GET /api/documents/stats
 */
router.get(
  '/stats',
  documentController.getDocumentStats.bind(documentController)
);

/**
 * Get document by ID
 * GET /api/documents/:id
 */
router.get('/:id', documentController.getDocumentById.bind(documentController));

/**
 * Generate summary for a document
 * POST /api/documents/:id/summarize
 */
router.post(
  '/:id/summarize',
  createValidationMiddleware(SummarizationOptionsSchema),
  documentController.summarizeDocument.bind(documentController)
);

/**
 * Evaluate a document summary
 * POST /api/documents/:id/evaluate
 */
router.post(
  '/:id/evaluate',
  documentController.evaluateDocument.bind(documentController)
);

/**
 * Delete document
 * DELETE /api/documents/:id
 */
router.delete(
  '/:id',
  documentController.deleteDocument.bind(documentController)
);

export default router;
