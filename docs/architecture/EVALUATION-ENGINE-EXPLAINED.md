# Evaluation Engine: Main Ideas & Principles

## Executive Summary

The Evaluation Engine is our **Quality Assurance System** that automatically validates every generated summary through **8+ metrics** across 3 dimensions (RAGAS, Custom, Benchmark), proving mathematical accuracy and catching hallucinations before they reach users.

**Core Principle**: "Every summary must mathematically prove its own quality."

---

## 🎯 The Core Problem It Solves

### Without Evaluation

```
Traditional AI Summarization:
PDF → LLM → Summary → User

Problems:
❌ How do you know the summary is accurate?
❌ How do you detect hallucinations?
❌ How do you measure completeness?
❌ How do you verify table/image references?
❌ How do you ensure quality over time?

Result: Users trust summaries blindly → Dangerous!
```

### With Evaluation Engine

```
Our AI Summarization:
PDF → Knowledge Graph → LLM → Summary → Evaluation Engine → Quality Proof → User

Benefits:
✅ Automatic accuracy verification
✅ Hallucination detection (faithfulness < 0.8)
✅ Completeness measurement (coverage score)
✅ Reference validation (table/image accuracy)
✅ Continuous quality monitoring

Result: Every summary has a "quality certificate"
```

---

## 🏗️ System Architecture

### 3-Tier Evaluation Framework

```
┌─────────────────────────────────────────────────────────────┐
│                    Evaluation Engine                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Tier 1    │    │    Tier 2    │    │   Tier 3     │  │
│  │             │    │              │    │              │  │
│  │ RAGAS       │    │ Custom       │    │ Benchmark    │  │
│  │ Metrics     │    │ Metrics      │    │ Metrics      │  │
│  │             │    │              │    │              │  │
│  │ LLM-based   │    │ Programmatic │    │ Ground Truth │  │
│  │ validation  │    │ validation   │    │ comparison   │  │
│  │             │    │              │    │              │  │
│  │ • Faith-    │    │ • Grounding  │    │ • ROUGE-L    │  │
│  │   fulness   │    │ • Coverage   │    │ • BLEU       │  │
│  │ • Answer    │    │ • Graph      │    │ • Semantic   │  │
│  │   Relevancy │    │   Utilization│    │   Similarity │  │
│  │ • Context   │    │ • Table/Image│    │              │  │
│  │   Recall    │    │   Accuracy   │    │ (Optional)   │  │
│  │ • Context   │    │              │    │              │  │
│  │   Precision │    │              │    │              │  │
│  └──────┬──────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                    │           │
│         └───────────────────┴────────────────────┘           │
│                             │                                 │
│                    ┌────────v─────────┐                      │
│                    │  Overall Score   │                      │
│                    │  (Weighted Avg)  │                      │
│                    └────────┬─────────┘                      │
│                             │                                 │
│                    ┌────────v─────────┐                      │
│                    │  Decision Engine │                      │
│                    │  Pass/Fail (0.7) │                      │
│                    └────────┬─────────┘                      │
│                             │                                 │
│         ┌───────────────────┴───────────────────┐           │
│         │                                         │           │
│    ┌────v─────┐                           ┌──────v──────┐   │
│    │ APPROVED │                           │   FLAGGED   │   │
│    │ (≥ 0.7)  │                           │   (< 0.7)   │   │
│    └────┬─────┘                           └──────┬──────┘   │
│         │                                         │           │
│         v                                         v           │
│    [To User]                             [Human Review]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Tier 1: RAGAS Metrics (LLM-Based Validation)

### Principle: "Use AI to validate AI"

RAGAS (Retrieval-Augmented Generation Assessment) uses another LLM to verify the summary LLM's output.

---

### 1. Faithfulness Score (0-1)

**What it proves**: "Every claim in the summary is factually supported by the source document"

**How it works**:

```typescript
// 1. Extract claims from summary
const claims = extractClaims(summary);
// ["Revenue grew 25%", "Operating expenses decreased 10%", ...]

