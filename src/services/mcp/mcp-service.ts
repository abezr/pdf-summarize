import { MCPTool, MCPToolResult, MCPExecutionContext, MCP_TOOL_NAMES } from './types';
import { GetRelatedNodeTool } from './tools/get-related-node';
import { GetTableTool } from './tools/get-table';
import { GetImageTool } from './tools/get-image';
import { logger } from '../../utils/logger';
import { spanHelpers, contextHelpers } from '../../observability/tracing/tracer';

export class MCPService {
  private tools: Map<string, MCPTool> = new Map();

  constructor() {
    this.registerTools();
  }

  /**
   * Register all available MCP tools
   */
  private registerTools(): void {
    this.registerTool(new GetRelatedNodeTool());
    this.registerTool(new GetTableTool());
    this.registerTool(new GetImageTool());

    logger.info('MCP tools registered', {
      toolCount: this.tools.size,
      tools: Array.from(this.tools.keys()),
    });
  }

  /**
   * Register a new MCP tool
   */
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get all available tools with their schemas
   */
  getToolSchemas(): Array<{
    name: string;
    description: string;
    parameters: any[];
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters.map(param => ({
        name: param.name,
        type: param.type,
        description: param.description,
        required: param.required,
        ...(param.default !== undefined && { default: param.default }),
      })),
    }));
  }

  /**
   * Execute an MCP tool
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, any>,
    context?: MCPExecutionContext
  ): Promise<MCPToolResult> {
    return contextHelpers.withSpan('mcp.execute_tool', async (span) => {
      const startTime = Date.now();

      span.setAttributes({
        'mcp.tool_name': toolName,
        'mcp.parameters': JSON.stringify(parameters),
        'mcp.document_id': context?.documentId,
      });

      try {
        const tool = this.tools.get(toolName);
        if (!tool) {
          return {
            success: false,
            error: `Tool "${toolName}" not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
          };
        }

        logger.debug('Executing MCP tool', {
          toolName,
          parameters,
          documentId: context?.documentId,
        });

        // Validate required parameters
        const missingParams = tool.parameters
          .filter(param => param.required && !(param.name in parameters))
          .map(param => param.name);

        if (missingParams.length > 0) {
          return {
            success: false,
            error: `Missing required parameters: ${missingParams.join(', ')}`,
          };
        }

        // Execute the tool
        const result = await tool.execute(parameters, context);

        const executionTime = Date.now() - startTime;

        span.setAttributes({
          'mcp.execution_success': result.success,
          'mcp.execution_time_ms': executionTime,
          'mcp.tokens_used': result.metadata?.tokensUsed,
          'mcp.nodes_retrieved': result.metadata?.nodesRetrieved,
        });

        if (result.success) {
          logger.debug('MCP tool executed successfully', {
            toolName,
            executionTime,
            tokensUsed: result.metadata?.tokensUsed,
            nodesRetrieved: result.metadata?.nodesRetrieved,
          });
        } else {
          logger.warn('MCP tool execution failed', {
            toolName,
            error: result.error,
            executionTime,
          });
        }

        return result;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);

        const executionTime = Date.now() - startTime;

        logger.error('MCP tool execution error', {
          toolName,
          error: (error as Error).message,
          executionTime,
        });

        return {
          success: false,
          error: `Tool execution failed: ${(error as Error).message}`,
          metadata: {
            executionTime,
          },
        };
      }
    });
  }

  /**
   * Check if a tool is available
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get a specific tool
   */
  getTool(toolName: string): MCPTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Get all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Create execution context for a document
   */
  createExecutionContext(
    documentId: string,
    graph: any,
    maxTokens: number = 8000,
    reserveTokens: number = 1000
  ): MCPExecutionContext {
    return {
      documentId,
      graph,
      tokenBudget: {
        maxTokens,
        currentTokens: 0,
        reserveTokens,
      },
    };
  }
}

// Export singleton instance
export const mcpService = new MCPService();
