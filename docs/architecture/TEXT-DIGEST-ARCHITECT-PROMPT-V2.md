# TextDigest AI Architect Prompt v2.0 (Knowledge Graph Edition)
**System Name**: TextDigest - Intelligent Text File Digest Generator with Knowledge Graph  
**Version**: 2.0.0  
**Date**: 2025-11-29  
**Target**: AI Architect Agent → Implementor Agent  
**Repository**: https://github.com/abezr/pdf-summarize (TextDigest module)

---

## 🎯 Core Mission

Build a **production-grade CLI tool** that:
1. **Discovers** all text files modified in the last 6 days from a target folder
2. **Scales to 800+ files** by using Knowledge Graph architecture (same as PDF processing)
3. **Intelligently handles large concatenated text** via graph-based context retrieval
4. **Summarizes** into a structured digest with key facts, insights, and statistics
5. **Preserves traceability** by linking every insight to source file paths
6. **Outputs** a readable `digest.md` with clickable file references

---

## 📦 System Scope

### ✅ IN SCOPE (Must Implement)

#### Core Features
- **File Discovery**: Scan folder recursively for `.txt`, `.md`, `.log` files modified in last 6 days
- **Scalability**: Support up to **800 files in a single batch**
- **Knowledge Graph Construction**: Build file relationship graph (same as PDF algorithm)
- **Adaptive Processing**:
  - **Small batches (< 50 files)**: Direct LLM summarization
  - **Large batches (50-800 files)**: Knowledge Graph → MCP retrieval → Summarization
- **Intelligent Text Size Detection**: Auto-detect when concatenated text exceeds thresholds
- **Graph-Based Context Management**: Let LLM retrieve specific files on-demand (MCP pattern)
- **Source Linking**: Every fact/insight links to original file path (e.g., `[source: ./logs/app.log:42]`)
- **Output Format**: Single `digest.md` file with:
  - Executive summary (top 10 insights across all files)
  - Cluster summaries (files grouped by topic/type)
  - Per-file summaries (for important files only)
  - Statistics (file count, total size, date range, topic distribution)
  - Source index (clickable links to all processed files)
- **CLI Interface**: `textdigest --folder ./logs --days 6 --output digest.md --max-files 800`
- **Docker Support**: One-command setup with `docker-compose up`
- **E2E Testing**: Automated test suite with 100+ sample files

#### Quality Attributes
- **Observability**: Structured logs (JSON), progress tracking, graph statistics, evaluation metrics
- **Reliability**: Graceful error handling (skip corrupted files, log issues)
- **Efficiency**: Process 800 files in < 5 minutes (graph-based optimization)
- **Maintainability**: Semantic markup, LLM-friendly code structure

### ❌ OUT OF SCOPE (Defer to v2.1)

- Binary file support (`.pdf`, `.docx`)
- File size limit > 10MB per file (warn and skip)
- Non-UTF8 encodings (only basic fallback to latin1)
- Version control integration (Git blame/history)
- Real-time monitoring (watch mode)
- Multi-language detection/translation
- Cloud storage integration (S3, GCS)
- Complex file type processing (`.json`, `.yaml`, `.xml`)

**Critical Requirement**: When concatenated text size is large (> 20K tokens), **automatically switch to Knowledge Graph mode** to prevent context window overflow and maintain quality.

---

## 🏗️ System Architecture

### Enhanced Design with Knowledge Graph

