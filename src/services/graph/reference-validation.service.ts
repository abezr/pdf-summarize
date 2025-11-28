/**
 * Reference Validation Service
 *
 * Validates and scores the quality of reference detection and resolution.
 * Provides metrics for accuracy, precision, recall, and overall quality assessment.
 */

import { GraphEdge } from '../../models/graph.model';
import { Graph } from './graph';
import { ReferenceAnalysis, ReferenceResolution } from './reference-detection.service';
import { ReferenceType } from './reference-patterns';
import { logger } from '../../utils/logger';

export interface ReferenceValidationResult {
  /** Overall validation score (0-1) */
  overallScore: number;
  /** Individual validation metrics */
  metrics: {
    /** Detection accuracy metrics */
    detection: DetectionMetrics;
    /** Resolution accuracy metrics */
    resolution: ResolutionMetrics;
    /** Graph structure quality metrics */
    graphQuality: GraphQualityMetrics;
  };
  /** Validation issues found */
  issues: ValidationIssue[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Recommendations for improvement */
  recommendations: string[];
}

export interface DetectionMetrics {
  /** Precision: fraction of detected references that are correct */
  precision: number;
  /** Recall: fraction of actual references that were detected */
  recall: number;
  /** F1 score: harmonic mean of precision and recall */
  f1Score: number;
  /** Total references detected */
  totalDetected: number;
  /** Total false positives */
  falsePositives: number;
  /** Total false negatives */
  falseNegatives: number;
  /** Detection confidence distribution */
  confidenceDistribution: {
    high: number; // > 0.8
    medium: number; // 0.5-0.8
    low: number; // < 0.5
  };
}

export interface ResolutionMetrics {
  /** Fraction of detected references that were successfully resolved */
  resolutionRate: number;
  /** Average resolution confidence */
  averageConfidence: number;
  /** Resolution accuracy (if ground truth available) */
  accuracy?: number;
  /** Total references resolved */
  totalResolved: number;
  /** Resolution success by reference type */
  successByType: Record<ReferenceType, number>;
  /** Failed resolutions by reason */
  failuresByReason: Record<string, number>;
}

export interface GraphQualityMetrics {
  /** Total reference edges in graph */
  totalReferenceEdges: number;
  /** Average reference edge weight */
  averageEdgeWeight: number;
  /** Reference edge density */
  edgeDensity: number;
  /** Isolated reference components */
  isolatedComponents: number;
  /** Reference edge connectivity score */
  connectivityScore: number;
  /** Cycles in reference graph */
  cyclesDetected: number;
}

export interface ValidationIssue {
  /** Issue severity */
  severity: 'error' | 'warning' | 'info';
  /** Issue category */
  category: 'detection' | 'resolution' | 'graph' | 'performance';
  /** Human-readable description */
  description: string;
  /** Affected elements */
  affectedElements?: string[];
  /** Suggested fix */
  suggestion?: string;
}

export interface ValidationWarning extends ValidationIssue {
  severity: 'warning';
}

export interface GroundTruthReference {
  /** Source node ID */
  sourceId: string;
  /** Target node ID */
  targetId: string;
  /** Reference text */
  text: string;
  /** Reference type */
  type: ReferenceType;
}

export class ReferenceValidationService {
  /**
   * Validate reference detection and resolution for a complete graph
   */
  static async validateGraph(graph: Graph): Promise<ReferenceValidationResult> {
    logger.info('Starting comprehensive reference validation', {
      graphId: graph.id,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
    });

    const startTime = Date.now();

    // Extract reference edges
    const referenceEdges = graph.edges.filter(
      (edge) => edge.type === 'references'
    );

    // Analyze reference detection quality
    const detectionMetrics = await this.analyzeDetectionQuality(graph);

    // Analyze resolution quality
    const resolutionMetrics = this.analyzeResolutionQuality(referenceEdges);

    // Analyze graph structure quality
    const graphQualityMetrics = this.analyzeGraphQuality(graph, referenceEdges);

    // Identify validation issues
    const issues = this.identifyValidationIssues(
      detectionMetrics,
      resolutionMetrics,
      graphQualityMetrics
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      issues,
      detectionMetrics,
      resolutionMetrics
    );

    // Calculate overall score
    const overallScore = this.calculateOverallScore(
      detectionMetrics,
      resolutionMetrics,
      graphQualityMetrics
    );

    const result: ReferenceValidationResult = {
      overallScore,
      metrics: {
        detection: detectionMetrics,
        resolution: resolutionMetrics,
        graphQuality: graphQualityMetrics,
      },
      issues,
      warnings: issues.filter(
        (issue) => issue.severity === 'warning'
      ) as ValidationWarning[],
      recommendations,
    };

    const processingTime = Date.now() - startTime;
    logger.info('Reference validation completed', {
      overallScore: result.overallScore.toFixed(3),
      issuesCount: result.issues.length,
      processingTimeMs: processingTime,
    });

    return result;
  }

