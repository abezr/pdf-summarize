/**
 * Reference Resolution Service
 *
 * Matches detected references to actual target nodes in the knowledge graph.
 * Implements various resolution strategies for different reference types.
 */

import { GraphNode } from '../../models/graph.model';
import { Graph } from './graph';
import { DetectedReference, ReferenceType } from './reference-patterns';
import { ReferenceResolution } from './reference-detection.service';
import { logger } from '../../utils/logger';

export interface ResolutionContext {
  /** The graph containing all nodes */
  graph: Graph;
  /** The source node making the reference */
  sourceNode: GraphNode;
  /** Additional context for resolution */
  context?: {
    /** Nearby nodes that might be relevant */
    nearbyNodes?: GraphNode[];
    /** Document structure information */
    documentStructure?: {
      totalPages: number;
      sections: GraphNode[];
      figures: GraphNode[];
      tables: GraphNode[];
    };
  };
}

export interface ResolutionStrategy {
  /** Strategy identifier */
  id: string;
  /** Name of the strategy */
  name: string;
  /** Reference types this strategy handles */
  supportedTypes: ReferenceType[];
  /** Priority (higher = preferred) */
  priority: number;
  /** Resolve a reference using this strategy */
  resolve: (
    reference: DetectedReference,
    context: ResolutionContext
  ) => ResolutionResult;
}

export interface ResolutionResult {
  /** Resolved target node (if found) */
  targetNode?: GraphNode;
  /** Resolution confidence (0-1) */
  confidence: number;
  /** Reason for this resolution */
  reason: string;
  /** Alternative candidate nodes */
  candidates?: GraphNode[];
  /** Strategy that produced this result */
  strategyId: string;
}

export class ReferenceResolutionService {
  private static readonly RESOLUTION_STRATEGIES: ResolutionStrategy[] = [
    // Exact section number matching
    {
      id: 'exact_section_match',
      name: 'Exact Section Match',
      supportedTypes: ['section'],
      priority: 10,
      resolve: ReferenceResolutionService.resolveExactSectionMatch,
    },

    // Fuzzy section matching (handle variations)
    {
      id: 'fuzzy_section_match',
      name: 'Fuzzy Section Match',
      supportedTypes: ['section'],
      priority: 8,
      resolve: ReferenceResolutionService.resolveFuzzySectionMatch,
    },

    // Figure number matching
    {
      id: 'figure_number_match',
      name: 'Figure Number Match',
      supportedTypes: ['figure'],
      priority: 9,
      resolve: ReferenceResolutionService.resolveFigureMatch,
    },

    // Table number matching
    {
      id: 'table_number_match',
      name: 'Table Number Match',
      supportedTypes: ['table'],
      priority: 9,
      resolve: ReferenceResolutionService.resolveTableMatch,
    },

    // Page-based resolution
    {
      id: 'page_based_resolution',
      name: 'Page-based Resolution',
      supportedTypes: ['page'],
      priority: 7,
      resolve: ReferenceResolutionService.resolvePageBased,
    },

    // Spatial resolution for cross-references
    {
      id: 'spatial_resolution',
      name: 'Spatial Resolution',
      supportedTypes: ['cross_reference'],
      priority: 5,
      resolve: ReferenceResolutionService.resolveSpatialReference,
    },

    // Semantic similarity fallback
    {
      id: 'semantic_fallback',
      name: 'Semantic Fallback',
      supportedTypes: ['section', 'figure', 'table', 'cross_reference'],
      priority: 1,
      resolve: ReferenceResolutionService.resolveSemanticFallback,
    },
  ];

