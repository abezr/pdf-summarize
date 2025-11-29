export { EmbeddingsService, embeddingsService } from './embeddings.service';
export { OpenAIEmbeddingProvider } from './providers/openai-provider';
export { LocalEmbeddingProvider } from './providers/local-provider';
export { RedisEmbeddingCache } from './cache/redis-cache';
export { MemoryEmbeddingCache } from './cache/memory-cache';
export { MemoryVectorSearchIndex } from './vector-search';
export type {
  EmbeddingVector,
  EmbeddingOptions,
  SimilarityResult,
  SemanticSearchOptions,
  SemanticSearchResult,
  EmbeddingProvider,
  EmbeddingCache,
  VectorSearchIndex,
  SemanticEdge,
  SemanticEdgeOptions,
  EmbeddingConfig,
} from './types';
