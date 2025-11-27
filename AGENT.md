# AGENT.md - AI/LLM Agent Reference Guide

**🤖 This document is designed for AI/LLM agents (like Claude, GPT-4, Gemini) that are maintaining, implementing, or extending this codebase.**

---

## 🎯 Purpose

This guide provides a structured reference to all documentation that an AI agent needs to understand, maintain, and extend the PDF Summary AI project, with special focus on LLM integration and Multi-LLM support.

---

## 📚 Documentation Structure

```
docs/
├── architecture/          # System architecture and design
│   ├── ARCHITECTURE-DIAGRAMS.md
│   ├── C4-ARCHITECTURE.md
│   └── EVALUATION-PROOF.md
├── implementation/        # Implementation guides and code
│   ├── IMPLEMENTATION-GUIDE.md
│   ├── IMPLEMENTATION-ROADMAP.md
│   ├── TASK-SPECIFICATIONS.md
│   ├── EXAMPLE-CODE.md
│   └── GROK-IMPLEMENTATION-PROMPT.md
├── guides/               # User and developer guides
│   ├── QUICK-REFERENCE.md
│   ├── NAVIGATION-GUIDE.md
│   ├── GIT-INSTRUCTIONS.md
│   └── COMPLETE-DELIVERABLES.md
├── llm/                  # LLM provider implementation
│   ├── MULTI-LLM-SUPPORT.md
│   ├── MULTI-LLM-QUICKSTART.md
│   └── MULTI-LLM-IMPLEMENTATION-SUMMARY.md
└── specifications/       # Feature specifications
    ├── PROJECT-SUMMARY.md
    ├── OCR-ENHANCEMENT.md
    └── OCR-FREE-TIER-STRATEGY.md

src/
└── services/
    └── llm/              # LLM provider implementation code
        ├── ILLMProvider.ts
        ├── OpenAIProvider.ts
        ├── GoogleProvider.ts
        ├── LLMProviderManager.ts
        ├── index.ts
        └── README.md
```

---

## 🚀 Quick Start for AI Agents

### **When you first encounter this project:**

1. **Read First:** [`README.md`](./README.md) - Project overview and navigation
2. **Understand Architecture:** [`docs/architecture/C4-ARCHITECTURE.md`](./docs/architecture/C4-ARCHITECTURE.md) - Complete system design
3. **Implementation Context:** [`docs/specifications/PROJECT-SUMMARY.md`](./docs/specifications/PROJECT-SUMMARY.md) - Executive summary
4. **Quick Reference:** [`docs/guides/QUICK-REFERENCE.md`](./docs/guides/QUICK-REFERENCE.md) - Key concepts and patterns

---

## 🤖 Task-Specific Documentation

### **Task 1: Understanding the Multi-LLM System**

**Priority: HIGH** 🔴

Read these documents in order:

1. **[`docs/llm/MULTI-LLM-QUICKSTART.md`](./docs/llm/MULTI-LLM-QUICKSTART.md)** ⭐ **START HERE**
   - 5-minute quick start guide
   - Usage examples for OpenAI and Google providers
   - Configuration scenarios
   - Cost optimization strategies
   - **When to use:** First time working with Multi-LLM

