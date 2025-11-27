/**
 * LLM Provider Manager
 * Manages multiple LLM providers with auto-detection and fallback
 */

import {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  VisionRequest,
} from './ILLMProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GoogleProvider } from './GoogleProvider';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export type LLMProviderType = 'openai' | 'google' | 'auto';

/**
 * LLM Provider Manager
 * Handles provider registration, selection, and fallback logic
 */
class LLMProviderManager {
  private providers: Map<string, ILLMProvider>;
  private preferredProvider: LLMProviderType;
  private enableFallback: boolean;

  constructor() {
    this.providers = new Map();
    this.preferredProvider =
      (process.env.LLM_PROVIDER as LLMProviderType) || 'auto';
    this.enableFallback = process.env.LLM_ENABLE_FALLBACK !== 'false';

    // Initialize providers
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new GoogleProvider());

    this.logAvailableProviders();
  }

  /**
   * Register a new LLM provider
   */
  private registerProvider(provider: ILLMProvider): void {
    this.providers.set(provider.name, provider);
    if (provider.isAvailable) {
      logger.info(`LLM provider registered and available: ${provider.name}`);
    } else {
      logger.warn(
        `LLM provider registered but not available: ${provider.name}`
      );
    }
  }

  /**
   * Log available providers at startup
   */
  private logAvailableProviders(): void {
    const available = this.getAvailableProviders();
    if (available.length === 0) {
      logger.error(
        '⚠️  No LLM providers available! Please configure API keys (OPENAI_API_KEY or GOOGLE_API_KEY).'
      );
    } else {
      logger.info('✅ Available LLM providers', {
        providers: available.map((p) => p.name),
        preferred: this.preferredProvider,
        fallbackEnabled: this.enableFallback,
      });
    }
  }

  /**
   * Get all available providers (with configured API keys)
   */
  public getAvailableProviders(): ILLMProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isAvailable);
  }

  /**
   * Get a specific provider or auto-select
   * @param type - Provider type ('openai', 'google', 'auto')
   * @returns The selected provider
   */
  public getProvider(type?: LLMProviderType): ILLMProvider {
    const providerType = type || this.preferredProvider;

    // Auto-select: prioritize OpenAI > Google
    if (providerType === 'auto') {
      const available = this.getAvailableProviders();
      if (available.length === 0) {
        throw new AppError(
          'No LLM providers available. Please configure OPENAI_API_KEY or GOOGLE_API_KEY.',
          503
        );
      }

      // Prefer OpenAI if available, else use first available
      const openai = available.find((p) => p.name === 'openai');
      return openai || available[0];
    }

    // Get specific provider
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new AppError(`LLM provider not found: ${providerType}`, 404);
    }

    if (!provider.isAvailable) {
      // Try to fall back to another provider if enabled
      if (this.enableFallback) {
        logger.warn(
          `Preferred provider ${providerType} not available, falling back...`
        );
        const available = this.getAvailableProviders();
        if (available.length === 0) {
          throw new AppError(
            `No LLM providers available. Please configure API keys.`,
            503
          );
        }
        logger.info(`Falling back to provider: ${available[0].name}`);
        return available[0];
      } else {
        throw new AppError(
          `Provider ${providerType} not available and fallback is disabled`,
          503
        );
      }
    }

    return provider;
  }

  /**
   * Generate text using the specified (or auto-selected) provider
   * @param request - LLM text generation request
   * @param providerType - Optional provider type
   * @returns LLM response with generated text
   */
  public async generateText(
    request: LLMRequest,
    providerType?: LLMProviderType
  ): Promise<LLMResponse> {
    const provider = this.getProvider(providerType);

    logger.info('Generating text', {
      provider: provider.name,
      model: request.model || 'default',
      messages: request.messages.length,
    });

    try {
      return await provider.generateText(request);
    } catch (error: any) {
      // If error and fallback enabled, try another provider
      if (this.enableFallback && providerType !== 'auto') {
        logger.warn(
          `Provider ${provider.name} failed, attempting fallback...`,
          {
            error: error.message,
          }
        );

        const available = this.getAvailableProviders().filter(
          (p) => p.name !== provider.name
        );
        if (available.length > 0) {
          logger.info(`Falling back to provider: ${available[0].name}`);
          return await available[0].generateText(request);
        }
      }

      throw error;
    }
  }

  /**
   * Analyze image using the specified (or auto-selected) provider
   * @param request - Vision analysis request
   * @param providerType - Optional provider type
   * @returns LLM response with image analysis
   */
  public async analyzeImage(
    request: VisionRequest,
    providerType?: LLMProviderType
  ): Promise<LLMResponse> {
    const provider = this.getProvider(providerType);

    logger.info('Analyzing image', {
      provider: provider.name,
      promptLength: request.prompt.length,
    });

    try {
      return await provider.analyzeImage(request);
    } catch (error: any) {
      // If error and fallback enabled, try another provider
      if (this.enableFallback && providerType !== 'auto') {
        logger.warn(
          `Provider ${provider.name} failed, attempting fallback...`,
          {
            error: error.message,
          }
        );

        const available = this.getAvailableProviders().filter(
          (p) => p.name !== provider.name
        );
        if (available.length > 0) {
          logger.info(`Falling back to provider: ${available[0].name}`);
          return await available[0].analyzeImage(request);
        }
      }

      throw error;
    }
  }

  /**
   * Health check all providers
   * @returns Map of provider name to health status
   */
  public async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers.entries()) {
      if (provider.isAvailable) {
        results[name] = await provider.healthCheck();
      } else {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * Get provider information
   * @returns Map of provider name to info
   */
  public getProviderInfo(): any {
    const info: any = {};

    for (const [name, provider] of this.providers.entries()) {
      info[name] = {
        available: provider.isAvailable,
        supportedModels: provider.supportedModels,
      };
    }

    return info;
  }

  /**
   * Get current configuration
   */
  public getConfig(): any {
    return {
      preferredProvider: this.preferredProvider,
      enableFallback: this.enableFallback,
      availableProviders: this.getAvailableProviders().map((p) => p.name),
      totalProviders: this.providers.size,
    };
  }
}

// Export singleton instance
export const llmProviderManager = new LLMProviderManager();
