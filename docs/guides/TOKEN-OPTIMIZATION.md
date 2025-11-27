# LLM Token Optimization Guide

**Focus**: Extreme care with OpenAI/Google API tokens to minimize costs  
**Philosophy**: Treat every LLM API call as expensive, optimize aggressively  
**Date**: 2025-11-27

---

## 🎯 Optimization Philosophy

### Core Principles

1. **Cache Everything**: Never make the same LLM call twice
2. **Minimize Tokens**: Send only essential content to LLM
3. **Local First**: Do as much preprocessing locally as possible
4. **Smart Models**: Use cheapest model that meets quality requirements
5. **Monitor Closely**: Track every token and dollar spent

---

## 💰 Cost Comparison

### Token Costs (per 1,000 tokens)

| Provider | Model | Input | Output | Use Case |
|----------|-------|-------|--------|----------|
| **OpenAI** | GPT-4o | $0.005 | $0.015 | Critical tasks only |
| **OpenAI** | GPT-3.5 Turbo | $0.0005 | $0.0015 | Legacy, not recommended |
| **Google** | Gemini 1.5 Pro | $0.00125 | $0.005 | **Recommended** (3.3x cheaper) |
| **Google** | Gemini 1.5 Flash | $0.000075 | $0.0003 | **Best for bulk** (55x cheaper!) |

### Real-World Example (1,000 documents, 2K tokens each)

| Model | Cost per Doc | Total Cost | Savings vs GPT-4o |
|-------|--------------|------------|-------------------|
| GPT-4o | $0.025 | **$25.00** | - |
| Gemini 1.5 Pro | $0.0075 | **$7.50** | 70% |
| Gemini 1.5 Flash | $0.00045 | **$0.45** | **98%** 🏆 |

**Key Insight**: Using Gemini 1.5 Flash saves **$24.55 per 1,000 documents!**

---

## 🛡️ Strategy 1: Aggressive Caching

### Multi-Level Cache System

```typescript
// 3-level caching: Memory → Disk → LLM API
class CacheManager {
  private memoryCache: Map<string, CachedResponse>;
  private diskCacheDir: string;
  
  constructor() {
    this.memoryCache = new Map();
    this.diskCacheDir = './data/cache/summaries';
  }
  
  // Generate cache key from content
  private getCacheKey(content: string, provider: string, model: string): string {
    return createHash('sha256')
      .update(`${provider}:${model}:${content}`)
      .digest('hex');
  }
  
  // Check memory cache
  private getFromMemory(key: string): CachedResponse | null {
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24h TTL
      return cached;
    }
    return null;
  }
  
  // Check disk cache
  private getFromDisk(key: string): CachedResponse | null {
    const cacheFile = path.join(this.diskCacheDir, `${key}.json`);
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      if (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days TTL
        return cached;
      }
    }
    return null;
  }
  
  // Get cached or generate
  async getOrGenerate(
    content: string,
    provider: string,
    model: string,
    generator: () => Promise<string>
  ): Promise<{ response: string; cached: boolean; savedCost: number }> {
    const key = this.getCacheKey(content, provider, model);
    
    // Level 1: Memory cache
    let cached = this.getFromMemory(key);
    if (cached) {
      logger.info('✅ Memory cache HIT - Saved LLM API call');
      return { response: cached.response, cached: true, savedCost: cached.cost };
    }
    
    // Level 2: Disk cache
    cached = this.getFromDisk(key);
    if (cached) {
      logger.info('✅ Disk cache HIT - Saved LLM API call');
      this.memoryCache.set(key, cached); // Promote to memory
      return { response: cached.response, cached: true, savedCost: cached.cost };
    }
    
    // Level 3: Generate with LLM API ($$$ EXPENSIVE $$$)
    logger.warn('❌ Cache MISS - Calling LLM API (costs money!)');
    const response = await generator();
    const cost = this.estimateCost(content, response, provider, model);
    
    // Cache result
    const cacheData: CachedResponse = {
      response,
      cost,
      provider,
      model,
      timestamp: Date.now(),
    };
    
    this.memoryCache.set(key, cacheData);
    fs.writeFileSync(
      path.join(this.diskCacheDir, `${key}.json`),
      JSON.stringify(cacheData)
    );
    
    return { response, cached: false, savedCost: 0 };
  }
  
  // Get cache statistics
  getStats(): CacheStats {
    const memorySize = this.memoryCache.size;
    const diskFiles = fs.readdirSync(this.diskCacheDir).length;
    
    return {
      memorySize,
      diskSize: diskFiles,
      hitRate: this.calculateHitRate(),
      savedCost: this.calculateSavedCost(),
    };
  }
}
```

