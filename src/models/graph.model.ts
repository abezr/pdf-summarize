/**
 * Graph data structure interfaces for knowledge graph representation
 * of PDF documents and their relationships.
 */

export type NodeType =
  | 'document' // Root document node
  | 'section' // Document section (heading)
  | 'paragraph' // Text paragraph
  | 'table' // Table content
  | 'image' // Image reference
  | 'list' // List or enumeration
  | 'code' // Code block
  | 'metadata'; // Document metadata

export const NODE_TYPES: readonly NodeType[] = [
  'document',
  'section',
  'paragraph',
  'table',
  'image',
  'list',
  'code',
  'metadata',
] as const;

export type EdgeType =
  | 'contains' // Hierarchical containment (document → section, section → paragraph)
  | 'references' // Cross-reference between elements
  | 'follows' // Sequential order (paragraph1 → paragraph2)
  | 'similar' // Semantic similarity between content
  | 'parent' // Parent-child relationship
  | 'child' // Child-parent relationship
  | 'next' // Sequential next element
  | 'previous'; // Sequential previous element

export const EDGE_TYPES: readonly EdgeType[] = [
  'contains',
  'references',
  'follows',
  'similar',
  'parent',
  'child',
  'next',
  'previous',
] as const;

export interface Position {
  /** Page number (1-indexed) */
  page: number;
  /** Character position in full text (0-indexed) */
  start: number;
  /** Character position where this element ends */
  end: number;
  /** Bounding box coordinates (if available) */
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface NodeMetadata {
  /** Confidence score for element detection (0-1) */
  confidence?: number;
  /** Language code (e.g., 'en', 'es') */
  language?: string;
  /** Font information */
  font?: {
    family: string;
    size: number;
    weight?: 'normal' | 'bold';
    style?: 'normal' | 'italic';
  };
  /** Color information (if applicable) */
  color?: string;
  /** Custom properties specific to node type */
  properties?: Record<string, any>;
}

export interface GraphNode {
  /** Unique identifier for the node */
  id: string;
  /** Type of content this node represents */
  type: NodeType;
  /** Human-readable label */
  label: string;
  /** Text content of the node */
  content: string;
  /** Position information within the document */
  position: Position;
  /** Additional metadata */
  metadata?: NodeMetadata;
  /** Creation timestamp */
  created_at: Date;
  /** Last modification timestamp */
  updated_at: Date;
}

export interface GraphEdge {
  /** Unique identifier for the edge */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Type of relationship */
  type: EdgeType;
  /** Weight/strength of the relationship (0-1) */
  weight: number;
  /** Additional metadata for the relationship */
  metadata?: {
    /** Distance between elements (pages, characters) */
    distance?: number;
    /** Context in which this relationship exists */
    context?: string;
    /** Similarity score for similarity edges (0-1) */
    similarityScore?: number;
    /** Custom properties */
    properties?: Record<string, any>;
  };
  /** Creation timestamp */
  created_at: Date;
}

export interface GraphStatistics {
  /** Total number of nodes */
  nodeCount: number;
  /** Total number of edges */
  edgeCount: number;
  /** Node count by type */
  nodesByType: Record<NodeType, number>;
  /** Edge count by type */
  edgesByType: Record<EdgeType, number>;
  /** Average node degree (connections per node) */
  averageDegree: number;
  /** Maximum node degree */
  maxDegree: number;
  /** Graph density (actual edges / possible edges) */
  density: number;
  /** Connected components count */
  components: number;
  /** Average path length between nodes */
  averagePathLength?: number;
}

export interface GraphIndex {
  /** Nodes indexed by type */
  byType: Map<NodeType, string[]>;
  /** Nodes indexed by page number */
  byPage: Map<number, string[]>;
  /** Nodes indexed by content keywords (for search) */
  byKeyword: Map<string, string[]>;
  /** Quick lookup map for node IDs to nodes */
  nodeMap: Map<string, GraphNode>;
  /** Quick lookup map for edge IDs to edges */
  edgeMap: Map<string, GraphEdge>;
  /** Adjacency list: node ID -> list of connected node IDs */
  adjacencyList: Map<string, string[]>;
}

export interface Graph {
  /** Unique identifier for the graph */
  id: string;
  /** Associated document ID */
  documentId: string;
  /** All nodes in the graph */
  nodes: GraphNode[];
  /** All edges in the graph */
  edges: GraphEdge[];
  /** Graph index for efficient lookups */
  index: GraphIndex;
  /** Graph statistics */
  statistics: GraphStatistics;
  /** Graph metadata */
  metadata: {
    /** When the graph was created */
    created_at: Date;
    /** When the graph was last updated */
    updated_at: Date;
    /** Graph version for migration support */
    version: string;
    /** Processing status */
    status: 'building' | 'complete' | 'error';
    /** Processing duration in milliseconds */
    processingTime?: number;
    /** Error message if status is 'error' */
    error?: string;
  };
}

/**
 * Factory interfaces for creating nodes and edges
 */
export interface CreateNodeInput {
  type: NodeType;
  label: string;
  content: string;
  position: Position;
  metadata?: NodeMetadata;
}

export interface CreateEdgeInput {
  source: string;
  target: string;
  type: EdgeType;
  weight?: number;
  metadata?: GraphEdge['metadata'];
}

/**
 * Query interfaces for graph operations
 */
export interface NodeQuery {
  /** Filter by node types */
  types?: NodeType[];
  /** Filter by page numbers */
  pages?: number[];
  /** Filter by content keywords */
  keywords?: string[];
  /** Filter by confidence threshold */
  minConfidence?: number;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface EdgeQuery {
  /** Filter by edge types */
  types?: EdgeType[];
  /** Filter by source node ID */
  source?: string;
  /** Filter by target node ID */
  target?: string;
  /** Filter by minimum weight */
  minWeight?: number;
  /** Limit results */
  limit?: number;
}

/**
 * Serialization interfaces
 */
export interface GraphSerialization {
  /** Graph metadata for deserialization */
  metadata: Graph['metadata'];
  /** Serialized nodes */
  nodes: Omit<GraphNode, 'created_at' | 'updated_at'>[];
  /** Serialized edges */
  edges: Omit<GraphEdge, 'created_at'>[];
}

export interface GraphValidationResult {
  /** Whether the graph is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
  /** Validation statistics */
  stats: {
    /** Orphaned nodes (no edges) */
    orphanedNodes: number;
    /** Duplicate node IDs */
    duplicateNodeIds: number;
    /** Duplicate edge IDs */
    duplicateEdgeIds: number;
    /** Invalid edge references */
    invalidEdges: number;
    /** Self-referencing edges */
    selfReferencingEdges: number;
  };
}
