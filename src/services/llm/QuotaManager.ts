/**
 * Google Gemini Quota Manager
 * Tracks daily token usage and manages model selection based on available quota
 *
 * Features:
 * - Per-model daily quota tracking
 * - Intelligent model selection by task purpose
 * - Automatic fallback when quota exhausted
 * - Resets at midnight Pacific Time (per Google's rules)
 */

import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

/**
 * Google Gemini API Rate Limits (Free Tier)
 * Source: https://ai.google.dev/gemini-api/docs/rate-limits
 */
export interface ModelQuotaLimits {
  rpm: number; // Requests per minute
  tpm: number; // Tokens per minute
  rpd: number; // Requests per day
}

export interface ModelQuota {
  model: string;
  limits: ModelQuotaLimits;
  usage: {
    tokensUsed: number;
    requestsToday: number;
    lastReset: Date;
  };
}

export type TaskPurpose =
  | 'bulk-processing' // Large volume, simple tasks → Flash-Lite
  | 'quick-summary' // Fast summaries → Flash
  | 'standard-analysis' // Normal analysis → Flash or Pro
  | 'detailed-analysis' // Complex reasoning → Pro
  | 'vision-analysis' // OCR/Image → Flash/Pro Vision
  | 'critical-task'; // Must succeed → Pro (highest quality)

/**
 * Google Gemini Model Quotas (Free Tier as of 2024)
 * Updated based on official documentation
 */
export const GEMINI_FREE_TIER_LIMITS: Record<string, ModelQuotaLimits> = {
  'gemini-2.0-flash-exp': {
    rpm: 10,
    tpm: 4_000_000,
    rpd: 1500,
  },
  'gemini-1.5-flash': {
    rpm: 15,
    tpm: 1_000_000,
    rpd: 1500,
  },
  'gemini-1.5-flash-8b': {
    rpm: 15,
    tpm: 4_000_000,
    rpd: 1500,
  },
  'gemini-1.5-pro': {
    rpm: 2,
    tpm: 32_000,
    rpd: 50,
  },
  'gemini-exp-1206': {
    rpm: 2,
    tpm: 32_000,
    rpd: 50,
  },
};

/**
 * Model recommendations by task purpose
 */
const MODEL_RECOMMENDATIONS: Record<TaskPurpose, string[]> = {
  'bulk-processing': [
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
  ],
  'quick-summary': [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ],
  'standard-analysis': [
    'gemini-1.5-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
  ],
  'detailed-analysis': [
    'gemini-1.5-pro',
    'gemini-exp-1206',
    'gemini-1.5-flash',
  ],
  'vision-analysis': [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
  ],
  'critical-task': ['gemini-1.5-pro', 'gemini-exp-1206', 'gemini-1.5-flash'],
};

/**
 * Quota Manager for Google Gemini Models
 */
export class QuotaManager {
  private quotas: Map<string, ModelQuota>;
  private dailyBudget: number; // Total tokens allowed per day
  private currentDayKey: string;

  constructor(dailyBudget?: number) {
    this.quotas = new Map();
    // Default: 1M tokens/day (reasonable for free tier mixed usage)
    this.dailyBudget =
      dailyBudget || parseInt(process.env.GOOGLE_DAILY_QUOTA || '1000000', 10);
    this.currentDayKey = this.getDayKey();

    this.initializeQuotas();
    logger.info('QuotaManager initialized', {
      dailyBudget: this.dailyBudget,
      models: Array.from(this.quotas.keys()),
    });
  }

  /**
   * Initialize quota tracking for all Gemini models
   */
  private initializeQuotas(): void {
    for (const [model, limits] of Object.entries(GEMINI_FREE_TIER_LIMITS)) {
      this.quotas.set(model, {
        model,
        limits,
        usage: {
          tokensUsed: 0,
          requestsToday: 0,
          lastReset: new Date(),
        },
      });
    }
  }

  /**
   * Get current day key (YYYY-MM-DD in Pacific Time)
   */
  private getDayKey(): string {
    const now = new Date();
    // Convert to Pacific Time (UTC-8 or UTC-7 for DST)
    const pacificOffset = -8 * 60; // Minutes
    const utcOffset = now.getTimezoneOffset();
    const pacificTime = new Date(
      now.getTime() + (utcOffset + pacificOffset) * 60 * 1000
    );

    return pacificTime.toISOString().split('T')[0];
  }

  /**
   * Check if quotas need to be reset (midnight Pacific Time)
   */
  private checkAndResetIfNeeded(): void {
    const currentDay = this.getDayKey();
    if (currentDay !== this.currentDayKey) {
      logger.info('Daily quota reset triggered', {
        previousDay: this.currentDayKey,
        currentDay,
      });
      this.resetDailyQuotas();
      this.currentDayKey = currentDay;
    }
  }

  /**
   * Reset all daily quotas
   */
  private resetDailyQuotas(): void {
    for (const quota of this.quotas.values()) {
      quota.usage.tokensUsed = 0;
      quota.usage.requestsToday = 0;
      quota.usage.lastReset = new Date();
    }
    logger.info('All daily quotas reset');
  }

