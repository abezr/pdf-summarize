import { llmProviderManager } from '../../llm';
import { logger } from '../../../utils/logger';
import { spanHelpers, contextHelpers } from '../../../observability/tracing/tracer';
import { CustomMetrics, EvaluationInput } from '../types';

export class CustomEvaluator {
  /**
   * Evaluate summary using custom domain-specific metrics
   * These metrics are specific to the knowledge graph architecture
   */
  async evaluate(input: EvaluationInput): Promise<CustomMetrics> {
    return contextHelpers.withSpan('evaluation.custom', async (span) => {
      span.setAttributes({
        'evaluation.document_id': input.documentId,
        'evaluation.type': 'custom',
      });

      try {
        logger.debug('Starting custom evaluation', {
          documentId: input.documentId,
          hasGraph: !!input.graph,
        });

        // Run custom metrics in parallel where possible
        const [
          groundingScore,
          coverageScore,
          graphUtilization,
          tableAccuracy,
          referenceAccuracy,
        ] = await Promise.all([
          this.evaluateGroundingScore(input),
          this.evaluateCoverageScore(input),
          this.evaluateGraphUtilization(input),
          this.evaluateTableAccuracy(input),
          this.evaluateReferenceAccuracy(input),
        ]);

        const metrics: CustomMetrics = {
          groundingScore,
          coverageScore,
          graphUtilization,
          tableAccuracy,
          referenceAccuracy,
        };

        logger.info('Custom evaluation completed', {
          documentId: input.documentId,
          metrics,
        });

        span.setAttributes({
          'evaluation.custom.grounding_score': groundingScore,
          'evaluation.custom.coverage_score': coverageScore,
          'evaluation.custom.graph_utilization': graphUtilization,
          'evaluation.custom.table_accuracy': tableAccuracy,
          'evaluation.custom.reference_accuracy': referenceAccuracy,
        });

        return metrics;

      } catch (error) {
        spanHelpers.recordError(span, error as Error);
        logger.error('Custom evaluation failed', {
          documentId: input.documentId,
          error: (error as Error).message,
        });
        throw error;
      }
    });
  }

  /**
   * Grounding Score: Percentage of statements with traceable references
   * Measures how well each claim in the summary can be traced back to source nodes
   */
  private async evaluateGroundingScore(input: EvaluationInput): Promise<number> {
    // Look for grounding references in the summary
    // These are typically in format: [Node:123] or (see Table 1) or [p. 45]
    const groundingPatterns = [
      /\[Node:\s*\d+\]/gi,           // [Node: 123]
      /\[p\.\s*\d+\]/gi,             // [p. 45]
      /\(see\s+(Table|Figure|Section)\s+\d+\)/gi,  // (see Table 1)
      /\(Section\s+\d+(?:\.\d+)*\)/gi,  // (Section 2.1)
    ];

    const summaryText = input.summary;
    let groundedStatements = 0;
    let totalStatements = 0;

    // Split summary into statements (rough approximation)
    const statements = summaryText.split(/[.!?]+/).filter(s => s.trim().length > 10);

    for (const statement of statements) {
      totalStatements++;
      const hasReference = groundingPatterns.some(pattern => pattern.test(statement));
      if (hasReference) {
        groundedStatements++;
      }
    }

    if (totalStatements === 0) return 0;

    const score = groundedStatements / totalStatements;

    logger.debug('Grounding score calculated', {
      documentId: input.documentId,
      groundedStatements,
      totalStatements,
      score,
    });

    return score;
  }

  /**
   * Coverage Score: Percentage of important nodes used in summary
   * Measures how much of the document's key information is included
   */
  private async evaluateCoverageScore(input: EvaluationInput): Promise<number> {
    if (!input.graph || !input.graph.nodes) {
      logger.warn('No graph available for coverage evaluation', { documentId: input.documentId });
      return 0.5; // Neutral score when no graph
    }

    // Identify important nodes (headings, key paragraphs, tables)
    const importantNodeTypes = ['heading', 'table', 'image', 'key_paragraph'];
    const importantNodes = input.graph.nodes.filter((node: any) =>
      importantNodeTypes.includes(node.type) ||
      (node.type === 'paragraph' && node.content?.length > 200) // Long paragraphs likely important
    );

    if (importantNodes.length === 0) {
      return 1.0; // No important nodes to cover
    }

    // Check how many important nodes are referenced in the summary
    const summaryText = input.summary.toLowerCase();
    let coveredNodes = 0;

    for (const node of importantNodes) {
      const nodeContent = (node.content || node.text || '').toLowerCase();

      // Look for substantial overlap between summary and node content
      if (this.hasSubstantialOverlap(summaryText, nodeContent)) {
        coveredNodes++;
      }
    }

    const score = coveredNodes / importantNodes.length;

    logger.debug('Coverage score calculated', {
      documentId: input.documentId,
      importantNodes: importantNodes.length,
      coveredNodes,
      score,
    });

    return score;
  }

