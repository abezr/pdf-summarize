# TextDigest AI Architect Prompt v2.1 (Enhanced Content Analysis)
**System Name**: TextDigest - Intelligent Text File Digest Generator with Knowledge Graph  
**Version**: 2.1.0  
**Date**: 2025-11-29  
**Target**: AI Architect Agent → Implementor Agent  
**Repository**: https://github.com/abezr/pdf-summarize (TextDigest module)

---

## 🎯 Core Mission

Build a **production-grade CLI tool** that:
1. **Discovers** all text files modified in the last 6 days from a target folder
2. **Scales to 800+ files** by using Knowledge Graph architecture (same as PDF processing)
3. **Filters out law-specific content** (legal terms, case citations, regulations)
4. **Intelligently analyzes** most common patterns, most unusual observations, and long facts
5. **Generates LLM conclusions and recommendations** based on analyzed data
6. **Preserves traceability** by linking every insight to source file paths
7. **Outputs** a readable `digest.md` with actionable insights

---

## 📦 System Scope

### ✅ IN SCOPE (Must Implement)

#### Core Features
- **File Discovery**: Scan folder recursively for `.txt`, `.md`, `.log` files modified in last 6 days
- **Scalability**: Support up to **800 files in a single batch**
- **Content Filtering** (NEW):
  - **Law Content Detection**: Identify and exclude legal terms, case citations, statutes, regulations
  - **Keyword-based filtering**: Skip content with legal patterns (e.g., "USC §", "v.", "plaintiff", "defendant")
  - **Configurable exclusion list**: User can add custom legal terms to exclude
- **Knowledge Graph Construction**: Build file relationship graph (same as PDF algorithm)
- **Adaptive Processing**:
  - **Small batches (< 50 files)**: Direct LLM summarization
  - **Large batches (50-800 files)**: Knowledge Graph → MCP retrieval → Summarization
- **Enhanced Content Analysis** (NEW):
  - **Most Common Facts**: Identify frequently mentioned facts (frequency analysis)
  - **Most Unusual Facts**: Detect outliers and rare observations (TF-IDF, statistical anomalies)
  - **Long Facts**: Extract extended observations (>50 words) that contain detailed context
  - **LLM Conclusions**: Generate high-level conclusions from patterns
  - **LLM Recommendations**: Provide actionable recommendations based on insights
- **Source Linking**: Every fact/insight links to original file path (e.g., `[source: ./logs/app.log:42]`)
- **Output Format**: Single `digest.md` file with:
  - Executive summary (top 10 insights across all files)
  - **Most Common Facts** (top 15, with frequency counts)
  - **Most Unusual Facts** (top 10, with rarity scores)
  - **Long Facts** (top 5, with full context)
  - **LLM Conclusions** (3-5 high-level takeaways)
  - **LLM Recommendations** (3-5 actionable next steps)
  - Cluster summaries (files grouped by topic/type)
  - Statistics (file count, total size, date range, topic distribution, filtered content %)
  - Source index (clickable links to all processed files)
- **CLI Interface**: `textdigest --folder ./logs --days 6 --output digest.md --exclude-law --include-conclusions`
- **Docker Support**: One-command setup with `docker-compose up`
- **E2E Testing**: Automated test suite with 100+ sample files

#### Quality Attributes
- **Observability**: Structured logs (JSON), progress tracking, graph statistics, evaluation metrics
- **Reliability**: Graceful error handling (skip corrupted files, log issues)
- **Efficiency**: Process 800 files in < 5 minutes (graph-based optimization)
- **Maintainability**: Semantic markup, LLM-friendly code structure

### ❌ OUT OF SCOPE (Defer to v2.2)

- Binary file support (`.pdf`, `.docx`)
- File size limit > 10MB per file (warn and skip)
- Non-UTF8 encodings (only basic fallback to latin1)
- Version control integration (Git blame/history)
- Real-time monitoring (watch mode)
- Multi-language detection/translation
- Cloud storage integration (S3, GCS)
- Complex file type processing (`.json`, `.yaml`, `.xml`)
- Advanced legal document parsing (contracts, briefs)

**Critical Requirements**:
1. When concatenated text size is large (> 20K tokens), **automatically switch to Knowledge Graph mode**
2. **Law content filtering** is mandatory by default (can be disabled with `--include-law` flag)
3. **LLM conclusions and recommendations** are optional (enabled with `--include-conclusions` flag)

---

## 🏗️ System Architecture

### Enhanced Design with Knowledge Graph + Content Filtering

