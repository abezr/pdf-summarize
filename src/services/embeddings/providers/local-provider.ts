import type { Pipeline } from '@xenova/transformers';
import { EmbeddingProvider, EmbeddingOptions } from '../types';
import { logger } from '../../../utils/logger';
import { spanHelpers, contextHelpers } from '../../../observability/tracing/tracer';
import { metricHelpers } from '../../../observability/metrics/metrics';

export class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  private extractor: Pipeline | null = null;
  private pipelineLoader: typeof import('@xenova/transformers').pipeline | null = null;
  private readonly model = 'Xenova/all-MiniLM-L6-v2'; // Good balance of speed/quality
  private readonly dimensions = 384; // all-MiniLM-L6-v2 has 384 dimensions

  async initialize(): Promise<void> {
    if (this.extractor) {
      return; // Already initialized
    }

    try {
      logger.info('Initializing local embedding provider', { model: this.model });

      // Load the model (this may take a few seconds on first run)
      const pipeline = await this.getPipeline();
      this.extractor = await pipeline('feature-extraction', this.model, {
        quantized: true, // Use quantized model for better performance
      });

      logger.info('Local embedding provider initialized', {
        model: this.model,
        dimensions: this.dimensions,
      });

    } catch (error) {
      logger.error('Failed to initialize local embedding provider', {
        model: this.model,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    return contextHelpers.withSpan('embeddings.local.generate', async (span) => {
      const startTime = Date.now();

      span.setAttributes({
        'embeddings.provider': this.name,
        'embeddings.model': this.model,
        'embeddings.text_length': text.length,
      });

      try {
        await this.ensureInitialized();

        logger.debug('Generating local embedding', {
          textLength: text.length,
        });

        // Generate embedding using the local model
        const output = await this.extractor!(text, { pooling: 'mean', normalize: true });

        // Extract the embedding vector
        let embedding: number[];
        if (output && typeof output === 'object' && 'data' in output) {
          embedding = Array.from(output.data as number[]);
        } else if (output && Array.isArray(output)) {
          embedding = output;
        } else {
          throw new Error('Unexpected output format from local embedding model');
        }

        const executionTime = Date.now() - startTime;

        // Record metrics (local embeddings are "free" but we track usage)
        metricHelpers.recordLlmRequest('local', this.model, 'embedding', {
          input: Math.ceil(text.length / 4), // Rough token estimation
          output: 0,
        }, 0, executionTime);

        span.setAttributes({
          'embeddings.execution_time_ms': executionTime,
          'embeddings.dimensions': embedding.length,
        });

        logger.debug('Local embedding generated', {
          dimensions: embedding.length,
          executionTime,
        });

        return embedding;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Local embedding generation failed', {
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  async generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]> {
    return contextHelpers.withSpan('embeddings.local.generate_batch', async (span) => {
      const startTime = Date.now();

      span.setAttributes({
        'embeddings.provider': this.name,
        'embeddings.model': this.model,
        'embeddings.batch_size': texts.length,
        'embeddings.total_text_length': texts.reduce((sum, text) => sum + text.length, 0),
      });

      try {
        await this.ensureInitialized();

        logger.debug('Generating local embeddings batch', {
          batchSize: texts.length,
          totalTextLength: texts.reduce((sum, text) => sum + text.length, 0),
        });

        // Process in smaller batches to avoid memory issues
        const batchSize = 10; // Conservative batch size for local processing
        const results: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
          const batch = texts.slice(i, i + batchSize);

          for (const text of batch) {
            const embedding = await this.generateEmbedding(text, options);
            results.push(embedding);
          }
        }

        const executionTime = Date.now() - startTime;

        span.setAttributes({
          'embeddings.execution_time_ms': executionTime,
          'embeddings.total_embeddings': results.length,
          'embeddings.dimensions': results[0]?.length || 0,
        });

        logger.debug('Local embeddings batch generated', {
          totalEmbeddings: results.length,
          dimensions: results[0]?.length || 0,
          executionTime,
        });

        return results;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Local embeddings batch generation failed', {
          batchSize: texts.length,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      // Try a simple embedding
      await this.generateEmbedding('test');
      return true;
    } catch (error) {
      logger.warn('Local embedding provider not available', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.extractor) {
      await this.initialize();
    }
  }

  private async getPipeline() {
    if (!this.pipelineLoader) {
      const transformers = await import('@xenova/transformers');
      this.pipelineLoader = transformers.pipeline;
    }
    return this.pipelineLoader;
  }
}