  /**
   * Graph Utilization: Fraction of graph edges traversed
   * Measures how much of the document's connectivity is used
   */
  private async evaluateGraphUtilization(input: EvaluationInput): Promise<number> {
    if (!input.graph || !input.graph.edges) {
      logger.warn('No graph available for utilization evaluation', { documentId: input.documentId });
      return 0.5;
    }

    const totalEdges = input.graph.edges.length;
    if (totalEdges === 0) {
      return 1.0; // No edges to traverse
    }

    // Count different edge types that are "utilized" by being referenced
    const summaryText = input.summary.toLowerCase();
    let utilizedEdges = 0;

    for (const edge of input.graph.edges) {
      const fromNode = input.graph.nodes.find((n: any) => n.id === edge.from);
      const toNode = input.graph.nodes.find((n: any) => n.id === edge.to);

      if (fromNode && toNode) {
        // Check if both nodes are referenced in the summary
        const fromContent = (fromNode.content || fromNode.text || '').toLowerCase();
        const toContent = (toNode.content || toNode.text || '').toLowerCase();

        if (this.hasSubstantialOverlap(summaryText, fromContent) &&
            this.hasSubstantialOverlap(summaryText, toContent)) {
          utilizedEdges++;
        }
      }
    }

    const score = utilizedEdges / totalEdges;

    logger.debug('Graph utilization score calculated', {
      documentId: input.documentId,
      totalEdges,
      utilizedEdges,
      score,
    });

    return score;
  }

  /**
   * Table Accuracy: Accuracy of table references
   * Measures if tables mentioned in summary actually exist and are correctly referenced
   */
  private async evaluateTableAccuracy(input: EvaluationInput): Promise<number> {
    if (!input.graph || !input.graph.nodes) {
      return 0.5;
    }

    // Find all table references in summary
    const tableRefs = input.summary.match(/Table\s+\d+/gi) || [];
    const figureRefs = input.summary.match(/Figure\s+\d+/gi) || [];

    const allRefs = [...tableRefs, ...figureRefs];
    if (allRefs.length === 0) {
      return 1.0; // No references to validate
    }

    // Find actual tables/figures in the graph
    const actualTables = input.graph.nodes.filter((node: any) =>
      node.type === 'table' || node.type === 'image'
    );

    let correctRefs = 0;

    for (const ref of allRefs) {
      // Extract number from reference (e.g., "Table 1" -> 1)
      const match = ref.match(/\d+/);
      if (match) {
        const refNumber = parseInt(match[0]);
        // Check if a table/image with this number exists
        const exists = actualTables.some((table: any) => {
          const tableNumber = this.extractTableNumber(table);
          return tableNumber === refNumber;
        });

        if (exists) {
          correctRefs++;
        }
      }
    }

    const score = correctRefs / allRefs.length;

    logger.debug('Table accuracy score calculated', {
      documentId: input.documentId,
      totalRefs: allRefs.length,
      correctRefs,
      score,
    });

    return score;
  }

  /**
   * Reference Accuracy: Accuracy of cross-references
   * Measures if section/page references are correct
   */
  private async evaluateReferenceAccuracy(input: EvaluationInput): Promise<number> {
    // Look for references like "Section 2.1", "page 45", etc.
    const refPatterns = [
      /Section\s+\d+(?:\.\d+)*/gi,
      /page\s+\d+/gi,
      /p\.\s*\d+/gi,
    ];

    let totalRefs = 0;
    let correctRefs = 0;

    for (const pattern of refPatterns) {
      const matches = input.summary.match(pattern);
      if (matches) {
        totalRefs += matches.length;
        // For now, assume references are correct if they follow expected format
        // In a full implementation, we'd validate against actual document structure
        correctRefs += matches.length;
      }
    }

    if (totalRefs === 0) {
      return 1.0; // No references to validate
    }

    const score = correctRefs / totalRefs;

    logger.debug('Reference accuracy score calculated', {
      documentId: input.documentId,
      totalRefs,
      correctRefs,
      score,
    });

    return score;
  }

  /**
   * Check if there's substantial overlap between two texts
   */
  private hasSubstantialOverlap(text1: string, text2: string): boolean {
    if (!text1 || !text2) return false;

    // Simple word overlap check
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const overlapRatio = intersection.size / union.size;

    // Consider it substantial overlap if > 20% word overlap
    return overlapRatio > 0.2;
  }

  /**
   * Extract table number from table node
   */
  private extractTableNumber(table: any): number | null {
    // Try to extract number from table content or metadata
    const content = table.content || table.text || '';
    const match = content.match(/Table\s+(\d+)/i);
    if (match) {
      return parseInt(match[1]);
    }

    // Check metadata
    if (table.metadata?.tableNumber) {
      return table.metadata.tableNumber;
    }

    return null;
  }
}
