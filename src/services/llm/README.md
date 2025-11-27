# Multi-LLM Provider System

This directory contains the Multi-LLM provider implementation for the PDF Summary AI project, supporting both OpenAI and Google AI (Gemini) with automatic provider selection and fallback capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              LLM Provider Abstraction Layer                  │
│                                                               │
│  Configuration (.env)                                        │
│       ↓                                                       │
│  ┌────────────────────────────────────────────┐             │
│  │ LLM Provider Manager                        │             │
│  │ • Auto-detect available providers           │             │
│  │ • Fallback logic                            │             │
│  │ • Unified interface                         │             │
│  └────────┬───────────────────┬────────────────┘             │
│           │                   │                              │
│      Has OpenAI Key?    Has Google Key?                     │
│           │                   │                              │
│           v                   v                              │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │  OpenAI Service │  │  Google Service  │                 │
│  │  (GPT-4o)       │  │  (Gemini 1.5)    │                 │
│  └─────────────────┘  └──────────────────┘                 │
│           │                   │                              │
│           v                   v                              │
│  Unified LLMResponse Interface                              │
└─────────────────────────────────────────────────────────────┘
```

## Files

- **`ILLMProvider.ts`**: Core interface defining the contract for all LLM providers
- **`OpenAIProvider.ts`**: OpenAI implementation (GPT-4o, GPT-4, GPT-3.5)
- **`GoogleProvider.ts`**: Google AI implementation (Gemini 1.5 Pro, Gemini 1.5 Flash)
- **`LLMProviderManager.ts`**: Manager for provider selection, auto-detection, and fallback

## Quick Start

### 1. Install Dependencies

```bash
npm install openai @google/generative-ai
```

### 2. Configure Environment Variables

Choose one of the following scenarios:

#### Scenario A: OpenAI Only
```env
OPENAI_API_KEY=sk-your-openai-key
LLM_PROVIDER=openai
```

#### Scenario B: Google Only
```env
GOOGLE_API_KEY=your-google-key
LLM_PROVIDER=google
```

#### Scenario C: Auto-Select (Recommended)
```env
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_API_KEY=your-google-key
LLM_PROVIDER=auto
LLM_ENABLE_FALLBACK=true
```

### 3. Use in Your Code

```typescript
import { llmProviderManager } from './services/llm/LLMProviderManager';

// Auto-select provider
const response = await llmProviderManager.generateText({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Summarize this document...' }
  ],
  maxTokens: 1000,
});

console.log(`Provider: ${response.provider}`); // 'openai' or 'google'
console.log(`Model: ${response.model}`);       // 'gpt-4o' or 'gemini-1.5-pro'
console.log(`Cost: $${response.cost.toFixed(4)}`);
console.log(`Summary: ${response.content}`);
```

## Usage Examples

### Example 1: Text Generation (Auto-Select)

```typescript
const summary = await llmProviderManager.generateText({
  messages: [
    { role: 'system', content: 'You are an expert document summarizer.' },
    { role: 'user', content: 'Summarize the following: ...' }
  ],
  maxTokens: 2000,
  temperature: 0.3,
});

// Returns: { content, model, provider, tokensUsed, cost, processingTime }
```

### Example 2: Force Specific Provider

```typescript
// Force Google AI (Gemini)
const response = await llmProviderManager.generateText({
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ],
}, 'google'); // Explicitly specify 'google'

// Force OpenAI
const response2 = await llmProviderManager.generateText({
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ],
}, 'openai'); // Explicitly specify 'openai'
```

### Example 3: Vision/Image Analysis

```typescript
import fs from 'fs';

const imageBuffer = fs.readFileSync('./document-page.png');
const base64Image = imageBuffer.toString('base64');

const ocrResult = await llmProviderManager.analyzeImage({
  imageBase64: base64Image,
  prompt: 'Extract all text from this document page.',
  maxTokens: 4096,
});

