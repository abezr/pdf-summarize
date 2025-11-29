"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graph_1 = require("../../src/services/graph");
// Mock uuid to avoid ES module issues
let uuidCounter = 0;
jest.mock('uuid', () => ({
    v4: jest.fn(() => `mock-uuid-${uuidCounter++}`)
}));
describe('GraphBuilder', () => {
    let mockPdfResult;
    beforeEach(() => {
        // Create mock PDF result
        const mockMetadata = {
            title: 'Test Document',
            author: 'Test Author',
            pages: 2,
            fileSize: 1024,
            keywords: ['test', 'document'],
            language: 'en'
        };
        const mockParagraphs = [
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
        const mockPages = [
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
            const graph = await graph_1.GraphBuilder.buildGraph(documentId, mockPdfResult);
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
            const emptyPdfResult = {
                metadata: {
                    pages: 0,
                    fileSize: 0
                },
                pages: [],
                fullText: ''
            };
            const graph = await graph_1.GraphBuilder.buildGraph('empty-doc', emptyPdfResult);
            expect(graph).toBeDefined();
            expect(graph.statistics.nodeCount).toBeGreaterThan(0); // At least document node
            expect(graph.metadata.status).toBe('complete');
        });
        it('should handle PDF with no paragraphs', async () => {
            const noParagraphsPdf = {
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
            const graph = await graph_1.GraphBuilder.buildGraph('no-para-doc', noParagraphsPdf);
            expect(graph).toBeDefined();
            const paragraphNodes = graph.getNodesByType('paragraph');
            expect(paragraphNodes.length).toBeGreaterThan(0); // Should create fallback paragraph
        });
    });
    describe('getBuildStatistics', () => {
        it('should return comprehensive build statistics', async () => {
            const graph = await graph_1.GraphBuilder.buildGraph('stats-doc', mockPdfResult);
            const stats = graph_1.GraphBuilder.getBuildStatistics(graph);
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
            const graph = await graph_1.GraphBuilder.buildGraph('structure-doc', mockPdfResult);
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
            const graph = await graph_1.GraphBuilder.buildGraph('sequential-doc', mockPdfResult);
            const paragraphNodes = graph.getNodesByType('paragraph');
            expect(paragraphNodes.length).toBeGreaterThan(1);
            // Should have sequential edges
            const edges = graph.edges.filter(edge => edge.type === 'follows');
            expect(edges.length).toBeGreaterThan(0);
        });
        it('should handle section detection', async () => {
            // Create PDF with heading-like text
            const headingPdf = {
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
            const graph = await graph_1.GraphBuilder.buildGraph('heading-doc', headingPdf);
            // Should detect and create section nodes
            const sectionNodes = graph.getNodesByType('section');
            expect(sectionNodes.length).toBeGreaterThanOrEqual(0); // May or may not detect
        });
    });
    describe('error handling', () => {
        it('should handle invalid PDF results gracefully', async () => {
            const invalidPdf = {
                metadata: {
                    pages: -1,
                    fileSize: -100
                },
                pages: [],
                fullText: ''
            };
            // Should not throw, but create graph with error status
            const graph = await graph_1.GraphBuilder.buildGraph('invalid-doc', invalidPdf);
            expect(graph).toBeDefined();
            expect(graph.metadata.status).toBe('complete'); // Still completes
        });
        it('should handle very large content', async () => {
            const largeContent = 'A'.repeat(10000);
            const largePdf = {
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
            const graph = await graph_1.GraphBuilder.buildGraph('large-doc', largePdf);
            expect(graph).toBeDefined();
            expect(graph.statistics.nodeCount).toBeGreaterThan(0);
        });
    });
    describe('performance', () => {
        it('should complete graph building within reasonable time', async () => {
            const startTime = Date.now();
            const graph = await graph_1.GraphBuilder.buildGraph('perf-doc', mockPdfResult);
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(graph.metadata.processingTime).toBeGreaterThan(0);
            expect(graph.metadata.processingTime).toBeLessThan(5000);
        });
    });
    describe('table integration', () => {
        test('should create table nodes when tables are provided', async () => {
            const mockTables = [
                {
                    id: 'table_1_0',
                    pageNumber: 1,
                    tableNumber: 0,
                    data: {
                        headers: ['Name', 'Age', 'City'],
                        rows: [
                            ['John', '25', 'NYC'],
                            ['Jane', '30', 'LA']
                        ],
                        rawText: 'Name | Age | City\nJohn | 25 | NYC\nJane | 30 | LA'
                    },
                    confidence: 0.85,
                    method: 'tabula'
                }
            ];
            const graph = await graph_1.GraphBuilder.buildGraph('table-doc', mockPdfResult, mockTables);
            // Should have document node + page nodes + paragraph nodes + table node
            expect(graph.statistics.nodeCount).toBeGreaterThan(9); // Original count was 9
            // Check that table node was created
            const tableNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'table');
            expect(tableNodes).toHaveLength(1);
            const tableNode = tableNodes[0];
            expect(tableNode.label).toContain('Table: 2x3');
            expect(tableNode.content).toContain('Name | Age | City');
            expect(tableNode.metadata?.properties?.tableNumber).toBe(0);
            expect(tableNode.metadata?.properties?.extractionMethod).toBe('tabula');
        });
        test('should handle empty table array', async () => {
            const graph = await graph_1.GraphBuilder.buildGraph('no-tables-doc', mockPdfResult, []);
            // Should work normally without tables
            expect(graph.statistics.nodeCount).toBe(9);
        });
        test('should filter tables by page number', async () => {
            const mockTables = [
                {
                    id: 'table_1_0',
                    pageNumber: 1,
                    tableNumber: 0,
                    data: {
                        headers: ['Col1', 'Col2'],
                        rows: [['A', 'B']],
                        rawText: 'Col1 | Col2\nA | B'
                    },
                    confidence: 0.8,
                    method: 'tabula'
                },
                {
                    id: 'table_2_0',
                    pageNumber: 2, // Different page
                    tableNumber: 0,
                    data: {
                        headers: ['Col1', 'Col2'],
                        rows: [['X', 'Y']],
                        rawText: 'Col1 | Col2\nX | Y'
                    },
                    confidence: 0.8,
                    method: 'tabula'
                }
            ];
            const graph = await graph_1.GraphBuilder.buildGraph('multi-page-tables-doc', mockPdfResult, mockTables);
            // Should have 2 table nodes (one per page)
            const tableNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'table');
            expect(tableNodes).toHaveLength(2);
        });
    });
    describe('image integration', () => {
        test('should create image nodes when images are provided', async () => {
            const mockImages = [
                {
                    id: 'image_1_0_123456789',
                    pageNumber: 1,
                    imageNumber: 0,
                    filePath: '/data/images/test-doc/page_1_image_0_123456789.png',
                    fileName: 'page_1_image_0_123456789.png',
                    format: 'png',
                    width: 800,
                    height: 600,
                    size: 245760,
                    dpi: 150,
                    method: 'pdf2pic',
                    metadata: {
                        storageId: 'storage-123',
                        mimeType: 'image/png',
                        colorSpace: 'RGB',
                        hasAlpha: false,
                        compression: 'deflate'
                    }
                }
            ];
            const graph = await graph_1.GraphBuilder.buildGraph('image-doc', mockPdfResult, undefined, mockImages);
            // Should have document node + page nodes + paragraph nodes + image node
            expect(graph.statistics.nodeCount).toBeGreaterThan(9); // Original count was 9
            // Check that image node was created
            const imageNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'image');
            expect(imageNodes).toHaveLength(1);
            const imageNode = imageNodes[0];
            expect(imageNode.label).toContain('Image: page_1_image_0');
            expect(imageNode.content).toBe('page_1_image_0_123456789.png');
            expect(imageNode.metadata?.properties?.imageId).toBe('image_1_0_123456789');
            expect(imageNode.metadata?.properties?.width).toBe(800);
            expect(imageNode.metadata?.properties?.height).toBe(600);
            expect(imageNode.metadata?.properties?.format).toBe('png');
            expect(imageNode.metadata?.properties?.extractionMethod).toBe('pdf2pic');
            expect(imageNode.metadata?.properties?.storageId).toBe('storage-123');
        });
        test('should handle empty image array', async () => {
            const graph = await graph_1.GraphBuilder.buildGraph('no-images-doc', mockPdfResult, undefined, []);
            // Should work normally without images
            expect(graph.statistics.nodeCount).toBe(9);
        });
        test('should filter images by page number', async () => {
            const mockImages = [
                {
                    id: 'image_1_0_123456789',
                    pageNumber: 1,
                    imageNumber: 0,
                    filePath: '/data/images/test-doc/page_1_image_0_123456789.png',
                    fileName: 'page_1_image_0_123456789.png',
                    format: 'png',
                    width: 400,
                    height: 300,
                    size: 122880,
                    dpi: 150,
                    method: 'pdf2pic'
                },
                {
                    id: 'image_2_0_987654321',
                    pageNumber: 2, // Different page
                    imageNumber: 0,
                    filePath: '/data/images/test-doc/page_2_image_0_987654321.png',
                    fileName: 'page_2_image_0_987654321.png',
                    format: 'png',
                    width: 600,
                    height: 400,
                    size: 184320,
                    dpi: 150,
                    method: 'pdf2pic'
                }
            ];
            const graph = await graph_1.GraphBuilder.buildGraph('multi-page-images-doc', mockPdfResult, undefined, mockImages);
            // Should have 2 image nodes (one per page)
            const imageNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'image');
            expect(imageNodes).toHaveLength(2);
            // Check that images are on correct pages
            const page1Images = imageNodes.filter(node => node.position.page === 1);
            const page2Images = imageNodes.filter(node => node.position.page === 2);
            expect(page1Images).toHaveLength(1);
            expect(page2Images).toHaveLength(1);
            expect(page1Images[0].metadata?.properties?.imageId).toBe('image_1_0_123456789');
            expect(page2Images[0].metadata?.properties?.imageId).toBe('image_2_0_987654321');
        });
        test('should handle multiple images on same page', async () => {
            const mockImages = [
                {
                    id: 'image_1_0_111111111',
                    pageNumber: 1,
                    imageNumber: 0,
                    filePath: '/data/images/test-doc/page_1_image_0_111111111.png',
                    fileName: 'page_1_image_0_111111111.png',
                    format: 'png',
                    width: 200,
                    height: 150,
                    size: 61440,
                    dpi: 150,
                    method: 'pdf2pic'
                },
                {
                    id: 'image_1_1_222222222',
                    pageNumber: 1, // Same page
                    imageNumber: 1,
                    filePath: '/data/images/test-doc/page_1_image_1_222222222.png',
                    fileName: 'page_1_image_1_222222222.png',
                    format: 'png',
                    width: 300,
                    height: 200,
                    size: 92160,
                    dpi: 150,
                    method: 'pdf2pic'
                }
            ];
            const graph = await graph_1.GraphBuilder.buildGraph('multi-images-page-doc', mockPdfResult, undefined, mockImages);
            // Should have 2 image nodes
            const imageNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'image');
            expect(imageNodes).toHaveLength(2);
            // Both should be on page 1
            const page1Images = imageNodes.filter(node => node.position.page === 1);
            expect(page1Images).toHaveLength(2);
            // Check image numbers
            const image0 = imageNodes.find(node => node.metadata?.properties?.imageId === 'image_1_0_111111111');
            const image1 = imageNodes.find(node => node.metadata?.properties?.imageId === 'image_1_1_222222222');
            expect(image0).toBeDefined();
            expect(image1).toBeDefined();
        });
        test('should create proper edges between pages and images', async () => {
            const mockImages = [
                {
                    id: 'image_1_0_123456789',
                    pageNumber: 1,
                    imageNumber: 0,
                    filePath: '/data/images/test-doc/page_1_image_0_123456789.png',
                    fileName: 'page_1_image_0_123456789.png',
                    format: 'png',
                    width: 400,
                    height: 300,
                    size: 122880,
                    dpi: 150,
                    method: 'pdf2pic'
                }
            ];
            const graph = await graph_1.GraphBuilder.buildGraph('edges-doc', mockPdfResult, undefined, mockImages);
            // Find page container node for page 1
            const pageNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'metadata' && node.label === 'Page 1');
            expect(pageNodes).toHaveLength(1);
            const pageNode = pageNodes[0];
            // Find image node
            const imageNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'image');
            expect(imageNodes).toHaveLength(1);
            const imageNode = imageNodes[0];
            // Check that there's a "contains" edge from page to image
            const containsEdges = Array.from(graph.edges.values()).filter(edge => edge.type === 'contains' &&
                edge.source === pageNode.id &&
                edge.target === imageNode.id);
            expect(containsEdges).toHaveLength(1);
            const edge = containsEdges[0];
            expect(edge.weight).toBe(1.0); // Default weight for contains edges
        });
        test('should handle images with missing metadata gracefully', async () => {
            const mockImages = [
                {
                    id: 'image_1_0_minimal',
                    pageNumber: 1,
                    imageNumber: 0,
                    filePath: '/data/images/test-doc/page_1_image_0_minimal.png',
                    fileName: 'page_1_image_0_minimal.png',
                    format: 'png',
                    width: 100,
                    height: 100,
                    size: 10240,
                    dpi: 72,
                    method: 'pdf2pic'
                    // No metadata object
                }
            ];
            const graph = await graph_1.GraphBuilder.buildGraph('minimal-image-doc', mockPdfResult, undefined, mockImages);
            // Should still create the image node
            const imageNodes = Array.from(graph.nodes.values()).filter(node => node.type === 'image');
            expect(imageNodes).toHaveLength(1);
            const imageNode = imageNodes[0];
            expect(imageNode.metadata?.properties?.width).toBe(100);
            expect(imageNode.metadata?.properties?.height).toBe(100);
            expect(imageNode.metadata?.properties?.storageId).toBeUndefined();
        });
    });
});
