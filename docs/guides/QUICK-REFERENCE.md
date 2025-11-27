# PDF Summary AI - Quick Reference Guide

**One-page cheat sheet for reviewers and implementers**

---

## Core Innovation: Knowledge Graph vs String Processing

| Traditional Approach | Our Graph Approach |
|---------------------|-------------------|
| PDF → Long String → Chunk → Summarize | PDF → Graph (Nodes + Edges) → Context-Aware Summarize |
| "Lost in the Middle" problem | Precise node lookup |
| No reference tracking | "see Table 1" → Graph edge → Retrieve table |
| Hallucination-prone | Every statement grounded to Node ID |
| Context window limits | Neighborhood retrieval (only relevant nodes) |

**Key Insight**: Treat the PDF like a human reader who can "flip pages" and "look up references"

---

## System Architecture (C4 Levels)

### L1: System Context
```
User → [PDF Summary AI] → OpenAI/GCP
                       ↓
              PostgreSQL, Redis, S3
```

### L2: Containers
```
React SPA → API Gateway → Processing Service → Evaluation Service
                             ↓
                    PostgreSQL + Redis + S3
                             ↓
                    Prometheus + Grafana
```

### L3: Components (Processing Service)
```
1. PDF Parser      → Extract text, tables, images
2. Graph Builder   → Create nodes + edges
3. Semantic        → Embeddings + clustering
4. MCP Retriever   → Neighborhood lookup
5. AI Orchestrator → Summarize with grounding
```

---

## Graph Data Model

### Node Types
- **TEXT**: Paragraphs, sections
- **TABLE**: Structured data with caption
- **IMAGE**: Visual content with OCR
- **SECTION**: Hierarchical structure (H1-H6)

### Edge Types
- **HIERARCHICAL**: Parent-child (Section → Paragraph)
- **REFERENCE**: Cross-reference ("see Table 1")
- **SEMANTIC**: Topic similarity (cosine similarity > 0.75)
- **SEQUENTIAL**: Document flow (next paragraph)

### Data Structure
```typescript
interface GraphNode {
  id: string;                    // "node_p1_s3"
  type: NodeType;                // TEXT, TABLE, IMAGE
  content: string;               // Raw content
  metadata: { page, bbox, ... };
  embedding?: number[];          // 1536-dim vector
  cluster?: string;              // "financial", "legal"
  edges: Edge[];                 // Outgoing connections
}

interface Edge {
  targetNodeId: string;
  type: EdgeType;
  weight?: number;               // For semantic edges
  metadata?: { referenceText, confidence };
}
```

---

## MCP (Model Context Protocol) Pattern

**Traditional RAG**:
```
Query → Vector Search → Top-K chunks → LLM
Problem: LLM doesn't know about related tables/images
```

**MCP Approach**:
```
Query → LLM with tools → LLM calls get_related_node("table_1") 
     → Retriever returns table + neighbors → LLM uses it
```

**Example Tool**:
```typescript
{
  name: "get_related_node",
  description: "Retrieve a node and its neighborhood",
  parameters: {
    nodeId: string,
    depth: integer (default: 1)
  }
}
```

**Why Better**:
- LLM decides what to look up (not pre-determined)
- Retrieves related context (neighbors), not just the node
- Saves tokens (only fetch when needed)

---

## Grounding & Precision

Every summary statement includes:
```
"Revenue grew 25% in Q4 2024." [Node: table_1, Page 2]
                                 ↑
                         Traceable to source
```

**Metrics**:
- **Grounding Score**: % statements with node references
- **Coverage Score**: % important nodes used in summary
- **Faithfulness**: LLM output matches source (RAGAS)
- **Context Precision**: No irrelevant info included

---

## Implementation Priorities

### Phase 1: Core (2-3 hours)
| Priority | Feature | Time |
|----------|---------|------|
| P0 | PDF text extraction | 30 min |
| P0 | Basic graph (text nodes) | 40 min |
| P0 | OpenAI summarization | 30 min |
| P0 | Upload API + Frontend | 50 min |
| P0 | Docker setup | 20 min |
| P0 | README | 15 min |