// 2. For each claim, verify against source using LLM
for (const claim of claims) {
  const isSupported = await llm.verify({
    prompt: `
      Context: ${sourceDocument}
      Claim: "${claim}"
      Question: Is this claim supported by the context? (Yes/No)
    `
  });
}

// 3. Calculate percentage
faithfulness = supportedClaims / totalClaims;
```

**Example**:

```typescript
{
  faithfulness: 0.92,  // 92% of claims verified
  proof: {
    totalClaims: 12,
    supportedClaims: 11,
    unsupportedClaims: 1,
    unsupportedExamples: [
      {
        claim: "Revenue grew 30%",
        actual: "Revenue grew 25%",
        reason: "Numeric mismatch"
      }
    ]
  }
}
```

**Why this matters**: Catches hallucinations where LLM invents facts!

---

### 2. Answer Relevancy Score (0-1)

**What it proves**: "The summary is actually about the document's main topics"

**How it works**:

```typescript
// 1. LLM generates questions that this summary would answer
const questions = await llm.generateQuestions(summary);
// ["What were Q4 financial results?", "What market trends occurred?"]

// 2. Compare with original task ("Summarize this document")
const similarities = questions.map(q => 
  cosineSimilarity(
    embed(q),
    embed("Summarize this document")
  )
);

// 3. Average similarity
answerRelevancy = average(similarities);
```

**Example**:

```typescript
{
  answerRelevancy: 0.88,
  proof: {
    originalQuestion: "Summarize this financial report",
    generatedQuestions: [
      "What were the Q4 2024 financial results?",  // Similarity: 0.91
      "What market trends are discussed?",          // Similarity: 0.87
      "What are the strategic initiatives?"         // Similarity: 0.86
    ],
    avgSimilarity: 0.88
  }
}
```

**Why this matters**: Prevents off-topic summaries!

---

### 3. Context Recall Score (0-1)

**What it proves**: "The summary covers all important information from source"

**How it works**:

```typescript
// 1. Extract key facts from source (or ground truth if available)
const keyFacts = await llm.extractFacts(sourceDocument);
// ["Q4 revenue was $125M", "Operating expenses decreased 10%", ...]

// 2. Check which facts are mentioned in summary
const recalledFacts = await Promise.all(
  keyFacts.map(fact => llm.checkMentioned(fact, summary))
);

// 3. Calculate percentage
contextRecall = recalledFacts.filter(r => r).length / keyFacts.length;
```

**Example**:

```typescript
{
  contextRecall: 0.85,  // 85% of key facts covered
  proof: {
    totalFacts: 20,
    recalledFacts: 17,
    missedFacts: [
      "Q4 dividend increased to $0.25",
      "New CFO appointed in November",
      "Office expansion to Seattle announced"
    ]
  }
}
```

**Why this matters**: Ensures completeness, catches missing important details!

---

### 4. Context Precision Score (0-1)

**What it proves**: "The summary doesn't include irrelevant information"

**How it works**:

```typescript
// 1. Split summary into sentences
const sentences = summary.split(/[.!?]+/);

// 2. For each sentence, check if supported by relevant context
const relevantSentences = await Promise.all(
  sentences.map(sentence => 
    llm.isRelevant(sentence, sourceContext)
  )
);

// 3. Calculate percentage
contextPrecision = relevantSentences.filter(r => r).length / sentences.length;
```

**Example**:

```typescript
{
  contextPrecision: 0.90,  // 90% of sentences are relevant
  proof: {
    totalSentences: 10,
    relevantSentences: 9,
    irrelevantSentences: [
      {
        sentence: "The company was founded in 1995",
        reason: "Not relevant to Q4 2024 report"
      }
    ]
  }
}
```

**Why this matters**: Prevents "filler" content and off-topic additions!

---

## 🎨 Tier 2: Custom Metrics (Programmatic Validation)

### Principle: "Verify what can be computed deterministically"

Unlike RAGAS (which uses LLM), custom metrics use **exact algorithms** for validation.

---

### 1. Grounding Score (0-1)

**What it proves**: "Every statement is traceable to a specific source node in the graph"

**How it works**:

```typescript
// Count sentences in summary
const sentences = summary.split(/[.!?]+/).filter(s => s.trim());