2. **[`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md)** 📖 **DEEP DIVE**
   - Complete architecture specification
   - Provider abstraction layer design
   - Full code implementations (590+ lines)
   - Cost comparisons and pricing
   - API integration details
   - **When to use:** Implementing new features or debugging

3. **[`docs/llm/MULTI-LLM-IMPLEMENTATION-SUMMARY.md`](./docs/llm/MULTI-LLM-IMPLEMENTATION-SUMMARY.md)** ✅ **VERIFICATION**
   - Implementation status and verification
   - Deliverables checklist
   - Statistics and metrics
   - Requirement verification
   - **When to use:** Verifying implementation completeness

4. **[`src/services/llm/README.md`](./src/services/llm/README.md)** 💻 **CODE REFERENCE**
   - Developer documentation
   - Usage patterns
   - Adding new providers
   - Error handling
   - Testing strategies
   - **When to use:** Writing or modifying LLM provider code

---

### **Task 2: Implementing LLM Features**

**Priority: HIGH** 🔴

**Step-by-Step Process:**

1. **Understand the Interface:**
   - Read: [`src/services/llm/ILLMProvider.ts`](./src/services/llm/ILLMProvider.ts)
   - Key interfaces: `ILLMProvider`, `LLMRequest`, `LLMResponse`, `VisionRequest`

2. **Study Existing Implementations:**
   - OpenAI: [`src/services/llm/OpenAIProvider.ts`](./src/services/llm/OpenAIProvider.ts)
   - Google: [`src/services/llm/GoogleProvider.ts`](./src/services/llm/GoogleProvider.ts)
   - Learn patterns for:
     - Error handling
     - Cost calculation
     - Token counting
     - Vision support

3. **Understand the Manager:**
   - Read: [`src/services/llm/LLMProviderManager.ts`](./src/services/llm/LLMProviderManager.ts)
   - Key features:
     - Auto-detection logic
     - Provider selection
     - Fallback mechanism
     - Health checks

4. **Use Example Code:**
   - Reference: [`docs/implementation/EXAMPLE-CODE.md`](./docs/implementation/EXAMPLE-CODE.md)
   - Contains production-ready code samples

---

### **Task 3: Adding a New LLM Provider**

**Priority: MEDIUM** 🟡

**Required Reading:**

1. **Provider Interface:** [`src/services/llm/ILLMProvider.ts`](./src/services/llm/ILLMProvider.ts)
2. **Implementation Guide:** [`src/services/llm/README.md`](./src/services/llm/README.md) - Section "Adding a New Provider"
3. **Architecture:** [`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md) - Section "Implementation"

**Steps to Add a New Provider (e.g., Anthropic Claude):**

```typescript
// 1. Create provider class
// src/services/llm/ClaudeProvider.ts
import { ILLMProvider, LLMRequest, LLMResponse } from './ILLMProvider';

export class ClaudeProvider implements ILLMProvider {
  public readonly name = 'claude';
  public readonly supportedModels = ['claude-3-opus', 'claude-3-sonnet'];
  
  // Implement required methods:
  // - generateText()
  // - analyzeImage()
  // - healthCheck()
}

// 2. Register in manager
// src/services/llm/LLMProviderManager.ts
import { ClaudeProvider } from './ClaudeProvider';

constructor() {
  this.registerProvider(new OpenAIProvider());
  this.registerProvider(new GoogleProvider());
  this.registerProvider(new ClaudeProvider()); // Add here
}

// 3. Update type
export type LLMProviderType = 'openai' | 'google' | 'claude' | 'auto';

// 4. Update exports
// src/services/llm/index.ts
export { ClaudeProvider } from './ClaudeProvider';
```

**Testing:**
- Add environment variable: `CLAUDE_API_KEY`
- Test auto-detection
- Test fallback logic
- Verify cost tracking

---

### **Task 4: Understanding the Architecture**

**Priority: HIGH** 🔴

**For System Architecture Understanding:**

1. **Visual Overview:** [`docs/architecture/ARCHITECTURE-DIAGRAMS.md`](./docs/architecture/ARCHITECTURE-DIAGRAMS.md)
   - 11 Mermaid diagrams
   - System context, containers, components
   - Processing pipeline flow
   - Knowledge graph structure

2. **Complete Architecture:** [`docs/architecture/C4-ARCHITECTURE.md`](./docs/architecture/C4-ARCHITECTURE.md)
   - C4 Level 1: System Context
   - C4 Level 2: Container Architecture
   - C4 Level 3: Component Architecture
   - C4 Level 4: Code Structure (TypeScript interfaces)
   - Knowledge Graph Design
   - Observability Architecture

3. **Evaluation System:** [`docs/architecture/EVALUATION-PROOF.md`](./docs/architecture/EVALUATION-PROOF.md)
   - Automatic quality validation
   - RAGAS metrics
   - Custom metrics
   - Quality scoring

---

### **Task 5: Implementing New Features**

**Priority: MEDIUM** 🟡

**Step-by-Step Process:**

1. **Review Roadmap:** [`docs/implementation/IMPLEMENTATION-ROADMAP.md`](./docs/implementation/IMPLEMENTATION-ROADMAP.md)
   - 95 granular tasks across 3 phases
   - Task dependencies
   - Milestones

2. **Detailed Task Specs:** [`docs/implementation/TASK-SPECIFICATIONS.md`](./docs/implementation/TASK-SPECIFICATIONS.md)
   - Each task has:
     - Acceptance criteria
     - Implementation steps
     - Validation steps
     - Regression tests

