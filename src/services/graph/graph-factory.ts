import { v4 as uuidv4 } from 'uuid';
import {
  GraphNode,
  GraphEdge,
  CreateNodeInput,
  CreateEdgeInput,
  NODE_TYPES,
  EDGE_TYPES,
  Position,
  NodeMetadata,
} from '../../models';

/**
 * Factory class for creating graph nodes and edges with proper validation and defaults
 */
export class GraphFactory {
  /**
   * Create a new graph node with generated ID and timestamps
   */
  static createNode(input: CreateNodeInput): GraphNode {
    this.validateNodeInput(input);

    const now = new Date();
    const node: GraphNode = {
      id: uuidv4(),
      type: input.type,
      label: input.label,
      content: input.content,
      position: input.position,
      metadata: input.metadata || {},
      created_at: now,
      updated_at: now,
    };

    return node;
  }

  /**
   * Create a new graph edge with generated ID and defaults
   */
  static createEdge(input: CreateEdgeInput): GraphEdge {
    this.validateEdgeInput(input);

    const now = new Date();
    const edge: GraphEdge = {
      id: uuidv4(),
      source: input.source,
      target: input.target,
      type: input.type,
      weight: input.weight ?? 1.0,
      metadata: input.metadata || {},
      created_at: now,
    };

    return edge;
  }

  /**
   * Create a document root node
   */
  static createDocumentNode(
    filename: string,
    totalPages: number,
    fileSize: number,
    metadata?: NodeMetadata
  ): GraphNode {
    // Ensure fileSize is at least 1 for valid position range
    const validFileSize = Math.max(1, fileSize);

    return this.createNode({
      type: 'document',
      label: `Document: ${filename}`,
      content: `PDF Document: ${filename} (${totalPages} pages, ${fileSize} bytes)`,
      position: {
        page: 1,
        start: 0,
        end: validFileSize, // Use file size as content length approximation
      },
      metadata: {
        confidence: 1.0,
        properties: {
          totalPages,
          fileSize,
          filename,
        },
        ...metadata,
      },
    });
  }

  /**
   * Create a section node (heading)
   */
  static createSectionNode(
    title: string,
    level: number,
    position: Position,
    confidence: number = 0.9,
    metadata?: NodeMetadata
  ): GraphNode {
    return this.createNode({
      type: 'section',
      label: `Section: ${title}`,
      content: title,
      position,
      metadata: {
        confidence,
        properties: {
          level,
          headingLevel: level,
        },
        ...metadata,
      },
    });
  }

  /**
   * Create a paragraph node
   */
  static createParagraphNode(
    content: string,
    position: Position,
    confidence: number = 0.8,
    metadata?: NodeMetadata
  ): GraphNode {
    // Truncate label if content is very long (only for extremely long content)
    const maxLabelLength = 80; // Allow longer labels for paragraphs
    const prefix = 'Paragraph: ';
    const availableLength = maxLabelLength - prefix.length;

    let label: string;
    if (content.length <= availableLength) {
      label = content;
    } else {
      label = `${content.substring(0, availableLength - 3)}...`;
    }

    return this.createNode({
      type: 'paragraph',
      label: `${prefix}${label}`,
      content,
      position,
      metadata: {
        confidence,
        ...metadata,
      },
    });
  }

  /**
   * Create a table node
   */
  static createTableNode(
    content: string,
    position: Position,
    rowCount: number,
    colCount: number,
    confidence: number = 0.7,
    metadata?: NodeMetadata
  ): GraphNode {
    return this.createNode({
      type: 'table',
      label: `Table: ${rowCount}x${colCount}`,
      content,
      position,
      metadata: {
        confidence,
        properties: {
          rowCount,
          colCount,
          cellCount: rowCount * colCount,
        },
        ...metadata,
      },
    });
  }

  /**
   * Create an image node
   */
  static createImageNode(
    altText: string,
    position: Position,
    dimensions?: { width: number; height: number },
    confidence: number = 0.6,
    metadata?: NodeMetadata
  ): GraphNode {
    return this.createNode({
      type: 'image',
      label: `Image: ${altText || 'Unnamed'}`,
      content: altText || '[Image]',
      position,
      metadata: {
        confidence,
        properties: {
          dimensions,
          hasAltText: !!altText,
        },
        ...metadata,
      },
    });
  }