// Count how many have grounding references
const groundedSentences = summary.grounding.length;

// Calculate percentage
groundingScore = groundedSentences / sentences.length;
```

**Example**:

```typescript
{
  groundingScore: 0.95,  // 95% of statements grounded
  proof: {
    totalSentences: 20,
    groundedSentences: 19,
    ungroundedSentences: 1,
    examples: [
      {
        statement: "Revenue grew 25% in Q4",
        sourceNodes: ["table_1", "text_5"],
        pages: [2, 3],
        confidence: 0.98,
        verifiable: true  // ✓ Can click to see source
      },
      {
        statement: "Market share increased to 15%",
        sourceNodes: ["table_3", "image_1"],
        pages: [5, 6],
        confidence: 0.92,
        verifiable: true
      }
    ]
  }
}
```

**Why this matters**: 
- Enables source verification (click to see original)
- Proves every fact came from document
- Critical for compliance/legal documents

---

### 2. Coverage Score (0-1)

**What it proves**: "The summary covers all important sections of the document"

**How it works**:

```typescript
// 1. Identify "important" nodes in the graph
const importantNodes = identifyImportantNodes(graph);
// Criteria:
// - All headings/sections
// - All tables/images
// - High-degree nodes (many connections)
// - Nodes with keywords (revenue, risk, strategic, etc.)

// 2. Find which important nodes were used in summary
const usedNodes = new Set(summary.grounding.flatMap(g => g.sourceNodes));
const usedImportantNodes = [...usedNodes].filter(id => 
  importantNodes.has(id)
);

// 3. Calculate coverage
coverageScore = usedImportantNodes.length / importantNodes.size;
```

**Example**:

```typescript
{
  coverageScore: 0.78,  // 78% of important nodes covered
  proof: {
    totalImportantNodes: 32,
    usedImportantNodes: 25,
    unusedImportantNodes: 7,
    usedCategories: {
      sections: "8/10 (80%)",
      tables: "4/5 (80%)",
      images: "2/3 (67%)",
      keyParagraphs: "11/14 (79%)"
    },
    missedNodes: [
      {
        nodeId: "table_5",
        type: "TABLE",
        page: 8,
        content: "Regional revenue breakdown",
        importance: "high",
        reason: "Contains detailed regional data not summarized"
      },
      {
        nodeId: "section_appendix",
        type: "SECTION",
        page: 12,
        content: "Appendix A: Methodology",
        importance: "medium",
        reason: "Appendix typically excluded from summaries"
      }
    ]
  }
}
```

**Why this matters**: 
- Ensures no critical section is missed
- Identifies gaps in summary
- Useful for audit trails

---

### 3. Graph Utilization Score (0-1)

**What it proves**: "The system effectively used the knowledge graph structure"

**How it works**:

```typescript
// 1. Count total edges in graph
const totalEdges = Array.from(graph.nodes.values())
  .reduce((sum, node) => sum + node.edges.length, 0);

// 2. Count edges traversed during summarization
// (Tracked automatically during MCP retrieval)
const edgesTraversed = summary.metadata.edgesTraversed;

// 3. Calculate utilization
graphUtilization = edgesTraversed / totalEdges;
```

**Example**:

```typescript
{
  graphUtilization: 0.42,  // 42% of graph edges used
  proof: {
    totalEdges: 389,
    edgesTraversed: 163,
    edgeTypes: {
      hierarchical: 98,   // Section → Subsection (60% of traversals)
      reference: 23,      // Text → Table reference (14%)
      semantic: 32,       // Topic similarity (20%)
      sequential: 10      // Reading order (6%)
    },
    interpretation: "Moderate graph utilization - focused on key connections",
    efficiency: "Used 42% of graph to create comprehensive summary"
  }
}
```

**Why this matters**:
- Validates graph is actually being used (not just brute-force)
- Low score (< 0.2) = Graph underutilized
- Very high score (> 0.8) = Potentially including too much detail

---

### 4. Table/Image Reference Accuracy (0-1)

**What it proves**: "Every reference to tables/images is correct and verifiable"

**How it works**:

```typescript
// 1. Find all table/image references in summary text
const references = extractReferences(summary.summary);
// e.g., "Table 1", "Figure 2", "see Table 3 for details"

