import { Graph } from './graph';
import { GraphFactory } from './graph-factory';
import { PDFParseResult, PDFParagraph } from '../pdf-parser.service';
import { ExtractedTable } from '../table-detection.service';
import { ExtractedImage } from '../image-extraction.service';
import { ReferenceDetectionService } from './reference-detection.service';
import {
  ReferenceResolutionService,
  ResolutionContext,
} from './reference-resolution.service';
import { logger } from '../../utils/logger';

/**
 * Graph Builder: Converts PDF parsing results into knowledge graph structures
 * Builds hierarchical and sequential relationships between document elements
 */
export class GraphBuilder {
  /**
   * Build a complete graph from PDF parsing results
   */
  static async buildGraph(
    documentId: string,
    pdfResult: PDFParseResult,
    tables?: ExtractedTable[],
    images?: ExtractedImage[]
  ): Promise<Graph> {
    const startTime = Date.now();

    try {
      logger.info('Starting graph building', {
        documentId,
        pages: pdfResult.metadata.pages,
        totalParagraphs: pdfResult.pages.reduce(
          (sum, page) => sum + (page.paragraphs?.length || 0),
          0
        ),
      });

      // Create new graph instance
      const graph = new Graph(documentId);

      // Build the graph structure
      await this.buildGraphStructure(graph, pdfResult, tables, images);

      // Mark as complete and calculate processing time
      const processingTime = Date.now() - startTime;
      graph.metadata.processingTime = processingTime;
      graph.complete();

      logger.info('Graph building completed', {
        documentId,
        nodeCount: graph.statistics.nodeCount,
        edgeCount: graph.statistics.edgeCount,
        processingTimeMs: processingTime,
      });

      return graph;
    } catch (error) {
      logger.error('Graph building failed', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Create graph with error status
      const graph = new Graph(documentId);
      graph.markError(error instanceof Error ? error.message : 'Unknown error');

      throw error;
    }
  }

  /**
   * Build the complete graph structure from PDF results
   */
  private static async buildGraphStructure(
    graph: Graph,
    pdfResult: PDFParseResult,
    tables?: ExtractedTable[],
    images?: ExtractedImage[]
  ): Promise<void> {
    // 1. Create document root node
    const documentNode = GraphFactory.createDocumentNode(
      pdfResult.metadata.title || 'Untitled Document',
      Math.max(0, pdfResult.metadata.pages || 0), // Ensure non-negative
      Math.max(0, pdfResult.metadata.fileSize || 0), // Ensure non-negative
      {
        properties: {
          author: pdfResult.metadata.author,
          subject: pdfResult.metadata.subject,
          creator: pdfResult.metadata.creator,
          producer: pdfResult.metadata.producer,
          creationDate: pdfResult.metadata.creationDate,
          modificationDate: pdfResult.metadata.modificationDate,
          keywords: pdfResult.metadata.keywords,
          language: pdfResult.metadata.language,
          pageSize: pdfResult.metadata.pageSize,
          encryption: pdfResult.metadata.encryption,
        },
      }
    );
    graph.addNode(documentNode);

    // 2. Create metadata nodes
    this.createMetadataNodes(graph, pdfResult.metadata);

    // 3. Process each page
    for (const page of pdfResult.pages) {
      await this.processPage(graph, page, documentNode.id, tables, images);
    }

    // 4. Create sequential edges between all paragraphs
    this.createSequentialParagraphEdges(graph);

    // 5. Detect and create section hierarchy
    this.createSectionHierarchy(graph);

    // 6. Detect and create reference edges
    await this.detectAndCreateReferenceEdges(graph);
  }

  /**
   * Create metadata nodes for document properties
   */
  private static createMetadataNodes(
    graph: Graph,
    metadata: PDFParseResult['metadata']
  ): void {
    // Create metadata nodes for key properties
    if (metadata.author) {
      const authorNode = GraphFactory.createMetadataNode(
        'author',
        metadata.author,
        { page: 1, start: 0, end: metadata.author.length }
      );
      graph.addNode(authorNode);
    }

    if (metadata.keywords && metadata.keywords.length > 0) {
      const keywordsNode = GraphFactory.createMetadataNode(
        'keywords',
        metadata.keywords,
        { page: 1, start: 0, end: metadata.keywords.join(', ').length }
      );
      graph.addNode(keywordsNode);
    }

    if (metadata.language) {
      const languageNode = GraphFactory.createMetadataNode(
        'language',
        metadata.language,
        { page: 1, start: 0, end: metadata.language.length }
      );
      graph.addNode(languageNode);
    }
  }

  /**
   * Process a single page and create nodes for its content
   */
  private static async processPage(
    graph: Graph,
    page: PDFParseResult['pages'][0],
    documentNodeId: string,
    tables?: ExtractedTable[],
    images?: ExtractedImage[]
  ): Promise<void> {
    // Create hierarchical containment: document → page content
    const pageContainerNode = GraphFactory.createNode({
      type: 'metadata',
      label: `Page ${page.pageNumber}`,
      content: `Page ${page.pageNumber} content`,
      position: {
        page: page.pageNumber,
        start: 0,
        end: page.content.length,
      },
      metadata: {
        properties: {
          pageNumber: page.pageNumber,
          width: page.width,
          height: page.height,
          textElements: page.textElements?.length || 0,
        },
      },
    });
    graph.addNode(pageContainerNode);

    // Connect document to page
    const docToPageEdge = GraphFactory.createContainsEdge(
      documentNodeId,
      pageContainerNode.id
    );
    graph.addEdge(docToPageEdge);

    // Process paragraphs
    if (page.paragraphs && page.paragraphs.length > 0) {
      for (const paragraph of page.paragraphs) {
        const paragraphNode = this.createParagraphNode(paragraph);
        graph.addNode(paragraphNode);

        // Connect page to paragraph
        const pageToParaEdge = GraphFactory.createContainsEdge(
          pageContainerNode.id,
          paragraphNode.id
        );
        graph.addEdge(pageToParaEdge);
      }
    } else {
      // Fallback: create a single paragraph node from page content
      const fallbackParagraph = this.createFallbackParagraph(page);
      if (fallbackParagraph.content.trim().length > 0) {
        graph.addNode(fallbackParagraph);

        // Connect page to paragraph
        const pageToParaEdge = GraphFactory.createContainsEdge(
          pageContainerNode.id,
          fallbackParagraph.id
        );
        graph.addEdge(pageToParaEdge);
      }
    }

    // Process tables on this page
    if (tables && tables.length > 0) {
      this.processTablesOnPage(
        graph,
        tables,
        page.pageNumber,
        pageContainerNode.id
      );
    }

    // Process images on this page
    if (images && images.length > 0) {
      this.processImagesOnPage(
        graph,
        images,
        page.pageNumber,
        pageContainerNode.id
      );
    }

    // Process text elements (simplified - could be enhanced for better structure detection)
    if (page.textElements && page.textElements.length > 0) {
      this.processTextElements(graph, page.textElements, pageContainerNode.id);
    }
  }

  /**
   * Create a paragraph node from PDF paragraph data
   */
  private static createParagraphNode(
    paragraph: PDFParagraph
  ): ReturnType<typeof GraphFactory.createParagraphNode> {
    return GraphFactory.createParagraphNode(
      paragraph.content,
      {
        page: paragraph.pageNumber,
        start: paragraph.startPosition,
        end: paragraph.endPosition,
      },
      paragraph.confidence,
      {
        properties: {
          lineCount: paragraph.lineCount,
          confidence: paragraph.confidence,
        },
      }
    );
  }

  /**
   * Create a fallback paragraph when no paragraphs are detected
   */
  private static createFallbackParagraph(
    page: PDFParseResult['pages'][0]
  ): ReturnType<typeof GraphFactory.createParagraphNode> {
    // Split page content into reasonable paragraphs
    const lines = page.content
      .split('\n')
      .filter((line) => line.trim().length > 0);
    const content = lines.join(' ').trim();

    if (content.length === 0) {
      // Create minimal placeholder
      return GraphFactory.createParagraphNode(
        '[Empty page]',
        {
          page: page.pageNumber,
          start: 0,
          end: '[Empty page]'.length,
        },
        0.1
      );
    }

    return GraphFactory.createParagraphNode(
      content,
      {
        page: page.pageNumber,
        start: 0,
        end: content.length,
      },
      0.5, // Lower confidence for fallback
      {
        properties: {
          fallback: true,
          originalLines: lines.length,
        },
      }
    );
  }

  /**
   * Process text elements to detect potential structure
   */
  private static processTextElements(
    graph: Graph,
    textElements: PDFParseResult['pages'][0]['textElements'],
    pageNodeId: string
  ): void {
    if (!textElements) return;

    // Look for potential headings (large, bold text at start of lines)
    const potentialHeadings = textElements.filter((element) => {
      // Simple heuristics for headings
      const isLargeText = (element.height || 12) > 14; // Assuming 12pt is normal
      const startsLine = element.y && Math.abs(element.y % 14) < 2; // Near line start
      const shortEnough = element.text.length < 100; // Reasonable heading length
      const hasCaps = /^[A-Z\s]+$/.test(element.text.trim()); // All caps

      return (isLargeText || hasCaps) && startsLine && shortEnough;
    });

    // Create section nodes for detected headings
    for (const heading of potentialHeadings) {
      const sectionNode = GraphFactory.createSectionNode(
        heading.text.trim(),
        1, // Assume level 1 for now
        {
          page: Math.floor((heading.y || 0) / 50) + 1, // Estimate page from Y position
          start: heading.x || 0,
          end: (heading.x || 0) + heading.text.length,
          bbox: {
            x: heading.x || 0,
            y: heading.y || 0,
            width: heading.width || 0,
            height: heading.height || 12,
          },
        },
        0.7, // Moderate confidence for detected headings
        {
          font: {
            family: 'Unknown',
            size: heading.height || 12,
          },
        }
      );

      graph.addNode(sectionNode);

      // Connect page to section
      const pageToSectionEdge = GraphFactory.createContainsEdge(
        pageNodeId,
        sectionNode.id
      );
      graph.addEdge(pageToSectionEdge);
    }
  }

  /**
   * Create sequential edges between paragraphs for reading flow
   */
  private static createSequentialParagraphEdges(graph: Graph): void {
    const paragraphNodes = graph.getNodesByType('paragraph');

    // Sort by position (page, then start position)
    const sortedParagraphs = paragraphNodes.sort((a, b) => {
      if (a.position.page !== b.position.page) {
        return a.position.page - b.position.page;
      }
      return a.position.start - b.position.start;
    });

    // Create sequential edges
    for (let i = 0; i < sortedParagraphs.length - 1; i++) {
      const currentPara = sortedParagraphs[i];
      const nextPara = sortedParagraphs[i + 1];

      // Only connect paragraphs on the same page or consecutive pages
      const pageDiff = nextPara.position.page - currentPara.position.page;
      if (pageDiff === 0 || pageDiff === 1) {
        const sequentialEdge = GraphFactory.createFollowsEdge(
          currentPara.id,
          nextPara.id,
          0.8 // High weight for sequential flow
        );
        graph.addEdge(sequentialEdge);
      }
    }
  }

  /**
   * Create section hierarchy and hierarchical edges
   */
  private static createSectionHierarchy(graph: Graph): void {
    const sectionNodes = graph.getNodesByType('section');
    const paragraphNodes = graph.getNodesByType('paragraph');

    // For each section, find paragraphs that likely belong to it
    for (const section of sectionNodes) {
      // Find paragraphs on the same page that come after this section
      const samePageParagraphs = paragraphNodes.filter(
        (para) =>
          para.position.page === section.position.page &&
          para.position.start > section.position.start
      );

      // Connect section to its paragraphs (limit to first few to avoid over-connection)
      const paragraphsToConnect = samePageParagraphs.slice(0, 5); // Reasonable limit

      for (const paragraph of paragraphsToConnect) {
        const hierarchicalEdge = GraphFactory.createContainsEdge(
          section.id,
          paragraph.id,
          0.9 // High weight for hierarchical containment
        );
        graph.addEdge(hierarchicalEdge);
      }
    }
  }

  /**
   * Process tables found on a specific page
   */
  private static processTablesOnPage(
    graph: Graph,
    tables: ExtractedTable[],
    pageNumber: number,
    pageContainerNodeId: string
  ): void {
    // Filter tables for this page
    const pageTables = tables.filter(
      (table) => table.pageNumber === pageNumber
    );

    if (pageTables.length === 0) {
      return;
    }

    logger.debug(
      `Processing ${pageTables.length} tables on page ${pageNumber}`
    );

    for (const table of pageTables) {
      try {
        // Create table node
        const tableNode = this.createTableNode(table);
        graph.addNode(tableNode);

        // Connect page to table
        const pageToTableEdge = GraphFactory.createContainsEdge(
          pageContainerNodeId,
          tableNode.id
        );
        graph.addEdge(pageToTableEdge);

        logger.debug(
          `Created table node: ${tableNode.id} (${table.data.rows.length}x${table.data.rows[0]?.length || 0})`
        );
      } catch (error) {
        logger.warn(
          `Failed to create table node for table ${table.id}:`,
          error
        );
      }
    }
  }

  /**
   * Process images found on a specific page
   */
  private static processImagesOnPage(
    graph: Graph,
    images: ExtractedImage[],
    pageNumber: number,
    pageContainerNodeId: string
  ): void {
    // Filter images for this page
    const pageImages = images.filter(
      (image) => image.pageNumber === pageNumber
    );

    if (pageImages.length === 0) {
      return;
    }

    logger.debug(
      `Processing ${pageImages.length} images on page ${pageNumber}`
    );

    for (const image of pageImages) {
      try {
        // Create image node
        const imageNode = this.createImageNode(image);
        graph.addNode(imageNode);

        // Connect page to image
        const pageToImageEdge = GraphFactory.createContainsEdge(
          pageContainerNodeId,
          imageNode.id
        );
        graph.addEdge(pageToImageEdge);

        logger.debug(
          `Created image node: ${imageNode.id} (${image.width}x${image.height}, ${image.format})`
        );
      } catch (error) {
        logger.warn(
          `Failed to create image node for image ${image.id}:`,
          error
        );
      }
    }
  }

  /**
   * Create a table node from extracted table data
   */
  private static createTableNode(
    table: ExtractedTable
  ): ReturnType<typeof GraphFactory.createTableNode> {
    const rowCount = table.data.rows.length;
    const colCount = table.data.rows[0]?.length || 0;

    // Create position info (use table bbox if available, otherwise estimate)
    const position = {
      page: table.pageNumber,
      start: 0, // Would need better positioning logic
      end: table.data.rawText.length,
    };

    // Create metadata with table-specific properties
    const metadata = {
      confidence: table.confidence,
      properties: {
        tableNumber: table.tableNumber,
        extractionMethod: table.method,
        headers: table.data.headers,
        bbox: table.bbox,
        rawText: table.data.rawText,
      },
    };

    return GraphFactory.createTableNode(
      table.data.rawText, // Use raw text as content
      position,
      rowCount,
      colCount,
      table.confidence,
      metadata
    );
  }

  /**
   * Create an image node from extracted image data
   */
  private static createImageNode(
    image: ExtractedImage
  ): ReturnType<typeof GraphFactory.createImageNode> {
    // Create position info for the image
    const position = {
      page: image.pageNumber,
      start: image.imageNumber * 1000, // Estimate position based on image order
      end: (image.imageNumber + 1) * 1000,
    };

    // Create alt text from filename or generate generic one
    const altText =
      image.fileName ||
      `Image ${image.imageNumber + 1} on page ${image.pageNumber}`;

    // Create metadata with image-specific properties
    const metadata = {
      confidence: 0.8, // Default confidence for extracted images
      properties: {
        imageId: image.id,
        filePath: image.filePath,
        fileName: image.fileName,
        format: image.format,
        width: image.width,
        height: image.height,
        size: image.size,
        dpi: image.dpi,
        extractionMethod: image.method,
        storageId: image.metadata?.storageId,
        mimeType: image.metadata?.mimeType,
        colorSpace: image.metadata?.colorSpace,
        hasAlpha: image.metadata?.hasAlpha,
        compression: image.metadata?.compression,
      },
      ...image.metadata,
    };

    return GraphFactory.createImageNode(
      altText,
      position,
      { width: image.width, height: image.height },
      0.8, // Default confidence
      metadata
    );
  }

  /**
   * Detect references in text nodes and create reference edges
   */
  private static async detectAndCreateReferenceEdges(
    graph: Graph
  ): Promise<void> {
    logger.info('Starting reference detection and edge creation');

    const startTime = Date.now();
    let totalReferencesDetected = 0;
    let totalEdgesCreated = 0;

    // Get all text nodes that might contain references
    const textNodes = graph
      .getNodesByType('paragraph')
      .concat(graph.getNodesByType('section'))
      .concat(graph.getNodesByType('metadata'));

    logger.debug(`Analyzing ${textNodes.length} text nodes for references`);

    // Analyze each text node for references
    for (const sourceNode of textNodes) {
      try {
        // Detect references in this node
        const analysis =
          await ReferenceDetectionService.analyzeNode(sourceNode);

        if (analysis.references.length === 0) {
          continue; // No references found
        }

        totalReferencesDetected += analysis.references.length;

        logger.debug(
          `Found ${analysis.references.length} references in node ${sourceNode.id}`
        );

        // Create resolution context
        const context: ResolutionContext = {
          graph,
          sourceNode,
          context: {
            documentStructure: {
              totalPages: graph.nodes.reduce(
                (max, node) => Math.max(max, node.position.page),
                0
              ),
              sections: graph.getNodesByType('section'),
              figures: graph.getNodesByType('image'),
              tables: graph.getNodesByType('table'),
            },
          },
        };

        // Resolve each reference
        const resolutions = await ReferenceResolutionService.resolveReferences(
          analysis.references,
          context
        );

        // Create edges for successful resolutions
        for (const resolution of resolutions) {
          if (resolution.targetNode && resolution.confidence > 0.4) {
            // Minimum confidence threshold
            const referenceEdge = GraphFactory.createReferencesEdge(
              sourceNode.id,
              resolution.targetNode.id,
              resolution.confidence,
              `Reference: ${resolution.reference.text} (${resolution.reason})`
            );

            graph.addEdge(referenceEdge);
            totalEdgesCreated++;

            logger.debug(
              `Created reference edge: ${sourceNode.id} -> ${resolution.targetNode.id}`,
              {
                reference: resolution.reference.text,
                confidence: resolution.confidence,
                reason: resolution.reason,
              }
            );
          } else {
            logger.debug(
              `Reference not resolved: ${resolution.reference.text}`,
              {
                confidence: resolution.confidence,
                reason: resolution.reason,
              }
            );
          }
        }
      } catch (error) {
        logger.warn(
          `Failed to process references for node ${sourceNode.id}:`,
          error
        );
      }
    }

    const processingTime = Date.now() - startTime;
    logger.info('Reference detection and edge creation completed', {
      totalReferencesDetected,
      totalEdgesCreated,
      processingTimeMs: processingTime,
    });
  }

  /**
   * Get graph building statistics
   */
  static getBuildStatistics(graph: Graph): {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
    averageDegree: number;
    maxDegree: number;
    connectedComponents: number;
  } {
    return {
      totalNodes: graph.statistics.nodeCount,
      totalEdges: graph.statistics.edgeCount,
      nodesByType: graph.statistics.nodesByType,
      edgesByType: graph.statistics.edgesByType,
      averageDegree: graph.statistics.averageDegree,
      maxDegree: graph.statistics.maxDegree,
      connectedComponents: graph.statistics.components,
    };
  }
}