```yaml
Code Complexity:
  Max Files: 12 TypeScript files (up from 8, due to graph logic)
  Max Dependencies: 8 npm packages (added: graph libs, embeddings)
  Max Core Logic: 1500 lines (up from 800, due to graph construction)
  Max File Size: 250 lines per file
  No Database: Use in-memory graph structures

Structure:
  - src/
    # Core (from v1.0)
    - cli.ts                    # 150 lines: CLI entry, arg parsing
    - file-discovery.ts         # 120 lines: File scanning, date filtering
    - content-processor.ts      # 200 lines: Adaptive processing logic
    
    # Knowledge Graph (NEW)
    - graph-builder.ts          # 250 lines: Build file relationship graph
    - graph-types.ts            # 100 lines: Node/Edge interfaces
    - semantic-clustering.ts    # 200 lines: Topic clustering via embeddings
    - context-retriever.ts      # 180 lines: MCP-style retrieval tools
    
    # LLM & Output
    - llm-summarizer.ts         # 250 lines: LLM API calls, tool support
    - digest-builder.ts         # 150 lines: Markdown output generation
    - evaluator.ts              # 150 lines: Quality metrics, validation
    
    # Utilities
    - types.ts                  # 120 lines: All TypeScript interfaces
    - config.ts                 # 50 lines: Environment variables
  
  - tests/
    - e2e.test.ts               # End-to-end test with 100+ files
    - graph.test.ts             # Graph construction tests
  
  - Dockerfile                  # Single-stage, < 20 lines
  - docker-compose.yml          # Services: textdigest-cli only
  - README.md                   # Quick start, usage examples
```

### Enhanced Data Flow (7 Stages)

```mermaid
graph LR
    A[File Discovery] -->|FileMetadata[]| B[Content Extraction]
    B -->|FileContent[]| C{Text Size Check}
    C -->|Small Batch| D1[Direct LLM Summarization]
    C -->|Large Batch| D2[Knowledge Graph Construction]
    D2 -->|FileGraph| E[Semantic Clustering]
    E -->|Clusters| F[MCP-Style Retrieval]
    F -->|Context| G[Grounded Summarization]
    D1 --> H[Digest Generation]
    G --> H
    H -->|digest.md| I[Evaluation & Metrics]
```

---

## 🔬 Stage-by-Stage Architecture

### Stage 1: File Discovery (Unchanged)

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

### Stage 2: Content Extraction (Enhanced)

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
  tokenCount: number;        // NEW: Estimated tokens (word_count * 1.3)
  firstLine: string;         // NEW: For preview
  lastLine: string;          // NEW: For preview
  encoding: 'utf8' | 'latin1';
  error?: string;
}
```

---

### Stage 3: Adaptive Processing Decision (NEW)

**Goal**: Decide whether to use direct LLM or Knowledge Graph mode

```typescript
/**
 * @semantic-role adaptive-processing
 * @input FileContent[] - Extracted file contents
 * @output ProcessingMode - 'direct' | 'graph'
 * @algorithm
 * 1. Calculate total token count: sum(file.tokenCount)
 * 2. If totalTokens < 20,000 → 'direct' mode (simple batch processing)
 * 3. If totalTokens >= 20,000 → 'graph' mode (Knowledge Graph construction)
 * 4. Log decision with reasoning
 */