  /**
   * Resolve a single reference to a target node
   */
  static async resolveReference(
    reference: DetectedReference,
    context: ResolutionContext
  ): Promise<ReferenceResolution> {
    logger.debug('Resolving reference', {
      referenceText: reference.text,
      type: reference.type,
      target: reference.target,
      sourceNodeId: context.sourceNode.id,
    });

    // Get applicable strategies for this reference type
    const applicableStrategies = this.RESOLUTION_STRATEGIES.filter((strategy) =>
      strategy.supportedTypes.includes(reference.type)
    ).sort((a, b) => b.priority - a.priority);

    const candidates: GraphNode[] = [];
    let bestResult: ResolutionResult | null = null;

    // Try each strategy in priority order
    for (const strategy of applicableStrategies) {
      try {
        const result = strategy.resolve(reference, context);

        if (result.targetNode) {
          candidates.push(result.targetNode);
        }

        // Keep track of the best result (even failed ones for better error messages)
        if (!bestResult || result.confidence > bestResult.confidence) {
          bestResult = result;
        }

        if (result.targetNode) {
          logger.debug(`Strategy ${strategy.id} found match`, {
            targetNodeId: result.targetNode.id,
            confidence: result.confidence,
            reason: result.reason,
          });
        }
      } catch (error) {
        logger.warn(`Strategy ${strategy.id} failed:`, error);
      }
    }

    // Create final resolution
    const resolution: ReferenceResolution = {
      reference,
      targetNode: bestResult?.targetNode,
      confidence: bestResult?.confidence || 0,
      reason: bestResult?.reason || 'No suitable target found',
      candidates: candidates.length > 1 ? candidates : undefined,
    };

    logger.debug('Reference resolution completed', {
      referenceText: reference.text,
      found: !!resolution.targetNode,
      confidence: resolution.confidence,
      candidatesCount: candidates.length,
    });

    return resolution;
  }

