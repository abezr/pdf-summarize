/**
 * Multi-LLM Provider System
 * Export all LLM-related types and services
 */

// Export interfaces and types
export type { 
  ILLMProvider,
  LLMMessage,
  MessageContent,
  LLMRequest,
  LLMResponse,
  VisionRequest,
} from './ILLMProvider';

// Export provider implementations
export { OpenAIProvider } from './OpenAIProvider';
export { GoogleProvider } from './GoogleProvider';

// Export manager and types
export { llmProviderManager, type LLMProviderType } from './LLMProviderManager';

// Export quota management
export { quotaManager, QuotaManager, type TaskPurpose, type ModelQuotaLimits, type ModelQuota } from './QuotaManager';

// Convenience exports
export const getLLMManager = () => llmProviderManager;
export const getQuotaManager = () => quotaManager;