**Expected Savings**: 60-80% of LLM calls eliminated for repeated content

---

## 📏 Strategy 2: Content Reduction

### Minimize Tokens Sent to LLM

```typescript
// Aggressively reduce content before sending to LLM
class ContentOptimizer {
  // Remove unnecessary content
  removeBoilerplate(text: string): string {
    return text
      // Remove page numbers
      .replace(/Page \d+ of \d+/gi, '')
      // Remove headers/footers (common patterns)
      .replace(/^(Header|Footer):.*$/gim, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Extract key sentences using TF-IDF (local, no LLM)
  extractKeySentences(text: string, topPercent: number = 0.3): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Calculate importance scores (TF-IDF)
    const scores = sentences.map(s => this.calculateImportance(s, text));
    
    // Get threshold for top X%
    const sortedScores = [...scores].sort((a, b) => b - a);
    const threshold = sortedScores[Math.floor(sortedScores.length * topPercent)];
    
    // Filter and reassemble
    const keySentences = sentences.filter((_, i) => scores[i] >= threshold);
    
    return keySentences.join('. ') + '.';
  }
  
  // Deduplicate similar paragraphs
  removeDuplicates(text: string): string {
    const paragraphs = text.split(/\n\n+/);
    const unique: string[] = [];
    const seen = new Set<string>();
    
    for (const para of paragraphs) {
      const normalized = para.toLowerCase().replace(/\s+/g, ' ').trim();
      const fingerprint = createHash('md5').update(normalized).digest('hex');
      
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint);
        unique.push(para);
      }
    }
    
    return unique.join('\n\n');
  }
  
  // Complete optimization pipeline
  optimize(text: string, maxTokens: number = 1500): string {
    // Step 1: Remove boilerplate
    text = this.removeBoilerplate(text);
    
    // Step 2: Remove duplicates
    text = this.removeDuplicates(text);
    
    // Step 3: Extract key sentences if still too long
    const currentTokens = this.estimateTokens(text);
    if (currentTokens > maxTokens) {
      const ratio = maxTokens / currentTokens;
      text = this.extractKeySentences(text, ratio);
    }
    
    return text;
  }
  
  // Estimate tokens (rough approximation)
  private estimateTokens(text: string): number {
    // ~4 characters per token (English)
    return Math.ceil(text.length / 4);
  }
}
```

**Expected Savings**: 50-70% token reduction before LLM call

---

## 🧠 Strategy 3: Smart Model Selection

### Use Cheapest Model That Meets Requirements

```typescript
// Intelligent model selection based on task
class ModelSelector {
  selectModel(task: TaskContext): { provider: string; model: string } {
    // Critical: High stakes, need best quality
    if (task.isCritical || task.documentType === 'legal' || task.documentType === 'financial') {
      logger.info('Using GPT-4o (critical task)');
      return { provider: 'openai', model: 'gpt-4o' };
    }
    
    // Long documents: Use Gemini 1.5 Pro (better context)
    if (task.documentLength > 10000) {
      logger.info('Using Gemini 1.5 Pro (long document)');
      return { provider: 'google', model: 'gemini-1.5-pro' };
    }
    
    // Bulk processing: Use Gemini 1.5 Flash (cheapest)
    if (task.isBulk || task.priority === 'low') {
      logger.info('Using Gemini 1.5 Flash (bulk processing)');
      return { provider: 'google', model: 'gemini-1.5-flash' };
    }
    
    // Default: Gemini 1.5 Pro (good balance)
    logger.info('Using Gemini 1.5 Pro (default)');
    return { provider: 'google', model: 'gemini-1.5-pro' };
  }
  
  // Estimate cost before making call
  estimateCost(task: TaskContext): number {
    const { provider, model } = this.selectModel(task);
    const tokens = this.estimateTokens(task);
    
    const pricing = this.getPricing(provider, model);
    return (tokens.input / 1000) * pricing.input + 
           (tokens.output / 1000) * pricing.output;
  }
}
```

