# Google Gemini Quota Management

**Dynamic, Intelligent Model Selection with Automatic Fallback**

## Overview

The Quota Management system automatically distributes your Google Gemini API token budget across multiple models, selecting the most appropriate model for each task while respecting daily quota limits.

### Key Features

✅ **Automatic Model Selection** - Chooses optimal model based on task purpose  
✅ **Daily Quota Tracking** - Monitors token usage per model and overall budget  
✅ **Intelligent Fallback** - Switches to alternative models when quota exhausted  
✅ **Cost Optimization** - Prefers cheaper models for suitable tasks  
✅ **Zero Configuration** - Works out of the box with sensible defaults

---

## Quick Start

### 1. Enable Quota Management

```bash
# .env
GOOGLE_API_KEY=your-api-key-here
GOOGLE_QUOTA_MANAGEMENT=true          # Enable (default)
GOOGLE_DAILY_QUOTA=1000000            # 1M tokens/day (default)
```

### 2. Use Automatically

```typescript
import { llmProviderManager } from './services/llm';

// The system automatically selects the best model
const response = await llmProviderManager.generateText({
  messages: [
    { role: 'user', content: 'Summarize this document...' }
  ]
});

console.log(`Used model: ${response.model}`); // e.g., "gemini-1.5-flash"
```

**That's it!** No need to specify models or manage quotas manually.

---

## How It Works

### 1. Task Purpose Detection

The system analyzes your request to determine the task purpose:

| Purpose | Description | Recommended Models |
|---------|-------------|-------------------|
| `bulk-processing` | Large volume, simple tasks | flash-8b → 2.0-flash-exp → flash |
| `quick-summary` | Fast summaries | 2.0-flash-exp → flash → flash-8b |
| `standard-analysis` | Normal analysis | flash → 2.0-flash-exp → pro |
| `detailed-analysis` | Complex reasoning | pro → exp-1206 → flash |
| `vision-analysis` | OCR/Image processing | flash → pro → 2.0-flash-exp |
| `critical-task` | Must succeed with best quality | pro → exp-1206 → flash |

### 2. Quota-Based Selection

For each task:

1. **Estimate tokens** needed for the request
2. **Check quota** for recommended models (in priority order)
3. **Select first available** model with sufficient quota
4. **Fallback** to any available model if all recommended models exhausted
5. **Throw error** if ALL models exhausted (user must wait for reset)

### 3. Usage Recording

After each successful request:

- Records actual tokens used
- Updates model-specific and total daily usage
- Alerts when approaching limits (80%, 90%)
- Prevents new requests if budget exhausted

### 4. Daily Reset