```yaml
Code Complexity:
  Max Files: 14 TypeScript files (up from 12, added filtering + analysis)
  Max Dependencies: 10 npm packages (added: NLP, TF-IDF, statistics)
  Max Core Logic: 1800 lines (up from 1500, due to filtering + analysis)
  Max File Size: 250 lines per file
  No Database: Use in-memory graph structures

Structure:
  - src/
    # Core (from v2.0)
    - cli.ts                    # 150 lines: CLI entry, arg parsing
    - file-discovery.ts         # 120 lines: File scanning, date filtering
    - content-processor.ts      # 220 lines: Adaptive processing + filtering logic
    
    # Content Filtering & Analysis (NEW)
    - content-filter.ts         # 180 lines: Law content detection & exclusion
    - fact-analyzer.ts          # 200 lines: Common, unusual, long facts extraction
    
    # Knowledge Graph (from v2.0)
    - graph-builder.ts          # 250 lines: Build file relationship graph
    - graph-types.ts            # 100 lines: Node/Edge interfaces
    - semantic-clustering.ts    # 200 lines: Topic clustering via embeddings
    - context-retriever.ts      # 180 lines: MCP-style retrieval tools
    
    # LLM & Output
    - llm-summarizer.ts         # 280 lines: LLM API calls, tool support, conclusions
    - digest-builder.ts         # 180 lines: Markdown output with new sections
    - evaluator.ts              # 150 lines: Quality metrics, validation
    
    # Utilities
    - types.ts                  # 140 lines: All TypeScript interfaces
    - config.ts                 # 60 lines: Environment variables + filter config
  
  - tests/
    - e2e.test.ts               # End-to-end test with 100+ files
    - graph.test.ts             # Graph construction tests
    - filter.test.ts            # NEW: Law content filtering tests
  
  - config/
    - legal-terms.json          # NEW: Legal keywords/patterns to exclude
  
  - Dockerfile                  # Single-stage, < 20 lines
  - docker-compose.yml          # Services: textdigest-cli only
  - README.md                   # Quick start, usage examples
```

### Enhanced Data Flow (9 Stages)

```mermaid
graph LR
    A[File Discovery] -->|FileMetadata[]| B[Content Extraction]
    B -->|FileContent[]| C[Law Content Filtering]
    C -->|FilteredContent[]| D{Text Size Check}
    D -->|Small Batch| E1[Direct LLM Summarization]
    D -->|Large Batch| E2[Knowledge Graph Construction]
    E2 -->|FileGraph| F[Semantic Clustering]
    F -->|Clusters| G[MCP-Style Retrieval]
    G -->|Context| H[Fact Analysis]
    H -->|Facts| I[Grounded Summarization + Conclusions]
    E1 --> H
    I --> J[Digest Generation]
    J -->|digest.md| K[Evaluation & Metrics]
```

---

## 🔬 Stage-by-Stage Architecture

### Stage 1: File Discovery (Unchanged from v2.0)

**Goal**: Find all text files modified in last 6 days

```typescript
/**
 * @semantic-role file-discovery
 * @input folder: string - Root folder to scan
 * @input days: number - Days to look back (default: 6)
 * @output FileMetadata[] - List of discovered files
 * @algorithm
 * 1. Recursively walk directory tree
 * 2. Filter by extension: .txt, .md, .log
 * 3. Filter by modification date: now - days <= mtime
 * 4. Sort by modifiedAt DESC (newest first)
 * 5. Warn if file > 10MB, skip
 */
export async function discoverFiles(folder: string, days: number): Promise<FileMetadata[]> {
  // Implementation...
}

interface FileMetadata {
  path: string;          // Relative path: ./logs/app.log
  size: number;          // Bytes
  modifiedAt: Date;      // Last modified timestamp
  type: 'txt' | 'md' | 'log';
}
```

---

### Stage 2: Content Extraction (Unchanged from v2.0)

**Goal**: Read files and calculate text size metrics

```typescript
/**
 * @semantic-role content-extraction
 * @input FileMetadata[] - Files to read
 * @output FileContent[] - File contents with metrics
 * @algorithm
 * 1. Read file with UTF-8 encoding
 * 2. Fallback to latin1 if UTF-8 fails
 * 3. Count lines, words, tokens (approximate)
 * 4. Extract key metadata (first/last lines, patterns)
 * 5. Log error and skip if both encodings fail
 */
export async function extractContent(files: FileMetadata[]): Promise<FileContent[]> {
  // Implementation...
}

interface FileContent {
  metadata: FileMetadata;
  content: string;           // UTF-8 text content
  lineCount: number;
  wordCount: number;
  tokenCount: number;        // Estimated tokens (word_count * 1.3)
  firstLine: string;         // For preview
  lastLine: string;          // For preview
  encoding: 'utf8' | 'latin1';
  error?: string;
}
```

---

### Stage 3: Law Content Filtering (NEW)

**Goal**: Detect and exclude law-specific content from analysis

