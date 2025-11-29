# TextDigest AI Architect Prompt
**System Name**: TextDigest - Intelligent Text File Digest Generator  
**Version**: 1.0.0  
**Date**: 2025-11-29  
**Target**: AI Architect Agent → Implementor Agent  
**Repository**: https://github.com/abezr/pdf-summarize (TextDigest module)

---

## 🎯 Core Mission

Build a **minimal, production-grade CLI tool** that:
1. **Discovers** all text files modified in the last 6 days from a target folder
2. **Summarizes** them into a structured digest with key facts, insights, and statistics
3. **Preserves traceability** by linking every insight to source file paths
4. **Outputs** a readable `digest.md` with clickable file references
5. **Handles volume**: Process hundreds of small files efficiently (2-3 min for 300 files)

---

## 📦 System Scope

### ✅ IN SCOPE (Must Implement)

#### Core Features
- **File Discovery**: Scan folder recursively for `.txt`, `.md`, `.log` files modified in last 6 days
- **Content Extraction**: Read UTF-8 files, handle basic encoding errors gracefully
- **Batch Processing**: Process files in parallel batches (20 files/batch) for efficiency
- **LLM Summarization**: Generate digest with key facts, insights, statistics per file
- **Source Linking**: Every fact/insight must link to original file path (e.g., `[source: ./logs/app.log:42]`)
- **Output Format**: Single `digest.md` file with:
  - Executive summary (top 5 insights across all files)
  - Per-file summaries (grouped by file type)
  - Statistics (file count, total size, date range)
  - Source index (clickable links to all processed files)
- **CLI Interface**: `textdigest --folder ./logs --days 6 --output digest.md`
- **Docker Support**: One-command setup with `docker-compose up`
- **E2E Testing**: Automated test suite with sample files

#### Quality Attributes
- **Observability**: Structured logs (JSON), progress tracking, evaluation metrics
- **Reliability**: Graceful error handling (skip corrupted files, log issues)
- **Efficiency**: Process 300 files in < 3 minutes (parallel batching)
- **Maintainability**: Semantic markup, LLM-friendly code structure

### ❌ OUT OF SCOPE (Defer to v2.0)

- Binary file support (`.pdf`, `.docx`)
- File size limit > 10MB per file (warn and skip)
- Non-UTF8 encodings (only basic fallback to latin1)
- Version control integration (Git blame/history)
- Real-time monitoring (watch mode)
- Multi-language detection/translation
- Cloud storage integration (S3, GCS)
- Complex file type processing (`.json`, `.yaml`, `.xml`)

**Clarification**: Individual files are small, but **volume is high** (few hundred files). Architecture must prioritize **throughput** over per-file depth.

---

## 🏗️ System Architecture

### Minimalist Design Constraints

```yaml
Code Complexity:
  Max Files: 8 TypeScript files (excluding tests)
  Max Dependencies: 5 npm packages
  Max Core Logic: 800 lines (excluding types/tests)
  Max File Size: 200 lines per file
  No Database: Use in-memory structures only

Structure:
  - src/
    - cli.ts              # 150 lines: CLI entry, arg parsing
    - file-discovery.ts   # 120 lines: File scanning, date filtering
    - content-processor.ts # 180 lines: Batch processing, parallel execution
    - llm-summarizer.ts   # 200 lines: LLM API calls, prompt engineering
    - digest-builder.ts   # 100 lines: Markdown output generation
    - evaluator.ts        # 150 lines: Quality metrics, validation
    - types.ts            # 80 lines: TypeScript interfaces
    - config.ts           # 50 lines: Environment variables
  - tests/
    - e2e.test.ts         # End-to-end test with 50 sample files
  - Dockerfile            # Single-stage, < 15 lines
  - docker-compose.yml    # Services: textdigest-cli only
  - README.md             # Quick start, usage examples
```

### Data Flow (5 Stages)

```mermaid
graph LR
    A[File Discovery] -->|FileMetadata[]| B[Content Extraction]
    B -->|FileContent[]| C[Batch Processing]
    C -->|Batch<FileContent>| D[LLM Summarization]
    D -->|FileSummary[]| E[Digest Generation]
    E -->|digest.md| F[Evaluation & Metrics]
```

