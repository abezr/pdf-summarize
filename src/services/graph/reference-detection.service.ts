/**
 * Reference Detection Service
 *
 * High-level service for detecting and analyzing references in document text.
 * Integrates pattern matching with text analysis to identify cross-references
 * between different parts of documents.
 */

import { ReferenceMatcher } from './reference-matcher';
import { DetectedReference, ReferenceType } from './reference-patterns';
import { GraphNode, NodeType } from '../../models/graph.model';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

export interface ReferenceAnalysis {
  /** The source node where references were found */
  sourceNode: GraphNode;
  /** All detected references */
  references: DetectedReference[];
  /** References grouped by type */
  referencesByType: Record<ReferenceType, DetectedReference[]>;
  /** Statistics about the analysis */
  stats: {
    totalReferences: number;
    uniqueTargets: number;
    confidence: {
      average: number;
      min: number;
      max: number;
    };
    types: Record<ReferenceType, number>;
  };
  /** Analysis metadata */
  metadata: {
    processedAt: Date;
    textLength: number;
    processingTime: number;
  };
}

export interface ReferenceResolution {
  /** The detected reference */
  reference: DetectedReference;
  /** Resolved target node (if found) */
  targetNode?: GraphNode;
  /** Resolution confidence (0-1) */
  confidence: number;
  /** Reason for resolution result */
  reason: string;
  /** Alternative possible targets */
  candidates?: GraphNode[];
}

export class ReferenceDetectionService {
  private static readonly DEFAULT_CONTEXT_WINDOW = 100;

  /**
   * Analyze a text node for references
   */
  static async analyzeNode(node: GraphNode): Promise<ReferenceAnalysis> {
    const startTime = Date.now();

    if (!this.isTextNode(node)) {
      throw new AppError(
        `Cannot analyze references in non-text node: ${node.type}`,
        400,
        { nodeType: node.type }
      );
    }

    logger.debug('Analyzing node for references', {
      nodeId: node.id,
      nodeType: node.type,
      contentLength: node.content.length,
    });

    // Extract text to analyze
    const textToAnalyze = this.extractTextForAnalysis(node);

    // Find all references
    const matchResult = ReferenceMatcher.findReferences(
      textToAnalyze,
      this.DEFAULT_CONTEXT_WINDOW
    );

    // Group references by type
    const referencesByType = this.groupReferencesByType(matchResult.references);

    // Calculate statistics
    const stats = this.calculateAnalysisStats(
      matchResult.references,
      referencesByType
    );

    const analysis: ReferenceAnalysis = {
      sourceNode: node,
      references: matchResult.references,
      referencesByType,
      stats,
      metadata: {
        processedAt: new Date(),
        textLength: textToAnalyze.length,
        processingTime: Date.now() - startTime,
      },
    };

    logger.debug('Reference analysis completed', {
      nodeId: node.id,
      totalReferences: stats.totalReferences,
      uniqueTargets: stats.uniqueTargets,
      processingTime: analysis.metadata.processingTime,
    });

    return analysis;
  }

  /**
   * Analyze multiple nodes for references
   */
  static async analyzeNodes(nodes: GraphNode[]): Promise<ReferenceAnalysis[]> {
    const analyses: ReferenceAnalysis[] = [];

    for (const node of nodes) {
      try {
        if (this.isTextNode(node)) {
          const analysis = await this.analyzeNode(node);
          analyses.push(analysis);
        }
      } catch (error) {
        logger.warn(`Failed to analyze node ${node.id}:`, error);
        // Continue with other nodes
      }
    }

    return analyses;
  }

  /**
   * Analyze text content directly (for testing or standalone use)
   */
  static async analyzeText(
    text: string,
    sourceId: string = 'unknown'
  ): Promise<Omit<ReferenceAnalysis, 'sourceNode'>> {
    const startTime = Date.now();

    logger.debug('Analyzing text for references', {
      sourceId,
      textLength: text.length,
    });

    // Find all references
    const matchResult = ReferenceMatcher.findReferences(
      text,
      this.DEFAULT_CONTEXT_WINDOW
    );

    // Group references by type
    const referencesByType = this.groupReferencesByType(matchResult.references);

    // Calculate statistics
    const stats = this.calculateAnalysisStats(
      matchResult.references,
      referencesByType
    );

    const analysis = {
      references: matchResult.references,
      referencesByType,
      stats,
      metadata: {
        processedAt: new Date(),
        textLength: text.length,
        processingTime: Date.now() - startTime,
      },
    };

    logger.debug('Text reference analysis completed', {
      sourceId,
      totalReferences: stats.totalReferences,
      processingTime: analysis.metadata.processingTime,
    });

    return analysis;
  }

  /**
   * Check if a node type contains analyzable text
   */
  private static isTextNode(node: GraphNode): boolean {
    return ['paragraph', 'section', 'code', 'list', 'metadata'].includes(
      node.type
    );
  }