```typescript
/**
 * @semantic-role content-filtering
 * @input FileContent[] - Raw file contents
 * @output FilteredContent[] - Contents with law content removed
 * @algorithm
 * 1. Load legal terms dictionary (legal-terms.json)
 * 2. For each file, detect legal patterns:
 *    - Case citations: "Smith v. Jones", "123 F.3d 456"
 *    - Statutes: "USC §", "U.S.C.", "CFR"
 *    - Legal terms: "plaintiff", "defendant", "appellant", "certiorari"
 *    - Document types: "brief", "motion", "complaint", "deposition"
 * 3. Remove sentences/paragraphs containing legal patterns
 * 4. Track filtered content percentage
 * 5. Log: files filtered, content removed (%)
 */
export async function filterLawContent(
  files: FileContent[],
  config: FilterConfig
): Promise<FilteredContent[]> {
  const legalTerms = await loadLegalTerms();
  const filtered: FilteredContent[] = [];
  
  for (const file of files) {
    if (config.excludeLaw) {
      const { cleanContent, removedPercentage } = removeLegalContent(
        file.content,
        legalTerms
      );
      
      filtered.push({
        ...file,
        originalContent: file.content,
        content: cleanContent,
        filteredPercentage: removedPercentage,
        filterApplied: true
      });
      
      logger.info('law_content_filtered', {
        file: file.metadata.path,
        removedPercentage,
        originalSize: file.content.length,
        filteredSize: cleanContent.length
      });
    } else {
      filtered.push({
        ...file,
        originalContent: file.content,
        filteredPercentage: 0,
        filterApplied: false
      });
    }
  }
  
  return filtered;
}

interface FilteredContent extends FileContent {
  originalContent: string;     // Before filtering
  filteredPercentage: number;  // % of content removed
  filterApplied: boolean;      // Was filter applied?
}

interface FilterConfig {
  excludeLaw: boolean;         // Default: true
  customLegalTerms?: string[]; // User-provided terms
}

// Legal patterns
const LEGAL_PATTERNS = [
  // Case citations
  /\b\w+\s+v\.?\s+\w+\b/gi,                    // "Smith v. Jones"
  /\b\d+\s+F\.\s?\d+d?\s+\d+\b/gi,             // "123 F.3d 456"
  /\b\d+\s+U\.S\.\s+\d+\b/gi,                  // "550 U.S. 544"
  
  // Statutes
  /\bU\.?S\.?C\.?\s+§?\s*\d+/gi,               // "USC § 1234"
  /\b\d+\s+C\.F\.R\.\s+§?\s*\d+/gi,            // "29 CFR 1910"
  
  // Legal terms (high confidence)
  /\b(plaintiff|defendant|appellant|appellee|petitioner|respondent)\b/gi,
  /\b(certiorari|habeas corpus|ex parte|amicus curiae)\b/gi,
  /\b(pursuant to|hereby|wherefore|heretofore)\b/gi,
  
  // Document types
  /\b(brief|motion|complaint|deposition|affidavit|summons)\b/gi,
];

function removeLegalContent(text: string, legalTerms: string[]): { cleanContent: string; removedPercentage: number } {
  const sentences = text.split(/[.!?]+/);
  const cleanSentences: string[] = [];
  let removedCount = 0;
  
  for (const sentence of sentences) {
    let isLegal = false;
    
    // Check against patterns
    for (const pattern of LEGAL_PATTERNS) {
      if (pattern.test(sentence)) {
        isLegal = true;
        break;
      }
    }
    
    // Check against keyword list
    if (!isLegal) {
      const lowerSentence = sentence.toLowerCase();
      for (const term of legalTerms) {
        if (lowerSentence.includes(term.toLowerCase())) {
          isLegal = true;
          break;
        }
      }
    }
    
    if (!isLegal) {
      cleanSentences.push(sentence);
    } else {
      removedCount++;
    }
  }
  
  const cleanContent = cleanSentences.join('. ');
  const removedPercentage = (removedCount / sentences.length) * 100;
  
  return { cleanContent, removedPercentage };
}
```

**Legal Terms Dictionary** (`config/legal-terms.json`):
```json
{
  "case_law": [
    "plaintiff", "defendant", "appellant", "appellee", "petitioner",
    "respondent", "litigant", "party", "counsel", "attorney"
  ],
  "procedural": [
    "motion", "brief", "complaint", "answer", "discovery",
    "deposition", "interrogatory", "subpoena", "summons", "writ"
  ],
  "jurisdictional": [
    "circuit court", "district court", "supreme court", "appellate court",
    "jurisdiction", "venue", "forum"
  ],
  "statutory": [
    "statute", "regulation", "ordinance", "code", "provision",
    "section", "subsection", "paragraph", "clause"
  ],
  "latin_terms": [
    "certiorari", "habeas corpus", "ex parte", "amicus curiae",
    "pro se", "de novo", "prima facie", "res judicata", "stare decisis"
  ]
}
```

---

### Stage 4: Adaptive Processing Decision (from v2.0)

**Goal**: Decide whether to use direct LLM or Knowledge Graph mode