3. **Implementation Guide:** [`docs/implementation/IMPLEMENTATION-GUIDE.md`](./docs/implementation/IMPLEMENTATION-GUIDE.md)
   - Phase 1: Core features (2-3 hours)
   - Phase 2: Advanced features
   - Step-by-step instructions

4. **Code Examples:** [`docs/implementation/EXAMPLE-CODE.md`](./docs/implementation/EXAMPLE-CODE.md)
   - Production-ready TypeScript code
   - 60KB+ of examples
   - Foundation, Core, and Advanced features

---

### **Task 6: Understanding OCR Integration**

**Priority: MEDIUM** 🟡

**OCR-Related Documentation:**

1. **OCR Enhancement:** [`docs/specifications/OCR-ENHANCEMENT.md`](./docs/specifications/OCR-ENHANCEMENT.md)
   - Hybrid OCR pipeline (Tesseract + Google Vision)
   - Automatic PDF type detection
   - Confidence scoring
   - Architecture changes

2. **Cost-Optimized OCR:** [`docs/specifications/OCR-FREE-TIER-STRATEGY.md`](./docs/specifications/OCR-FREE-TIER-STRATEGY.md)
   - Free-tier first strategy
   - 4-tier approach (pdf-parse → Tesseract → Reject → Vision API)
   - 98% cost reduction
   - Decision logic

**Key Integration Points:**
- Multi-LLM vision support: [`src/services/llm/`](./src/services/llm/)
- Vision API usage: Both OpenAI GPT-4o Vision and Google Gemini 1.5 Pro Vision

---

### **Task 7: Debugging and Troubleshooting**

**Priority: MEDIUM** 🟡

**Debugging Resources:**

1. **Quick Reference:** [`docs/guides/QUICK-REFERENCE.md`](./docs/guides/QUICK-REFERENCE.md)
   - Section: "Troubleshooting Guide"
   - Common issues and solutions
   - API error handling
   - Cost optimization tips

2. **Error Handling Pattern:**
   ```typescript
   // From src/services/llm/LLMProviderManager.ts
   try {
     const response = await llmProviderManager.generateText(request);
   } catch (error: any) {
     if (error.statusCode === 503) {
       // No providers available
     } else if (error.statusCode === 429) {
       // Rate limit exceeded
     } else if (error.statusCode === 401) {
       // Invalid API key
     }
   }
   ```

3. **Utilities:**
   - Logger: [`src/utils/logger.ts`](./src/utils/logger.ts)
   - Errors: [`src/utils/errors.ts`](./src/utils/errors.ts)

---

### **Task 8: Git Workflow and Deployment**

**Priority: LOW** 🟢

**Git Workflow:**
- **Guide:** [`docs/guides/GIT-INSTRUCTIONS.md`](./docs/guides/GIT-INSTRUCTIONS.md)
- Commit message conventions
- Branch management
- Pull request process

**Deployment:**
- Docker configuration: [`docs/implementation/EXAMPLE-CODE.md`](./docs/implementation/EXAMPLE-CODE.md) - Section "Docker Configuration"
- Environment setup: [`.env.example`](./.env.example)

---

## 📖 Document Categories

### **Architecture Documents** 🏗️

Essential for understanding the system design.

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [`docs/architecture/ARCHITECTURE-DIAGRAMS.md`](./docs/architecture/ARCHITECTURE-DIAGRAMS.md) | Visual architecture (11 diagrams) | Visual learners, presentations |
| [`docs/architecture/C4-ARCHITECTURE.md`](./docs/architecture/C4-ARCHITECTURE.md) | Complete C4 model (4 levels) | Deep technical understanding |
| [`docs/architecture/EVALUATION-PROOF.md`](./docs/architecture/EVALUATION-PROOF.md) | Automatic quality validation | Understanding evaluation system |

---

### **LLM Implementation Documents** 🤖