  /**
   * Resolve multiple references
   */
  static async resolveReferences(
    references: DetectedReference[],
    context: ResolutionContext
  ): Promise<ReferenceResolution[]> {
    const resolutions: ReferenceResolution[] = [];

    for (const reference of references) {
      try {
        const resolution = await this.resolveReference(reference, context);
        resolutions.push(resolution);
      } catch (error) {
        logger.warn(`Failed to resolve reference "${reference.text}":`, error);

        // Return failed resolution
        resolutions.push({
          reference,
          confidence: 0,
          reason: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return resolutions;
  }

  /**
   * Strategy: Exact section number matching
   */
  private static resolveExactSectionMatch(
    reference: DetectedReference,
    context: ResolutionContext
  ): ResolutionResult {
    const targetNumber = reference.target;
    const sectionNodes = context.graph.getNodesByType('section');

    // Look for exact match in section labels or content
    for (const section of sectionNodes) {
      const sectionNumber =
        ReferenceResolutionService.extractSectionNumber(section);
      if (sectionNumber === targetNumber) {
        return {
          targetNode: section,
          confidence: 0.95,
          reason: `Exact section number match: ${targetNumber}`,
          strategyId: 'exact_section_match',
        };
      }
    }

    return {
      confidence: 0,
      reason: `No section found with number ${targetNumber}`,
      strategyId: 'exact_section_match',
    };
  }

  /**
   * Strategy: Fuzzy section matching (handle variations)
   */
  private static resolveFuzzySectionMatch(
    reference: DetectedReference,
    context: ResolutionContext
  ): ResolutionResult {
    const targetNumber = reference.target;
    const sectionNodes = context.graph.getNodesByType('section');

    // Try partial matches and variations
    for (const section of sectionNodes) {
      const sectionNumber =
        ReferenceResolutionService.extractSectionNumber(section);

      // Check for partial matches (e.g., "3.2" might match "3.2.1")
      if (
        sectionNumber?.startsWith(targetNumber) ||
        targetNumber.startsWith(sectionNumber || '')
      ) {
        const confidence =
          ReferenceResolutionService.calculateFuzzyMatchConfidence(
            targetNumber,
            sectionNumber || ''
          );
        if (confidence > 0.6) {
          return {
            targetNode: section,
            confidence,
            reason: `Fuzzy section match: ${targetNumber} ≈ ${sectionNumber}`,
            strategyId: 'fuzzy_section_match',
          };
        }
      }
    }

    return {
      confidence: 0,
      reason: `No fuzzy section match found for ${targetNumber}`,
      strategyId: 'fuzzy_section_match',
    };
  }

  /**
   * Strategy: Figure number matching
   */
  private static resolveFigureMatch(
    reference: DetectedReference,
    context: ResolutionContext
  ): ResolutionResult {
    const targetNumber = reference.target;
    const figureNodes = context.graph.getNodesByType('image');

    for (const figure of figureNodes) {
      const figureNumber =
        ReferenceResolutionService.extractFigureNumber(figure);
      if (figureNumber === targetNumber) {
        return {
          targetNode: figure,
          confidence: 0.9,
          reason: `Exact figure number match: ${targetNumber}`,
          strategyId: 'figure_number_match',
        };
      }
    }

    return {
      confidence: 0,
      reason: `No figure found with number ${targetNumber}`,
      strategyId: 'figure_number_match',
    };
  }

  /**
   * Strategy: Table number matching
   */
  private static resolveTableMatch(
    reference: DetectedReference,
    context: ResolutionContext
  ): ResolutionResult {
    const targetNumber = reference.target;
    const tableNodes = context.graph.getNodesByType('table');

    // First try exact number matching
    for (const table of tableNodes) {
      const tableNumber = ReferenceResolutionService.extractTableNumber(table);
      if (tableNumber === targetNumber) {
        return {
          targetNode: table,
          confidence: 0.9,
          reason: `Exact table number match: ${targetNumber}`,
          strategyId: 'table_number_match',
        };
      }
    }

    // If no exact match and there's only one table, match it anyway
    if (tableNodes.length === 1 && targetNumber === '1') {
      return {
        targetNode: tableNodes[0],
        confidence: 0.7,
        reason: `Only table in document (assuming Table 1)`,
        strategyId: 'table_number_match',
      };
    }

    return {
      confidence: 0,
      reason: `No table found with number ${targetNumber}`,
      strategyId: 'table_number_match',
    };
  }

  /**
   * Strategy: Page-based resolution
   */
  private static resolvePageBased(
    reference: DetectedReference,
    context: ResolutionContext
  ): ResolutionResult {
    const targetPage = parseInt(reference.target);
    if (isNaN(targetPage)) {
      return {
        confidence: 0,
        reason: `Invalid page number: ${reference.target}`,
        strategyId: 'page_based_resolution',
      };
    }

    // Find nodes on the target page
    const pageNodes = context.graph.getNodesByPage(targetPage);

    if (pageNodes.length === 0) {
      return {
        confidence: 0,
        reason: `No nodes found on page ${targetPage}`,
        strategyId: 'page_based_resolution',
      };
    }

    // Return the first substantial node on that page (prefer sections, then paragraphs)
    const preferredNode =
      pageNodes.find((node) => ['section', 'paragraph'].includes(node.type)) ||
      pageNodes[0];

    return {
      targetNode: preferredNode,
      confidence: 0.7,
      reason: `Found content on page ${targetPage}`,
      candidates: pageNodes,
      strategyId: 'page_based_resolution',
    };
  }

  /**
   * Strategy: Spatial resolution for cross-references
   */
  private static resolveSpatialReference(
    reference: DetectedReference,
    context: ResolutionContext
  ): ResolutionResult {
    const text = reference.text.toLowerCase();
    const sourcePosition = context.sourceNode.position;

    if (text.includes('above') || text.includes('previous')) {
      // Look for nodes before the current position
      const earlierNodes = ReferenceResolutionService.findNodesBeforePosition(
        context.graph,
        sourcePosition
      );
      if (earlierNodes.length > 0) {
        const targetNode = earlierNodes[0]; // Most recent before current
        const distance = ReferenceResolutionService.calculatePositionDistance(
          sourcePosition,
          targetNode.position
        );

        return {
          targetNode,
          confidence: Math.max(0.5, 1 - distance / 1000), // Closer = higher confidence
          reason: `Found earlier content (${distance} units before)`,
          candidates: earlierNodes.slice(0, 3),
          strategyId: 'spatial_resolution',
        };
      }
    } else if (
      text.includes('below') ||
      text.includes('next') ||
      text.includes('following')
    ) {
      // Look for nodes after the current position
      const laterNodes = ReferenceResolutionService.findNodesAfterPosition(
        context.graph,
        sourcePosition
      );
      if (laterNodes.length > 0) {
        const targetNode = laterNodes[0]; // Next after current
        const distance = ReferenceResolutionService.calculatePositionDistance(
          targetNode.position,
          sourcePosition
        );

        return {
          targetNode,
          confidence: Math.max(0.5, 1 - distance / 1000),
          reason: `Found later content (${distance} units after)`,
          candidates: laterNodes.slice(0, 3),
          strategyId: 'spatial_resolution',
        };
      }
    }

    return {
      confidence: 0,
      reason: `No spatial match found for "${text}"`,
      strategyId: 'spatial_resolution',
    };
  }

  /**
   * Strategy: Semantic similarity fallback
   */
  private static resolveSemanticFallback(
    reference: DetectedReference,
    context: ResolutionContext
  ): ResolutionResult {
    // Only use semantic fallback for cross-references and spatial references
    // Not for explicit references that should have exact matches
    if (
      reference.type === 'section' ||
      reference.type === 'figure' ||
      reference.type === 'table'
    ) {
      // For explicit references, don't use semantic fallback if the target looks like a number or is empty
      if (/^\d+(\.\d+)*$/.test(reference.target) || reference.target === '') {
        return {
          confidence: 0,
          reason: 'Semantic fallback not applicable for explicit references',
          strategyId: 'semantic_fallback',
        };
      }
    }

    // This would require embeddings/similarity calculation
    // For now, return low confidence for any reasonable candidate
    const candidates = ReferenceResolutionService.findReasonableCandidates(
      reference,
      context
    );
    if (candidates.length > 0) {
      return {
        targetNode: candidates[0],
        confidence: 0.3, // Low confidence for fallback
        reason: 'Semantic similarity fallback match',
        candidates,
        strategyId: 'semantic_fallback',
      };
    }

    return {
      confidence: 0,
      reason: 'No semantic fallback match found',
      strategyId: 'semantic_fallback',
    };
  }

  /**
   * Helper: Extract section number from a section node
   */
  private static extractSectionNumber(section: GraphNode): string | undefined {
    // Try different ways to extract section numbers
    const patterns = [
      /^(\d+(?:\.\d+)*)/, // Number at start
      /Section\s+(\d+(?:\.\d+)*)/i,
      /Sect\.?\s+(\d+(?:\.\d+)*)/i,
    ];

    for (const pattern of patterns) {
      const match =
        section.label.match(pattern) || section.content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Check metadata
    if (section.metadata?.properties?.sectionNumber) {
      return String(section.metadata.properties.sectionNumber);
    }

    return undefined;
  }

  /**
   * Helper: Extract figure number from an image node
   */
  private static extractFigureNumber(figure: GraphNode): string | undefined {
    const patterns = [
      /Figure?\s+(\d+(?:\.\d+)*)/i,
      /Fig\.?\s+(\d+(?:\.\d+)*)/i,
      /^(\d+(?:\.\d+)*)/,
    ];

    for (const pattern of patterns) {
      const match =
        figure.label.match(pattern) || figure.content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Check metadata
    if (figure.metadata?.properties?.figureNumber) {
      return String(figure.metadata.properties.figureNumber);
    }

    return undefined;
  }

  /**
   * Helper: Extract table number from a table node
   */
  private static extractTableNumber(table: GraphNode): string | undefined {
    const patterns = [
      /Table?\s+(\d+(?:\.\d+)*)/i,
      /Tab\.?\s+(\d+(?:\.\d+)*)/i,
      /^(\d+(?:\.\d+)*)/,
    ];

    for (const pattern of patterns) {
      const match = table.label.match(pattern) || table.content.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Check metadata
    if (table.metadata?.properties?.tableNumber) {
      return String(table.metadata.properties.tableNumber);
    }

    return undefined;
  }

  /**
   * Helper: Calculate fuzzy match confidence
   */
  private static calculateFuzzyMatchConfidence(
    target: string,
    candidate: string
  ): number {
    // Handle empty targets (malformed references)
    if (target.length === 0) return 0.1;

    if (target === candidate) return 1.0;

    // Check if one is a prefix of the other
    if (candidate.startsWith(target) || target.startsWith(candidate)) {
      const longer = Math.max(target.length, candidate.length);
      const shorter = Math.min(target.length, candidate.length);
      // Give higher confidence for partial matches (at least 0.6)
      return Math.max(shorter / longer, 0.6);
    }

    // Simple character overlap (exclude punctuation)
    const targetChars = new Set(
      target.split('').filter((c) => /[a-zA-Z0-9]/.test(c))
    );
    const candidateChars = new Set(
      candidate.split('').filter((c) => /[a-zA-Z0-9]/.test(c))
    );
    const intersection = new Set(
      Array.from(targetChars).filter((x) => candidateChars.has(x))
    );
    const union = new Set(
      Array.from(targetChars).concat(Array.from(candidateChars))
    );

    return intersection.size / union.size;
  }

  /**
   * Helper: Find nodes before a given position
   */
  private static findNodesBeforePosition(
    graph: Graph,
    position: GraphNode['position']
  ): GraphNode[] {
    return graph.nodes
      .filter((node) => {
        if (node.position.page < position.page) return true;
        if (node.position.page > position.page) return false;
        return node.position.start < position.start;
      })
      .sort((a, b) => {
        // Sort by position (most recent first)
        if (a.position.page !== b.position.page)
          return b.position.page - a.position.page;
        return b.position.start - a.position.start;
      });
  }

  /**
   * Helper: Find nodes after a given position
   */
  private static findNodesAfterPosition(
    graph: Graph,
    position: GraphNode['position']
  ): GraphNode[] {
    return graph.nodes
      .filter((node) => {
        if (node.position.page > position.page) return true;
        if (node.position.page < position.page) return false;
        return node.position.start > position.end;
      })
      .sort((a, b) => {
        // Sort by position (closest first)
        if (a.position.page !== b.position.page)
          return a.position.page - b.position.page;
        return a.position.start - b.position.start;
      });
  }

  /**
   * Helper: Calculate distance between two positions
   */
  private static calculatePositionDistance(
    pos1: GraphNode['position'],
    pos2: GraphNode['position']
  ): number {
    const pageDiff = Math.abs(pos1.page - pos2.page);
    const charDiff = Math.abs(pos1.start - pos2.start);
    return pageDiff * 1000 + charDiff; // Rough heuristic
  }

  /**
   * Helper: Find reasonable candidates for fallback matching
   */
  private static findReasonableCandidates(
    reference: DetectedReference,
    context: ResolutionContext
  ): GraphNode[] {
    // Return nodes of the expected type that are reasonably close
    let candidates: GraphNode[];

    switch (reference.type) {
      case 'section':
        candidates = context.graph.getNodesByType('section');
        break;
      case 'figure':
        candidates = context.graph.getNodesByType('image');
        break;
      case 'table':
        candidates = context.graph.getNodesByType('table');
        break;
      default:
        candidates = context.graph.getNodesByType('paragraph');
    }

    // Sort by proximity to source node
    return candidates
      .map((node) => ({
        node,
        distance: ReferenceResolutionService.calculatePositionDistance(
          context.sourceNode.position,
          node.position
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map((item) => item.node);
  }
}
