import { redis } from '../../../database/redis';
import { EmbeddingCache, EmbeddingVector } from '../types';
import { logger } from '../../../utils/logger';
import { spanHelpers, contextHelpers } from '../../../observability/tracing/tracer';
import { metricHelpers } from '../../../observability/metrics/metrics';

export class RedisEmbeddingCache implements EmbeddingCache {
  private readonly prefix = 'embedding:';
  private readonly ttl?: number;

  constructor(ttlSeconds?: number) {
    this.ttl = ttlSeconds;
  }

  async get(key: string): Promise<EmbeddingVector | null> {
    return contextHelpers.withSpan('embeddings.cache.get', async (span) => {
      span.setAttribute('cache.key', key);

      try {
        const cacheKey = this.getCacheKey(key);
        const cached = await redis.get(cacheKey);

        if (cached) {
          const vector: EmbeddingVector = JSON.parse(cached);
          metricHelpers.recordCacheHit('embeddings');
          span.setAttribute('cache.hit', true);

          logger.debug('Embedding cache hit', { key });
          return vector;
        }

        metricHelpers.recordCacheMiss('embeddings');
        span.setAttribute('cache.hit', false);
        logger.debug('Embedding cache miss', { key });
        return null;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Embedding cache get failed', {
          key,
          error: (error as Error).message,
        });
        return null; // Cache miss on error
      }
    });
  }

  async set(key: string, vector: EmbeddingVector): Promise<void> {
    return contextHelpers.withSpan('embeddings.cache.set', async (span) => {
      span.setAttributes({
        'cache.key': key,
        'cache.vector_dimensions': vector.vector.length,
      });

      try {
        const cacheKey = this.getCacheKey(key);
        const serialized = JSON.stringify(vector);

        if (this.ttl) {
          await redis.setex(cacheKey, this.ttl, serialized);
        } else {
          await redis.set(cacheKey, serialized);
        }

        // Update cache size metric
        await this.updateCacheSizeMetric();

        logger.debug('Embedding cached', {
          key,
          dimensions: vector.vector.length,
          ttl: this.ttl,
        });

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Embedding cache set failed', {
          key,
          error: (error as Error).message,
        });
        // Don't throw - caching failure shouldn't break the main flow
      }
    });
  }

  async has(key: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(key);
      const exists = await redis.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      logger.error('Embedding cache has check failed', {
        key,
        error: (error as Error).message,
      });
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    return contextHelpers.withSpan('embeddings.cache.delete', async (span) => {
      span.setAttribute('cache.key', key);

      try {
        const cacheKey = this.getCacheKey(key);
        await redis.del(cacheKey);

        await this.updateCacheSizeMetric();

        logger.debug('Embedding cache entry deleted', { key });

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Embedding cache delete failed', {
          key,
          error: (error as Error).message,
        });
      }
    });
  }

  async clear(): Promise<void> {
    return contextHelpers.withSpan('embeddings.cache.clear', async (span) => {
      try {
        // Find all embedding keys and delete them
        const keys = await redis.keys(`${this.prefix}*`);

        if (keys.length > 0) {
          await redis.del(keys);
        }

        await this.updateCacheSizeMetric();

        span.setAttribute('cache.cleared_keys', keys.length);
        logger.info('Embedding cache cleared', { clearedKeys: keys.length });

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Embedding cache clear failed', {
          error: (error as Error).message,
        });
      }
    });
  }

  async size(): Promise<number> {
    try {
      const keys = await redis.keys(`${this.prefix}*`);
      return keys.length;
    } catch (error) {
      logger.error('Embedding cache size check failed', {
        error: (error as Error).message,
      });
      return 0;
    }
  }

  async getAll(): Promise<EmbeddingVector[]> {
    try {
      const keys = await redis.keys(`${this.prefix}*`);
      const vectors: EmbeddingVector[] = [];

      for (const key of keys) {
        const cached = await redis.get(key);
        if (cached) {
          try {
            vectors.push(JSON.parse(cached));
          } catch (parseError) {
            logger.warn('Failed to parse cached embedding', {
              key,
              error: (parseError as Error).message,
            });
          }
        }
      }

      return vectors;
    } catch (error) {
      logger.error('Embedding cache getAll failed', {
        error: (error as Error).message,
      });
      return [];
    }
  }

  private getCacheKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private async updateCacheSizeMetric(): Promise<void> {
    try {
      const size = await this.size();
      metricHelpers.setCacheSize('embeddings', size);
    } catch (error) {
      // Don't log errors here to avoid recursive logging
    }
  }
}