console.log(`OCR Text: ${ocrResult.content}`);
console.log(`Provider: ${ocrResult.provider}`); // Will use available vision model
console.log(`Cost: $${ocrResult.cost.toFixed(4)}`);
```

### Example 4: Health Check

```typescript
const health = await llmProviderManager.healthCheck();
console.log(health);
// Output: { openai: true, google: false }
```

### Example 5: Get Provider Info

```typescript
const info = llmProviderManager.getProviderInfo();
console.log(info);
// Output:
// {
//   openai: {
//     available: true,
//     supportedModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo']
//   },
//   google: {
//     available: false,
//     supportedModels: ['gemini-1.5-pro', 'gemini-1.5-flash', ...]
//   }
// }
```

## Cost Comparison

### Text Summarization (1K input tokens, 500 output tokens)

| Provider | Model | Input Cost | Output Cost | Total Cost | Savings vs GPT-4o |
|----------|-------|------------|-------------|------------|-------------------|
| OpenAI | GPT-4o | $0.005 | $0.0075 | **$0.0125** | - |
| OpenAI | GPT-3.5 Turbo | $0.0005 | $0.00075 | **$0.00125** | 90% |
| Google | Gemini 1.5 Pro | $0.00125 | $0.0025 | **$0.00375** | 70% |
| Google | Gemini 1.5 Flash | $0.000075 | $0.00015 | **$0.000225** | **98%** 🏆 |

**Winner**: Gemini 1.5 Flash is **55x cheaper** than GPT-4o!

### Vision/OCR (per image)

| Provider | Model | Cost per Image | Savings vs GPT-4o |
|----------|-------|----------------|-------------------|
| OpenAI | GPT-4o Vision | $0.01-0.02 | - |
| Google | Gemini 1.5 Pro Vision | $0.005-0.01 | **50%** 🏆 |

**Winner**: Gemini 1.5 Pro Vision is **2x cheaper**!

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `auto` | Provider selection: `auto`, `openai`, `google` |
| `LLM_ENABLE_FALLBACK` | `true` | Enable automatic fallback to other providers |
| `OPENAI_API_KEY` | - | OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | Default OpenAI model |
| `GOOGLE_API_KEY` | - | Google AI API key |
| `GOOGLE_MODEL` | `gemini-1.5-pro` | Default Google model |

## Features

### ✅ Flexibility
- Support multiple LLM providers
- Easy to add new providers (Claude, Llama, etc.)
- User can choose based on API key availability

### ✅ Cost Optimization
- Gemini 1.5 Flash is 55x cheaper than GPT-4o
- Automatic provider selection based on cost
- Transparent cost tracking per provider

### ✅ Reliability
- Automatic fallback if preferred provider fails
- Health checks for all providers
- Clear error messages

### ✅ Future-Proof
- Easy to add Claude, Llama, or custom models
- Provider abstraction layer
- No vendor lock-in

## Adding a New Provider

To add a new LLM provider (e.g., Anthropic Claude):

1. **Create Provider Class**:
```typescript
// src/services/llm/ClaudeProvider.ts
import { ILLMProvider, LLMRequest, LLMResponse } from './ILLMProvider';

export class ClaudeProvider implements ILLMProvider {
  public readonly name = 'claude';
  public readonly supportedModels = ['claude-3-opus', 'claude-3-sonnet'];
  
  // Implement: generateText, analyzeImage, healthCheck
}
```

2. **Register in Manager**:
```typescript
// src/services/llm/LLMProviderManager.ts
import { ClaudeProvider } from './ClaudeProvider';

constructor() {
  this.registerProvider(new OpenAIProvider());
  this.registerProvider(new GoogleProvider());
  this.registerProvider(new ClaudeProvider()); // Add here
}
```

3. **Update Type**:
```typescript
export type LLMProviderType = 'openai' | 'google' | 'claude' | 'auto';
```

That's it! The new provider is now available.

## Error Handling

The system handles errors gracefully:

```typescript
try {
  const response = await llmProviderManager.generateText({
    messages: [{ role: 'user', content: 'Hello' }],
  });
} catch (error) {
  if (error.statusCode === 503) {
    console.error('No providers available');
  } else if (error.statusCode === 429) {
    console.error('Rate limit exceeded');
  } else if (error.statusCode === 401) {
    console.error('Invalid API key');
  } else {
    console.error('LLM request failed:', error.message);
  }
}
```

## Testing

```typescript
import { llmProviderManager } from './LLMProviderManager';

describe('LLM Provider Manager', () => {
  it('should auto-select available provider', () => {
    const provider = llmProviderManager.getProvider('auto');
    expect(provider).toBeDefined();
    expect(provider.isAvailable).toBe(true);
  });

  it('should generate text', async () => {
    const response = await llmProviderManager.generateText({
      messages: [{ role: 'user', content: 'Test' }],
    });
    
    expect(response.content).toBeDefined();
    expect(response.provider).toMatch(/openai|google/);
  });
});
```

## Best Practices

1. **Use Auto-Select**: Set `LLM_PROVIDER=auto` for maximum flexibility
2. **Enable Fallback**: Set `LLM_ENABLE_FALLBACK=true` for reliability
3. **Cost Optimization**: Use Gemini 1.5 Flash for cost-sensitive operations
4. **Quality**: Use GPT-4o or Gemini 1.5 Pro for critical tasks
5. **Monitor Costs**: Track `response.cost` for budget management
6. **Health Checks**: Run periodic health checks for all providers

## License

MIT
