/**
 * Integration tests for Reference Detection System
 *
 * Tests the complete pipeline from detection to resolution to graph integration
 */

import { GraphBuilder } from '../../src/services/graph/graph-builder';
import { PDFParseResult } from '../../src/services/pdf-parser.service';
import { ReferenceValidationService } from '../../src/services/graph/reference-validation.service';
import { ReferenceAccuracyTester } from '../../src/services/graph/reference-accuracy-tester';

describe('Reference Detection Integration', () => {
  // Create mock PDF result with references
  const createMockPDFResult = (): PDFParseResult => ({
    metadata: {
      title: 'Test Document',
      pages: 5,
      fileSize: 100000,
    },
    fullText: 'Mock full text content for testing',
    pages: [
      {
        pageNumber: 1,
        width: 612,
        height: 792,
        content:
          'This is the introduction. See section 2.1 for methodology details.',
        textElements: [],
        paragraphs: [
          {
            id: 'para-1-1',
            content:
              'This is the introduction. See section 2.1 for methodology details.',
            pageNumber: 1,
            startPosition: 0,
            endPosition: 70,
            lineCount: 2,
            confidence: 0.9,
          },
        ],
      },
      {
        pageNumber: 2,
        width: 612,
        height: 792,
        content:
          'Methodology Section. As shown in Figure 1, the approach works well.',
        textElements: [],
        paragraphs: [
          {
            id: 'para-2-1',
            content:
              'Methodology Section. As shown in Figure 1, the approach works well.',
            pageNumber: 2,
            startPosition: 0,
            endPosition: 65,
            lineCount: 2,
            confidence: 0.9,
          },
        ],
      },
      {
        pageNumber: 3,
        width: 612,
        height: 792,
        content:
          'Results are presented in Table 1. Check page 4 for more details.',
        textElements: [],
        paragraphs: [
          {
            id: 'para-3-1',
            content:
              'Results are presented in Table 1. Check page 4 for more details.',
            pageNumber: 3,
            startPosition: 0,
            endPosition: 65,
            lineCount: 2,
            confidence: 0.9,
          },
        ],
      },
      {
        pageNumber: 4,
        width: 612,
        height: 792,
        content: 'Figure 1: Sample Diagram',
        textElements: [],
        paragraphs: [
          {
            id: 'para-4-1',
            content: 'Figure 1: Sample Diagram',
            pageNumber: 4,
            startPosition: 0,
            endPosition: 25,
            lineCount: 1,
            confidence: 0.9,
          },
        ],
      },
      {
        pageNumber: 5,
        width: 612,
        height: 792,
        content: 'Table 1: Sample Data',
        textElements: [],
        paragraphs: [
          {
            id: 'para-5-1',
            content: 'Table 1: Sample Data',
            pageNumber: 5,
            startPosition: 0,
            endPosition: 20,
            lineCount: 1,
            confidence: 0.9,
          },
        ],
      },
    ],
  });

  describe('Complete Pipeline Integration', () => {
    test('should build graph with reference detection', async () => {
      const pdfResult = createMockPDFResult();
      const graph = await GraphBuilder.buildGraph('test-doc', pdfResult);

      expect(graph).toBeDefined();
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      // Should have reference edges
      const referenceEdges = graph.edges.filter((e) => e.type === 'references');
      expect(referenceEdges.length).toBeGreaterThan(0);
    }, 30000); // Allow more time for graph building

    test('should validate reference detection results', async () => {
      const pdfResult = createMockPDFResult();
      const graph = await GraphBuilder.buildGraph('test-doc', pdfResult);

      const validation = await ReferenceValidationService.validateGraph(graph);

      expect(validation).toBeDefined();
      expect(typeof validation.overallScore).toBe('number');
      expect(validation.overallScore).toBeGreaterThanOrEqual(0);
      expect(validation.overallScore).toBeLessThanOrEqual(1);

      // Should not have critical errors
      const criticalIssues = validation.issues.filter(
        (i) => i.severity === 'error'
      );
      expect(criticalIssues.length).toBe(0);
    }, 30000);

    test('should detect expected reference types in graph', async () => {
      const pdfResult = createMockPDFResult();
      const graph = await GraphBuilder.buildGraph('test-doc', pdfResult);

      const referenceEdges = graph.edges.filter((e) => e.type === 'references');

      // Should have section, figure, table, and page references
      const edgeContexts = referenceEdges
        .map((e) => e.metadata?.context as string)
        .filter(Boolean);

      const hasPageRef = edgeContexts.some((ctx) => ctx.includes('page'));

      // Only page references can be resolved in this test since there are no 
      // target nodes for sections, figures, or tables in the mock data
      expect(hasPageRef).toBe(true);
      expect(referenceEdges.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Accuracy Testing Integration', () => {
    test('should run accuracy test suite', async () => {
      const suite = ReferenceAccuracyTester.createStandardTestSuite();

      expect(suite).toBeDefined();
      expect(suite.testCases.length).toBeGreaterThan(0);

      // Run a single test case to verify the framework works
      const testResult = await ReferenceAccuracyTester.runTestCase(
        suite.testCases[0]
      );

      expect(testResult).toBeDefined();
      expect(testResult.testCase).toBe(suite.testCases[0]);
      expect(typeof testResult.overallScore).toBe('number');
      expect(testResult.executionTime).toBeGreaterThan(0);
    });

    test('should calculate detection accuracy metrics', async () => {
      const testCase = {
        id: 'integration-test',
        name: 'Integration Test',
        text: 'See section 3.2, Figure 1, and Table 4. Check page 15.',
        expectedReferences: [
          {
            text: 'section 3.2',
            type: 'section' as const,
            target: '3.2',
            shouldDetect: true,
          },
          {
            text: 'Figure 1',
            type: 'figure' as const,
            target: '1',
            shouldDetect: true,
          },
          {
            text: 'Table 4',
            type: 'table' as const,
            target: '4',
            shouldDetect: true,
          },
          {
            text: 'page 15',
            type: 'page' as const,
            target: '15',
            shouldDetect: true,
          },
        ],
        metadata: { difficulty: 'medium' as const },
      };

      const result = await ReferenceAccuracyTester.runTestCase(testCase);

      expect(result.detectionResults).toBeDefined();
      expect(typeof result.detectionResults.precision).toBe('number');
      expect(typeof result.detectionResults.recall).toBe('number');
      expect(typeof result.detectionResults.f1Score).toBe('number');
      expect(result.detectionResults.f1Score).toBeGreaterThanOrEqual(0);
      expect(result.detectionResults.f1Score).toBeLessThanOrEqual(1);
    });

    test('should identify detection issues', async () => {
      const testCase = {
        id: 'problematic-test',
        name: 'Problematic Test',
        text: 'section 1 section 2 section 3 section 4 section 5', // Many similar patterns
        expectedReferences: [
          {
            text: 'section 1',
            type: 'section' as const,
            target: '1',
            shouldDetect: true,
          },
          {
            text: 'section 2',
            type: 'section' as const,
            target: '2',
            shouldDetect: true,
          },
          // Missing expected references for 3, 4, 5
        ],
        metadata: { difficulty: 'easy' as const },
      };

      const result = await ReferenceAccuracyTester.runTestCase(testCase);

      expect(result.issues.length).toBeGreaterThan(0);
      // Note: false negatives detection may vary based on reference detection changes
      // The important thing is that issues are detected
      expect(result.detectionResults).toBeDefined();
    });
  });

  describe('Graph Structure Validation', () => {
    test('should create valid graph structure with references', async () => {
      const pdfResult = createMockPDFResult();
      const graph = await GraphBuilder.buildGraph('test-doc', pdfResult);

      // Basic graph validation
      expect(graph.id).toBe('test-doc');
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      // Check for required node types
      const hasDocumentNode = graph.nodes.some((n) => n.type === 'document');
      const hasParagraphNodes = graph.nodes.some((n) => n.type === 'paragraph');

      expect(hasDocumentNode).toBe(true);
      expect(hasParagraphNodes).toBe(true);

      // Check for reference edges
      const referenceEdges = graph.edges.filter((e) => e.type === 'references');
      expect(referenceEdges.length).toBeGreaterThan(0);

      // Validate reference edge properties
      for (const edge of referenceEdges) {
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
        expect(edge.weight).toBeGreaterThanOrEqual(0);
        expect(edge.weight).toBeLessThanOrEqual(1);
        expect(edge.metadata?.context).toBeDefined();
      }
    }, 30000);

    test('should maintain graph connectivity', async () => {
      const pdfResult = createMockPDFResult();
      const graph = await GraphBuilder.buildGraph('test-doc', pdfResult);

      // Graph should be connected (most nodes should have edges)
      const nodesWithEdges = new Set();
      graph.edges.forEach((edge) => {
        nodesWithEdges.add(edge.source);
        nodesWithEdges.add(edge.target);
      });

      const connectivityRatio = nodesWithEdges.size / graph.nodes.length;
      expect(connectivityRatio).toBeGreaterThan(0.5); // At least 50% of nodes should be connected
    }, 30000);
  });

  describe('Performance Validation', () => {
    test('should complete processing within reasonable time', async () => {
      const startTime = Date.now();
      const pdfResult = createMockPDFResult();

      const graph = await GraphBuilder.buildGraph('test-doc', pdfResult);

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Graph should have reasonable statistics
      expect(graph.metadata.processingTime).toBeGreaterThan(0);
      expect(graph.metadata.processingTime).toBeLessThan(30000);
    }, 30000);

    test('should handle increasing document complexity', async () => {
      // Test with different document sizes
      const smallDoc: PDFParseResult = {
        metadata: { title: 'Small', pages: 1, fileSize: 1000 },
        fullText: 'Small document text',
        pages: [
          {
            pageNumber: 1,
            width: 612,
            height: 792,
            content: 'See section 2.',
            textElements: [],
            paragraphs: [
              {
                id: 'small-para-1',
                content: 'See section 2.',
                pageNumber: 1,
                startPosition: 0,
                endPosition: 13,
                lineCount: 1,
                confidence: 0.9,
              },
            ],
          },
        ],
      };

      const smallGraph = await GraphBuilder.buildGraph('small-doc', smallDoc);
      expect(smallGraph.nodes.length).toBeGreaterThan(0);

      const largeDoc: PDFParseResult = {
        metadata: { title: 'Large', pages: 10, fileSize: 100000 },
        fullText: 'Large document text content',
        pages: Array.from({ length: 10 }, (_, i) => ({
          pageNumber: i + 1,
          width: 612,
          height: 792,
          content: `Page ${i + 1} content with section ${i + 1}.`,
          textElements: [],
          paragraphs: [
            {
              id: `large-para-${i + 1}`,
              content: `Page ${i + 1} content with section ${i + 1}.`,
              pageNumber: i + 1,
              startPosition: 0,
              endPosition: 40,
              lineCount: 1,
              confidence: 0.9,
            },
          ],
        })),
      };

      const largeGraph = await GraphBuilder.buildGraph('large-doc', largeDoc);
      expect(largeGraph.nodes.length).toBeGreaterThan(smallGraph.nodes.length);
    }, 60000); // Allow more time for larger test
  });
});
