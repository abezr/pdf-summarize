import { MCPTool, MCPToolResult, MCPParameter, MCPExecutionContext } from '../types';
import { mcpRetriever } from '../mcp-retriever';
import { logger } from '../../../utils/logger';

export class GetRelatedNodeTool implements MCPTool {
  name = 'get_related_node';
  description = 'Retrieve a node and its related nodes from the document graph using BFS traversal. Use this to get context about referenced content like tables, images, or sections.';

  parameters: MCPParameter[] = [
    {
      name: 'nodeId',
      type: 'string',
      description: 'The ID of the node to retrieve (e.g., "table_1", "section_2", "image_3")',
      required: true,
    },
    {
      name: 'depth',
      type: 'number',
      description: 'How many levels of relationships to traverse (default: 2, max: 3)',
      required: false,
      default: 2,
    },
    {
      name: 'maxNodes',
      type: 'number',
      description: 'Maximum number of related nodes to retrieve (default: 10, max: 20)',
      required: false,
      default: 10,
    },
    {
      name: 'nodeTypes',
      type: 'array',
      description: 'Filter by node types (e.g., ["table", "paragraph", "section"])',
      required: false,
    },
    {
      name: 'edgeTypes',
      type: 'array',
      description: 'Filter by edge types (e.g., ["reference", "hierarchical", "semantic"])',
      required: false,
    },
  ];

  async execute(params: Record<string, any>, context?: MCPExecutionContext): Promise<MCPToolResult> {
    try {
      const { nodeId, depth = 2, maxNodes = 10, nodeTypes, edgeTypes } = params;

      if (!context?.graph) {
        return {
          success: false,
          error: 'No document graph available in execution context',
        };
      }

      logger.debug('Executing get_related_node tool', {
        nodeId,
        depth,
        maxNodes,
        nodeTypes,
        edgeTypes,
        documentId: context.documentId,
      });

      // Validate parameters
      const validatedDepth = Math.min(Math.max(depth, 1), 3);
      const validatedMaxNodes = Math.min(Math.max(maxNodes, 1), 20);

      // Get related nodes
      const mcpContext = await mcpRetriever.getRelatedNode(context.graph, nodeId, {
        maxDepth: validatedDepth,
        maxNodes: validatedMaxNodes,
        nodeTypes: Array.isArray(nodeTypes) ? nodeTypes : undefined,
        edgeTypes: Array.isArray(edgeTypes) ? edgeTypes : undefined,
      });

      // Check if we can afford the tokens
      if (context.tokenBudget && context.tokenBudget.currentTokens + mcpContext.totalTokens > context.tokenBudget.maxTokens) {
        return {
          success: false,
          error: `Context retrieval would exceed token budget (${context.tokenBudget.currentTokens + mcpContext.totalTokens} > ${context.tokenBudget.maxTokens})`,
        };
      }

      return {
        success: true,
        data: {
          node: {
            id: mcpContext.node.id,
            type: mcpContext.node.type,
            content: mcpContext.node.content,
            metadata: mcpContext.node.metadata,
          },
          neighbors: mcpContext.neighbors.map(neighbor => ({
            id: neighbor.id,
            type: neighbor.type,
            content: neighbor.content,
            metadata: neighbor.metadata,
          })),
          traversal: {
            depth: mcpContext.depth,
            path: mcpContext.traversalPath,
          },
        },
        metadata: {
          tokensUsed: mcpContext.totalTokens,
          nodesRetrieved: mcpContext.neighbors.length + 1, // +1 for the main node
        },
      };

    } catch (error) {
      logger.error('get_related_node tool execution failed', {
        error: (error as Error).message,
        params,
      });

      return {
        success: false,
        error: `Failed to retrieve related nodes: ${(error as Error).message}`,
      };
    }
  }
}
