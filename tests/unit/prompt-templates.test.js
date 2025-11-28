"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_templates_1 = require("../../src/services/llm/prompt-templates");
describe('PromptTemplateService', () => {
    let service;
    let mockGraph;
    beforeEach(() => {
        service = new prompt_templates_1.PromptTemplateService();
        // Create mock graph with various node types
        mockGraph = {
            id: 'test-graph',
            documentId: 'test-doc',
            nodes: [
                {
                    id: 'section-1',
                    type: 'section',
                    label: 'Introduction',
                    content: 'This is the introduction section',
                    position: { page: 1, start: 0, end: 50 },
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: 'para-1',
                    type: 'paragraph',
                    label: 'First paragraph',
                    content: 'This document discusses important topics that executives need to know about. Key findings include significant improvements in efficiency.',
                    position: { page: 1, start: 51, end: 200 },
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: 'para-2',
                    type: 'paragraph',
                    label: 'Second paragraph',
                    content: 'The methodology used was comprehensive and included multiple data sources. Results showed a 30% improvement.',
                    position: { page: 1, start: 201, end: 350 },
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ],
            edges: [
                {
                    id: 'edge-1',
                    source: 'section-1',
                    target: 'para-1',
                    type: 'contains',
                    weight: 1.0,
                    created_at: new Date()
                },
                {
                    id: 'edge-2',
                    source: 'section-1',
                    target: 'para-2',
                    type: 'contains',
                    weight: 1.0,
                    created_at: new Date()
                }
            ],
            index: {
                byType: new Map(),
                byPage: new Map(),
                byKeyword: new Map(),
                nodeMap: new Map(),
                edgeMap: new Map(),
                adjacencyList: new Map()
            },
            statistics: {
                nodeCount: 3,
                edgeCount: 2,
                nodesByType: {
                    document: 0,
                    section: 1,
                    paragraph: 2,
                    table: 0,
                    image: 0,
                    list: 0,
                    code: 0,
                    metadata: 0
                },
                edgesByType: {
                    contains: 2,
                    references: 0,
                    follows: 0,
                    similar: 0,
                    parent: 0,
                    child: 0,
                    next: 0,
                    previous: 0
                },
                averageDegree: 1.33,
                maxDegree: 2,
                density: 0.33,
                components: 1
            },
            metadata: {
                created_at: new Date(),
                updated_at: new Date(),
                version: '1.0',
                status: 'complete'
            }
        };
    });
    describe('generatePrompt', () => {
        test('should generate executive summary prompt', () => {
            const request = {
                type: 'executive',
                graph: mockGraph,
                maxLength: 200,
                style: 'formal'
            };
            const result = service.generatePrompt(request);
            expect(result.systemPrompt).toContain('executive summaries');
            expect(result.systemPrompt).toContain('formal, professional language');
            expect(result.systemPrompt).toContain('200 words');
            expect(result.userPrompt).toContain('executive summary');
            expect(result.userPrompt).toContain('Document Content:');
            expect(result.context).toContain('## Introduction');
            expect(result.instructions).toContain('Identify the main topic and purpose');
        });
        test('should generate detailed summary prompt', () => {
            const request = {
                type: 'detailed',
                graph: mockGraph,
                style: 'technical'
            };
            const result = service.generatePrompt(request);
            expect(result.systemPrompt).toContain('comprehensive summaries');
            expect(result.systemPrompt).toContain('precise technical language');
            expect(result.userPrompt).toContain('detailed summary');
            expect(result.instructions).toContain('Cover all major sections and topics');
        });
        test('should generate bullet-points prompt', () => {
            const request = {
                type: 'bullet-points',
                graph: mockGraph,
                style: 'casual'
            };
            const result = service.generatePrompt(request);
            expect(result.systemPrompt).toContain('bullet points');
            expect(result.systemPrompt).toContain('conversational, accessible language');
            expect(result.userPrompt).toContain('bullet points');
            expect(result.instructions).toContain('Use clear, concise bullet points');
        });
        test('should handle focus and exclude parameters', () => {
            const request = {
                type: 'executive',
                graph: mockGraph,
                focus: ['key findings', 'methodology'],
                exclude: ['unimportant details'],
                style: 'formal'
            };
            const result = service.generatePrompt(request);
            expect(result.systemPrompt).toContain('key findings, methodology');
            expect(result.systemPrompt).toContain('unimportant details');
        });
    });
    describe('getRelevantNodes', () => {
        test('should filter nodes for executive summary', () => {
            const nodes = service['getRelevantNodes'](mockGraph, 'executive');
            expect(nodes.length).toBe(3); // section + 2 paragraphs (one is key)
            expect(nodes.some(n => n.type === 'section')).toBe(true);
            expect(nodes.some(n => n.type === 'paragraph')).toBe(true);
        });
        test('should filter nodes for technical summary', () => {
            const nodes = service['getRelevantNodes'](mockGraph, 'technical');
            expect(nodes.length).toBe(3); // section + 2 paragraphs
        });
    });
    describe('generateContext', () => {
        test('should organize content by sections', () => {
            const relevantNodes = mockGraph.nodes;
            const context = service['generateContext'](mockGraph, relevantNodes);
            expect(context).toContain('## Introduction');
            expect(context).toContain('This is the introduction section');
            expect(context).toContain('This document discusses important topics');
        });
    });
    describe('estimateTokenCount', () => {
        test('should estimate tokens based on character count', () => {
            const text = 'This is a test string with some words';
            const tokens = service.estimateTokenCount(text);
            // ~4 characters per token, so ~8 tokens expected
            expect(tokens).toBeGreaterThan(5);
            expect(tokens).toBeLessThan(15);
        });
    });
    describe('getSupportedTypes', () => {
        test('should return all supported summary types', () => {
            const types = service.getSupportedTypes();
            expect(types).toContain('executive');
            expect(types).toContain('detailed');
            expect(types).toContain('chapter');
            expect(types).toContain('bullet-points');
            expect(types).toContain('narrative');
            expect(types).toContain('technical');
            expect(types.length).toBe(6);
        });
    });
    describe('isKeyParagraph', () => {
        test('should identify key paragraphs', () => {
            const keyParagraph = {
                ...mockGraph.nodes[1],
                content: 'This paragraph contains key findings and important results.'
            };
            const regularParagraph = {
                ...mockGraph.nodes[1],
                content: 'This is just a regular paragraph with normal content.'
            };
            expect(service['isKeyParagraph'](keyParagraph)).toBe(true);
            expect(service['isKeyParagraph'](regularParagraph)).toBe(false);
        });
    });
});
