/**
 * Reference Pattern Matching Utility
 *
 * Provides functions to match reference patterns against text and extract
 * structured reference information.
 */

import {
  ReferencePattern,
  SORTED_PATTERNS,
  DetectedReference,
  ReferenceType,
} from './reference-patterns';
import { logger } from '../../utils/logger';

export interface ReferenceMatchResult {
  /** All detected references */
  references: DetectedReference[];
  /** Text with references removed (for further processing) */
  cleanedText: string;
  /** Statistics about the matching process */
  stats: {
    totalMatches: number;
    matchesByType: Record<ReferenceType, number>;
    patternsUsed: string[];
  };
}

export class ReferenceMatcher {
  /**
   * Find all references in the given text using all available patterns
   */
  static findReferences(
    text: string,
    contextWindow: number = 50
  ): ReferenceMatchResult {
    const references: DetectedReference[] = [];
    const matchesByType: Record<ReferenceType, number> = {
      section: 0,
      figure: 0,
      table: 0,
      page: 0,
      citation: 0,
      cross_reference: 0,
    };
    const patternsUsed = new Set<string>();

    // Process patterns in priority order (highest first)
    for (const pattern of SORTED_PATTERNS) {
      const matches = this.findPatternMatches(text, pattern, contextWindow);
      if (matches.length > 0) {
        references.push(...matches);
        matchesByType[pattern.type] += matches.length;
        patternsUsed.add(pattern.id);

        logger.debug(
          `Found ${matches.length} matches for pattern ${pattern.id}`,
          {
            type: pattern.type,
            examples: matches.slice(0, 3).map((m) => m.text),
          }
        );
      }
    }

    // Remove overlapping matches (keep higher priority ones)
    const uniqueReferences = this.removeOverlaps(references);

    // Create cleaned text (remove reference markers)
    const cleanedText = this.cleanReferences(text, uniqueReferences);

    return {
      references: uniqueReferences,
      cleanedText,
      stats: {
        totalMatches: uniqueReferences.length,
        matchesByType,
        patternsUsed: Array.from(patternsUsed),
      },
    };
  }

  /**
   * Find matches for a specific pattern in text
   */
  private static findPatternMatches(
    text: string,
    pattern: ReferencePattern,
    contextWindow: number
  ): DetectedReference[] {
    const references: DetectedReference[] = [];
    const regex = new RegExp(pattern.pattern);

    let match;
    while ((match = regex.exec(text)) !== null) {
      // Extract the full matched text and target
      const fullMatch = match[0];
      const target = match[1] || match[0]; // Use first capture group, or full match

      // Calculate position
      const start = match.index;
      const end = start + fullMatch.length;

      // Extract context around the match
      const contextStart = Math.max(0, start - contextWindow);
      const contextEnd = Math.min(text.length, end + contextWindow);
      const context = text.substring(contextStart, contextEnd);

      // Calculate confidence based on pattern priority and match quality
      const confidence = this.calculateConfidence(pattern, fullMatch, target);

      const reference: DetectedReference = {
        text: fullMatch,
        start,
        end,
        type: pattern.type,
        target: target.trim(),
        patternId: pattern.id,
        confidence,
        context,
      };

      references.push(reference);

      // Prevent overlapping matches by not resetting lastIndex for lower priority patterns
      // (higher priority patterns already matched these areas)
    }

    return references;
  }

  /**
   * Remove overlapping reference matches, keeping higher priority ones
   */
  private static removeOverlaps(
    references: DetectedReference[]
  ): DetectedReference[] {
    if (references.length <= 1) return references;

    // Sort by priority (higher priority first), then by start position
    const sorted = references.sort((a, b) => {
      const priorityDiff =
        SORTED_PATTERNS.find((p) => p.id === b.patternId)!.priority -
        SORTED_PATTERNS.find((p) => p.id === a.patternId)!.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.start - b.start;
    });

    const unique: DetectedReference[] = [];

    for (const ref of sorted) {
      // Check if this reference overlaps with any already selected
      const overlaps = unique.some(
        (existing) => ref.start < existing.end && ref.end > existing.start
      );

      if (!overlaps) {
        unique.push(ref);
      }
    }

    return unique;
  }

