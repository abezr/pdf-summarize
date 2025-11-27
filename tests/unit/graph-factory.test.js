"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graph_1 = require("../../src/services/graph");
// Mock uuid to avoid ES module issues
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-12345')
}));
describe('GraphFactory', () => {
    describe('createNode', () => {
        it('should create a valid node with generated ID and timestamps', () => {
            const input = {
                type: 'paragraph',
                label: 'Test Paragraph',
                content: 'This is test content',
                position: {
                    page: 1,
                    start: 0,
                    end: 20
                }
            };
            const node = graph_1.GraphFactory.createNode(input);
            expect(node).toBeDefined();
            expect(node.id).toBeDefined();
            expect(node.type).toBe('paragraph');
            expect(node.label).toBe('Test Paragraph');
            expect(node.content).toBe('This is test content');
            expect(node.position).toEqual(input.position);
            expect(node.created_at).toBeInstanceOf(Date);
            expect(node.updated_at).toBeInstanceOf(Date);
            expect(node.created_at.getTime()).toBe(node.updated_at.getTime());
        });
        it('should throw error for invalid node type', () => {
            const input = {
                type: 'invalid',
                label: 'Test',
                content: 'Test content',
                position: { page: 1, start: 0, end: 10 }
            };
            expect(() => graph_1.GraphFactory.createNode(input)).toThrow('Invalid node type');
        });
        it('should throw error for empty label', () => {
            const input = {
                type: 'paragraph',
                label: '',
                content: 'Test content',
                position: { page: 1, start: 0, end: 10 }
            };
            expect(() => graph_1.GraphFactory.createNode(input)).toThrow('Node label cannot be empty');
        });
        it('should throw error for null content', () => {
            const input = {
                type: 'paragraph',
                label: 'Test',
                content: null,
                position: { page: 1, start: 0, end: 10 }
            };
            expect(() => graph_1.GraphFactory.createNode(input)).toThrow('Node content cannot be null or undefined');
        });
        it('should throw error for invalid position', () => {
            const input = {
                type: 'paragraph',
                label: 'Test',
                content: 'Test content',
                position: { page: 0, start: 0, end: 10 } // Invalid page number
            };
            expect(() => graph_1.GraphFactory.createNode(input)).toThrow('Invalid position: page must be a positive number');
        });
    });
    describe('createEdge', () => {
        it('should create a valid edge with generated ID', () => {
            const input = {
                source: 'node1',
                target: 'node2',
                type: 'contains',
                weight: 0.8
            };
            const edge = graph_1.GraphFactory.createEdge(input);
            expect(edge).toBeDefined();
            expect(edge.id).toBeDefined();
            expect(edge.source).toBe('node1');
            expect(edge.target).toBe('node2');
            expect(edge.type).toBe('contains');
            expect(edge.weight).toBe(0.8);
            expect(edge.created_at).toBeInstanceOf(Date);
        });
        it('should use default weight of 1.0 when not specified', () => {
            const input = {
                source: 'node1',
                target: 'node2',
                type: 'follows'
            };
            const edge = graph_1.GraphFactory.createEdge(input);
            expect(edge.weight).toBe(1.0);
        });
        it('should throw error for self-referencing edge', () => {
            const input = {
                source: 'node1',
                target: 'node1',
                type: 'contains'
            };
            expect(() => graph_1.GraphFactory.createEdge(input)).toThrow('Edge cannot reference the same node');
        });
        it('should throw error for invalid edge type', () => {
            const input = {
                source: 'node1',
                target: 'node2',
                type: 'invalid'
            };
            expect(() => graph_1.GraphFactory.createEdge(input)).toThrow('Invalid edge type');
        });
    });
    describe('createDocumentNode', () => {
        it('should create a document root node', () => {
            const node = graph_1.GraphFactory.createDocumentNode('test.pdf', 5, 1024000);
            expect(node.type).toBe('document');
            expect(node.label).toBe('Document: test.pdf');
            expect(node.content).toContain('test.pdf');
            expect(node.content).toContain('5 pages');
            expect(node.content).toContain('1024000 bytes');
            expect(node.position.page).toBe(1);
            expect(node.position.start).toBe(0);
            expect(node.position.end).toBe(1024000);
            expect(node.metadata?.confidence).toBe(1.0);
            expect(node.metadata?.properties?.filename).toBe('test.pdf');
            expect(node.metadata?.properties?.totalPages).toBe(5);
            expect(node.metadata?.properties?.fileSize).toBe(1024000);
        });
    });
    describe('createSectionNode', () => {
        it('should create a section node with heading level', () => {
            const position = { page: 1, start: 0, end: 50 };
            const node = graph_1.GraphFactory.createSectionNode('Introduction', 1, position, 0.9);
            expect(node.type).toBe('section');
            expect(node.label).toBe('Section: Introduction');
            expect(node.content).toBe('Introduction');
            expect(node.position).toEqual(position);
            expect(node.metadata?.confidence).toBe(0.9);
            expect(node.metadata?.properties?.level).toBe(1);
            expect(node.metadata?.properties?.headingLevel).toBe(1);
        });
    });
    describe('createParagraphNode', () => {
        it('should create a paragraph node', () => {
            const content = 'This is a test paragraph with some content.';
            const position = { page: 1, start: 0, end: content.length };
            const node = graph_1.GraphFactory.createParagraphNode(content, position, 0.8);
            expect(node.type).toBe('paragraph');
            expect(node.label).toBe('Paragraph: This is a test paragraph with some content.');
            expect(node.content).toBe(content);
            expect(node.position).toEqual(position);
            expect(node.metadata?.confidence).toBe(0.8);
        });
        it('should truncate long paragraph labels', () => {
            const content = 'A'.repeat(100); // Very long content that exceeds max label length
            const position = { page: 1, start: 0, end: content.length };
            const node = graph_1.GraphFactory.createParagraphNode(content, position);
            expect(node.label).toContain('...');
            expect(node.label.length).toBeLessThanOrEqual(80);
        });
    });
    describe('createTableNode', () => {
        it('should create a table node with dimensions', () => {
            const content = 'Name | Age\nJohn | 30\nJane | 25';
            const position = { page: 1, start: 0, end: content.length };
            const node = graph_1.GraphFactory.createTableNode(content, position, 3, 2, 0.7);
            expect(node.type).toBe('table');
            expect(node.label).toBe('Table: 3x2');
            expect(node.content).toBe(content);
            expect(node.metadata?.confidence).toBe(0.7);
            expect(node.metadata?.properties?.rowCount).toBe(3);
            expect(node.metadata?.properties?.colCount).toBe(2);
            expect(node.metadata?.properties?.cellCount).toBe(6);
        });
    });
    describe('createImageNode', () => {
        it('should create an image node', () => {
            const position = { page: 2, start: 100, end: 200 };
            const dimensions = { width: 400, height: 300 };
            const node = graph_1.GraphFactory.createImageNode('Chart showing data', position, dimensions, 0.6);
            expect(node.type).toBe('image');
            expect(node.label).toBe('Image: Chart showing data');
            expect(node.content).toBe('Chart showing data');
            expect(node.metadata?.confidence).toBe(0.6);
            expect(node.metadata?.properties?.dimensions).toEqual(dimensions);
            expect(node.metadata?.properties?.hasAltText).toBe(true);
        });
        it('should handle missing alt text', () => {
            const position = { page: 2, start: 100, end: 200 };
            const node = graph_1.GraphFactory.createImageNode('', position);
            expect(node.label).toBe('Image: Unnamed');
            expect(node.content).toBe('[Image]');
            expect(node.metadata?.properties?.hasAltText).toBe(false);
        });
    });
    describe('createListNode', () => {
        it('should create an unordered list node', () => {
            const content = '- Item 1\n- Item 2\n- Item 3';
            const position = { page: 1, start: 0, end: content.length };
            const node = graph_1.GraphFactory.createListNode(content, position, 3, 'unordered', 0.8);
            expect(node.type).toBe('list');
            expect(node.label).toBe('Unordered List (3 items)');
            expect(node.content).toBe(content);
            expect(node.metadata?.confidence).toBe(0.8);
            expect(node.metadata?.properties?.itemCount).toBe(3);
            expect(node.metadata?.properties?.listType).toBe('unordered');
        });
        it('should create an ordered list node', () => {
            const content = '1. First\n2. Second\n3. Third';
            const position = { page: 1, start: 0, end: content.length };
            const node = graph_1.GraphFactory.createListNode(content, position, 3, 'ordered');
            expect(node.label).toBe('Ordered List (3 items)');
            expect(node.metadata?.properties?.listType).toBe('ordered');
        });
    });
    describe('createCodeNode', () => {
        it('should create a code block node with language', () => {
            const content = 'function hello() {\n  return "world";\n}';
            const position = { page: 1, start: 0, end: content.length };
            const node = graph_1.GraphFactory.createCodeNode(content, position, 'typescript', 0.9);
            expect(node.type).toBe('code');
            expect(node.label).toBe('Code: typescript');
            expect(node.content).toBe(content);
            expect(node.metadata?.confidence).toBe(0.9);
            expect(node.metadata?.properties?.language).toBe('typescript');
            expect(node.metadata?.properties?.lineCount).toBe(3);
        });
        it('should create a code block node without language', () => {
            const content = 'print("hello")';
            const position = { page: 1, start: 0, end: content.length };
            const node = graph_1.GraphFactory.createCodeNode(content, position);
            expect(node.label).toBe('Code Block');
            expect(node.metadata?.properties?.language).toBeUndefined();
        });
    });
    describe('createMetadataNode', () => {
        it('should create a metadata node', () => {
            const position = { page: 1, start: 0, end: 50 };
            const node = graph_1.GraphFactory.createMetadataNode('author', 'John Doe', position, 1.0);
            expect(node.type).toBe('metadata');
            expect(node.label).toBe('Metadata: author');
            expect(node.content).toBe('author: John Doe');
            expect(node.metadata?.confidence).toBe(1.0);
            expect(node.metadata?.properties?.key).toBe('author');
            expect(node.metadata?.properties?.value).toBe('John Doe');
            expect(node.metadata?.properties?.valueType).toBe('string');
        });
        it('should handle object values', () => {
            const position = { page: 1, start: 0, end: 50 };
            const value = { version: '1.0', pages: 10 };
            const node = graph_1.GraphFactory.createMetadataNode('info', value, position);
            expect(node.content).toBe('info: {"version":"1.0","pages":10}');
            expect(node.metadata?.properties?.value).toEqual(value);
            expect(node.metadata?.properties?.valueType).toBe('object');
        });
    });
    describe('edge creation helpers', () => {
        it('should create contains edge', () => {
            const edge = graph_1.GraphFactory.createContainsEdge('parent', 'child', 0.9);
            expect(edge.source).toBe('parent');
            expect(edge.target).toBe('child');
            expect(edge.type).toBe('contains');
            expect(edge.weight).toBe(0.9);
        });
        it('should create follows edge', () => {
            const edge = graph_1.GraphFactory.createFollowsEdge('prev', 'next');
            expect(edge.source).toBe('prev');
            expect(edge.target).toBe('next');
            expect(edge.type).toBe('follows');
            expect(edge.weight).toBe(1.0);
        });
        it('should create references edge', () => {
            const edge = graph_1.GraphFactory.createReferencesEdge('source', 'target', 0.7, 'citation');
            expect(edge.source).toBe('source');
            expect(edge.target).toBe('target');
            expect(edge.type).toBe('references');
            expect(edge.weight).toBe(0.7);
            expect(edge.metadata?.context).toBe('citation');
        });
        it('should create similarity edge', () => {
            const edge = graph_1.GraphFactory.createSimilarityEdge('node1', 'node2', 0.85, 'semantic');
            expect(edge.source).toBe('node1');
            expect(edge.target).toBe('node2');
            expect(edge.type).toBe('similar');
            expect(edge.weight).toBe(0.85);
            expect(edge.metadata?.context).toBe('semantic');
            expect(edge.metadata?.similarityScore).toBe(0.85);
        });
    });
});
