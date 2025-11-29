# Multi-LLM Provider System

Complete guide for using OpenAI and Google Gemini with intelligent quota management.

## Quick Start (5 minutes)

```bash
# 1. Configure environment
cp .env.example .env

# 2. Add API key (choose ONE)
echo "GOOGLE_API_KEY=your-key-here" >> .env          # FREE tier
echo "GOOGLE_QUOTA_MANAGEMENT=true" >> .env         # Enable smart selection

# OR
echo "OPENAI_API_KEY=sk-your-key-here" >> .env      # Paid

# 3. Use in code
import { llmProviderManager } from './src/services/llm';

const response = await llmProviderManager.generateText({
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

That's it! The system automatically:
- ✅ Detects available providers
- ✅ Selects optimal model based on task
- ✅ Tracks quota and falls back when needed
- ✅ Calculates costs

## Providers

### Google Gemini (Recommended - FREE)

**Models Available**:
- `gemini-1.5-flash-8b` - Ultra-fast, cheapest ($0.0000375/1K tokens)
- `gemini-1.5-flash` - Fast, balanced ($0.000075/1K tokens)  
- `gemini-1.5-pro` - Best quality ($0.00125/1K tokens)

**Free Tier Limits**:
- Flash-8B: 4,000 requests/day
- Flash: 1,500 requests/day
- Pro: 50 requests/day

**Get API Key**: https://makersuite.google.com/app/apikey (No credit card required)

### OpenAI (Paid)

**Models Available**:
- `gpt-4o` - Best quality ($0.01/1K tokens)
- `gpt-4-turbo` - Fast ($0.01/1K tokens)
- `gpt-3.5-turbo` - Cheapest OpenAI ($0.001/1K tokens)

**Get API Key**: https://platform.openai.com/api-keys (Credit card required)

## Configuration

### Environment Variables

```bash
# Provider Selection
LLM_PROVIDER=auto              # auto | openai | google
LLM_ENABLE_FALLBACK=true       # Enable automatic fallback

# Google AI (Recommended)
GOOGLE_API_KEY=your-key-here
GOOGLE_QUOTA_MANAGEMENT=true   # Enable dynamic model selection
GOOGLE_DAILY_QUOTA=1000000     # 1M tokens/day default

# OpenAI (Optional)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
```

### Provider Selection Logic

```
LLM_PROVIDER=auto → Tries OpenAI first, falls back to Google
LLM_PROVIDER=openai → Only OpenAI (fails if unavailable)
LLM_PROVIDER=google → Only Google (fails if unavailable)
```

## Dynamic Quota Management

When `GOOGLE_QUOTA_MANAGEMENT=true`, the system intelligently selects models based on:

### Task Purpose Detection

The system auto-detects task type and recommends optimal models:

| Task Type | Use Case | Priority Models |
|-----------|----------|----------------|
| `bulk-processing` | 100+ documents, batch jobs | flash-8b → flash → pro |
| `quick-summary` | Fast summaries, basic tasks | flash → flash-8b → pro |
| `standard-analysis` | Default processing | flash → pro → flash-8b |
| `detailed-analysis` | Complex documents, research | pro → flash → flash-8b |
| `vision-analysis` | Image/table extraction | flash → pro (vision models) |
| `critical-task` | High-stakes, accuracy first | pro → flash → flash-8b |

### Quota Tracking

Tracks usage per model:
- ✅ Daily request count (RPD)
- ✅ Token consumption
- ✅ Budget percentage (80%/90% warnings)
- ✅ Automatic reset at midnight PT

### Smart Fallback

When primary model exhausted:
1. Try next recommended model for task
2. Try any available model
3. Return 429 with next reset time

## API Reference

### Basic Usage

```typescript
import { llmProviderManager } from './src/services/llm';

// Generate text
const response = await llmProviderManager.generateText({
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'Explain quantum computing' }
  ],
  maxTokens: 500,
  temperature: 0.7
});

console.log(response.content);      // Generated text
console.log(response.provider);     // 'openai' or 'google'
console.log(response.model);        // 'gpt-4o' or 'gemini-1.5-flash'
console.log(response.cost);         // 0.0023
console.log(response.tokensUsed);   // { prompt: 45, completion: 182, total: 227 }
```

### With Vision (Images)

```typescript
import { llmProviderManager } from './src/services/llm';

const response = await llmProviderManager.analyzeImage({
  prompt: 'Describe this image in detail',
  imageUrl: 'https://example.com/image.jpg',
  maxTokens: 300
});

console.log(response.content);
```

### Check Provider Health

```typescript
const health = await llmProviderManager.healthCheck();

console.log(health);
// {
//   openai: true,
//   google: true,
//   preferred: 'openai',
//   fallbackEnabled: true
// }
```

### Check Quota Status (Google)

```typescript
import { GoogleProvider } from './src/services/llm';

const provider = new GoogleProvider();
const status = provider.getQuotaStatus();

console.log(status);
// {
//   enabled: true,
//   dailyQuota: 1000000,
//   used: { tokens: 45230, requests: 123 },
//   remaining: { tokens: 954770, requests: 1377 },
//   percentUsed: 4.5,
//   nextReset: '2025-11-30T08:00:00.000Z',
//   models: {
//     'gemini-1.5-flash-8b': { requests: 45, tokens: 12340, rpdLimit: 4000, available: true },
//     'gemini-1.5-flash': { requests: 67, tokens: 25890, rpdLimit: 1500, available: true },
//     'gemini-1.5-pro': { requests: 11, tokens: 7000, rpdLimit: 50, available: true }
//   }
// }
```

### Force Specific Provider

```typescript
import { OpenAIProvider, GoogleProvider } from './src/services/llm';

