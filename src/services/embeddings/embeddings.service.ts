import { Graph } from '../../models/graph.model';
import {
  EmbeddingProvider,
  EmbeddingCache,
  VectorSearchIndex,
  EmbeddingVector,
  SemanticSearchOptions,
  SemanticSearchResult,
  SemanticEdge,
  SemanticEdgeOptions,
  EmbeddingConfig,
  DEFAULT_EMBEDDING_CONFIG,
} from './types';
import { OpenAIEmbeddingProvider } from './providers/openai-provider';
import { LocalEmbeddingProvider } from './providers/local-provider';
import { RedisEmbeddingCache } from './cache/redis-cache';
import { MemoryEmbeddingCache } from './cache/memory-cache';
import { MemoryVectorSearchIndex, createContentHash, createNodeKey } from './vector-search';
import { logger } from '../../utils/logger';
import { spanHelpers, contextHelpers } from '../../observability/tracing/tracer';
import { metricHelpers } from '../../observability/metrics/metrics';
import { shouldLazyInitEmbeddings } from '../../utils/runtime';

export class EmbeddingsService {
  private config: EmbeddingConfig;
  private providers: Map<string, EmbeddingProvider> = new Map();
  private cache?: EmbeddingCache;
  private vectorIndex?: VectorSearchIndex;
  private lazyInit: boolean;
  private initialized = false;
  private providersInitialized = false;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
    this.lazyInit = shouldLazyInitEmbeddings();

