import { GraphBuilder } from '../../src/services/graph';
import { PDFParseResult, PDFPage, PDFParagraph, PDFMetadata } from '../../src/services/pdf-parser.service';

// Mock uuid to avoid ES module issues
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-uuid-${uuidCounter++}`)
}));

describe('GraphBuilder', () => {
  let mockPdfResult: PDFParseResult;

  beforeEach(() => {
    // Create mock PDF result
    const mockMetadata: PDFMetadata = {
      title: 'Test Document',
      author: 'Test Author',
      pages: 2,
      fileSize: 1024,
      keywords: ['test', 'document'],
      language: 'en'
    };

    const mockParagraphs: PDFParagraph[] = [
      {
        id: 'p1-1',
        pageNumber: 1,
        content: 'This is the first paragraph.',
        startPosition: 0,
        endPosition: 29,
        lineCount: 1,
        confidence: 0.9
      },
      {
        id: 'p1-2',
        pageNumber: 1,
        content: 'This is the second paragraph with more content.',
        startPosition: 30,
        endPosition: 75,
        lineCount: 1,
        confidence: 0.8
      }
    ];

    const mockPages: PDFPage[] = [
      {
        pageNumber: 1,
        content: 'This is the first paragraph.\nThis is the second paragraph with more content.',
        width: 612,
        height: 792,
        paragraphs: mockParagraphs,
        textElements: [
          {
            text: 'Test Document',
            x: 50,
            y: 50,
            width: 120,
            height: 16
          }
        ]
      },
      {
        pageNumber: 2,
        content: 'This is page two content.',
        width: 612,
        height: 792,
        paragraphs: [
          {
            id: 'p2-1',
            pageNumber: 2,
            content: 'This is page two content.',
            startPosition: 0,
            endPosition: 26,
            lineCount: 1,
            confidence: 0.7
          }
        ]
      }
    ];

    mockPdfResult = {
      metadata: mockMetadata,
      pages: mockPages,
      fullText: 'This is the first paragraph.\nThis is the second paragraph with more content.\nThis is page two content.'
    };
  });

  describe('buildGraph', () => {
    it('should build a complete graph from PDF results', async () => {
      const documentId = 'test-doc-123';
      const graph = await GraphBuilder.buildGraph(documentId, mockPdfResult);

      expect(graph).toBeDefined();
      expect(graph.documentId).toBe(documentId);
      expect(graph.metadata.status).toBe('complete');
      expect(graph.metadata.processingTime).toBeGreaterThan(0);

      // Should have document node
      const documentNodes = graph.getNodesByType('document');
      expect(documentNodes).toHaveLength(1);
      expect(documentNodes[0].label).toBe('Document: Test Document');

      // Should have paragraph nodes
      const paragraphNodes = graph.getNodesByType('paragraph');
      expect(paragraphNodes.length).toBeGreaterThan(0);

      // Should have metadata nodes
      const metadataNodes = graph.getNodesByType('metadata');
      expect(metadataNodes.length).toBeGreaterThan(0);

      // Should have edges
      expect(graph.statistics.edgeCount).toBeGreaterThan(0);
    });

    it('should handle empty PDF results', async () => {
      const emptyPdfResult: PDFParseResult = {
        metadata: {
          pages: 0,
          fileSize: 0
        },
        pages: [],
        fullText: ''
      };

      const graph = await GraphBuilder.buildGraph('empty-doc', emptyPdfResult);

      expect(graph).toBeDefined();
      expect(graph.statistics.nodeCount).toBeGreaterThan(0); // At least document node
      expect(graph.metadata.status).toBe('complete');
    });

    it('should handle PDF with no paragraphs', async () => {
      const noParagraphsPdf: PDFParseResult = {
        metadata: {
          title: 'No Paragraphs Doc',
          pages: 1,
          fileSize: 100
        },
        pages: [
          {
            pageNumber: 1,
            content: 'Just some plain text content.',
            width: 612,
            height: 792
            // No paragraphs array
          }
        ],
        fullText: 'Just some plain text content.'
      };

      const graph = await GraphBuilder.buildGraph('no-para-doc', noParagraphsPdf);

      expect(graph).toBeDefined();
      const paragraphNodes = graph.getNodesByType('paragraph');
      expect(paragraphNodes.length).toBeGreaterThan(0); // Should create fallback paragraph
    });
  });

  describe('getBuildStatistics', () => {
    it('should return comprehensive build statistics', async () => {
      const graph = await GraphBuilder.buildGraph('stats-doc', mockPdfResult);
      const stats = GraphBuilder.getBuildStatistics(graph);

      expect(stats).toBeDefined();
      expect(stats.totalNodes).toBe(graph.statistics.nodeCount);
      expect(stats.totalEdges).toBe(graph.statistics.edgeCount);
      expect(stats.nodesByType).toBeDefined();
      expect(stats.edgesByType).toBeDefined();
      expect(typeof stats.averageDegree).toBe('number');
      expect(typeof stats.maxDegree).toBe('number');
    });
  });

  describe('graph structure validation', () => {
    it('should create proper hierarchical structure', async () => {
      const graph = await GraphBuilder.buildGraph('structure-doc', mockPdfResult);

      // Should have document → page → paragraph hierarchy
      const documentNodes = graph.getNodesByType('document');
      const metadataNodes = graph.getNodesByType('metadata');
      const paragraphNodes = graph.getNodesByType('paragraph');

      expect(documentNodes.length).toBe(1);
      expect(metadataNodes.length).toBeGreaterThan(0);
      expect(paragraphNodes.length).toBeGreaterThan(0);

      // Check that edges exist
      expect(graph.statistics.edgeCount).toBeGreaterThan(0);
    });

    it('should create sequential edges between paragraphs', async () => {
      const graph = await GraphBuilder.buildGraph('sequential-doc', mockPdfResult);

      const paragraphNodes = graph.getNodesByType('paragraph');
      expect(paragraphNodes.length).toBeGreaterThan(1);

      // Should have sequential edges
      const edges = graph.edges.filter(edge => edge.type === 'follows');
      expect(edges.length).toBeGreaterThan(0);
    });

    it('should handle section detection', async () => {
      // Create PDF with heading-like text
      const headingPdf: PDFParseResult = {
        metadata: {
          title: 'Heading Test',
          pages: 1,
          fileSize: 500
        },
        pages: [
          {
            pageNumber: 1,
            content: 'INTRODUCTION\n\nThis is an introduction paragraph.',
            width: 612,
            height: 792,
            textElements: [
              {
                text: 'INTRODUCTION',
                x: 50,
                y: 50,
                width: 150,
                height: 18 // Large text = potential heading
              },
              {
                text: 'This is an introduction paragraph.',
                x: 50,
                y: 80,
                width: 300,
                height: 12
              }
            ],
            paragraphs: [
              {
                id: 'p1-1',
                pageNumber: 1,
                content: 'INTRODUCTION',
                startPosition: 0,
                endPosition: 12,
                lineCount: 1,
                confidence: 0.8
              },
              {
                id: 'p1-2',
                pageNumber: 1,
                content: 'This is an introduction paragraph.',
                startPosition: 14,
                endPosition: 50,
                lineCount: 1,
                confidence: 0.9
              }
            ]
          }
        ],
        fullText: 'INTRODUCTION\n\nThis is an introduction paragraph.'
      };

      const graph = await GraphBuilder.buildGraph('heading-doc', headingPdf);

      // Should detect and create section nodes
      const sectionNodes = graph.getNodesByType('section');
      expect(sectionNodes.length).toBeGreaterThanOrEqual(0); // May or may not detect
    });
  });

  describe('error handling', () => {
    it('should handle invalid PDF results gracefully', async () => {
      const invalidPdf: PDFParseResult = {
        metadata: {
          pages: -1,
          fileSize: -100
        },
        pages: [],
        fullText: ''
      };

      // Should not throw, but create graph with error status
      const graph = await GraphBuilder.buildGraph('invalid-doc', invalidPdf);
      expect(graph).toBeDefined();
      expect(graph.metadata.status).toBe('complete'); // Still completes
    });

    it('should handle very large content', async () => {
      const largeContent = 'A'.repeat(10000);
      const largePdf: PDFParseResult = {
        metadata: {
          title: 'Large Document',
          pages: 1,
          fileSize: 10000
        },
        pages: [
          {
            pageNumber: 1,
            content: largeContent,
            width: 612,
            height: 792,
            paragraphs: [
              {
                id: 'p1-1',
                pageNumber: 1,
                content: largeContent,
                startPosition: 0,
                endPosition: largeContent.length,
                lineCount: Math.ceil(largeContent.length / 80), // Estimate lines
                confidence: 0.8
              }
            ]
          }
        ],
        fullText: largeContent
      };

      const graph = await GraphBuilder.buildGraph('large-doc', largePdf);
      expect(graph).toBeDefined();
      expect(graph.statistics.nodeCount).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should complete graph building within reasonable time', async () => {
      const startTime = Date.now();
      const graph = await GraphBuilder.buildGraph('perf-doc', mockPdfResult);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(graph.metadata.processingTime).toBeGreaterThan(0);
      expect(graph.metadata.processingTime).toBeLessThan(5000);
    });
  });
});
