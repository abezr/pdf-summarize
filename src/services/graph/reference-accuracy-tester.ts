/**
 * Reference Accuracy Testing Framework
 *
 * Framework for testing and evaluating the accuracy of reference detection,
 * resolution, and graph construction against ground truth data.
 */

import { ReferenceMatcher } from './reference-matcher';
import { ReferenceDetectionService } from './reference-detection.service';
import {
  ReferenceResolutionService,
  ResolutionContext,
} from './reference-resolution.service';
import { DetectedReference, ReferenceType } from './reference-patterns';
import { GraphNode } from '../../models/graph.model';
import { Graph } from './graph';
import { logger } from '../../utils/logger';

export interface AccuracyTestCase {
  /** Unique test case identifier */
  id: string;
  /** Test case name */
  name: string;
  /** Input text to analyze */
  text: string;
  /** Expected references in the text */
  expectedReferences: ExpectedReference[];
  /** Optional expected resolutions */
  expectedResolutions?: ExpectedResolution[];
  /** Test case metadata */
  metadata?: {
    source?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
  };
}

export interface ExpectedReference {
  /** Expected reference text */
  text: string;
  /** Expected reference type */
  type: ReferenceType;
  /** Expected target identifier */
  target: string;
  /** Expected confidence range */
  confidenceRange?: [number, number];
  /** Whether this reference should be detected */
  shouldDetect: boolean;
}

export interface ExpectedResolution {
  /** Reference text */
  referenceText: string;
  /** Expected target node ID (if resolvable) */
  expectedTargetId?: string;
  /** Whether resolution should succeed */
  shouldResolve: boolean;
  /** Minimum acceptable confidence */
  minConfidence?: number;
}

export interface AccuracyTestResult {
  /** Test case that was run */
  testCase: AccuracyTestCase;
  /** Detection results */
  detectionResults: DetectionAccuracyResult;
  /** Resolution results (if applicable) */
  resolutionResults?: ResolutionAccuracyResult;
  /** Overall test score (0-1) */
  overallScore: number;
  /** Test execution time */
  executionTime: number;
  /** Issues found during testing */
  issues: string[];
}

export interface DetectionAccuracyResult {
  /** True positives: correctly detected expected references */
  truePositives: number;
  /** False positives: detected references not in ground truth */
  falsePositives: number;
  /** False negatives: expected references not detected */
  falseNegatives: number;
  /** Precision: TP / (TP + FP) */
  precision: number;
  /** Recall: TP / (TP + FN) */
  recall: number;
  /** F1 Score: 2 * (precision * recall) / (precision + recall) */
  f1Score: number;
  /** Detected references with their accuracy status */
  detectedReferences: Array<{
    detected: DetectedReference;
    status:
      | 'correct'
      | 'incorrect_type'
      | 'incorrect_target'
      | 'false_positive';
    expectedMatch?: ExpectedReference;
  }>;
  /** Missed expected references */
  missedReferences: ExpectedReference[];
}

export interface ResolutionAccuracyResult {
  /** Successfully resolved references */
  resolvedCorrectly: number;
  /** Incorrectly resolved references */
  resolvedIncorrectly: number;
  /** Failed to resolve references that should have been resolved */
  failedToResolve: number;
  /** Resolution accuracy: correctly resolved / total expected resolutions */
  accuracy: number;
  /** Average resolution confidence */
  averageConfidence: number;
  /** Resolution details */
  resolutionDetails: Array<{
    referenceText: string;
    expectedTargetId?: string;
    actualTargetId?: string;
    confidence: number;
    correct: boolean;
  }>;
}

export interface AccuracyTestSuite {
  /** Suite identifier */
  id: string;
  /** Suite name */
  name: string;
  /** Test cases in this suite */
  testCases: AccuracyTestCase[];
  /** Suite configuration */
  config: {
    /** Minimum acceptable overall score */
    minOverallScore: number;
    /** Whether to include resolution testing */
    includeResolutionTests: boolean;
    /** Optional mock graph for resolution testing */
    mockGraph?: Graph;
  };
}

export interface AccuracyTestReport {
  /** Test suite that was run */
  suite: AccuracyTestSuite;
  /** Results for each test case */
  results: AccuracyTestResult[];
  /** Overall suite statistics */
  summary: {
    /** Average overall score across all tests */
    averageScore: number;
    /** Number of tests that passed (score >= minOverallScore) */
    passedTests: number;
    /** Total number of tests */
    totalTests: number;
    /** Suite pass rate */
    passRate: number;
    /** Average detection F1 score */
    averageDetectionF1: number;
    /** Average resolution accuracy (if applicable) */
    averageResolutionAccuracy?: number;
    /** Total execution time */
    totalExecutionTime: number;
  };
  /** Issues found across all tests */
  allIssues: string[];
  /** Recommendations for improvement */
  recommendations: string[];
}