  /**
   * Remove reference markers from text for further processing
   */
  private static cleanReferences(
    text: string,
    references: DetectedReference[]
  ): string {
    // Sort references by end position (reverse order) to maintain indices
    const sortedRefs = [...references].sort((a, b) => b.end - a.end);

    let cleanedText = text;
    for (const ref of sortedRefs) {
      // Replace reference text with a space or remove it entirely
      // Keep some spacing to maintain sentence structure
      const before = cleanedText.substring(0, ref.start);
      const after = cleanedText.substring(ref.end);

      // If the reference is at the start/end of a sentence, handle punctuation
      let replacement = '';
      if (ref.text.match(/^[A-Z]/) && after.match(/^[a-z]/)) {
        // Looks like it might be mid-sentence, replace with space
        replacement = ' ';
      }

      cleanedText = before + replacement + after;
    }

    // Clean up extra whitespace
    let result = cleanedText.replace(/\s+/g, ' ').trim();

    // Capitalize first letter if it starts with lowercase after cleaning
    if (result.length > 0 && result[0] >= 'a' && result[0] <= 'z') {
      result = result[0].toUpperCase() + result.slice(1);
    }

    return result;
  }

  /**
   * Calculate confidence score for a reference match
   */
  private static calculateConfidence(
    pattern: ReferencePattern,
    fullMatch: string,
    target: string
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher priority patterns get higher base confidence
    confidence += (pattern.priority / 20) * 0.3; // Max 0.3 boost

    // Longer, more specific targets get higher confidence
    if (target.length > 3) confidence += 0.1;
    if (target.match(/\d+\.\d+/)) confidence += 0.1; // Section numbers with subsections

    // Explicit "see" keywords boost confidence
    if (fullMatch.toLowerCase().includes('see')) confidence += 0.1;

    // Capitalized patterns are more reliable
    if (fullMatch.match(/^[A-Z]/)) confidence += 0.05;

    // Citations in brackets are very reliable
    if (pattern.type === 'citation' && fullMatch.includes('['))
      confidence += 0.2;

    return Math.min(1.0, confidence);
  }

  /**
   * Find references of a specific type only
   */
  static findReferencesByType(
    text: string,
    type: ReferenceType,
    contextWindow: number = 50
  ): DetectedReference[] {
    const patterns = SORTED_PATTERNS.filter((p) => p.type === type);
    const references: DetectedReference[] = [];

    for (const pattern of patterns) {
      const matches = this.findPatternMatches(text, pattern, contextWindow);
      references.push(...matches);
    }

    return this.removeOverlaps(references);
  }

  /**
   * Validate reference extraction results
   */
  static validateResults(result: ReferenceMatchResult): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for reasonable number of references
    if (result.references.length > 100) {
      issues.push('Too many references detected - possible false positives');
    }

    // Check for overlapping references (should have been removed)
    for (let i = 0; i < result.references.length - 1; i++) {
      for (let j = i + 1; j < result.references.length; j++) {
        const ref1 = result.references[i];
        const ref2 = result.references[j];
        if (ref1.start < ref2.end && ref1.end > ref2.start) {
          issues.push(
            `Overlapping references detected: ${ref1.text} and ${ref2.text}`
          );
        }
      }
    }

    // Check confidence scores
    const lowConfidenceRefs = result.references.filter(
      (r) => r.confidence < 0.3
    );
    if (lowConfidenceRefs.length > result.references.length * 0.5) {
      suggestions.push(
        'Many references have low confidence - consider reviewing patterns'
      );
    }

    // Check type distribution
    const types = Object.values(result.stats.matchesByType);
    const uniqueTypes = types.filter((count) => count > 0).length;
    if (uniqueTypes === 1 && result.references.length > 5) {
      suggestions.push(
        'All references are of the same type - verify pattern specificity'
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }
}