  /**
   * Create a list node
   */
  static createListNode(
    content: string,
    position: Position,
    itemCount: number,
    listType: 'ordered' | 'unordered' = 'unordered',
    confidence: number = 0.8,
    metadata?: NodeMetadata
  ): GraphNode {
    return this.createNode({
      type: 'list',
      label: `${listType === 'ordered' ? 'Ordered' : 'Unordered'} List (${itemCount} items)`,
      content,
      position,
      metadata: {
        confidence,
        properties: {
          itemCount,
          listType,
        },
        ...metadata,
      },
    });
  }

  /**
   * Create a code block node
   */
  static createCodeNode(
    content: string,
    position: Position,
    language?: string,
    confidence: number = 0.9,
    metadata?: NodeMetadata
  ): GraphNode {
    const label = language ? `Code: ${language}` : 'Code Block';

    return this.createNode({
      type: 'code',
      label,
      content,
      position,
      metadata: {
        confidence,
        properties: {
          language,
          lineCount: content.split('\n').length,
        },
        ...metadata,
      },
    });
  }

  /**
   * Create a metadata node
   */
  static createMetadataNode(
    key: string,
    value: any,
    position: Position,
    confidence: number = 1.0,
    metadata?: NodeMetadata
  ): GraphNode {
    const content = `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`;

    return this.createNode({
      type: 'metadata',
      label: `Metadata: ${key}`,
      content,
      position,
      metadata: {
        confidence,
        properties: {
          key,
          value,
          valueType: typeof value,
        },
        ...metadata,
      },
    });
  }

  /**
   * Create a hierarchical containment edge
   */
  static createContainsEdge(
    parentId: string,
    childId: string,
    weight: number = 1.0
  ): GraphEdge {
    return this.createEdge({
      source: parentId,
      target: childId,
      type: 'contains',
      weight,
    });
  }

  /**
   * Create a sequential flow edge
   */
  static createFollowsEdge(
    predecessorId: string,
    successorId: string,
    weight: number = 1.0
  ): GraphEdge {
    return this.createEdge({
      source: predecessorId,
      target: successorId,
      type: 'follows',
      weight,
    });
  }

  /**
   * Create a reference edge
   */
  static createReferencesEdge(
    sourceId: string,
    targetId: string,
    weight: number = 0.5,
    context?: string
  ): GraphEdge {
    return this.createEdge({
      source: sourceId,
      target: targetId,
      type: 'references',
      weight,
      metadata: {
        context,
      },
    });
  }

  /**
   * Create a similarity edge
   */
  static createSimilarityEdge(
    sourceId: string,
    targetId: string,
    similarity: number,
    context?: string
  ): GraphEdge {
    return this.createEdge({
      source: sourceId,
      target: targetId,
      type: 'similar',
      weight: similarity,
      metadata: {
        context,
        similarityScore: similarity,
      },
    });
  }

  /**
   * Validate node input data
   */
  private static validateNodeInput(input: CreateNodeInput): void {
    if (!input.type || !NODE_TYPES.includes(input.type)) {
      throw new Error(`Invalid node type: ${input.type}`);
    }

    if (!input.label || input.label.trim().length === 0) {
      throw new Error('Node label cannot be empty');
    }

    if (input.content === undefined || input.content === null) {
      throw new Error('Node content cannot be null or undefined');
    }

    if (
      !input.position ||
      typeof input.position.page !== 'number' ||
      input.position.page < 1
    ) {
      throw new Error('Invalid position: page must be a positive number');
    }

    if (typeof input.position.start !== 'number' || input.position.start < 0) {
      throw new Error('Invalid position: start must be a non-negative number');
    }

    if (
      typeof input.position.end !== 'number' ||
      input.position.end <= input.position.start
    ) {
      throw new Error('Invalid position: end must be greater than start');
    }

    if (
      input.metadata?.confidence !== undefined &&
      (input.metadata.confidence < 0 || input.metadata.confidence > 1)
    ) {
      throw new Error('Invalid confidence: must be between 0 and 1');
    }
  }

  /**
   * Validate edge input data
   */
  private static validateEdgeInput(input: CreateEdgeInput): void {
    if (!input.source || input.source.trim().length === 0) {
      throw new Error('Edge source ID cannot be empty');
    }

    if (!input.target || input.target.trim().length === 0) {
      throw new Error('Edge target ID cannot be empty');
    }

    if (input.source === input.target) {
      throw new Error(
        'Edge cannot reference the same node (no self-references allowed)'
      );
    }

    if (!input.type || !EDGE_TYPES.includes(input.type)) {
      throw new Error(`Invalid edge type: ${input.type}`);
    }

    if (input.weight !== undefined && (input.weight < 0 || input.weight > 1)) {
      throw new Error('Invalid weight: must be between 0 and 1');
    }
  }
}
