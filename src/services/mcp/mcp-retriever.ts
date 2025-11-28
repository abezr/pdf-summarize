import { Graph } from '../../models/graph.model';
import { logger } from '../../utils/logger';
import { spanHelpers, contextHelpers } from '../../observability/tracing/tracer';
import {
  MCPContext,
  BFSTraversalOptions,
  TokenBudget,
  ContextFormatterOptions,
  MCPExecutionContext,
} from './types';

export class MCPRetriever {
  /**
   * Retrieve related nodes using BFS traversal from a starting node
   */
  async getRelatedNode(
    graph: Graph,
    nodeId: string,
    options: BFSTraversalOptions = { maxDepth: 2, maxNodes: 10 }
  ): Promise<MCPContext> {
    return contextHelpers.withSpan('mcp.get_related_node', async (span) => {
      const startTime = Date.now();

      span.setAttributes({
        'mcp.node_id': nodeId,
        'mcp.max_depth': options.maxDepth,
        'mcp.max_nodes': options.maxNodes,
      });

      try {
        logger.debug('Starting MCP retrieval', {
          nodeId,
          options,
        });

        // Find the starting node
        const startNode = graph.nodes.get(nodeId);
        if (!startNode) {
          throw new Error(`Node ${nodeId} not found in graph`);
        }

        // Perform BFS traversal
        const { neighbors, traversalPath, depth } = this.performBFSTraversal(
          graph,
          startNode,
          options
        );

        // Estimate tokens for the retrieved context
        const totalTokens = this.estimateTokens([startNode, ...neighbors]);

        const context: MCPContext = {
          node: startNode,
          neighbors,
          totalTokens,
          depth,
          traversalPath,
        };

        const executionTime = Date.now() - startTime;

        span.setAttributes({
          'mcp.neighbors_found': neighbors.length,
          'mcp.depth_achieved': depth,
          'mcp.tokens_estimated': totalTokens,
          'mcp.execution_time_ms': executionTime,
        });

        logger.debug('MCP retrieval completed', {
          nodeId,
          neighborsFound: neighbors.length,
          depth,
          totalTokens,
          executionTime,
        });

        return context;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('MCP retrieval failed', {
          nodeId,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  /**
   * Perform BFS traversal from a starting node
   */
  private performBFSTraversal(
    graph: Graph,
    startNode: any,
    options: BFSTraversalOptions
  ): { neighbors: any[]; traversalPath: string[]; depth: number } {
    const visited = new Set<string>();
    const queue: Array<{ node: any; depth: number; path: string[] }> = [];
    const neighbors: any[] = [];

    // Start with the initial node
    queue.push({ node: startNode, depth: 0, path: [startNode.id] });
    visited.add(startNode.id);

    while (queue.length > 0 && neighbors.length < options.maxNodes) {
      const { node, depth, path } = queue.shift()!;

      // Don't include the start node in neighbors
      if (depth > 0) {
        neighbors.push(node);
      }

      // Stop if we've reached max depth
      if (depth >= options.maxDepth) {
        continue;
      }

      // Get neighboring nodes based on edges
      const adjacentNodes = this.getAdjacentNodes(graph, node.id, options);

      for (const adjacentNode of adjacentNodes) {
        if (!visited.has(adjacentNode.id) && neighbors.length < options.maxNodes) {
          visited.add(adjacentNode.id);
          queue.push({
            node: adjacentNode,
            depth: depth + 1,
            path: [...path, adjacentNode.id],
          });
        }
      }
    }

    return {
      neighbors,
      traversalPath: queue.length > 0 ? queue[0].path : [startNode.id],
      depth: Math.min(options.maxDepth, queue.length > 0 ? queue[0].depth : 0),
    };
  }

  /**
   * Get nodes adjacent to the given node based on edges
   */
  private getAdjacentNodes(graph: Graph, nodeId: string, options: BFSTraversalOptions): any[] {
    const adjacentNodes: any[] = [];
    const edges = graph.edges.get(nodeId) || [];

    for (const edge of edges) {
      // Filter by edge type if specified
      if (options.edgeTypes && !options.edgeTypes.includes(edge.type)) {
        continue;
      }

      let targetNodeId: string;

      // Determine target node based on direction
      if (options.direction === 'incoming') {
        // For incoming edges, the target is the source
        targetNodeId = edge.from === nodeId ? edge.to : edge.from;
      } else if (options.direction === 'outgoing') {
        // For outgoing edges, the target is the destination
        targetNodeId = edge.from === nodeId ? edge.to : edge.from;
      } else {
        // Both directions
        targetNodeId = edge.from === nodeId ? edge.to : edge.from;
      }

      const targetNode = graph.nodes.get(targetNodeId);
      if (targetNode) {
        // Filter by node type if specified
        if (!options.nodeTypes || options.nodeTypes.includes(targetNode.type)) {
          adjacentNodes.push(targetNode);
        }
      }
    }

    return adjacentNodes;
  }

  /**
   * Format context for LLM consumption with token budget management
   */
  formatContext(
    context: MCPContext,
    options: ContextFormatterOptions,
    tokenBudget: TokenBudget
  ): string {
    const availableTokens = tokenBudget.maxTokens - tokenBudget.currentTokens - tokenBudget.reserveTokens;

    if (availableTokens <= 0) {
      logger.warn('No tokens available for context formatting', { tokenBudget });
      return '';
    }

    // Prioritize nodes based on the specified strategy
    let prioritizedNodes = this.prioritizeNodes([context.node, ...context.neighbors], options.prioritizeBy);

    // Fit as many nodes as possible within token budget
    const selectedNodes: any[] = [];
    let usedTokens = 0;

    for (const node of prioritizedNodes) {
      const nodeTokens = this.estimateTokens([node]);

      if (usedTokens + nodeTokens <= availableTokens) {
        selectedNodes.push(node);
        usedTokens += nodeTokens;
      } else {
        break;
      }
    }

    // Format the context based on the specified format
    let formattedContext = '';

    switch (options.format) {
      case 'structured':
        formattedContext = this.formatStructured(selectedNodes, options.includeMetadata);
        break;
      case 'narrative':
        formattedContext = this.formatNarrative(selectedNodes, options.includeMetadata);
        break;
      case 'compact':
        formattedContext = this.formatCompact(selectedNodes, options.includeMetadata);
        break;
      default:
        formattedContext = this.formatStructured(selectedNodes, options.includeMetadata);
    }

    // Update token budget
    tokenBudget.currentTokens += usedTokens;

    logger.debug('Context formatted', {
      selectedNodes: selectedNodes.length,
      totalNodes: prioritizedNodes.length,
      usedTokens,
      availableTokens,
      format: options.format,
    });

    return formattedContext;
  }

  /**
   * Prioritize nodes based on the specified strategy
   */
  private prioritizeNodes(nodes: any[], strategy?: string): any[] {
    if (!strategy || strategy === 'relevance') {
      // For now, keep original order (could be improved with relevance scoring)
      return nodes;
    }

    if (strategy === 'recency') {
      // Sort by page number (assuming higher page numbers are more recent)
      return nodes.sort((a, b) => {
        const aPage = a.metadata?.page || 0;
        const bPage = b.metadata?.page || 0;
        return bPage - aPage; // Higher page numbers first
      });
    }

    if (strategy === 'importance') {
      // Prioritize by node type importance
      const typePriority: Record<string, number> = {
        table: 10,
        image: 9,
        section: 8,
        heading: 7,
        paragraph: 5,
        text: 3,
      };

      return nodes.sort((a, b) => {
        const aPriority = typePriority[a.type] || 0;
        const bPriority = typePriority[b.type] || 0;
        return bPriority - aPriority;
      });
    }

    return nodes;
  }

  /**
   * Format context in structured format
   */
  private formatStructured(nodes: any[], includeMetadata: boolean): string {
    const sections: string[] = [];

    for (const node of nodes) {
      let section = `## ${node.type.toUpperCase()}: ${node.id}\n\n${node.content}`;

      if (includeMetadata && node.metadata) {
        section += `\n\n**Metadata:** ${JSON.stringify(node.metadata, null, 2)}`;
      }

      sections.push(section);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Format context in narrative format
   */
  private formatNarrative(nodes: any[], includeMetadata: boolean): string {
    const parts: string[] = [];

    for (const node of nodes) {
      let part = node.content;

      if (includeMetadata && node.metadata) {
        part += ` (Page ${node.metadata.page || 'unknown'})`;
      }

      parts.push(part);
    }

    return parts.join(' ');
  }

  /**
   * Format context in compact format
   */
  private formatCompact(nodes: any[], includeMetadata: boolean): string {
    const parts: string[] = [];

    for (const node of nodes) {
      const truncated = node.content.length > 200
        ? node.content.substring(0, 200) + '...'
        : node.content;

      let part = `[${node.type}:${node.id}] ${truncated}`;

      if (includeMetadata && node.metadata?.page) {
        part += ` (p.${node.metadata.page})`;
      }

      parts.push(part);
    }

    return parts.join(' | ');
  }

  /**
   * Estimate tokens for a set of nodes
   */
  private estimateTokens(nodes: any[]): number {
    let totalChars = 0;

    for (const node of nodes) {
      totalChars += node.content?.length || 0;

      // Add metadata if present
      if (node.metadata) {
        totalChars += JSON.stringify(node.metadata).length;
      }

      // Add some overhead for formatting
      totalChars += 50;
    }

    // Rough estimation: ~4 characters per token
    return Math.ceil(totalChars / 4);
  }
}

// Export singleton instance
export const mcpRetriever = new MCPRetriever();