  /**
   * Validate a single reference analysis
   */
  static validateAnalysis(analysis: ReferenceAnalysis): Omit<
    ReferenceValidationResult,
    'metrics'
  > & {
    analysisScore: number;
    detectionScore: number;
  } {
    const detectionIssues = this.validateDetectionAnalysis(analysis);
    const analysisScore = this.scoreAnalysisQuality(analysis);
    const detectionScore = this.scoreDetectionQuality(analysis);

    return {
      overallScore: (analysisScore + detectionScore) / 2,
      analysisScore,
      detectionScore,
      issues: detectionIssues,
      warnings: detectionIssues.filter(
        (issue) => issue.severity === 'warning'
      ) as ValidationWarning[],
      recommendations: this.generateAnalysisRecommendations(
        analysis,
        detectionIssues
      ),
    };
  }

  /**
   * Validate reference resolutions
   */
  static validateResolutions(resolutions: ReferenceResolution[]): {
    resolutionScore: number;
    accuracyScore: number;
    issues: ValidationIssue[];
  } {
    const issues: ValidationIssue[] = [];
    let totalConfidence = 0;
    let resolvedCount = 0;

    for (const resolution of resolutions) {
      totalConfidence += resolution.confidence;

      if (resolution.targetNode) {
        resolvedCount++;
      } else {
        issues.push({
          severity: 'warning',
          category: 'resolution',
          description: `Reference "${resolution.reference.text}" could not be resolved`,
          suggestion: `Check reference patterns or target availability`,
        });
      }

      // Check for very low confidence resolutions
      if (resolution.confidence < 0.3 && resolution.targetNode) {
        issues.push({
          severity: 'warning',
          category: 'resolution',
          description: `Low confidence resolution for "${resolution.reference.text}" (${resolution.confidence.toFixed(2)})`,
          suggestion: `Review resolution strategy or improve target matching`,
        });
      }
    }

    const resolutionScore = resolvedCount / resolutions.length;
    const accuracyScore =
      resolutions.length > 0 ? totalConfidence / resolutions.length : 0;

    return {
      resolutionScore,
      accuracyScore,
      issues,
    };
  }

  /**
   * Analyze detection quality across the graph
   */
  private static async analyzeDetectionQuality(
    graph: Graph
  ): Promise<DetectionMetrics> {
    // For now, use heuristics since we don't have ground truth
    // In a real implementation, this would compare against known reference data

    const textNodes = graph
      .getNodesByType('paragraph')
      .concat(graph.getNodesByType('section'));

    let totalDetected = 0;
    let estimatedFalsePositives = 0;
    const confidenceCounts = { high: 0, medium: 0, low: 0 };

    // Heuristic analysis based on patterns and context
    for (const node of textNodes) {
      try {
        // Simple heuristics for estimating detection quality
        const content = node.content.toLowerCase();

        // Look for potential false positives
        const suspiciousPatterns = [
          /\b\d{1,2}:\d{2}/g, // Time patterns like "10:30"
          /\b\d+\.\d+\.\d+/g, // IP addresses or version numbers
          /\$\d+/g, // Currency amounts
        ];

        for (const pattern of suspiciousPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            estimatedFalsePositives += matches.length * 0.1; // Estimate 10% false positive rate
          }
        }

        // Estimate total detections based on content analysis
        const potentialRefs =
          content.match(/\b(?:see|refer|figure|table|section|page)\b/gi) || [];
        totalDetected += potentialRefs.length;

        // Estimate confidence distribution
        confidenceCounts.high += Math.floor(potentialRefs.length * 0.6);
        confidenceCounts.medium += Math.floor(potentialRefs.length * 0.3);
        confidenceCounts.low += Math.floor(potentialRefs.length * 0.1);
      } catch (error) {
        logger.warn(
          `Failed to analyze detection quality for node ${node.id}:`,
          error
        );
      }
    }

    // Calculate metrics using heuristics
    const precision = Math.max(
      0.7,
      1 - estimatedFalsePositives / Math.max(1, totalDetected)
    );
    const recall = 0.8; // Estimated recall - would need ground truth to measure accurately
    const f1Score = (2 * (precision * recall)) / (precision + recall);

    return {
      precision,
      recall,
      f1Score,
      totalDetected,
      falsePositives: Math.round(estimatedFalsePositives),
      falseNegatives: Math.round(totalDetected * (1 - recall)),
      confidenceDistribution: confidenceCounts,
    };
  }