  /**
   * Extract text content from a node for analysis
   */
  private static extractTextForAnalysis(node: GraphNode): string {
    // For most nodes, use the content field
    let text = node.content;

    // For metadata nodes, might need to extract from properties
    if (node.type === 'metadata' && node.metadata?.properties) {
      const props = node.metadata.properties;
      if (typeof props.value === 'string') {
        text = props.value;
      } else if (typeof props.rawText === 'string') {
        text = props.rawText;
      }
    }

    return text || '';
  }

  /**
   * Group references by their type
   */
  private static groupReferencesByType(
    references: DetectedReference[]
  ): Record<ReferenceType, DetectedReference[]> {
    const groups: Record<ReferenceType, DetectedReference[]> = {
      section: [],
      figure: [],
      table: [],
      page: [],
      citation: [],
      cross_reference: [],
    };

    for (const ref of references) {
      if (groups[ref.type]) {
        groups[ref.type].push(ref);
      }
    }

    return groups;
  }

  /**
   * Calculate statistics for reference analysis
   */
  private static calculateAnalysisStats(
    references: DetectedReference[],
    referencesByType: Record<ReferenceType, DetectedReference[]>
  ) {
    const confidences = references.map((r) => r.confidence);
    const uniqueTargets = new Set(references.map((r) => r.target)).size;

    return {
      totalReferences: references.length,
      uniqueTargets,
      confidence: {
        average:
          confidences.length > 0
            ? confidences.reduce((a, b) => a + b, 0) / confidences.length
            : 0,
        min: confidences.length > 0 ? Math.min(...confidences) : 0,
        max: confidences.length > 0 ? Math.max(...confidences) : 0,
      },
      types: Object.fromEntries(
        Object.entries(referencesByType).map(([type, refs]) => [
          type,
          refs.length,
        ])
      ) as Record<ReferenceType, number>,
    };
  }

  /**
   * Get references that might point to specific node types
   */
  static filterReferencesByTargetType(
    references: DetectedReference[],
    targetType: NodeType
  ): DetectedReference[] {
    return references.filter((ref) => {
      switch (targetType) {
        case 'section':
          return ref.type === 'section' || ref.type === 'cross_reference';
        case 'image':
          return ref.type === 'figure';
        case 'table':
          return ref.type === 'table';
        case 'paragraph':
          return ref.type === 'page' || ref.type === 'cross_reference';
        default:
          return true; // Include all for other types
      }
    });
  }

  /**
   * Validate reference analysis results
   */
  static validateAnalysis(analysis: ReferenceAnalysis): {
    isValid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for empty content
    if (analysis.metadata.textLength === 0) {
      issues.push('Cannot analyze empty text');
    }

    // Check for excessive references
    if (analysis.stats.totalReferences > analysis.metadata.textLength / 10) {
      warnings.push('High reference density - possible false positives');
    }

    // Check confidence scores
    if (analysis.stats.confidence.average < 0.4) {
      warnings.push('Low average confidence in reference detection');
    }

    if (analysis.stats.confidence.min < 0.2) {
      warnings.push('Some references have very low confidence');
    }

    // Check for reasonable processing time
    if (analysis.metadata.processingTime > 5000) {
      warnings.push('Reference analysis took unusually long');
    }

    // Check for type distribution
    const typesWithRefs = Object.values(analysis.stats.types).filter(
      (count) => count > 0
    ).length;
    if (typesWithRefs === 0 && analysis.metadata.textLength > 100) {
      warnings.push('No references detected in substantial text');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * Get summary statistics across multiple analyses
   */
  static getSummaryStats(analyses: ReferenceAnalysis[]): {
    totalNodesAnalyzed: number;
    totalReferencesFound: number;
    averageReferencesPerNode: number;
    mostCommonReferenceType: ReferenceType | null;
    averageConfidence: number;
    totalProcessingTime: number;
  } {
    const totalReferences = analyses.reduce(
      (sum, a) => sum + a.stats.totalReferences,
      0
    );
    const totalConfidence = analyses.reduce(
      (sum, a) => sum + a.stats.confidence.average,
      0
    );
    const totalProcessingTime = analyses.reduce(
      (sum, a) => sum + a.metadata.processingTime,
      0
    );

    // Find most common reference type
    const typeCounts: Record<ReferenceType, number> = {
      section: 0,
      figure: 0,
      table: 0,
      page: 0,
      citation: 0,
      cross_reference: 0,
    };

    for (const analysis of analyses) {
      for (const [type, count] of Object.entries(analysis.stats.types)) {
        typeCounts[type as ReferenceType] += count;
      }
    }

    const mostCommonType =
      (Object.entries(typeCounts)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)[0]?.[0] as ReferenceType) || null;

    return {
      totalNodesAnalyzed: analyses.length,
      totalReferencesFound: totalReferences,
      averageReferencesPerNode:
        analyses.length > 0 ? totalReferences / analyses.length : 0,
      mostCommonReferenceType: mostCommonType,
      averageConfidence:
        analyses.length > 0 ? totalConfidence / analyses.length : 0,
      totalProcessingTime,
    };
  }
}