**Critical for LLM-related work.**

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [`docs/llm/MULTI-LLM-QUICKSTART.md`](./docs/llm/MULTI-LLM-QUICKSTART.md) ⭐ | 5-min quick start guide | First time with Multi-LLM |
| [`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md) | Complete architecture spec | Implementing LLM features |
| [`docs/llm/MULTI-LLM-IMPLEMENTATION-SUMMARY.md`](./docs/llm/MULTI-LLM-IMPLEMENTATION-SUMMARY.md) | Implementation verification | Checking completeness |
| [`src/services/llm/README.md`](./src/services/llm/README.md) | Developer guide | Writing LLM code |

---

### **Implementation Documents** 💻

For building and extending features.

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [`docs/implementation/IMPLEMENTATION-GUIDE.md`](./docs/implementation/IMPLEMENTATION-GUIDE.md) | Step-by-step build guide | Implementing features |
| [`docs/implementation/IMPLEMENTATION-ROADMAP.md`](./docs/implementation/IMPLEMENTATION-ROADMAP.md) | 95-task roadmap | Planning work |
| [`docs/implementation/TASK-SPECIFICATIONS.md`](./docs/implementation/TASK-SPECIFICATIONS.md) | Detailed task specs | Implementing specific tasks |
| [`docs/implementation/EXAMPLE-CODE.md`](./docs/implementation/EXAMPLE-CODE.md) | Production code samples | Code reference |
| [`docs/implementation/GROK-IMPLEMENTATION-PROMPT.md`](./docs/implementation/GROK-IMPLEMENTATION-PROMPT.md) | AI agent prompt | Autonomous implementation |

---

### **Guide Documents** 📚

Quick references and navigation.

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [`docs/guides/QUICK-REFERENCE.md`](./docs/guides/QUICK-REFERENCE.md) | One-page cheat sheet | Quick lookup |
| [`docs/guides/NAVIGATION-GUIDE.md`](./docs/guides/NAVIGATION-GUIDE.md) | How to navigate docs | First-time readers |
| [`docs/guides/GIT-INSTRUCTIONS.md`](./docs/guides/GIT-INSTRUCTIONS.md) | Git workflow | Git operations |
| [`docs/guides/COMPLETE-DELIVERABLES.md`](./docs/guides/COMPLETE-DELIVERABLES.md) | Full summary | Overview of everything |

---

### **Specification Documents** 📋

Feature specifications and requirements.

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [`docs/specifications/PROJECT-SUMMARY.md`](./docs/specifications/PROJECT-SUMMARY.md) | Executive overview | Understanding project goals |
| [`docs/specifications/OCR-ENHANCEMENT.md`](./docs/specifications/OCR-ENHANCEMENT.md) | OCR for scanned PDFs | OCR implementation |
| [`docs/specifications/OCR-FREE-TIER-STRATEGY.md`](./docs/specifications/OCR-FREE-TIER-STRATEGY.md) | Cost-optimized OCR | Cost optimization |

---

## 🎯 Common Agent Tasks

### **Task: "Add support for a new LLM provider"**

**Required Reading:**
1. [`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md) - Architecture
2. [`src/services/llm/README.md`](./src/services/llm/README.md) - Section "Adding a New Provider"
3. [`src/services/llm/ILLMProvider.ts`](./src/services/llm/ILLMProvider.ts) - Interface definition
4. [`src/services/llm/OpenAIProvider.ts`](./src/services/llm/OpenAIProvider.ts) - Example implementation

**Implementation Steps:** See "Task 3: Adding a New LLM Provider" above.

---

### **Task: "Optimize LLM costs"**

**Required Reading:**
1. [`docs/llm/MULTI-LLM-QUICKSTART.md`](./docs/llm/MULTI-LLM-QUICKSTART.md) - Section "Cost Optimization"
2. [`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md) - Section "Cost Comparison"
3. [`docs/specifications/OCR-FREE-TIER-STRATEGY.md`](./docs/specifications/OCR-FREE-TIER-STRATEGY.md) - Cost optimization strategies

**Key Strategies:**
- Use Gemini 1.5 Flash for bulk operations (55x cheaper)
- Reserve GPT-4o for critical tasks
- Enable automatic provider selection
- Track costs via `response.cost`

---

### **Task: "Implement OCR for scanned PDFs"**

**Required Reading:**
1. [`docs/specifications/OCR-ENHANCEMENT.md`](./docs/specifications/OCR-ENHANCEMENT.md) - Architecture
2. [`docs/specifications/OCR-FREE-TIER-STRATEGY.md`](./docs/specifications/OCR-FREE-TIER-STRATEGY.md) - Cost-optimized approach
3. [`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md) - Vision API integration
4. [`docs/implementation/EXAMPLE-CODE.md`](./docs/implementation/EXAMPLE-CODE.md) - Code samples

**Key Components:**
- Tesseract.js (free, local)
- OpenAI GPT-4o Vision (paid, high quality)
- Google Gemini 1.5 Pro Vision (paid, 2x cheaper)