// 2. Verify each reference
const verifiedRefs = references.map(ref => {
  // Find corresponding node in graph
  const targetNode = findNodeByReference(graph, ref);
  
  // Check if it's in grounding
  const isGrounded = summary.grounding.some(g => 
    g.sourceNodes.includes(targetNode?.id)
  );
  
  // Verify content matches
  const contentMatches = verifyContent(ref, targetNode);
  
  return { 
    ref, 
    found: !!targetNode, 
    grounded: isGrounded,
    contentAccurate: contentMatches
  };
});

// 3. Calculate accuracy
accuracy = verifiedRefs.filter(v => 
  v.found && v.grounded && v.contentAccurate
).length / references.length;
```

**Example**:

```typescript
{
  tableReferenceAccuracy: 1.0,  // 100% accurate
  imageReferenceAccuracy: 1.0,
  proof: {
    totalReferences: 5,
    correctReferences: 5,
    incorrectReferences: 0,
    details: [
      {
        reference: "Table 1",
        found: true,
        grounded: true,
        contentAccurate: true,
        targetNode: "table_p2_t1",
        caption: "Q4 Revenue by Region",
        page: 2,
        status: "✅ Valid"
      },
      {
        reference: "Figure 2",
        found: true,
        grounded: true,
        contentAccurate: true,
        targetNode: "image_p5_i1",
        caption: "Market Share Trends",
        page: 5,
        status: "✅ Valid"
      }
    ]
  }
}
```

**Why this matters**:
- Critical for financial/legal documents
- Prevents "see Table X" with wrong table
- Enables users to verify data

---

## 🏆 Tier 3: Benchmark Metrics (Optional)

### Principle: "Compare against human-written reference summaries"

Only used when ground truth summaries are available (testing, evaluation datasets).

---

### 1. ROUGE-L Score

**What it measures**: Longest Common Subsequence (LCS) overlap with reference

### 2. BLEU Score

**What it measures**: N-gram precision (commonly used in translation)

### 3. Semantic Similarity

**What it measures**: Embedding distance between generated and reference

**Example**:

```typescript
{
  benchmark: {
    rougeL: 0.72,
    bleuScore: 0.68,
    semanticSimilarity: 0.85,
    interpretation: "High semantic similarity, moderate lexical overlap"
  }
}
```

---

## 🎯 Overall Score Calculation

### Weighted Average Formula

```typescript
overallScore = 
  faithfulness      × 0.25 +  // Most important
  answerRelevancy   × 0.15 +
  contextRecall     × 0.15 +
  contextPrecision  × 0.10 +
  groundingScore    × 0.20 +  // Critical for traceability
  coverageScore     × 0.15
