import { EmbeddingVector, VectorSearchIndex, SemanticSearchOptions, SimilarityResult } from './types';
import { logger } from '../../utils/logger';
import { spanHelpers, contextHelpers } from '../../observability/tracing/tracer';
import { cosineSimilarity } from 'cosine-similarity';

export class MemoryVectorSearchIndex implements VectorSearchIndex {
  private vectors = new Map<string, EmbeddingVector>();

  async add(vector: EmbeddingVector): Promise<void> {
    return contextHelpers.withSpan('vector_search.add', async (span) => {
      span.setAttributes({
        'vector_search.id': vector.id,
        'vector_search.dimensions': vector.vector.length,
      });

      try {
        this.vectors.set(vector.id, vector);
        logger.debug('Vector added to search index', {
          id: vector.id,
          dimensions: vector.vector.length,
        });
      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Failed to add vector to search index', {
          id: vector.id,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  async addBatch(vectors: EmbeddingVector[]): Promise<void> {
    return contextHelpers.withSpan('vector_search.add_batch', async (span) => {
      span.setAttributes({
        'vector_search.batch_size': vectors.length,
        'vector_search.total_dimensions': vectors.reduce((sum, v) => sum + v.vector.length, 0),
      });

      try {
        for (const vector of vectors) {
          await this.add(vector);
        }

        logger.debug('Vector batch added to search index', {
          batchSize: vectors.length,
          totalDimensions: vectors.reduce((sum, v) => sum + v.vector.length, 0),
        });
      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Failed to add vector batch to search index', {
          batchSize: vectors.length,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  async search(queryVector: number[], options: SemanticSearchOptions): Promise<SimilarityResult[]> {
    return contextHelpers.withSpan('vector_search.search', async (span) => {
      const startTime = Date.now();
      const topK = options.topK || 10;
      const threshold = options.threshold || 0.0;

      span.setAttributes({
        'vector_search.query_dimensions': queryVector.length,
        'vector_search.top_k': topK,
        'vector_search.threshold': threshold,
        'vector_search.index_size': this.vectors.size,
      });

      try {
        logger.debug('Performing vector search', {
          queryDimensions: queryVector.length,
          topK,
          threshold,
          indexSize: this.vectors.size,
        });

        const similarities: SimilarityResult[] = [];

        // Calculate similarity for all vectors
        for (const [id, vector] of this.vectors) {
          try {
            const similarity = cosineSimilarity(queryVector, vector.vector);

            // Apply filters
            if (similarity >= threshold) {
              // Check node type filter if specified
              if (options.nodeTypes && vector.metadata?.type) {
                if (!options.nodeTypes.includes(vector.metadata.type)) {
                  continue;
                }
              }

              similarities.push({
                id,
                score: similarity,
                metadata: vector.metadata,
              });
            }
          } catch (error) {
            logger.warn('Failed to calculate similarity for vector', {
              id,
              error: (error as Error).message,
            });
          }
        }

        // Sort by similarity (highest first) and take top K
        similarities.sort((a, b) => b.score - a.score);
        const results = similarities.slice(0, topK);

        const executionTime = Date.now() - startTime;

        span.setAttributes({
          'vector_search.results_found': results.length,
          'vector_search.execution_time_ms': executionTime,
          'vector_search.best_score': results[0]?.score || 0,
        });

        logger.debug('Vector search completed', {
          resultsFound: results.length,
          bestScore: results[0]?.score || 0,
          executionTime,
        });

        return results;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Vector search failed', {
          queryDimensions: queryVector.length,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  async remove(id: string): Promise<void> {
    return contextHelpers.withSpan('vector_search.remove', async (span) => {
      span.setAttribute('vector_search.id', id);

      try {
        const deleted = this.vectors.delete(id);

        span.setAttribute('vector_search.deleted', deleted);

        if (deleted) {
          logger.debug('Vector removed from search index', { id });
        } else {
          logger.warn('Vector not found in search index', { id });
        }
      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Failed to remove vector from search index', {
          id,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  async clear(): Promise<void> {
    return contextHelpers.withSpan('vector_search.clear', async (span) => {
      try {
        const clearedCount = this.vectors.size;
        this.vectors.clear();

        span.setAttribute('vector_search.cleared_count', clearedCount);

        logger.info('Vector search index cleared', { clearedCount });
      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Failed to clear vector search index', {
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  async size(): Promise<number> {
    return this.vectors.size;
  }
}

// Helper function to create a hash key for content
export function createContentHash(content: string): string {
  // Simple hash function for content-based caching
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Helper function to create node-based key
export function createNodeKey(nodeId: string): string {
  return `node:${nodeId}`;
}