---

### **Task: "Debug LLM integration issues"**

**Required Reading:**
1. [`docs/guides/QUICK-REFERENCE.md`](./docs/guides/QUICK-REFERENCE.md) - Troubleshooting section
2. [`src/services/llm/README.md`](./src/services/llm/README.md) - Error handling
3. [`src/utils/logger.ts`](./src/utils/logger.ts) - Logging utility
4. [`src/utils/errors.ts`](./src/utils/errors.ts) - Error classes

**Common Issues:**
- 503: No providers available (check API keys)
- 429: Rate limit exceeded (use fallback)
- 401: Invalid API key (verify credentials)

---

### **Task: "Understand the knowledge graph architecture"**

**Required Reading:**
1. [`docs/architecture/C4-ARCHITECTURE.md`](./docs/architecture/C4-ARCHITECTURE.md) - Complete design
2. [`docs/architecture/ARCHITECTURE-DIAGRAMS.md`](./docs/architecture/ARCHITECTURE-DIAGRAMS.md) - Visual diagrams
3. [`docs/guides/QUICK-REFERENCE.md`](./docs/guides/QUICK-REFERENCE.md) - Graph data model section

**Key Concepts:**
- Nodes: Sections, paragraphs, tables, images
- Edges: Hierarchical, reference, semantic, sequential
- MCP pattern: LLM-driven context retrieval
- Grounding: Traceability to source nodes

---

## 🔑 Key Files for AI Agents

### **Must-Read Files (Priority Order)**

1. ⭐ **[`README.md`](./README.md)** - Project overview and navigation
2. ⭐ **[`docs/llm/MULTI-LLM-QUICKSTART.md`](./docs/llm/MULTI-LLM-QUICKSTART.md)** - LLM quick start
3. 📖 **[`docs/architecture/C4-ARCHITECTURE.md`](./docs/architecture/C4-ARCHITECTURE.md)** - System architecture
4. 📖 **[`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md)** - LLM architecture
5. 💻 **[`src/services/llm/README.md`](./src/services/llm/README.md)** - Developer guide

### **Code Files (For Implementation)**

1. **[`src/services/llm/ILLMProvider.ts`](./src/services/llm/ILLMProvider.ts)** - Interface definition
2. **[`src/services/llm/OpenAIProvider.ts`](./src/services/llm/OpenAIProvider.ts)** - OpenAI implementation
3. **[`src/services/llm/GoogleProvider.ts`](./src/services/llm/GoogleProvider.ts)** - Google implementation
4. **[`src/services/llm/LLMProviderManager.ts`](./src/services/llm/LLMProviderManager.ts)** - Manager logic
5. **[`src/services/llm/index.ts`](./src/services/llm/index.ts)** - Exports

### **Configuration Files**

1. **[`.env.example`](./.env.example)** - Environment configuration
2. **[`package.json`](./package.json)** - Dependencies
3. **[`tsconfig.json`](./tsconfig.json)** - TypeScript configuration

---

## 💡 Best Practices for AI Agents

### **When Modifying LLM Code:**

1. ✅ **Always read the interface first**: [`src/services/llm/ILLMProvider.ts`](./src/services/llm/ILLMProvider.ts)
2. ✅ **Follow existing patterns**: Study [`OpenAIProvider.ts`](./src/services/llm/OpenAIProvider.ts) and [`GoogleProvider.ts`](./src/services/llm/GoogleProvider.ts)
3. ✅ **Implement all required methods**: `generateText()`, `analyzeImage()`, `healthCheck()`
4. ✅ **Add proper error handling**: Use `AppError` from [`src/utils/errors.ts`](./src/utils/errors.ts)
5. ✅ **Include logging**: Use logger from [`src/utils/logger.ts`](./src/utils/logger.ts)
6. ✅ **Calculate costs accurately**: Implement `calculateCost()` method
7. ✅ **Test fallback logic**: Verify auto-detection and fallback work correctly
8. ✅ **Update documentation**: Add new provider to all relevant docs

### **When Adding New Features:**

1. ✅ **Check the roadmap**: [`docs/implementation/IMPLEMENTATION-ROADMAP.md`](./docs/implementation/IMPLEMENTATION-ROADMAP.md)
2. ✅ **Read task specifications**: [`docs/implementation/TASK-SPECIFICATIONS.md`](./docs/implementation/TASK-SPECIFICATIONS.md)
3. ✅ **Use example code**: [`docs/implementation/EXAMPLE-CODE.md`](./docs/implementation/EXAMPLE-CODE.md)
4. ✅ **Follow TypeScript strict mode**: Type safety is enforced
5. ✅ **Write tests**: Unit tests + integration tests
6. ✅ **Update documentation**: Keep docs in sync with code

---

## 📊 Quick Statistics

| Category | Count | Location |
|----------|-------|----------|
| **Total Documentation** | 18 files | `docs/` folder |
| **LLM-Specific Docs** | 4 files | `docs/llm/` |
| **Implementation Code** | 811 lines | `src/services/llm/` |
| **Architecture Diagrams** | 11 diagrams | `docs/architecture/ARCHITECTURE-DIAGRAMS.md` |
| **Supported LLM Providers** | 2 (OpenAI + Google) | Extensible to more |
| **Supported Models** | 8 models | GPT-4o, Gemini 1.5 Pro, etc. |

---

## 🔗 External Resources

- **Repository**: https://github.com/abezr/pdf-summarize
- **OpenAI API**: https://platform.openai.com/docs
- **Google AI (Gemini)**: https://ai.google.dev/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/

---

## 📝 Summary for AI Agents

**If you're an AI agent tasked with maintaining/implementing LLM features, start here:**

1. Read **[`docs/llm/MULTI-LLM-QUICKSTART.md`](./docs/llm/MULTI-LLM-QUICKSTART.md)** for quick understanding
2. Study **[`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md)** for complete architecture
3. Review **[`src/services/llm/`](./src/services/llm/)** code implementation
4. Reference **[`src/services/llm/README.md`](./src/services/llm/README.md)** for developer guide
5. Use **[`docs/implementation/EXAMPLE-CODE.md`](./docs/implementation/EXAMPLE-CODE.md)** for code samples

