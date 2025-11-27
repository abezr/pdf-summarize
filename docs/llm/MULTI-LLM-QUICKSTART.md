# Multi-LLM Quick Start Guide

**🚀 Get started with Multi-LLM support in 5 minutes!**

This guide shows you how to use the Multi-LLM provider system to work with either OpenAI (GPT-4o) or Google AI (Gemini 1.5) with automatic provider selection.

---

## 🎯 What's Implemented

✅ **Complete working code** in `src/services/llm/`:
- `ILLMProvider.ts` - Unified interface for all LLM providers
- `OpenAIProvider.ts` - OpenAI implementation (GPT-4o, GPT-4, GPT-3.5)
- `GoogleProvider.ts` - Google AI implementation (Gemini 1.5 Pro, Gemini 1.5 Flash)
- `LLMProviderManager.ts` - Auto-detection, selection, and fallback logic
- `index.ts` - Exports for easy importing

✅ **Cost Optimization**:
- Gemini 1.5 Flash: **55x cheaper** than GPT-4o ($0.000225 vs $0.0125 per 1K tokens)
- Gemini 1.5 Pro: **3.3x cheaper** than GPT-4o ($0.00375 vs $0.0125)
- Gemini 1.5 Pro Vision: **2x cheaper** than GPT-4o Vision

---

## 📦 Installation

### 1. Install Dependencies

```bash
npm install openai @google/generative-ai
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "openai": "^4.24.1",
    "@google/generative-ai": "^0.1.3"
  }
}
```

### 2. Configure Environment

Copy `.env.example` and configure your API keys:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
# LLM Provider Configuration
LLM_PROVIDER=auto  # Options: auto, openai, google
LLM_ENABLE_FALLBACK=true

# OpenAI Configuration (optional if using Google only)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o

# Google AI Configuration (optional if using OpenAI only)
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_MODEL=gemini-1.5-pro
```

---

## 🚀 Usage Examples

### Example 1: Auto-Select Provider (Recommended)

The system automatically selects the first available provider based on configured API keys.

```typescript
import { llmProviderManager } from './src/services/llm';

async function generateSummary() {
  // Auto-select: Will use OpenAI if available, else Google
  const response = await llmProviderManager.generateText({
    messages: [
      {
        role: 'system',
        content: 'You are an expert document summarizer.'
      },
      {
        role: 'user',
        content: 'Summarize the following document: ...'
      }
    ],
    maxTokens: 2000,
    temperature: 0.3,
  });

  console.log(`Provider: ${response.provider}`);  // 'openai' or 'google'
  console.log(`Model: ${response.model}`);        // 'gpt-4o' or 'gemini-1.5-pro'
  console.log(`Cost: $${response.cost.toFixed(4)}`);
  console.log(`Tokens: ${response.tokensUsed.total}`);
  console.log(`Summary: ${response.content}`);
}

generateSummary();
```

**Output:**
```
Provider: google
Model: gemini-1.5-pro
Cost: $0.0037
Tokens: 1234
Summary: This document discusses...
```

---

### Example 2: Force Specific Provider

```typescript
import { llmProviderManager } from './src/services/llm';

// Force Google AI (Gemini) - cost-optimized
const googleResponse = await llmProviderManager.generateText({
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ],
}, 'google');  // Explicitly use Google

console.log(`Provider: ${googleResponse.provider}`);  // 'google'
console.log(`Model: ${googleResponse.model}`);        // 'gemini-1.5-pro'

// Force OpenAI (GPT-4o) - high quality
const openaiResponse = await llmProviderManager.generateText({
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ],
}, 'openai');  // Explicitly use OpenAI

console.log(`Provider: ${openaiResponse.provider}`);  // 'openai'
console.log(`Model: ${openaiResponse.model}`);        // 'gpt-4o'
```

---

### Example 3: Vision/Image Analysis (OCR)

Both OpenAI GPT-4o Vision and Google Gemini 1.5 Pro Vision are supported.

```typescript
import { llmProviderManager } from './src/services/llm';
import fs from 'fs';

async function analyzeDocumentImage() {
  // Read image file
  const imageBuffer = fs.readFileSync('./document-page.png');
  const base64Image = imageBuffer.toString('base64');

  // Auto-select available vision provider
  const result = await llmProviderManager.analyzeImage({
    imageBase64: base64Image,
    prompt: `Extract all text from this document page. Include:
- All readable text (preserve formatting)
- Table contents (describe structure)
- Image descriptions (if any)`,
    maxTokens: 4096,
  });

  console.log(`Provider: ${result.provider}`);  // 'openai' or 'google'
  console.log(`Model: ${result.model}`);        // 'gpt-4o' or 'gemini-1.5-pro'
  console.log(`Cost: $${result.cost.toFixed(4)}`);
  console.log(`OCR Text:\n${result.content}`);
}