#### Stage 1: File Discovery
```typescript
// INPUT: folder path, days threshold
// OUTPUT: FileMetadata[]
interface FileMetadata {
  path: string;          // Relative path: ./logs/app.log
  size: number;          // Bytes
  modifiedAt: Date;      // Last modified timestamp
  type: 'txt' | 'md' | 'log';
}

// LOGIC:
// 1. Recursively walk directory tree
// 2. Filter by extension (.txt, .md, .log)
// 3. Filter by modification date (now - 6 days)
// 4. Sort by modifiedAt DESC (newest first)
// 5. Warn if file > 10MB, skip
```

#### Stage 2: Content Extraction
```typescript
// INPUT: FileMetadata[]
// OUTPUT: FileContent[]
interface FileContent {
  metadata: FileMetadata;
  content: string;       // UTF-8 text content
  lineCount: number;
  wordCount: number;
  encoding: 'utf8' | 'latin1';
  error?: string;        // If read failed
}

// LOGIC:
// 1. Read file with UTF-8 encoding
// 2. Fallback to latin1 if UTF-8 fails
// 3. Count lines, words
// 4. Log error and skip if both encodings fail
```

#### Stage 3: Batch Processing
```typescript
// INPUT: FileContent[], batchSize = 20
// OUTPUT: Batch<FileContent>[]
interface Batch<T> {
  id: string;            // UUID
  items: T[];
  totalSize: number;     // Combined bytes
  createdAt: Date;
}

// LOGIC:
// 1. Group files into batches of 20
// 2. Process batches in parallel (max 3 concurrent)
// 3. Track progress: processed/total batches
// 4. Log batch completion time
```

#### Stage 4: LLM Summarization
```typescript
// INPUT: Batch<FileContent>
// OUTPUT: FileSummary[]
interface FileSummary {
  file: FileMetadata;
  summary: string;       // 2-3 sentence summary
  keyFacts: string[];    // 3-5 bullet points
  insights: string[];    // 1-2 insights
  statistics: {          // Extracted numbers
    [key: string]: number | string;
  };
  sources: string[];     // File paths referenced
  model: string;         // gemini-2.0-flash-exp
  tokens: number;
  confidence: number;    // 0-1 score
}

// PROMPT TEMPLATE:
const SUMMARIZE_BATCH_PROMPT = `
You are a technical analyst summarizing recent project files.

