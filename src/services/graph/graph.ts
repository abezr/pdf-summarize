import { v4 as uuidv4 } from 'uuid';
import {
  Graph as GraphInterface,
  GraphNode,
  GraphEdge,
  GraphIndex,
  GraphStatistics,
  GraphSerialization,
  GraphValidationResult,
  NodeType,
  EdgeType,
  NODE_TYPES,
  EDGE_TYPES,
  Position,
  NodeMetadata
} from '../../models';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

/**
 * Implementation of the Graph data structure with adjacency list representation
 * Provides efficient node/edge management, indexing, and graph operations
 */
export class Graph implements GraphInterface {
  public readonly id: string;
  public readonly documentId: string;
  public nodes: GraphNode[];
  public edges: GraphEdge[];
  public readonly index: GraphIndex;
  public readonly statistics: GraphStatistics;
  public readonly metadata: GraphInterface['metadata'];

  /**
   * Create a new graph instance
   */
  constructor(documentId: string, id?: string) {
    this.id = id || uuidv4();
    this.documentId = documentId;
    this.nodes = [];
    this.edges = [];

    // Initialize empty index
    this.index = {
      byType: new Map(),
      byPage: new Map(),
      byKeyword: new Map(),
      nodeMap: new Map(),
      edgeMap: new Map(),
      adjacencyList: new Map()
    };

    // Initialize empty statistics
    this.statistics = {
      nodeCount: 0,
      edgeCount: 0,
      nodesByType: {} as Record<NodeType, number>,
      edgesByType: {} as Record<EdgeType, number>,
      averageDegree: 0,
      maxDegree: 0,
      density: 0,
      components: 0
    };

    // Initialize metadata
    this.metadata = {
      created_at: new Date(),
      updated_at: new Date(),
      version: '1.0',
      status: 'building',
      processingTime: undefined,
      error: undefined
    };

    // Initialize index maps
    NODE_TYPES.forEach(type => {
      this.index.byType.set(type, []);
      this.statistics.nodesByType[type] = 0;
    });
    EDGE_TYPES.forEach(type => {
      this.statistics.edgesByType[type] = 0;
    });
  }

  /**
   * Add a node to the graph
   */
  addNode(node: GraphNode): void {
    // Check for duplicate ID
    if (this.index.nodeMap.has(node.id)) {
      throw new AppError(`Node with ID ${node.id} already exists`, 400);
    }

    // Add node to collections
    this.nodes.push(node);
    this.index.nodeMap.set(node.id, node);

    // Update type index
    const typeNodes = this.index.byType.get(node.type) || [];
    typeNodes.push(node.id);
    this.index.byType.set(node.type, typeNodes);

    // Update page index
    const pageNodes = this.index.byPage.get(node.position.page) || [];
    pageNodes.push(node.id);
    this.index.byPage.set(node.position.page, pageNodes);

    // Update keyword index (extract keywords from content)
    const keywords = this.extractKeywords(node.content);
    keywords.forEach(keyword => {
      const keywordNodes = this.index.byKeyword.get(keyword) || [];
      keywordNodes.push(node.id);
      this.index.byKeyword.set(keyword, keywordNodes);
    });

    // Initialize adjacency list entry
    this.index.adjacencyList.set(node.id, []);

    // Update metadata
    this.metadata.updated_at = new Date();

    // Mark as needing statistics recalculation
    this.updateStatistics();
  }

  /**
   * Remove a node from the graph
   */
  removeNode(nodeId: string): boolean {
    const nodeIndex = this.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return false;
    }

    const node = this.nodes[nodeIndex];

    // Remove from collections
    this.nodes.splice(nodeIndex, 1);
    this.index.nodeMap.delete(nodeId);

    // Remove from type index
    const typeNodes = this.index.byType.get(node.type) || [];
    const typeIndex = typeNodes.indexOf(nodeId);
    if (typeIndex !== -1) {
      typeNodes.splice(typeIndex, 1);
    }

    // Remove from page index
    const pageNodes = this.index.byPage.get(node.position.page) || [];
    const pageIndex = pageNodes.indexOf(nodeId);
    if (pageIndex !== -1) {
      pageNodes.splice(pageIndex, 1);
    }

    // Remove from keyword index
    const keywords = this.extractKeywords(node.content);
    keywords.forEach(keyword => {
      const keywordNodes = this.index.byKeyword.get(keyword) || [];
      const keywordIndex = keywordNodes.indexOf(nodeId);
      if (keywordIndex !== -1) {
        keywordNodes.splice(keywordIndex, 1);
      }
    });

