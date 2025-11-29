import { llmProviderManager } from '../../llm';
import { logger } from '../../../utils/logger';
import { metricHelpers } from '../../../observability/metrics/metrics';
import { spanHelpers, contextHelpers } from '../../../observability/tracing/tracer';
import { RAGASMetrics, EvaluationInput } from '../types';

export class RagasEvaluator {
  /**
   * Evaluate summary using RAGAS methodology
   * RAGAS uses LLM-as-judge to compute quality metrics
   */
  async evaluate(input: EvaluationInput): Promise<RAGASMetrics> {
    return contextHelpers.withSpan('evaluation.ragas', async (span) => {
      const startTime = Date.now();

      span.setAttributes({
        'evaluation.document_id': input.documentId,
        'evaluation.type': 'ragas',
      });

      try {
        logger.debug('Starting RAGAS evaluation', {
          documentId: input.documentId,
          summaryLength: input.summary.length,
          originalTextLength: input.originalText.length,
        });

        // Run all RAGAS metrics in parallel
        const [faithfulness, answerRelevancy, contextRecall, contextPrecision] = await Promise.all([
          this.evaluateFaithfulness(input),
          this.evaluateAnswerRelevancy(input),
          this.evaluateContextRecall(input),
          this.evaluateContextPrecision(input),
        ]);

        const metrics: RAGASMetrics = {
          faithfulness,
          answerRelevancy,
          contextRecall,
          contextPrecision,
        };

        const duration = Date.now() - startTime;

        // Record metrics
        metricHelpers.recordLlmRequest('evaluation', 'ragas', 'evaluation', {
          input: this.estimateTokens(input.originalText + input.summary),
          output: 100, // Approximate output tokens
        }, 0, duration); // Cost is minimal for evaluation

        logger.info('RAGAS evaluation completed', {
          documentId: input.documentId,
          metrics,
          duration,
        });

        span.setAttributes({
          'evaluation.ragas.faithfulness': faithfulness,
          'evaluation.ragas.answer_relevancy': answerRelevancy,
          'evaluation.ragas.context_recall': contextRecall,
          'evaluation.ragas.context_precision': contextPrecision,
          'evaluation.duration_ms': duration,
        });

        return metrics;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('RAGAS evaluation failed', {
          documentId: input.documentId,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  /**
   * Faithfulness: Does the summary accurately reflect facts from the source?
   * Measures hallucination - are all claims in the summary supported by the source?
   */
  private async evaluateFaithfulness(input: EvaluationInput): Promise<number> {
    const prompt = `
You are evaluating the faithfulness of a summary to its source document.

Source Document:
${input.originalText}

Summary:
${input.summary}

Task: For each statement in the summary, determine if it is directly supported by the source document.
Rate the summary on a scale of 0.0 to 1.0, where:
- 1.0 = All statements are fully supported by the source (no hallucinations)
- 0.0 = Most statements contradict or are not supported by the source

Consider:
- Factual accuracy: Are all claims true according to the source?
- No contradictions: Does the summary contradict itself or the source?
- No additions: Are there facts in the summary not present in the source?

Return only a number between 0.0 and 1.0.
`;

    try {
      const response = await llmProviderManager.generateText({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 50,
        temperature: 0.1, // Low temperature for consistent scoring
      });

      const score = parseFloat(response.content.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));

    } catch (error) {
      logger.warn('Faithfulness evaluation failed, using fallback', { error: error.message });
      return 0.5; // Neutral fallback
    }
  }

  /**
   * Answer Relevancy: How well does the summary answer potential questions about the document?
   * Measures if the summary contains information users would typically ask about.
   */
  private async evaluateAnswerRelevancy(input: EvaluationInput): Promise<number> {
    const prompt = `
You are evaluating how relevant a summary is for answering questions about the document.

Summary:
${input.summary}

Task: Imagine users reading this document would ask questions. How well does this summary help answer typical questions?
Rate on a scale of 0.0 to 1.0, where:
- 1.0 = Summary contains all key information users would need
- 0.0 = Summary misses most important information

Consider:
- Key facts: Are main points covered?
- Important details: Are critical supporting details included?
- User needs: Would this help users understand the document's purpose?

Return only a number between 0.0 and 1.0.
`;

    try {
      const response = await llmProviderManager.generateText({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 50,
        temperature: 0.1,
      });

      const score = parseFloat(response.content.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));

    } catch (error) {
      logger.warn('Answer relevancy evaluation failed, using fallback', { error: error.message });
      return 0.5;
    }
  }

  /**
   * Context Recall: How much important information from the source is covered in the summary?
   * Measures coverage - does the summary include key facts from the source?
   */
  private async evaluateContextRecall(input: EvaluationInput): Promise<number> {
    const prompt = `
You are evaluating how much important information from the source document is recalled in the summary.

Source Document:
${input.originalText.substring(0, 2000)}... (truncated for evaluation)

Summary:
${input.summary}

Task: Compare the summary to the source. How much of the important information is covered?
Rate on a scale of 0.0 to 1.0, where:
- 1.0 = All important information from source is included
- 0.0 = Most important information is missing

Consider:
- Key facts: Are main claims covered?
- Important details: Are supporting details included?
- Core message: Is the document's main purpose conveyed?

Return only a number between 0.0 and 1.0.
`;

    try {
      const response = await llmProviderManager.generateText({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 50,
        temperature: 0.1,
      });

      const score = parseFloat(response.content.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));

    } catch (error) {
      logger.warn('Context recall evaluation failed, using fallback', { error: error.message });
      return 0.5;
    }
  }

  /**
   * Context Precision: How much of the summary information is actually supported by the source?
   * Measures precision - does the summary avoid irrelevant or unsupported information?
   */
  private async evaluateContextPrecision(input: EvaluationInput): Promise<number> {
    const prompt = `
You are evaluating how precisely the summary sticks to information supported by the source document.

Source Document:
${input.originalText.substring(0, 2000)}... (truncated for evaluation)

Summary:
${input.summary}

Task: For each claim in the summary, is it directly supported by the source?
Rate on a scale of 0.0 to 1.0, where:
- 1.0 = Every claim in the summary is directly supported by the source
- 0.0 = Most claims are not supported or are irrelevant

Consider:
- Direct support: Is each statement verifiable in the source?
- Relevance: Is all information actually about the document's content?
- No extras: Are there claims not present in the source?

Return only a number between 0.0 and 1.0.
`;

    try {
      const response = await llmProviderManager.generateText({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 50,
        temperature: 0.1,
      });

      const score = parseFloat(response.content.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));

    } catch (error) {
      logger.warn('Context precision evaluation failed, using fallback', { error: error.message });
      return 0.5;
    }
  }

  /**
   * Estimate token count for cost calculation
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