```typescript
/**
 * @semantic-role adaptive-processing
 * @input FilteredContent[] - Filtered file contents
 * @output ProcessingMode - 'direct' | 'graph'
 * @algorithm
 * 1. Calculate total token count: sum(file.tokenCount)
 * 2. If totalTokens < 20,000 AND file_count < 50 → 'direct' mode
 * 3. If totalTokens >= 20,000 → 'graph' mode (Knowledge Graph construction)
 * 4. Log decision with reasoning
 */
export function selectProcessingMode(files: FilteredContent[]): ProcessingMode {
  const totalTokens = files.reduce((sum, f) => sum + f.tokenCount, 0);
  const fileCount = files.length;
  
  if (totalTokens < 20000 && fileCount < 50) {
    logger.info('processing_mode_selected', { 
      mode: 'direct', 
      reason: 'Small batch, can fit in context',
      totalTokens,
      fileCount
    });
    return 'direct';
  }
  
  logger.info('processing_mode_selected', { 
    mode: 'graph', 
    reason: 'Large batch or text size, using Knowledge Graph',
    totalTokens,
    fileCount,
    threshold: 20000
  });
  return 'graph';
}

type ProcessingMode = 'direct' | 'graph';
```

---

### Stage 5: Fact Analysis (NEW)

**Goal**: Extract common facts, unusual facts, and long facts from filtered content