export function selectProcessingMode(files: FileContent[]): ProcessingMode {
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

### Stage 4a: Direct LLM Summarization (Small Batches)

**Goal**: For < 50 files, use simple batch processing (v1.0 approach)

```typescript
/**
 * @semantic-role direct-summarization
 * @input FileContent[] - Files to summarize (< 50)
 * @output FileSummary[] - Summaries with source links
 * @algorithm
 * 1. Group files into batches of 20
 * 2. For each batch, construct prompt with all file contents
 * 3. Call LLM with batch prompt
 * 4. Parse JSON response with summaries
 * 5. Validate: all summaries have [source: ...] tags
 */
export async function directSummarize(files: FileContent[]): Promise<FileSummary[]> {
  const batches = createBatches(files, 20);
  const summaries: FileSummary[] = [];
  
  for (const batch of batches) {
    const prompt = constructBatchPrompt(batch);
    const response = await llm.generateContent(prompt);
    const batchSummaries = parseSummaries(response);
    summaries.push(...batchSummaries);
  }
  
  return summaries;
}
```

---

### Stage 4b: Knowledge Graph Construction (Large Batches)

**Goal**: Build a file relationship graph (same algorithm as PDF processing)

```typescript
/**
 * @semantic-role graph-construction
 * @input FileContent[] - Files to process (50-800)
 * @output FileGraph - Graph with nodes/edges
 * @algorithm
 * 1. Create node for each file (type: FILE)
 * 2. Detect file relationships:
 *    - REFERENCE edges: File mentions another file
 *    - SEMANTIC edges: Topic similarity via embeddings
 *    - TEMPORAL edges: Files modified around same time
 *    - HIERARCHICAL edges: Files in same directory
 * 3. Build adjacency list for efficient traversal
 * 4. Log graph statistics (nodes, edges, density)
 */
export async function buildFileGraph(files: FileContent[]): Promise<FileGraph> {
  const graph: FileGraph = {
    nodes: new Map(),
    edges: [],
    clusters: [],
    metadata: {
      totalFiles: files.length,
      totalTokens: files.reduce((sum, f) => sum + f.tokenCount, 0),
      dateRange: [
        Math.min(...files.map(f => f.metadata.modifiedAt.getTime())),
        Math.max(...files.map(f => f.metadata.modifiedAt.getTime()))
      ]
    }
  };
  
  // 1. Create nodes
  for (const file of files) {
    const node: FileNode = {
      id: `file_${hash(file.metadata.path)}`,
      type: NodeType.FILE,
      filePath: file.metadata.path,
      content: file.content,
      metadata: {
        size: file.metadata.size,
        modifiedAt: file.metadata.modifiedAt,
        lineCount: file.lineCount,
        tokenCount: file.tokenCount,
        firstLine: file.firstLine,
        lastLine: file.lastLine
      },
      edges: [],
      embedding: null  // Will be populated in Stage 5
    };
    graph.nodes.set(node.id, node);
  }
  
  // 2. Detect REFERENCE edges (file mentions another file)
  for (const [nodeId, node] of graph.nodes) {
    const mentions = detectFileMentions(node.content, files);
    for (const mentionPath of mentions) {
      const targetNode = findNodeByPath(graph, mentionPath);
      if (targetNode) {
        node.edges.push({
          sourceNodeId: nodeId,
          targetNodeId: targetNode.id,
          type: EdgeType.REFERENCE,
          weight: 1.0,
          metadata: { referenceText: `Mentions ${mentionPath}` }
        });
      }
    }
  }
  
  // 3. Detect TEMPORAL edges (modified within 1 hour)
  const sortedNodes = Array.from(graph.nodes.values()).sort((a, b) => 
    a.metadata.modifiedAt.getTime() - b.metadata.modifiedAt.getTime()
  );
  
  for (let i = 0; i < sortedNodes.length - 1; i++) {
    const node = sortedNodes[i];
    const nextNode = sortedNodes[i + 1];
    const timeDiff = nextNode.metadata.modifiedAt.getTime() - node.metadata.modifiedAt.getTime();
    
    if (timeDiff < 3600000) {  // 1 hour in ms
      node.edges.push({
        sourceNodeId: node.id,
        targetNodeId: nextNode.id,
        type: EdgeType.TEMPORAL,
        weight: 1.0 - (timeDiff / 3600000),  // Closer = higher weight
        metadata: { timeDiffMs: timeDiff }
      });
    }
  }
  
  // 4. Detect HIERARCHICAL edges (same directory)
  for (const [nodeId, node] of graph.nodes) {
    const nodeDir = path.dirname(node.filePath);
    for (const [otherNodeId, otherNode] of graph.nodes) {
      if (nodeId === otherNodeId) continue;
      const otherDir = path.dirname(otherNode.filePath);
      
      if (nodeDir === otherDir) {
        node.edges.push({
          sourceNodeId: nodeId,
          targetNodeId: otherNodeId,
          type: EdgeType.HIERARCHICAL,
          weight: 1.0,
          metadata: { directory: nodeDir }
        });
      }
    }
  }
  
  logger.info('graph_constructed', {
    nodes: graph.nodes.size,
    edges: graph.edges.length,
    density: graph.edges.length / (graph.nodes.size * (graph.nodes.size - 1))
  });
  
  return graph;
}

// Types
interface FileGraph {
  nodes: Map<string, FileNode>;
  edges: Edge[];
  clusters: Cluster[];
  metadata: {
    totalFiles: number;
    totalTokens: number;
    dateRange: [number, number];
  };
}

interface FileNode {
  id: string;                    // Unique node ID
  type: NodeType.FILE;
  filePath: string;              // Relative file path
  content: string;               // File text content
  metadata: {
    size: number;
    modifiedAt: Date;
    lineCount: number;
    tokenCount: number;
    firstLine: string;
    lastLine: string;
  };
  edges: Edge[];
  embedding: number[] | null;    // Text embedding vector
}

interface Edge {
  sourceNodeId: string;
  targetNodeId: string;
  type: EdgeType;
  weight: number;                // 0.0 - 1.0
  metadata?: Record<string, any>;
}

enum EdgeType {
  REFERENCE = 'reference',       // File A mentions File B
  SEMANTIC = 'semantic',         // Topic similarity
  TEMPORAL = 'temporal',         // Modified around same time
  HIERARCHICAL = 'hierarchical'  // Same directory
}

enum NodeType {
  FILE = 'file'
}
```

**Key Insight**: This is the **same graph construction algorithm** used for PDF processing, but applied to files instead of PDF pages/sections!

---

### Stage 5: Semantic Clustering (Graph Mode Only)

**Goal**: Group files by topic using embeddings (like PDF clustering)

```typescript
/**
 * @semantic-role semantic-clustering
 * @input FileGraph - Graph with nodes
 * @output FileGraph - Graph with clusters
 * @algorithm
 * 1. Generate embeddings for each file's content
 * 2. Add SEMANTIC edges between similar files (cosine > 0.7)
 * 3. Run k-means clustering on embeddings (k = sqrt(n))
 * 4. Assign cluster labels to nodes
 * 5. Generate cluster summaries (topic labels)
 */
export async function clusterFiles(graph: FileGraph): Promise<FileGraph> {
  // 1. Generate embeddings
  for (const [nodeId, node] of graph.nodes) {
    const embedding = await generateEmbedding(node.content);
    node.embedding = embedding;
  }
  
  // 2. Add SEMANTIC edges
  const nodes = Array.from(graph.nodes.values());
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const similarity = cosineSimilarity(nodes[i].embedding!, nodes[j].embedding!);
      if (similarity > 0.7) {
        nodes[i].edges.push({
          sourceNodeId: nodes[i].id,
          targetNodeId: nodes[j].id,
          type: EdgeType.SEMANTIC,
          weight: similarity,
          metadata: { cosineSimilarity: similarity }
        });
      }
    }
  }
  
  // 3. K-means clustering
  const k = Math.ceil(Math.sqrt(nodes.length));
  const embeddings = nodes.map(n => n.embedding!);
  const clusterLabels = kmeans(embeddings, k);
  
  // 4. Assign clusters
  graph.clusters = [];
  for (let i = 0; i < k; i++) {
    const clusterNodes = nodes.filter((_, idx) => clusterLabels[idx] === i);
    graph.clusters.push({
      id: `cluster_${i}`,
      label: `Cluster ${i}`,  // Will be generated by LLM later
      nodeIds: clusterNodes.map(n => n.id),
      topicKeywords: extractKeywords(clusterNodes)
    });
  }
  
  logger.info('clustering_complete', {
    clusters: graph.clusters.length,
    avgClusterSize: graph.nodes.size / graph.clusters.length
  });
  
  return graph;
}

interface Cluster {
  id: string;
  label: string;                 // "Database Errors", "API Logs", etc.
  nodeIds: string[];             // File nodes in cluster
  topicKeywords: string[];       // Top keywords
}
```

---

### Stage 6: MCP-Style Context Retrieval (Graph Mode Only)

**Goal**: Let LLM request specific files on-demand (like PDF MCP pattern)

```typescript
/**
 * @semantic-role mcp-retrieval
 * @input FileGraph - Clustered graph
 * @output LLM Tools - Functions LLM can call
 * @algorithm
 * 1. Expose tools: get_file, get_cluster, get_related_files
 * 2. LLM receives cluster overview (minimal context)
 * 3. LLM calls tools to fetch specific files
 * 4. System returns file content + neighbors
 * 5. LLM summarizes with exact context needed
 */
export function createRetrievalTools(graph: FileGraph) {
  return [
    {
      name: 'get_file',
      description: 'Retrieve a specific file by path or node ID',
      parameters: {
        filePathOrId: 'string',
        includeNeighbors: 'boolean'  // Include related files
      },
      execute: async (args: any) => {
        const node = graph.nodes.get(args.filePathOrId) || 
                     findNodeByPath(graph, args.filePathOrId);
        
        if (!node) return { error: 'File not found' };
        
        const result: any = {
          file: {
            path: node.filePath,
            content: node.content,
            metadata: node.metadata
          }
        };
        
        if (args.includeNeighbors) {
          result.neighbors = node.edges.map(edge => {
            const neighbor = graph.nodes.get(edge.targetNodeId);
            return {
              path: neighbor?.filePath,
              relationship: edge.type,
              preview: neighbor?.metadata.firstLine
            };
          });
        }
        
        return result;
      }
    },
    {
      name: 'get_cluster',
      description: 'Retrieve all files in a topic cluster',
      parameters: {
        clusterId: 'string'
      },
      execute: async (args: any) => {
        const cluster = graph.clusters.find(c => c.id === args.clusterId);
        if (!cluster) return { error: 'Cluster not found' };
        
        const files = cluster.nodeIds.map(nodeId => {
          const node = graph.nodes.get(nodeId);
          return {
            path: node?.filePath,
            preview: node?.metadata.firstLine,
            size: node?.metadata.size,
            modifiedAt: node?.metadata.modifiedAt
          };
        });
        
        return {
          cluster: {
            label: cluster.label,
            keywords: cluster.topicKeywords,
            fileCount: files.length
          },
          files
        };
      }
    },
    {
      name: 'get_related_files',
      description: 'Find files related to a given file (by edges)',
      parameters: {
        filePath: 'string',
        edgeTypes: 'string[]'  // ['reference', 'semantic', 'temporal']
      },
      execute: async (args: any) => {
        const node = findNodeByPath(graph, args.filePath);
        if (!node) return { error: 'File not found' };
        
        const relatedEdges = node.edges.filter(edge => 
          !args.edgeTypes || args.edgeTypes.includes(edge.type)
        );
        
        const related = relatedEdges.map(edge => {
          const targetNode = graph.nodes.get(edge.targetNodeId);
          return {
            path: targetNode?.filePath,
            relationship: edge.type,
            weight: edge.weight,
            preview: targetNode?.metadata.firstLine
          };
        });
        
        return { relatedFiles: related };
      }
    }
  ];
}
```

**Key Insight**: This is the **same MCP pattern** from PDF processing! Instead of "get Table 3", we have "get file ./logs/app.log".

---

### Stage 7: Grounded Summarization

**Goal**: Generate digest with source traceability

#### For Direct Mode (< 50 files)

```typescript
const DIRECT_BATCH_PROMPT = `
You are summarizing a batch of recent text files.

# Files:
{{#each files}}
## File {{@index}}: {{this.path}}
Modified: {{this.modifiedAt}}
Size: {{this.size}} bytes

\`\`\`
{{this.content}}
\`\`\`
{{/each}}

# Task:
For EACH file, provide:
1. Summary (2-3 sentences)
2. Key Facts (3-5 bullets)
3. Insights (1-2 bullets)
4. Statistics (extract numbers, dates)

IMPORTANT: Every fact must cite source as [source: {{path}}:{{line}}]

# Output (JSON):
{
  "summaries": [
    {
      "file": "{{path}}",
      "summary": "...",
      "keyFacts": ["fact [source: path:42]", ...],
      "insights": ["..."],
      "statistics": {"key": "value"}
    }
  ]
}
`;
```

#### For Graph Mode (50-800 files)

```typescript
const GRAPH_INITIAL_PROMPT = `
You are summarizing a large collection of text files using a knowledge graph.

# File Overview:
- Total Files: {{totalFiles}}
- Date Range: {{dateRange}}
- Total Content: ~{{totalTokens}} tokens

# Clusters (Topics):
{{#each clusters}}
- {{this.label}} ({{this.nodeIds.length}} files): {{this.topicKeywords}}
{{/each}}

# Available Tools:
- get_file(filePathOrId, includeNeighbors): Retrieve specific file
- get_cluster(clusterId): Get all files in a topic cluster
- get_related_files(filePath, edgeTypes): Find related files

# Task:
1. Start by exploring clusters to understand main topics
2. Use tools to fetch specific files when needed
3. Generate executive summary with TOP 10 insights across all files
4. For each cluster, generate a cluster summary
5. Cite sources for EVERY claim: [source: path:line]

# Guidelines:
- Don't try to load all files at once (too large!)
- Explore graph intelligently (clusters first, then specific files)
- Focus on most important/recent files
- Maintain source traceability

Begin by calling get_cluster() for each cluster to understand topics.
`;
```

---

## 📊 Comparison: Direct vs Graph Mode

### Example: 800 Files, 150K Total Tokens

| Metric | Direct Mode | Graph Mode | Improvement |
|--------|------------|------------|-------------|
| **Context Tokens** | 150,000 (fails!) | 8,000-12,000 | **92% reduction** |
| **Processing Time** | N/A (too large) | 4-5 minutes | **Enables processing** |
| **Accuracy** | N/A | 95% | **High quality** |
| **Missing Files** | N/A | <5% | **Good coverage** |
| **Source Tracing** | N/A | 100% | **Full grounding** |
| **LLM Calls** | 1 (fails) | 20-30 | **Intelligent retrieval** |

**Key Insight**: Graph mode makes 800-file summarization **possible** and **efficient**!

---

## 🎯 Adaptive Processing Logic

```typescript
/**
 * Main processing function that selects mode adaptively
 */
export async function processFiles(files: FileContent[]): Promise<FileSummary[]> {
  const mode = selectProcessingMode(files);
  
  if (mode === 'direct') {
    logger.info('using_direct_mode', { files: files.length });
    return await directSummarize(files);
  } else {
    logger.info('using_graph_mode', { files: files.length });
    
    // Step 1: Build graph
    const graph = await buildFileGraph(files);
    
    // Step 2: Cluster files
    await clusterFiles(graph);
    
    // Step 3: Create retrieval tools
    const tools = createRetrievalTools(graph);
    
    // Step 4: LLM summarization with tools
    const summaries = await graphSummarize(graph, tools);
    
    return summaries;
  }
}
```

---

## 🛠️ Updated Tech Stack

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
    "typescript",
    // NEW for Knowledge Graph:
    "ml-kmeans",              // K-means clustering
    "compute-cosine-similarity",  // Embedding similarity
    "compromise"              // NLP for keyword extraction
  ],
  "deployment": "Docker (single-stage)",
  "testing": "E2E with 100+ sample files"
}
```

---

## 📋 Updated Success Criteria (MVP)

### Functional Requirements

```yaml
FR1: File Discovery
  - Input: Folder path, days threshold (6)
  - Output: Up to 800 files discovered
  - Pass: All matching files found, sorted by date

FR2: Adaptive Mode Selection
  - Input: FileContent[] with token counts
  - Output: 'direct' or 'graph' mode
  - Pass: Correct mode selected based on thresholds

FR3: Knowledge Graph Construction
  - Input: 50-800 files
  - Output: FileGraph with nodes, edges, clusters
  - Pass: Graph built with all edge types, < 10s

FR4: MCP-Style Retrieval
  - Input: LLM tool calls (get_file, get_cluster, get_related_files)
  - Output: Requested file content + neighbors
  - Pass: All tools work, return correct data

FR5: Grounded Summarization
  - Input: FileGraph OR FileContent[]
  - Output: FileSummary[] with source tags
  - Pass: >= 90% facts have [source: ...] tags

FR6: Digest Generation
  - Input: FileSummary[]
  - Output: digest.md with clusters, executive summary, source index
  - Pass: Markdown well-formatted, all links work

FR7: Scalability
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
  - Metric: >= 75% of files cited in digest (executive + clusters)
  - Pass: coverage >= 0.75 (relaxed from 80% due to 800 files)

QR3: LLM Confidence
  - Metric: Avg confidence >= 0.75
  - Pass: confidence >= 0.75

QR4: Graph Quality
  - Metric: Graph density 0.001 - 0.01 (sparse, efficient)
  - Pass: Density in range, all edge types present

QR5: Processing Efficiency
  - Metric: Process 800 files in < 5 minutes
  - Pass: actualTime <= 300s
```

---

## 🧠 Semantic Markup (Updated)

### Graph Function Example

```typescript
/**
 * Builds a knowledge graph from text files.
 * 
 * @semantic-role graph-construction
 * @input files: FileContent[] - Files to process (50-800)
 * @output FileGraph - Graph with nodes, edges, clusters
 * @throws GraphBuildError - If graph construction fails
 * 
 * @algorithm
 * 1. Create FILE node for each file
 * 2. Detect REFERENCE edges (file mentions)
 * 3. Detect TEMPORAL edges (modified around same time)
 * 4. Detect HIERARCHICAL edges (same directory)
 * 5. Build adjacency list
 * 6. Log graph statistics
 * 
 * @performance
 * - 100 files: ~2 seconds
 * - 800 files: ~8 seconds
 * - Memory: ~2MB per 100 files
 * 
 * @graph-structure
 * Nodes: FILE (one per text file)
 * Edges: REFERENCE, TEMPORAL, HIERARCHICAL, SEMANTIC
 * Density: ~0.005 (sparse, efficient)
 * 
 * @example
 * const files = await extractContent(metadata);
 * const graph = await buildFileGraph(files);
 * console.log(`Graph: ${graph.nodes.size} nodes, ${graph.edges.length} edges`);
 */
export async function buildFileGraph(files: FileContent[]): Promise<FileGraph> {
  // Implementation...
}
```

---

## 🚀 Updated CLI Interface

```bash
# Basic usage (auto-detect mode)
textdigest --folder ./logs --days 6 --output digest.md

# Force graph mode for large batches
textdigest --folder ./logs --days 6 --output digest.md --mode graph

# Limit max files
textdigest --folder ./logs --days 6 --output digest.md --max-files 800

# Adjust token threshold for graph mode
textdigest --folder ./logs --days 6 --graph-threshold 20000

# Enable graph visualization (for debugging)
textdigest --folder ./logs --days 6 --visualize-graph --output-graph graph.json

# Example output:
# ✓ Discovered 758 files (last 6 days)
# ✓ Total content: 142,380 tokens
# ℹ Mode: GRAPH (exceeds 20K threshold)
# ✓ Graph built: 758 nodes, 3,024 edges, 28 clusters
# ✓ Clustering complete: 28 topics identified
# ✓ LLM processing: 32 tool calls, 8,450 tokens used
# ✓ Digest generated: digest.md (15.2 KB)
# ✓ Evaluation: sourceLinked=0.94, coverage=0.81, confidence=0.88
# ✅ SUCCESS (processing time: 4m 23s)
```

---

## 📚 Example Digest Output (Graph Mode)

```markdown
# Text File Digest (Graph Mode)
**Generated**: 2025-11-29 14:30:00  
**Files Processed**: 758  
**Date Range**: 2025-11-23 to 2025-11-29  
**Processing Mode**: Knowledge Graph  
**Graph**: 758 nodes, 3,024 edges, 28 clusters

---

## 🎯 Executive Summary
Top 10 insights across all files:

1. **Database connection errors spiked on 2025-11-27** - 347 occurrences in logs/db-errors.log [source: logs/db-errors.log:234]
2. **API response times degraded 45% after deploy** - Median latency increased from 120ms to 174ms [source: logs/api-metrics.log:89]
3. **Memory usage trending upward** - From 2.1GB to 3.8GB over 6 days [source: logs/system-metrics.log:456]
4. **New feature "dark-mode" deployed on 2025-11-25** - Mentioned in 12 files [source: logs/deploy.log:67]
5. **User authentication failures increased 23%** - 1,234 failed logins vs 1,002 previous period [source: logs/auth.log:901]
...

---

## 📊 Cluster Summaries

### Cluster 1: Database Errors (87 files)
**Keywords**: connection, timeout, pool, query, deadlock  
**Date Range**: 2025-11-23 to 2025-11-29

Main issues:
- Connection pool exhaustion (42 files)
- Query timeouts on large tables (23 files)
- Deadlock detection spikes (12 files)

**Representative Files**:
- [logs/db-errors.log](logs/db-errors.log) - 347 errors
- [logs/postgres.log](logs/postgres.log) - Query performance degradation
- [logs/db-pool-metrics.log](logs/db-pool-metrics.log) - Pool utilization 95%+

---

### Cluster 2: API Performance (64 files)
**Keywords**: latency, response, timeout, http, endpoint  
**Date Range**: 2025-11-24 to 2025-11-29

...

---

## 🔗 Source Index
All 758 processed files (clickable links):

### logs/ (623 files)
- [logs/api-errors.log](logs/api-errors.log)
- [logs/api-metrics.log](logs/api-metrics.log)
- [logs/auth.log](logs/auth.log)
...

### docs/ (89 files)
...

### notes/ (46 files)
...
```

---

## ✅ Final Acceptance Criteria

```yaml
Code Quality:
  - ✅ Max 12 TypeScript files (graph logic added)
  - ✅ Max 1500 lines of core logic
  - ✅ All functions have semantic markup
  - ✅ Graph construction reuses PDF algorithm

Functionality:
  - ✅ Discovers up to 800 files from last 6 days
  - ✅ Adaptive mode: direct (< 50 files) or graph (50-800 files)
  - ✅ Knowledge Graph: nodes, 4 edge types, clusters
  - ✅ MCP-style retrieval: 3 tools (get_file, get_cluster, get_related_files)
  - ✅ Processes 800 files in < 5 minutes
  - ✅ Every fact has [source: path:line] tag (>= 90%)

Quality:
  - ✅ Evaluation: sourceLinked >= 0.90, coverage >= 0.75, confidence >= 0.75
  - ✅ Graph density 0.001 - 0.01 (efficient)
  - ✅ E2E tests with 100+ files
  - ✅ Docker builds and runs

Scalability:
  - ✅ Handles 800 files without errors
  - ✅ Memory usage < 1GB
  - ✅ Graceful degradation if graph mode fails (fallback to sampling)
```

---

## 🎓 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Reuse PDF graph algorithm | Proven approach, same principles apply |
| Adaptive mode (direct/graph) | Optimize for small batches, scale for large |
| 20K token threshold | Balance between modes, based on GPT-4o limit |
| 4 edge types | REFERENCE, SEMANTIC, TEMPORAL, HIERARCHICAL cover relationships |
| K-means clustering | Simple, fast, good for topic discovery |
| MCP-style retrieval | Let LLM request data on-demand (90% token savings) |
| 75% file coverage | Relaxed from 80% due to scale (800 files) |
| Max 800 files | Practical limit for 5-minute processing |

---

**End of Architect Prompt v2.0**

**Next Steps**:
1. Implementor Agent: Read this spec + PDF graph algorithm (KEY-ALGORITHM-EXPLAINED.md)
2. Generate code with graph construction (reuse PDF logic)
3. Test with 100, 500, 800 files
4. Validate: processing time < 5 min, quality metrics pass
5. Deliver MVP with both direct and graph modes

**Repository**: https://github.com/abezr/pdf-summarize  
**Related Docs**: [KEY-ALGORITHM-EXPLAINED.md](./KEY-ALGORITHM-EXPLAINED.md) (PDF graph algorithm)  
**Success**: Process 800 files in < 5 min with 90%+ source traceability