**For specific tasks, use the "Common Agent Tasks" section above.**

---

**Last Updated**: 2025-11-27  
**Repository**: https://github.com/abezr/pdf-summarize  
**Status**: ✅ Complete and up-to-date

---

**🤖 Happy Coding, AI Agent!**

---

## 🏠 Local-First Architecture (NEW)

### **IMPORTANT: This project is designed for local deployment**

The architecture has been updated to run entirely on localhost with minimal external dependencies.

**Key Documents:**

1. **[`docs/architecture/LOCAL-FIRST-ARCHITECTURE.md`](./docs/architecture/LOCAL-FIRST-ARCHITECTURE.md)** ⭐ **MUST READ**
   - Complete local-first architecture specification
   - Zero external services (except LLM APIs)
   - All local alternatives (SQLite, node-cache, filesystem)
   - $0 infrastructure costs
   - **When to use:** Understanding the new local-first approach

2. **[`docs/guides/TOKEN-OPTIMIZATION.md`](./docs/guides/TOKEN-OPTIMIZATION.md)** 💰 **CRITICAL**
   - Extreme token cost optimization strategies
   - 90-98% cost reduction techniques
   - Aggressive caching implementation
   - Content reduction pipeline
   - Smart model selection
   - **When to use:** Implementing cost-optimized LLM usage

### Task: "Implement Local-First Architecture"

**Required Reading:**
1. [`docs/architecture/LOCAL-FIRST-ARCHITECTURE.md`](./docs/architecture/LOCAL-FIRST-ARCHITECTURE.md) - Complete specification
2. [`docs/guides/TOKEN-OPTIMIZATION.md`](./docs/guides/TOKEN-OPTIMIZATION.md) - Cost optimization
3. [`docs/llm/MULTI-LLM-SUPPORT.md`](./docs/llm/MULTI-LLM-SUPPORT.md) - LLM provider system

**Key Changes from Cloud Architecture:**

| Component | Cloud Version | Local-First Version |
|-----------|---------------|---------------------|
| **Database** | PostgreSQL (cloud) | SQLite (file-based) |
| **Cache** | Redis (cloud) | node-cache (in-memory) |
| **Storage** | S3/GCS | Local filesystem |
| **Embeddings** | OpenAI API | transformers.js (local) |
| **OCR** | Google Vision API | Tesseract.js (local) |
| **Monitoring** | Prometheus/Grafana | JSON logs + CLI dashboard |

**Implementation Steps:**

1. **Replace PostgreSQL with SQLite**
   ```typescript
   import Database from 'better-sqlite3';
   
   const db = new Database('./data/database.sqlite');
   ```