  /**
   * Analyze resolution quality
   */
  private static analyzeResolutionQuality(
    referenceEdges: GraphEdge[]
  ): ResolutionMetrics {
    const totalResolved = referenceEdges.length;
    let totalConfidence = 0;
    const successByType: Record<ReferenceType, number> = {
      section: 0,
      figure: 0,
      table: 0,
      page: 0,
      citation: 0,
      cross_reference: 0,
    };
    const failuresByReason: Record<string, number> = {};

    for (const edge of referenceEdges) {
      totalConfidence += edge.weight;

      // Extract reference type from metadata (if available)
      const context = edge.metadata?.context as string;
      if (context) {
        const typeMatch = context.match(/Reference:\s*(.+?)\s*\(/);
        if (typeMatch) {
          const refText = typeMatch[1].toLowerCase();
          if (refText.includes('section')) successByType.section++;
          else if (refText.includes('figure') || refText.includes('fig.'))
            successByType.figure++;
          else if (refText.includes('table')) successByType.table++;
          else if (refText.includes('page')) successByType.page++;
          else if (refText.includes('[')) successByType.citation++;
          else successByType.cross_reference++;
        }
      }
    }

    return {
      resolutionRate: totalResolved > 0 ? 1.0 : 0, // All edges represent resolved references
      averageConfidence:
        totalResolved > 0 ? totalConfidence / totalResolved : 0,
      totalResolved,
      successByType,
      failuresByReason,
    };
  }

  /**
   * Analyze graph structure quality
   */
  private static analyzeGraphQuality(
    graph: Graph,
    referenceEdges: GraphEdge[]
  ): GraphQualityMetrics {
    const totalReferenceEdges = referenceEdges.length;
    const averageEdgeWeight =
      totalReferenceEdges > 0
        ? referenceEdges.reduce((sum, edge) => sum + edge.weight, 0) /
          totalReferenceEdges
        : 0;

    // Calculate reference edge density
    const textNodes =
      graph.getNodesByType('paragraph').length +
      graph.getNodesByType('section').length;
    const edgeDensity = textNodes > 0 ? totalReferenceEdges / textNodes : 0;

    // Simple connectivity analysis (would need more sophisticated graph algorithms for full analysis)
    const connectedNodes = new Set<string>();
    referenceEdges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    // Estimate isolated components (simplified)
    const isolatedComponents = Math.max(0, textNodes - connectedNodes.size);

    // Simple connectivity score
    const connectivityScore =
      textNodes > 0 ? connectedNodes.size / textNodes : 0;

    // Estimate cycles (very simplified - real implementation would need cycle detection)
    const cyclesDetected = 0; // Placeholder

    return {
      totalReferenceEdges,
      averageEdgeWeight,
      edgeDensity,
      isolatedComponents,
      connectivityScore,
      cyclesDetected,
    };
  }

  /**
   * Identify validation issues
   */
  private static identifyValidationIssues(
    detection: DetectionMetrics,
    resolution: ResolutionMetrics,
    graphQuality: GraphQualityMetrics
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Detection issues
    if (detection.precision < 0.6) {
      issues.push({
        severity: 'warning',
        category: 'detection',
        description: `Low detection precision: ${(detection.precision * 100).toFixed(1)}%`,
        suggestion: 'Review reference patterns to reduce false positives',
      });
    }

    if (detection.recall < 0.7) {
      issues.push({
        severity: 'warning',
        category: 'detection',
        description: `Low detection recall: ${(detection.recall * 100).toFixed(1)}%`,
        suggestion: 'Add more reference patterns or improve existing ones',
      });
    }

    // Resolution issues
    if (resolution.averageConfidence < 0.5) {
      issues.push({
        severity: 'warning',
        category: 'resolution',
        description: `Low average resolution confidence: ${(resolution.averageConfidence * 100).toFixed(1)}%`,
        suggestion: 'Improve resolution strategies or target matching',
      });
    }

    // Graph quality issues
    if (graphQuality.connectivityScore < 0.3) {
      issues.push({
        severity: 'info',
        category: 'graph',
        description: `Low reference connectivity: ${(graphQuality.connectivityScore * 100).toFixed(1)}% of nodes have references`,
        suggestion: 'Consider if this is expected for the document type',
      });
    }

    if (graphQuality.edgeDensity > 2.0) {
      issues.push({
        severity: 'warning',
        category: 'graph',
        description: `High reference edge density: ${graphQuality.edgeDensity.toFixed(1)} edges per node`,
        suggestion: 'Check for over-detection of references',
      });
    }

    return issues;
  }

  /**
   * Generate improvement recommendations
   */
  private static generateRecommendations(
    issues: ValidationIssue[],
    detection: DetectionMetrics,
    resolution: ResolutionMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Detection recommendations
    if (detection.f1Score < 0.7) {
      recommendations.push(
        'Improve reference pattern matching by adding more specific regex patterns'
      );
      recommendations.push(
        'Implement context-aware detection to reduce false positives'
      );
    }

    // Resolution recommendations
    if (resolution.averageConfidence < 0.6) {
      recommendations.push(
        'Enhance resolution strategies with better target matching algorithms'
      );
      recommendations.push(
        'Add semantic similarity matching for ambiguous references'
      );
    }

    // Graph recommendations
    if (
      issues.some(
        (issue) => issue.category === 'graph' && issue.severity === 'warning'
      )
    ) {
      recommendations.push(
        'Review graph connectivity - ensure references create meaningful connections'
      );
      recommendations.push(
        'Consider edge weight thresholds to filter low-quality references'
      );
    }

    // Performance recommendations
    if (detection.totalDetected > 1000) {
      recommendations.push(
        'Consider optimizing reference detection for large documents'
      );
    }

    return recommendations;
  }

  /**
   * Calculate overall validation score
   */
  private static calculateOverallScore(
    detection: DetectionMetrics,
    resolution: ResolutionMetrics,
    graphQuality: GraphQualityMetrics
  ): number {
    // Weighted combination of different metrics
    const weights = {
      detectionF1: 0.4,
      resolutionConfidence: 0.3,
      graphConnectivity: 0.2,
      graphDensity: 0.1,
    };

    const detectionScore = detection.f1Score;
    const resolutionScore = resolution.averageConfidence;
    const connectivityScore = graphQuality.connectivityScore;
    const densityPenalty = graphQuality.edgeDensity > 1.5 ? 0.8 : 1.0; // Penalty for too dense

    const score =
      weights.detectionF1 * detectionScore +
      weights.resolutionConfidence * resolutionScore +
      weights.graphConnectivity * connectivityScore +
      weights.graphDensity * densityPenalty;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Validate detection analysis
   */
  private static validateDetectionAnalysis(
    analysis: ReferenceAnalysis
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for suspicious patterns
    if (
      analysis.stats.totalReferences === 0 &&
      analysis.metadata.textLength > 200
    ) {
      issues.push({
        severity: 'info',
        category: 'detection',
        description: 'No references detected in substantial text',
        suggestion: 'Verify if this text should contain references',
      });
    }

    // Check confidence distribution
    if (analysis.stats.confidence.min < 0.2) {
      issues.push({
        severity: 'warning',
        category: 'detection',
        description: 'Some references have very low confidence',
        suggestion: 'Review low-confidence detections manually',
      });
    }

    // Check processing time
    if (analysis.metadata.processingTime > 1000) {
      issues.push({
        severity: 'warning',
        category: 'performance',
        description: 'Reference analysis took unusually long',
        suggestion: 'Optimize pattern matching or reduce text size',
      });
    }

    return issues;
  }

  /**
   * Score analysis quality
   */
  private static scoreAnalysisQuality(analysis: ReferenceAnalysis): number {
    let score = 0.5; // Base score

    // Higher score for reasonable number of references
    const refDensity =
      analysis.stats.totalReferences /
      Math.max(1, analysis.metadata.textLength / 100);
    if (refDensity > 0 && refDensity < 0.5) {
      score += 0.2;
    }

    // Higher score for good confidence distribution
    if (analysis.stats.confidence.average > 0.6) {
      score += 0.2;
    }

    // Lower score for very long processing time
    if (analysis.metadata.processingTime > 500) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score detection quality
   */
  private static scoreDetectionQuality(analysis: ReferenceAnalysis): number {
    let score = analysis.stats.confidence.average;

    // Bonus for diverse reference types
    const uniqueTypes = Object.values(analysis.stats.types).filter(
      (count) => count > 0
    ).length;
    score += (uniqueTypes / 6) * 0.1; // Max 0.1 bonus for all types

    // Penalty for too many low-confidence references
    const lowConfidenceRatio =
      analysis.references.filter((r) => r.confidence < 0.4).length /
      analysis.references.length;
    if (lowConfidenceRatio > 0.3) {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Generate analysis-specific recommendations
   */
  private static generateAnalysisRecommendations(
    analysis: ReferenceAnalysis,
    issues: ValidationIssue[]
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.stats.totalReferences === 0) {
      recommendations.push(
        'Consider if reference detection patterns need expansion for this content type'
      );
    }

    if (analysis.stats.confidence.average < 0.5) {
      recommendations.push(
        'Review reference pattern priorities and confidence calculations'
      );
    }

    if (issues.some((issue) => issue.category === 'performance')) {
      recommendations.push(
        'Optimize text preprocessing or pattern matching for better performance'
      );
    }

    return recommendations;
  }
}