### Phase 2: Advanced (Demo/Future)
- Table detection (Camelot/Tabula)
- Reference edge detection (regex patterns)
- Embeddings + clustering (K-means)
- MCP function calling
- RAGAS evaluation
- WebSocket progress
- Grafana dashboards

---

## Tech Stack Quick Start

### Backend
```bash
npm install express typescript ts-node
npm install pdf-parse openai pg redis
npm install @types/express @types/node
```

### Frontend
```bash
npm create vite@latest . -- --template react-ts
npm install axios zustand tailwindcss
```

### Docker
```bash
docker-compose up --build
```

---

## Key Algorithms

### 1. Reference Detection
```typescript
const patterns = [
  /(?:see|refer to)\s+(Table|Figure)\s+(\d+)/gi,
  /\((Table|Figure)\s+(\d+)\)/gi,
];

for (const match of text.matchAll(pattern)) {
  const targetNode = findNodeByTypeAndNumber(match[1], match[2]);
  createEdge(sourceNode, targetNode, EdgeType.REFERENCE);
}
```

### 2. Semantic Edge Detection
```typescript
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    const similarity = cosineSimilarity(
      nodes[i].embedding,
      nodes[j].embedding
    );
    
    if (similarity >= 0.75) {
      createEdge(nodes[i], nodes[j], EdgeType.SEMANTIC, similarity);
    }
  }
}
```

### 3. MCP Context Retrieval
```typescript
function getRelatedNode(nodeId: string, depth: number = 1): MCPContext {
  const node = graph.nodes.get(nodeId);
  const neighbors = breadthFirstSearch(node, depth);
  
  return {
    node,
    neighbors,
    totalTokens: estimateTokens([node, ...neighbors]),
  };
}
```

---

## Observability Stack

### Metrics (Prometheus)
```typescript
// Counters
documents_processed_total{status="success"}
tool_calls_executed_total{tool_name="get_related_node"}

// Histograms
pdf_processing_duration_seconds{stage="graph_build"}
document_graph_nodes_count
llm_tokens_used{model="gpt-4o"}

// Gauges
pdf_processing_jobs_active
summary_evaluation_score{metric_name="faithfulness"}
```

### Tracing (OpenTelemetry)
```typescript
Span: PDF Upload → Parse → Graph Build → Summarize
Attributes: {
  document_id: "doc_123",
  page_count: 25,
  node_count: 142,
  edge_count: 389
}
```

### Evaluation (RAGAS)
```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy

results = evaluate(
    question="Summarize this document",
    answer=summary,
    contexts=[node1.content, node2.content, ...],
    metrics=[faithfulness, answer_relevancy]
)
```

---

## API Quick Reference

### POST /api/upload
```bash
curl -X POST http://localhost:4000/api/upload \
  -F "pdf=@document.pdf"
```

**Response**:
```json
{
  "documentId": "doc_1234567890_abc",
  "filename": "document.pdf",
  "summary": "This document discusses...",
  "metadata": {
    "pages": 25,
    "nodes": 142,
    "tokensUsed": 3500,
    "processingTime": 8234
  }
}
```

### GET /api/health
```bash
curl http://localhost:4000/api/health
```

---

## Job Alignment Checklist

### Senior Full-Stack Developer Requirements

| Requirement | ✅ Implementation |
|-------------|------------------|
| TypeScript primary | Backend + Frontend both TS |
| Node.js backend | Express + TypeScript |
| React frontend | React 18 + Vite |
| AI/LLM experience | OpenAI GPT-4o integration |
| Prompt engineering | System prompts + MCP tools |
| Graph data structures | Adjacency list, node indexing |
| Data extraction | PDF → Graph pipeline |
| AWS/GCP services | S3 storage, optional Vertex AI |
| WebSocket | Real-time progress updates |
| Debugging | Structured logging, tracing |
| Docker | Docker Compose setup |
| Neo4j/graph DBs | In-memory graph (extensible) |

---

## Demo Script (5-7 min)

