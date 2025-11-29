/**
 * WebSocket Types for Real-time Progress Updates
 * Defines message formats and processing stages for document progress tracking
 */

export type ProcessingStage =
  | 'UPLOADING'
  | 'PARSING'
  | 'IMAGE_EXTRACTION'
  | 'GRAPH_BUILD'
  | 'EMBEDDING'
  | 'SUMMARIZATION'
  | 'EVALUATION'
  | 'COMPLETE'
  | 'FAILED';

export interface ProgressMessage {
  type: 'progress';
  documentId: string;
  stage: ProcessingStage;
  progress: number; // 0-100
  message?: string;
  timestamp: string;
  metadata?: {
    currentStep?: string;
    totalSteps?: number;
    estimatedTimeRemaining?: number; // in seconds
  };
}

export interface SummaryCompleteMessage {
  type: 'summary_complete';
  documentId: string;
  summary: {
    content: string;
    type: string;
    model: string;
    provider: string;
    tokens_used: number;
    cost: number;
    processing_time: number;
    graph_stats: {
      nodes: number;
      edges: number;
      nodeTypes: Record<string, number>;
    };
  };
  evaluation?: {
    overall_score: number;
    passed: boolean;
    ragas_metrics: Record<string, any>;
    custom_metrics: Record<string, any>;
    recommendations: string[];
  };
  timestamp: string;
}

export interface ErrorMessage {
  type: 'error';
  documentId: string;
  error: {
    code: string;
    message: string;
    stage?: ProcessingStage;
  };
  timestamp: string;
}

export interface ConnectionMessage {
  type: 'connection_established';
  documentId: string;
  status: 'connected' | 'reconnecting';
  timestamp: string;
}

export type WebSocketMessage =
  | ProgressMessage
  | SummaryCompleteMessage
  | ErrorMessage
  | ConnectionMessage;

export interface WebSocketConnection {
  id: string;
  documentId: string;
  ws: any; // WebSocket instance
  connectedAt: Date;
  lastActivity: Date;
  userId?: string;
}

export interface ProgressTracker {
  documentId: string;
  stage: ProcessingStage;
  progress: number;
  startTime: Date;
  lastUpdate: Date;
  totalEstimatedTime?: number; // in seconds
  metadata?: Record<string, any>;
}

export interface WebSocketServiceConfig {
  port?: number;
  path?: string;
  maxConnections?: number;
  connectionTimeout?: number; // in milliseconds
  heartbeatInterval?: number; // in milliseconds
}