```typescript
/**
 * @semantic-role fact-analysis
 * @input FilteredContent[] OR FileGraph - Filtered contents or graph
 * @output FactAnalysis - Categorized facts
 * @algorithm
 * 1. Extract all facts (assertions, observations, statements)
 * 2. Frequency Analysis:
 *    - Count fact occurrences across files
 *    - Identify top 15 most common facts
 * 3. Rarity Analysis (TF-IDF):
 *    - Calculate TF-IDF scores for facts
 *    - Identify top 10 most unusual facts (high TF-IDF)
 * 4. Length Analysis:
 *    - Find facts > 50 words (detailed observations)
 *    - Rank by length and relevance
 *    - Extract top 5 long facts
 * 5. Context Preservation:
 *    - Link each fact to source file + line
 *    - Include surrounding context (2 sentences before/after)
 */
export async function analyzeFacts(
  data: FilteredContent[] | FileGraph,
  config: AnalysisConfig
): Promise<FactAnalysis> {
  // Step 1: Extract facts
  const allFacts = extractFacts(data);
  
  // Step 2: Frequency analysis (most common)
  const factFrequency = new Map<string, FactOccurrence[]>();
  for (const fact of allFacts) {
    const normalized = normalizeFact(fact.text);
    if (!factFrequency.has(normalized)) {
      factFrequency.set(normalized, []);
    }
    factFrequency.get(normalized)!.push({
      file: fact.file,
      line: fact.line,
      context: fact.context
    });
  }
  
  const mostCommon = Array.from(factFrequency.entries())
    .map(([text, occurrences]) => ({
      text,
      frequency: occurrences.length,
      occurrences: occurrences.slice(0, 5), // Max 5 examples
      score: occurrences.length / allFacts.length // Normalized frequency
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15);
  
  // Step 3: Rarity analysis (TF-IDF for unusual facts)
  const tfidf = calculateTFIDF(allFacts);
  const mostUnusual = tfidf
    .filter(f => f.score > 0.5) // High TF-IDF = rare but important
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(f => ({
      text: f.text,
      rarityScore: f.score,
      file: f.file,
      line: f.line,
      context: f.context,
      explanation: `Unique observation, appears only ${f.frequency} time(s)`
    }));
  
  // Step 4: Length analysis (long facts)
  const longFacts = allFacts
    .filter(f => f.wordCount > 50) // Detailed observations
    .sort((a, b) => b.wordCount - a.wordCount)
    .slice(0, 5)
    .map(f => ({
      text: f.text,
      wordCount: f.wordCount,
      file: f.file,
      line: f.line,
      context: f.fullContext, // Include more context for long facts
      summary: f.text.substring(0, 100) + '...' // Preview
    }));
  
  logger.info('fact_analysis_complete', {
    totalFacts: allFacts.length,
    commonFacts: mostCommon.length,
    unusualFacts: mostUnusual.length,
    longFacts: longFacts.length
  });
  
  return {
    mostCommon,
    mostUnusual,
    longFacts,
    metadata: {
      totalFacts: allFacts.length,
      averageFactLength: allFacts.reduce((sum, f) => sum + f.wordCount, 0) / allFacts.length,
      uniqueFacts: factFrequency.size
    }
  };
}

interface FactAnalysis {
  mostCommon: CommonFact[];      // Top 15 frequent facts
  mostUnusual: UnusualFact[];    // Top 10 rare facts
  longFacts: LongFact[];         // Top 5 detailed facts
  metadata: {
    totalFacts: number;
    averageFactLength: number;
    uniqueFacts: number;
  };
}

interface CommonFact {
  text: string;
  frequency: number;             // How many times it appears
  occurrences: FactOccurrence[]; // Where it appears (max 5 examples)
  score: number;                 // Normalized frequency (0-1)
}

interface UnusualFact {
  text: string;
  rarityScore: number;           // TF-IDF score (higher = more unusual)
  file: string;
  line: number;
  context: string;               // Surrounding text
  explanation: string;           // Why it's unusual
}

interface LongFact {
  text: string;                  // Full detailed observation
  wordCount: number;             // Length
  file: string;
  line: number;
  context: string;               // Extended context
  summary: string;               // Brief preview
}

interface FactOccurrence {
  file: string;
  line: number;
  context: string;
}

// Helper: Extract facts from text
function extractFacts(data: FilteredContent[] | FileGraph): Fact[] {
  const facts: Fact[] = [];
  
  // If data is FilteredContent[]
  if (Array.isArray(data)) {
    for (const file of data) {
      const sentences = file.content.split(/[.!?]+/);
      sentences.forEach((sentence, idx) => {
        if (isFactualStatement(sentence)) {
          facts.push({
            text: sentence.trim(),
            file: file.metadata.path,
            line: estimateLineNumber(file.content, sentence),
            wordCount: sentence.split(/\s+/).length,
            context: getContext(sentences, idx),
            fullContext: getExtendedContext(sentences, idx)
          });
        }
      });
    }
  }
  // If data is FileGraph
  else {
    for (const [nodeId, node] of data.nodes) {
      const sentences = node.content.split(/[.!?]+/);
      sentences.forEach((sentence, idx) => {
        if (isFactualStatement(sentence)) {
          facts.push({
            text: sentence.trim(),
            file: node.filePath,
            line: estimateLineNumber(node.content, sentence),
            wordCount: sentence.split(/\s+/).length,
            context: getContext(sentences, idx),
            fullContext: getExtendedContext(sentences, idx)
          });
        }
      });
    }
  }
  
  return facts;
}

// Helper: Check if sentence is a factual statement
function isFactualStatement(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 10) return false; // Too short
  
  // Heuristics for factual statements:
  // - Contains numbers, dates, metrics
  // - Contains action verbs (increased, decreased, occurred)
  // - Contains specific entities (names, places, products)
  // - Doesn't start with question words
  
  const hasNumber = /\d+/.test(trimmed);
  const hasActionVerb = /(increased|decreased|occurred|changed|improved|degraded|detected|found|observed)/i.test(trimmed);
  const hasMetric = /(percent|%|MB|GB|ms|seconds|minutes|hours|days)/i.test(trimmed);
  const isQuestion = /^(what|when|where|why|how|who)\b/i.test(trimmed);
  
  return !isQuestion && (hasNumber || hasActionVerb || hasMetric);
}

// Helper: TF-IDF calculation
function calculateTFIDF(facts: Fact[]): Array<{ text: string; score: number; file: string; line: number; context: string; frequency: number }> {
  // TF: Term frequency within document
  // IDF: Inverse document frequency across all documents
  
  const documentFacts = new Map<string, Fact[]>(); // Group by file
  for (const fact of facts) {
    if (!documentFacts.has(fact.file)) {
      documentFacts.set(fact.file, []);
    }
    documentFacts.get(fact.file)!.push(fact);
  }
  
  const totalDocs = documentFacts.size;
  const factDocCount = new Map<string, number>(); // How many docs contain each fact
  
  for (const [file, fileFacts] of documentFacts) {
    const uniqueFacts = new Set(fileFacts.map(f => normalizeFact(f.text)));
    for (const fact of uniqueFacts) {
      factDocCount.set(fact, (factDocCount.get(fact) || 0) + 1);
    }
  }
  
  const tfidfScores: Array<{ text: string; score: number; file: string; line: number; context: string; frequency: number }> = [];
  
  for (const fact of facts) {
    const normalized = normalizeFact(fact.text);
    const tf = 1; // Simplified: each occurrence counts as 1
    const docFreq = factDocCount.get(normalized) || 1;
    const idf = Math.log(totalDocs / docFreq);
    const tfidf = tf * idf;
    
    tfidfScores.push({
      text: fact.text,
      score: tfidf,
      file: fact.file,
      line: fact.line,
      context: fact.context,
      frequency: docFreq
    });
  }
  
  return tfidfScores;
}

// Helper: Normalize fact for comparison
function normalizeFact(text: string): string {
  return text.toLowerCase()
    .replace(/\d+/g, '#')  // Replace numbers with #
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim();
}
```

---

### Stage 6: Grounded Summarization with Conclusions & Recommendations (ENHANCED)

**Goal**: Generate summary with LLM-derived conclusions and recommendations

