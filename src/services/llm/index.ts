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
export {
  quotaManager,
  QuotaManager,
  type TaskPurpose,
  type ModelQuotaLimits,
  type ModelQuota,
} from './QuotaManager';

// Export prompt templates
export {
  promptTemplateService,
  PromptTemplateService,
  type SummaryType,
  type SummaryRequest,
  type PromptTemplate,
} from './prompt-templates';

// Export summarization service
export {
  summarizationService,
  SummarizationService,
  type SummarizationOptions,
  type SummarizationResult,
} from './summarization.service';

// Export token manager
export {
  tokenManager,
  TokenManager,
  type TokenUsage,
  type CostBreakdown,
  type ModelPricing,
  type UsageRecord,
} from './token-manager';

// Import for convenience exports
import { llmProviderManager } from './LLMProviderManager';
import { quotaManager } from './QuotaManager';

// Convenience exports
export const getLLMManager = () => llmProviderManager;
export const getQuotaManager = () => quotaManager;