```

### Grading Scale

| Score | Grade | Interpretation |
|-------|-------|----------------|
| 0.90-1.0 | A | Excellent - Production ready |
| 0.80-0.89 | B | Good - Minor improvements possible |
| 0.70-0.79 | C | Acceptable - Meets minimum requirements |
| 0.60-0.69 | D | Needs Improvement - Review required |
| < 0.60 | F | Failed - Regenerate or manual intervention |

**Pass Threshold**: 0.70 (anything below requires human review)

---

## 🚨 Automatic Decision Engine

### Decision Logic

```typescript
function makeDecision(scores: EvaluationScores): EvaluationDecision {
  const issues: string[] = [];
  const actions: string[] = [];
  
  // Critical checks
  if (scores.ragas.faithfulness < 0.80) {
    issues.push("⚠️ Low faithfulness - possible hallucinations");
    actions.push("Verify claims against source");
  }
  
  if (scores.custom.groundingScore < 0.80) {
    issues.push("⚠️ Low grounding - missing source references");
    actions.push("Add grounding to ungrounded statements");
  }
  
  if (scores.custom.coverageScore < 0.70) {
    issues.push("⚠️ Low coverage - important sections missed");
    actions.push("Include missing important nodes");
  }
  
  if (scores.custom.tableReferenceAccuracy < 1.0) {
    issues.push("❌ Table reference errors detected");
    actions.push("Fix or remove incorrect table references");
  }
  
  // Final decision
  const approved = scores.overallScore >= 0.70 && issues.length === 0;
  
  return {
    approved,
    score: scores.overallScore,
    grade: getGrade(scores.overallScore),
    issues,
    actions,
    recommendation: approved ? 
      "✅ Approved for user display" :
      "🚨 Requires improvement or human review"
  };
}
```

### Example Decisions

**Approved Summary**:
```typescript
{
  approved: true,
  score: 0.87,
  grade: "B (Good)",
  issues: [],
  actions: [],
  recommendation: "✅ Approved for user display",
  qualityBadge: "Verified Summary (87%)"
}
```

**Flagged Summary**:
```typescript
{
  approved: false,
  score: 0.64,
  grade: "D (Needs Improvement)",
  issues: [
    "⚠️ Low faithfulness (0.72) - possible hallucinations",
    "⚠️ Low coverage (0.58) - important sections missed"
  ],
  actions: [
    "Verify claims against source document",
    "Include content from missed nodes: table_5, section_3, image_2"
  ],
  recommendation: "🚨 Requires improvement or human review"
}
```

---

## 🔄 Continuous Evaluation Flow

### Automatic Pipeline

```
1. Summary Generated
   ↓
2. Evaluation Engine Triggered
   ↓
3. Run All Metrics (parallel):
   - RAGAS (15-20s)
   - Custom (< 1s)
   - Benchmark (optional, 5s)
   ↓
4. Calculate Overall Score
   ↓
5. Decision Engine
   ↓
6a. If Approved (≥ 0.7):
    - Add quality badge
    - Store with metrics
    - Display to user
   
6b. If Flagged (< 0.7):
    - Log issues
    - Alert monitoring system
    - Queue for human review
    - (Optional) Auto-retry with different prompt
```

### Performance

| Stage | Time | Can Parallelize |
|-------|------|-----------------|
| RAGAS Faithfulness | 8s | ✅ Yes |
| RAGAS Answer Relevancy | 5s | ✅ Yes |
| RAGAS Context Recall | 4s | ✅ Yes |
| RAGAS Context Precision | 3s | ✅ Yes |
| Custom Metrics | < 1s | ✅ Yes |
| Overall Score | < 0.1s | - |
| **Total** | **~20s** | **With parallelization** |

---

## 📊 Real-World Example

### Input Document
"Q4 2024 Financial Report" (25 pages, 142 nodes, 389 edges)

### Generated Summary
```
The company achieved strong financial performance in Q4 2024. Revenue grew 25% 
year-over-year to $125M (Source: Table 1, Page 2), driven by increased market share 
in the SaaS segment (Source: Text Node 5, Page 3). Operating expenses decreased by 10% 
(Source: Table 2, Page 4), resulting in improved profit margins of 32% (Source: Text 
Node 8, Page 4). The company expanded into three new markets (Source: Section 3, 
Page 7) and launched two new products (Source: Text Node 12, Page 8).
```

### Evaluation Results

```json
{
  "ragas": {
    "faithfulness": 0.92,
    "answerRelevancy": 0.88,
    "contextRecall": 0.85,
    "contextPrecision": 0.90
  },
  "custom": {
    "groundingScore": 0.95,
    "coverageScore": 0.78,
    "graphUtilization": 0.42,
    "tableReferenceAccuracy": 1.0,
    "imageReferenceAccuracy": 1.0
  },
  "overallScore": 0.87,
  "grade": "B (Good)",
  "decision": {
    "approved": true,
    "issues": [],
    "recommendation": "✅ Approved for user display"
  }
}
```

### Quality Certificate

```
╔══════════════════════════════════════════════════════╗
║        ✅ VERIFIED SUMMARY - QUALITY PROOF          ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  Overall Score: 0.87 / 1.0  (Grade: B - Good)      ║
║                                                      ║
║  Proof Metrics:                                     ║
║  ✓ Faithfulness:    92%  (11/12 claims verified)   ║
║  ✓ Grounding:       95%  (19/20 statements sourced)║
║  ✓ Coverage:        78%  (25/32 important sections)║
║  ✓ Table Accuracy:  100% (2/2 references valid)    ║
║  ✓ Context Recall:  85%  (17/20 key facts)         ║
║  ✓ Precision:       90%  (9/10 sentences relevant) ║
║                                                      ║
║  Graph Statistics:                                  ║
║  • Nodes Used:      25                             ║
║  • Edges Traversed: 163 (42% of graph)            ║
║  • Pages Referenced: 8                             ║
║                                                      ║
║  Status: ✅ APPROVED for user display              ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

