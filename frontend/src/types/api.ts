// API Response Types
export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  summary?: SummaryData;
  evaluation?: EvaluationData;
}

export interface SummaryData {
  content: string;
  model: string;
  tokensUsed: number;
  cost: number;
  generatedAt: string;
  sections: SummarySection[];
}

export interface SummarySection {
  title: string;
  content: string;
  type: 'overview' | 'key-points' | 'conclusion' | 'analysis';
}

export interface EvaluationData {
  overallScore: number;
  metrics: {
    accuracy: number;
    completeness: number;
    coherence: number;
    relevance: number;
  };
  feedback: string;
  evaluatedAt: string;
}

// Processing Stages
export enum ProcessingStage {
  UPLOAD = 'UPLOAD',
  GRAPH_BUILD = 'GRAPH_BUILD',
  EMBEDDING = 'EMBEDDING',
  EXTRACTION = 'EXTRACTION',
  ANALYSIS = 'ANALYSIS',
  SUMMARIZATION = 'SUMMARIZATION',
  EVALUATION = 'EVALUATION',
  COMPLETE = 'COMPLETE'
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'progress' | 'summary_complete' | 'error';
}

export interface ProgressMessage extends WebSocketMessage {
  type: 'progress';
  documentId: string;
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  timestamp: string;
}

export interface SummaryCompleteMessage extends WebSocketMessage {
  type: 'summary_complete';
  documentId: string;
  summary: SummaryData;
  evaluation?: EvaluationData;
}

export interface ErrorMessage extends WebSocketMessage {
  type: 'error';
  documentId: string;
  error: string;
  timestamp: string;
}

// API Request Types
export interface UploadRequest {
  file: File;
}

export interface SummarizeRequest {
  documentId: string;
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
