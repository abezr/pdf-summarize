/**
 * Unit tests for Reference Patterns
 */

import {
  REFERENCE_PATTERNS,
  SORTED_PATTERNS,
  getPatternById,
  validatePattern,
} from '../../src/services/graph/reference-patterns';

describe('Reference Patterns', () => {
  describe('Pattern Definitions', () => {
    test('should have valid pattern definitions', () => {
      expect(REFERENCE_PATTERNS).toBeDefined();
      expect(REFERENCE_PATTERNS.length).toBeGreaterThan(0);

      for (const pattern of REFERENCE_PATTERNS) {
        expect(pattern).toHaveProperty('id');
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('type');
        expect(pattern).toHaveProperty('priority');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('examples');
        expect(Array.isArray(pattern.examples)).toBe(true);
      }
    });

    test('should have unique pattern IDs', () => {
      const ids = REFERENCE_PATTERNS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('should have valid regex patterns', () => {
      for (const pattern of REFERENCE_PATTERNS) {
        expect(() => new RegExp(pattern.pattern)).not.toThrow();
        expect(validatePattern(pattern)).toBe(true);
      }
    });

    test('should have patterns sorted by priority', () => {
      for (let i = 1; i < SORTED_PATTERNS.length; i++) {
        expect(SORTED_PATTERNS[i].priority).toBeLessThanOrEqual(
          SORTED_PATTERNS[i - 1].priority
        );
      }
    });
  });

  describe('Pattern Matching', () => {
    test('should match section references', () => {
      const text = 'See section 3.2 for details. Also check section 5.';
      const sectionPatterns = REFERENCE_PATTERNS.filter(
        (p) => p.type === 'section'
      );

      let matchesFound = 0;
      for (const pattern of sectionPatterns) {
        const regex = new RegExp(pattern.pattern);
        const matches = text.match(regex);
        if (matches) {
          matchesFound += matches.length;
        }
      }

      expect(matchesFound).toBeGreaterThan(0);
    });

    test('should match figure references', () => {
      const text =
        'As shown in Figure 1 and Figure 2.3, the results are clear.';
      const figurePatterns = REFERENCE_PATTERNS.filter(
        (p) => p.type === 'figure'
      );

      let matchesFound = 0;
      for (const pattern of figurePatterns) {
        const regex = new RegExp(pattern.pattern);
        const matches = text.match(regex);
        if (matches) {
          matchesFound += matches.length;
        }
      }

      expect(matchesFound).toBeGreaterThan(0);
    });

    test('should match table references', () => {
      const text = 'Data is presented in Table 1 and Table 2.4.';
      const tablePatterns = REFERENCE_PATTERNS.filter(
        (p) => p.type === 'table'
      );

      let matchesFound = 0;
      for (const pattern of tablePatterns) {
        const regex = new RegExp(pattern.pattern);
        const matches = text.match(regex);
        if (matches) {
          matchesFound += matches.length;
        }
      }

      expect(matchesFound).toBeGreaterThan(0);
    });

    test('should match citation references', () => {
      const text =
        'Studies show this [1, 2]. Smith et al. (2023) found similar results.';
      const citationPatterns = REFERENCE_PATTERNS.filter(
        (p) => p.type === 'citation'
      );

      let matchesFound = 0;
      for (const pattern of citationPatterns) {
        const regex = new RegExp(pattern.pattern);
        const matches = text.match(regex);
        if (matches) {
          matchesFound += matches.length;
        }
      }

      expect(matchesFound).toBeGreaterThan(0);
    });

    test('should match cross references', () => {
      const text =
        'See below for details. As mentioned above, this is important.';
      const crossRefPatterns = REFERENCE_PATTERNS.filter(
        (p) => p.type === 'cross_reference'
      );

      let matchesFound = 0;
      for (const pattern of crossRefPatterns) {
        const regex = new RegExp(pattern.pattern);
        const matches = text.match(regex);
        if (matches) {
          matchesFound += matches.length;
        }
      }

      expect(matchesFound).toBeGreaterThan(0);
    });

    test('should match page references', () => {
      const text = 'See page 15 for more information. Check p. 42.';
      const pagePatterns = REFERENCE_PATTERNS.filter((p) => p.type === 'page');

      let matchesFound = 0;
      for (const pattern of pagePatterns) {
        const regex = new RegExp(pattern.pattern);
        const matches = text.match(regex);
        if (matches) {
          matchesFound += matches.length;
        }
      }

      expect(matchesFound).toBeGreaterThan(0);
    });
  });

  describe('Pattern Retrieval', () => {
    test('should retrieve pattern by ID', () => {
      const pattern = getPatternById('section_explicit');
      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('section_explicit');
      expect(pattern?.type).toBe('section');
    });

    test('should return undefined for non-existent pattern', () => {
      const pattern = getPatternById('non_existent_pattern');
      expect(pattern).toBeUndefined();
    });

    test('should retrieve patterns by type', () => {
      const sectionPatterns = REFERENCE_PATTERNS.filter(
        (p) => p.type === 'section'
      );
      expect(sectionPatterns.length).toBeGreaterThan(0);

      const figurePatterns = REFERENCE_PATTERNS.filter(
        (p) => p.type === 'figure'
      );
      expect(figurePatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Validation', () => {
    test('should validate correct patterns', () => {
      const validPattern = REFERENCE_PATTERNS[0];
      expect(validatePattern(validPattern)).toBe(true);
    });

    test('should invalidate incorrect patterns', () => {
      const invalidPattern = {
        ...REFERENCE_PATTERNS[0],
        pattern: '/(unclosed/g' as any, // Invalid regex
      };
      expect(validatePattern(invalidPattern)).toBe(false);
    });
  });

  describe('Pattern Examples', () => {
    test('should have examples for each pattern', () => {
      for (const pattern of REFERENCE_PATTERNS) {
        expect(pattern.examples.length).toBeGreaterThan(0);

        // Test that examples actually match the pattern
        const regex = new RegExp(pattern.pattern, 'gi');
        for (const example of pattern.examples) {
          const matches = example.match(regex);
          expect(matches).toBeTruthy();
        }
      }
    });
  });
});