# Files to Analyze (Batch {{batch_id}}):
{{#each files}}
## File {{@index}}: {{this.path}}
Modified: {{this.modifiedAt}}
Size: {{this.size}} bytes

\`\`\`
{{this.content}}
\`\`\`
{{/each}}

# Your Task:
For EACH file, provide:
1. **Summary** (2-3 sentences): What is this file about?
2. **Key Facts** (3-5 bullets): Concrete statements from the file
3. **Insights** (1-2 bullets): Interesting patterns or implications
4. **Statistics** (if any): Extract numbers (dates, counts, metrics)
5. **Sources**: List the file path for each fact/insight

# Output Format (JSON):
{
  "summaries": [
    {
      "file": "{{path}}",
      "summary": "...",
      "keyFacts": ["...", "..."],
      "insights": ["..."],
      "statistics": {"key": "value"},
      "sources": ["{{path}}:42"]
    }
  ]
}

# Rules:
- Every fact MUST cite source as "[source: path:line]"
- Be concise (max 500 chars per summary)
- Extract ALL numbers/dates you find
- Focus on WHAT changed, not technical jargon
- If file is empty/unreadable, say "No content"
`;

// LOGIC:
// 1. Construct prompt with batch files
// 2. Call LLM API (gemini-2.0-flash-exp, fallback gpt-4o-mini)
// 3. Parse JSON response
// 4. Validate: all files have summaries, sources exist
// 5. Calculate confidence score (% of facts with sources)
```

#### Stage 5: Digest Generation
```typescript
// INPUT: FileSummary[]
// OUTPUT: digest.md file
interface Digest {
  executiveSummary: string;  // Top 5 insights across all files
  fileSummaries: {           // Grouped by file type
    txt: FileSummary[];
    md: FileSummary[];
    log: FileSummary[];
  };
  statistics: {
    totalFiles: number;
    totalSize: number;
    dateRange: [Date, Date];
    fileTypes: Record<string, number>;
  };
  sourceIndex: string[];     // All file paths, sorted
  metadata: {
    generatedAt: Date;
    processingTime: number;  // Seconds
    model: string;
  };
}

// MARKDOWN TEMPLATE:
const DIGEST_TEMPLATE = `
# Text File Digest
**Generated**: {{metadata.generatedAt}}  
**Processing Time**: {{metadata.processingTime}}s  
**Model**: {{metadata.model}}

---

## 🎯 Executive Summary
Top insights from {{statistics.totalFiles}} files (last 6 days):

{{#each executiveSummary}}
{{@index}}. {{this}}
{{/each}}

---

## 📊 Statistics
- **Total Files**: {{statistics.totalFiles}}
- **Total Size**: {{formatBytes statistics.totalSize}}
- **Date Range**: {{formatDate statistics.dateRange[0]}} to {{formatDate statistics.dateRange[1]}}
- **File Types**: {{#each statistics.fileTypes}}{{@key}}: {{this}}, {{/each}}

---

## 📝 File Summaries

### Text Files (.txt)
{{#each fileSummaries.txt}}
#### [{{this.file.path}}]({{this.file.path}})
**Modified**: {{formatDate this.file.modifiedAt}} | **Size**: {{formatBytes this.file.size}}

{{this.summary}}

**Key Facts**:
{{#each this.keyFacts}}
- {{this}}
{{/each}}

**Insights**:
{{#each this.insights}}
- {{this}}
{{/each}}

{{#if this.statistics}}
**Statistics**: {{json this.statistics}}
{{/if}}

---
{{/each}}

### Markdown Files (.md)
{{! ... same structure ...}}

### Log Files (.log)
{{! ... same structure ...}}

---

## 🔗 Source Index
All processed files (clickable links):

{{#each sourceIndex}}
- [{{this}}]({{this}})
{{/each}}
`;
```

---

## 🧪 Quality Evaluation Framework

### Evaluation Metrics (Run after digest generation)

```typescript
interface EvaluationResult {
  scores: {
    sourceLinked: number;    // % of facts with [source: ...] tags
    coverage: number;        // % of files cited in executive summary
    confidence: number;      // Avg confidence from LLM summaries
    consistency: number;     // Cross-file fact consistency (future)
  };
  thresholds: {
    sourceLinked: 0.90;      // 90% min
    coverage: 0.80;          // 80% min
    confidence: 0.75;        // 75% min
  };
  passed: boolean;
  issues: string[];          // Failed checks
  recommendations: string[]; // Improvement suggestions
}

// EVALUATION LOGIC:
async function evaluateDigest(digest: Digest): Promise<EvaluationResult> {
  // 1. Count facts with [source: ...] pattern
  const totalFacts = digest.fileSummaries.flatMap(s => s.keyFacts).length;
  const linkedFacts = digest.fileSummaries.flatMap(s => s.keyFacts.filter(f => /\[source:/.test(f))).length;
  const sourceLinked = linkedFacts / totalFacts;

  // 2. Count unique files cited in executive summary
  const citedFiles = new Set(digest.executiveSummary.flatMap(s => s.match(/\[source: ([^\]]+)\]/g) || []));
  const coverage = citedFiles.size / digest.statistics.totalFiles;

  // 3. Average confidence from LLM
  const confidence = digest.fileSummaries.reduce((sum, s) => sum + s.confidence, 0) / digest.fileSummaries.length;

  // 4. Check thresholds
  const passed = sourceLinked >= 0.90 && coverage >= 0.80 && confidence >= 0.75;

  return { scores: { sourceLinked, coverage, confidence }, passed, /* ... */ };
}
```

### Quality Gates (Block on Failure)

```yaml
Gates:
  - Name: Source Traceability
    Metric: sourceLinked >= 0.90
    Action: Fail if < 90% facts have [source: ...] tags
  
  - Name: File Coverage
    Metric: coverage >= 0.80
    Action: Warn if < 80% files cited in executive summary
  
  - Name: LLM Confidence
    Metric: confidence >= 0.75
    Action: Warn if avg confidence < 75%
  
  - Name: Processing Time
    Metric: processingTime <= 180s (for 300 files)
    Action: Warn if > 3 minutes
```

---

## 🛠️ LLM Integration

### Primary Model: Google Gemini 2.0 Flash Exp

```typescript
// Environment Variables:
GOOGLE_API_KEY=your_key_here
GOOGLE_MODEL=gemini-2.0-flash-exp  // Or gemini-1.5-flash-latest

// API Call:
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

async function summarizeBatch(batch: Batch<FileContent>): Promise<FileSummary[]> {
  const prompt = renderPrompt(SUMMARIZE_BATCH_PROMPT, { batch });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Parse JSON response
  const data = JSON.parse(text);
  return data.summaries.map((s: any) => ({
    ...s,
    model: 'gemini-2.0-flash-exp',
    tokens: response.usageMetadata?.totalTokenCount || 0,
    confidence: calculateConfidence(s),
  }));
}
```

### Fallback Model: OpenAI GPT-4o Mini

```typescript
// Fallback if Google API fails/rate-limited
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function summarizeBatchFallback(batch: Batch<FileContent>): Promise<FileSummary[]> {
  const prompt = renderPrompt(SUMMARIZE_BATCH_PROMPT, { batch });
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });
  
  const text = response.choices[0].message.content!;
  const data = JSON.parse(text);
  return data.summaries.map((s: any) => ({
    ...s,
    model: 'gpt-4o-mini',
    tokens: response.usage?.total_tokens || 0,
    confidence: calculateConfidence(s),
  }));
}
```

### Model Selection Logic

```typescript
const LLM_CONFIG = {
  primary: {
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
    maxRetries: 2,
    timeout: 30000, // 30s
  },
  fallback: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxRetries: 1,
    timeout: 20000, // 20s
  },
};