```typescript
/**
 * @semantic-role grounded-summarization
 * @input FilteredContent[] OR FileGraph + FactAnalysis
 * @output DigestContent - Summary with conclusions/recommendations
 * @algorithm
 * 1. Generate file/cluster summaries (existing logic)
 * 2. If --include-conclusions flag:
 *    a. Synthesize patterns from mostCommon + mostUnusual facts
 *    b. Generate 3-5 high-level conclusions
 *    c. Generate 3-5 actionable recommendations
 * 3. Ensure all statements cite sources
 */
export async function generateDigestContent(
  data: FilteredContent[] | FileGraph,
  factAnalysis: FactAnalysis,
  config: DigestConfig
): Promise<DigestContent> {
  const summaries = await generateSummaries(data);
  
  let conclusions: Conclusion[] = [];
  let recommendations: Recommendation[] = [];
  
  if (config.includeConclusions) {
    // Generate conclusions from fact patterns
    const conclusionPrompt = `
Based on the following fact analysis, generate 3-5 high-level conclusions:

# Most Common Facts (patterns):
${factAnalysis.mostCommon.map((f, i) => `${i+1}. "${f.text}" (${f.frequency} occurrences)`).join('\n')}

# Most Unusual Facts (outliers):
${factAnalysis.mostUnusual.map((f, i) => `${i+1}. "${f.text}" (rarity: ${f.rarityScore.toFixed(2)})`).join('\n')}

# Long Facts (detailed observations):
${factAnalysis.longFacts.map((f, i) => `${i+1}. ${f.summary}`).join('\n')}

Generate conclusions that:
1. Identify root causes or systemic patterns
2. Highlight critical trends or anomalies
3. Connect related observations
4. Are specific and evidence-based
5. Cite sources for each conclusion

Format (JSON):
{
  "conclusions": [
    {
      "title": "Brief conclusion title",
      "description": "2-3 sentence explanation",
      "evidence": ["fact1", "fact2"],
      "sources": ["file:line", ...]
    }
  ]
}
`;
    
    const conclusionResponse = await llm.generateContent(conclusionPrompt);
    conclusions = parseConclusionsJSON(conclusionResponse);
    
    // Generate recommendations based on conclusions
    const recommendationPrompt = `
Based on these conclusions, generate 3-5 actionable recommendations:

# Conclusions:
${conclusions.map((c, i) => `${i+1}. ${c.title}: ${c.description}`).join('\n')}

Generate recommendations that:
1. Are specific and actionable
2. Address identified issues or opportunities
3. Prioritize by impact/urgency
4. Include measurable outcomes
5. Are realistic to implement

Format (JSON):
{
  "recommendations": [
    {
      "title": "Brief recommendation",
      "description": "Specific action to take",
      "rationale": "Why this is important",
      "priority": "high|medium|low",
      "impact": "Expected outcome"
    }
  ]
}
`;
    
    const recommendationResponse = await llm.generateContent(recommendationPrompt);
    recommendations = parseRecommendationsJSON(recommendationResponse);
    
    logger.info('conclusions_generated', {
      conclusions: conclusions.length,
      recommendations: recommendations.length
    });
  }
  
  return {
    summaries,
    factAnalysis,
    conclusions,
    recommendations,
    metadata: {
      totalFiles: Array.isArray(data) ? data.length : data.nodes.size,
      filteredContentPercentage: calculateAverageFilteredPercentage(data),
      lawContentExcluded: config.excludeLaw
    }
  };
}

interface DigestContent {
  summaries: FileSummary[];
  factAnalysis: FactAnalysis;
  conclusions: Conclusion[];
  recommendations: Recommendation[];
  metadata: {
    totalFiles: number;
    filteredContentPercentage: number;
    lawContentExcluded: boolean;
  };
}

interface Conclusion {
  title: string;              // Brief title
  description: string;        // 2-3 sentence explanation
  evidence: string[];         // Supporting facts
  sources: string[];          // [source: file:line]
  confidence: number;         // 0-1 (LLM confidence)
}

interface Recommendation {
  title: string;              // Brief recommendation
  description: string;        // Specific action
  rationale: string;          // Why important
  priority: 'high' | 'medium' | 'low';
  impact: string;             // Expected outcome
}
```

---

### Stage 7: Digest Generation (ENHANCED)

**Goal**: Generate final Markdown with new sections

```typescript
/**
 * @semantic-role digest-generation
 * @input DigestContent - All analyzed content
 * @output digest.md - Enhanced Markdown file
 */
export async function generateDigest(content: DigestContent): Promise<string> {
  const template = `
# Text File Digest
**Generated**: {{metadata.generatedAt}}  
**Files Processed**: {{metadata.totalFiles}}  
**Date Range**: {{metadata.dateRange}}  
**Law Content Excluded**: {{metadata.lawContentExcluded ? 'Yes' : 'No'}} ({{metadata.filteredContentPercentage}}% filtered)

---

## 🎯 Executive Summary
Top 10 insights across all files:

