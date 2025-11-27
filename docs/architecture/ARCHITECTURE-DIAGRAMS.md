# PDF Summary AI - Architecture Diagrams (Mermaid)

This document contains Mermaid diagrams for the document-aware PDF Summary AI system.

## Table of Contents

1. [System Context Diagram](#system-context-diagram)
2. [Container Architecture Diagram](#container-architecture-diagram)
3. [Processing Pipeline Flow](#processing-pipeline-flow)
4. [Google Gemini Quota Management Flow](#google-gemini-quota-management-flow-new) ⭐ **NEW**
5. [Knowledge Graph Structure](#knowledge-graph-structure)
6. [MCP Context Retrieval](#mcp-context-retrieval)
7. [Evaluation & Observability Flow](#evaluation--observability-flow)
8. [Data Flow Diagram](#data-flow-diagram)

---

## System Context Diagram

```mermaid
graph TB
    User[👤 User<br/>Browser]
    
    subgraph SystemBoundary[PDF Summary AI System]
        System[PDF Summary AI<br/>Knowledge Graph-Based<br/>Document Processing]
    end
    
    OpenAI[🤖 OpenAI API<br/>GPT-4o, GPT-4, GPT-3.5]
    GoogleAI[🧠 Google AI<br/>Multi-Model + Quota Mgmt<br/>flash-8b, flash, pro, 2.0-exp]
    PostgreSQL[(🗄️ PostgreSQL<br/>Document Metadata)]
    Redis[(⚡ Redis<br/>Graph Cache)]
    S3[(📦 S3/GCS<br/>PDF Storage)]
    Prometheus[📊 Prometheus<br/>Metrics + Quota Status]
    Grafana[📈 Grafana<br/>Dashboards]
    
    User -->|Upload PDF<br/>View Summaries| System
    System -->|LLM Requests| OpenAI
    System -->|LLM Requests<br/>Quota-Managed<br/>Auto-Fallback| GoogleAI
    System -->|Store Metadata<br/>Query History| PostgreSQL
    System -->|Cache Graph<br/>Embeddings| Redis
    System -->|Upload/Download<br/>PDFs| S3
    System -->|Expose Metrics| Prometheus
    Prometheus -->|Query| Grafana
    User -->|View Metrics| Grafana
    
    style System fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style User fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style OpenAI fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style GoogleAI fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
```

---

## Container Architecture Diagram

```mermaid
graph TB
    User[👤 User]
    
    subgraph Frontend[Frontend Container]
        ReactSPA[React SPA<br/>TypeScript + Vite<br/>- Upload UI<br/>- Summary View<br/>- Graph Visualization<br/>- Metrics Dashboard]
    end
    
    subgraph API[API Gateway Container]
        Express[Express + WebSocket<br/>- REST API<br/>- Real-time Updates<br/>- Authentication<br/>- Rate Limiting]
    end
    
    subgraph Processing[Document Processing Container]
        PDFParser[1️⃣ PDF Parser<br/>pdfplumber/pdf-parse]
        GraphBuilder[2️⃣ Graph Builder<br/>Nodes + Edges]
        Semantic[3️⃣ Semantic Processor<br/>Embeddings + Clustering]
        MCPRetriever[4️⃣ MCP Context Retriever<br/>Neighborhood Lookup]
        AIOrchestrator[5️⃣ AI Orchestrator<br/>Summarization + Grounding]
        
        PDFParser --> GraphBuilder
        GraphBuilder --> Semantic
        Semantic --> MCPRetriever
        MCPRetriever --> AIOrchestrator
    end
    
    subgraph Evaluation[Evaluation Container]
        RAGASService[RAGAS Metrics<br/>Python Service]
        CustomMetrics[Custom Metrics<br/>Grounding/Coverage]
        Tracing[OpenTelemetry<br/>Distributed Tracing]
        
        RAGASService --> CustomMetrics
        CustomMetrics --> Tracing
    end
    
    subgraph DataLayer[Data Layer]
        PostgreSQL[(PostgreSQL<br/>Documents<br/>History<br/>Evaluations)]
        Redis[(Redis<br/>Graph Cache<br/>Embeddings)]
        S3[(S3/GCS<br/>PDF Files<br/>Artifacts)]
    end
    
    subgraph Monitoring[Monitoring Stack]
        Prometheus[Prometheus<br/>Metrics Collection]
        Grafana[Grafana<br/>Visualization]
        
        Prometheus --> Grafana
    end
    
    User -->|HTTPS/WS| ReactSPA
    ReactSPA -->|API Calls| Express
    Express --> Processing
    Processing --> Evaluation
    Processing --> DataLayer
    Evaluation --> DataLayer
    Processing -->|Metrics| Prometheus
    Evaluation -->|Metrics| Prometheus
    User -->|View Dashboards| Grafana
    
    style Processing fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style Evaluation fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    style DataLayer fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    style Monitoring fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
```

---

## Processing Pipeline Flow

```mermaid
flowchart TD
    Start([👤 User Uploads PDF]) --> Upload[📤 Upload to S3/GCS]
    Upload --> Parse[🔍 PDF Parser<br/>Extract text, tables, images<br/>with metadata]
    
    Parse --> BuildNodes[🏗️ Build Graph Nodes<br/>Section, Text, Table, Image]
    BuildNodes --> BuildEdges[🔗 Detect Edges<br/>Hierarchical, Reference,<br/>Semantic, Sequential]
    
    BuildEdges --> Embed[🧮 Generate Embeddings<br/>text-embedding-3-small<br/>Batch processing]
    Embed --> Cluster[🎯 Cluster Analysis<br/>K-means/HDBSCAN<br/>Topic detection]
    
    Cluster --> Cache[⚡ Cache Graph in Redis<br/>Adjacency List + Indexes]
    
    Cache --> MCPSetup[🛠️ Setup MCP Tools<br/>get_related_node<br/>get_table, get_image]
    
    MCPSetup --> PromptEngineer[📝 Prompt Engineering<br/>System: Grounding instructions<br/>Context: Document clusters]
    
    PromptEngineer --> QuotaCheck{Quota<br/>Management<br/>Enabled?}
    
    QuotaCheck -->|Yes| DetectPurpose[🎯 Detect Task Purpose<br/>6 types: bulk/quick/standard<br/>detailed/vision/critical]
    DetectPurpose --> SelectModel[🔄 Select Model<br/>Check quota availability<br/>Choose from: flash-8b, flash<br/>pro, 2.0-exp]
    SelectModel --> LLMCall[🤖 LLM Call<br/>Selected Model<br/>Function Calling Enabled]
    
    QuotaCheck -->|No| LLMCall
    
    LLMCall --> RecordUsage[📊 Record Token Usage<br/>Update daily quota<br/>Check thresholds]
    RecordUsage --> ToolCall{Tool Call<br/>Requested?}
    
    ToolCall -->|Yes| MCPRetrieve[🔎 MCP Retrieve Context<br/>Get neighborhood<br/>depth=1]
    MCPRetrieve --> InjectContext[💉 Inject Context<br/>Add related nodes]
    InjectContext --> LLMCall
    
    ToolCall -->|No| PostProcess[✨ Post-Process Summary<br/>Add grounding references<br/>Format output]
    
    PostProcess --> Evaluate[📊 Evaluate Summary<br/>RAGAS + Custom Metrics]
    
    Evaluate --> Store[(💾 Store Results<br/>PostgreSQL + S3)]
    
    Store --> WebSocket[📡 Send via WebSocket<br/>Real-time Update]
    
    WebSocket --> End([✅ Display to User])
    
    Store --> Metrics[📈 Collect Metrics<br/>Prometheus]
    Metrics --> Dashboard[📊 Grafana Dashboard]
    
    style Start fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style LLMCall fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style MCPRetrieve fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    style Evaluate fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    style End fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
```

---

## Google Gemini Quota Management Flow (NEW)

```mermaid
flowchart TD
    Start([LLM Request]) --> CheckReset{Daily Reset<br/>Needed?}
    
    CheckReset -->|Yes<br/>Past Midnight PT| ResetQuotas[🔄 Reset All Quotas<br/>tokens = 0<br/>requests = 0]
    CheckReset -->|No| DetectPurpose
    ResetQuotas --> DetectPurpose
    
    DetectPurpose[🎯 Detect Task Purpose<br/>Analyze: keywords + length]
    
    DetectPurpose --> Purpose{Purpose<br/>Type?}
    
    Purpose -->|bulk-processing| RecoBulk["📋 Recommend:<br/>1. flash-8b (4M TPM)<br/>2. 2.0-flash-exp (4M TPM)<br/>3. flash (1M TPM)"]
    Purpose -->|quick-summary| RecoQuick["⚡ Recommend:<br/>1. 2.0-flash-exp (FREE)<br/>2. flash (1M TPM)<br/>3. flash-8b (4M TPM)"]
    Purpose -->|standard-analysis| RecoStandard["📝 Recommend:<br/>1. flash (1M TPM)<br/>2. 2.0-flash-exp<br/>3. pro (32K TPM)"]
    Purpose -->|detailed-analysis| RecoDetailed["🔬 Recommend:<br/>1. pro (32K TPM)<br/>2. exp-1206 (32K TPM)<br/>3. flash (1M TPM)"]
    Purpose -->|vision-analysis| RecoVision["👁️ Recommend:<br/>1. flash (vision)<br/>2. pro (vision)<br/>3. 2.0-flash-exp"]
    Purpose -->|critical-task| RecoCritical["⚠️ Recommend:<br/>1. pro (best quality)<br/>2. exp-1206<br/>3. flash"]
    
    RecoBulk --> CheckQuota
    RecoQuick --> CheckQuota
    RecoStandard --> CheckQuota
    RecoDetailed --> CheckQuota
    RecoVision --> CheckQuota
    RecoCritical --> CheckQuota
    
    CheckQuota{Check Each<br/>Recommended<br/>Model}
    
    CheckQuota --> RPDCheck{RPD Limit<br/>Exceeded?}
    RPDCheck -->|Yes| NextModel[Try Next<br/>Recommended Model]
    RPDCheck -->|No| BudgetCheck
    
    BudgetCheck{Daily Budget<br/>Exceeded?}
    BudgetCheck -->|Yes| NextModel
    BudgetCheck -->|No| Selected[✅ Model Selected]
    
    NextModel --> MoreModels{More<br/>Recommended<br/>Models?}
    MoreModels -->|Yes| CheckQuota
    MoreModels -->|No| AnyAvailable{Any Model<br/>Available?}
    
    AnyAvailable -->|Yes| FallbackModel[⚠️ Use Fallback Model<br/>Any available model]
    AnyAvailable -->|No| QuotaError[❌ 429 Error<br/>All models exhausted<br/>Next reset: midnight PT]
    
    FallbackModel --> Selected
    
    Selected --> MakeLLMCall[🤖 Make LLM Call<br/>Selected Model]
    
    MakeLLMCall --> RecordUsage[📊 Record Usage<br/>tokens used<br/>requests count<br/>update totals]
    
    RecordUsage --> CheckThreshold{Budget<br/>Threshold?}
    
    CheckThreshold -->|≥ 90%| CriticalAlert[🚨 Critical Alert<br/>90% budget used]
    CheckThreshold -->|≥ 80%| WarnAlert[⚠️ Warning<br/>80% budget used]
    CheckThreshold -->|< 80%| LogUsage[📝 Log Usage Stats]
    
    CriticalAlert --> Return
    WarnAlert --> Return
    LogUsage --> Return
    
    Return([Return LLM Response<br/>+ Model Used<br/>+ Cost Tracking])
    
    style Start fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style Selected fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    style QuotaError fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    style CriticalAlert fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    style WarnAlert fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style Return fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
```

**Key Features:**
- ✅ **Daily Reset**: Automatic at midnight Pacific Time
- ✅ **6 Task Purposes**: bulk, quick, standard, detailed, vision, critical
- ✅ **Intelligent Selection**: Prioritized model recommendations per purpose
- ✅ **Quota Awareness**: Checks RPD limits and daily budget before selection
- ✅ **Smart Fallback**: Tries all recommended models, then any available
- ✅ **Cost Tracking**: Records usage, monitors thresholds (80%, 90%)
- ✅ **Error Handling**: 429 error with next reset time when all exhausted

---

## Knowledge Graph Structure

```mermaid
graph TD
    subgraph Document[Document: Financial Report Q4 2024]
        Section1[📄 Section Node<br/>ID: section_1<br/>Title: Executive Summary<br/>Page: 1]
        
        Para1[📝 Text Node<br/>ID: text_1<br/>Content: Revenue grew 25%...<br/>Page: 1]
        Para2[📝 Text Node<br/>ID: text_2<br/>Content: See Table 1 for details...<br/>Page: 1]
        
        Table1[📊 Table Node<br/>ID: table_1<br/>Caption: Quarterly Revenue<br/>Page: 2<br/>Data: Q1: $100M, Q2: $120M...]
        
        Section2[📄 Section Node<br/>ID: section_2<br/>Title: Market Analysis<br/>Page: 3]
        
        Para3[📝 Text Node<br/>ID: text_3<br/>Content: Market share increased...<br/>Page: 3]
        
        Image1[🖼️ Image Node<br/>ID: image_1<br/>Caption: Market Share Chart<br/>Page: 3]
        
        Para4[📝 Text Node<br/>ID: text_4<br/>Content: As shown in Figure 1...<br/>Page: 3]
    end
    
    Section1 -.->|HIERARCHICAL| Para1
    Section1 -.->|HIERARCHICAL| Para2
    
    Para2 -->|REFERENCE<br/>see Table 1| Table1
    
    Section2 -.->|HIERARCHICAL| Para3
    Section2 -.->|HIERARCHICAL| Para4
    
    Para4 -->|REFERENCE<br/>Figure 1| Image1
    
    Para1 -.->|SEQUENTIAL| Para2
    Para3 -.->|SEQUENTIAL| Para4
    
    Para1 ~~~|SEMANTIC<br/>similarity: 0.82| Para3
    
    style Section1 fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style Section2 fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style Table1 fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    style Image1 fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
```

**Edge Types:**
- **Solid arrows** (→): Reference edges (explicit mentions)
- **Dashed arrows** (-.->): Hierarchical edges (parent-child)
- **Wavy lines** (~~~): Semantic edges (topic similarity)

---

## MCP Context Retrieval

```mermaid
sequenceDiagram
    participant LLM as 🤖 LLM<br/>(GPT-4o)
    participant Orchestrator as 🎭 AI Orchestrator
    participant MCP as 🛠️ MCP Retriever
    participant Graph as 📊 Document Graph
    
    Note over LLM,Graph: User Request: "Summarize financial performance"
    
    Orchestrator->>LLM: Send prompt with system instructions<br/>Tools: [get_related_node, get_table]
    
    LLM->>LLM: Generate initial response<br/>Detect reference to "Table 1"
    
    LLM->>Orchestrator: Function call: get_related_node(nodeId="table_1", depth=1)
    
    Orchestrator->>MCP: Execute tool call
    
    MCP->>Graph: Query graph for node "table_1"
    Graph-->>MCP: Return table node
    
    MCP->>Graph: Get neighbors (depth=1)<br/>Follow edges
    Graph-->>MCP: Return: [text_2, section_1]
    
    MCP-->>Orchestrator: MCPContext {<br/>  node: Table1,<br/>  neighbors: [text_2, section_1],<br/>  totalTokens: 512<br/>}
    
    Orchestrator->>LLM: Inject context into conversation<br/>"Here is Table 1 and related context..."
    
    LLM->>LLM: Generate summary using table data<br/>Add grounding reference
    
    LLM-->>Orchestrator: "Revenue grew 25% (Q1: $100M → Q4: $125M)<br/>[Node: table_1, Page 2]"
    
    Orchestrator->>Orchestrator: Post-process:<br/>- Validate grounding<br/>- Format output<br/>- Record metadata
    
    Orchestrator-->>LLM: Final summary with grounding
    
    Note over LLM,Graph: Key Innovation: LLM can "look up" referenced content<br/>just like a human flipping pages
```

---

## Evaluation & Observability Flow

```mermaid
flowchart TD
    Summary[📄 Generated Summary] --> EvalEngine[🎯 Evaluation Engine]
    
    EvalEngine --> RAGAS{Enable RAGAS?}
    RAGAS -->|Yes| RAGASMetrics[📊 RAGAS Metrics<br/>- Faithfulness<br/>- Answer Relevancy<br/>- Context Recall<br/>- Context Precision]
    RAGAS -->|No| CustomMetrics
    
    RAGASMetrics --> CustomMetrics[📏 Custom Metrics<br/>- Grounding Score<br/>- Coverage Score<br/>- Graph Utilization<br/>- Table/Image Accuracy]
    
    CustomMetrics --> Benchmark{Ground Truth<br/>Available?}
    Benchmark -->|Yes| BenchmarkMetrics[🎖️ Benchmark<br/>- ROUGE-L<br/>- BLEU<br/>- Semantic Similarity]
    Benchmark -->|No| CalcOverall
    
    BenchmarkMetrics --> CalcOverall[🧮 Calculate Overall Score<br/>Weighted Average]
    
    CalcOverall --> StoreScores[(💾 Store in PostgreSQL<br/>evaluation_results table)]
    
    CalcOverall --> PrometheusMetrics[📈 Send to Prometheus<br/>- summary_evaluation_score<br/>- grounding_score<br/>- faithfulness_score]
    
    PrometheusMetrics --> GrafanaDash[📊 Grafana Dashboards<br/>- Score trends<br/>- Performance charts<br/>- Alerting rules]
    
    CalcOverall --> Alert{Score < 0.7?}
    Alert -->|Yes| SendAlert[🚨 Trigger Alert<br/>Notify team]
    Alert -->|No| Complete
    
    SendAlert --> Complete[✅ Complete]
    
    subgraph Observability[Observability Stack]
        Tracing[🔍 OpenTelemetry Tracing<br/>- Span: Parse → Graph → Summary<br/>- Attributes: doc_id, nodes, edges]
        Logging[📝 Structured Logging<br/>- Winston/Pino<br/>- Correlation IDs<br/>- JSON format]
        
        Tracing --> Jaeger[📊 Jaeger UI<br/>Trace Visualization]
        Logging --> ELK[📊 ELK Stack<br/>Log Analysis]
    end
    
    Summary --> Tracing
    Summary --> Logging
    
    style EvalEngine fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    style RAGASMetrics fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    style CustomMetrics fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style SendAlert fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    style Observability fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
```

---

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input[📥 Input Layer]
        UserUpload[👤 User Uploads<br/>50MB PDF]
    end
    
    subgraph Storage[💾 Storage Layer]
        S3[S3/GCS Bucket<br/>Raw PDFs]
        Redis[Redis Cache<br/>Graphs + Embeddings]
        PostgreSQL[PostgreSQL DB<br/>Metadata + Results]
    end
    
    subgraph Processing[⚙️ Processing Layer]
        Parse[PDF Parser<br/>Text + Tables + Images]
        Graph[Graph Builder<br/>Nodes + Edges]
        Embed[Embedding Generator<br/>OpenAI API]
        Cluster[Cluster Analyzer<br/>K-means]
    end
    
    subgraph AI[🤖 AI Layer]
        MCP[MCP Retriever<br/>Context Window]
        LLM[LLM Orchestrator<br/>GPT-4o / Gemini]
        PostProc[Post-Processor<br/>Grounding]
    end
    
    subgraph Evaluation[📊 Evaluation Layer]
        RAGAS[RAGAS Service<br/>Python]
        Custom[Custom Metrics<br/>Node.js]
    end
    
    subgraph Output[📤 Output Layer]
        WebSocket[WebSocket<br/>Real-time Updates]
        API[REST API<br/>Summary Results]
        Dashboard[Grafana<br/>Metrics Dashboard]
    end
    
    UserUpload --> S3
    S3 --> Parse
    Parse --> Graph
    Graph --> Embed
    Embed --> Cluster
    Cluster --> Redis
    
    Redis --> MCP
    MCP --> LLM
    LLM --> PostProc
    
    PostProc --> RAGAS
    PostProc --> Custom
    
    RAGAS --> PostgreSQL
    Custom --> PostgreSQL
    
    PostgreSQL --> WebSocket
    PostgreSQL --> API
    PostgreSQL --> Dashboard
    
    WebSocket --> UserUpload
    API --> UserUpload
    
    style Processing fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    style AI fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style Evaluation fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    style Output fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
```

---

## Component Interaction Sequence

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant FE as 🖥️ Frontend<br/>(React)
    participant API as 🌐 API Gateway
    participant PP as ⚙️ Processing<br/>Pipeline
    participant Graph as 📊 Graph<br/>Builder
    participant MCP as 🛠️ MCP<br/>Retriever
    participant LLM as 🤖 OpenAI<br/>GPT-4o
    participant Eval as 📊 Evaluation<br/>Engine
    participant DB as 💾 Database
    
    U->>FE: Upload PDF (50MB)
    FE->>API: POST /api/upload<br/>multipart/form-data
    API->>DB: Create document record<br/>status: pending
    API-->>FE: Return document_id
    
    FE->>API: WebSocket connect<br/>/ws/progress/{document_id}
    
    API->>PP: Start async processing
    activate PP
    
    PP->>Graph: Parse PDF → Build Graph
    Graph->>Graph: Extract text, tables, images<br/>Create nodes + edges
    Graph-->>PP: DocumentGraph
    
    PP->>API: Progress: 40%<br/>Stage: GRAPH_BUILD
    API-->>FE: WebSocket: {"progress": 40, "stage": "GRAPH_BUILD"}
    
    PP->>PP: Generate embeddings<br/>Cluster analysis
    PP->>API: Progress: 60%<br/>Stage: EMBEDDING
    API-->>FE: WebSocket: {"progress": 60}
    
    PP->>MCP: Setup context retrieval
    MCP->>MCP: Index graph for lookup
    
    PP->>LLM: Summarization request<br/>Tools: [get_related_node]
    activate LLM
    
    LLM->>MCP: get_related_node("table_1")
    MCP-->>LLM: Return table + neighbors
    
    LLM->>MCP: get_related_node("text_5")
    MCP-->>LLM: Return text + context
    
    LLM-->>PP: Summary with grounding
    deactivate LLM
    
    PP->>API: Progress: 80%<br/>Stage: SUMMARIZATION
    API-->>FE: WebSocket: {"progress": 80}
    
    PP->>Eval: Evaluate summary
    activate Eval
    Eval->>Eval: RAGAS metrics<br/>Custom metrics
    Eval-->>PP: EvaluationScores
    deactivate Eval
    
    PP->>DB: Store summary + scores<br/>status: completed
    PP->>API: Progress: 100%<br/>Stage: COMPLETE
    
    deactivate PP
    
    API-->>FE: WebSocket: {"progress": 100, "summary": "...", "scores": {...}}
    FE-->>U: Display summary<br/>with grounding references
    
    U->>FE: View metrics
    FE->>API: GET /api/documents/{id}/metrics
    API->>DB: Query evaluation scores
    DB-->>API: Return scores
    API-->>FE: JSON response
    FE-->>U: Display evaluation dashboard
```

---

## Graph Node Relationships

```mermaid
erDiagram
    DOCUMENT ||--o{ SECTION : contains
    SECTION ||--o{ PARAGRAPH : contains
    SECTION ||--o{ TABLE : contains
    SECTION ||--o{ IMAGE : contains
    
    PARAGRAPH ||--o{ REFERENCE_EDGE : "references from"
    TABLE ||--o{ REFERENCE_EDGE : "references to"
    IMAGE ||--o{ REFERENCE_EDGE : "references to"
    
    PARAGRAPH ||--o{ SEMANTIC_EDGE : "similar to"
    PARAGRAPH ||--o{ SEQUENTIAL_EDGE : "followed by"
    
    DOCUMENT {
        string id PK
        int total_pages
        int total_nodes
        int total_edges
        float graph_density
    }
    
    SECTION {
        string id PK
        string title
        int level
        int page
        string parent_id FK
    }
    
    PARAGRAPH {
        string id PK
        text content
        int page
        float[] embedding
        string cluster
        string section_id FK
    }
    
    TABLE {
        string id PK
        string caption
        int page
        json data
        string section_id FK
    }
    
    IMAGE {
        string id PK
        string caption
        string url
        int page
        string ocr_text
        string section_id FK
    }
    
    REFERENCE_EDGE {
        string source_id FK
        string target_id FK
        string reference_text
        float confidence
    }
    
    SEMANTIC_EDGE {
        string source_id FK
        string target_id FK
        float similarity
    }
    
    SEQUENTIAL_EDGE {
        string source_id FK
        string target_id FK
        int sequence_order
    }
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph Internet[🌐 Internet]
        Users[👥 Users]
    end
    
    subgraph LoadBalancer[⚖️ Load Balancer]
        LB[Nginx / ALB]
    end
    
    subgraph DockerHost[🐳 Docker Host]
        subgraph Frontend[Frontend Container :3000]
            React[React SPA<br/>Vite Build]
        end
        
        subgraph API[API Container :4000]
            Express[Express Server<br/>WebSocket Support]
        end
        
        subgraph Processing[Processing Container]
            PDFService[PDF Processing<br/>Service]
            GraphService[Graph Building<br/>Service]
            AIService[AI Orchestration<br/>Service]
        end
        
        subgraph Evaluation[Evaluation Container :5000]
            RAGAS[RAGAS Python<br/>Service]
        end
        
        subgraph DataServices[Data Services]
            PostgreSQL[(PostgreSQL :5432)]
            Redis[(Redis :6379)]
        end
        
        subgraph Monitoring[Monitoring Stack]
            Prometheus[Prometheus :9090]
            Grafana[Grafana :3001]
        end
    end
    
    subgraph External[☁️ External Services]
        S3[S3/GCS<br/>PDF Storage]
        OpenAI[OpenAI API]
        GCP[GCP Vertex AI]
    end
    
    Users -->|HTTPS| LB
    LB --> React
    React -->|API Calls| Express
    Express --> PDFService
    Express --> GraphService
    PDFService --> AIService
    GraphService --> AIService
    AIService --> RAGAS
    
    Express --> PostgreSQL
    Express --> Redis
    PDFService --> S3
    AIService --> OpenAI
    AIService --> GCP
    
    Express --> Prometheus
    PDFService --> Prometheus
    RAGAS --> Prometheus
    Prometheus --> Grafana
    Users -.->|View Metrics| Grafana
    
    style DockerHost fill:#E3F2FD,stroke:#1976D2,stroke-width:2px
    style Processing fill:#C8E6C9,stroke:#388E3C,stroke-width:2px
    style DataServices fill:#CFD8DC,stroke:#455A64,stroke-width:2px
    style Monitoring fill:#FFE0B2,stroke:#EF6C00,stroke-width:2px
    style External fill:#F3E5F5,stroke:#7B1FA2,stroke-width:2px
```

---

## Metrics Collection Flow

```mermaid
flowchart LR
    subgraph Application[🖥️ Application Services]
        API[API Gateway]
        Processing[Processing Service]
        Evaluation[Evaluation Service]
    end
    
    subgraph Metrics[📊 Metrics Collection]
        PromClient[Prometheus Client<br/>Node.js]
        
        Counters[Counters<br/>- documents_processed<br/>- tool_calls_executed<br/>- errors_total]
        
        Histograms[Histograms<br/>- processing_time<br/>- graph_nodes<br/>- llm_tokens]
        
        Gauges[Gauges<br/>- active_jobs<br/>- evaluation_scores]
    end
    
    subgraph Storage[💾 Metrics Storage]
        Prometheus[(Prometheus TSDB)]
    end
    
    subgraph Visualization[📈 Visualization]
        Grafana[Grafana Dashboards<br/>- Processing Health<br/>- Graph Statistics<br/>- Evaluation Trends<br/>- LLM Performance]
    end
    
    subgraph Alerting[🚨 Alerting]
        AlertManager[Alert Manager<br/>- Score < 0.7<br/>- Error rate > 5%<br/>- Processing time > 5min]
        
        Notifications[Notifications<br/>- Email<br/>- Slack<br/>- PagerDuty]
    end
    
    API --> PromClient
    Processing --> PromClient
    Evaluation --> PromClient
    
    PromClient --> Counters
    PromClient --> Histograms
    PromClient --> Gauges
    
    Counters --> Prometheus
    Histograms --> Prometheus
    Gauges --> Prometheus
    
    Prometheus --> Grafana
    Prometheus --> AlertManager
    
    AlertManager --> Notifications
    
    style Application fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    style Metrics fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style Storage fill:#607D8B,stroke:#37474F,stroke-width:2px,color:#fff
    style Visualization fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style Alerting fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
```

---

## Summary

These Mermaid diagrams provide visual representations of:

1. **System Context**: High-level view of system boundaries and external dependencies
2. **Container Architecture**: Detailed container-level design with all services
3. **Processing Pipeline**: Step-by-step flow from PDF upload to summary generation
4. **Knowledge Graph**: Example graph structure showing nodes and edge types
5. **MCP Context Retrieval**: Sequence diagram showing how LLM retrieves related content
6. **Evaluation Flow**: Comprehensive evaluation and observability pipeline
7. **Data Flow**: How data moves through the system
8. **Component Interaction**: Detailed sequence diagram of user request handling
9. **Graph Relationships**: Entity-relationship diagram of graph data model
10. **Deployment**: Docker-based deployment architecture
11. **Metrics Collection**: How metrics are collected, stored, and visualized

All diagrams use color coding:
- 🟢 **Green**: Core processing components
- 🔵 **Blue**: User-facing and input/output
- 🟠 **Orange**: AI/LLM and external services
- 🟣 **Purple**: Evaluation and quality assurance
- 🔴 **Red**: Alerts and critical paths
- ⚫ **Gray**: Data storage and infrastructure

These can be rendered in any Markdown viewer that supports Mermaid (GitHub, GitLab, VS Code with Mermaid extension, etc.).
