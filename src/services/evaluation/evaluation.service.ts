import { RagasEvaluator } from './ragas/ragas-evaluator';
import { CustomEvaluator } from './custom/custom-evaluator';
import { logger } from '../../utils/logger';
import { metricHelpers } from '../../observability/metrics/metrics';
import { spanHelpers, contextHelpers } from '../../observability/tracing/tracer';
import {
  EvaluationInput,
  EvaluationResult,
  EvaluationConfig,
  DEFAULT_EVALUATION_CONFIG,
  QualityThresholds,
} from './types';

export class EvaluationService {
  private ragasEvaluator: RagasEvaluator;
  private customEvaluator: CustomEvaluator;
  private config: EvaluationConfig;

  constructor(config: Partial<EvaluationConfig> = {}) {
    this.config = { ...DEFAULT_EVALUATION_CONFIG, ...config };
    this.ragasEvaluator = new RagasEvaluator();
    this.customEvaluator = new CustomEvaluator();
  }

  /**
   * Evaluate a summary using both RAGAS and custom metrics
   */
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    return contextHelpers.withSpan('evaluation.full', async (span) => {
      const startTime = Date.now();

      span.setAttributes({
        'evaluation.document_id': input.documentId,
        'evaluation.enabled': true,
      });

      try {
        logger.info('Starting evaluation', {
          documentId: input.documentId,
          summaryLength: input.summary.length,
        });

        // Run evaluations in parallel
        const [ragasMetrics, customMetrics] = await Promise.all([
          this.config.ragas.enabled ? this.ragasEvaluator.evaluate(input) :
            Promise.resolve({
              faithfulness: 0.5,
              answerRelevancy: 0.5,
              contextRecall: 0.5,
              contextPrecision: 0.5,
            }),
          this.config.custom.enabled ? this.customEvaluator.evaluate(input) :
            Promise.resolve({
              groundingScore: 0.5,
              coverageScore: 0.5,
              graphUtilization: 0.5,
              tableAccuracy: 0.5,
              referenceAccuracy: 0.5,
            }),
        ]);

        // Calculate overall score using weighted average
        const overallScore = this.calculateOverallScore(ragasMetrics, customMetrics);

        // Check if evaluation passes thresholds
        const passed = this.checkThresholds(overallScore, ragasMetrics, customMetrics);

        const result: EvaluationResult = {
          documentId: input.documentId,
          timestamp: new Date(),
          overallScore,
          ragasMetrics,
          customMetrics,
          thresholds: this.config.thresholds,
          passed,
          recommendations: passed ? undefined : this.generateRecommendations(overallScore, ragasMetrics, customMetrics),
        };

        const duration = Date.now() - startTime;

        // Record metrics
        metricHelpers.setEvaluationScore('overall', overallScore);
        metricHelpers.setEvaluationScore('faithfulness', ragasMetrics.faithfulness);
        metricHelpers.setEvaluationScore('grounding', customMetrics.groundingScore);

        span.setAttributes({
          'evaluation.overall_score': overallScore,
          'evaluation.passed': passed,
          'evaluation.duration_ms': duration,
        });

        logger.info('Evaluation completed', {
          documentId: input.documentId,
          overallScore,
          passed,
          duration,
        });

        // Send alerts if enabled and failed
        if (!passed && this.config.alerts.enabled) {
          await this.sendAlert(result);
        }

        return result;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Evaluation failed', {
          documentId: input.documentId,
          error: (error as Error).message,
        });

        // Return a failed evaluation result
        return {
          documentId: input.documentId,
          timestamp: new Date(),
          overallScore: 0,
          ragasMetrics: {
            faithfulness: 0,
            answerRelevancy: 0,
            contextRecall: 0,
            contextPrecision: 0,
          },
          customMetrics: {
            groundingScore: 0,
            coverageScore: 0,
            graphUtilization: 0,
            tableAccuracy: 0,
            referenceAccuracy: 0,
          },
          thresholds: this.config.thresholds,
          passed: false,
          recommendations: ['Evaluation system error - manual review required'],
        };
      }
    });
  }

  /**
   * Calculate overall score using weighted average of all metrics
   */
  private calculateOverallScore(ragas: any, custom: any): number {
    // Weights for different metrics
    const weights = {
      faithfulness: 0.25,
      answerRelevancy: 0.15,
      contextRecall: 0.15,
      contextPrecision: 0.15,
      groundingScore: 0.15,
      coverageScore: 0.10,
      graphUtilization: 0.03,
      tableAccuracy: 0.01,
      referenceAccuracy: 0.01,
    };

    const score =
      ragas.faithfulness * weights.faithfulness +
      ragas.answerRelevancy * weights.answerRelevancy +
      ragas.contextRecall * weights.contextRecall +
      ragas.contextPrecision * weights.contextPrecision +
      custom.groundingScore * weights.groundingScore +
      custom.coverageScore * weights.coverageScore +
      custom.graphUtilization * weights.graphUtilization +
      custom.tableAccuracy * weights.tableAccuracy +
      custom.referenceAccuracy * weights.referenceAccuracy;

    return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
  }

  /**
   * Check if evaluation passes quality thresholds
   */
  private checkThresholds(overallScore: number, ragas: any, custom: any): boolean {
    const thresholds = this.config.thresholds;

    return (
      overallScore >= thresholds.overall &&
      ragas.faithfulness >= thresholds.faithfulness &&
      custom.groundingScore >= thresholds.grounding &&
      custom.coverageScore >= thresholds.coverage
    );
  }

  /**
   * Generate recommendations for failed evaluations
   */
  private generateRecommendations(overallScore: number, ragas: any, custom: any): string[] {
    const recommendations: string[] = [];

    if (overallScore < this.config.thresholds.overall) {
      recommendations.push('Overall quality score is below threshold - summary may need revision');
    }

    if (ragas.faithfulness < this.config.thresholds.faithfulness) {
      recommendations.push('Faithfulness score is low - summary may contain unsupported claims');
    }

    if (custom.groundingScore < this.config.thresholds.grounding) {
      recommendations.push('Grounding score is low - add more specific references to source content');
    }

    if (custom.coverageScore < this.config.thresholds.coverage) {
      recommendations.push('Coverage score is low - summary may be missing important information');
    }

    if (custom.tableAccuracy < 0.8) {
      recommendations.push('Table references may be inaccurate - verify table numbers');
    }

    if (recommendations.length === 0) {
      recommendations.push('Quality thresholds not met - manual review recommended');
    }

    return recommendations;
  }

  /**
   * Send alert for failed evaluation
   */
  private async sendAlert(result: EvaluationResult): Promise<void> {
    if (!this.config.alerts.webhookUrl) {
      logger.warn('Alert enabled but no webhook URL configured', { documentId: result.documentId });
      return;
    }

    try {
      const alert = {
        type: 'evaluation_failed',
        documentId: result.documentId,
        overallScore: result.overallScore,
        thresholds: result.thresholds,
        ragasMetrics: result.ragasMetrics,
        customMetrics: result.customMetrics,
        recommendations: result.recommendations,
        timestamp: result.timestamp,
      };

      // In a real implementation, you'd send this to a webhook
      // For now, just log it
      logger.warn('Evaluation alert triggered', alert);

      // TODO: Implement actual webhook sending
      // await fetch(this.config.alerts.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(alert),
      // });

    } catch (error) {
      logger.error('Failed to send evaluation alert', {
        documentId: result.documentId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Update evaluation configuration
   */
  updateConfig(config: Partial<EvaluationConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Evaluation configuration updated', { config: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): EvaluationConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const evaluationService = new EvaluationService();
