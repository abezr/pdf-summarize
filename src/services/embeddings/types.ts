// Embeddings service types and interfaces

export interface EmbeddingVector {
  id: string; // Node ID or content hash
  vector: number[];
  metadata?: {
    nodeId?: string;
    content?: string;
    type?: string;
    page?: number;
    timestamp?: Date;
  };
}

export interface EmbeddingOptions {
  provider?: 'openai' | 'local' | 'auto';
  model?: string; // Specific model to use
  dimensions?: number; // Desired dimensions (for OpenAI)
}

export interface SimilarityResult {
  id: string;
  score: number; // Cosine similarity (0-1)
  metadata?: Record<string, any>;
}

export interface SemanticSearchOptions {
  query: string;
  topK?: number; // Number of results to return
  threshold?: number; // Minimum similarity score
  nodeTypes?: string[]; // Filter by node types
  maxDistance?: number; // Maximum graph distance for context
}

export interface SemanticSearchResult {
  query: string;
  results: SimilarityResult[];
  totalFound: number;
  executionTime: number;
}

export interface EmbeddingProvider {
  name: string;
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]>;
  generateEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]>;
  getDimensions(): number;
  isAvailable(): Promise<boolean>;
}

export interface EmbeddingCache {
  get(key: string): Promise<EmbeddingVector | null>;
  set(key: string, vector: EmbeddingVector): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
  getAll(): Promise<EmbeddingVector[]>;
}

export interface SemanticEdge {
  from: string; // Source node ID
  to: string;   // Target node ID
  type: 'semantic';
  weight: number; // Similarity score (0-1)
  metadata?: {
    similarity: number;
    embeddingModel?: string;
    createdAt?: Date;
  };
}

export interface SemanticEdgeOptions {
  threshold?: number; // Minimum similarity to create edge (default: 0.7)
  maxEdgesPerNode?: number; // Maximum edges per node (default: 5)
  bidirectional?: boolean; // Create edges in both directions (default: true)
}

export interface VectorSearchIndex {
  add(vector: EmbeddingVector): Promise<void>;
  addBatch(vectors: EmbeddingVector[]): Promise<void>;
  search(queryVector: number[], options: SemanticSearchOptions): Promise<SimilarityResult[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

// Configuration
export interface EmbeddingConfig {
  enabled: boolean;
  provider: 'openai' | 'local' | 'auto';
  model: string;
  dimensions: number;
  cache: {
    enabled: boolean;
    ttl?: number; // Time to live in seconds
  };
  semanticEdges: {
    enabled: boolean;
    threshold: number;
    maxEdgesPerNode: number;
  };
  vectorSearch: {
    enabled: boolean;
    indexType: 'memory' | 'redis'; // Future: add more index types
  };
}

// Default configuration
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  enabled: true,
  provider: 'auto', // Try local first, fallback to OpenAI
  model: 'text-embedding-3-small', // For OpenAI
  dimensions: 1536, // OpenAI ada-002 dimensions
  cache: {
    enabled: true,
    ttl: 86400, // 24 hours
  },
  semanticEdges: {
    enabled: true,
    threshold: 0.7,
    maxEdgesPerNode: 5,
  },
  vectorSearch: {
    enabled: true,
    indexType: 'memory',
  },
};
