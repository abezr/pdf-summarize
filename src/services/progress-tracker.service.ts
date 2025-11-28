/**
 * Progress Tracker Service
 * Provides utilities for tracking and updating document processing progress
 */

import { webSocketService } from './websocket.service';
import { ProcessingStage } from './websocket.types';
import { logger } from '../utils/logger';

export class ProgressTrackerService {
  /**
   * Update progress for document upload and initial processing
   */
  public static async updateUploadProgress(documentId: string, progress: number, message?: string): Promise<void> {
    webSocketService.sendProgressUpdate(documentId, 'UPLOADING', progress, message);
  }

  /**
   * Update progress for PDF parsing
   */
  public static async updateParsingProgress(documentId: string, progress: number, message?: string): Promise<void> {
    webSocketService.sendProgressUpdate(documentId, 'PARSING', 10 + (progress * 0.2), message, {
      currentStep: 'parsing',
      totalSteps: 5,
    });
  }

  /**
   * Update progress for image extraction
   */
  public static async updateImageExtractionProgress(documentId: string, progress: number, message?: string): Promise<void> {
    webSocketService.sendProgressUpdate(documentId, 'IMAGE_EXTRACTION', 30 + (progress * 0.1), message, {
      currentStep: 'image_extraction',
      totalSteps: 5,
    });
  }

  /**
   * Update progress for graph building
   */
  public static async updateGraphBuildProgress(documentId: string, progress: number, message?: string): Promise<void> {
    webSocketService.sendProgressUpdate(documentId, 'GRAPH_BUILD', 40 + (progress * 0.2), message, {
      currentStep: 'graph_building',
      totalSteps: 5,
    });
  }

  /**
   * Update progress for embedding generation
   */
  public static async updateEmbeddingProgress(documentId: string, progress: number, message?: string): Promise<void> {
    webSocketService.sendProgressUpdate(documentId, 'EMBEDDING', 60 + (progress * 0.15), message, {
      currentStep: 'embedding',
      totalSteps: 5,
    });
  }

  /**
   * Update progress for summarization
   */
  public static async updateSummarizationProgress(documentId: string, progress: number, message?: string): Promise<void> {
    webSocketService.sendProgressUpdate(documentId, 'SUMMARIZATION', 75 + (progress * 0.15), message, {
      currentStep: 'summarization',
      totalSteps: 5,
    });
  }

  /**
   * Update progress for evaluation
   */
  public static async updateEvaluationProgress(documentId: string, progress: number, message?: string): Promise<void> {
    webSocketService.sendProgressUpdate(documentId, 'EVALUATION', 90 + (progress * 0.05), message, {
      currentStep: 'evaluation',
      totalSteps: 5,
    });
  }

  /**
   * Mark processing as complete
   */
  public static async markComplete(documentId: string, summaryData: any, evaluationData?: any): Promise<void> {
    webSocketService.sendProgressUpdate(documentId, 'COMPLETE', 100, 'Processing complete');
    webSocketService.sendSummaryComplete(documentId, summaryData, evaluationData);

    logger.info('Document processing marked complete', { documentId });
  }

  /**
   * Send error message
   */
  public static async sendError(documentId: string, error: { code: string; message: string }, stage?: ProcessingStage): Promise<void> {
    webSocketService.sendError(documentId, error, stage);

    logger.error('Progress error sent', {
      documentId,
      errorCode: error.code,
      stage,
    });
  }

  /**
   * Get current progress for a document
   */
  public static getCurrentProgress(documentId: string) {
    return webSocketService.getProgressTracker(documentId);
  }

  /**
   * Get connection count for a document
   */
  public static getConnectionCount(documentId: string): number {
    return webSocketService.getDocumentConnectionCount(documentId);
  }

  /**
   * Get total WebSocket connection count
   */
  public static getTotalConnectionCount(): number {
    return webSocketService.getTotalConnectionCount();
  }

  /**
   * Helper method to track processing stages with automatic progress calculation
   */
  public static async trackStage(
    documentId: string,
    stage: ProcessingStage,
    operation: () => Promise<void>,
    stageMessage?: string
  ): Promise<void> {
    try {
      logger.debug(`Starting ${stage} stage`, { documentId, stage });

      // Send stage start
      this.getStageUpdateMethod(stage)(documentId, 0, stageMessage || `Starting ${stage.toLowerCase()}`);

      await operation();

      // Send stage completion
      this.getStageUpdateMethod(stage)(documentId, 100, `${stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase()} complete`);

      logger.debug(`${stage} stage completed`, { documentId, stage });
    } catch (error: any) {
      logger.error(`${stage} stage failed`, {
        documentId,
        stage,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get the appropriate update method for a stage
   */
  private static getStageUpdateMethod(stage: ProcessingStage) {
    const methodMap = {
      UPLOADING: this.updateUploadProgress,
      PARSING: this.updateParsingProgress,
      IMAGE_EXTRACTION: this.updateImageExtractionProgress,
      GRAPH_BUILD: this.updateGraphBuildProgress,
      EMBEDDING: this.updateEmbeddingProgress,
      SUMMARIZATION: this.updateSummarizationProgress,
      EVALUATION: this.updateEvaluationProgress,
      COMPLETE: this.updateUploadProgress, // fallback
      FAILED: this.updateUploadProgress, // fallback
    };

    return methodMap[stage] || this.updateUploadProgress;
  }

  /**
   * Estimate time remaining based on current progress and stage
   */
  public static estimateTimeRemaining(documentId: string): number | undefined {
    const tracker = webSocketService.getProgressTracker(documentId);
    if (!tracker) return undefined;

    const elapsed = Date.now() - tracker.startTime.getTime();
    const progress = tracker.progress / 100;

    if (progress <= 0) return undefined;

    // Estimate total time based on current progress
    const estimatedTotal = elapsed / progress;
    const remaining = estimatedTotal - elapsed;

    return Math.max(0, Math.round(remaining / 1000)); // in seconds
  }

  /**
   * Update progress with estimated time remaining
   */
  public static async updateProgressWithTimeEstimate(
    documentId: string,
    stage: ProcessingStage,
    progress: number,
    message?: string
  ): Promise<void> {
    const estimatedTimeRemaining = this.estimateTimeRemaining(documentId);

    webSocketService.sendProgressUpdate(documentId, stage, progress, message, {
      estimatedTimeRemaining,
    });
  }
}