// Force OpenAI
const openai = new OpenAIProvider();
const response1 = await openai.generateText({...});

// Force Google
const google = new GoogleProvider();
const response2 = await google.generateText({...});
```

## Cost Optimization

### Real-World Example

Processing 1,000 documents/day:

| Strategy | Daily Cost | Monthly Cost | Annual Cost |
|----------|------------|--------------|-------------|
| GPT-4o only | $9.00 | $270 | $3,240 |
| Quota Management | $0.22 | $6.60 | $79.20 |
| **Savings** | **$8.78 (97.6%)** | **$263.40** | **$3,160.80** |

### Cost Breakdown by Model

| Model | Cost/1K tokens | 1,000 docs | 10,000 docs | 100,000 docs |
|-------|----------------|------------|-------------|--------------|
| GPT-4o | $0.01 | $9.00 | $90 | $900 |
| Gemini Pro | $0.00125 | $1.13 | $11.25 | $112.50 |
| Gemini Flash | $0.000075 | $0.07 | $0.68 | $6.75 |
| Gemini Flash-8B | $0.0000375 | $0.03 | $0.34 | $3.38 |

**Optimal Mix** (with quota management):
- 60% Flash-8B (bulk tasks): $0.02
- 30% Flash (standard tasks): $0.02
- 10% Pro (complex tasks): $0.11
- **Total**: $0.15/day vs $9.00/day = **98.3% savings**

## Code Structure

```
src/services/llm/
├── ILLMProvider.ts          # Interface (81 lines)
├── OpenAIProvider.ts        # OpenAI implementation (184 lines)
├── GoogleProvider.ts        # Google + Quota Manager (390 lines)
├── QuotaManager.ts          # Quota tracking logic (361 lines)
├── LLMProviderManager.ts    # Auto-detection & fallback (238 lines)
├── prompt-templates.ts      # Reusable prompts
├── token-manager.ts         # Token counting utilities
└── index.ts                 # Exports
```

## Troubleshooting

### "No LLM providers available"

**Cause**: No API keys configured

**Solution**:
```bash
# Add at least one API key to .env
GOOGLE_API_KEY=your-key-here  # Recommended
# OR
OPENAI_API_KEY=sk-your-key-here
```

### "Quota exceeded" (Google)

**Cause**: Daily limit reached

**Solution**:
```bash
# Check status
curl http://localhost:3000/api/llm/quota-status

# Options:
# 1. Wait for reset (midnight PT)
# 2. Increase budget: GOOGLE_DAILY_QUOTA=2000000
# 3. Add OpenAI as fallback
```

### "Rate limit" errors

**Cause**: Hitting RPM limits

**Solution**:
- Google Free Tier: 15 RPM per model
- Add delays between requests
- Enable fallback to distribute load

### High costs

**Cause**: Using expensive models

**Solution**:
```bash
# Enable quota management for automatic optimization
GOOGLE_QUOTA_MANAGEMENT=true

# Or manually select cheaper models
OPENAI_MODEL=gpt-3.5-turbo  # Instead of gpt-4o
GOOGLE_MODEL=gemini-1.5-flash  # Instead of pro
```

## Advanced Topics

### Custom Task Purpose Detection

```typescript
import { GoogleProvider, TaskPurpose } from './src/services/llm';

const provider = new GoogleProvider();

const response = await provider.generateText({
  messages: [{...}],
  taskPurpose: 'critical-task'  // Force pro model
});
```

### Monitor Usage

```typescript
// Get real-time quota status
const status = provider.getQuotaStatus();

// Check if specific model available
if (status.models['gemini-1.5-pro'].available) {
  // Use pro model
}
```

### Disable Quota Management

```bash
# In .env
GOOGLE_QUOTA_MANAGEMENT=false
GOOGLE_MODEL=gemini-1.5-flash  # Use fixed model
```

## Best Practices

1. **Start with Google AI** - Free tier perfect for development
2. **Enable Quota Management** - 97%+ cost savings automatically
3. **Enable Fallback** - Reliability through redundancy
4. **Monitor Usage** - Check `/api/llm/quota-status` regularly
5. **Use Task Types** - Let system select optimal model
6. **Add Multiple Providers** - OpenAI + Google for resilience

## Further Reading

- **[Quota Management Details](./QUOTA-MANAGEMENT.md)** - Deep dive into quota system
- **[Architecture Overview](./MULTI-LLM-SUPPORT.md)** - Complete technical design
- **[Implementation Summary](./MULTI-LLM-IMPLEMENTATION-SUMMARY.md)** - Build details
- **[Google Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)** - Official limits

## Summary

**What You Get**:
- ✅ 2 providers (OpenAI + Google) with 8 models
- ✅ Auto-detection, fallback, and smart selection
- ✅ Dynamic quota management (97%+ savings)
- ✅ Vision support for both providers
- ✅ Real-time cost tracking
- ✅ Zero configuration for most use cases

**Total Code**: 1,325 lines of production-ready TypeScript

**Repository**: https://github.com/abezr/pdf-summarize
