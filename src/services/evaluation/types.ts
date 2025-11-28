// Evaluation service types and interfaces

export interface EvaluationInput {
  documentId: string;
  originalText: string;
  summary: string;
  graph: any; // DocumentGraph type
  metadata?: Record<string, any>;
}

export interface EvaluationResult {
  documentId: string;
  timestamp: Date;
  overallScore: number;
  ragasMetrics: RAGASMetrics;
  customMetrics: CustomMetrics;
  thresholds: QualityThresholds;
  passed: boolean;
  recommendations?: string[];
}

export interface RAGASMetrics {
  faithfulness: number;      // Does summary match source facts? (0-1)
  answerRelevancy: number;   // Is summary relevant to potential questions? (0-1)
  contextRecall: number;     // How much important info from source is covered? (0-1)
  contextPrecision: number;  // How much of summary is supported by source? (0-1)
}

export interface CustomMetrics {
  groundingScore: number;    // % of statements with traceable references (0-1)
  coverageScore: number;     // % of important nodes used in summary (0-1)
  graphUtilization: number;  // Fraction of graph edges traversed (0-1)
  tableAccuracy: number;     // Accuracy of table references (0-1)
  referenceAccuracy: number; // Accuracy of cross-references (0-1)
}

export interface QualityThresholds {
  overall: number;           // Minimum overall score (default: 0.7)
  faithfulness: number;      // Minimum faithfulness score (default: 0.8)
  grounding: number;         // Minimum grounding score (default: 0.8)
  coverage: number;          // Minimum coverage score (default: 0.6)
}

export interface EvaluationConfig {
  enabled: boolean;
  thresholds: QualityThresholds;
  ragas: {
    enabled: boolean;
    model?: string;          // LLM to use for RAGAS evaluation
  };
  custom: {
    enabled: boolean;
  };
  alerts: {
    enabled: boolean;
    webhookUrl?: string;
  };
}

export interface EvaluationAlert {
  documentId: string;
  issue: 'low_quality' | 'failed_evaluation' | 'threshold_violation';
  score: number;
  threshold: number;
  details: Record<string, any>;
  timestamp: Date;
}

// Default configuration
export const DEFAULT_EVALUATION_CONFIG: EvaluationConfig = {
  enabled: true,
  thresholds: {
    overall: 0.7,
    faithfulness: 0.8,
    grounding: 0.8,
    coverage: 0.6,
  },
  ragas: {
    enabled: true,
    model: 'auto', // Use quota manager to select
  },
  custom: {
    enabled: true,
  },
  alerts: {
    enabled: false,
  },
};