Quotas automatically reset at **midnight Pacific Time** (per Google's rules).

---

## Google Gemini Free Tier Limits

### Rate Limits (as of 2024)

| Model | RPM | TPM | RPD | Best For |
|-------|-----|-----|-----|----------|
| **gemini-2.0-flash-exp** | 10 | 4M | 1,500 | Experimental features, FREE |
| **gemini-1.5-flash** | 15 | 1M | 1,500 | Fast, general purpose |
| **gemini-1.5-flash-8b** | 15 | 4M | 1,500 | Bulk processing, cheapest |
| **gemini-1.5-pro** | 2 | 32K | **50** | Complex reasoning, best quality |
| **gemini-exp-1206** | 2 | 32K | **50** | Experimental Pro features |

> **Note**: `gemini-1.5-pro` has a very low daily limit (50 requests). The system reserves it for critical tasks.

### Cost Comparison (Theoretical - Free Tier is $0)

| Model | Input (per 1K tokens) | Output (per 1K tokens) | vs GPT-4o |
|-------|----------------------|------------------------|-----------|
| gemini-1.5-flash-8b | $0.0000375 | $0.00015 | **100x cheaper** |
| gemini-1.5-flash | $0.000075 | $0.0003 | **55x cheaper** |
| gemini-1.5-pro | $0.00125 | $0.005 | **3.3x cheaper** |
| gemini-2.0-flash-exp | FREE | FREE | **Infinite savings** |
| GPT-4o | $0.005 | $0.015 | Baseline |

---

## Configuration Options

### Environment Variables

```bash
# Enable/disable quota management
GOOGLE_QUOTA_MANAGEMENT=true          # Default: true

# Daily token budget (total across all models)
GOOGLE_DAILY_QUOTA=1000000            # Default: 1M tokens/day

# Adjust based on your tier:
# - Free Tier: 1,000,000 (recommended)
# - Light usage: 500,000
# - Heavy usage: 2,000,000+
```

### Budget Guidelines

**Free Tier Strategy** (1M tokens/day):

- **gemini-1.5-flash-8b**: 600K tokens (bulk)
- **gemini-1.5-flash**: 300K tokens (standard)
- **gemini-1.5-pro**: 100K tokens (critical)

This allows:
- 150+ standard document summaries/day
- 300+ quick summaries/day
- 10-15 critical analyses/day

---

## Advanced Usage

### Explicit Task Purpose

```typescript
import { llmProviderManager, TaskPurpose } from './services/llm';

// Option 1: Let system infer purpose (recommended)
const response = await llmProviderManager.generateText({
  messages: [
    { role: 'user', content: 'Provide a detailed analysis of...' }
  ]
});

// Option 2: Specify purpose manually (advanced)
// Note: Direct access to Google provider with purpose hint
import { quotaManager } from './services/llm';

const model = quotaManager.selectModel('detailed-analysis', 5000);
// Use this model in your request
```

### Check Quota Status

```typescript
import { quotaManager } from './services/llm';

const status = quotaManager.getQuotaStatus();

console.log(status);
/*
{
  dailyBudget: 1000000,
  totalUsed: 234567,
  percentUsed: "23.46",
  nextReset: "2024-12-28T08:00:00.000Z",
  models: {
    "gemini-1.5-flash": {
      limits: { rpm: 15, tpm: 1000000, rpd: 1500 },
      usage: { tokensUsed: 123456, requestsToday: 234, lastReset: ... },
      available: true,
      requestsRemaining: 1266
    },
    ...
  }
}
*/
```

### Manual Reset (Testing/Admin)

```typescript
import { quotaManager } from './services/llm';

// Force reset all quotas (use with caution!)
quotaManager.forceReset();
```

### Disable Quota Management

```bash
# .env
GOOGLE_QUOTA_MANAGEMENT=false
```

Then specify models explicitly:

```typescript
const response = await llmProviderManager.generateText({
  model: 'gemini-1.5-pro',  // Explicit model
  messages: [...]
});
```

---

## Task Purpose Inference

The system automatically detects task purpose from your request:

### Detection Rules

```typescript
// Keywords trigger specific purposes
"summarize" + large text → bulk-processing
"summarize" + normal text → quick-summary
"analyze" + "detailed" → detailed-analysis
"analyze" → standard-analysis
"critical" / "important" → critical-task

// Length-based detection
> 20K chars → detailed-analysis
< 5K chars → quick-summary
Default → standard-analysis
```

### Override Detection

Structure your prompts to influence detection:

```typescript
// Force critical task (uses Pro model)
messages: [
  { role: 'user', content: 'CRITICAL: Analyze this contract for legal issues...' }
]

// Force quick summary (uses Flash)
messages: [
  { role: 'user', content: 'Quickly summarize the key points...' }
]

// Force detailed analysis (uses Pro)
messages: [
  { role: 'user', content: 'Provide a comprehensive, detailed analysis...' }
]
```

---

## Monitoring & Alerts

### Console Logs

The system logs quota events:

```bash
# Model selection
[INFO] Model auto-selected by quota manager { purpose: 'quick-summary', model: 'gemini-1.5-flash' }

# Usage recording
[INFO] Token usage recorded { model: 'gemini-1.5-flash', tokensUsed: 1234, totalToday: 45678 }

# Approaching limits
[WARN] ⚠️  Approaching daily token budget (80%) { used: 800000, budget: 1000000 }

# Critical threshold
[ERROR] 🚨 Critical: Daily token budget nearly exhausted (90%) { used: 900000, budget: 1000000 }

# Quota exhausted
[ERROR] All Gemini models have exceeded their daily quota. Please try again tomorrow.
```

### Quota Exhaustion Error

When all models are exhausted:

```typescript
try {
  const response = await llmProviderManager.generateText(...);
} catch (error) {
  if (error.statusCode === 429) {
    console.error('Quota exhausted:', error.message);
    console.log('Next reset:', error.metadata.resetTime);
    // Show user-friendly message
  }
}
```

---

## Best Practices

### 1. Set Realistic Daily Budget

```bash
# Start conservative, increase as needed
GOOGLE_DAILY_QUOTA=500000    # 500K tokens/day

# Monitor usage for 1-2 weeks
# Adjust based on actual needs
GOOGLE_DAILY_QUOTA=1500000   # 1.5M tokens/day
```

### 2. Use Task Purpose Keywords

```typescript
// Good: Clear task purpose
"Summarize this PDF in 3 sentences"          // → quick-summary → flash
"Provide detailed legal analysis"            // → detailed-analysis → pro
"CRITICAL: Review for security issues"       // → critical-task → pro

// Bad: Ambiguous
"Do something with this document"            // → standard-analysis (default)
```

### 3. Implement Fallback UI

```typescript
try {
  const response = await llmProviderManager.generateText(...);
} catch (error) {
  if (error.statusCode === 429) {
    // Show user-friendly message
    return {
      error: 'Daily quota exceeded',
      message: 'We\'ve reached our daily limit. Please try again tomorrow.',
      resetTime: error.metadata.resetTime,
      suggestion: 'Consider upgrading to a paid tier for unlimited access'
    };
  }
}
```

### 4. Monitor Quota Status

Add an admin endpoint:

```typescript
// routes/admin.ts
router.get('/quota-status', async (req, res) => {
  const status = quotaManager.getQuotaStatus();
  res.json(status);
});
```

### 5. Optimize Token Usage

- **Enable caching** (see `TOKEN-OPTIMIZATION.md`)
- **Pre-process content** to reduce input tokens
- **Use batch processing** for multiple documents
- **Prefer flash models** for simple tasks

---

## Troubleshooting

### Issue: Models Always Fallback to Flash-8B

**Cause**: Flash and Pro models exhausted, only flash-8b has quota remaining.

**Solution**:
1. Increase `GOOGLE_DAILY_QUOTA`
2. Optimize token usage (reduce input size)
3. Wait for daily reset (midnight PT)

### Issue: Pro Model Never Selected

**Cause**: System prefers cheaper models.

**Solution**:
- Use keywords: "CRITICAL", "detailed", "comprehensive"
- Explicitly request Pro features
- Disable quota management and specify model manually

### Issue: Quota Exhausted Early

**Cause**: Heavy usage or inefficient prompts.

**Solution**:
1. Check quota status: `quotaManager.getQuotaStatus()`
2. Review logs for token usage patterns
3. Implement caching (70-90% reduction)
4. Reduce max_tokens in requests
5. Use smaller models for simple tasks

### Issue: Rate Limit Errors (RPM/TPM)

**Cause**: Too many requests too quickly.

**Solution**:
- Implement request queuing
- Add delays between requests
- Use batch processing
- Upgrade to higher tier if needed

---

## API Reference

### QuotaManager

```typescript
import { quotaManager } from './services/llm';

// Check if model has quota
quotaManager.hasAvailableQuota(model: string, estimatedTokens?: number): boolean

// Select best model for task
quotaManager.selectModel(purpose: TaskPurpose, estimatedTokens?: number): string

// Record token usage
quotaManager.recordUsage(model: string, tokensUsed: number): void

// Get quota status
quotaManager.getQuotaStatus(): QuotaStatus

// Force reset (testing only)
quotaManager.forceReset(): void

// Get total usage
quotaManager.getTotalTokensUsedToday(): number

// Get recommendations
quotaManager.getRecommendedModels(purpose: TaskPurpose): string[]

// Estimate tokens
QuotaManager.estimateTokens(text: string): number
```

### TaskPurpose Type

```typescript
type TaskPurpose = 
  | 'bulk-processing'      // Large volume, simple
  | 'quick-summary'        // Fast summaries
  | 'standard-analysis'    // Normal analysis
  | 'detailed-analysis'    // Complex reasoning
  | 'vision-analysis'      // OCR/Image
  | 'critical-task';       // Must succeed
```

---

## Migration from Static Model Selection

### Before (Static)

```bash
# .env
GOOGLE_MODEL=gemini-1.5-pro
GOOGLE_MAX_TOKENS=4096
```

```typescript
// Code - always uses same model
const response = await llmProviderManager.generateText({
  messages: [...]
});
```

### After (Dynamic)

```bash
# .env
GOOGLE_QUOTA_MANAGEMENT=true
GOOGLE_DAILY_QUOTA=1000000
# Remove GOOGLE_MODEL - not needed!
```

```typescript
// Code - automatically selects best model
const response = await llmProviderManager.generateText({
  messages: [...]
});
// response.model tells you which model was used
```

**Benefits**:
- 60-90% cost reduction (uses cheaper models when appropriate)
- Automatic fallback (never fails due to single model quota)
- Better resource utilization (distributes load across models)
- Zero code changes required!

---

## Cost Savings Examples

### Scenario 1: Document Summarization Service

**Before** (static gemini-1.5-pro):
- 1,000 documents/day
- Avg 3,000 tokens/document
- Total: 3M tokens/day
- **Cost**: $9.00/day ($270/month)
- **Quota limit**: 50 RPD → **Can only process 50 documents/day!**

**After** (dynamic quota management):
- 1,000 documents/day
- 600 use flash-8b (bulk): 1.8M tokens
- 300 use flash (standard): 900K tokens
- 100 use pro (critical): 300K tokens
- Total: 3M tokens/day
- **Cost**: $0.22/day ($6.60/month)
- **Quota limit**: 1,500 RPD → **Can process all 1,000 documents!**

**Savings**: $263.40/month (97.6%)

### Scenario 2: Real-Time API

**Before**:
- Static gemini-1.5-flash
- 10,000 requests/day
- Hit quota limits regularly
- User complaints

**After**:
- Dynamic selection (flash-8b → flash → pro)
- 10,000 requests/day
- Never hits quota limits
- Distributes load optimally
- Better user experience

**Savings**: Infinite (avoids service disruption)

---

## Further Reading

- [Multi-LLM Support](./MULTI-LLM-SUPPORT.md) - Provider architecture
- [Token Optimization](../guides/TOKEN-OPTIMIZATION.md) - Reduce token usage 90%
- [Google Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits) - Official docs
- [MULTI-LLM Quickstart](./MULTI-LLM-QUICKSTART.md) - Getting started

---

## Support

For issues or questions:

1. Check logs for quota warnings
2. Review `quotaManager.getQuotaStatus()`
3. Consult troubleshooting section above
4. Open GitHub issue with logs

**Repository**: https://github.com/abezr/pdf-summarize