## 💡 Key Principles

### 1. **Automatic Validation**
- No manual review required for most summaries
- System validates itself
- Continuous quality assurance

### 2. **Multi-Dimensional Assessment**
- LLM-based (RAGAS): Semantic correctness
- Programmatic (Custom): Mathematical verification
- Benchmark (Optional): Human reference comparison

### 3. **Actionable Feedback**
- Don't just score - explain WHY
- Provide specific issues ("Low faithfulness: claim X unsupported")
- Suggest concrete actions ("Include missing node: table_5")

### 4. **Traceability**
- Every score has proof/evidence
- Can audit any evaluation decision
- Transparent to users

### 5. **Fail-Safe Design**
- Low scores block user display
- Critical issues trigger alerts
- Human review for edge cases

### 6. **Observable & Monitorable**
- All metrics exported to Prometheus
- Grafana dashboards for trends
- Alert on quality degradation

---

## 🎯 Summary

### What the Evaluation Engine Does

1. **Validates Accuracy** (Faithfulness)
2. **Ensures Completeness** (Coverage, Recall)
3. **Prevents Hallucinations** (Grounding, Faithfulness)
4. **Verifies References** (Table/Image Accuracy)
5. **Proves Quality** (Overall Score with evidence)
6. **Makes Decisions** (Approve/Flag)
7. **Monitors Trends** (Prometheus metrics)

### Core Metrics Summary

| Metric | Type | Purpose |
|--------|------|---------|
| **Faithfulness** | RAGAS | Catch hallucinations |
| **Grounding** | Custom | Ensure traceability |
| **Coverage** | Custom | Prevent missing details |
| **Table/Image Accuracy** | Custom | Verify references |
| **Context Recall** | RAGAS | Measure completeness |
| **Context Precision** | RAGAS | Avoid irrelevance |
| **Graph Utilization** | Custom | Validate graph usage |

### The Result

**Every summary comes with a mathematical proof of its quality**, enabling:
- ✅ Confident deployment to production
- ✅ Automated quality gates
- ✅ Continuous monitoring
- ✅ Audit trails for compliance
- ✅ User trust through transparency

---

## 📖 Implementation

**Code**: `src/services/evaluation/`
- `evaluation.service.ts` - Main orchestrator
- `ragas/ragas-evaluator.ts` - RAGAS metrics
- `custom/custom-evaluator.ts` - Custom metrics
- `types.ts` - TypeScript interfaces

**Architecture**: [`EVALUATION-PROOF.md`](./EVALUATION-PROOF.md) - Complete specification

**Repository**: https://github.com/abezr/pdf-summarize

---

**The evaluation engine is not an afterthought—it's a core architectural component that makes the entire system trustworthy.**