1. **Intro** (30s): Name, project overview, key innovation
2. **Architecture** (1m): Show C4 diagrams, explain graph approach
3. **Live Demo** (2m): Upload PDF, show summary with metadata
4. **Code Walk** (2m): Parser → Graph → OpenAI → API
5. **Advanced** (1m): Show Phase 2 designs (tables, MCP, RAGAS)
6. **Docker** (30s): `docker-compose up`, reproducible setup
7. **Wrap-up** (30s): Job alignment, thank you

---

## Common Interview Questions

### Q: Why graph over string processing?
**A**: Precision and context. Graph allows the AI to "look up" referenced content (tables, images) just like a human reader. No "lost in the middle" problem.

### Q: How do you handle large PDFs?
**A**: 
1. Streaming parsing (not load all into memory)
2. Selective context retrieval (only fetch relevant nodes)
3. Token budget management (limit context window)
4. Redis caching (avoid re-computation)

### Q: What's MCP?
**A**: Model Context Protocol - pattern where LLM can call tools (functions) to retrieve specific context. Instead of feeding everything upfront, LLM asks "give me Table 1" when needed.

### Q: How do you ensure summary accuracy?
**A**: 
1. Grounding (every statement has source node reference)
2. RAGAS metrics (faithfulness, answer relevancy)
3. Custom metrics (coverage score, grounding score)
4. Benchmarking against human summaries

### Q: Scalability?
**A**: 
1. Async processing (queue-based)
2. Redis caching (graphs, embeddings)
3. Horizontal scaling (multiple workers)
4. Batch embedding generation
5. Cloud storage (S3 for PDFs, RDS for metadata)

---

## Troubleshooting

### PDF parsing fails
```typescript
// Check file size
if (file.size > 50 * 1024 * 1024) {
  throw new Error('File too large (max 50MB)');
}

// Check mime type
if (file.mimetype !== 'application/pdf') {
  throw new Error('Only PDF files allowed');
}
```

### OpenAI rate limits
```typescript
// Implement retry with exponential backoff
async function callOpenAIWithRetry(params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await openai.chat.completions.create(params);
    } catch (error) {
      if (error.status === 429) {
        await sleep(2 ** i * 1000); // 1s, 2s, 4s
        continue;
      }
      throw error;
    }
  }
}
```

### Graph too large (memory)
```typescript
// Implement graph pruning
function pruneGraph(graph: DocumentGraph, maxNodes: number = 1000) {
  // Keep only most important nodes:
  // 1. All headings
  // 2. All tables/images
  // 3. High-degree nodes (many connections)
  // 4. Paragraphs with keywords
}
```

---

## Next Steps After Implementation

1. **Add table detection**: Integrate Camelot or AWS Textract
2. **Implement WebSocket**: Real-time progress updates
3. **Add embeddings**: OpenAI text-embedding-3-small
4. **Clustering**: K-means or HDBSCAN for topic detection
5. **RAGAS evaluation**: Python service integration
6. **Grafana dashboards**: Visualize metrics
7. **PostgreSQL persistence**: Store documents, history, evaluations
8. **CI/CD pipeline**: GitHub Actions for testing + deployment

---

## Resources

- **C4 Model**: https://c4model.com/
- **OpenAI API**: https://platform.openai.com/docs
- **RAGAS**: https://github.com/explodinggradients/ragas
- **pdf-parse**: https://www.npmjs.com/package/pdf-parse
- **Camelot**: https://camelot-py.readthedocs.io/
- **OpenTelemetry**: https://opentelemetry.io/
- **Prometheus**: https://prometheus.io/

---

## Summary

This system demonstrates **senior-level architecture thinking**:

1. ✅ **System Design First**: Complete C4 architecture before code
2. ✅ **Graph-Based Innovation**: Not just text extraction
3. ✅ **Grounding & Precision**: Every summary traceable
4. ✅ **Observability**: Metrics, tracing, evaluation
5. ✅ **Production-Ready**: Docker, testing, documentation
6. ✅ **Extensible**: Clear path to advanced features

**Key Differentiator**: Treating documents as knowledge graphs enables the AI to reason about structure and references, not just extract text.

---

**Good luck! 🚀**
