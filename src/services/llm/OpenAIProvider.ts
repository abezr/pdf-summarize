/**
 * OpenAI Provider Implementation
 * Supports GPT-4o, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
 */

import OpenAI from 'openai';
import {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  VisionRequest,
} from './ILLMProvider';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { tokenManager } from './token-manager';

export class OpenAIProvider implements ILLMProvider {
  public readonly name = 'openai';
  public readonly supportedModels = [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ];

  private client: OpenAI | null = null;
  private apiKey: string | null = null;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || null;
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4o';

    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey });
      logger.info('OpenAI provider initialized', { model: this.defaultModel });
    } else {
      logger.warn('OpenAI API key not found, provider disabled');
    }
  }

  public get isAvailable(): boolean {
    return this.client !== null;
  }

  public async generateText(request: LLMRequest): Promise<LLMResponse> {
    if (!this.client) {
      throw new AppError('OpenAI provider not available', 503);
    }

    const startTime = Date.now();
    const model = request.model || this.defaultModel;

    try {
      logger.info('Generating text with OpenAI', { model });

      const completion = await this.client.chat.completions.create({
        model,
        messages: request.messages as any,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.3,
        top_p: request.topP ?? 0.9,
      });

      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0,
      };

      // Calculate cost using token manager
      const costBreakdown = tokenManager.calculateCost(model, tokensUsed);
      const processingTime = Date.now() - startTime;

      // Record usage for analytics
      tokenManager.recordUsage(model, 'openai', 'text-generation', tokensUsed, {
        requestModel: request.model,
        maxTokens: request.maxTokens,
      });

      logger.info('OpenAI text generation completed', {
        model,
        tokensUsed: tokensUsed.total,
        cost: costBreakdown.totalCost,
        processingTime,
      });

      return {
        content,
        model: completion.model,
        provider: 'openai',
        tokensUsed,
        cost: costBreakdown.totalCost,
        processingTime,
      };
    } catch (error: any) {
      logger.error('OpenAI text generation failed', { error: error.message });

      if (error.status === 429) {
        throw new AppError('OpenAI rate limit exceeded', 429);
      }
      if (error.status === 401) {
        throw new AppError('Invalid OpenAI API key', 401);
      }

      throw new AppError('OpenAI request failed', 500, {
        originalError: error,
      });
    }
  }

  public async analyzeImage(request: VisionRequest): Promise<LLMResponse> {
    if (!this.client) {
      throw new AppError('OpenAI provider not available', 503);
    }

    const startTime = Date.now();

    try {
      logger.info('Analyzing image with OpenAI Vision');

      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o', // GPT-4o has vision capabilities
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: request.prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${request.imageBase64}`,
                  detail: 'high',
                },
              },
            ],
          },
        ] as any,
        max_tokens: request.maxTokens || 4096,
      });

      const content = completion.choices[0]?.message?.content || '';
      const tokensUsed = {
        prompt: completion.usage?.prompt_tokens || 0,
        completion: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0,
      };

      const costBreakdown = tokenManager.calculateCost('gpt-4o', tokensUsed);
      const processingTime = Date.now() - startTime;

      // Record usage for analytics
      tokenManager.recordUsage(
        'gpt-4o',
        'openai',
        'vision-analysis',
        tokensUsed,
        { imageSize: request.imageBase64.length }
      );

      logger.info('OpenAI vision analysis completed', {
        tokensUsed: tokensUsed.total,
        cost: costBreakdown.totalCost,
        processingTime,
      });

      return {
        content,
        model: 'gpt-4o',
        provider: 'openai',
        tokensUsed,
        cost: costBreakdown.totalCost,
        processingTime,
      };
    } catch (error: any) {
      logger.error('OpenAI vision analysis failed', { error: error.message });
      throw new AppError('OpenAI vision analysis failed', 500, {
        originalError: error,
      });
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI health check failed', { error });
      return false;
    }
  }
}
