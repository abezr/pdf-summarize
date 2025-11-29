# Document-Aware PDF Summary AI - C4 Architecture

**Project**: PDF Summary AI with Knowledge Graph Architecture  
**Focus**: Grounding, Summary Precision, Continuous Evaluation, Observability  
**Date**: 2025-11-26

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [C4 Level 1: System Context](#c4-level-1-system-context)
3. [C4 Level 2: Container Architecture](#c4-level-2-container-architecture)
4. [C4 Level 3: Component Architecture](#c4-level-3-component-architecture)
5. [C4 Level 4: Code Structure](#c4-level-4-code-structure)
6. [Knowledge Graph Design](#knowledge-graph-design)
7. [Observability & Evaluation Architecture](#observability--evaluation-architecture)
8. [Deployment Architecture](#deployment-architecture)

---

## Architecture Overview

### Core Innovation: Knowledge Graph-Based Document Processing

Unlike traditional string-based PDF processing, this system treats documents as **Knowledge Graphs**:

- **Nodes**: Sections, Paragraphs, Tables, Images, Headers
- **Edges**: References, Hierarchical relationships, Cross-references
- **Intelligence**: AI can "look up" referenced content, just like a human flipping pages

### Key Architectural Principles

1. **Grounding**: Every summary statement traceable to specific Node ID (Page/Section)
2. **Precision**: Cluster-based summarization (Financial, Legal, Technical clusters)
3. **Context-Aware**: MCP-style retrieval - provide neighborhood, not just chunk
4. **Observable**: Real-time metrics, evaluation scores, traceability
5. **Scalable**: Handle 50MB, 100-page PDFs efficiently

---

## C4 Level 1: System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        System Context                            │
│                                                                  │
│  ┌──────────┐                                                   │
│  │   User   │                                                   │
│  │ (Browser)│                                                   │
│  └────┬─────┘                                                   │
│       │ Uploads PDF, Views Summaries                            │
│       │                                                          │
│       v                                                          │
│  ┌───────────────────────────────────────────────┐             │
│  │   PDF Summary AI System                       │             │
│  │   (Knowledge Graph-Based Document Processing) │             │
│  │                                                │             │
│  │   • Graph-based PDF Parsing                   │             │
│  │   • Semantic Chunking & Embedding             │             │
│  │   • MCP-style Context Retrieval               │             │
│  │   • AI Summarization with Grounding           │             │
│  │   • Continuous Evaluation & Metrics           │             │
│  └───┬───────────────────────┬───────────────────┘             │
│      │                       │                                  │
│      v                       v                                  │
│  ┌─────────────┐       ┌────────────────────────────┐         │
│  │  OpenAI API │       │  Google AI (Gemini)        │         │
│  │  (GPT-4o)   │       │  • Dynamic Quota Management│         │
│  │             │       │  • Multi-Model Selection   │         │
│  └─────────────┘       └────────────────────────────┘         │
│                                                                  │
│  External Dependencies:                                         │
│  • PostgreSQL (Document metadata, history)                      │
│  • Redis (Graph cache, embeddings)                             │
│  • S3/GCS (PDF storage)                                        │
│  • Prometheus/Grafana (Observability)                          │
└─────────────────────────────────────────────────────────────────┘
```

### External Actors

- **User**: Uploads PDFs, views summaries, accesses history
- **OpenAI API**: LLM for summarization (GPT-4o, GPT-4-turbo, GPT-3.5-turbo)
- **Google AI**: Multi-model LLM provider with quota management
  - **Models**: Gemini 2.0 Flash Exp, Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.5 Flash-8B
  - **Quota Manager**: Daily token tracking, intelligent model selection, automatic fallback
  - **Cost Savings**: 97%+ reduction through optimal model distribution
- **PostgreSQL**: Document metadata, processing history, evaluation results
- **Redis**: In-memory graph cache, embedding cache
- **S3/GCS**: Long-term PDF storage
- **Prometheus/Grafana**: Metrics collection and visualization

---

## C4 Level 2: Container Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Container Diagram                              │
│                                                                       │
│  ┌────────────────┐                                                  │
│  │  React SPA     │                                                  │
│  │  (Frontend)    │                                                  │
│  │  • Upload UI   │                                                  │
│  │  • Summary View│                                                  │
│  │  • Graph Viz   │                                                  │
│  │  • Metrics UI  │                                                  │
│  └───────┬────────┘                                                  │
│          │ HTTPS/WebSocket                                           │
│          v                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  API Gateway (Node.js/Express)                              │   │
│  │  • Authentication                                            │   │
│  │  • Rate Limiting                                             │   │
│  │  • WebSocket (Real-time Progress)                           │   │
│  └─────────┬───────────────────────────────────────────────────┘   │
│            │                                                          │
│            v                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Document Processing Service (Node.js/TypeScript)           │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  1. PDF Parser (pdfplumber/pdf-parse)            │      │   │
│  │  │     • Extract text with page/position metadata   │      │   │
│  │  │     • Detect tables (Camelot/Tabula)             │      │   │
│  │  │     • Extract images (OCR for text in images)    │      │   │
│  │  └──────────────┬───────────────────────────────────┘      │   │
│  │                 v                                            │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  2. Graph Builder                                 │      │   │
│  │  │     • Create Nodes (Section, Table, Image)       │      │   │
│  │  │     • Detect Edges (References, Hierarchy)       │      │   │
│  │  │     • Build Adjacency List                       │      │   │
│  │  └──────────────┬───────────────────────────────────┘      │   │
│  │                 v                                            │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  3. Semantic Processor                            │      │   │
│  │  │     • Chunk text (semantic boundaries)           │      │   │
│  │  │     • Generate embeddings (OpenAI text-embed-3)  │      │   │
│  │  │     • Cluster analysis (topic extraction)        │      │   │
│  │  └──────────────┬───────────────────────────────────┘      │   │
│  │                 v                                            │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  4. MCP Context Retriever                        │      │   │
│  │  │     • Neighborhood retrieval                     │      │   │
│  │  │     • Related node lookup                        │      │   │
│  │  │     • Context window optimization                │      │   │
│  │  └──────────────┬───────────────────────────────────┘      │   │
│  │                 v                                            │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  5. AI Orchestrator                              │      │   │
│  │  │     • Prompt engineering                         │      │   │
│  │  │     • Tool calling (get_related_node)            │      │   │
│  │  │     • Summary generation with grounding          │      │   │
│  │  └──────────────────────────────────────────────────┘      │   │
│  └─────────┬───────────────────────────────────────────────────┘   │
│            │                                                          │
│            v                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Evaluation & Observability Service                         │   │
│  │  • RAGAS Metrics (Faithfulness, Answer Relevancy)           │   │
│  │  • Custom Metrics (Grounding Score, Coverage)               │   │
│  │  • Tracing (OpenTelemetry)                                  │   │
│  │  • Benchmarking (Ground truth comparison)                   │   │
│  └─────────┬───────────────────────────────────────────────────┘   │
│            │                                                          │
│  ┌─────────v─────────┐  ┌──────────────┐  ┌─────────────────┐     │
│  │  PostgreSQL       │  │    Redis     │  │  S3/GCS Bucket  │     │
│  │  • Documents      │  │  • Graph     │  │  • PDF Files    │     │
│  │  • Processing log │  │  • Embeddings│  │  • Artifacts    │     │
│  │  • Eval results   │  │  • Cache     │  │                 │     │
│  └───────────────────┘  └──────────────┘  └─────────────────┘     │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Monitoring Stack (Prometheus + Grafana)                     │  │
│  │  • Processing time metrics                                   │  │
│  │  • Graph statistics (nodes, edges, clusters)                │  │
│  │  • LLM performance (latency, token usage, cost)             │  │
│  │  • Evaluation scores over time                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Container Descriptions

#### 1. React SPA (Frontend)
- **Technology**: React 18 + TypeScript + Vite
- **Responsibilities**:
  - PDF upload with progress tracking
  - Real-time processing status (WebSocket)
  - Summary display with grounding references
  - Graph visualization (D3.js/Cytoscape.js)
  - Evaluation metrics dashboard

#### 2. API Gateway
- **Technology**: Node.js + Express + WebSocket
- **Responsibilities**:
  - REST API endpoints
  - WebSocket for real-time updates
  - Authentication/Authorization
  - Rate limiting (prevent abuse)

#### 3. Document Processing Service
- **Technology**: Node.js + TypeScript
- **Responsibilities**:
  - PDF parsing → Graph building → Summarization
  - Core business logic
  - Handles 50MB, 100-page PDFs

#### 4. Evaluation & Observability Service
- **Technology**: Node.js + Python (RAGAS)
- **Responsibilities**:
  - Continuous evaluation
  - Metrics collection
  - Benchmarking against ground truth

#### 5. Data Layer
- **PostgreSQL**: Document metadata, history, evaluations
- **Redis**: In-memory graph cache, embeddings
- **S3/GCS**: PDF storage

---

## C4 Level 3: Component Architecture

### Document Processing Service - Detailed Components

```
┌──────────────────────────────────────────────────────────────────┐
│           Document Processing Service Components                 │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  PDF Parser Component                                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │ │
│  │  │ Text         │  │ Table        │  │ Image           │ │ │
│  │  │ Extractor    │  │ Detector     │  │ Extractor       │ │ │
│  │  │ (pdf-parse)  │  │ (Camelot)    │  │ (Tesseract OCR) │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │ │
│  │         │                  │                   │           │ │
│  │         └──────────────────┴───────────────────┘           │ │
│  │                            │                                │ │
│  │                            v                                │ │
│  │                 ┌──────────────────────┐                   │ │
│  │                 │ Metadata Enricher    │                   │ │
│  │                 │ • Page numbers       │                   │
│  │                 │ • Bounding boxes     │                   │
│  │                 │ • Font/style info    │                   │
│  │                 └──────────┬───────────┘                   │ │
│  └────────────────────────────┼────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Graph Builder Component                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Node Factory                                          │ │ │
│  │  │ • createTextNode(content, page, position)            │ │ │
│  │  │ • createTableNode(data, caption, page)               │ │ │
│  │  │ • createImageNode(url, caption, page)                │ │ │
│  │  │ • createSectionNode(title, level, children)          │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Edge Detector                                         │ │ │
│  │  │ • Hierarchical edges (parent-child sections)         │ │ │
│  │  │ • Reference edges ("see Table 1", "Figure 2 shows") │ │ │
│  │  │ • Semantic edges (topic similarity)                  │ │ │
│  │  │ • Sequential edges (paragraph flow)                  │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Graph Storage (In-Memory)                            │ │ │
│  │  │ • Adjacency list: Map<nodeId, GraphNode>            │ │ │
│  │  │ • Index by type: Map<NodeType, nodeId[]>            │ │ │
│  │  │ • Index by page: Map<pageNum, nodeId[]>             │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Semantic Processor Component                              │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Semantic Chunker                                      │ │ │
│  │  │ • Respect semantic boundaries (paragraphs, sections) │ │ │
│  │  │ • Target chunk size: 512-1024 tokens                 │ │ │
│  │  │ • Overlap: 128 tokens                                │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Embedding Generator                                   │ │ │
│  │  │ • Model: text-embedding-3-small (OpenAI)             │ │ │
│  │  │ • Batch processing (up to 100 chunks)                │ │ │
│  │  │ • Cache in Redis (avoid re-computation)              │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Cluster Analyzer                                      │ │ │
│  │  │ • Algorithm: K-means / HDBSCAN                       │ │ │
│  │  │ • Auto-detect topic clusters (Financial, Legal, etc)│ │ │
│  │  │ • Assign cluster labels to nodes                     │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  MCP Context Retriever Component                           │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Tool: get_related_node(nodeId, depth=1)              │ │ │
│  │  │ • Retrieve node content                              │ │ │
│  │  │ • Traverse edges (neighbors)                         │ │ │
│  │  │ • Return neighborhood context                        │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Context Window Optimizer                             │ │ │
│  │  │ • Prioritize high-relevance nodes                    │ │ │
│  │  │ • Token budget management (stay under 128k limit)    │ │ │
│  │  │ • Adaptive depth (depth=1 for summaries, depth=2 Q&A)│ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  AI Orchestrator Component                                  │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Prompt Engineer                                       │ │ │
│  │  │ • System prompt with grounding instructions          │ │ │
│  │  │ • Cluster-specific prompts                           │ │ │
│  │  │ • Few-shot examples                                  │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ LLM Provider Manager (Multi-LLM + Quota Mgmt)    │ │ │
│  │  │ ┌──────────────────────────────────────────────┐ │ │ │
│  │  │ │ OpenAI Provider                              │ │ │ │
│  │  │ │ • GPT-4o, GPT-4, GPT-3.5-turbo              │ │ │ │
│  │  │ └──────────────────────────────────────────────┘ │ │ │
│  │  │ ┌──────────────────────────────────────────────┐ │ │ │
│  │  │ │ Google Provider + Quota Manager              │ │ │ │
│  │  │ │ • Models: flash-8b, flash, pro, 2.0-exp     │ │ │ │
│  │  │ │ • Task purpose detection (6 types)           │ │ │ │
│  │  │ │ • Daily quota tracking (tokens + requests)   │ │ │ │
│  │  │ │ • Smart fallback when quota exhausted        │ │ │ │
│  │  │ │ • Resets: midnight Pacific Time              │ │ │ │
│  │  │ │ • Cost savings: 97%+ through distribution    │ │ │ │
│  │  │ └──────────────────────────────────────────────┘ │ │ │
│  │  │ • Auto-detection (API key presence)              │ │ │
│  │  │ • Provider fallback (primary → backup)           │ │ │
│  │  │ • Cost tracking per provider                     │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Function Calling Handler                             │ │ │
│  │  │ • Tools: [get_related_node, get_table, get_image]   │ │ │
│  │  │ • Execute tool calls                                 │ │ │
│  │  │ • Inject results back into context                   │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Summary Post-Processor                               │ │ │
│  │  │ • Add grounding references [Node: section_1, p.5]    │ │ │
│  │  │ • Format output (Markdown/HTML)                      │ │ │
│  │  │ • Validate output quality                            │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Output: Summary with Grounding + Graph Metadata           │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Evaluation & Observability Components

```
┌──────────────────────────────────────────────────────────────────┐
│        Evaluation & Observability Service Components             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Evaluation Engine                                          │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ RAGAS Metrics (Python Integration)                   │ │ │
│  │  │ • Faithfulness: LLM-generated vs source grounding    │ │ │
│  │  │ • Answer Relevancy: Summary vs document content      │ │ │
│  │  │ • Context Recall: Coverage of important info         │ │ │
│  │  │ • Context Precision: Avoid irrelevant info           │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Custom Metrics                                        │ │ │
│  │  │ • Grounding Score: % statements with node references │ │ │
│  │  │ • Coverage Score: % document nodes used in summary   │ │ │
│  │  │ • Graph Utilization: Edges traversed during summary  │ │ │
│  │  │ • Table/Image Reference Accuracy                     │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Benchmark Comparator                                  │ │ │
│  │  │ • Ground truth summaries (human-written)             │ │ │
│  │  │ • ROUGE/BLEU scores                                  │ │ │
│  │  │ • Semantic similarity (embedding distance)           │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Observability Engine                                       │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ OpenTelemetry Tracer                                  │ │ │
│  │  │ • Span: PDF Upload → Parse → Graph Build → Summary  │ │ │
│  │  │ • Attributes: document_id, page_count, graph_stats   │ │ │
│  │  │ • Export to Jaeger/Tempo                             │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Metrics Collector (Prometheus Client)                │ │ │
│  │  │ • Counters: documents_processed, errors_total        │ │ │
│  │  │ • Histograms: processing_time, graph_node_count      │ │ │
│  │  │ • Gauges: active_processing_jobs                     │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Structured Logger                                     │ │ │
│  │  │ • Winston/Pino with JSON format                      │ │ │
│  │  │ • Correlation IDs for request tracing                │ │ │
│  │  │ • Log levels: DEBUG, INFO, WARN, ERROR               │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Dashboard & Alerting                                       │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Grafana Dashboards                                    │ │ │
│  │  │ • Processing pipeline health                         │ │ │
│  │  │ • Graph statistics (nodes, edges, density)           │ │ │
│  │  │ • Evaluation scores over time                        │ │ │
│  │  │ • LLM performance (latency, token usage, cost)       │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Alerting Rules                                        │ │ │
│  │  │ • Evaluation score < 0.7 threshold                   │ │ │
│  │  │ • Processing time > 5 minutes                        │ │ │
│  │  │ • Error rate > 5%                                    │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### LLM Quota Management Component (NEW)

```
┌──────────────────────────────────────────────────────────────────┐
│              Google Gemini Quota Manager Component                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Quota Tracker                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Per-Model Quota Tracking                             │ │ │
│  │  │ • gemini-2.0-flash-exp: 1,500 RPD, 4M TPM          │ │ │
│  │  │ • gemini-1.5-flash: 1,500 RPD, 1M TPM              │ │ │
│  │  │ • gemini-1.5-flash-8b: 1,500 RPD, 4M TPM           │ │ │
│  │  │ • gemini-1.5-pro: 50 RPD, 32K TPM (limited!)       │ │ │
│  │  │ • gemini-exp-1206: 50 RPD, 32K TPM                 │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Daily Budget Manager                                  │ │ │
│  │  │ • Total tokens allowed/day (default: 1M)             │ │ │
│  │  │ • Track usage across all models                      │ │ │
│  │  │ • Alert at 80% and 90% thresholds                    │ │ │
│  │  │ • Prevent new requests if budget exhausted           │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Reset Manager                                         │ │ │
│  │  │ • Auto-reset: midnight Pacific Time                  │ │ │
│  │  │ • Check on every request                             │ │ │
│  │  │ • Log reset events                                   │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Task Purpose Detector                                      │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Keyword Analysis                                      │ │ │
│  │  │ • "summarize" → bulk/quick summary                   │ │ │
│  │  │ • "analyze" + "detailed" → detailed analysis         │ │ │
│  │  │ • "critical"/"important" → critical task             │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Length Analysis                                       │ │ │
│  │  │ • < 5K chars → quick-summary                         │ │ │
│  │  │ • 5K-20K chars → standard-analysis                   │ │ │
│  │  │ • > 20K chars → detailed-analysis                    │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Task Purpose Types (6)                                │ │ │
│  │  │ • bulk-processing                                     │ │ │
│  │  │ • quick-summary                                       │ │ │
│  │  │ • standard-analysis                                   │ │ │
│  │  │ • detailed-analysis                                   │ │ │
│  │  │ • vision-analysis                                     │ │ │
│  │  │ • critical-task                                       │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Model Selector                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Recommendation Engine                                 │ │ │
│  │  │ bulk-processing    → flash-8b → 2.0-flash → flash   │ │ │
│  │  │ quick-summary      → 2.0-flash → flash → flash-8b   │ │ │
│  │  │ standard-analysis  → flash → 2.0-flash → pro        │ │ │
│  │  │ detailed-analysis  → pro → exp-1206 → flash         │ │ │
│  │  │ vision-analysis    → flash → pro → 2.0-flash        │ │ │
│  │  │ critical-task      → pro → exp-1206 → flash         │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Quota-Aware Selection                                 │ │ │
│  │  │ 1. Get recommended models (priority order)           │ │ │
│  │  │ 2. Check each model's available quota                │ │ │
│  │  │ 3. Select first available model                      │ │ │
│  │  │ 4. Fallback to any available if all recommended full │ │ │
│  │  │ 5. Throw 429 error if ALL models exhausted           │ │ │
│  │  └────────────────────┬─────────────────────────────────┘ │ │
│  │                       v                                    │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Usage Recorder                                        │ │ │
│  │  │ • Record tokens used after each request              │ │ │
│  │  │ • Increment request count                            │ │ │
│  │  │ • Update total daily usage                           │ │ │
│  │  │ • Log usage statistics                               │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                │                                  │
│                                v                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Monitoring & Alerts                                        │ │
│  │  • Log model selections (purpose + model chosen)           │ │
│  │  • Warn at 80% budget usage                                │ │
│  │  • Critical alert at 90% budget usage                      │ │
│  │  • Error when quota exhausted (next reset time provided)   │ │
│  │  • Expose quota status API endpoint                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Benefits**:
- **97%+ Cost Savings**: Optimal distribution across free tier models
- **30x More Capacity**: 1,500 RPD vs 50 RPD (pro-only approach)
- **Zero Configuration**: Works out of the box with sensible defaults
- **Intelligent**: Auto-selects best model for each task purpose
- **Resilient**: Automatic fallback when quota exhausted
- **Observable**: Real-time quota tracking and alerts

---

## C4 Level 4: Code Structure

### TypeScript Interfaces & Data Models

```typescript
// ============================================================================
// Graph Data Structures
// ============================================================================

export enum NodeType {
  TEXT = 'TEXT',
  TABLE = 'TABLE',
  IMAGE = 'IMAGE',
  SECTION = 'SECTION',
  HEADER = 'HEADER',
  FOOTER = 'FOOTER',
  LIST = 'LIST',
}

export enum EdgeType {
  HIERARCHICAL = 'HIERARCHICAL',      // Parent-child (section → paragraph)
  REFERENCE = 'REFERENCE',            // Cross-reference ("see Table 1")
  SEMANTIC = 'SEMANTIC',              // Topic similarity
  SEQUENTIAL = 'SEQUENTIAL',          // Document flow (paragraph → next paragraph)
}

export interface BoundingBox {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface GraphNode {
  id: string;                         // Unique identifier (e.g., "node_p1_s3")
  type: NodeType;
  content: string;                    // Raw content (text, table data, image URL)
  metadata: {
    page: number;
    bbox?: BoundingBox;
    fontSize?: number;
    fontFamily?: string;
    isHeading?: boolean;
    headingLevel?: number;           // 1-6 for H1-H6
    tableCaption?: string;
    imageCaption?: string;
    wordCount?: number;
  };
  embedding?: number[];               // Vector embedding (1536 dims for text-embedding-3-small)
  cluster?: string;                   // Cluster label (e.g., "financial", "legal")
  edges: Edge[];                      // Outgoing edges
  createdAt: Date;
}

export interface Edge {
  targetNodeId: string;
  type: EdgeType;
  weight?: number;                    // For semantic edges (cosine similarity)
  metadata?: {
    referenceText?: string;          // Original text that triggered reference
    confidence?: number;             // Detection confidence (0-1)
  };
}

export interface DocumentGraph {
  documentId: string;
  nodes: Map<string, GraphNode>;
  nodesByType: Map<NodeType, string[]>;
  nodesByPage: Map<number, string[]>;
  clusters: Map<string, string[]>;   // cluster → nodeIds
  metadata: {
    totalPages: number;
    totalNodes: number;
    totalEdges: number;
    avgNodesPerPage: number;
    graphDensity: number;            // edges / (nodes * (nodes-1))
  };
}

// ============================================================================
// Processing Pipeline Data Models
// ============================================================================

export interface PDFParseResult {
  text: string;
  pages: PDFPage[];
  tables: TableNode[];
  images: ImageNode[];
  metadata: {
    pageCount: number;
    author?: string;
    title?: string;
    creationDate?: Date;
  };
}

export interface PDFPage {
  pageNumber: number;
  text: string;
  width: number;
  height: number;
  elements: PageElement[];
}

export interface PageElement {
  type: 'text' | 'table' | 'image' | 'header' | 'footer';
  bbox: BoundingBox;
  content: string;
  style?: {
    fontSize: number;
    fontFamily: string;
    isBold: boolean;
    isItalic: boolean;
  };
}

export interface TableNode {
  id: string;
  caption?: string;
  page: number;
  data: string[][];                  // 2D array of cell values
  headers?: string[];
  bbox?: BoundingBox;
}

export interface ImageNode {
  id: string;
  caption?: string;
  page: number;
  url: string;                       // S3/GCS URL or base64
  ocrText?: string;                  // If image contains text
  bbox?: BoundingBox;
}

// ============================================================================
// AI Orchestration Models
// ============================================================================

export interface SummaryRequest {
  documentId: string;
  graph: DocumentGraph;
  options: {
    maxLength?: number;              // Target summary length in words
    clusters?: string[];             // Focus on specific clusters
    includeTable?: boolean;          // Include table data in summary
    includeImages?: boolean;         // Reference images
    language?: string;               // Output language
  };
}

export interface SummaryResponse {
  documentId: string;
  summary: string;
  grounding: GroundingReference[];
  metadata: {
    modelUsed: string;               // e.g., "gpt-4o"
    tokensUsed: number;
    processingTime: number;          // milliseconds
    nodesUsed: number;
    edgesTraversed: number;
    toolCalls: ToolCall[];
  };
  evaluation?: EvaluationScores;
}

export interface GroundingReference {
  statementIndex: number;            // Index in summary
  statement: string;
  sourceNodes: string[];             // Node IDs
  pageNumbers: number[];
  confidence: number;                // 0-1
}

export interface ToolCall {
  toolName: string;                  // e.g., "get_related_node"
  arguments: Record<string, any>;
  result: any;
  executionTime: number;
}

// ============================================================================
// MCP Context Retrieval
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface MCPContext {
  node: GraphNode;
  neighbors: GraphNode[];
  depth: number;
  totalTokens: number;
}

// ============================================================================
// Evaluation Models
// ============================================================================

export interface EvaluationScores {
  ragas: {
    faithfulness: number;            // 0-1
    answerRelevancy: number;         // 0-1
    contextRecall: number;           // 0-1
    contextPrecision: number;        // 0-1
  };
  custom: {
    groundingScore: number;          // % statements with references
    coverageScore: number;           // % important nodes used
    graphUtilization: number;        // edges traversed / total edges
    tableReferenceAccuracy: number;  // 0-1
    imageReferenceAccuracy: number;  // 0-1
  };
  benchmark?: {
    rougeL: number;
    bleuScore: number;
    semanticSimilarity: number;
  };
  overallScore: number;              // Weighted average
}

export interface EvaluationConfig {
  enableRAGAS: boolean;
  enableBenchmark: boolean;
  groundTruthSummary?: string;
  weights: {
    faithfulness: number;
    answerRelevancy: number;
    contextRecall: number;
    contextPrecision: number;
    groundingScore: number;
    coverageScore: number;
  };
}

// ============================================================================
// Observability Models
// ============================================================================

export interface ProcessingMetrics {
  documentId: string;
  stage: ProcessingStage;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  metrics: {
    pdfSize: number;                 // bytes
    pageCount: number;
    nodeCount: number;
    edgeCount: number;
    embeddingCount: number;
    llmTokensUsed: number;
    estimatedCost: number;           // USD
  };
}

export enum ProcessingStage {
  UPLOAD = 'UPLOAD',
  PDF_PARSE = 'PDF_PARSE',
  GRAPH_BUILD = 'GRAPH_BUILD',
  EMBEDDING = 'EMBEDDING',
  CLUSTERING = 'CLUSTERING',
  SUMMARIZATION = 'SUMMARIZATION',
  EVALUATION = 'EVALUATION',
  COMPLETE = 'COMPLETE',
}

export interface ProgressUpdate {
  documentId: string;
  stage: ProcessingStage;
  progress: number;                  // 0-100
  message: string;
  timestamp: Date;
}

// ============================================================================
// Database Models
// ============================================================================

export interface DocumentRecord {
  id: string;
  userId: string;
  filename: string;
  fileSize: number;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  pdfUrl: string;                    // S3/GCS URL
  graphUrl?: string;                 // Serialized graph JSON URL
  summaryUrl?: string;
  processingMetrics?: ProcessingMetrics;
  evaluationScores?: EvaluationScores;
}

export interface ProcessingHistory {
  id: string;
  documentId: string;
  stage: ProcessingStage;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'success' | 'failure';
  error?: string;
  metadata?: Record<string, any>;
}
```

---

## Knowledge Graph Design

### Graph Construction Algorithm

```typescript
class GraphBuilder {
  private graph: DocumentGraph;
  private nodeIdCounter: number = 0;

  constructor(documentId: string) {
    this.graph = {
      documentId,
      nodes: new Map(),
      nodesByType: new Map(),
      nodesByPage: new Map(),
      clusters: new Map(),
      metadata: {
        totalPages: 0,
        totalNodes: 0,
        totalEdges: 0,
        avgNodesPerPage: 0,
        graphDensity: 0,
      },
    };
  }

  /**
   * Step 1: Create nodes from parsed PDF elements
   */
  async buildNodes(parseResult: PDFParseResult): Promise<void> {
    // Create section nodes (hierarchical structure)
    const sections = this.detectSections(parseResult.pages);
    for (const section of sections) {
      const node = this.createSectionNode(section);
      this.addNode(node);
    }

    // Create text nodes (paragraphs)
    for (const page of parseResult.pages) {
      const paragraphs = this.extractParagraphs(page);
      for (const para of paragraphs) {
        const node = this.createTextNode(para, page.pageNumber);
        this.addNode(node);
      }
    }

    // Create table nodes
    for (const table of parseResult.tables) {
      const node = this.createTableNode(table);
      this.addNode(node);
    }

    // Create image nodes
    for (const image of parseResult.images) {
      const node = this.createImageNode(image);
      this.addNode(node);
    }
  }

  /**
   * Step 2: Detect and create edges
   */
  async buildEdges(): Promise<void> {
    // 1. Hierarchical edges (section → paragraph)
    this.buildHierarchicalEdges();

    // 2. Reference edges ("see Table 1", "Figure 2 shows")
    await this.detectReferenceEdges();

    // 3. Sequential edges (paragraph flow)
    this.buildSequentialEdges();

    // 4. Semantic edges (after embeddings)
    await this.buildSemanticEdges();
  }

  /**
   * Detect references in text (e.g., "see Table 1", "as shown in Figure 2")
   */
  private async detectReferenceEdges(): Promise<void> {
    const referencePatterns = [
      /(?:see|refer to|shown in|described in)\s+(Table|Figure|Section|Appendix)\s+(\d+)/gi,
      /\((Table|Figure|Appendix)\s+(\d+)\)/gi,
    ];

    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type === NodeType.TEXT || node.type === NodeType.SECTION) {
        for (const pattern of referencePatterns) {
          const matches = [...node.content.matchAll(pattern)];
          
          for (const match of matches) {
            const refType = match[1].toLowerCase();
            const refNumber = match[2];
            
            // Find target node
            const targetNode = this.findNodeByTypeAndNumber(refType, refNumber);
            
            if (targetNode) {
              const edge: Edge = {
                targetNodeId: targetNode.id,
                type: EdgeType.REFERENCE,
                metadata: {
                  referenceText: match[0],
                  confidence: 1.0,
                },
              };
              node.edges.push(edge);
            }
          }
        }
      }
    }
  }

  /**
   * Build semantic edges based on embedding similarity
   */
  private async buildSemanticEdges(): Promise<void> {
    const threshold = 0.75; // Cosine similarity threshold

    const textNodes = Array.from(this.graph.nodes.values())
      .filter(n => n.type === NodeType.TEXT && n.embedding);

    for (let i = 0; i < textNodes.length; i++) {
      for (let j = i + 1; j < textNodes.length; j++) {
        const similarity = this.cosineSimilarity(
          textNodes[i].embedding!,
          textNodes[j].embedding!
        );

        if (similarity >= threshold) {
          const edge: Edge = {
            targetNodeId: textNodes[j].id,
            type: EdgeType.SEMANTIC,
            weight: similarity,
          };
          textNodes[i].edges.push(edge);
        }
      }
    }
  }

  /**
   * Add node to graph with indexing
   */
  private addNode(node: GraphNode): void {
    this.graph.nodes.set(node.id, node);

    // Index by type
    if (!this.graph.nodesByType.has(node.type)) {
      this.graph.nodesByType.set(node.type, []);
    }
    this.graph.nodesByType.get(node.type)!.push(node.id);

    // Index by page
    const page = node.metadata.page;
    if (!this.graph.nodesByPage.has(page)) {
      this.graph.nodesByPage.set(page, []);
    }
    this.graph.nodesByPage.get(page)!.push(node.id);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  }
}
```

### MCP Context Retrieval

```typescript
class MCPContextRetriever {
  constructor(private graph: DocumentGraph) {}

  /**
   * Tool: get_related_node
   * Retrieves a node and its neighborhood
   */
  async getRelatedNode(nodeId: string, depth: number = 1): Promise<MCPContext> {
    const node = this.graph.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const neighbors = this.getNeighbors(nodeId, depth);
    const totalTokens = this.estimateTokens([node, ...neighbors]);

    return {
      node,
      neighbors,
      depth,
      totalTokens,
    };
  }

  /**
   * Get all neighbors up to specified depth
   */
  private getNeighbors(nodeId: string, depth: number): GraphNode[] {
    const visited = new Set<string>();
    const neighbors: GraphNode[] = [];
    
    const queue: { id: string; currentDepth: number }[] = [
      { id: nodeId, currentDepth: 0 }
    ];

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      
      if (currentDepth >= depth || visited.has(id)) {
        continue;
      }
      
      visited.add(id);
      const node = this.graph.nodes.get(id);
      
      if (!node) continue;
      
      if (id !== nodeId) {
        neighbors.push(node);
      }

      // Add neighbors to queue
      for (const edge of node.edges) {
        queue.push({
          id: edge.targetNodeId,
          currentDepth: currentDepth + 1,
        });
      }
    }

    return neighbors;
  }

  /**
   * Build context for LLM with token budget management
   */
  async buildContext(
    nodeIds: string[],
    maxTokens: number = 100000
  ): Promise<string> {
    const contexts: string[] = [];
    let totalTokens = 0;

    for (const nodeId of nodeIds) {
      const context = await this.getRelatedNode(nodeId, 1);
      
      if (totalTokens + context.totalTokens > maxTokens) {
        break; // Stop if we exceed token budget
      }

      contexts.push(this.formatContext(context));
      totalTokens += context.totalTokens;
    }

    return contexts.join('\n\n---\n\n');
  }

  private formatContext(context: MCPContext): string {
    const lines: string[] = [
      `[Node: ${context.node.id}, Type: ${context.node.type}, Page: ${context.node.metadata.page}]`,
      context.node.content,
    ];

    if (context.neighbors.length > 0) {
      lines.push('\nRelated content:');
      for (const neighbor of context.neighbors) {
        lines.push(
          `  - [${neighbor.type}] ${neighbor.content.substring(0, 200)}...`
        );
      }
    }

    return lines.join('\n');
  }

  private estimateTokens(nodes: GraphNode[]): number {
    // Rough estimate: 1 token ≈ 4 characters
    const totalChars = nodes.reduce((sum, node) => sum + node.content.length, 0);
    return Math.ceil(totalChars / 4);
  }
}
```

---

## Observability & Evaluation Architecture

### Continuous Evaluation Pipeline

```typescript
class EvaluationEngine {
  constructor(
    private config: EvaluationConfig,
    private ragasClient: RAGASClient,
    private metricsCollector: MetricsCollector
  ) {}

  /**
   * Evaluate a generated summary
   */
  async evaluate(
    summary: SummaryResponse,
    graph: DocumentGraph
  ): Promise<EvaluationScores> {
    const scores: Partial<EvaluationScores> = {};

    // 1. RAGAS Metrics
    if (this.config.enableRAGAS) {
      scores.ragas = await this.evaluateRAGAS(summary, graph);
    }

    // 2. Custom Metrics
    scores.custom = await this.evaluateCustomMetrics(summary, graph);

    // 3. Benchmark (if ground truth available)
    if (this.config.enableBenchmark && this.config.groundTruthSummary) {
      scores.benchmark = await this.evaluateBenchmark(
        summary.summary,
        this.config.groundTruthSummary
      );
    }

    // 4. Calculate overall score
    scores.overallScore = this.calculateOverallScore(scores);

    // 5. Send metrics to Prometheus
    this.metricsCollector.recordEvaluationScores(scores as EvaluationScores);

    return scores as EvaluationScores;
  }

  /**
   * RAGAS Metrics: Faithfulness, Answer Relevancy, Context Recall/Precision
   */
  private async evaluateRAGAS(
    summary: SummaryResponse,
    graph: DocumentGraph
  ): Promise<EvaluationScores['ragas']> {
    // Extract context (all node content used in summary)
    const contextNodes = summary.grounding
      .flatMap(g => g.sourceNodes)
      .map(nodeId => graph.nodes.get(nodeId))
      .filter(n => n !== undefined) as GraphNode[];

    const context = contextNodes.map(n => n.content);

    // Call RAGAS Python service (via HTTP or gRPC)
    const ragasScores = await this.ragasClient.evaluate({
      question: "Summarize this document", // Implicit question
      answer: summary.summary,
      contexts: context,
    });

    return {
      faithfulness: ragasScores.faithfulness,
      answerRelevancy: ragasScores.answer_relevancy,
      contextRecall: ragasScores.context_recall,
      contextPrecision: ragasScores.context_precision,
    };
  }

  /**
   * Custom Metrics: Grounding Score, Coverage, Graph Utilization
   */
  private async evaluateCustomMetrics(
    summary: SummaryResponse,
    graph: DocumentGraph
  ): Promise<EvaluationScores['custom']> {
    // 1. Grounding Score: % of sentences with references
    const sentences = summary.summary.split(/[.!?]+/).filter(s => s.trim());
    const groundedSentences = summary.grounding.length;
    const groundingScore = groundedSentences / sentences.length;

    // 2. Coverage Score: % of important nodes used
    const importantNodes = this.identifyImportantNodes(graph);
    const usedNodes = new Set(summary.grounding.flatMap(g => g.sourceNodes));
    const coverageScore = 
      [...usedNodes].filter(id => importantNodes.has(id)).length / 
      importantNodes.size;

    // 3. Graph Utilization: edges traversed / total edges
    const totalEdges = Array.from(graph.nodes.values())
      .reduce((sum, node) => sum + node.edges.length, 0);
    const graphUtilization = summary.metadata.edgesTraversed / totalEdges;

    // 4. Table/Image Reference Accuracy
    const tableRefAccuracy = this.evaluateTableReferences(summary, graph);
    const imageRefAccuracy = this.evaluateImageReferences(summary, graph);

    return {
      groundingScore,
      coverageScore,
      graphUtilization,
      tableReferenceAccuracy: tableRefAccuracy,
      imageReferenceAccuracy: imageRefAccuracy,
    };
  }

  /**
   * Identify important nodes (headings, tables, key paragraphs)
   */
  private identifyImportantNodes(graph: DocumentGraph): Set<string> {
    const important = new Set<string>();

    for (const [nodeId, node] of graph.nodes) {
      // Headings are always important
      if (node.metadata.isHeading) {
        important.add(nodeId);
      }

      // Tables and images are important
      if (node.type === NodeType.TABLE || node.type === NodeType.IMAGE) {
        important.add(nodeId);
      }

      // Nodes with many edges (highly connected)
      if (node.edges.length >= 3) {
        important.add(nodeId);
      }
    }

    return important;
  }

  private calculateOverallScore(scores: Partial<EvaluationScores>): number {
    const weights = this.config.weights;
    let totalWeight = 0;
    let weightedSum = 0;

    if (scores.ragas) {
      weightedSum += scores.ragas.faithfulness * weights.faithfulness;
      weightedSum += scores.ragas.answerRelevancy * weights.answerRelevancy;
      weightedSum += scores.ragas.contextRecall * weights.contextRecall;
      weightedSum += scores.ragas.contextPrecision * weights.contextPrecision;
      totalWeight += weights.faithfulness + weights.answerRelevancy + 
                     weights.contextRecall + weights.contextPrecision;
    }

    if (scores.custom) {
      weightedSum += scores.custom.groundingScore * weights.groundingScore;
      weightedSum += scores.custom.coverageScore * weights.coverageScore;
      totalWeight += weights.groundingScore + weights.coverageScore;
    }

    return weightedSum / totalWeight;
  }
}
```

### Metrics Collection

```typescript
class MetricsCollector {
  private readonly counters = {
    documentsProcessed: new promClient.Counter({
      name: 'pdf_documents_processed_total',
      help: 'Total number of PDF documents processed',
      labelNames: ['status'], // success, failure
    }),
    toolCallsExecuted: new promClient.Counter({
      name: 'mcp_tool_calls_total',
      help: 'Total number of MCP tool calls',
      labelNames: ['tool_name', 'status'],
    }),
  };

  private readonly histograms = {
    processingTime: new promClient.Histogram({
      name: 'pdf_processing_duration_seconds',
      help: 'Time taken to process a PDF document',
      labelNames: ['stage'],
      buckets: [1, 5, 10, 30, 60, 120, 300], // seconds
    }),
    graphNodes: new promClient.Histogram({
      name: 'document_graph_nodes_count',
      help: 'Number of nodes in document graph',
      buckets: [10, 50, 100, 500, 1000, 5000],
    }),
    graphEdges: new promClient.Histogram({
      name: 'document_graph_edges_count',
      help: 'Number of edges in document graph',
      buckets: [10, 50, 100, 500, 1000, 5000, 10000],
    }),
    llmTokens: new promClient.Histogram({
      name: 'llm_tokens_used',
      help: 'Number of tokens used in LLM call',
      labelNames: ['model'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000],
    }),
  };

  private readonly gauges = {
    activeJobs: new promClient.Gauge({
      name: 'pdf_processing_jobs_active',
      help: 'Number of currently active processing jobs',
    }),
    evaluationScores: new promClient.Gauge({
      name: 'summary_evaluation_score',
      help: 'Evaluation scores for generated summaries',
      labelNames: ['metric_name', 'document_id'],
    }),
  };

  recordEvaluationScores(scores: EvaluationScores): void {
    const documentId = 'doc_' + Date.now(); // Use actual doc ID

    if (scores.ragas) {
      this.gauges.evaluationScores.set(
        { metric_name: 'faithfulness', document_id: documentId },
        scores.ragas.faithfulness
      );
      this.gauges.evaluationScores.set(
        { metric_name: 'answer_relevancy', document_id: documentId },
        scores.ragas.answerRelevancy
      );
      this.gauges.evaluationScores.set(
        { metric_name: 'context_recall', document_id: documentId },
        scores.ragas.contextRecall
      );
      this.gauges.evaluationScores.set(
        { metric_name: 'context_precision', document_id: documentId },
        scores.ragas.contextPrecision
      );
    }

    if (scores.custom) {
      this.gauges.evaluationScores.set(
        { metric_name: 'grounding_score', document_id: documentId },
        scores.custom.groundingScore
      );
      this.gauges.evaluationScores.set(
        { metric_name: 'coverage_score', document_id: documentId },
        scores.custom.coverageScore
      );
    }

    this.gauges.evaluationScores.set(
      { metric_name: 'overall_score', document_id: documentId },
      scores.overallScore
    );
  }
}
```

### Grafana Dashboard Definition

```json
{
  "dashboard": {
    "title": "PDF Summary AI - Observability",
    "panels": [
      {
        "title": "Documents Processed (Rate)",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pdf_documents_processed_total[5m])",
            "legendFormat": "{{status}}"
          }
        ]
      },
      {
        "title": "Processing Time by Stage",
        "type": "heatmap",
        "targets": [
          {
            "expr": "pdf_processing_duration_seconds",
            "legendFormat": "{{stage}}"
          }
        ]
      },
      {
        "title": "Graph Statistics",
        "type": "stat",
        "targets": [
          {
            "expr": "avg(document_graph_nodes_count)",
            "legendFormat": "Avg Nodes"
          },
          {
            "expr": "avg(document_graph_edges_count)",
            "legendFormat": "Avg Edges"
          }
        ]
      },
      {
        "title": "Evaluation Scores Over Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "summary_evaluation_score{metric_name='overall_score'}",
            "legendFormat": "Overall"
          },
          {
            "expr": "summary_evaluation_score{metric_name='faithfulness'}",
            "legendFormat": "Faithfulness"
          },
          {
            "expr": "summary_evaluation_score{metric_name='grounding_score'}",
            "legendFormat": "Grounding"
          }
        ]
      },
      {
        "title": "LLM Token Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(llm_tokens_used[5m])) by (model)",
            "legendFormat": "{{model}}"
          }
        ]
      },
      {
        "title": "MCP Tool Calls",
        "type": "piechart",
        "targets": [
          {
            "expr": "sum(mcp_tool_calls_total) by (tool_name)",
            "legendFormat": "{{tool_name}}"
          }
        ]
      }
    ]
  }
}
```

---

## Deployment Architecture

### Docker Compose Setup

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://api:4000
      - REACT_APP_WS_URL=ws://api:4000
    depends_on:
      - api

  # API Gateway
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/pdfai
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - GCP_CREDENTIALS=${GCP_CREDENTIALS}
      - S3_BUCKET=${S3_BUCKET}
      - PROMETHEUS_PORT=9090
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  # PostgreSQL
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=pdfai
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # RAGAS Evaluation Service (Python)
  ragas:
    build:
      context: ./ragas-service
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          npm install
          npm run test
          npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: |
          docker-compose build
      - name: Push to registry
        run: |
          docker-compose push

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: |
          # Deploy via kubectl or docker-compose
          # Update Kubernetes manifests
          # Rolling update
```

---

## Summary

This C4 architecture provides:

1. **Grounding & Precision**:
   - Knowledge graph treats PDFs as structured data
   - Every summary statement traceable to Node ID
   - MCP-style context retrieval (neighborhood, not just chunk)

2. **Scalability**:
   - Handles 50MB, 100-page PDFs
   - Efficient graph representation in memory (Redis cache)
   - Parallel processing pipeline

3. **Observability**:
   - OpenTelemetry tracing (full pipeline visibility)
   - Prometheus metrics (processing time, graph stats, LLM usage)
   - Grafana dashboards (real-time monitoring)

4. **Continuous Evaluation**:
   - RAGAS metrics (faithfulness, relevancy, recall, precision)
   - Custom metrics (grounding score, coverage, graph utilization)
   - Benchmarking against ground truth

5. **Production-Ready**:
   - Docker Compose for easy deployment
   - CI/CD pipeline with testing
   - Error handling and retry logic
   - WebSocket for real-time progress updates

This architecture aligns with the job requirements:
- ✅ TypeScript-first (Node.js backend + React frontend)
- ✅ LLM integration (OpenAI GPT-4o, GCP Gemini)
- ✅ Graph data structures (NetworkX-inspired adjacency list)
- ✅ Prompt engineering (MCP tool calling)
- ✅ AWS/GCP integration (S3, Vertex AI)
- ✅ Real-time WebSocket communication
- ✅ Debugging & observability (tracing, metrics, logs)

The 2-3 hour implementation should focus on:
1. Core graph building (text, tables, references)
2. Simple MCP retrieval (get_related_node)
3. Basic OpenAI summarization
4. Docker setup
5. Minimal UI (upload + summary view)

Advanced features (RAGAS, clustering, full observability) can be demonstrated in the Loom recording as "next steps" or implemented post-submission.
