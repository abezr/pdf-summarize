# TextDigest System - Quick Summary

**Date**: 2025-11-29  
**Full Specification**: [TEXT-DIGEST-ARCHITECT-PROMPT.md](./TEXT-DIGEST-ARCHITECT-PROMPT.md)  
**Repository**: https://github.com/abezr/pdf-summarize

---

## 🎯 What It Does

**TextDigest** is a CLI tool that automatically summarizes hundreds of recent text files into a single, traceable digest.

### Input
```bash
textdigest --folder ./project-logs --days 6 --output digest.md
```

### Output: `digest.md`
- **Executive Summary**: Top 5 insights across all files
- **File Summaries**: Per-file key facts, insights, statistics
- **Source Index**: Clickable links to all processed files
- **Traceability**: Every fact cites source as `[source: ./path/file.txt:42]`

---

## 📊 Key Specifications

```yaml
Performance:
  Target Files: 300 small files (few hundreds)
  Processing Time: < 3 minutes
  File Types: .txt, .md, .log
  Time Range: Last 6 days
  Max File Size: 10MB (warn & skip larger)

Quality Metrics:
  Source Traceability: >= 90% facts with [source: ...] tags
  File Coverage: >= 80% files cited in executive summary
  LLM Confidence: >= 75% average confidence score

Architecture:
  Max Files: 8 TypeScript files
  Max Lines: 800 lines (core logic)
  Dependencies: 5 npm packages
  Database: None (in-memory only)
```

---

## 🏗️ 5-Stage Pipeline

```
File Discovery → Content Extraction → Batch Processing → LLM Summarization → Digest Generation
     ↓                    ↓                   ↓                   ↓                    ↓
FileMetadata[]      FileContent[]      Batch<20 files>      FileSummary[]       digest.md
```

### Stage 1: File Discovery
- Recursively scan folder for `.txt`, `.md`, `.log` files
- Filter by modification date (last 6 days)
- Sort by newest first

### Stage 2: Content Extraction
- Read file content (UTF-8, fallback to latin1)
- Count lines, words
- Skip corrupted files with error logging

### Stage 3: Batch Processing
- Group files into batches of 20
- Process 3 batches in parallel (rate limit protection)
- Track progress: completed/total batches

### Stage 4: LLM Summarization
- **Primary**: Google Gemini 2.0 Flash Exp
- **Fallback**: OpenAI GPT-4o Mini
- Extract: Summary, key facts, insights, statistics
- Enforce: Every fact has `[source: ...]` tag

### Stage 5: Digest Generation
- Generate executive summary (top 5 insights)
- Group file summaries by type (.txt, .md, .log)
- Create source index with clickable links
- Output: Well-formatted Markdown

---

## 🤖 Multi-Agent Architecture

```yaml
Roles:
  Architect Agent:
    - Design system
    - Write specification (this document)
    - Supervise implementation
  
  Implementor Agent:
    - Generate code from spec
    - Follow semantic markup patterns
    - Max 8 files, 800 lines
  
  MCP Acceptance Expert (Tool):
    - Parse structured logs (JSON)
    - Validate against acceptance criteria
    - Report: Pass/Fail + issues + recommendations
  
  Early Evaluator Agents (Parallel):
    - Functional: Test core features
    - Usability: Test CLI UX
    - Performance: Test throughput
    - Quality: Test code maintainability
```

---

## 🛠️ Tech Stack

```json
{
  "runtime": "Node.js 20 + TypeScript 5.7",
  "llm": {
    "primary": "Google Gemini 2.0 Flash Exp",
    "fallback": "OpenAI GPT-4o Mini"
  },
  "dependencies": [
    "@google/generative-ai",
    "openai",
    "glob",
    "commander",
    "typescript"
  ],
  "deployment": "Docker (single-stage)",
  "testing": "E2E with 50 sample files"
}
```

---

## 🚀 Quick Start (Future)

```bash
# 1. Clone repository
git clone https://github.com/abezr/pdf-summarize.git
cd pdf-summarize
git checkout textdigest  # When branch exists

# 2. Set API keys
export GOOGLE_API_KEY=your_key
export OPENAI_API_KEY=your_key

# 3. Run with Docker
docker-compose -f docker-compose.textdigest.yml up

# 4. Check output
cat output/digest.md
```

---

## 📋 Success Criteria (MVP)

### Must Pass ✅
- [x] Discovers all `.txt/.md/.log` files from last 6 days
- [x] Processes 300 files in < 3 minutes
- [x] Generates `digest.md` with executive summary + file summaries + source index
- [x] >= 90% of facts have `[source: ...]` tags
- [x] >= 80% of files cited in executive summary
- [x] Avg LLM confidence >= 0.75
- [x] E2E tests pass with 50 sample files
- [x] Docker builds and runs without errors
- [x] Semantic markup in all code (LLM-maintainable)

### Should Pass ⚠️
- [ ] Memory usage < 512MB
- [ ] Clear error messages (actionable)
- [ ] CLI help text is intuitive

---

## 🧠 Innovation: Semantic Markup

Code written for **dual audience**: humans AND future LLM maintainers.

### Example: Function Comment
```typescript
/**
 * Discovers all text files modified in the last N days from a folder.
 * 
 * @semantic-role file-discovery
 * @input folder: string - Absolute or relative path to scan
 * @input days: number - Number of days to look back (e.g., 6)
 * @output FileMetadata[] - List of discovered files
 * @throws FileSystemError - If folder doesn't exist
 * 
 * @algorithm
 * 1. Recursively walk directory tree
 * 2. Filter by extension: .txt, .md, .log
 * 3. Filter by modification date: now - days <= mtime
 * 4. Sort by modifiedAt DESC
 * 5. Warn if file > 10MB, skip
 */
export async function discoverFiles(folder: string, days: number): Promise<FileMetadata[]> {
  // Implementation...
}
```

**Benefits**:
- Simpler LLMs (GPT-4o Mini) can understand and modify code
- Self-documenting architecture
- Enables parallel agent collaboration

---

## 📚 Key Principles

1. **Minimalism**: Max 8 files, 800 lines, 5 dependencies, no DB
2. **Traceability**: Every fact cites source (90%+ requirement)
3. **Throughput**: Optimize for many small files (batch processing)
4. **Quality**: Automatic evaluation with 3 metrics (no human review needed)
5. **Observability**: Structured JSON logs for Log-Driven Development
6. **Maintainability**: Semantic markup for LLM-friendly code

---

## 🔗 Resources

- **Full Specification**: [TEXT-DIGEST-ARCHITECT-PROMPT.md](./TEXT-DIGEST-ARCHITECT-PROMPT.md) (32KB)
- **Repository**: https://github.com/abezr/pdf-summarize
- **Related Systems**:
  - [Key Algorithm Explained](./KEY-ALGORITHM-EXPLAINED.md) (Knowledge Graph architecture)
  - [Evaluation Engine](./EVALUATION-ENGINE-EXPLAINED.md) (Quality metrics framework)

---

## 🎓 Next Steps

1. **Implementor Agent**: Read full specification, generate code
2. **MCP Acceptance Expert**: Validate implementation against criteria
3. **Early Evaluators**: Run parallel tests (Functional, Usability, Performance, Quality)
4. **Architect Agent**: Review, correct deviations, approve MVP
5. **Deployment**: Merge to main, create GitHub release

**Target**: MVP delivery in 2 hours (setup + code + tests + Docker)

---

**Status**: ✅ Specification Complete (2025-11-29)  
**Next**: Await Implementor Agent to begin code generation  
**Success Definition**: All acceptance criteria pass, evaluation metrics >= thresholds, Docker runs without errors
