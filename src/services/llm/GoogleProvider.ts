/**
 * Google AI (Gemini) Provider Implementation
 * Supports Gemini 1.5 Pro, Gemini 1.5 Flash
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider, LLMRequest, LLMResponse, VisionRequest } from './ILLMProvider';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';
import { quotaManager, QuotaManager, TaskPurpose } from './QuotaManager';

export class GoogleProvider implements ILLMProvider {
  public readonly name = 'google';
  public readonly supportedModels = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-exp-1206',
    'gemini-pro',
    'gemini-pro-vision',
  ];
  
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private enableQuotaManagement: boolean;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || null;
    // Enable quota management by default (disable with GOOGLE_QUOTA_MANAGEMENT=false)
    this.enableQuotaManagement = process.env.GOOGLE_QUOTA_MANAGEMENT !== 'false';
    
    if (this.apiKey) {
      this.client = new GoogleGenerativeAI(this.apiKey);
      logger.info('Google AI provider initialized', {
        quotaManagement: this.enableQuotaManagement,
        supportedModels: this.supportedModels.length,
      });
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
    
    // Intelligent model selection based on quota management
    let modelName: string;
    if (this.enableQuotaManagement && !request.model) {
      // Auto-select model based on task purpose and available quota
      const purpose = this.inferTaskPurpose(request);
      const inputText = JSON.stringify(request.messages);
      const estimatedTokens = QuotaManager.estimateTokens(inputText) + (request.maxTokens || 4096);
      
      try {
        modelName = quotaManager.selectModel(purpose, estimatedTokens);
        logger.info('Model auto-selected by quota manager', { 
          purpose, 
          model: modelName,
          estimatedTokens,
        });
      } catch (error) {
        // If all models exhausted, throw the error
        throw error;
      }
    } else {
      // Use explicitly requested model or fallback to default
      modelName = request.model || 'gemini-1.5-flash';
      
      // Check quota even for explicit model requests
      if (this.enableQuotaManagement) {
        const inputText = JSON.stringify(request.messages);
        const estimatedTokens = QuotaManager.estimateTokens(inputText) + (request.maxTokens || 4096);
        
        if (!quotaManager.hasAvailableQuota(modelName, estimatedTokens)) {
          logger.warn(`Requested model ${modelName} has no quota, attempting fallback`);
          const purpose = this.inferTaskPurpose(request);
          modelName = quotaManager.selectModel(purpose, estimatedTokens);
        }
      }
    }

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

      // Record usage in quota manager
      if (this.enableQuotaManagement) {
        quotaManager.recordUsage(modelName, tokensUsed.total);
      }

      // Calculate cost (Google AI pricing)
      const cost = this.calculateCost(modelName, tokensUsed);
      const processingTime = Date.now() - startTime;

      logger.info('Google AI text generation completed', {
        model: modelName,
        tokensUsed: tokensUsed.total,
        cost,
        processingTime,
        quotaManaged: this.enableQuotaManagement,
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
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new AppError('Google AI quota exceeded', 429, {
          message: 'Daily quota exhausted. Please try again tomorrow.',
          resetTime: quotaManager.getQuotaStatus().nextReset,
        });
      }
      
      throw new AppError('Google AI request failed', 500, { originalError: error });
    }
  }

  /**
   * Infer task purpose from request to select optimal model
   */
  private inferTaskPurpose(request: LLMRequest): TaskPurpose {
    const messagesText = JSON.stringify(request.messages).toLowerCase();
    
    // Check for keywords to determine purpose
    if (messagesText.includes('summarize') || messagesText.includes('summary')) {
      if (messagesText.length > 10000) return 'bulk-processing';
      return 'quick-summary';
    }
    
    if (messagesText.includes('analyze') || messagesText.includes('analysis')) {
      if (messagesText.includes('detailed') || messagesText.includes('comprehensive')) {
        return 'detailed-analysis';
      }
      return 'standard-analysis';
    }
    
    if (messagesText.includes('critical') || messagesText.includes('important')) {
      return 'critical-task';
    }
    
    // Check request length to determine complexity
    if (messagesText.length > 20000) return 'detailed-analysis';
    if (messagesText.length < 5000) return 'quick-summary';
    
    // Default to standard analysis
    return 'standard-analysis';
  }

  public async analyzeImage(request: VisionRequest): Promise<LLMResponse> {
    if (!this.client) {
      throw new AppError('Google AI provider not available', 503);
    }

    const startTime = Date.now();
    
    // Select model for vision task based on quota
    let modelName = 'gemini-1.5-pro'; // Default for vision
    if (this.enableQuotaManagement) {
      const estimatedTokens = this.estimateTokens(request.prompt) + 1000; // Image + response tokens
      try {
        modelName = quotaManager.selectModel('vision-analysis', estimatedTokens);
        // Ensure selected model supports vision
        if (!modelName.includes('flash') && !modelName.includes('pro')) {
          modelName = 'gemini-1.5-flash'; // Fallback to flash for vision
        }
      } catch (error) {
        logger.warn('No quota available for vision, using default', { error });
      }
    }

    try {
      logger.info('Analyzing image with Google AI Vision', { model: modelName });

      const model = this.client.getGenerativeModel({ model: modelName });

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

      // Record usage
      if (this.enableQuotaManagement) {
        quotaManager.recordUsage(modelName, tokensUsed.total);
      }

      const cost = this.calculateCost(modelName, tokensUsed);
      const processingTime = Date.now() - startTime;

      logger.info('Google AI vision analysis completed', {
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
      logger.error('Google AI vision analysis failed', { error: error.message });
      
      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        throw new AppError('Google AI quota exceeded', 429, {
          message: 'Daily quota exhausted. Please try again tomorrow.',
          resetTime: quotaManager.getQuotaStatus().nextReset,
        });
      }
      
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
    // Free tier usage is $0, but we track theoretical costs
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-2.0-flash-exp': { input: 0, output: 0 }, // Experimental - free
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 }, // per 1K tokens
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
      'gemini-1.5-flash-8b': { input: 0.0000375, output: 0.00015 }, // Half of flash
      'gemini-exp-1206': { input: 0, output: 0 }, // Experimental - free
      'gemini-pro': { input: 0.0005, output: 0.0015 },
    };

    const modelPricing = pricing[model] || pricing['gemini-1.5-flash'];
    const inputCost = (tokensUsed.prompt / 1000) * modelPricing.input;
    const outputCost = (tokensUsed.completion / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      // Use cheapest model for health check
      const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
      await model.generateContent('Hello');
      return true;
    } catch (error) {
      logger.error('Google AI health check failed', { error });
      return false;
    }
  }

  /**
   * Get current quota status
   */
  public getQuotaStatus(): any {
    if (!this.enableQuotaManagement) {
      return {
        enabled: false,
        message: 'Quota management is disabled',
      };
    }
    
    return {
      enabled: true,
      ...quotaManager.getQuotaStatus(),
    };
  }

  /**
   * Force reset quotas (for testing/admin purposes)
   */
  public resetQuotas(): void {
    if (this.enableQuotaManagement) {
      quotaManager.forceReset();
      logger.info('Quotas manually reset');
    }
  }
}
