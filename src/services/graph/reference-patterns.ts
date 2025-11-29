/**
 * Reference Pattern Detection System
 *
 * Defines regex patterns for detecting various types of references in text documents,
 * including section references, figure/table references, page references, and citations.
 */

export interface ReferencePattern {
  /** Unique identifier for the pattern */
  id: string;
  /** Human-readable name */
  name: string;
  /** Regular expression pattern */
  pattern: RegExp;
  /** Type of reference this pattern detects */
  type: ReferenceType;
  /** Priority for pattern matching (higher = more specific) */
  priority: number;
  /** Description of what this pattern matches */
  description: string;
  /** Example matches */
  examples: string[];
}

export type ReferenceType =
  | 'section' // Section/Chapter references
  | 'figure' // Figure/Image references
  | 'table' // Table references
  | 'page' // Page number references
  | 'citation' // Academic citation references
  | 'cross_reference'; // General cross-references (see below, etc.)

export interface DetectedReference {
  /** The matched text */
  text: string;
  /** Start position in the source text */
  start: number;
  /** End position in the source text */
  end: number;
  /** Reference type */
  type: ReferenceType;
  /** Extracted reference target (e.g., "3.2", "Figure 1") */
  target: string;
  /** Pattern that matched */
  patternId: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Context around the reference */
  context?: string;
}

/**
 * Common reference patterns for PDF documents
 */
export const REFERENCE_PATTERNS: ReferencePattern[] = [
  // Section/Chapter references - high priority
  {
    id: 'section_explicit',
    name: 'Explicit Section Reference',
    pattern:
      /(?:see\s+)?(?:section|chapter|sect\.?|chap\.?)\s+(\d+(?:\.\d+)*)/gi,
    type: 'section',
    priority: 9,
    description: 'Explicit references to sections or chapters with numbers',
    examples: ['see section 3.2', 'Chapter 5', 'sect. 1.4.2'],
  },

  {
    id: 'section_capitalized',
    name: 'Capitalized Section Reference',
    pattern: /(?:Section|Chapter|Part)\s+(\d+(?:\.\d+)*)/gi,
    type: 'section',
    priority: 10,
    description: 'Capitalized section/chapter references',
    examples: ['See Section 3.2', 'Chapter 5 discusses'],
  },

  // Figure references
  {
    id: 'figure_explicit',
    name: 'Explicit Figure Reference',
    pattern: /(?:see\s+)?(?:figure|fig\.?|diagram|chart)\s+(\d+(?:\.\d+)*)/gi,
    type: 'figure',
    priority: 8,
    description: 'References to figures, diagrams, or charts',
    examples: ['see figure 3.2', 'Figure 5 shows', 'fig. 1.4'],
  },

  {
    id: 'figure_capitalized',
    name: 'Capitalized Figure Reference',
    pattern: /(?:see\s+)?(?:Figure|Fig\.?|Diagram|Chart)\s+(\d+(?:\.\d+)*)/gi,
    type: 'figure',
    priority: 7,
    description: 'Capitalized figure references',
    examples: ['See Figure 3.2', 'Figure 5 illustrates'],
  },

  // Table references
  {
    id: 'table_explicit',
    name: 'Explicit Table Reference',
    pattern: /(?:see\s+)?(?:table|tab\.?)\s+(\d+(?:\.\d+)*)/gi,
    type: 'table',
    priority: 6,
    description: 'References to tables',
    examples: ['see table 3.2', 'Table 5 displays', 'tab. 1.4'],
  },

  {
    id: 'table_capitalized',
    name: 'Capitalized Table Reference',
    pattern: /(?:see\s+)?(?:Table|Tab\.?)\s+(\d+(?:\.\d+)*)/gi,
    type: 'table',
    priority: 5,
    description: 'Capitalized table references',
    examples: ['See Table 3.2', 'Table 5 lists'],
  },

  // Page references
  {
    id: 'page_explicit',
    name: 'Explicit Page Reference',
    pattern: /(?:see\s+)?(?:page|p\.?|pp\.?)\s+(\d+(?:-\d+)?)/gi,
    type: 'page',
    priority: 4,
    description: 'Direct page number references',
    examples: ['see page 15', 'p. 42', 'pp. 10-15'],
  },

  {
    id: 'page_capitalized',
    name: 'Capitalized Page Reference',
    pattern: /(?:see\s+)?(?:Page|P\.?|Pp\.?)\s+(\d+(?:-\d+)?)/gi,
    type: 'page',
    priority: 3,
    description: 'Capitalized page references',
    examples: ['See Page 15', 'Page 42'],
  },

  // Citation references
  {
    id: 'citation_brackets',
    name: 'Bracket Citation',
    pattern: /\[([^\]]+)\]/g,
    type: 'citation',
    priority: 2,
    description: 'Academic citations in brackets',
    examples: ['[1]', '[Smith et al., 2023]', '[1, 2, 5]'],
  },

  {
    id: 'citation_parentheses',
    name: 'Parentheses Citation',
    pattern: /\(([A-Za-z][^)]*(?:19|20)\d{2}[^)]*)\)/g,
    type: 'citation',
    priority: 1,
    description: 'Year-based citations in parentheses',
    examples: ['(Smith et al. 2023)', '(Johnson 2021)'],
  },

  // Cross-references (lower priority - more general)
  {
    id: 'cross_above',
    name: 'Above Reference',
    pattern: /(?:see\s+)?(?:above|previously|earlier)/gi,
    type: 'cross_reference',
    priority: 0,
    description: 'References to content above/earlier',
    examples: ['see above', 'as mentioned previously'],
  },

  {
    id: 'cross_below',
    name: 'Below Reference',
    pattern: /(?:see\s+)?(?:below|following|next|later)/gi,
    type: 'cross_reference',
    priority: 0,
    description: 'References to content below/later',
    examples: ['see below', 'as discussed next'],
  },

  {
    id: 'cross_this',
    name: 'This Reference',
    pattern: /(?:see\s+)?this\s+(?:section|chapter|figure|table)/gi,
    type: 'cross_reference',
    priority: 0,
    description: 'References to current section/chapter',
    examples: ['see this section', 'this figure shows'],
  },
];

/**
 * Sort patterns by priority (highest first) for efficient matching
 */
export const SORTED_PATTERNS = REFERENCE_PATTERNS.sort(
  (a, b) => b.priority - a.priority
);

/**
 * Get patterns for a specific reference type
 */
export function getPatternsByType(type: ReferenceType): ReferencePattern[] {
  return REFERENCE_PATTERNS.filter((pattern) => pattern.type === type);
}

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): ReferencePattern | undefined {
  return REFERENCE_PATTERNS.find((pattern) => pattern.id === id);
}

/**
 * Validate a reference pattern
 */
export function validatePattern(pattern: ReferencePattern): boolean {
  try {
    // Test that regex compiles
    new RegExp(pattern.pattern);
    return true;
  } catch {
    return false;
  }
}
