import { EmbeddingCache, EmbeddingVector } from '../types';
import { logger } from '../../../utils/logger';
import { spanHelpers, contextHelpers } from '../../../observability/tracing/tracer';
import { metricHelpers } from '../../../observability/metrics/metrics';

export class MemoryEmbeddingCache implements EmbeddingCache {
  private cache = new Map<string, EmbeddingVector>();
  private readonly ttl?: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(ttlSeconds?: number) {
    this.ttl = ttlSeconds;

    // Set up periodic cleanup if TTL is specified
    if (this.ttl) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpired();
      }, 60000); // Clean up every minute
    }
  }

  async get(key: string): Promise<EmbeddingVector | null> {
    return contextHelpers.withSpan('embeddings.cache.memory.get', async (span) => {
      span.setAttribute('cache.key', key);

      try {
        const vector = this.cache.get(key);

        if (vector) {
          // Check if expired
          if (this.isExpired(vector)) {
            await this.delete(key);
            metricHelpers.recordCacheMiss('embeddings');
            span.setAttribute('cache.hit', false);
            span.setAttribute('cache.expired', true);
            return null;
          }

          metricHelpers.recordCacheHit('embeddings');
          span.setAttribute('cache.hit', true);
          return vector;
        }

        metricHelpers.recordCacheMiss('embeddings');
        span.setAttribute('cache.hit', false);
        return null;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Memory embedding cache get failed', {
          key,
          error: (error as Error).message,
        });
        return null;
      }
    });
  }

  async set(key: string, vector: EmbeddingVector): Promise<void> {
    return contextHelpers.withSpan('embeddings.cache.memory.set', async (span) => {
      span.setAttributes({
        'cache.key': key,
        'cache.vector_dimensions': vector.vector.length,
      });

      try {
        // Add timestamp for TTL
        const vectorWithTimestamp = {
          ...vector,
          metadata: {
            ...vector.metadata,
            cachedAt: new Date(),
          },
        };

        this.cache.set(key, vectorWithTimestamp);
        await this.updateCacheSizeMetric();

        logger.debug('Embedding cached in memory', {
          key,
          dimensions: vector.vector.length,
          ttl: this.ttl,
        });

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Memory embedding cache set failed', {
          key,
          error: (error as Error).message,
        });
      }
    });
  }

  async has(key: string): Promise<boolean> {
    try {
      const vector = this.cache.get(key);
      if (!vector) return false;

      // Check if expired
      return !this.isExpired(vector);
    } catch (error) {
      logger.error('Memory embedding cache has check failed', {
        key,
        error: (error as Error).message,
      });
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    return contextHelpers.withSpan('embeddings.cache.memory.delete', async (span) => {
      span.setAttribute('cache.key', key);

      try {
        this.cache.delete(key);
        await this.updateCacheSizeMetric();

        logger.debug('Embedding cache entry deleted from memory', { key });

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Memory embedding cache delete failed', {
          key,
          error: (error as Error).message,
        });
      }
    });
  }

  async clear(): Promise<void> {
    return contextHelpers.withSpan('embeddings.cache.memory.clear', async (span) => {
      try {
        const clearedKeys = this.cache.size;
        this.cache.clear();
        await this.updateCacheSizeMetric();

        span.setAttribute('cache.cleared_keys', clearedKeys);
        logger.info('Memory embedding cache cleared', { clearedKeys });

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Memory embedding cache clear failed', {
          error: (error as Error).message,
        });
      }
    });
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  async getAll(): Promise<EmbeddingVector[]> {
    try {
      // Filter out expired entries
      const validVectors: EmbeddingVector[] = [];
      for (const [key, vector] of this.cache) {
        if (!this.isExpired(vector)) {
          validVectors.push(vector);
        } else {
          // Clean up expired entries
          this.cache.delete(key);
        }
      }

      return validVectors;
    } catch (error) {
      logger.error('Memory embedding cache getAll failed', {
        error: (error as Error).message,
      });
      return [];
    }
  }

  private isExpired(vector: EmbeddingVector): boolean {
    if (!this.ttl || !vector.metadata?.cachedAt) {
      return false;
    }

    const cachedAt = new Date(vector.metadata.cachedAt).getTime();
    const now = Date.now();
    const age = (now - cachedAt) / 1000; // Convert to seconds

    return age > this.ttl;
  }

  private cleanupExpired(): void {
    try {
      let cleaned = 0;
      for (const [key, vector] of this.cache) {
        if (this.isExpired(vector)) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug('Cleaned up expired embeddings from memory cache', {
          cleanedCount: cleaned,
          remainingCount: this.cache.size,
        });
      }
    } catch (error) {
      logger.error('Memory cache cleanup failed', {
        error: (error as Error).message,
      });
    }
  }

  private async updateCacheSizeMetric(): Promise<void> {
    try {
      const size = await this.size();
      metricHelpers.setCacheSize('embeddings', size);
    } catch (error) {
      // Don't log errors here to avoid recursive logging
    }
  }

  // Cleanup method for graceful shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
