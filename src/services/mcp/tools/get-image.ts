import { MCPTool, MCPToolResult, MCPParameter, MCPExecutionContext } from '../types';
import { mcpRetriever } from '../mcp-retriever';
import { logger } from '../../../utils/logger';

export class GetImageTool implements MCPTool {
  name = 'get_image';
  description = 'Retrieve information about a specific image from the document. Use this when the summary needs to reference or describe visual content.';

  parameters: MCPParameter[] = [
    {
      name: 'imageId',
      type: 'string',
      description: 'The ID or number of the image to retrieve (e.g., "image_1", "fig_1")',
      required: true,
    },
    {
      name: 'includeCaption',
      type: 'boolean',
      description: 'Whether to include the image caption and alt text',
      required: false,
      default: true,
    },
    {
      name: 'includeContext',
      type: 'boolean',
      description: 'Whether to include surrounding text that references this image',
      required: false,
      default: true,
    },
  ];

  async execute(params: Record<string, any>, context?: MCPExecutionContext): Promise<MCPToolResult> {
    try {
      const { imageId, includeCaption = true, includeContext = true } = params;

      if (!context?.graph) {
        return {
          success: false,
          error: 'No document graph available in execution context',
        };
      }

      logger.debug('Executing get_image tool', {
        imageId,
        includeCaption,
        includeContext,
        documentId: context.documentId,
      });

      // Find the image node
      let imageNode = context.graph.nodes.get(imageId);

      // If not found by ID, try to find by image number in metadata
      if (!imageNode) {
        for (const [nodeId, node] of context.graph.nodes) {
          if (node.type === 'image' &&
              (node.metadata?.imageNumber?.toString() === imageId ||
               node.metadata?.caption?.toLowerCase().includes(`figure ${imageId}`) ||
               node.metadata?.caption?.toLowerCase().includes(`fig ${imageId}`))) {
            imageNode = node;
            break;
          }
        }
      }

      if (!imageNode) {
        return {
          success: false,
          error: `Image "${imageId}" not found in document`,
        };
      }

      let contextNodes: any[] = [];
      let caption = '';

      if (includeCaption) {
        caption = imageNode.metadata?.caption ||
                 imageNode.metadata?.alt ||
                 imageNode.content ||
                 'No caption available';
      }

      if (includeContext) {
        // Get related nodes (paragraphs that reference this image)
        const mcpContext = await mcpRetriever.getRelatedNode(context.graph, imageNode.id, {
          maxDepth: 1,
          maxNodes: 5,
          nodeTypes: ['paragraph', 'section', 'heading'],
          edgeTypes: ['reference'],
        });

        contextNodes = mcpContext.neighbors.filter(node =>
          node.content?.toLowerCase().includes(`figure ${imageId}`) ||
          node.content?.toLowerCase().includes(`fig ${imageId}`) ||
          node.content?.toLowerCase().includes(`image ${imageId}`)
        );
      }

      // Estimate tokens (images use fewer tokens for description)
      const imageDescriptionTokens = Math.ceil((caption + (imageNode.metadata?.description || '')).length / 4);
      const contextTokens = mcpRetriever['estimateTokens'](contextNodes);
      const totalTokens = imageDescriptionTokens + contextTokens;

      // Check token budget
      if (context.tokenBudget && context.tokenBudget.currentTokens + totalTokens > context.tokenBudget.maxTokens) {
        return {
          success: false,
          error: `Image retrieval would exceed token budget`,
        };
      }

      return {
        success: true,
        data: {
          image: {
            id: imageNode.id,
            url: imageNode.metadata?.url || imageNode.content,
            caption: includeCaption ? caption : undefined,
            metadata: {
              width: imageNode.metadata?.width,
              height: imageNode.metadata?.height,
              format: imageNode.metadata?.format,
              page: imageNode.metadata?.page,
              description: imageNode.metadata?.description,
            },
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
      logger.error('get_image tool execution failed', {
        error: (error as Error).message,
        params,
      });

      return {
        success: false,
        error: `Failed to retrieve image: ${(error as Error).message}`,
      };
    }
  }
}
