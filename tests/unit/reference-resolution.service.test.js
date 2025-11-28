"use strict";
/**
 * Unit tests for Reference Resolution Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
const reference_resolution_service_1 = require("../../src/services/graph/reference-resolution.service");
const graph_factory_1 = require("../../src/services/graph/graph-factory");
describe('Reference Resolution Service', () => {
    // Create mock graph for testing
    const createMockGraph = () => {
        const nodes = [
            // Section nodes
            graph_factory_1.GraphFactory.createSectionNode('Introduction', 1, {
                page: 1,
                start: 0,
                end: 12,
            }),
            graph_factory_1.GraphFactory.createSectionNode('Methodology', 2, { page: 2, start: 0, end: 11 }, 0.9, {
                properties: { sectionNumber: '2' },
            }),
            graph_factory_1.GraphFactory.createSectionNode('Results', 3, { page: 3, start: 0, end: 7 }, 0.9, {
                properties: { sectionNumber: '3.2' },
            }),
            // Image/Figure nodes
            graph_factory_1.GraphFactory.createImageNode('Figure 1', { page: 4, start: 0, end: 8 }, { width: 100, height: 100 }),
            graph_factory_1.GraphFactory.createImageNode('Figure 2', { page: 5, start: 0, end: 8 }, { width: 100, height: 100 }),
            // Table nodes
            graph_factory_1.GraphFactory.createTableNode('Sample Table', { page: 6, start: 0, end: 12 }, 3, 4),
            // Paragraph nodes
            graph_factory_1.GraphFactory.createParagraphNode('Content paragraph', {
                page: 1,
                start: 12,
                end: 30,
            }),
        ];
        return {
            id: 'test-graph',
            documentId: 'test-doc',
            nodes,
            edges: [],
            index: {
                byType: new Map(),
                byPage: new Map(),
                byKeyword: new Map(),
                nodeMap: new Map(nodes.map((n) => [n.id, n])),
                edgeMap: new Map(),
                adjacencyList: new Map(),
            },
            statistics: {
                nodeCount: nodes.length,
                edgeCount: 0,
                nodesByType: {
                    document: 0,
                    section: 3,
                    paragraph: 1,
                    table: 1,
                    image: 2,
                    list: 0,
                    code: 0,
                    metadata: 0,
                },
                edgesByType: {
                    contains: 0,
                    references: 0,
                    follows: 0,
                    similar: 0,
                    parent: 0,
                    child: 0,
                    next: 0,
                    previous: 0,
                },
                averageDegree: 0,
                maxDegree: 0,
                density: 0,
                components: 1,
            },
            metadata: {
                created_at: new Date(),
                updated_at: new Date(),
                version: '1.0',
                status: 'complete',
            },
        };
    };
    const mockGraph = createMockGraph();
    const createMockSourceNode = () => ({
        id: 'source-node',
        type: 'paragraph',
        label: 'Source Paragraph',
        content: 'Reference text here',
        position: { page: 1, start: 100, end: 120 },
        created_at: new Date(),
        updated_at: new Date(),
    });
    const createResolutionContext = (sourceNode = createMockSourceNode()) => ({
        graph: mockGraph,
        sourceNode,
    });
    describe('Single Reference Resolution', () => {
        test('should resolve section references', async () => {
            const reference = {
                text: 'section 3.2',
                start: 10,
                end: 20,
                type: 'section',
                target: '3.2',
                patternId: 'section_explicit',
                confidence: 0.9,
            };
            const context = createResolutionContext();
            const resolution = await reference_resolution_service_1.ReferenceResolutionService.resolveReference(reference, context);
            expect(resolution.reference).toBe(reference);
            expect(resolution.confidence).toBeGreaterThan(0);
            expect(resolution.targetNode).toBeDefined();
            expect(resolution.targetNode?.type).toBe('section');
        });
        test('should resolve figure references', async () => {
            const reference = {
                text: 'Figure 1',
                start: 10,
                end: 18,
                type: 'figure',
                target: '1',
                patternId: 'figure_explicit',
                confidence: 0.9,
            };
            const context = createResolutionContext();
            const resolution = await reference_resolution_service_1.ReferenceResolutionService.resolveReference(reference, context);
            expect(resolution.targetNode).toBeDefined();
            expect(resolution.targetNode?.type).toBe('image');
        });
        test('should resolve table references', async () => {
            const reference = {
                text: 'Table 1',
                start: 10,
                end: 17,
                type: 'table',
                target: '1',
                patternId: 'table_explicit',
                confidence: 0.9,
            };
            const context = createResolutionContext();
            const resolution = await reference_resolution_service_1.ReferenceResolutionService.resolveReference(reference, context);
            expect(resolution.targetNode).toBeDefined();
            expect(resolution.targetNode?.type).toBe('table');
        });
        test('should handle unresolvable references', async () => {
            const reference = {
                text: 'section 99',
                start: 10,
                end: 20,
                type: 'section',
                target: '99',
                patternId: 'section_explicit',
                confidence: 0.9,
            };
            const context = createResolutionContext();
            const resolution = await reference_resolution_service_1.ReferenceResolutionService.resolveReference(reference, context);
            expect(resolution.targetNode).toBeUndefined();
            expect(resolution.confidence).toBe(0);
            expect(resolution.reason).toContain('No section found');
        });
        test('should resolve spatial references', async () => {
            const reference = {
                text: 'see below',
                start: 10,
                end: 19,
                type: 'cross_reference',
                target: 'below',
                patternId: 'cross_below',
                confidence: 0.8,
            };
            const context = createResolutionContext();
            const resolution = await reference_resolution_service_1.ReferenceResolutionService.resolveReference(reference, context);
            expect(resolution.confidence).toBeGreaterThan(0);
            // May or may not find a target depending on graph structure
        });
    });
    describe('Multiple Reference Resolution', () => {
        test('should resolve multiple references', async () => {
            const references = [
                {
                    text: 'section 3.2',
                    start: 10,
                    end: 20,
                    type: 'section',
                    target: '3.2',
                    patternId: 'section_explicit',
                    confidence: 0.9,
                },
                {
                    text: 'Figure 1',
                    start: 25,
                    end: 33,
                    type: 'figure',
                    target: '1',
                    patternId: 'figure_explicit',
                    confidence: 0.9,
                },
            ];
            const context = createResolutionContext();
            const resolutions = await reference_resolution_service_1.ReferenceResolutionService.resolveReferences(references, context);
            expect(resolutions).toHaveLength(2);
            expect(resolutions[0].targetNode).toBeDefined();
            expect(resolutions[1].targetNode).toBeDefined();
        });
        test('should handle mixed resolvable and unresolvable references', async () => {
            const references = [
                {
                    text: 'section 3.2',
                    start: 10,
                    end: 20,
                    type: 'section',
                    target: '3.2',
                    patternId: 'section_explicit',
                    confidence: 0.9,
                },
                {
                    text: 'section 99',
                    start: 25,
                    end: 35,
                    type: 'section',
                    target: '99',
                    patternId: 'section_explicit',
                    confidence: 0.9,
                },
            ];
            const context = createResolutionContext();
            const resolutions = await reference_resolution_service_1.ReferenceResolutionService.resolveReferences(references, context);
            expect(resolutions).toHaveLength(2);
            expect(resolutions[0].targetNode).toBeDefined();
            expect(resolutions[1].targetNode).toBeUndefined();
        });
    });
    describe('Helper Functions', () => {
        test('should extract section numbers correctly', () => {
            const sectionNode = mockGraph.nodes.find((n) => n.type === 'section' && n.content.includes('Results'));
            if (sectionNode) {
                const sectionNumber = reference_resolution_service_1.ReferenceResolutionService['extractSectionNumber'](sectionNode);
                expect(sectionNumber).toBe('3.2');
            }
        });
        test('should extract figure numbers correctly', () => {
            const figureNode = mockGraph.nodes.find((n) => n.type === 'image' && n.content.includes('Figure 1'));
            if (figureNode) {
                const figureNumber = reference_resolution_service_1.ReferenceResolutionService['extractFigureNumber'](figureNode);
                expect(figureNumber).toBe('1');
            }
        });
        test('should extract table numbers correctly', () => {
            const tableNode = mockGraph.nodes.find((n) => n.type === 'table');
            if (tableNode) {
                const tableNumber = reference_resolution_service_1.ReferenceResolutionService['extractTableNumber'](tableNode);
                expect(tableNumber).toBeUndefined(); // Our mock doesn't have explicit table number
            }
        });
        test('should calculate fuzzy match confidence', () => {
            expect(reference_resolution_service_1.ReferenceResolutionService['calculateFuzzyMatchConfidence']('3.2', '3.2')).toBe(1.0);
            expect(reference_resolution_service_1.ReferenceResolutionService['calculateFuzzyMatchConfidence']('3.2', '3')).toBeGreaterThan(0.5);
            expect(reference_resolution_service_1.ReferenceResolutionService['calculateFuzzyMatchConfidence']('3.2', '1.2')).toBeLessThan(0.5);
        });
        test('should find nodes before position', () => {
            const position = { page: 3, start: 50, end: 60 };
            const earlierNodes = reference_resolution_service_1.ReferenceResolutionService['findNodesBeforePosition'](mockGraph, position);
            expect(earlierNodes.length).toBeGreaterThan(0);
            for (const node of earlierNodes) {
                expect(node.position.page).toBeLessThanOrEqual(position.page);
                if (node.position.page === position.page) {
                    expect(node.position.start).toBeLessThan(position.start);
                }
            }
        });
        test('should find nodes after position', () => {
            const position = { page: 1, start: 50, end: 60 };
            const laterNodes = reference_resolution_service_1.ReferenceResolutionService['findNodesAfterPosition'](mockGraph, position);
            expect(laterNodes.length).toBeGreaterThan(0);
            for (const node of laterNodes) {
                expect(node.position.page).toBeGreaterThanOrEqual(position.page);
                if (node.position.page === position.page) {
                    expect(node.position.start).toBeGreaterThan(position.end);
                }
            }
        });
    });
    describe('Strategy Resolution', () => {
        test('should use exact section match strategy', () => {
            const reference = {
                text: 'section 3.2',
                start: 10,
                end: 20,
                type: 'section',
                target: '3.2',
                patternId: 'section_explicit',
                confidence: 0.9,
            };
            const context = createResolutionContext();
            const result = reference_resolution_service_1.ReferenceResolutionService['resolveExactSectionMatch'](reference, context);
            expect(result.targetNode).toBeDefined();
            expect(result.confidence).toBe(0.95);
            expect(result.reason).toContain('Exact section number match');
        });
        test('should use page-based resolution strategy', () => {
            const reference = {
                text: 'page 4',
                start: 10,
                end: 16,
                type: 'page',
                target: '4',
                patternId: 'page_explicit',
                confidence: 0.9,
            };
            const context = createResolutionContext();
            const result = reference_resolution_service_1.ReferenceResolutionService['resolvePageBased'](reference, context);
            expect(result.confidence).toBe(0.7);
            expect(result.reason).toContain('Found content on page 4');
        });
        test('should handle invalid page numbers', () => {
            const reference = {
                text: 'page abc',
                start: 10,
                end: 18,
                type: 'page',
                target: 'abc',
                patternId: 'page_explicit',
                confidence: 0.9,
            };
            const context = createResolutionContext();
            const result = reference_resolution_service_1.ReferenceResolutionService['resolvePageBased'](reference, context);
            expect(result.targetNode).toBeUndefined();
            expect(result.confidence).toBe(0);
            expect(result.reason).toContain('Invalid page number');
        });
    });
    describe('Error Handling', () => {
        test('should handle missing graph gracefully', async () => {
            const reference = {
                text: 'section 1',
                start: 0,
                end: 9,
                type: 'section',
                target: '1',
                patternId: 'section_explicit',
                confidence: 0.9,
            };
            const context = {
                graph: { ...mockGraph, nodes: [] }, // Empty graph
                sourceNode: createMockSourceNode(),
            };
            const resolution = await reference_resolution_service_1.ReferenceResolutionService.resolveReference(reference, context);
            expect(resolution.targetNode).toBeUndefined();
            expect(resolution.confidence).toBe(0);
        });
        test('should handle malformed references', async () => {
            const malformedReference = {
                text: '',
                start: 0,
                end: 0,
                type: 'section',
                target: '',
                patternId: 'section_explicit',
                confidence: 0.9,
            };
            const context = createResolutionContext();
            const resolution = await reference_resolution_service_1.ReferenceResolutionService.resolveReference(malformedReference, context);
            expect(resolution.confidence).toBeLessThan(1); // Should have lower confidence
        });
    });
});
