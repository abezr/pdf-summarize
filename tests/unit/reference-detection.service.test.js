"use strict";
/**
 * Unit tests for Reference Detection Service
 */
Object.defineProperty(exports, "__esModule", { value: true });
const reference_detection_service_1 = require("../../src/services/graph/reference-detection.service");
describe('Reference Detection Service', () => {
    describe('Node Analysis', () => {
        const mockParagraphNode = {
            id: 'test-paragraph',
            type: 'paragraph',
            label: 'Test Paragraph',
            content: 'See section 3.2 for details. Also check Figure 1 and Table 4.',
            position: { page: 1, start: 0, end: 100 },
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {
                confidence: 0.9,
            },
        };
        const mockSectionNode = {
            id: 'test-section',
            type: 'section',
            label: 'Test Section',
            content: 'Introduction section with references to Figure 2 and page 15.',
            position: { page: 1, start: 0, end: 80 },
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {
                confidence: 0.9,
                properties: {
                    level: 1,
                },
            },
        };
        const mockImageNode = {
            id: 'test-image',
            type: 'image',
            label: 'Test Image',
            content: 'Figure 1: Sample diagram',
            position: { page: 1, start: 0, end: 50 },
            created_at: new Date(),
            updated_at: new Date(),
        };
        test('should analyze paragraph nodes for references', async () => {
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeNode(mockParagraphNode);
            expect(analysis.sourceNode).toBe(mockParagraphNode);
            expect(analysis.references.length).toBeGreaterThan(0);
            expect(analysis.metadata.textLength).toBe(mockParagraphNode.content.length);
            expect(analysis.metadata.processingTime).toBeGreaterThan(0);
        });
        test('should analyze section nodes for references', async () => {
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeNode(mockSectionNode);
            expect(analysis.sourceNode).toBe(mockSectionNode);
            expect(analysis.references.length).toBeGreaterThan(0);
        });
        test('should reject non-text nodes', async () => {
            await expect(reference_detection_service_1.ReferenceDetectionService.analyzeNode(mockImageNode)).rejects.toThrow('Cannot analyze references in non-text node');
        });
        test('should group references by type', async () => {
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeNode(mockParagraphNode);
            expect(analysis.referencesByType).toBeDefined();
            expect(Object.keys(analysis.referencesByType)).toHaveLength(6); // All reference types
            // Should have section and figure references
            expect(analysis.referencesByType.section.length).toBeGreaterThan(0);
            expect(analysis.referencesByType.figure.length).toBeGreaterThan(0);
        });
        test('should calculate accurate statistics', async () => {
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeNode(mockParagraphNode);
            expect(analysis.stats.totalReferences).toBe(analysis.references.length);
            expect(analysis.stats.average).toBeGreaterThanOrEqual(0);
            expect(analysis.stats.average).toBeLessThanOrEqual(1);
            expect(analysis.stats.min).toBeGreaterThanOrEqual(0);
            expect(analysis.stats.min).toBeLessThanOrEqual(1);
            expect(analysis.stats.max).toBeGreaterThanOrEqual(0);
            expect(analysis.stats.max).toBeLessThanOrEqual(1);
        });
    });
    describe('Text Analysis', () => {
        test('should analyze plain text for references', async () => {
            const text = 'See section 2.1 and Figure 3 for details.';
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeText(text);
            expect(analysis.references.length).toBeGreaterThan(0);
            expect(analysis.metadata.textLength).toBe(text.length);
            expect(analysis.metadata.processingTime).toBeGreaterThan(0);
        });
        test('should return empty analysis for text without references', async () => {
            const text = 'This is plain text without any references.';
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeText(text);
            expect(analysis.references).toEqual([]);
            expect(analysis.stats.totalReferences).toBe(0);
        });
    });
    describe('Multiple Node Analysis', () => {
        const nodes = [
            {
                id: 'para1',
                type: 'paragraph',
                label: 'Paragraph 1',
                content: 'See section 3.2.',
                position: { page: 1, start: 0, end: 20 },
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                id: 'para2',
                type: 'paragraph',
                label: 'Paragraph 2',
                content: 'Check Figure 1.',
                position: { page: 1, start: 20, end: 40 },
                created_at: new Date(),
                updated_at: new Date(),
            },
            {
                id: 'image1',
                type: 'image',
                label: 'Image 1',
                content: 'Sample image',
                position: { page: 1, start: 40, end: 60 },
                created_at: new Date(),
                updated_at: new Date(),
            },
        ];
        test('should analyze multiple nodes and skip non-text ones', async () => {
            const analyses = await reference_detection_service_1.ReferenceDetectionService.analyzeNodes(nodes);
            expect(analyses).toHaveLength(2); // Should skip the image node
            expect(analyses[0].sourceNode.id).toBe('para1');
            expect(analyses[1].sourceNode.id).toBe('para2');
        });
        test('should handle empty node array', async () => {
            const analyses = await reference_detection_service_1.ReferenceDetectionService.analyzeNodes([]);
            expect(analyses).toEqual([]);
        });
    });
    describe('Reference Filtering', () => {
        test('should filter references by target type', async () => {
            const text = 'See section 3.2, Figure 1, and Table 4.';
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeText(text);
            const sectionRefs = reference_detection_service_1.ReferenceDetectionService.filterReferencesByTargetType(analysis.references, 'section');
            const figureRefs = reference_detection_service_1.ReferenceDetectionService.filterReferencesByTargetType(analysis.references, 'figure');
            expect(sectionRefs.every((ref) => ref.type === 'section' || ref.type === 'cross_reference')).toBe(true);
            expect(figureRefs.every((ref) => ref.type === 'figure')).toBe(true);
        });
    });
    describe('Validation', () => {
        test('should validate analysis results', async () => {
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeText('See section 3.2.');
            const validation = reference_detection_service_1.ReferenceDetectionService.validateAnalysis(analysis);
            expect(validation.isValid).toBeDefined();
            expect(validation.issues).toBeDefined();
            expect(validation.warnings).toBeDefined();
        });
        test('should identify issues with empty text', async () => {
            const analysis = await reference_detection_service_1.ReferenceDetectionService.analyzeText('');
            const validation = reference_detection_service_1.ReferenceDetectionService.validateAnalysis(analysis);
            expect(validation.issues.length).toBeGreaterThan(0);
        });
        test('should calculate summary statistics', () => {
            const analyses = [
                {
                    sourceNode: {},
                    references: [],
                    referencesByType: {},
                    stats: {
                        totalReferences: 5,
                        uniqueTargets: 3,
                        confidence: { average: 0.8, min: 0.6, max: 0.9 },
                        types: {},
                    },
                    metadata: {
                        processedAt: new Date(),
                        textLength: 100,
                        processingTime: 50,
                    },
                },
                {
                    sourceNode: {},
                    references: [],
                    referencesByType: {},
                    stats: {
                        totalReferences: 3,
                        uniqueTargets: 2,
                        confidence: { average: 0.7, min: 0.5, max: 0.8 },
                        types: {},
                    },
                    metadata: {
                        processedAt: new Date(),
                        textLength: 80,
                        processingTime: 40,
                    },
                },
            ];
            const summary = reference_detection_service_1.ReferenceDetectionService.getSummaryStats(analyses);
            expect(summary.totalNodesAnalyzed).toBe(2);
            expect(summary.totalReferencesFound).toBe(8);
            expect(summary.averageReferencesPerNode).toBe(4);
            expect(summary.averageConfidence).toBe(0.75);
            expect(summary.totalProcessingTime).toBe(90);
        });
    });
    describe('Node Type Detection', () => {
        test('should identify text nodes correctly', () => {
            const paragraphNode = {
                id: 'para',
                type: 'paragraph',
                label: 'Paragraph',
                content: 'text',
                position: { page: 1, start: 0, end: 4 },
                created_at: new Date(),
                updated_at: new Date(),
            };
            const sectionNode = {
                id: 'section',
                type: 'section',
                label: 'Section',
                content: 'text',
                position: { page: 1, start: 0, end: 4 },
                created_at: new Date(),
                updated_at: new Date(),
            };
            const imageNode = {
                id: 'image',
                type: 'image',
                label: 'Image',
                content: 'alt text',
                position: { page: 1, start: 0, end: 8 },
                created_at: new Date(),
                updated_at: new Date(),
            };
            expect(reference_detection_service_1.ReferenceDetectionService['isTextNode'](paragraphNode)).toBe(true);
            expect(reference_detection_service_1.ReferenceDetectionService['isTextNode'](sectionNode)).toBe(true);
            expect(reference_detection_service_1.ReferenceDetectionService['isTextNode'](imageNode)).toBe(false);
        });
    });
    describe('Text Extraction', () => {
        test('should extract text from different node types', () => {
            const paragraphNode = {
                id: 'para',
                type: 'paragraph',
                label: 'Paragraph',
                content: 'Simple paragraph text',
                position: { page: 1, start: 0, end: 20 },
                created_at: new Date(),
                updated_at: new Date(),
            };
            const metadataNode = {
                id: 'metadata',
                type: 'metadata',
                label: 'Metadata',
                content: 'default content',
                position: { page: 1, start: 0, end: 15 },
                created_at: new Date(),
                updated_at: new Date(),
                metadata: {
                    properties: {
                        value: 'extracted from properties',
                    },
                },
            };
            expect(reference_detection_service_1.ReferenceDetectionService['extractTextForAnalysis'](paragraphNode)).toBe('Simple paragraph text');
            expect(reference_detection_service_1.ReferenceDetectionService['extractTextForAnalysis'](metadataNode)).toBe('extracted from properties');
        });
    });
});
