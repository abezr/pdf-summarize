/**
 * Google AI (Gemini) Provider Implementation
 * Supports Gemini 1.5 Pro, Gemini 1.5 Flash
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider, LLMRequest, LLMResponse, VisionRequest } from './ILLMProvider';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export class GoogleProvider implements ILLMProvider {
  public readonly name = 'google';
  public readonly supportedModels = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro',
    'gemini-pro-vision',
  ];
  
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || null;
    this.defaultModel = process.env.GOOGLE_MODEL || 'gemini-1.5-pro';
    
    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
      logger.info('Google AI provider initialized', { model: this.defaultModel });
    } else {
      logger.warn('Google API key not found, provider disabled');
    }
  }

  public get isAvailable(): boolean {
    return this.client !== null;
  }

  public async generateText(request: LLMRequest): Promise<LLMResponse> {
    if (!this.client) {
      throw new AppError('Google AI provider not available', 503);
    }

    const startTime = Date.now();
    const modelName = request.model || this.defaultModel;

    try {
      logger.info('Generating text with Google AI', { model: modelName });

      const model = this.client.getGenerativeModel({ model: modelName });

      // Convert messages to Gemini format
      const contents = this.convertMessagesToGeminiFormat(request.messages);

      const result = await model.generateContent({
        contents,
        generationConfig: {
          maxOutputTokens: request.maxTokens || 4096,
          temperature: request.temperature ?? 0.3,
          topP: request.topP ?? 0.9,
        },
      });

      const response = await result.response;
      const content = response.text();

      // Estimate token usage (Gemini doesn't provide exact counts in all cases)
      const tokensUsed = {
        prompt: this.estimateTokens(JSON.stringify(contents)),
        completion: this.estimateTokens(content),
        total: 0,
      };
      tokensUsed.total = tokensUsed.prompt + tokensUsed.completion;

      // Calculate cost (Google AI pricing)
      const cost = this.calculateCost(modelName, tokensUsed);
      const processingTime = Date.now() - startTime;

      logger.info('Google AI text generation completed', {
        model: modelName,
        tokensUsed: tokensUsed.total,
        cost,
        processingTime,
      });

      return {
        content,
        model: modelName,
        provider: 'google',
        tokensUsed,
        cost,
        processingTime,
      };
    } catch (error: any) {
      logger.error('Google AI text generation failed', { error: error.message });
      
      if (error.message?.includes('API key')) {
        throw new AppError('Invalid Google API key', 401);
      }
      if (error.message?.includes('quota')) {
        throw new AppError('Google AI quota exceeded', 429);
      }
      
      throw new AppError('Google AI request failed', 500, { originalError: error });
    }
  }

  public async analyzeImage(request: VisionRequest): Promise<LLMResponse> {
    if (!this.client) {
      throw new AppError('Google AI provider not available', 503);
    }

    const startTime = Date.now();

    try {
      logger.info('Analyzing image with Google AI Vision');

      // Use Gemini 1.5 Pro for vision tasks
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-pro' });

      const result = await model.generateContent([
        request.prompt,
        {
          inlineData: {
            data: request.imageBase64,
            mimeType: 'image/png',
          },
        },
      ]);

      const response = await result.response;
      const content = response.text();

      const tokensUsed = {
        prompt: this.estimateTokens(request.prompt) + 258, // Approximate image tokens
        completion: this.estimateTokens(content),
        total: 0,
      };
      tokensUsed.total = tokensUsed.prompt + tokensUsed.completion;

      const cost = this.calculateCost('gemini-1.5-pro', tokensUsed);
      const processingTime = Date.now() - startTime;

      logger.info('Google AI vision analysis completed', {
        tokensUsed: tokensUsed.total,
        cost,
        processingTime,
      });

      return {
        content,
        model: 'gemini-1.5-pro',
        provider: 'google',
        tokensUsed,
        cost,
        processingTime,
      };
    } catch (error: any) {
      logger.error('Google AI vision analysis failed', { error: error.message });
      throw new AppError('Google AI vision analysis failed', 500, { originalError: error });
    }
  }

  private convertMessagesToGeminiFormat(messages: any[]): any[] {
    // Convert OpenAI message format to Gemini format
    const contents: any[] = [];
    let systemMessage = '';
    
    for (const message of messages) {
      if (message.role === 'system') {
        // Gemini doesn't have system role, save it to prepend to first user message
        systemMessage = typeof message.content === 'string' ? message.content : '';
        continue;
      }

      const role = message.role === 'assistant' ? 'model' : 'user';
      
      if (typeof message.content === 'string') {
        let text = message.content;
        // Prepend system message to first user message
        if (role === 'user' && systemMessage && contents.length === 0) {
          text = `${systemMessage}\n\n${text}`;
        }
        
        contents.push({
          role,
          parts: [{ text }],
        });
      } else if (Array.isArray(message.content)) {
        // Handle multimodal content
        const parts = message.content.map((part: any) => {
          if (part.type === 'text') {
            return { text: part.text };
          } else if (part.type === 'image_url') {
            // Extract base64 from data URL
            const base64 = part.image_url.url.split(',')[1] || part.image_url.url;
            return {
              inlineData: {
                data: base64,
                mimeType: 'image/png',
              },
            };
          }
          return null;
        }).filter(Boolean);

        contents.push({ role, parts });
      }
    }

    return contents;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateCost(model: string, tokensUsed: any): number {
    // Google AI pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 }, // per 1K tokens
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
      'gemini-pro': { input: 0.0005, output: 0.0015 },
    };

    const modelPricing = pricing[model] || pricing['gemini-1.5-pro'];
    const inputCost = (tokensUsed.prompt / 1000) * modelPricing.input;
    const outputCost = (tokensUsed.completion / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('Hello');
      return true;
    } catch (error) {
      logger.error('Google AI health check failed', { error });
      return false;
    }
  }
}
