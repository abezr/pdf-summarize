/**
 * Graph-Aware Summarization Service
 * Uses knowledge graph structure to generate intelligent summaries
 */

import { Graph } from '../../models/graph.model';
import { llmProviderManager } from './LLMProviderManager';
import {
  promptTemplateService,
  SummaryType,
  SummaryRequest,
} from './prompt-templates';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { evaluationService, EvaluationResult } from '../evaluation';
import { mcpService, MCPExecutionContext } from '../mcp';

export interface SummarizationOptions {
  type?: SummaryType;
  maxLength?: number;
  focus?: string[];
  exclude?: string[];
  style?: 'formal' | 'casual' | 'technical';
  model?: string; // Override default model selection
  provider?: 'openai' | 'google' | 'auto';
}

export interface SummarizationResult {
  summary: string;
  type: SummaryType;
  model: string;
  provider: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  processingTime: number;
  graphStats: {
    nodesProcessed: number;
    sectionsFound: number;
    totalContentLength: number;
  };
  evaluation?: EvaluationResult; // Optional evaluation results
}

export class SummarizationService {
  /**
   * Generate a summary from a knowledge graph
   */
  public async summarizeGraph(
    graph: Graph,
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting graph summarization', {
        graphId: graph.id,
        documentId: graph.documentId,
        options,
      });

      // Validate graph
      if (!graph.nodes || graph.nodes.length === 0) {
        throw new AppError('Graph has no nodes to summarize', 400);
      }

      // Set defaults
      const summaryType = options.type || 'executive';
      const maxLength = options.maxLength || 500;

      // Create MCP execution context for tool usage
      const mcpContext: MCPExecutionContext = mcpService.createExecutionContext(
        graph.documentId,
        graph,
        8000, // Max tokens for MCP operations
        1000  // Reserve tokens for final response
      );

      // Generate prompt using template service with MCP tools
      const promptRequest: SummaryRequest = {
        type: summaryType,
        graph,
        maxLength,
        focus: options.focus,
        exclude: options.exclude,
        style: options.style,
        mcpTools: mcpService.getToolSchemas(),
      };

      const promptTemplate =
        promptTemplateService.generatePrompt(promptRequest);

      // Estimate tokens for cost planning
      const estimatedPromptTokens = promptTemplateService.estimateTokenCount(
        promptTemplate.systemPrompt + promptTemplate.userPrompt
      );

      logger.info('Generated summarization prompt', {
        type: summaryType,
        estimatedPromptTokens,
        contextLength: promptTemplate.context.length,
      });

      // Prepare LLM request with function calling enabled
      const llmRequest = {
        messages: [
          {
            role: 'system' as const,
            content: promptTemplate.systemPrompt,
          },
          {
            role: 'user' as const,
            content: promptTemplate.userPrompt,
          },
        ],
        model: options.model,
        maxTokens: Math.min(maxLength * 4, 4096), // Rough token estimation
        temperature: 0.3, // Lower temperature for more consistent summaries
        tools: mcpService.getToolSchemas(),
        toolChoice: 'auto' as const, // Let the model decide when to use tools
      };

      // Generate summary using LLM with tool calling
      let llmResponse = await llmProviderManager.generateText(
        llmRequest,
        options.provider || 'auto'
      );

      // Handle tool calls if present
      if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
        logger.debug('Processing tool calls', {
          toolCallCount: llmResponse.toolCalls.length,
          documentId: graph.documentId,
        });

        // Execute tool calls and continue conversation
        llmResponse = await this.handleToolCalls(llmResponse, mcpContext, options);
      }

      // Calculate processing statistics
      const processingTime = Date.now() - startTime;
      const graphStats = this.calculateGraphStats(graph);

      // Perform evaluation if enabled
      let evaluationResult: EvaluationResult | undefined;
      try {
        const graphPayload =
          typeof (graph as any).toJSON === 'function'
            ? (graph as any).toJSON()
            : null;

        if (graphPayload) {
          // Extract original text from graph for evaluation
          const originalText = this.extractOriginalTextFromGraph(graph);

          evaluationResult = await evaluationService.evaluate({
            documentId: graph.documentId,
            originalText,
            summary: llmResponse.content,
            graph: graphPayload, // Pass graph data for custom metrics
          });

          logger.info('Summary evaluation completed', {
            documentId: graph.documentId,
            overallScore: evaluationResult.overallScore,
            passed: evaluationResult.passed,
          });
        } else {
          logger.warn('Summary evaluation skipped: graph has no toJSON()');
        }
      } catch (evaluationError) {
        logger.warn('Summary evaluation failed, continuing without evaluation', {
          error: (evaluationError as Error).message,
        });
      }

      const result: SummarizationResult = {
        summary: llmResponse.content,
        type: summaryType,
        model: llmResponse.model,
        provider: llmResponse.provider,
        tokensUsed: llmResponse.tokensUsed,
        cost: llmResponse.cost,
        processingTime,
        graphStats,
        evaluation: evaluationResult,
      };

      logger.info('Graph summarization completed', {
        type: summaryType,
        model: llmResponse.model,
        tokensUsed: llmResponse.tokensUsed.total,
        cost: llmResponse.cost,
        processingTime,
        nodesProcessed: graphStats.nodesProcessed,
        evaluationScore: evaluationResult?.overallScore,
        evaluationPassed: evaluationResult?.passed,
      });

      return result;
    } catch (error: any) {
      logger.error('Graph summarization failed', {
        graphId: graph.id,
        error: error.message,
        processingTime: Date.now() - startTime,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Summarization failed', 500, {
        originalError: error.message,
      });
    }
  }

  /**
   * Generate multiple summaries with different types
   */
  public async summarizeGraphMultiple(
    graph: Graph,
    types: readonly SummaryType[],
    options: Omit<SummarizationOptions, 'type'> = {}
  ): Promise<Record<SummaryType, SummarizationResult>> {
    const results: Record<SummaryType, SummarizationResult> = {} as any;

    logger.info('Generating multiple summaries', {
      graphId: graph.id,
      types,
      count: types.length,
    });

    // Process summaries sequentially to avoid rate limits
    for (const type of types) {
      try {
        results[type] = await this.summarizeGraph(graph, { ...options, type });
      } catch (error: any) {
        logger.error(`Failed to generate ${type} summary`, {
          type,
          error: error.message,
        });
        throw error; // Re-throw to stop processing
      }
    }

    logger.info('Multiple summaries completed', {
      graphId: graph.id,
      types: Object.keys(results),
      totalTokens: Object.values(results).reduce(
        (sum, r) => sum + r.tokensUsed.total,
        0
      ),
      totalCost: Object.values(results).reduce((sum, r) => sum + r.cost, 0),
    });

    return results;
  }

  /**
   * Calculate statistics about the graph processing
   */
  private calculateGraphStats(graph: Graph): SummarizationResult['graphStats'] {
    const sectionsFound = graph.nodes.filter(
      (n) => n.type === 'section'
    ).length;
    const paragraphsProcessed = graph.nodes.filter((n) =>
      ['paragraph', 'section'].includes(n.type)
    ).length;
    const totalContentLength = graph.nodes.reduce(
      (sum, node) => sum + node.content.length,
      0
    );

    return {
      nodesProcessed: paragraphsProcessed,
      sectionsFound,
      totalContentLength,
    };
  }

  /**
   * Extract original text from graph for evaluation
   */
  private extractOriginalTextFromGraph(graph: Graph): string {
    // Extract text content from graph nodes in document order
    const textNodes = graph.nodes
      .filter(node => ['paragraph', 'section', 'heading'].includes(node.type))
      .sort((a, b) => {
        // Sort by page and position if available
        const aPage = a.metadata?.page || 0;
        const bPage = b.metadata?.page || 0;
        if (aPage !== bPage) return aPage - bPage;

        const aPos = a.metadata?.position || 0;
        const bPos = b.metadata?.position || 0;
        return aPos - bPos;
      });

    return textNodes
      .map(node => node.content)
      .join('\n\n')
      .substring(0, 10000); // Limit for evaluation (RAGAS token limits)
  }

  /**
   * Get available summary types
   */
  public getAvailableTypes(): SummaryType[] {
    return promptTemplateService.getSupportedTypes();
  }

  /**
   * Estimate cost for a summarization request
   */
  public async estimateCost(
    graph: Graph,
    options: SummarizationOptions = {}
  ): Promise<{
    estimatedTokens: number;
    estimatedCost: number;
    recommendedModel: string;
  }> {
    const summaryType = options.type || 'executive';
    const promptRequest: SummaryRequest = {
      type: summaryType,
      graph,
      maxLength: options.maxLength,
      focus: options.focus,
      exclude: options.exclude,
      style: options.style,
    };

    const promptTemplate = promptTemplateService.generatePrompt(promptRequest);
    const estimatedPromptTokens = promptTemplateService.estimateTokenCount(
      promptTemplate.systemPrompt + promptTemplate.userPrompt
    );

    // Estimate completion tokens (rough approximation)
    const estimatedCompletionTokens = Math.min(
      (options.maxLength || 500) * 3, // ~3 tokens per word
      2000 // Reasonable upper limit
    );

    const totalEstimatedTokens =
      estimatedPromptTokens + estimatedCompletionTokens;

    // Get cost estimate (using default provider)
    const provider = llmProviderManager.getProvider(options.provider || 'auto');
    const model = options.model || provider.supportedModels[0];

    // Rough cost calculation - this would need to be updated based on actual pricing
    let estimatedCost = 0;
    if (provider.name === 'openai') {
      // OpenAI pricing approximation
      const inputCostPerToken = 0.005 / 1000; // GPT-4o input
      const outputCostPerToken = 0.015 / 1000; // GPT-4o output
      estimatedCost =
        estimatedPromptTokens * inputCostPerToken +
        estimatedCompletionTokens * outputCostPerToken;
    } else if (provider.name === 'google') {
      // Google pricing approximation (very rough)
      const costPerToken = 0.0005 / 1000; // Approximate
      estimatedCost = totalEstimatedTokens * costPerToken;
    }

    return {
      estimatedTokens: totalEstimatedTokens,
      estimatedCost,
      recommendedModel: model,
    };
  }

  /**
   * Handle tool calls from the LLM response
   */
  private async handleToolCalls(
    initialResponse: any,
    mcpContext: MCPExecutionContext,
    options: SummarizationOptions
  ): Promise<any> {
    let currentResponse = initialResponse;
    const maxToolIterations = 3; // Prevent infinite loops
    let iteration = 0;

    while (currentResponse.toolCalls && currentResponse.toolCalls.length > 0 && iteration < maxToolIterations) {
      iteration++;

      // Execute all tool calls
      const toolResults = [];
      for (const toolCall of currentResponse.toolCalls) {
        try {
          const result = await mcpService.executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            mcpContext
          );

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: result.success
              ? JSON.stringify(result.data)
              : `Error: ${result.error}`,
          });

          logger.debug('Tool call executed', {
            toolName: toolCall.function.name,
            success: result.success,
            tokensUsed: result.metadata?.tokensUsed,
          });

        } catch (error) {
          logger.error('Tool call execution failed', {
            toolName: toolCall.function.name,
            error: (error as Error).message,
          });

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: `Error: ${(error as Error).message}`,
          });
        }
      }

      // Continue conversation with tool results
      const followUpRequest = {
        messages: [
          ...initialResponse.messages, // Original messages
          {
            role: 'assistant',
            content: currentResponse.content,
            tool_calls: currentResponse.toolCalls,
          },
          ...toolResults,
        ],
        model: options.model,
        maxTokens: Math.min(options.maxLength ? options.maxLength * 4 : 4096, 4096),
        temperature: 0.3,
        tools: mcpService.getToolSchemas(),
        toolChoice: 'auto' as const,
      };

      currentResponse = await llmProviderManager.generateText(
        followUpRequest,
        options.provider || 'auto'
      );

      logger.debug('Follow-up LLM call completed', {
        iteration,
        hasToolCalls: !!(currentResponse.toolCalls && currentResponse.toolCalls.length > 0),
      });
    }

    if (iteration >= maxToolIterations) {
      logger.warn('Reached maximum tool call iterations', {
        maxIterations: maxToolIterations,
        finalResponseHasToolCalls: !!(currentResponse.toolCalls && currentResponse.toolCalls.length > 0),
      });
    }

    return currentResponse;
  }

  /**
   * Validate summarization options
   */
  public validateOptions(options: SummarizationOptions): void {
    const supportedTypes = this.getAvailableTypes();

    if (options.type && !supportedTypes.includes(options.type)) {
      throw new AppError(
        `Unsupported summary type: ${options.type}. Supported types: ${supportedTypes.join(', ')}`,
        400
      );
    }

    if (
      options.maxLength &&
      (options.maxLength < 50 || options.maxLength > 5000)
    ) {
      throw new AppError('maxLength must be between 50 and 5000 words', 400);
    }

    if (
      options.style &&
      !['formal', 'casual', 'technical'].includes(options.style)
    ) {
      throw new AppError(
        'style must be one of: formal, casual, technical',
        400
      );
    }
  }
}

// Export singleton instance
export const summarizationService = new SummarizationService();