  /**
   * Check if a model has available quota
   */
  public hasAvailableQuota(
    model: string,
    estimatedTokens: number = 1000
  ): boolean {
    this.checkAndResetIfNeeded();

    const quota = this.quotas.get(model);
    if (!quota) {
      logger.warn(`Model ${model} not found in quota tracker`);
      return false;
    }

    // Check daily request limit
    if (quota.usage.requestsToday >= quota.limits.rpd) {
      logger.warn(`Model ${model} exceeded daily request limit`, {
        requests: quota.usage.requestsToday,
        limit: quota.limits.rpd,
      });
      return false;
    }

    // Check if adding these tokens would exceed daily budget
    const totalUsageToday = this.getTotalTokensUsedToday();
    if (totalUsageToday + estimatedTokens > this.dailyBudget) {
      logger.warn(`Daily token budget would be exceeded`, {
        currentUsage: totalUsageToday,
        estimated: estimatedTokens,
        budget: this.dailyBudget,
      });
      return false;
    }

    return true;
  }

  /**
   * Select the best available model for a task purpose
   */
  public selectModel(
    purpose: TaskPurpose,
    estimatedTokens: number = 1000
  ): string {
    this.checkAndResetIfNeeded();

    const recommendations =
      MODEL_RECOMMENDATIONS[purpose] ||
      MODEL_RECOMMENDATIONS['standard-analysis'];

    logger.info('Selecting model for task', {
      purpose,
      estimatedTokens,
      recommendations,
    });

    // Try each recommended model in order
    for (const model of recommendations) {
      if (this.hasAvailableQuota(model, estimatedTokens)) {
        logger.info('Model selected', { model, purpose, estimatedTokens });
        return model;
      }
    }

    // No recommended models available, try any available model
    logger.warn('No recommended models available, trying alternatives');
    for (const [model] of this.quotas) {
      if (this.hasAvailableQuota(model, estimatedTokens)) {
        logger.warn('Fallback model selected', { model, purpose });
        return model;
      }
    }

    // No models available - throw error
    throw new AppError(
      'All Gemini models have exceeded their daily quota. Please try again tomorrow.',
      429,
      {
        totalUsage: this.getTotalTokensUsedToday(),
        dailyBudget: this.dailyBudget,
        resetTime: this.getNextResetTime(),
      }
    );
  }

  /**
   * Record token usage for a model
   */
  public recordUsage(model: string, tokensUsed: number): void {
    const quota = this.quotas.get(model);
    if (!quota) {
      logger.warn(`Attempted to record usage for unknown model: ${model}`);
      return;
    }

    quota.usage.tokensUsed += tokensUsed;
    quota.usage.requestsToday += 1;

    const totalUsage = this.getTotalTokensUsedToday();
    const percentUsed = (totalUsage / this.dailyBudget) * 100;

    logger.info('Token usage recorded', {
      model,
      tokensUsed,
      totalToday: totalUsage,
      budgetRemaining: this.dailyBudget - totalUsage,
      percentUsed: percentUsed.toFixed(2),
    });

    // Alert if approaching budget limits
    if (percentUsed >= 80 && percentUsed < 90) {
      logger.warn('⚠️  Approaching daily token budget (80%)', {
        used: totalUsage,
        budget: this.dailyBudget,
      });
    } else if (percentUsed >= 90) {
      logger.error('🚨 Critical: Daily token budget nearly exhausted (90%)', {
        used: totalUsage,
        budget: this.dailyBudget,
      });
    }
  }

  /**
   * Get total tokens used today across all models
   */
  public getTotalTokensUsedToday(): number {
    let total = 0;
    for (const quota of this.quotas.values()) {
      total += quota.usage.tokensUsed;
    }
    return total;
  }

  /**
   * Get next reset time (midnight Pacific Time)
   */
  private getNextResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Adjust to Pacific Time
    const pacificOffset = -8 * 60; // Minutes
    const utcOffset = tomorrow.getTimezoneOffset();
    const resetTime = new Date(
      tomorrow.getTime() + (utcOffset + pacificOffset) * 60 * 1000
    );

    return resetTime;
  }

  /**
   * Get quota status for all models
   */
  public getQuotaStatus(): any {
    this.checkAndResetIfNeeded();

    const status: any = {
      dailyBudget: this.dailyBudget,
      totalUsed: this.getTotalTokensUsedToday(),
      percentUsed: (
        (this.getTotalTokensUsedToday() / this.dailyBudget) *
        100
      ).toFixed(2),
      nextReset: this.getNextResetTime().toISOString(),
      models: {},
    };

    for (const [model, quota] of this.quotas) {
      status.models[model] = {
        limits: quota.limits,
        usage: quota.usage,
        available: this.hasAvailableQuota(model, 1000),
        requestsRemaining: quota.limits.rpd - quota.usage.requestsToday,
      };
    }

    return status;
  }

  /**
   * Force reset quotas (for testing purposes)
   */
  public forceReset(): void {
    this.resetDailyQuotas();
    this.currentDayKey = this.getDayKey();
    logger.info('Quotas forcefully reset');
  }

  /**
   * Estimate tokens for a text (rough approximation)
   */
  public static estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Get model recommendations for a purpose
   */
  public getRecommendedModels(purpose: TaskPurpose): string[] {
    return (
      MODEL_RECOMMENDATIONS[purpose] ||
      MODEL_RECOMMENDATIONS['standard-analysis']
    );
  }
}

// Export singleton instance
export const quotaManager = new QuotaManager();
