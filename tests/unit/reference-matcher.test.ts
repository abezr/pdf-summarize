/**
 * Unit tests for Reference Matcher
 */

import { ReferenceMatcher } from '../../src/services/graph/reference-matcher';
import { ReferenceType } from '../../src/services/graph/reference-patterns';

describe('Reference Matcher', () => {
  describe('Basic Functionality', () => {
    test('should detect references in text', () => {
      const text = 'See section 3.2 for details. Also check Figure 1.';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.references).toBeDefined();
      expect(result.references.length).toBeGreaterThan(0);
      expect(result.cleanedText).toBeDefined();
      expect(result.stats.totalMatches).toBe(result.references.length);
    });

    test('should return empty result for text without references', () => {
      const text = 'This is a simple paragraph without any references.';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.references).toBeDefined();
      expect(result.references.length).toBe(0);
      expect(result.stats.totalMatches).toBe(0);
    });

    test('should detect multiple reference types', () => {
      const text =
        'See section 2.1, Figure 3, and Table 4. Check page 15 for details.';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.references.length).toBeGreaterThanOrEqual(4);

      const types = result.references.map((r) => r.type);
      expect(types).toContain('section');
      expect(types).toContain('figure');
      expect(types).toContain('table');
      expect(types).toContain('page');
    });

    test('should calculate confidence scores', () => {
      const text = 'See section 3.2 for more information.';
      const result = ReferenceMatcher.findReferences(text);

      for (const ref of result.references) {
        expect(ref.confidence).toBeGreaterThanOrEqual(0);
        expect(ref.confidence).toBeLessThanOrEqual(1);
      }
    });

    test('should include context around references', () => {
      const text =
        'According to the methodology described in section 2.1, the results show clear trends.';
      const result = ReferenceMatcher.findReferences(text, 30);

      for (const ref of result.references) {
        expect(ref.context).toBeDefined();
        expect(typeof ref.context).toBe('string');
        expect(ref.context!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Reference Type Filtering', () => {
    test('should filter by section references only', () => {
      const text = 'See section 3.2, Figure 1, and Table 4.';
      const sections = ReferenceMatcher.findReferencesByType(text, 'section');

      expect(sections.every((ref) => ref.type === 'section')).toBe(true);
      expect(sections.length).toBeGreaterThan(0);
    });

    test('should filter by figure references only', () => {
      const text = 'See section 3.2, Figure 1, and Table 4.';
      const figures = ReferenceMatcher.findReferencesByType(text, 'figure');

      expect(figures.every((ref) => ref.type === 'figure')).toBe(true);
      expect(figures.length).toBeGreaterThan(0);
    });

    test('should return empty array for types not present', () => {
      const text = 'This text has no references at all.';
      const sections = ReferenceMatcher.findReferencesByType(text, 'section');

      expect(sections).toEqual([]);
    });
  });

  describe('Overlap Removal', () => {
    test('should remove overlapping references', () => {
      // Create a scenario where multiple patterns might match the same text
      const text = 'see section 3.2';
      const result = ReferenceMatcher.findReferences(text);

      // Should not have multiple references for the same text span
      const positions = result.references.map((r) => `${r.start}-${r.end}`);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(positions.length);
    });

    test('should keep higher priority references over lower priority ones', () => {
      const text = 'See Section 3.2'; // Capitalized should have higher priority
      const result = ReferenceMatcher.findReferences(text);

      // Should detect the capitalized version preferentially
      expect(result.references.length).toBe(1);
      expect(result.references[0].text).toBe('Section 3.2');
    });
  });

  describe('Text Cleaning', () => {
    test('should clean references from text', () => {
      const text = 'See section 3.2 for details.';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.cleanedText).not.toContain('section 3.2');
      expect(result.cleanedText.length).toBeLessThan(text.length);
    });

    test('should maintain sentence structure after cleaning', () => {
      const text = 'See section 3.2 for details on this topic.';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.cleanedText).not.toContain('section 3.2');
      // Should still be readable
      expect(result.cleanedText.trim()).toMatch(/^[A-Z]/); // Starts with capital or is empty
    });
  });

  describe('Statistics', () => {
    test('should calculate accurate statistics', () => {
      const text = 'See section 3.2, Figure 1, and Table 4.';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.stats.totalMatches).toBe(result.references.length);
      expect(Object.keys(result.stats.matchesByType)).toContain('section');
      expect(result.stats.patternsUsed.length).toBeGreaterThan(0);
    });

    test('should track pattern usage', () => {
      const text = 'See section 3.2.';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.stats.patternsUsed).toContain('section_explicit');
    });
  });

  describe('Validation', () => {
    test('should validate results without issues for good matches', () => {
      const text = 'See section 3.2 for details.';
      const result = ReferenceMatcher.findReferences(text);
      const validation = ReferenceMatcher.validateResults(result);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    test('should identify issues with excessive matches', () => {
      // Create mock result with too many matches
      const mockResult = {
        references: Array(200)
          .fill(null)
          .map((_, i) => ({
            text: `section ${i}`,
            start: i * 10,
            end: i * 10 + 8,
            type: 'section' as ReferenceType,
            target: `${i}`,
            patternId: 'test',
            confidence: 0.8,
          })),
        cleanedText: 'mock text',
        stats: {
          totalMatches: 200,
          matchesByType: {
            section: 200,
            figure: 0,
            table: 0,
            page: 0,
            citation: 0,
            cross_reference: 0,
          },
          patternsUsed: ['test'],
        },
      };

      const validation = ReferenceMatcher.validateResults(mockResult);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    test('should identify overlapping references as issues', () => {
      const mockResult = {
        references: [
          {
            text: 'section 3',
            start: 10,
            end: 15,
            type: 'section' as ReferenceType,
            target: '3',
            patternId: 'test1',
            confidence: 0.8,
          },
          {
            text: '3.2',
            start: 12,
            end: 15,
            type: 'section' as ReferenceType,
            target: '3.2',
            patternId: 'test2',
            confidence: 0.8,
          },
        ],
        cleanedText: 'mock text',
        stats: {
          totalMatches: 2,
          matchesByType: {
            section: 2,
            figure: 0,
            table: 0,
            page: 0,
            citation: 0,
            cross_reference: 0,
          },
          patternsUsed: ['test1', 'test2'],
        },
      };

      const validation = ReferenceMatcher.validateResults(mockResult);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty text', () => {
      const result = ReferenceMatcher.findReferences('');

      expect(result.references).toEqual([]);
      expect(result.cleanedText).toBe('');
      expect(result.stats.totalMatches).toBe(0);
    });

    test('should handle text with special characters', () => {
      const text = 'See section 3.2 (with parentheses) and [brackets].';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.references.length).toBeGreaterThan(0);
      // Should not crash on special characters
    });

    test('should handle very long text', () => {
      const longText =
        'Section 1. '.repeat(1000) + 'See section 3.2 for details.';
      const result = ReferenceMatcher.findReferences(longText);

      expect(result.references.length).toBeGreaterThan(0);
      // Should not have performance issues
    });

    test('should handle unicode characters', () => {
      const text = 'See section 3.2 – with em dash – and figure 1.';
      const result = ReferenceMatcher.findReferences(text);

      expect(result.references.length).toBeGreaterThan(0);
    });
  });
});