    if (this.lazyInit) {
      logger.info('Lazy initialization enabled for embeddings', {
        reason: process.env.LAZY_INIT_EMBEDDINGS ? 'env_override' : 'wsl_local',
      });
    } else {
      this.initializeProviders();
      this.initializeCache();
      this.initializeVectorIndex();
      this.initialized = true;
    }
  }

  /**
   * Generate embeddings for graph nodes
   */
  async generateGraphEmbeddings(graph: Graph): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('Embeddings disabled, skipping generation');
      return;
    }

    this.ensureInitialized();

    return contextHelpers.withSpan('embeddings.generate_graph', async (span) => {
      const startTime = Date.now();

      span.setAttributes({
        'embeddings.graph_id': graph.id,
        'embeddings.node_count': graph.nodes.size,
      });

      try {
        logger.info('Generating embeddings for graph', {
          graphId: graph.id,
          nodeCount: graph.nodes.size,
        });

        const texts: string[] = [];
        const nodeIds: string[] = [];

        // Collect text content from nodes
        for (const [nodeId, node] of graph.nodes) {
          if (node.content && node.content.trim()) {
            texts.push(node.content);
            nodeIds.push(nodeId);
          }
        }

        if (texts.length === 0) {
          logger.warn('No text content found in graph for embedding', { graphId: graph.id });
          return;
        }

        // Generate embeddings
        const embeddings = await this.generateEmbeddings(texts);

        // Store embeddings and add to vector index
        for (let i = 0; i < embeddings.length; i++) {
          const nodeId = nodeIds[i];
          const embedding = embeddings[i];
          const node = graph.nodes.get(nodeId);

          if (node) {
            const vector: EmbeddingVector = {
              id: createNodeKey(nodeId),
              vector: embedding,
              metadata: {
                nodeId,
                content: node.content.substring(0, 200), // Store truncated content for search
                type: node.type,
                page: node.metadata?.page,
                timestamp: new Date(),
              },
            };

            // Cache the embedding
            if (this.cache) {
              await this.cache.set(vector.id, vector);
            }

            // Add to vector search index
            if (this.vectorIndex) {
              await this.vectorIndex.add(vector);
            }
          }
        }

        const executionTime = Date.now() - startTime;

        span.setAttributes({
          'embeddings.generated_count': embeddings.length,
          'embeddings.execution_time_ms': executionTime,
        });

        logger.info('Graph embeddings generated', {
          graphId: graph.id,
          generatedCount: embeddings.length,
          executionTime,
        });

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Graph embeddings generation failed', {
          graphId: graph.id,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  /**
   * Generate semantic edges between similar nodes
   */
  async generateSemanticEdges(graph: Graph, options?: SemanticEdgeOptions): Promise<SemanticEdge[]> {
    if (!this.config.semanticEdges.enabled) {
      logger.debug('Semantic edges disabled, skipping generation');
      return [];
    }

    this.ensureInitialized();

    return contextHelpers.withSpan('embeddings.generate_semantic_edges', async (span) => {
      const startTime = Date.now();
      const threshold = options?.threshold || this.config.semanticEdges.threshold;
      const maxEdgesPerNode = options?.maxEdgesPerNode || this.config.semanticEdges.maxEdgesPerNode;

      span.setAttributes({
        'embeddings.graph_id': graph.id,
        'embeddings.threshold': threshold,
        'embeddings.max_edges_per_node': maxEdgesPerNode,
      });

      try {
        logger.info('Generating semantic edges', {
          graphId: graph.id,
          threshold,
          maxEdgesPerNode,
        });

        const edges: SemanticEdge[] = [];
        const processedNodes = new Set<string>();

        // Get all node embeddings
        const nodeEmbeddings = new Map<string, EmbeddingVector>();

        for (const [nodeId, node] of graph.nodes) {
          if (node.content && node.content.trim()) {
            const vectorId = createNodeKey(nodeId);
            const cached = this.cache ? await this.cache.get(vectorId) : null;

            if (cached) {
              nodeEmbeddings.set(nodeId, cached);
            }
          }
        }

        // Generate edges between similar nodes
        for (const [fromId, fromVector] of nodeEmbeddings) {
          if (processedNodes.has(fromId)) continue;

          const similarities: Array<{ nodeId: string; score: number }> = [];

          for (const [toId, toVector] of nodeEmbeddings) {
            if (fromId === toId) continue;

            try {
              // Calculate cosine similarity
              const similarity = this.cosineSimilarity(fromVector.vector, toVector.vector);

              if (similarity >= threshold) {
                similarities.push({ nodeId: toId, score: similarity });
              }
            } catch (error) {
              logger.warn('Failed to calculate similarity between nodes', {
                fromId,
                toId,
                error: (error as Error).message,
              });
            }
          }

          // Sort by similarity and take top N
          similarities.sort((a, b) => b.score - a.score);
          const topSimilarities = similarities.slice(0, maxEdgesPerNode);

          // Create edges
          for (const similarity of topSimilarities) {
            const edge: SemanticEdge = {
              from: fromId,
              to: similarity.nodeId,
              type: 'semantic',
              weight: similarity.score,
              metadata: {
                similarity: similarity.score,
                createdAt: new Date(),
              },
            };

            edges.push(edge);

            // Add reverse edge if bidirectional
            if (options?.bidirectional !== false) {
              const reverseEdge: SemanticEdge = {
                from: similarity.nodeId,
                to: fromId,
                type: 'semantic',
                weight: similarity.score,
                metadata: {
                  similarity: similarity.score,
                  createdAt: new Date(),
                },
              };
              edges.push(reverseEdge);
            }
          }

          processedNodes.add(fromId);
        }

        const executionTime = Date.now() - startTime;

        span.setAttributes({
          'embeddings.edges_generated': edges.length,
          'embeddings.execution_time_ms': executionTime,
        });

        logger.info('Semantic edges generated', {
          graphId: graph.id,
          edgesGenerated: edges.length,
          executionTime,
        });

        return edges;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Semantic edges generation failed', {
          graphId: graph.id,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  /**
   * Perform semantic search
   */
  async semanticSearch(graph: Graph, options: SemanticSearchOptions): Promise<SemanticSearchResult> {
    this.ensureInitialized();

    if (!this.config.vectorSearch.enabled || !this.vectorIndex) {
      throw new Error('Vector search is not enabled');
    }

    return contextHelpers.withSpan('embeddings.semantic_search', async (span) => {
      const startTime = Date.now();

      span.setAttributes({
        'embeddings.graph_id': graph.id,
        'embeddings.query_length': options.query.length,
        'embeddings.top_k': options.topK,
      });

      try {
        logger.debug('Performing semantic search', {
          graphId: graph.id,
          queryLength: options.query.length,
          topK: options.topK,
        });

        // Generate embedding for the query
        const queryEmbedding = await this.generateEmbedding(options.query);

        // Search the vector index
        const searchResults = await this.vectorIndex.search(queryEmbedding, options);

        const result: SemanticSearchResult = {
          query: options.query,
          results: searchResults,
          totalFound: searchResults.length,
          executionTime: Date.now() - startTime,
        };

        span.setAttributes({
          'embeddings.results_found': searchResults.length,
          'embeddings.best_score': searchResults[0]?.score || 0,
          'embeddings.execution_time_ms': result.executionTime,
        });

        logger.debug('Semantic search completed', {
          queryLength: options.query.length,
          resultsFound: searchResults.length,
          bestScore: searchResults[0]?.score || 0,
          executionTime: result.executionTime,
        });

        return result;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Semantic search failed', {
          graphId: graph.id,
          queryLength: options.query.length,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  /**
   * Generate embedding for a single text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    this.ensureInitialized();

    const provider = this.getProvider();

    // Check cache first
    if (this.cache) {
      const cacheKey = createContentHash(text);
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached.vector;
      }
    }

    // Generate new embedding
    const embedding = await provider.generateEmbedding(text);

    // Cache the result
    if (this.cache) {
      const vector: EmbeddingVector = {
        id: createContentHash(text),
        vector: embedding,
        metadata: {
          content: text.substring(0, 200),
          timestamp: new Date(),
        },
      };
      await this.cache.set(vector.id, vector);
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    this.ensureInitialized();

    const provider = this.getProvider();
    return provider.generateEmbeddings(texts);
  }

  /**
   * Get the appropriate embedding provider
   */
  private getProvider(): EmbeddingProvider {
    this.ensureInitialized();

    const providerName = this.config.provider;

    if (providerName === 'auto') {
      // Try local first, then OpenAI
      const localProvider = this.providers.get('local');
      if (localProvider && localProvider.isAvailable()) {
        return localProvider;
      }

      const openaiProvider = this.providers.get('openai');
      if (openaiProvider) {
        return openaiProvider;
      }

      throw new Error('No embedding providers available');
    }

    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Embedding provider '${providerName}' not found`);
    }

    return provider;
  }

  /**
   * Initialize embedding providers
   */
  private initializeProviders(): void {
    if (this.providersInitialized) {
      return;
    }

    this.providers = new Map();

    // Initialize OpenAI provider
    this.providers.set('openai', new OpenAIEmbeddingProvider());

    // Initialize local provider
    const localProvider = new LocalEmbeddingProvider();
    this.providers.set('local', localProvider);

    // Preload local provider when not lazily initialized
    if (!this.lazyInit) {
      localProvider.initialize().catch(error => {
        logger.warn('Failed to initialize local embedding provider', {
          error: error.message,
        });
      });
    }

    this.providersInitialized = true;
  }

  /**
   * Initialize cache
   */
  private initializeCache(): void {
    if (!this.config.cache.enabled) {
      return;
    }

    try {
      // Try Redis first, fallback to memory
      this.cache = new RedisEmbeddingCache(this.config.cache.ttl);
      logger.info('Using Redis embedding cache');
    } catch (error) {
      logger.warn('Redis cache not available, falling back to memory cache', {
        error: (error as Error).message,
      });
      this.cache = new MemoryEmbeddingCache(this.config.cache.ttl);
    }
  }

  /**
   * Initialize vector search index
   */
  private initializeVectorIndex(): void {
    if (!this.config.vectorSearch.enabled) {
      return;
    }

    if (this.config.vectorSearch.indexType === 'memory') {
      this.vectorIndex = new MemoryVectorSearchIndex();
      logger.info('Using memory vector search index');
    } else {
      // For now, only memory index is implemented
      // Could add Redis/HNSW/other indices later
      this.vectorIndex = new MemoryVectorSearchIndex();
      logger.warn('Redis vector index not implemented, using memory index');
    }
  }

  /**
   * Ensure heavy components are initialized (no-op if already done).
   */
  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    this.initializeProviders();
    this.initializeCache();
    this.initializeVectorIndex();
    this.initialized = true;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...config };

    // Re-initialize components if needed
    if (config.cache !== undefined) {
      this.initializeCache();
    }

    if (config.vectorSearch !== undefined) {
      this.initializeVectorIndex();
    }

    logger.info('Embeddings configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Clear all cached embeddings
   */
  async clearCache(): Promise<void> {
    if (this.cache) {
      await this.cache.clear();
      logger.info('Embeddings cache cleared');
    }

    if (this.vectorIndex) {
      await this.vectorIndex.clear();
      logger.info('Vector search index cleared');
    }
  }
}

// Export singleton instance
export const embeddingsService = new EmbeddingsService();