2. **Replace Redis with node-cache**
   ```typescript
   import NodeCache from 'node-cache';
   
   const cache = new NodeCache({ stdTTL: 3600 });
   ```

3. **Use Local Filesystem for Files**
   ```typescript
   const uploadDir = './data/uploads';
   const graphDir = './data/graphs';
   ```

4. **Implement Local Embeddings**
   ```typescript
   import { pipeline } from '@xenova/transformers';
   
   const embedder = await pipeline('feature-extraction', 
     'Xenova/all-MiniLM-L6-v2');
   ```

5. **Add Aggressive Token Caching**
   ```typescript
   // See TOKEN-OPTIMIZATION.md for complete implementation
   const cacheManager = new CacheManager();
   const result = await cacheManager.getOrGenerate(content, provider, model, generator);
   ```

**Cost Comparison:**

- **Before (Cloud)**: $80-290/month
- **After (Local-First)**: $5-20/month (only LLM API)
- **Savings**: 75-95% reduction! 🎉

---

## 💰 Token Optimization (CRITICAL)

### **Every LLM API call costs money - optimize aggressively!**

**Required Reading:**
- [`docs/guides/TOKEN-OPTIMIZATION.md`](./docs/guides/TOKEN-OPTIMIZATION.md) - Complete optimization guide

**7 Optimization Strategies:**

1. **Aggressive Caching** (60-80% savings)
   - Memory cache → Disk cache → LLM API
   - Never repeat the same call
   - 7-day TTL for cached responses

2. **Content Reduction** (50-70% savings)
   - Remove boilerplate before sending
   - Extract only key sentences
   - Deduplicate similar content

3. **Smart Model Selection** (50-90% cost savings)
   - Use Gemini 1.5 Flash for bulk (55x cheaper than GPT-4o)
   - Use Gemini 1.5 Pro for normal tasks (3.3x cheaper)
   - Reserve GPT-4o for critical tasks only

4. **Batch Processing** (20-30% savings)
   - Group similar documents
   - Reuse context across batch
   - Process in single session

5. **Local Pre-Processing** (70-90% token reduction)
   - Do maximum work locally first
   - Only send essential context to LLM
   - Build graphs, embeddings locally

6. **Prompt Optimization** (5-10% savings)
   - Use concise prompts
   - Avoid verbose instructions
   - Structure output requests

7. **Budget Enforcement** (prevent overspending)
   - Set daily limits (e.g., $1/day)
   - Track every token used
   - Alert when limits approached
   - Stop calls if exceeded

**Expected Combined Savings**: 90-98% cost reduction! 🎉

**Implementation Example:**

```typescript
// Before optimization
const summary = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: fullDocumentText }],  // $$$ EXPENSIVE
});
// Cost: $0.025 per document

// After optimization
const optimizedContent = contentOptimizer.optimize(documentText);
const cachedResult = await cacheManager.getOrGenerate(
  optimizedContent,
  'google',
  'gemini-1.5-flash',
  () => generateSummary(optimizedContent)
);
// Cost: $0.0005 per document (50x cheaper!)
```

---

## 🎯 Updated Quick Start for Local-First

### **When starting work on local-first features:**

1. **Architecture Understanding:**
   - Read [`docs/architecture/LOCAL-FIRST-ARCHITECTURE.md`](./docs/architecture/LOCAL-FIRST-ARCHITECTURE.md)
   - Understand zero-external-dependency philosophy
   - Review local alternatives to cloud services

2. **Cost Optimization:**
   - Read [`docs/guides/TOKEN-OPTIMIZATION.md`](./docs/guides/TOKEN-OPTIMIZATION.md)
   - Implement aggressive caching
   - Use smart model selection

3. **LLM Integration:**
   - Use [`docs/llm/MULTI-LLM-QUICKSTART.md`](./docs/llm/MULTI-LLM-QUICKSTART.md)
   - Prefer Gemini 1.5 Flash for cost
   - Cache every LLM response

4. **Local Storage:**
   - Use SQLite, not PostgreSQL
   - Use node-cache, not Redis
   - Store files locally, not S3/GCS

5. **Monitoring:**
   - Track token usage meticulously
   - Set daily budget limits
   - Alert on high costs

---

**Last Updated**: 2025-11-27  
**New Features**: Local-First Architecture + Token Optimization  
**Repository**: https://github.com/abezr/pdf-summarize
