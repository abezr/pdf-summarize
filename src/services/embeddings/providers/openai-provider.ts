import { openai } from '../../llm/OpenAIProvider';
import { EmbeddingProvider, EmbeddingOptions } from '../types';
import { logger } from '../../../utils/logger';
import { spanHelpers, contextHelpers } from '../../../observability/tracing/tracer';
import { metricHelpers } from '../../../observability/metrics/metrics';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private readonly defaultModel = 'text-embedding-3-small';

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    return contextHelpers.withSpan('embeddings.openai.generate', async (span) => {
      const startTime = Date.now();
      const model = options?.model || this.defaultModel;

      span.setAttributes({
        'embeddings.provider': this.name,
        'embeddings.model': model,
        'embeddings.text_length': text.length,
      });

      try {
        logger.debug('Generating OpenAI embedding', {
          model,
          textLength: text.length,
        });

        // Use the existing OpenAI client
        const response = await openai.embeddings.create({
          model,
          input: text,
          encoding_format: 'float',
        });

        const embedding = response.data[0].embedding;
        const tokensUsed = response.usage?.total_tokens || 0;

        const executionTime = Date.now() - startTime;

        // Record metrics
        metricHelpers.recordLlmRequest('openai', model, 'embedding', {
          input: tokensUsed,
          output: 0, // Embeddings don't have output tokens
        }, 0, executionTime);

        span.setAttributes({
          'embeddings.tokens_used': tokensUsed,
          'embeddings.execution_time_ms': executionTime,
          'embeddings.dimensions': embedding.length,
        });

        logger.debug('OpenAI embedding generated', {
          model,
          dimensions: embedding.length,
          tokensUsed,
          executionTime,
        });

        return embedding;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('OpenAI embedding generation failed', {
          model,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]> {
    return contextHelpers.withSpan('embeddings.openai.generate_batch', async (span) => {
      const startTime = Date.now();
      const model = options?.model || this.defaultModel;

      span.setAttributes({
        'embeddings.provider': this.name,
        'embeddings.model': model,
        'embeddings.batch_size': texts.length,
        'embeddings.total_text_length': texts.reduce((sum, text) => sum + text.length, 0),
      });

      try {
        logger.debug('Generating OpenAI embeddings batch', {
          model,
          batchSize: texts.length,
          totalTextLength: texts.reduce((sum, text) => sum + text.length, 0),
        });

        // OpenAI allows up to 2048 inputs per request
        const batchSize = 100; // Conservative batch size
        const results: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);

          const response = await openai.embeddings.create({
            model,
            input: batch,
            encoding_format: 'float',
          });

          results.push(...response.data.map(item => item.embedding));

          // Record metrics for this batch
          const tokensUsed = response.usage?.total_tokens || 0;
          metricHelpers.recordLlmRequest('openai', model, 'embedding_batch', {
            input: tokensUsed,
            output: 0,
          }, 0, 0); // We'll accumulate timing at the end
        }

        const executionTime = Date.now() - startTime;

        span.setAttributes({
          'embeddings.execution_time_ms': executionTime,
          'embeddings.total_embeddings': results.length,
          'embeddings.dimensions': results[0]?.length || 0,
        });

        logger.debug('OpenAI embeddings batch generated', {
          model,
          batchCount: Math.ceil(texts.length / batchSize),
          totalEmbeddings: results.length,
          dimensions: results[0]?.length || 0,
          executionTime,
        });

        return results;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('OpenAI embeddings batch generation failed', {
          model,
          batchSize: texts.length,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  getDimensions(): number {
    // text-embedding-3-small has 1536 dimensions
    // text-embedding-3-large has 3072 dimensions
    // text-embedding-ada-002 has 1536 dimensions
    const model = this.defaultModel;
    switch (model) {
      case 'text-embedding-3-large':
        return 3072;
      case 'text-embedding-3-small':
      case 'text-embedding-ada-002':
      default:
        return 1536;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try a simple embedding request
      await this.generateEmbedding('test', { model: this.defaultModel });
      return true;
    } catch (error) {
      logger.warn('OpenAI embedding provider not available', {
        error: (error as Error).message,
      });
      return false;
    }
  }
}
