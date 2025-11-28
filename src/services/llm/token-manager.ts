/**
 * Enhanced Token and Cost Management Service
 * Provides advanced token counting, cost estimation, and usage tracking
 */

import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface ModelPricing {
  input: number;  // Cost per 1K tokens for input
  output: number; // Cost per 1K tokens for output
  currency: string;
}

export interface UsageRecord {
  id: string;
  timestamp: Date;
  model: string;
  provider: string;
  operation: string;
  tokens: TokenUsage;
  cost: CostBreakdown;
  metadata?: Record<string, any>;
}

/**
 * Model pricing information (as of 2024)
 * Prices are per 1K tokens
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Models
  'gpt-4o': {
    input: 0.005,
    output: 0.015,
    currency: 'USD'
  },
  'gpt-4-turbo': {
    input: 0.01,
    output: 0.03,
    currency: 'USD'
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
    currency: 'USD'
  },
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015,
    currency: 'USD'
  },

  // Google Gemini Models (approximate pricing)
  'gemini-2.0-flash-exp': {
    input: 0.001,
    output: 0.004,
    currency: 'USD'
  },
  'gemini-1.5-flash': {
    input: 0.0005,
    output: 0.0015,
    currency: 'USD'
  },
  'gemini-1.5-flash-8b': {
    input: 0.0002,
    output: 0.0008,
    currency: 'USD'
  },
  'gemini-1.5-pro': {
    input: 0.0035,
    output: 0.0105,
    currency: 'USD'
  },
};

export class TokenManager {
  private usageRecords: UsageRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords: number = 10000) {
    this.maxRecords = maxRecords;
    logger.info('TokenManager initialized', { maxRecords });
  }

  /**
   * Estimate token count for text using improved algorithm
   */
  public estimateTokens(text: string): number {
    if (!text || text.length === 0) return 0;

    // Improved token estimation algorithm
    // Based on empirical analysis of GPT tokenization patterns

    let tokens = 0;
    const words = text.split(/\s+/);

    for (const word of words) {
      if (word.length === 0) continue;

      // Subword tokenization approximation
      if (word.length <= 3) {
        tokens += 1; // Short words often 1 token
      } else if (word.length <= 6) {
        tokens += 1.2; // Medium words ~1-2 tokens
      } else if (word.length <= 12) {
        tokens += 2.5; // Long words ~2-3 tokens
      } else {
        // Very long words (compounds, URLs, etc.)
        tokens += Math.ceil(word.length / 4);
      }

      // Add extra tokens for punctuation and special characters
      const punctuationCount = (word.match(/[.,!?;:()[\]{}"'-]/g) || []).length;
      tokens += punctuationCount * 0.3;

      // Add tokens for numbers (often tokenized differently)
      const numberCount = (word.match(/\d/g) || []).length;
      if (numberCount > 0) {
        tokens += Math.min(numberCount * 0.5, 2);
      }
    }

    // Add tokens for whitespace and formatting
    const lineBreaks = (text.match(/\n/g) || []).length;
    tokens += lineBreaks * 0.5;

    return Math.ceil(tokens);
  }

  /**
   * Calculate cost breakdown for token usage
   */
  public calculateCost(
    model: string,
    tokens: TokenUsage
  ): CostBreakdown {
    const pricing = MODEL_PRICING[model];

    if (!pricing) {
      logger.warn(`No pricing information for model: ${model}`);
      return {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        currency: 'USD'
      };
    }

    // Calculate costs (pricing is per 1K tokens)
    const inputCost = (tokens.prompt / 1000) * pricing.input;
    const outputCost = (tokens.completion / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: Number(inputCost.toFixed(6)),
      outputCost: Number(outputCost.toFixed(6)),
      totalCost: Number(totalCost.toFixed(6)),
      currency: pricing.currency
    };
  }

  /**
   * Record token usage for tracking and analytics
   */
  public recordUsage(
    model: string,
    provider: string,
    operation: string,
    tokens: TokenUsage,
    metadata?: Record<string, any>
  ): UsageRecord {
    const cost = this.calculateCost(model, tokens);

    const record: UsageRecord = {
      id: this.generateId(),
      timestamp: new Date(),
      model,
      provider,
      operation,
      tokens,
      cost,
      metadata
    };

    // Add to records (with size limit)
    this.usageRecords.unshift(record);
    if (this.usageRecords.length > this.maxRecords) {
      this.usageRecords = this.usageRecords.slice(0, this.maxRecords);
    }

    logger.info('Token usage recorded', {
      id: record.id,
      model,
      provider,
      operation,
      tokensUsed: tokens.total,
      cost: cost.totalCost,
      currency: cost.currency
    });

    return record;
  }

  /**
   * Get usage statistics for a time period
   */
  public getUsageStats(
    hours: number = 24
  ): {
    totalTokens: number;
    totalCost: number;
    currency: string;
    operations: Record<string, number>;
    models: Record<string, number>;
    providers: Record<string, number>;
    recordsCount: number;
  } {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const recentRecords = this.usageRecords.filter(r => r.timestamp >= cutoff);

    const stats = {
      totalTokens: 0,
      totalCost: 0,
      currency: 'USD',
      operations: {} as Record<string, number>,
      models: {} as Record<string, number>,
      providers: {} as Record<string, number>,
      recordsCount: recentRecords.length
    };

    for (const record of recentRecords) {
      stats.totalTokens += record.tokens.total;
      stats.totalCost += record.cost.totalCost;
      stats.currency = record.cost.currency;

      // Count by operation
      stats.operations[record.operation] = (stats.operations[record.operation] || 0) + 1;

      // Count by model
      stats.models[record.model] = (stats.models[record.model] || 0) + record.tokens.total;

      // Count by provider
      stats.providers[record.provider] = (stats.providers[record.provider] || 0) + record.tokens.total;
    }

    return stats;
  }

  /**
   * Estimate cost for a planned operation
   */
  public estimateCostForOperation(
    model: string,
    estimatedPromptTokens: number,
    estimatedCompletionTokens: number
  ): CostBreakdown {
    const tokens: TokenUsage = {
      prompt: estimatedPromptTokens,
      completion: estimatedCompletionTokens,
      total: estimatedPromptTokens + estimatedCompletionTokens
    };

    return this.calculateCost(model, tokens);
  }

  /**
   * Get cost efficiency comparison between models
   */
  public compareModelCosts(
    models: string[],
    promptTokens: number,
    completionTokens: number
  ): Array<{
    model: string;
    cost: CostBreakdown;
    efficiency: number; // Relative to cheapest model (1.0 = cheapest)
  }> {
    const comparisons = models.map(model => {
      const cost = this.estimateCostForOperation(model, promptTokens, completionTokens);
      return { model, cost };
    });

    // Find cheapest model
    const cheapest = comparisons.reduce((min, curr) =>
      curr.cost.totalCost < min.cost.totalCost ? curr : min
    );

    // Calculate efficiency relative to cheapest
    return comparisons.map(comp => ({
      model: comp.model,
      cost: comp.cost,
      efficiency: comp.cost.totalCost / cheapest.cost.totalCost
    }));
  }

  /**
   * Get recommended model based on cost and performance
   */
  public recommendModel(
    taskType: 'simple' | 'complex' | 'creative' | 'analysis',
    maxBudget?: number
  ): {
    recommended: string;
    alternatives: string[];
    reasoning: string;
  } {
    const recommendations = {
      simple: ['gemini-1.5-flash-8b', 'gpt-3.5-turbo', 'gemini-1.5-flash'],
      complex: ['gpt-4o', 'gemini-1.5-pro', 'gpt-4-turbo'],
      creative: ['gpt-4o', 'gemini-1.5-pro', 'gpt-4-turbo'],
      analysis: ['gemini-1.5-pro', 'gpt-4o', 'gpt-4-turbo']
    };

    const candidates = recommendations[taskType] || recommendations.simple;
    const availableCandidates = candidates.filter(model => MODEL_PRICING[model]);

    if (availableCandidates.length === 0) {
      throw new AppError(`No available models for task type: ${taskType}`, 500);
    }

    // Filter by budget if specified
    let finalCandidates = availableCandidates;
    if (maxBudget) {
      finalCandidates = availableCandidates.filter(model => {
        const cost = this.estimateCostForOperation(model, 1000, 500);
        return cost.totalCost <= maxBudget;
      });
    }

    // Use first candidate (most cost-effective for the task type)
    const recommended = finalCandidates[0] || availableCandidates[0];

    return {
      recommended,
      alternatives: finalCandidates.slice(1),
      reasoning: `Recommended ${recommended} for ${taskType} tasks based on cost-performance balance.`
    };
  }

  /**
   * Export usage data for analysis
   */
  public exportUsageData(
    hours: number = 24
  ): UsageRecord[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.usageRecords.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Clear old usage records
   */
  public clearOldRecords(hours: number = 168): void { // 7 days default
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const beforeCount = this.usageRecords.length;
    this.usageRecords = this.usageRecords.filter(r => r.timestamp > cutoff);
    const afterCount = this.usageRecords.length;

    logger.info('Cleared old usage records', {
      hours,
      removed: beforeCount - afterCount,
      remaining: afterCount
    });
  }

  /**
   * Get current pricing information
   */
  public getPricingInfo(): Record<string, ModelPricing> {
    return { ...MODEL_PRICING };
  }

  /**
   * Generate unique ID for usage records
   */
  private generateId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();
