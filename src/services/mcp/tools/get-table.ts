import { MCPTool, MCPToolResult, MCPParameter, MCPExecutionContext } from '../types';
import { mcpRetriever } from '../mcp-retriever';
import { logger } from '../../../utils/logger';

export class GetTableTool implements MCPTool {
  name = 'get_table';
  description = 'Retrieve a specific table from the document by table number or ID. Use this when the summary needs to reference or analyze tabular data.';

  parameters: MCPParameter[] = [
    {
      name: 'tableId',
      type: 'string',
      description: 'The ID or number of the table to retrieve (e.g., "table_1", "1")',
      required: true,
    },
    {
      name: 'includeContext',
      type: 'boolean',
      description: 'Whether to include surrounding context (paragraphs that reference this table)',
      required: false,
      default: true,
    },
  ];

  async execute(params: Record<string, any>, context?: MCPExecutionContext): Promise<MCPToolResult> {
    try {
      const { tableId, includeContext = true } = params;

      if (!context?.graph) {
        return {
          success: false,
          error: 'No document graph available in execution context',
        };
      }

      logger.debug('Executing get_table tool', {
        tableId,
        includeContext,
        documentId: context.documentId,
      });

      // Find the table node
      let tableNode = context.graph.nodes.get(tableId);

      // If not found by ID, try to find by table number in metadata
      if (!tableNode) {
        for (const [nodeId, node] of context.graph.nodes) {
          if (node.type === 'table' &&
              (node.metadata?.tableNumber?.toString() === tableId ||
               node.metadata?.caption?.toLowerCase().includes(`table ${tableId}`))) {
            tableNode = node;
            break;
          }
        }
      }

      if (!tableNode) {
        return {
          success: false,
          error: `Table "${tableId}" not found in document`,
        };
      }

      let contextNodes: any[] = [];

      if (includeContext) {
        // Get related nodes (paragraphs that reference this table)
        const mcpContext = await mcpRetriever.getRelatedNode(context.graph, tableNode.id, {
          maxDepth: 1,
          maxNodes: 5,
          nodeTypes: ['paragraph', 'section'],
          edgeTypes: ['reference'],
        });

        contextNodes = mcpContext.neighbors.filter(node =>
          node.content?.toLowerCase().includes(`table ${tableId}`) ||
          node.content?.toLowerCase().includes(`table_${tableId}`)
        );
      }

      // Estimate tokens
      const totalTokens = mcpRetriever['estimateTokens']([tableNode, ...contextNodes]);

      // Check token budget
      if (context.tokenBudget && context.tokenBudget.currentTokens + totalTokens > context.tokenBudget.maxTokens) {
        return {
          success: false,
          error: `Table retrieval would exceed token budget`,
        };
      }

      return {
        success: true,
        data: {
          table: {
            id: tableNode.id,
            content: tableNode.content,
            metadata: tableNode.metadata,
            data: tableNode.data, // Structured table data if available
          },
          context: contextNodes.map(node => ({
            id: node.id,
            type: node.type,
            content: node.content,
            metadata: node.metadata,
          })),
        },
        metadata: {
          tokensUsed: totalTokens,
          nodesRetrieved: contextNodes.length + 1,
        },
      };

    } catch (error) {
      logger.error('get_table tool execution failed', {
        error: (error as Error).message,
        params,
      });

      return {
        success: false,
        error: `Failed to retrieve table: ${(error as Error).message}`,
      };
    }
  }
}