async function summarizeWithFallback(batch: Batch<FileContent>): Promise<FileSummary[]> {
  try {
    return await summarizeBatch(batch); // Try Google first
  } catch (error) {
    console.warn(`Google API failed: ${error.message}, falling back to OpenAI`);
    return await summarizeBatchFallback(batch);
  }
}
```

**Note**: Verify latest model names online:
- Google: https://ai.google.dev/models/gemini
- OpenAI: https://platform.openai.com/docs/models

---

## 🤖 Multi-Agent Architecture

### Agent Roles

```yaml
Architect Agent (You):
  Role: Design system, write this prompt, supervise implementation
  Deliverables:
    - Architecture document (this file)
    - Semantic markup specification
    - Acceptance criteria
    - Quality gates
  Tools: None (design phase only)

Implementor Agent:
  Role: Generate code from architecture spec
  Inputs: This prompt, semantic markup patterns
  Outputs: TypeScript source code (src/*), tests, Dockerfile
  Constraints: Follow semantic markup, max 8 files, 800 lines
  Supervision: Architect agent reviews via MCP Acceptance Expert

MCP Acceptance Expert (Tool):
  Role: Parse logs, validate implementation against acceptance criteria
  Inputs: Structured logs (JSON), test results, evaluation metrics
  Outputs: Pass/Fail + issues list + recommendations
  Logic:
    - Check: All 8 files exist with correct structure
    - Check: Tests pass (e2e.test.ts)
    - Check: Evaluation metrics meet thresholds
    - Check: Docker builds successfully
    - Check: CLI runs without errors

Early Evaluator Agents (Parallel):
  1. Functional Evaluator:
     - Tests: CLI args parsing, file discovery, content extraction
     - Pass: All core features work as specified
  
  2. Usability Evaluator:
     - Tests: CLI help text, error messages, output format
     - Pass: Non-technical user can run tool with --help
  
  3. Performance Evaluator:
     - Tests: Process 300 files < 3 min, memory < 512MB
     - Pass: Throughput meets targets
  
  4. Quality Evaluator:
     - Tests: Code follows semantic markup, < 800 lines
     - Pass: Maintainable by GPT-4o-mini
```

### Log-Driven Development (MCP Integration)

```typescript
// STRUCTURED LOGGING (JSON)
import { createLogger } from './logger';

const logger = createLogger({ service: 'textdigest' });

// Example logs:
logger.info('file_discovery_started', { folder: './logs', days: 6 });
logger.info('file_discovered', { path: './logs/app.log', size: 1024, modifiedAt: '2025-11-23' });
logger.info('batch_created', { batchId: 'b1', fileCount: 20, totalSize: 20480 });
logger.info('llm_request', { batchId: 'b1', model: 'gemini-2.0-flash-exp', prompt_tokens: 5000 });
logger.info('llm_response', { batchId: 'b1', summaries: 20, tokens: 3000, latency_ms: 2500 });
logger.info('evaluation_result', { passed: true, scores: { sourceLinked: 0.95, coverage: 0.85 } });
logger.error('file_read_failed', { path: './logs/corrupt.log', error: 'ENOENT' });

// MCP TOOL: Parse logs and validate
async function acceptanceCriteria(logs: string[]): Promise<{ passed: boolean; issues: string[] }> {
  const parsed = logs.map(JSON.parse);
  
  // Check: All batches processed
  const batchesCreated = parsed.filter(l => l.event === 'batch_created').length;
  const batchesCompleted = parsed.filter(l => l.event === 'llm_response').length;
  if (batchesCreated !== batchesCompleted) {
    return { passed: false, issues: ['Not all batches processed'] };
  }
  
  // Check: Evaluation passed
  const evalResult = parsed.find(l => l.event === 'evaluation_result');
  if (!evalResult?.passed) {
    return { passed: false, issues: ['Evaluation failed', JSON.stringify(evalResult.scores)] };
  }
  
  return { passed: true, issues: [] };
}
```

---

## 🚀 Deployment & Testing

### Docker Setup (One Command)

```dockerfile
# Dockerfile (Single-stage, minimal)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# CLI entry point
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["--help"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  textdigest:
    build: .
    image: textdigest:latest
    container_name: textdigest-cli
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./data:/data  # Mount folder to scan
      - ./output:/output  # Mount output folder
    command: --folder /data --days 6 --output /output/digest.md
```

**Usage**:
```bash
# 1. Set API keys
export GOOGLE_API_KEY=your_key
export OPENAI_API_KEY=your_key

# 2. Run
docker-compose up

# Output: ./output/digest.md
```

### E2E Testing

```typescript
// tests/e2e.test.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

describe('TextDigest E2E', () => {
  beforeEach(async () => {
    // Create 50 sample files with different dates
    await setupSampleFiles('./test-data', 50);
  });

  it('should process 50 files and generate digest', async () => {
    const { stdout } = await execAsync('node dist/cli.js --folder ./test-data --days 6 --output ./test-output/digest.md');
    
    // Check: Digest file created
    const digest = await fs.readFile('./test-output/digest.md', 'utf-8');
    expect(digest).toContain('# Text File Digest');
    expect(digest).toContain('**Total Files**: 30'); // Only 30 files from last 6 days
    
    // Check: All facts have sources
    const facts = digest.match(/\*\*Key Facts\*\*:[\s\S]+?(?=\*\*|---)/g) || [];
    const linkedFacts = facts.filter(f => /\[source:/.test(f)).length;
    expect(linkedFacts / facts.length).toBeGreaterThan(0.90);
  });

  it('should complete in < 2 minutes for 300 files', async () => {
    await setupSampleFiles('./large-test-data', 300);
    
    const start = Date.now();
    await execAsync('node dist/cli.js --folder ./large-test-data --days 6 --output ./test-output/large-digest.md');
    const duration = (Date.now() - start) / 1000;
    
    expect(duration).toBeLessThan(180); // 3 min max
  });
});
```

---

## 📋 Success Criteria (MVP Definition)

### Functional Requirements (Must Pass)

```yaml
FR1: File Discovery
  - Input: Folder path, days threshold (6)
  - Output: List of .txt/.md/.log files modified in last 6 days
  - Pass: All matching files discovered, sorted by date DESC

FR2: Content Extraction
  - Input: File metadata
  - Output: File content (UTF-8) + line/word count
  - Pass: 100% of valid files read, errors logged

FR3: Batch Processing
  - Input: 300 files
  - Output: 15 batches of 20 files each
  - Pass: All batches processed in < 3 minutes

FR4: LLM Summarization
  - Input: Batch of 20 files
  - Output: 20 FileSummary objects with facts/insights/sources
  - Pass: All summaries have >= 90% facts with [source: ...] tags

FR5: Digest Generation
  - Input: FileSummary[]
  - Output: digest.md file with executive summary, file summaries, source index
  - Pass: Markdown is well-formatted, all links work

FR6: CLI Interface
  - Input: --folder ./logs --days 6 --output digest.md
  - Output: Exit code 0, digest.md created
  - Pass: CLI runs without errors, help text clear
```

### Quality Requirements (Must Pass)

```yaml
QR1: Source Traceability
  - Metric: >= 90% of facts have [source: path:line] tags
  - Pass: sourceLinked >= 0.90

QR2: File Coverage
  - Metric: >= 80% of files cited in executive summary
  - Pass: coverage >= 0.80

QR3: LLM Confidence
  - Metric: Avg confidence >= 0.75
  - Pass: confidence >= 0.75

QR4: Code Maintainability
  - Metric: < 800 lines of core logic, semantic markup followed
  - Pass: Code review by GPT-4o-mini confirms readability
```

### Usability Requirements (Should Pass)

```yaml
UR1: Installation
  - Test: Run docker-compose up from README
  - Pass: Tool runs without manual configuration (API key only)

UR2: Error Messages
  - Test: Run with invalid folder, missing API key
  - Pass: Error messages are actionable (e.g., "Set GOOGLE_API_KEY env var")

UR3: Output Format
  - Test: Read digest.md in VSCode/browser
  - Pass: Clickable file links, well-structured sections
```

### Performance Requirements (Should Pass)

```yaml
PR1: Throughput
  - Target: Process 300 files in < 3 minutes
  - Pass: Actual time <= 180s

PR2: Memory
  - Target: < 512MB RAM during processing
  - Pass: docker stats shows < 512MB

PR3: Latency
  - Target: < 5s per batch LLM call
  - Pass: Avg latency <= 5000ms
```

### Testability Requirements (Must Pass)

```yaml
TR1: E2E Test
  - Test: Run tests/e2e.test.ts with 50 sample files
  - Pass: All tests pass, coverage >= 80%

TR2: Structured Logs
  - Test: Parse logs with MCP Acceptance Expert
  - Pass: All events present, no errors
```

---

## 🧠 Semantic Markup Specification

### Code Structure Patterns (LLM-Friendly)

```typescript
// PATTERN 1: Function Comments (Semantic Markup)
/**
 * Discovers all text files modified in the last N days from a folder.
 * 
 * @semantic-role file-discovery
 * @input folder: string - Absolute or relative path to scan
 * @input days: number - Number of days to look back (e.g., 6)
 * @output FileMetadata[] - List of discovered files
 * @throws FileSystemError - If folder doesn't exist or is inaccessible
 * 
 * @algorithm
 * 1. Recursively walk directory tree
 * 2. Filter by extension: .txt, .md, .log
 * 3. Filter by modification date: now - days <= mtime
 * 4. Sort by modifiedAt DESC (newest first)
 * 5. Warn if file > 10MB, skip
 * 
 * @example
 * const files = await discoverFiles('./logs', 6);
 * console.log(`Found ${files.length} files`);
 */
export async function discoverFiles(folder: string, days: number): Promise<FileMetadata[]> {
  // Implementation...
}
```

```typescript
// PATTERN 2: Interface Comments (Semantic Markup)
/**
 * Represents metadata for a discovered text file.
 * 
 * @semantic-role data-structure
 * @usage Used in file-discovery and content-extraction stages
 * @validation
 * - path: Non-empty string, must exist on filesystem
 * - size: Positive integer, <= 10MB (10485760 bytes)
 * - modifiedAt: Valid Date, within last 6 days
 * - type: One of 'txt', 'md', 'log'
 */
export interface FileMetadata {
  path: string;          // Relative path from scan folder
  size: number;          // File size in bytes
  modifiedAt: Date;      // Last modification timestamp
  type: 'txt' | 'md' | 'log';
}
```

```typescript
// PATTERN 3: Error Handling (Semantic Markup)
/**
 * Reads file content with UTF-8 encoding, fallback to latin1.
 * 
 * @semantic-role error-recovery
 * @error-strategy Graceful degradation - log error, skip file
 */
export async function readFileContent(file: FileMetadata): Promise<FileContent> {
  try {
    const content = await fs.readFile(file.path, 'utf-8');
    return { ...file, content, encoding: 'utf8', lineCount: countLines(content), wordCount: countWords(content) };
  } catch (utf8Error) {
    try {
      const content = await fs.readFile(file.path, 'latin1');
      logger.warn('utf8_decode_failed', { path: file.path, fallback: 'latin1' });
      return { ...file, content, encoding: 'latin1', lineCount: countLines(content), wordCount: countWords(content) };
    } catch (latin1Error) {
      logger.error('file_read_failed', { path: file.path, error: latin1Error.message });
      return { ...file, content: '', encoding: 'utf8', lineCount: 0, wordCount: 0, error: latin1Error.message };
    }
  }
}
```

### Implementation Checklist for Implementor Agent

```markdown
## Code Generation Checklist

### Phase 1: Setup (5 min)
- [ ] Initialize npm project with TypeScript
- [ ] Install dependencies: @google/generative-ai, openai, glob, commander
- [ ] Create src/ and tests/ folders
- [ ] Write tsconfig.json, package.json

### Phase 2: Core Logic (60 min)
- [ ] Implement file-discovery.ts (discoverFiles function)
- [ ] Implement content-processor.ts (readFileContent, createBatches, processBatches)
- [ ] Implement llm-summarizer.ts (summarizeBatch, summarizeWithFallback)
- [ ] Implement digest-builder.ts (generateDigest, renderMarkdown)
- [ ] Implement evaluator.ts (evaluateDigest, calculateMetrics)
- [ ] Implement types.ts (all interfaces with semantic markup)
- [ ] Implement config.ts (environment variables)
- [ ] Implement cli.ts (argument parsing, main function)

### Phase 3: Testing (30 min)
- [ ] Create tests/e2e.test.ts with 50 sample files
- [ ] Create tests/sample-data/ with .txt, .md, .log files
- [ ] Run tests: npm test
- [ ] Fix failing tests

### Phase 4: Docker (15 min)
- [ ] Write Dockerfile (single-stage, < 15 lines)
- [ ] Write docker-compose.yml (textdigest service)
- [ ] Test: docker-compose up
- [ ] Verify: output/digest.md created

### Phase 5: Documentation (10 min)
- [ ] Write README.md with quick start, usage examples
- [ ] Add example .env file
- [ ] Document CLI options (--folder, --days, --output)

### Phase 6: Validation (10 min)
- [ ] Run MCP Acceptance Expert on logs
- [ ] Verify: All quality gates pass
- [ ] Commit code with semantic markup
```

---

## 🔍 Architect Supervision Protocol

### Implementor Agent Guidance

```yaml
Guidance Messages (Sent by Architect):
  1. On Start:
     "Begin implementation of TextDigest system. Follow semantic markup patterns. Max 8 files, 800 lines. Report progress every 10 minutes."
  
  2. On Code Review:
     "Review file-discovery.ts: Check semantic markup, error handling, algorithm comments. Report deviations."
  
  3. On Test Failure:
     "E2E test failed: sourceLinked = 0.75 (expected >= 0.90). Review LLM prompt to enforce [source: ...] tags."
  
  4. On Quality Gate Failure:
     "Evaluation failed: coverage = 0.70 (expected >= 0.80). Improve executive summary to cite more files."
```

### Correction Triggers (Architect Intervenes)

```yaml
Trigger Conditions:
  - Code exceeds 800 lines (excluding tests)
  - Semantic markup missing (no @semantic-role tags)
  - Tests fail after 3 attempts
  - Evaluation metrics < thresholds
  - Docker build fails

Actions:
  - Review code with Early Evaluator Agents
  - Generate specific fix instructions
  - Request implementor to revise
  - Validate fix with MCP Acceptance Expert
```

---

## 📚 Reference Materials

### QA Paper
Source: https://arxiv.org/pdf/2506.18315  
Key Concepts:
- Self-consistency: Multiple LLM calls with same prompt → majority vote
- Source grounding: Every fact must cite original document
- Evaluation-driven: Metrics guide quality, not human judgment

### Architecture Patterns
- Knowledge Graph (from PDF Summary AI)
- Semantic Markup (LLM-friendly code comments)
- Log-Driven Development (structured JSON logs)
- Multi-agent orchestration (Architect → Implementor → Evaluators)

### Dependencies
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.22.0",
    "openai": "^4.72.0",
    "glob": "^11.0.0",
    "commander": "^12.1.0",
    "typescript": "^5.7.2"
  }
}
```

---

## 🎓 Next Steps for Implementor Agent

1. **Read this prompt fully** (understand scope, constraints, architecture)
2. **Verify model availability**:
   - Check Google API: https://ai.google.dev/models/gemini
   - Check OpenAI API: https://platform.openai.com/docs/models
3. **Clone repository structure**:
   ```bash
   mkdir textdigest && cd textdigest
   npm init -y
   npm install @google/generative-ai openai glob commander typescript --save
   mkdir -p src tests
   ```
4. **Generate code** following semantic markup patterns (8 files, 800 lines)
5. **Write tests** (tests/e2e.test.ts with 50 sample files)
6. **Build Docker** (Dockerfile + docker-compose.yml)
7. **Run evaluation** (evaluator.ts → check thresholds)
8. **Report to MCP Acceptance Expert** (submit structured logs)
9. **Await architect review** (corrections if needed)
10. **Deliver MVP** (commit code, push to GitHub)

---

## 📝 Decision Log

| Date       | Decision                              | Rationale                                      |
|------------|---------------------------------------|------------------------------------------------|
| 2025-11-29 | Batch size = 20 files                 | Balance LLM context window and latency         |
| 2025-11-29 | Max file size = 10MB                  | Avoid memory issues, focus on many small files |
| 2025-11-29 | No database, in-memory only           | Minimize complexity for CLI tool               |
| 2025-11-29 | Parallel batches = 3 max              | Balance throughput and API rate limits         |
| 2025-11-29 | Source linking required (90%)         | Core value: traceability over speed            |
| 2025-11-29 | Primary model: gemini-2.0-flash-exp   | Best cost/quality for summarization task       |
| 2025-11-29 | Fallback model: gpt-4o-mini           | Reliable alternative if Google fails           |
| 2025-11-29 | Docker single-stage                   | Simpler for CLI tool, no multi-stage needed    |

---

## ✅ Acceptance Criteria Summary

```yaml
Code Quality:
  - ✅ Max 8 TypeScript files (excluding tests)
  - ✅ Max 800 lines of core logic
  - ✅ All functions have semantic markup comments
  - ✅ No external database dependencies

Functionality:
  - ✅ Discovers .txt/.md/.log files from last 6 days
  - ✅ Processes 300 files in < 3 minutes
  - ✅ Generates digest.md with executive summary, file summaries, source index
  - ✅ Every fact has [source: path:line] tag (>= 90%)

Quality:
  - ✅ Evaluation passes: sourceLinked >= 0.90, coverage >= 0.80, confidence >= 0.75
  - ✅ E2E tests pass with 50 sample files
  - ✅ Docker builds and runs without errors

Usability:
  - ✅ One-command setup: docker-compose up
  - ✅ CLI has clear --help text
  - ✅ Error messages are actionable

Observability:
  - ✅ Structured JSON logs for all events
  - ✅ MCP Acceptance Expert validates logs
  - ✅ Evaluation metrics logged after generation
```

---

**End of Architect Prompt**  
**Implementor Agent**: Begin code generation following this specification.  
**Architect Agent**: Monitor progress, intervene on deviations.  
**MCP Acceptance Expert**: Parse logs, validate acceptance criteria.  
**Early Evaluator Agents**: Test in parallel (Functional, Usability, Performance, Quality).

**Target Delivery**: MVP in 2 hours (setup + implementation + testing + Docker).  
**Repository**: https://github.com/abezr/pdf-summarize (textdigest branch)  
**Success Definition**: All acceptance criteria pass, evaluation metrics >= thresholds, Docker runs without errors.