export class ReferenceAccuracyTester {
  /**
   * Run a single accuracy test case
   */
  static async runTestCase(
    testCase: AccuracyTestCase,
    mockGraph?: Graph
  ): Promise<AccuracyTestResult> {
    const startTime = Date.now();

    logger.info(`Running accuracy test: ${testCase.name}`);

    // 1. Test detection accuracy
    const detectionResults = await this.testDetectionAccuracy(testCase);

    // 2. Test resolution accuracy (if applicable)
    let resolutionResults: ResolutionAccuracyResult | undefined;
    if (testCase.expectedResolutions && mockGraph) {
      resolutionResults = await this.testResolutionAccuracy(
        testCase,
        mockGraph
      );
    }

    // 3. Calculate overall score
    const detectionScore = detectionResults.f1Score;
    const resolutionScore = resolutionResults?.accuracy || 1.0; // Default to 1.0 if no resolution test
    const overallScore = (detectionScore + resolutionScore) / 2;

    // 4. Identify issues
    const issues = this.identifyTestIssues(detectionResults, resolutionResults);

    const result: AccuracyTestResult = {
      testCase,
      detectionResults,
      resolutionResults,
      overallScore,
      executionTime: Date.now() - startTime,
      issues,
    };

    logger.info(`Test completed: ${testCase.name}`, {
      overallScore: result.overallScore.toFixed(3),
      detectionF1: detectionResults.f1Score.toFixed(3),
      resolutionAccuracy: resolutionResults?.accuracy.toFixed(3),
      issuesCount: issues.length,
    });

    return result;
  }