{{#each executiveSummary}}
{{@index}}. {{this}}
{{/each}}

---

## 📊 Most Common Facts
Facts that appear frequently across multiple files:

{{#each factAnalysis.mostCommon}}
### {{@index}}. {{this.text}} 
**Frequency**: {{this.frequency}} occurrences ({{this.score * 100}}%)  
**Examples**:
{{#each this.occurrences}}
- [{{this.file}}:{{this.line}}]({{this.file}}) - "{{this.context}}"
{{/each}}

{{/each}}

---

## 🔍 Most Unusual Facts
Rare but important observations:

{{#each factAnalysis.mostUnusual}}
### {{@index}}. {{this.text}}
**Rarity Score**: {{this.rarityScore}} (higher = more unusual)  
**Source**: [{{this.file}}:{{this.line}}]({{this.file}})  
**Context**: {{this.context}}  
**Why Unusual**: {{this.explanation}}

{{/each}}

---

## 📝 Long Facts (Detailed Observations)
Extended observations with rich context:

{{#each factAnalysis.longFacts}}
### {{@index}}. {{this.summary}}
**Length**: {{this.wordCount}} words  
**Source**: [{{this.file}}:{{this.line}}]({{this.file}})

**Full Text**:
> {{this.text}}

**Context**:
{{this.context}}

{{/each}}

---

{{#if conclusions}}
## 💡 Conclusions (LLM-Generated)
High-level takeaways synthesized from patterns:

{{#each conclusions}}
### {{@index}}. {{this.title}}
{{this.description}}

**Evidence**:
{{#each this.evidence}}
- {{this}}
{{/each}}

**Sources**: {{#each this.sources}}[{{this}}]({{this}}){{/each}}  
**Confidence**: {{this.confidence * 100}}%

{{/each}}
{{/if}}

---

{{#if recommendations}}
## 🚀 Recommendations (LLM-Generated)
Actionable next steps based on analysis:

{{#each recommendations}}
### {{@index}}. {{this.title}} (Priority: {{this.priority}})
{{this.description}}

**Rationale**: {{this.rationale}}  
**Expected Impact**: {{this.impact}}

{{/each}}
{{/if}}

---

## 📈 Cluster Summaries
Files grouped by topic:

{{#each clusterSummaries}}
### Cluster {{@index}}: {{this.label}} ({{this.fileCount}} files)
**Keywords**: {{this.keywords}}

{{this.summary}}

**Representative Files**:
{{#each this.representativeFiles}}
- [{{this.path}}]({{this.path}})
{{/each}}

{{/each}}

---

## 📋 Statistics
- **Total Files**: {{metadata.totalFiles}}
- **Total Size**: {{formatBytes metadata.totalSize}}
- **Date Range**: {{formatDate metadata.dateRange[0]}} to {{formatDate metadata.dateRange[1]}}
- **Law Content Excluded**: {{metadata.lawContentExcluded ? 'Yes' : 'No'}}
- **Content Filtered**: {{metadata.filteredContentPercentage}}%
- **Total Facts Analyzed**: {{factAnalysis.metadata.totalFacts}}
- **Unique Facts**: {{factAnalysis.metadata.uniqueFacts}}
- **Conclusions Generated**: {{conclusions.length}}
- **Recommendations Generated**: {{recommendations.length}}

---

## 🔗 Source Index
All {{metadata.totalFiles}} processed files:

{{#each sourceIndex}}
- [{{this}}]({{this}})
{{/each}}

---

**Generated by TextDigest v2.1**
`;

  return renderTemplate(template, content);
}
```

---

## 📋 Updated Success Criteria (MVP v2.1)

### Functional Requirements

```yaml
FR1: File Discovery
  - Input: Folder path, days threshold (6)
  - Output: Up to 800 files discovered
  - Pass: All matching files found, sorted by date

FR2: Law Content Filtering
  - Input: FileContent[] with potential legal content
  - Output: FilteredContent[] with law content removed
  - Pass: >= 90% of legal sentences detected and removed

FR3: Fact Analysis
  - Input: FilteredContent[] OR FileGraph
  - Output: FactAnalysis (common, unusual, long facts)
  - Pass: Correct categorization, accurate frequency/rarity scores

FR4: Adaptive Mode Selection
  - Input: FilteredContent[] with token counts
  - Output: 'direct' or 'graph' mode
  - Pass: Correct mode selected based on thresholds

FR5: Knowledge Graph Construction (when graph mode)
  - Input: 50-800 files
  - Output: FileGraph with nodes, edges, clusters
  - Pass: Graph built with all edge types, < 10s

FR6: MCP-Style Retrieval (when graph mode)
  - Input: LLM tool calls
  - Output: Requested file content + neighbors
  - Pass: All tools work, return correct data

FR7: Conclusions & Recommendations (optional)
  - Input: FactAnalysis
  - Output: 3-5 conclusions, 3-5 recommendations
  - Pass: Conclusions are evidence-based, recommendations are actionable

FR8: Digest Generation
  - Input: DigestContent
  - Output: digest.md with all sections
  - Pass: Markdown well-formatted, all new sections present

FR9: Scalability
  - Input: 800 files, 150K tokens
  - Output: Complete digest in < 5 minutes
  - Pass: Process successfully without errors
```

### Quality Requirements

```yaml
QR1: Source Traceability
  - Metric: >= 90% of facts have [source: path:line] tags
  - Pass: sourceLinked >= 0.90

QR2: File Coverage
  - Metric: >= 75% of files cited in digest
  - Pass: coverage >= 0.75

QR3: Law Content Filtering Accuracy
  - Metric: >= 90% precision (correct legal detection)
  - Metric: >= 85% recall (minimal false negatives)
  - Pass: precision >= 0.90, recall >= 0.85

QR4: Fact Analysis Quality
  - Metric: Common facts appear in >= 3 files
  - Metric: Unusual facts have TF-IDF > 0.5
  - Metric: Long facts > 50 words
  - Pass: All thresholds met

QR5: LLM Conclusion Quality (if enabled)
  - Metric: Conclusions cite >= 2 pieces of evidence
  - Metric: Recommendations have clear priority
  - Pass: All conclusions/recommendations meet criteria

QR6: Processing Efficiency
  - Metric: Process 800 files in < 5 minutes
  - Pass: actualTime <= 300s
```

---

## 🛠️ Updated CLI Interface

```bash
# Basic usage with law filtering (default)
textdigest --folder ./logs --days 6 --output digest.md

# Disable law filtering
textdigest --folder ./logs --days 6 --output digest.md --include-law

# Enable LLM conclusions and recommendations
textdigest --folder ./logs --days 6 --output digest.md --include-conclusions

# Full features
textdigest --folder ./logs --days 6 --output digest.md \
  --exclude-law \
  --include-conclusions \
  --max-files 800 \
  --graph-threshold 20000

# Custom legal terms
textdigest --folder ./logs --days 6 --output digest.md \
  --exclude-law \
  --legal-terms "contract,agreement,clause"

# Example output:
# ✓ Discovered 758 files (last 6 days)
# ✓ Law content filtered: 87 files affected (12.4% content removed)
# ✓ Total content: 125,340 tokens (after filtering)
# ℹ Mode: GRAPH (exceeds 20K threshold)
# ✓ Graph built: 758 nodes, 3,024 edges, 28 clusters
# ✓ Fact analysis: 1,234 facts (427 common, 89 unusual, 23 long)
# ✓ LLM processing: 32 tool calls, 8,450 tokens used
# ✓ Conclusions generated: 4 high-level takeaways
# ✓ Recommendations generated: 5 actionable next steps
# ✓ Digest generated: digest.md (24.7 KB)
# ✓ Evaluation: sourceLinked=0.93, coverage=0.79, lawFilterAccuracy=0.94
# ✅ SUCCESS (processing time: 4m 38s)
```

---

## 🔗 Updated Dependencies

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.22.0",
    "openai": "^4.72.0",
    "glob": "^11.0.0",
    "commander": "^12.1.0",
    "typescript": "^5.7.2",
    // NEW for v2.1:
    "ml-kmeans": "^6.0.0",                  // K-means clustering
    "compute-cosine-similarity": "^1.1.0",  // Embedding similarity
    "compromise": "^14.14.2",               // NLP (fact extraction)
    "natural": "^7.0.7",                    // TF-IDF calculation
    "stopword": "^3.1.1"                    // Remove stop words
  }
}
```

---

## ✅ Summary of v2.1 Enhancements

### New Features

1. **Law Content Filtering**:
   - Detects legal terms, case citations, statutes
   - Configurable exclusion (default: ON)
   - Tracks filtered content percentage

2. **Enhanced Fact Analysis**:
   - **Most Common Facts** (top 15): Frequency analysis
   - **Most Unusual Facts** (top 10): TF-IDF rarity scoring
   - **Long Facts** (top 5): Detailed observations (>50 words)

3. **LLM Conclusions & Recommendations**:
   - High-level conclusions from patterns (3-5)
   - Actionable recommendations (3-5)
   - Evidence-based with source citations

4. **Enhanced Digest Output**:
   - New sections: Common, Unusual, Long Facts
   - Optional: Conclusions, Recommendations
   - Statistics on filtered content

### Architecture Changes

- **+2 files**: `content-filter.ts`, `fact-analyzer.ts`
- **+3 dependencies**: `natural`, `stopword`, `compromise`
- **+300 lines**: Filtering (180) + Analysis (200) + Digest updates (80)

### Quality Improvements

- **Law filtering accuracy**: >= 90% precision, >= 85% recall
- **Fact categorization**: Frequency, rarity, length metrics
- **LLM insights**: Evidence-based conclusions, prioritized recommendations

---

**End of Architect Prompt v2.1**

**Status**: v2.1 Specification Complete  
**Next**: Implementor Agent to generate code with filtering + analysis  
**Target**: MVP in 3-4 hours (added complexity from filtering + fact analysis)  
**Repository**: https://github.com/abezr/pdf-summarize