**Expected Savings**: 50-90% by using cheaper models strategically

---

## 🔁 Strategy 4: Batch Processing

### Process Multiple Documents Efficiently

```typescript
// Batch similar documents together
class BatchProcessor {
  async processBatch(documents: Document[]): Promise<Summary[]> {
    // Group similar documents
    const groups = this.groupSimilarDocuments(documents);
    
    const summaries: Summary[] = [];
    
    for (const group of groups) {
      // Extract common context once
      const commonContext = this.extractCommonContext(group);
      
      // Process each document with shared context
      for (const doc of group) {
        const optimizedContent = this.prepareContent(doc, commonContext);
        
        const summary = await this.generateSummary(optimizedContent);
        summaries.push(summary);
      }
    }
    
    return summaries;
  }
  
  // Group documents by similarity to reuse context
  private groupSimilarDocuments(documents: Document[]): Document[][] {
    // Use local embeddings to cluster
    const embeddings = documents.map(d => this.getEmbedding(d));
    return this.cluster(embeddings, documents);
  }
}
```

**Expected Savings**: 20-30% by reusing context across similar documents

---

## 📊 Strategy 5: Token Usage Monitoring

### Track Every Single Token

```typescript
// Real-time token usage tracker
class TokenUsageTracker {
  private dailyUsage: Map<string, UsageRecord>;
  private alerts: Alert[];
  
  // Record every LLM call
  async recordUsage(
    provider: string,
    model: string,
    operation: string,
    tokens: { input: number; output: number },
    cost: number
  ) {
    const date = new Date().toISOString().split('T')[0];
    const key = `${date}:${provider}:${model}`;
    
    if (!this.dailyUsage.has(key)) {
      this.dailyUsage.set(key, {
        provider,
        model,
        date,
        calls: 0,
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        cost: 0,
      });
    }
    
    const record = this.dailyUsage.get(key)!;
    record.calls++;
    record.tokensInput += tokens.input;
    record.tokensOutput += tokens.output;
    record.tokensTotal += tokens.input + tokens.output;
    record.cost += cost;
    
    // Save to database
    await this.saveToDatabase(record);
    
    // Check budget limits
    await this.checkBudgetLimits(date);
  }
  
  // Alert if budget exceeded
  private async checkBudgetLimits(date: string) {
    const dailyBudget = parseFloat(process.env.DAILY_BUDGET_USD || '1.0');
    const dailyCost = this.getDailyCost(date);
    
    if (dailyCost > dailyBudget) {
      const alert: Alert = {
        type: 'BUDGET_EXCEEDED',
        message: `Daily budget exceeded: $${dailyCost.toFixed(2)} > $${dailyBudget}`,
        severity: 'HIGH',
        timestamp: Date.now(),
      };
      
      this.alerts.push(alert);
      logger.error(`🚨 ${alert.message}`);
      
      // Optionally: Disable LLM calls until tomorrow
      if (process.env.STRICT_BUDGET === 'true') {
        throw new Error('Daily LLM budget exceeded. API calls disabled.');
      }
    }
  }
  
  // Generate usage report
  generateReport(): string {
    const today = new Date().toISOString().split('T')[0];
    const dailyCost = this.getDailyCost(today);
    const dailyTokens = this.getDailyTokens(today);
    const dailyCalls = this.getDailyCalls(today);
    
    // Cache statistics
    const cacheStats = cacheManager.getStats();
    
    return `
═══════════════════════════════════════════════════════
📊 LLM USAGE REPORT - ${today}
═══════════════════════════════════════════════════════

