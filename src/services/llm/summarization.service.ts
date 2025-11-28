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

      // Generate prompt using template service
      const promptRequest: SummaryRequest = {
        type: summaryType,
        graph,
        maxLength,
        focus: options.focus,
        exclude: options.exclude,
        style: options.style,
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

      // Prepare LLM request
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
      };

      // Generate summary using LLM
      const llmResponse = await llmProviderManager.generateText(
        llmRequest,
        options.provider || 'auto'
      );

      // Calculate processing statistics
      const processingTime = Date.now() - startTime;
      const graphStats = this.calculateGraphStats(graph, promptTemplate);

      const result: SummarizationResult = {
        summary: llmResponse.content,
        type: summaryType,
        model: llmResponse.model,
        provider: llmResponse.provider,
        tokensUsed: llmResponse.tokensUsed,
        cost: llmResponse.cost,
        processingTime,
        graphStats,
      };

      logger.info('Graph summarization completed', {
        type: summaryType,
        model: llmResponse.model,
        tokensUsed: llmResponse.tokensUsed.total,
        cost: llmResponse.cost,
        processingTime,
        nodesProcessed: graphStats.nodesProcessed,
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
  private calculateGraphStats(
    graph: Graph,
    promptTemplate: any
  ): SummarizationResult['graphStats'] {
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
