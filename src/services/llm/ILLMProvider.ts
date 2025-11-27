/**
 * LLM Provider Interface
 * Unified abstraction for multiple LLM providers (OpenAI, Google, etc.)
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface LLMRequest {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  model?: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: 'openai' | 'google';
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  processingTime: number;
}

export interface VisionRequest {
  imageBase64: string;
  prompt: string;
  maxTokens?: number;
}

/**
 * LLM Provider Interface
 * All LLM providers must implement this interface
 */
export interface ILLMProvider {
  /**
   * Provider name (e.g., 'openai', 'google')
   */
  readonly name: string;
  
  /**
   * Whether this provider is available (API key configured)
   */
  readonly isAvailable: boolean;
  
  /**
   * List of supported models
   */
  readonly supportedModels: string[];
  
  /**
   * Generate text from prompt
   */
  generateText(request: LLMRequest): Promise<LLMResponse>;
  
  /**
   * Analyze image with vision capabilities
   */
  analyzeImage(request: VisionRequest): Promise<LLMResponse>;
  
  /**
   * Check if provider is healthy
   */
  healthCheck(): Promise<boolean>;
}