💰 COSTS
   Daily Cost:        $${dailyCost.toFixed(4)}
   Daily Budget:      $${process.env.DAILY_BUDGET_USD || '1.00'}
   Remaining:         $${(parseFloat(process.env.DAILY_BUDGET_USD || '1.0') - dailyCost).toFixed(4)}
   
📈 USAGE
   API Calls:         ${dailyCalls}
   Input Tokens:      ${dailyTokens.input.toLocaleString()}
   Output Tokens:     ${dailyTokens.output.toLocaleString()}
   Total Tokens:      ${dailyTokens.total.toLocaleString()}

💾 CACHE EFFICIENCY
   Hit Rate:          ${cacheStats.hitRate.toFixed(1)}%
   Saved Calls:       ${cacheStats.savedCalls}
   Saved Cost:        $${cacheStats.savedCost.toFixed(4)}

📊 BY PROVIDER
${this.getProviderBreakdown(today)}

⚠️  ALERTS
${this.alerts.length > 0 ? this.alerts.map(a => `   • ${a.message}`).join('\n') : '   None'}

═══════════════════════════════════════════════════════
    `.trim();
  }
}
```

---

## 🎯 Strategy 6: Pre-Processing Pipeline

### Do Maximum Work Locally BEFORE LLM Call

```typescript
// Local preprocessing to reduce LLM work
class PreProcessor {
  async preprocess(document: Document): Promise<OptimizedDocument> {
    // Step 1: Extract text (local, free)
    const text = await pdfParse(document.buffer);
    
    // Step 2: Remove boilerplate (local, free)
    const cleaned = this.removeBoilerplate(text);
    
    // Step 3: Extract structure (local, free)
    const structure = this.extractStructure(cleaned);
    
    // Step 4: Build knowledge graph (local, free)
    const graph = this.buildGraph(structure);
    
    // Step 5: Generate local embeddings (local, free)
    const embeddings = await localEmbeddings.embedBatch(
      graph.nodes.map(n => n.content)
    );
    
    // Step 6: Cluster nodes (local, free)
    const clusters = this.clusterNodes(graph.nodes, embeddings);
    
    // Step 7: Extract key information (local, free)
    const keyInfo = this.extractKeyInfo(clusters);
    
    // Step 8: Prepare minimal context for LLM (local, free)
    const minimalContext = this.prepareMinimalContext(keyInfo);
    
    // Result: Only 10-30% of original content sent to LLM!
    return {
      originalSize: text.length,
      optimizedSize: minimalContext.length,
      reductionPercent: ((1 - minimalContext.length / text.length) * 100).toFixed(1),
      context: minimalContext,
      metadata: {
        structure,
        clusters,
        keyInfo,
      },
    };
  }
}
```

**Expected Savings**: 70-90% token reduction through local preprocessing

---

## 💡 Strategy 7: Prompt Optimization

### Use Shorter, More Effective Prompts

```typescript
// Bad: Verbose prompt (wastes tokens)
const badPrompt = `
I would like you to please carefully read through the following document 
and provide a comprehensive summary. Please make sure to include all the 
important details and key points. The summary should be clear and concise 
but also thorough. Please organize the information in a logical way and 
make sure everything is easy to understand. Thank you!

Document: ${longDocumentText}
`;

// Good: Concise prompt (saves tokens)
const goodPrompt = `
Summarize the key points from this document. Be precise and factual.

Document: ${optimizedDocumentText}
`;

// Better: Structured prompt with minimal instructions
const betterPrompt = `
Task: Extract key facts
Format: Bullet points
Max length: 200 words

${optimizedDocumentText}
`;
```

**Expected Savings**: 30-50 tokens per request from prompt optimization

---

## 📅 Daily Budget Management

### Strict Budget Enforcement