  /**
   * Run a complete accuracy test suite
   */
  static async runTestSuite(
    suite: AccuracyTestSuite
  ): Promise<AccuracyTestReport> {
    logger.info(`Running accuracy test suite: ${suite.name}`, {
      testCount: suite.testCases.length,
    });

    const results: AccuracyTestResult[] = [];
    let totalExecutionTime = 0;

    // Run each test case
    for (const testCase of suite.testCases) {
      try {
        const result = await this.runTestCase(testCase, suite.config.mockGraph);
        results.push(result);
        totalExecutionTime += result.executionTime;
      } catch (error) {
        logger.error(`Failed to run test case ${testCase.id}:`, error);
        // Create failed result
        results.push({
          testCase,
          detectionResults: {
            truePositives: 0,
            falsePositives: 0,
            falseNegatives: testCase.expectedReferences.length,
            precision: 0,
            recall: 0,
            f1Score: 0,
            detectedReferences: [],
            missedReferences: testCase.expectedReferences,
          },
          overallScore: 0,
          executionTime: 0,
          issues: [
            `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ],
        });
      }
    }

    // Calculate summary statistics
    const averageScore =
      results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
    const passedTests = results.filter(
      (r) => r.overallScore >= suite.config.minOverallScore
    ).length;
    const averageDetectionF1 =
      results.reduce((sum, r) => sum + r.detectionResults.f1Score, 0) /
      results.length;

    const summary: AccuracyTestReport['summary'] = {
      averageScore,
      passedTests,
      totalTests: results.length,
      passRate: passedTests / results.length,
      averageDetectionF1,
      totalExecutionTime,
    };

    // Add resolution accuracy if applicable
    if (suite.config.includeResolutionTests) {
      const resolutionResults = results.filter((r) => r.resolutionResults);
      if (resolutionResults.length > 0) {
        (summary as any).averageResolutionAccuracy =
          resolutionResults.reduce(
            (sum, r) => sum + (r.resolutionResults?.accuracy || 0),
            0
          ) / resolutionResults.length;
      }
    }

    // Collect all issues and generate recommendations
    const allIssues = results.flatMap((r) => r.issues);
    const recommendations = this.generateTestRecommendations(results, suite);

    const report: AccuracyTestReport = {
      suite,
      results,
      summary,
      allIssues,
      recommendations,
    };

    logger.info(`Test suite completed: ${suite.name}`, {
      averageScore: summary.averageScore.toFixed(3),
      passRate: (summary.passRate * 100).toFixed(1) + '%',
      totalExecutionTime: summary.totalExecutionTime + 'ms',
    });

    return report;
  }

  /**
   * Test detection accuracy for a single test case
   */
  private static async testDetectionAccuracy(
    testCase: AccuracyTestCase
  ): Promise<DetectionAccuracyResult> {
    // Run detection on the test text
    const matchResult = ReferenceMatcher.findReferences(testCase.text);

    const detectedReferences: Array<{
      detected: DetectedReference;
      status:
        | 'correct'
        | 'incorrect_type'
        | 'incorrect_target'
        | 'false_positive';
      expectedMatch?: ExpectedReference;
    }> = [];

    let truePositives = 0;
    let falsePositives = 0;

    // Match detected references against expected ones
    for (const detected of matchResult.references) {
      const expectedMatch = this.findExpectedMatch(
        detected,
        testCase.expectedReferences
      );

      if (expectedMatch) {
        // Check if this detection matches the expectation
        const typeCorrect = detected.type === expectedMatch.type;
        const targetCorrect = this.targetsMatch(
          detected.target,
          expectedMatch.target
        );
        const confidenceInRange =
          !expectedMatch.confidenceRange ||
          (detected.confidence >= expectedMatch.confidenceRange[0] &&
            detected.confidence <= expectedMatch.confidenceRange[1]);

        if (typeCorrect && targetCorrect && confidenceInRange) {
          detectedReferences.push({
            detected,
            status: 'correct',
            expectedMatch,
          });
          truePositives++;
        } else {
          detectedReferences.push({
            detected,
            status: typeCorrect ? 'incorrect_target' : 'incorrect_type',
            expectedMatch,
          });
          falsePositives++;
        }
      } else {
        // False positive - detected something not expected
        detectedReferences.push({
          detected,
          status: 'false_positive',
        });
        falsePositives++;
      }
    }

    // Find false negatives (expected references not detected)
    const missedReferences = testCase.expectedReferences.filter((expected) => {
      return !matchResult.references.some(
        (detected) => this.findExpectedMatch(detected, [expected]) !== null
      );
    });

    const falseNegatives = missedReferences.length;

    // Calculate metrics
    const precision =
      truePositives + falsePositives > 0
        ? truePositives / (truePositives + falsePositives)
        : 0;
    const recall =
      truePositives + falseNegatives > 0
        ? truePositives / (truePositives + falseNegatives)
        : 0;
    const f1Score =
      precision + recall > 0
        ? (2 * (precision * recall)) / (precision + recall)
        : 0;

    return {
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
      f1Score,
      detectedReferences,
      missedReferences,
    };
  }

  /**
   * Test resolution accuracy for a single test case
   */
  private static async testResolutionAccuracy(
    testCase: AccuracyTestCase,
    mockGraph: Graph
  ): Promise<ResolutionAccuracyResult> {
    if (!testCase.expectedResolutions) {
      throw new Error('Test case does not include expected resolutions');
    }

    // Create a mock source node
    const mockSourceNode: GraphNode = {
      id: 'test-source',
      type: 'paragraph',
      label: 'Test Source',
      content: testCase.text,
      position: { page: 1, start: 0, end: testCase.text.length },
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Create resolution context
    const context: ResolutionContext = {
      graph: mockGraph,
      sourceNode: mockSourceNode,
    };

    // Detect references first
    const analysis = await ReferenceDetectionService.analyzeText(testCase.text);

    // Resolve references
    const resolutions = await ReferenceResolutionService.resolveReferences(
      analysis.references,
      context
    );

    // Match resolutions against expected results
    let resolvedCorrectly = 0;
    let resolvedIncorrectly = 0;
    let failedToResolve = 0;

    const resolutionDetails: Array<{
      referenceText: string;
      expectedTargetId?: string;
      actualTargetId?: string;
      confidence: number;
      correct: boolean;
    }> = [];

    for (const expected of testCase.expectedResolutions) {
      // Find the corresponding resolution
      const resolution = resolutions.find(
        (r) =>
          r.reference.text.includes(expected.referenceText) ||
          expected.referenceText.includes(r.reference.text)
      );

      if (!resolution) {
        // No resolution found for expected reference
        resolutionDetails.push({
          referenceText: expected.referenceText,
          expectedTargetId: expected.expectedTargetId,
          confidence: 0,
          correct: false,
        });
        if (expected.shouldResolve) {
          failedToResolve++;
        }
        continue;
      }

      const actualTargetId = resolution.targetNode?.id;
      const expectedTargetId = expected.expectedTargetId;
      const confidence = resolution.confidence;

      const correct =
        expected.shouldResolve === !!actualTargetId &&
        (!expected.shouldResolve || actualTargetId === expectedTargetId) &&
        (!expected.minConfidence || confidence >= expected.minConfidence);

      resolutionDetails.push({
        referenceText: expected.referenceText,
        expectedTargetId,
        actualTargetId,
        confidence,
        correct,
      });

      if (correct) {
        resolvedCorrectly++;
      } else {
        resolvedIncorrectly++;
      }
    }

    const totalExpected = testCase.expectedResolutions.length;
    const accuracy = totalExpected > 0 ? resolvedCorrectly / totalExpected : 0;
    const averageConfidence =
      resolutions.reduce((sum, r) => sum + r.confidence, 0) /
      resolutions.length;

    return {
      resolvedCorrectly,
      resolvedIncorrectly,
      failedToResolve,
      accuracy,
      averageConfidence,
      resolutionDetails,
    };
  }

  /**
   * Find expected reference that matches a detected reference
   */
  private static findExpectedMatch(
    detected: DetectedReference,
    expectedReferences: ExpectedReference[]
  ): ExpectedReference | null {
    // Look for exact text match first
    let match = expectedReferences.find(
      (expected) => expected.text === detected.text
    );

    if (!match) {
      // Look for partial text match (detected text contains expected text or vice versa)
      match = expectedReferences.find(
        (expected) =>
          detected.text.includes(expected.text) ||
          expected.text.includes(detected.text)
      );
    }

    if (!match) {
      // Look for target match
      match = expectedReferences.find((expected) =>
        this.targetsMatch(detected.target, expected.target)
      );
    }

    return match || null;
  }

  /**
   * Check if two targets match (with some flexibility)
   */
  private static targetsMatch(target1: string, target2: string): boolean {
    // Exact match
    if (target1 === target2) return true;

    // Normalize and compare
    const normalize = (s: string) => s.toLowerCase().trim();
    if (normalize(target1) === normalize(target2)) return true;

    // Number extraction for numeric targets
    const num1 = target1.match(/(\d+(?:\.\d+)*)/);
    const num2 = target2.match(/(\d+(?:\.\d+)*)/);
    if (num1 && num2 && num1[1] === num2[1]) return true;

    return false;
  }

  /**
   * Identify issues in test results
   */
  private static identifyTestIssues(
    detection: DetectionAccuracyResult,
    resolution?: ResolutionAccuracyResult
  ): string[] {
    const issues: string[] = [];

    // Detection issues
    if (detection.precision < 0.7) {
      issues.push(
        `Low detection precision: ${(detection.precision * 100).toFixed(1)}%`
      );
    }

    if (detection.recall < 0.7) {
      issues.push(
        `Low detection recall: ${(detection.recall * 100).toFixed(1)}%`
      );
    }

    if (detection.falsePositives > detection.truePositives) {
      issues.push('More false positives than true positives');
    }

    // Resolution issues
    if (resolution) {
      if (resolution.accuracy < 0.6) {
        issues.push(
          `Low resolution accuracy: ${(resolution.accuracy * 100).toFixed(1)}%`
        );
      }

      if (resolution.averageConfidence < 0.4) {
        issues.push(
          `Low average resolution confidence: ${(resolution.averageConfidence * 100).toFixed(1)}%`
        );
      }
    }

    return issues;
  }

  /**
   * Generate recommendations based on test results
   */
  private static generateTestRecommendations(
    results: AccuracyTestResult[],
    suite: AccuracyTestSuite
  ): string[] {
    const recommendations: string[] = [];

    // Analyze common failure patterns
    const lowPrecisionTests = results.filter(
      (r) => r.detectionResults.precision < 0.7
    );
    if (lowPrecisionTests.length > results.length * 0.5) {
      recommendations.push(
        'Improve reference pattern specificity to reduce false positives'
      );
    }

    const lowRecallTests = results.filter(
      (r) => r.detectionResults.recall < 0.7
    );
    if (lowRecallTests.length > results.length * 0.5) {
      recommendations.push(
        'Add more comprehensive reference patterns to improve detection coverage'
      );
    }

    const failedTests = results.filter(
      (r) => r.overallScore < suite.config.minOverallScore
    );
    if (failedTests.length > 0) {
      recommendations.push(
        `Focus on improving the ${failedTests.length} failing test cases`
      );
    }

    // Type-specific recommendations
    const typeErrors = this.analyzeTypeSpecificErrors(results);
    recommendations.push(...typeErrors);

    return recommendations;
  }

  /**
   * Analyze type-specific error patterns
   */
  private static analyzeTypeSpecificErrors(
    results: AccuracyTestResult[]
  ): string[] {
    const recommendations: string[] = [];
    const typeStats: Record<ReferenceType, { correct: number; total: number }> =
      {
        section: { correct: 0, total: 0 },
        figure: { correct: 0, total: 0 },
        table: { correct: 0, total: 0 },
        page: { correct: 0, total: 0 },
        citation: { correct: 0, total: 0 },
        cross_reference: { correct: 0, total: 0 },
      };

    // Collect statistics
    for (const result of results) {
      for (const detected of result.detectionResults.detectedReferences) {
        if (detected.status === 'correct' && detected.expectedMatch) {
          typeStats[detected.expectedMatch.type].correct++;
        }
        if (detected.expectedMatch) {
          typeStats[detected.expectedMatch.type].total++;
        }
      }
    }

    // Generate recommendations for poorly performing types
    for (const [type, stats] of Object.entries(typeStats)) {
      if (stats.total > 0) {
        const accuracy = stats.correct / stats.total;
        if (accuracy < 0.7) {
          recommendations.push(
            `Improve ${type} reference detection patterns (current accuracy: ${(accuracy * 100).toFixed(1)}%)`
          );
        }
      }
    }

    return recommendations;
  }

  /**
   * Create a standard test suite for reference detection
   */
  static createStandardTestSuite(): AccuracyTestSuite {
    return {
      id: 'reference-detection-standard',
      name: 'Standard Reference Detection Test Suite',
      config: {
        minOverallScore: 0.7,
        includeResolutionTests: false,
      },
      testCases: [
        {
          id: 'basic-section-references',
          name: 'Basic Section References',
          text: 'For more information, see section 3.2. The details are in section 5, and the methodology is described in section 1.4.',
          expectedReferences: [
            {
              text: 'section 3.2',
              type: 'section',
              target: '3.2',
              shouldDetect: true,
            },
            {
              text: 'section 5',
              type: 'section',
              target: '5',
              shouldDetect: true,
            },
            {
              text: 'section 1.4',
              type: 'section',
              target: '1.4',
              shouldDetect: true,
            },
          ],
          metadata: { difficulty: 'easy', tags: ['section', 'basic'] },
        },
        {
          id: 'figure-references',
          name: 'Figure References',
          text: 'As shown in Figure 1, the results indicate a clear trend. See Figure 2.3 for the detailed analysis. The diagram in fig. 4 illustrates this concept.',
          expectedReferences: [
            {
              text: 'Figure 1',
              type: 'figure',
              target: '1',
              shouldDetect: true,
            },
            {
              text: 'Figure 2.3',
              type: 'figure',
              target: '2.3',
              shouldDetect: true,
            },
            { text: 'fig. 4', type: 'figure', target: '4', shouldDetect: true },
          ],
          metadata: { difficulty: 'easy', tags: ['figure', 'basic'] },
        },
        {
          id: 'mixed-references',
          name: 'Mixed Reference Types',
          text: 'According to the methodology in section 2.1 and as shown in Figure 3, the data from Table 4 supports this conclusion. See page 15 for additional details.',
          expectedReferences: [
            {
              text: 'section 2.1',
              type: 'section',
              target: '2.1',
              shouldDetect: true,
            },
            {
              text: 'Figure 3',
              type: 'figure',
              target: '3',
              shouldDetect: true,
            },
            { text: 'Table 4', type: 'table', target: '4', shouldDetect: true },
            { text: 'page 15', type: 'page', target: '15', shouldDetect: true },
          ],
          metadata: { difficulty: 'medium', tags: ['mixed', 'comprehensive'] },
        },
        {
          id: 'cross-references',
          name: 'Cross References',
          text: 'The previous section discussed this topic. See below for the implementation details. As mentioned earlier, this approach is effective.',
          expectedReferences: [
            {
              text: 'previous section',
              type: 'cross_reference',
              target: 'previous section',
              shouldDetect: true,
            },
            {
              text: 'below',
              type: 'cross_reference',
              target: 'below',
              shouldDetect: true,
            },
            {
              text: 'earlier',
              type: 'cross_reference',
              target: 'earlier',
              shouldDetect: true,
            },
          ],
          metadata: {
            difficulty: 'medium',
            tags: ['cross-reference', 'spatial'],
          },
        },
        {
          id: 'citations',
          name: 'Academic Citations',
          text: 'Several studies have shown this effect [1, 2]. Smith et al. (2023) demonstrated similar results. The work by Johnson (2021) provides additional evidence.',
          expectedReferences: [
            {
              text: '[1, 2]',
              type: 'citation',
              target: '[1, 2]',
              shouldDetect: true,
            },
            {
              text: '(2023)',
              type: 'citation',
              target: '(2023)',
              shouldDetect: true,
            },
            {
              text: '(2021)',
              type: 'citation',
              target: '(2021)',
              shouldDetect: true,
            },
          ],
          metadata: { difficulty: 'hard', tags: ['citation', 'academic'] },
        },
      ],
    };
  }
}