analyzeDocumentImage();
```

---

### Example 4: Health Check

Check which providers are available and healthy:

```typescript
import { llmProviderManager } from './src/services/llm';

async function checkProviders() {
  // Get provider info
  const info = llmProviderManager.getProviderInfo();
  console.log('Provider Info:', JSON.stringify(info, null, 2));
  
  // Run health checks
  const health = await llmProviderManager.healthCheck();
  console.log('Health Status:', health);
  
  // Get configuration
  const config = llmProviderManager.getConfig();
  console.log('Config:', config);
}

checkProviders();
```

**Output:**
```
Provider Info: {
  "openai": {
    "available": true,
    "supportedModels": ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
  },
  "google": {
    "available": true,
    "supportedModels": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"]
  }
}

Health Status: { openai: true, google: true }

Config: {
  preferredProvider: 'auto',
  enableFallback: true,
  availableProviders: ['openai', 'google'],
  totalProviders: 2
}
```

---

### Example 5: Cost Tracking

Track costs per provider for budget management:

```typescript
import { llmProviderManager } from './src/services/llm';

async function compareCosts() {
  const prompt = {
    messages: [
      { role: 'user', content: 'Summarize this 1000-word article: ...' }
    ],
    maxTokens: 500,
  };

  // Compare costs between providers
  const openaiResult = await llmProviderManager.generateText(prompt, 'openai');
  const googleResult = await llmProviderManager.generateText(prompt, 'google');

  console.log(`OpenAI GPT-4o: $${openaiResult.cost.toFixed(4)}`);
  console.log(`Google Gemini 1.5 Pro: $${googleResult.cost.toFixed(4)}`);
  
  const savings = ((openaiResult.cost - googleResult.cost) / openaiResult.cost) * 100;
  console.log(`Savings with Google: ${savings.toFixed(1)}%`);
}

compareCosts();
```

**Output:**
```
OpenAI GPT-4o: $0.0125
Google Gemini 1.5 Pro: $0.0037
Savings with Google: 70.4%
```

---

## ⚙️ Configuration Options

### Scenario 1: OpenAI Only

```env
OPENAI_API_KEY=sk-your-key
LLM_PROVIDER=openai
```

System will only use OpenAI. If key is invalid, requests will fail.

---

### Scenario 2: Google Only

```env
GOOGLE_API_KEY=your-key
LLM_PROVIDER=google
```

System will only use Google AI. If key is invalid, requests will fail.

---

### Scenario 3: Auto-Select (Recommended)

```env
OPENAI_API_KEY=sk-your-key
GOOGLE_API_KEY=your-key
LLM_PROVIDER=auto
LLM_ENABLE_FALLBACK=true
```

System will:
1. Prefer OpenAI if available
2. Fall back to Google if OpenAI unavailable
3. Automatically retry with alternative provider on error

---

### Scenario 4: Google Primary with OpenAI Fallback

```env
GOOGLE_API_KEY=your-key
OPENAI_API_KEY=sk-your-key
LLM_PROVIDER=google
LLM_ENABLE_FALLBACK=true
```

System will:
1. Try Google first (cost-optimized)
2. Fall back to OpenAI if Google fails
3. Provide reliability with cost savings

---

## 🔧 Integration with Existing Code

### Update Your Summary Service

```typescript
// OLD: Direct OpenAI usage
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSummary(content: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content }],
  });
  return response.choices[0].message.content;
}

// NEW: Multi-LLM support
import { llmProviderManager } from './services/llm';

export async function generateSummary(content: string) {
  const response = await llmProviderManager.generateText({
    messages: [{ role: 'user', content }],
  });
  return response.content;  // Same output, but cost-optimized!
}
```

### Update Your OCR Service

```typescript
// OLD: Direct GPT-4o Vision
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function runOCR(imageBase64: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Extract text' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
      ]
    }],
  });
  return response.choices[0].message.content;
}

// NEW: Multi-LLM Vision support
import { llmProviderManager } from './services/llm';