```typescript
// Enforce daily budget limits
class BudgetManager {
  async checkAndEnforce(estimatedCost: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const dailyBudget = parseFloat(process.env.DAILY_BUDGET_USD || '1.0');
    const currentSpend = tokenTracker.getDailyCost(today);
    
    if (currentSpend + estimatedCost > dailyBudget) {
      logger.error(`🚫 Budget limit reached: $${currentSpend.toFixed(4)} / $${dailyBudget}`);
      logger.error(`   Cannot make call (estimated: $${estimatedCost.toFixed(4)})`);
      
      if (process.env.STRICT_BUDGET === 'true') {
        throw new Error('Daily LLM budget exceeded. API calls disabled until tomorrow.');
      }
      
      return false;
    }
    
    return true;
  }
}
```

---

## 📊 Expected Total Savings

### Combining All Strategies

| Strategy | Token Savings | Cost Savings |
|----------|---------------|--------------|
| **Aggressive Caching** | 60-80% | 60-80% |
| **Content Reduction** | 50-70% | 50-70% |
| **Smart Model Selection** | 0% tokens, 90% cost | 50-90% |
| **Batch Processing** | 20-30% | 20-30% |
| **Pre-Processing** | 70-90% | 70-90% |
| **Prompt Optimization** | 5-10% | 5-10% |
| **COMBINED EFFECT** | **80-95%** | **90-98%** |

**Real-World Example**:
- Original cost: $25/day (1,000 docs with GPT-4o)
- With optimization: $0.50-2.50/day
- **Savings: $22.50-24.50/day (90-98%)** 🎉

---

## 🚀 Implementation Checklist

### Token Optimization To-Do List

- [ ] Implement 3-level caching (memory, disk, LLM)
- [ ] Add content reduction pipeline
- [ ] Implement smart model selection
- [ ] Add token usage tracking
- [ ] Create budget enforcement
- [ ] Build monitoring dashboard
- [ ] Add cache hit rate metrics
- [ ] Implement pre-processing pipeline
- [ ] Optimize prompts
- [ ] Add daily cost alerts
- [ ] Create usage reports
- [ ] Test batch processing
- [ ] Validate savings

---

## 📝 Configuration for Maximum Savings

```env
# Token Optimization Configuration
LLM_PROVIDER=google  # Use Google by default (cheaper)
LLM_MODEL=gemini-1.5-flash  # Cheapest model
LLM_MAX_TOKENS=1500  # Limit output tokens
DAILY_BUDGET_USD=1.00  # Strict daily limit
STRICT_BUDGET=true  # Stop calls if exceeded

# Caching
LLM_CACHE_ENABLED=true
CACHE_TTL=604800  # 7 days
CACHE_MEMORY_SIZE=1000
CACHE_DISK_ENABLED=true

# Content Optimization
CONTENT_REDUCTION_ENABLED=true
MAX_CONTENT_TOKENS=1000  # Aggressive reduction
REMOVE_BOILERPLATE=true
DEDUPLICATE_CONTENT=true

# Monitoring
TRACK_ALL_USAGE=true
ALERT_ON_BUDGET_50=true  # Alert at 50% budget
ALERT_ON_BUDGET_80=true  # Alert at 80% budget
ALERT_ON_BUDGET_100=true  # Alert at 100% budget
```

---

## 🎯 Success Metrics

Track these metrics to measure optimization success:

1. **Cache Hit Rate**: Target 60-80%
2. **Average Tokens per Request**: Target <1,500 tokens
3. **Daily Cost**: Target <$2/day
4. **Cost per Document**: Target <$0.002
5. **Token Reduction**: Target 80-90% vs. unoptimized

---

## 🏆 Best Practices Summary

1. ✅ **Always cache** - Never repeat the same LLM call
2. ✅ **Reduce content** - Send only essential information
3. ✅ **Use cheap models** - Gemini 1.5 Flash for most tasks
4. ✅ **Preprocess locally** - Do maximum work without LLM
5. ✅ **Monitor closely** - Track every token and dollar
6. ✅ **Set budgets** - Enforce daily spending limits
7. ✅ **Optimize prompts** - Shorter prompts = lower costs
8. ✅ **Batch when possible** - Reuse context across documents

---

**Result**: 90-98% cost reduction while maintaining quality! 🎉

**Repository**: https://github.com/abezr/pdf-summarize  
**Status**: Token Optimization Guide Complete ✅
