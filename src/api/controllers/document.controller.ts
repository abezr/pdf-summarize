/**
 * Document Controller
 * Handles API requests for document operations
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import { documentService } from '../../services/document.service';
import { pdfParserService } from '../../services/pdf-parser.service';
import { GraphBuilder } from '../../services/graph/graph-builder';
import { summarizationService } from '../../services/llm/summarization.service';
import {
  imageExtractionService,
  ExtractedImage,
} from '../../services/image-extraction.service';
import { logger } from '../../utils/logger';
import { ProgressTrackerService } from '../../services/progress-tracker.service';
import {
  DocumentQueryParams,
  DocumentIdParams,
  SummarizationOptions,
  DocumentQuerySchema,
  DocumentIdParamSchema,
  SummarizationOptionsSchema,
  validateRequestBody,
  validateQueryParams,
  validatePathParams,
} from '../schemas';

export class DocumentController {
  /**
   * Upload and process a PDF file
   * POST /api/documents/upload
   */
  public async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file uploaded' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const userId = req.user?.id || (req.headers['x-user-id'] as string);
      const file = req.file as Express.Multer.File;

      logger.info('Processing PDF upload', {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        userId,
      });

      // Create document record
      const documentInput = {
        filename: file.originalname,
        file_size: file.size,
        pdf_url: `/uploads/${file.filename}`,
        user_id: userId,
        metadata: {
          original_filename: file.originalname,
          upload_timestamp: new Date().toISOString(),
          mimetype: file.mimetype,
        },
      };

      const document = await documentService.createDocument(documentInput);

      // Start background processing
      this.processDocumentAsync(
        document.id,
        file.path,
        file.originalname,
        userId
      );

      res.status(201).json({
        success: true,
        data: {
          document: {
            id: document.id,
            filename: document.filename,
            status: document.status,
            created_at: document.created_at,
          },
        },
        message: 'Document uploaded successfully. Processing started.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Document upload failed', { error: error.message });

      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.name || 'UPLOAD_ERROR',
          message: error.message || 'Document upload failed',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get documents list
   * GET /api/documents
   */
  public async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string);
      const queryParams: DocumentQueryParams =
        (req.validatedQuery as DocumentQueryParams) ||
        validateQueryParams(DocumentQuerySchema, req.query);

      const options = {
        userId,
        status: queryParams.status,
        limit: queryParams.limit,
        offset: queryParams.offset,
        orderBy: queryParams.order_by,
        orderDirection: queryParams.order_direction,
      };

      const result = await documentService.getDocuments(options);

      res.json({
        success: true,
        data: {
          documents: result.documents.map((doc) => ({
            id: doc.id,
            filename: doc.filename,
            file_size: doc.file_size,
            status: doc.status,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
          })),
          total: result.total,
          has_more: result.hasMore,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get documents', { error: error.message });

      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.name || 'FETCH_ERROR',
          message: error.message || 'Failed to retrieve documents',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get document by ID
   * GET /api/documents/:id
   */
  public async getDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string);
      const params: DocumentIdParams = validatePathParams(
        DocumentIdParamSchema,
        req.params
      );

      const document = await documentService.validateDocumentAccess(
        params.id,
        userId
      );

      res.json({
        success: true,
        data: {
          document: {
            id: document.id,
            filename: document.filename,
            file_size: document.file_size,
            status: document.status,
            pdf_url: document.pdf_url,
            graph_data: document.graph_data,
            summary: document.summary,
            metadata: document.metadata,
            created_at: document.created_at,
            updated_at: document.updated_at,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get document', {
        id: req.params.id,
        error: error.message,
      });

      const statusCode =
        error.statusCode || (error.message.includes('not found') ? 404 : 500);

      res.status(statusCode).json({
        success: false,
        error: {
          code: error.name || 'FETCH_ERROR',
          message: error.message || 'Failed to retrieve document',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Evaluate a document summary
   * POST /api/documents/:id/evaluate
   */
  public async evaluateDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string);
      const params: DocumentIdParams = validatePathParams(
        DocumentIdParamSchema,
        req.params
      );

      // Verify document exists and has summary
      const document = await documentService.validateDocumentAccess(
        params.id,
        userId
      );

      if (!document.summary) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_SUMMARY',
            message: 'Document must have a summary before evaluation',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Evaluating document summary', {
        documentId: params.id,
        userId,
      });

      // Extract original text from graph for evaluation
      const originalText = this.extractOriginalTextFromGraph(document.graph_data);

      // Perform evaluation
      const evaluationResult = await evaluationService.evaluate({
        documentId: params.id,
        originalText,
        summary: document.summary,
        graph: document.graph_data.toJSON(),
      });

      res.json({
        success: true,
        data: {
          evaluation: {
            overall_score: evaluationResult.overallScore,
            passed: evaluationResult.passed,
            ragas_metrics: evaluationResult.ragasMetrics,
            custom_metrics: evaluationResult.customMetrics,
            recommendations: evaluationResult.recommendations,
            thresholds: evaluationResult.thresholds,
          },
        },
        message: 'Evaluation completed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to evaluate document', {
        documentId: req.params.id,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.code || 'EVALUATION_FAILED',
          message: error.message || 'Failed to evaluate document',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Extract original text from graph for evaluation
   */
  private extractOriginalTextFromGraph(graph: any): string {
    // Extract text content from graph nodes in document order
    const textNodes = graph.nodes
      .filter((node: any) => ['paragraph', 'section', 'heading'].includes(node.type))
      .sort((a: any, b: any) => {
        // Sort by page and position if available
        const aPage = a.metadata?.page || 0;
        const bPage = b.metadata?.page || 0;
        if (aPage !== bPage) return aPage - bPage;

        const aPos = a.metadata?.position || 0;
        const bPos = b.metadata?.position || 0;
        return aPos - bPos;
      });

    return textNodes
      .map((node: any) => node.content)
      .join('\n\n')
      .substring(0, 10000); // Limit for evaluation (RAGAS token limits)
  }

  /**
   * Delete document
   * DELETE /api/documents/:id
   */
  public async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string);
      const params: DocumentIdParams = validatePathParams(
        DocumentIdParamSchema,
        req.params
      );

      // Verify document exists and user has access
      await documentService.validateDocumentAccess(params.id, userId);

      // Delete the document
      const deleted = await documentService.deleteDocument(params.id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.json({
        success: true,
        data: { deleted: true },
        message: 'Document deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to delete document', {
        id: req.params.id,
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.name || 'DELETE_ERROR',
          message: error.message || 'Failed to delete document',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get document statistics
   * GET /api/documents/stats
   */
  public async getDocumentStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string);

      const stats = await documentService.getDocumentStats(userId);

      res.json({
        success: true,
        data: {
          total: stats.total,
          by_status: stats.byStatus,
          total_size: stats.totalSize,
          recent_uploads: stats.recentUploads,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to get document stats', { error: error.message });

      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.name || 'STATS_ERROR',
          message: error.message || 'Failed to retrieve document statistics',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Generate summary for a document
   * POST /api/documents/:id/summarize
   */
  public async summarizeDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || (req.headers['x-user-id'] as string);
      const params: DocumentIdParams = validatePathParams(
        DocumentIdParamSchema,
        req.params
      );
      const options: SummarizationOptions =
        (req.validatedBody as SummarizationOptions) ||
        validateRequestBody(SummarizationOptionsSchema, req.body);

      // Verify document exists and has graph data
      const document = await documentService.validateDocumentAccess(
        params.id,
        userId
      );

      if (!document.graph_data) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_GRAPH_DATA',
            message: 'Document must be processed before summarization',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      logger.info('Generating document summary', {
        documentId: params.id,
        type: options.type,
        userId,
      });

      // Send initial progress update
      await ProgressTrackerService.updateSummarizationProgress(params.id, 0, 'Starting summarization process');

      // Generate summary
      const summaryResult = await summarizationService.summarizeGraph(
        document.graph_data,
        {
          type: options.type,
          maxLength: options.max_length,
          focus: options.focus,
          exclude: options.exclude,
          style: options.style,
          model: options.model,
          provider: options.provider,
        }
      );

      await ProgressTrackerService.updateSummarizationProgress(params.id, 80, 'Summary generated, running evaluation');

      // Store summary in document
      await documentService.storeDocumentSummary(
        params.id,
        summaryResult.summary,
        userId
      );

      await ProgressTrackerService.updateSummarizationProgress(params.id, 90, 'Summary stored, finalizing');

      // Prepare summary data for WebSocket
      const summaryData = {
        content: summaryResult.summary,
        type: summaryResult.type,
        model: summaryResult.model,
        provider: summaryResult.provider,
        tokens_used: summaryResult.tokensUsed,
        cost: summaryResult.cost,
        processing_time: summaryResult.processingTime,
        graph_stats: summaryResult.graphStats,
      };

      const evaluationData = summaryResult.evaluation ? {
        overall_score: summaryResult.evaluation.overallScore,
        passed: summaryResult.evaluation.passed,
        ragas_metrics: summaryResult.evaluation.ragasMetrics,
        custom_metrics: summaryResult.evaluation.customMetrics,
        recommendations: summaryResult.evaluation.recommendations,
      } : undefined;

      // Send completion message via WebSocket
      await ProgressTrackerService.markComplete(params.id, summaryData, evaluationData);

      res.json({
        success: true,
        data: {
          summary: summaryResult.summary,
          type: summaryResult.type,
          model: summaryResult.model,
          provider: summaryResult.provider,
          tokens_used: summaryResult.tokensUsed,
          cost: summaryResult.cost,
          processing_time: summaryResult.processingTime,
          graph_stats: summaryResult.graphStats,
          evaluation: evaluationData,
        },
        message: 'Summary generated successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to generate document summary', {
        documentId: req.params.id,
        error: error.message,
      });

      // Send error message via WebSocket
      const documentId = req.params.id;
      await ProgressTrackerService.sendError(documentId, {
        code: error.name || 'SUMMARIZATION_ERROR',
        message: error.message || 'Failed to generate document summary',
      }, 'SUMMARIZATION');

      res.status(error.statusCode || 500).json({
        success: false,
        error: {
          code: error.name || 'SUMMARIZATION_ERROR',
          message: error.message || 'Failed to generate document summary',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Process document asynchronously (PDF parsing + graph building)
   */
  private async processDocumentAsync(
    documentId: string,
    filePath: string,
    fileName: string,
    userId?: string
  ): Promise<void> {
    // Run in background to not block the response
    setImmediate(async () => {
      try {
        logger.info('Starting document processing', { documentId, filePath });

        // Update status to processing
        await documentService.updateDocumentStatus(
          documentId,
          'processing',
          undefined,
          userId
        );

        // Stage 1: Parse PDF
        await ProgressTrackerService.updateParsingProgress(documentId, 0, 'Reading PDF file');
        const fileBuffer = await fs.promises.readFile(filePath);
        await ProgressTrackerService.updateParsingProgress(documentId, 50, 'Parsing PDF content');

        const pdfResult = await pdfParserService.parsePDF(fileBuffer, fileName);
        logger.info('PDF parsed successfully', {
          documentId,
          pages: pdfResult.pages.length,
          totalChars: pdfResult.fullText.length,
        });
        await ProgressTrackerService.updateParsingProgress(documentId, 100, 'PDF parsing complete');

        // Stage 2: Extract images from PDF
        let images: ExtractedImage[] = [];
        try {
          await ProgressTrackerService.updateImageExtractionProgress(documentId, 0, 'Extracting images from PDF');
          const outputDir = `./data/images/${documentId}`;
          images = await imageExtractionService.extractImages(
            filePath,
            outputDir,
            {
              pageCount: pdfResult.metadata.pages,
            }
          );
          logger.info('Images extracted successfully', {
            documentId,
            imageCount: images.length,
          });
          await ProgressTrackerService.updateImageExtractionProgress(documentId, 100, `Extracted ${images.length} images`);
        } catch (error: any) {
          logger.warn('Image extraction failed, continuing without images', {
            documentId,
            error: error.message,
          });
          // Continue processing even if image extraction fails
        }

        // Stage 3: Build graph
        await ProgressTrackerService.updateGraphBuildProgress(documentId, 0, 'Building document graph');
        const graph = await GraphBuilder.buildGraph(
          documentId,
          pdfResult,
          undefined,
          images
        );
        logger.info('Graph built successfully', {
          documentId,
          nodes: graph.nodes.length,
          edges: graph.edges.length,
        });
        await ProgressTrackerService.updateGraphBuildProgress(documentId, 100, `Graph built with ${graph.nodes.length} nodes and ${graph.edges.length} edges`);

        // Store graph data
        await documentService.storeDocumentGraph(documentId, graph, userId);

        // Update status to completed
        await documentService.updateDocumentStatus(
          documentId,
          'completed',
          undefined,
          userId
        );

        logger.info('Document processing completed', { documentId });
      } catch (error: any) {
        logger.error('Document processing failed', {
          documentId,
          error: error.message,
        });

        // Send error message via WebSocket
        await ProgressTrackerService.sendError(documentId, {
          code: 'PROCESSING_FAILED',
          message: error.message,
        }, 'FAILED');

        // Update status to failed
        await documentService.updateDocumentStatus(
          documentId,
          'failed',
          error.message,
          userId
        );
      }
    });
  }
}

// Export singleton instance
export const documentController = new DocumentController();