export async function runOCR(imageBase64: string) {
  const response = await llmProviderManager.analyzeImage({
    imageBase64,
    prompt: 'Extract all text from this image',
  });
  return response.content;  // Same output, 2x cheaper with Gemini!
}
```

---

## 🐛 Error Handling

The system provides clear error messages:

```typescript
import { llmProviderManager } from './src/services/llm';

try {
  const response = await llmProviderManager.generateText({
    messages: [{ role: 'user', content: 'Hello' }],
  });
  console.log(response.content);
} catch (error: any) {
  if (error.statusCode === 503) {
    console.error('❌ No LLM providers available. Configure OPENAI_API_KEY or GOOGLE_API_KEY.');
  } else if (error.statusCode === 429) {
    console.error('⏱️ Rate limit exceeded. Try again later or use fallback provider.');
  } else if (error.statusCode === 401) {
    console.error('🔑 Invalid API key. Check your OPENAI_API_KEY or GOOGLE_API_KEY.');
  } else {
    console.error(`❌ LLM request failed: ${error.message}`);
  }
}
```

---

## 💰 Cost Optimization Best Practices

### 1. Use Gemini for Bulk Operations

```typescript
// Cost-sensitive bulk summarization
const results = await Promise.all(
  documents.map(doc => 
    llmProviderManager.generateText({
      messages: [{ role: 'user', content: doc.content }],
    }, 'google')  // Force Gemini: 55x cheaper!
  )
);
```

### 2. Use GPT-4o for Critical Tasks

```typescript
// High-quality summary for important documents
const criticalSummary = await llmProviderManager.generateText({
  messages: [{ role: 'user', content: importantDoc }],
}, 'openai');  // Force GPT-4o for best quality
```

### 3. Let Auto-Select Handle It

```typescript
// Let the system decide (smart default)
const summary = await llmProviderManager.generateText({
  messages: [{ role: 'user', content: doc }],
});  // No provider specified = auto-select
```

---

## 📊 Real-World Cost Savings

### Before Multi-LLM (OpenAI GPT-4o only):
- 1,000 documents × 1,500 tokens/doc = 1.5M tokens
- Cost: $0.0125 per 1K tokens = **$18.75**

### After Multi-LLM (Google Gemini 1.5 Flash):
- 1,000 documents × 1,500 tokens/doc = 1.5M tokens
- Cost: $0.000225 per 1K tokens = **$0.34**

**Savings: $18.41 (98% cost reduction!) 🎉**

---

## 🎯 Next Steps

1. ✅ Configure your API keys in `.env`
2. ✅ Run `npm install` to get dependencies
3. ✅ Import `llmProviderManager` in your code
4. ✅ Replace direct OpenAI calls with `llmProviderManager.generateText()`
5. ✅ Monitor costs via `response.cost` tracking
6. ✅ Use `'google'` provider for cost-sensitive operations

---

## 📚 Additional Resources

- **Full Documentation**: [`MULTI-LLM-SUPPORT.md`](./MULTI-LLM-SUPPORT.md)
- **Detailed Code Walkthrough**: [`src/services/llm/README.md`](./src/services/llm/README.md)
- **API Reference**: See interface definitions in `ILLMProvider.ts`
- **Cost Comparison**: See pricing tables in documentation

---

## 🙋 FAQ

### Q: Do I need both API keys?

**A:** No! You can use either:
- OpenAI only (set `OPENAI_API_KEY`)
- Google only (set `GOOGLE_API_KEY`)
- Both (for maximum flexibility)

### Q: Which provider is better?

**A:** It depends:
- **OpenAI GPT-4o**: Higher quality, better reasoning, vision support
- **Google Gemini 1.5 Pro**: Great quality, 3.3x cheaper, vision support
- **Google Gemini 1.5 Flash**: Good quality, 55x cheaper, best for bulk operations

### Q: What happens if my primary provider fails?

**A:** If `LLM_ENABLE_FALLBACK=true`, the system automatically retries with an alternative provider.

### Q: Can I add more providers (Claude, Llama)?

**A:** Yes! Follow the guide in `src/services/llm/README.md` to add new providers.

---

## ✅ Ready to Use!

The Multi-LLM system is production-ready and fully tested. Start saving costs today! 🚀

**Repository**: https://github.com/abezr/pdf-summarize  
**Documentation**: [`MULTI-LLM-SUPPORT.md`](./MULTI-LLM-SUPPORT.md)  
**Code**: [`src/services/llm/`](./src/services/llm/)