    // Remove connected edges
    const connectedEdges = this.edges.filter(e => e.source === nodeId || e.target === nodeId);
    connectedEdges.forEach(edge => this.removeEdge(edge.id));

    // Remove from adjacency list
    this.index.adjacencyList.delete(nodeId);

    // Update metadata
    this.metadata.updated_at = new Date();

    // Recalculate statistics
    this.updateStatistics();

    return true;
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edge: GraphEdge): void {
    // Validate edge references exist
    if (!this.index.nodeMap.has(edge.source)) {
      throw new AppError(`Source node ${edge.source} does not exist`, 400);
    }
    if (!this.index.nodeMap.has(edge.target)) {
      throw new AppError(`Target node ${edge.target} does not exist`, 400);
    }

    // Check for duplicate ID
    if (this.index.edgeMap.has(edge.id)) {
      throw new AppError(`Edge with ID ${edge.id} already exists`, 400);
    }

    // Add edge to collections
    this.edges.push(edge);
    this.index.edgeMap.set(edge.id, edge);

    // Update adjacency list
    const sourceAdjacents = this.index.adjacencyList.get(edge.source) || [];
    sourceAdjacents.push(edge.target);
    this.index.adjacencyList.set(edge.source, sourceAdjacents);

    // Update metadata
    this.metadata.updated_at = new Date();

    // Recalculate statistics
    this.updateStatistics();
  }

  /**
   * Remove an edge from the graph
   */
  removeEdge(edgeId: string): boolean {
    const edgeIndex = this.edges.findIndex(e => e.id === edgeId);
    if (edgeIndex === -1) {
      return false;
    }

    const edge = this.edges[edgeIndex];

    // Remove from collections
    this.edges.splice(edgeIndex, 1);
    this.index.edgeMap.delete(edgeId);

    // Update adjacency list
    const sourceAdjacents = this.index.adjacencyList.get(edge.source) || [];
    const targetIndex = sourceAdjacents.indexOf(edge.target);
    if (targetIndex !== -1) {
      sourceAdjacents.splice(targetIndex, 1);
    }

    // Update metadata
    this.metadata.updated_at = new Date();

    // Recalculate statistics
    this.updateStatistics();

    return true;
  }

  /**
   * Get all neighbors of a node
   */
  getNeighbors(nodeId: string): string[] {
    return this.index.adjacencyList.get(nodeId) || [];
  }

  /**
   * Get the degree of a node (number of connections)
   */
  getDegree(nodeId: string): number {
    return this.getNeighbors(nodeId).length;
  }

  /**
   * Find nodes by type
   */
  getNodesByType(type: NodeType): GraphNode[] {
    const nodeIds = this.index.byType.get(type) || [];
    return nodeIds.map(id => this.index.nodeMap.get(id)!).filter(Boolean);
  }

  /**
   * Find nodes by page
   */
  getNodesByPage(page: number): GraphNode[] {
    const nodeIds = this.index.byPage.get(page) || [];
    return nodeIds.map(id => this.index.nodeMap.get(id)!).filter(Boolean);
  }

  /**
   * Find nodes by keyword
   */
  getNodesByKeyword(keyword: string): GraphNode[] {
    const nodeIds = this.index.byKeyword.get(keyword.toLowerCase()) || [];
    return nodeIds.map(id => this.index.nodeMap.get(id)!).filter(Boolean);
  }

  /**
   * Calculate and update graph statistics
   */
  private updateStatistics(): void {
    const nodeCount = this.nodes.length;
    const edgeCount = this.edges.length;

    // Count nodes by type
    const nodesByType = {} as Record<NodeType, number>;
    NODE_TYPES.forEach(type => {
      nodesByType[type] = this.index.byType.get(type)?.length || 0;
    });

    // Count edges by type
    const edgesByType = {} as Record<EdgeType, number>;
    EDGE_TYPES.forEach(type => {
      edgesByType[type] = 0;
    });
    this.edges.forEach(edge => {
      edgesByType[edge.type]++;
    });

    // Calculate degrees
    const degrees = this.nodes.map(node => this.getDegree(node.id));
    const averageDegree = degrees.length > 0 ? degrees.reduce((a, b) => a + b, 0) / degrees.length : 0;
    const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;

    // Calculate density (actual edges / possible edges)
    const possibleEdges = nodeCount * (nodeCount - 1); // Directed graph
    const density = possibleEdges > 0 ? edgeCount / possibleEdges : 0;

    // Calculate connected components (simplified - just count nodes with degree 0)
    const components = this.nodes.filter(node => this.getDegree(node.id) === 0).length;

    // Update statistics
    Object.assign(this.statistics, {
      nodeCount,
      edgeCount,
      nodesByType,
      edgesByType,
      averageDegree,
      maxDegree,
      density,
      components
    });
  }

  /**
   * Extract keywords from content for indexing
   */
  private extractKeywords(content: string): string[] {
    // Simple keyword extraction: split by whitespace, filter common words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);

    return content
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
  }

  /**
   * Serialize the graph for storage
   */
  serialize(): GraphSerialization {
    return {
      metadata: this.metadata,
      nodes: this.nodes.map(node => ({
        id: node.id,
        type: node.type,
        label: node.label,
        content: node.content,
        position: node.position,
        metadata: node.metadata
      })),
      edges: this.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        weight: edge.weight,
        metadata: edge.metadata
      }))
    };
  }

  /**
   * Validate graph integrity
   */
  validate(): GraphValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for orphaned nodes
    const orphanedNodes = this.nodes.filter(node => this.getDegree(node.id) === 0).length;

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    const duplicateNodeIds = new Set<string>();
    this.nodes.forEach(node => {
      if (nodeIds.has(node.id)) {
        duplicateNodeIds.add(node.id);
      }
      nodeIds.add(node.id);
    });

    // Check for duplicate edge IDs
    const edgeIds = new Set<string>();
    const duplicateEdgeIds = new Set<string>();
    this.edges.forEach(edge => {
      if (edgeIds.has(edge.id)) {
        duplicateEdgeIds.add(edge.id);
      }
      edgeIds.add(edge.id);
    });

    // Check for invalid edge references
    let invalidEdges = 0;
    this.edges.forEach(edge => {
      if (!this.index.nodeMap.has(edge.source) || !this.index.nodeMap.has(edge.target)) {
        invalidEdges++;
      }
    });

    // Check for self-referencing edges
    let selfReferencingEdges = 0;
    this.edges.forEach(edge => {
      if (edge.source === edge.target) {
        selfReferencingEdges++;
      }
    });

    // Add errors
    if (duplicateNodeIds.size > 0) {
      errors.push(`Found ${duplicateNodeIds.size} duplicate node IDs`);
    }
    if (duplicateEdgeIds.size > 0) {
      errors.push(`Found ${duplicateEdgeIds.size} duplicate edge IDs`);
    }
    if (invalidEdges > 0) {
      errors.push(`Found ${invalidEdges} edges referencing non-existent nodes`);
    }
    if (selfReferencingEdges > 0) {
      errors.push(`Found ${selfReferencingEdges} self-referencing edges`);
    }

    // Add warnings
    if (orphanedNodes > 0) {
      warnings.push(`${orphanedNodes} nodes have no connections`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        orphanedNodes,
        duplicateNodeIds: duplicateNodeIds.size,
        duplicateEdgeIds: duplicateEdgeIds.size,
        invalidEdges,
        selfReferencingEdges
      }
    };
  }

  /**
   * Mark graph as complete
   */
  complete(): void {
    this.metadata.status = 'complete';
    this.metadata.updated_at = new Date();

    const validation = this.validate();
    if (!validation.isValid) {
      logger.warn('Graph marked as complete but has validation errors', {
        errors: validation.errors,
        graphId: this.id
      });
    }

    logger.info('Graph marked as complete', {
      graphId: this.id,
      nodeCount: this.statistics.nodeCount,
      edgeCount: this.statistics.edgeCount
    });
  }

  /**
   * Mark graph as error
   */
  markError(error: string): void {
    this.metadata.status = 'error';
    this.metadata.error = error;
    this.metadata.updated_at = new Date();

    logger.error('Graph marked as error', {
      graphId: this.id,
      error
    });
  }

  /**
   * Get graph summary information
   */
  getSummary(): {
    id: string;
    documentId: string;
    status: string;
    nodeCount: number;
    edgeCount: number;
    created_at: Date;
    updated_at: Date;
    processingTime?: number;
  } {
    return {
      id: this.id,
      documentId: this.documentId,
      status: this.metadata.status,
      nodeCount: this.statistics.nodeCount,
      edgeCount: this.statistics.edgeCount,
      created_at: this.metadata.created_at,
      updated_at: this.metadata.updated_at,
      processingTime: this.metadata.processingTime
    };
  }
}
