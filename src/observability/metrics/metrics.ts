import { register, collectDefaultMetrics, Gauge, Counter, Histogram, Summary } from 'prom-client';

// Enable default metrics collection
collectDefaultMetrics();

// Application-specific metrics
export const metrics = {
  // Request metrics
  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  }),

  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 2.5, 5, 10],
  }),

  // PDF processing metrics
  pdfProcessingTotal: new Counter({
    name: 'pdf_processing_total',
    help: 'Total number of PDF processing operations',
    labelNames: ['operation', 'status'],
  }),

  pdfProcessingDuration: new Histogram({
    name: 'pdf_processing_duration_seconds',
    help: 'Duration of PDF processing operations',
    labelNames: ['operation'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
  }),

  pdfSizeBytes: new Histogram({
    name: 'pdf_size_bytes',
    help: 'Size of processed PDFs in bytes',
    labelNames: ['operation'],
    buckets: [1000000, 5000000, 10000000, 50000000, 100000000], // 1MB to 100MB
  }),

  // Graph building metrics
  graphNodesTotal: new Gauge({
    name: 'graph_nodes_total',
    help: 'Total number of nodes in knowledge graphs',
    labelNames: ['document_id'],
  }),

  graphEdgesTotal: new Gauge({
    name: 'graph_edges_total',
    help: 'Total number of edges in knowledge graphs',
    labelNames: ['document_id', 'edge_type'],
  }),

  graphBuildDuration: new Histogram({
    name: 'graph_build_duration_seconds',
    help: 'Duration of graph building operations',
    buckets: [0.5, 1, 2, 5, 10, 30],
  }),

  // LLM metrics
  llmRequestsTotal: new Counter({
    name: 'llm_requests_total',
    help: 'Total number of LLM API requests',
    labelNames: ['provider', 'model', 'operation'],
  }),

  llmTokensTotal: new Counter({
    name: 'llm_tokens_total',
    help: 'Total number of tokens used',
    labelNames: ['provider', 'model', 'type'], // type: input, output
  }),

  llmCostTotal: new Counter({
    name: 'llm_cost_total',
    help: 'Total cost of LLM API usage in USD',
    labelNames: ['provider', 'model'],
  }),

  llmRequestDuration: new Histogram({
    name: 'llm_request_duration_seconds',
    help: 'Duration of LLM API requests',
    labelNames: ['provider', 'model'],
    buckets: [1, 5, 10, 30, 60],
  }),

  // Cache metrics
  cacheHitsTotal: new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  }),

  cacheMissesTotal: new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  }),

  cacheSizeBytes: new Gauge({
    name: 'cache_size_bytes',
    help: 'Current size of cache in bytes',
    labelNames: ['cache_type'],
  }),

  // Database metrics
  dbConnectionsTotal: new Gauge({
    name: 'db_connections_total',
    help: 'Total number of database connections',
    labelNames: ['state'], // active, idle, waiting
  }),

  dbQueryDuration: new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries',
    labelNames: ['operation'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
  }),

  // Error metrics
  errorsTotal: new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'component'],
  }),

  // Business metrics
  documentsProcessedTotal: new Counter({
    name: 'documents_processed_total',
    help: 'Total number of documents processed',
  }),

  summariesGeneratedTotal: new Counter({
    name: 'summaries_generated_total',
    help: 'Total number of summaries generated',
  }),

  activeUsers: new Gauge({
    name: 'active_users',
    help: 'Number of currently active users',
  }),

  // Evaluation metrics
  evaluationScore: new Gauge({
    name: 'evaluation_score',
    help: 'Current evaluation score for summaries',
    labelNames: ['metric_type'], // faithfulness, relevancy, grounding, coverage
  }),

  // OCR metrics
  ocrRequestsTotal: new Counter({
    name: 'ocr_requests_total',
    help: 'Total number of OCR operations',
    labelNames: ['provider', 'status'],
  }),

  ocrProcessingDuration: new Histogram({
    name: 'ocr_processing_duration_seconds',
    help: 'Duration of OCR processing',
    labelNames: ['provider'],
    buckets: [1, 5, 10, 30, 60],
  }),

  // WebSocket metrics
  websocketConnectionsTotal: new Counter({
    name: 'websocket_connections_total',
    help: 'Total number of WebSocket connections',
    labelNames: ['status'], // connected, disconnected, error
  }),

  websocketConnectionsActive: new Gauge({
    name: 'websocket_connections_active',
    help: 'Number of currently active WebSocket connections',
  }),

  websocketMessagesTotal: new Counter({
    name: 'websocket_messages_total',
    help: 'Total number of WebSocket messages sent',
    labelNames: ['type', 'direction'], // type: progress, error, summary_complete; direction: sent, received
  }),

  websocketConnectionDuration: new Histogram({
    name: 'websocket_connection_duration_seconds',
    help: 'Duration of WebSocket connections',
    buckets: [10, 30, 60, 300, 600, 1800, 3600], // 10s to 1 hour
  }),

  progressUpdatesTotal: new Counter({
    name: 'progress_updates_total',
    help: 'Total number of progress updates sent',
    labelNames: ['stage', 'document_id'],
  }),

  progressUpdateDuration: new Histogram({
    name: 'progress_update_duration_seconds',
    help: 'Time between progress updates',
    labelNames: ['stage'],
    buckets: [0.1, 0.5, 1, 5, 10, 30],
  }),
};

// Helper functions for common metric operations
export const metricHelpers = {
  // HTTP metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    metrics.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    metrics.httpRequestDuration.observe({ method, route }, duration / 1000); // Convert to seconds
  },

  // PDF processing metrics
  recordPdfProcessing(operation: string, status: 'success' | 'error', duration: number, sizeBytes?: number) {
    metrics.pdfProcessingTotal.inc({ operation, status });
    metrics.pdfProcessingDuration.observe({ operation }, duration / 1000);

    if (sizeBytes) {
      metrics.pdfSizeBytes.observe({ operation }, sizeBytes);
    }
  },

  // Graph metrics
  recordGraphBuild(documentId: string, nodeCount: number, edgeCounts: Record<string, number>, duration: number) {
    metrics.graphNodesTotal.set({ document_id: documentId }, nodeCount);
    metrics.graphBuildDuration.observe({}, duration / 1000);

    Object.entries(edgeCounts).forEach(([edgeType, count]) => {
      metrics.graphEdgesTotal.set({ document_id: documentId, edge_type: edgeType }, count);
    });
  },

  // LLM metrics
  recordLlmRequest(provider: string, model: string, operation: string, tokens: { input: number; output: number }, cost: number, duration: number) {
    metrics.llmRequestsTotal.inc({ provider, model, operation });
    metrics.llmTokensTotal.inc({ provider, model, type: 'input' }, tokens.input);
    metrics.llmTokensTotal.inc({ provider, model, type: 'output' }, tokens.output);
    metrics.llmCostTotal.inc({ provider, model }, cost);
    metrics.llmRequestDuration.observe({ provider, model }, duration / 1000);
  },

  // Cache metrics
  recordCacheHit(cacheType: string) {
    metrics.cacheHitsTotal.inc({ cache_type: cacheType });
  },

  recordCacheMiss(cacheType: string) {
    metrics.cacheMissesTotal.inc({ cache_type: cacheType });
  },

  setCacheSize(cacheType: string, sizeBytes: number) {
    metrics.cacheSizeBytes.set({ cache_type: cacheType }, sizeBytes);
  },

  // Error metrics
  recordError(type: string, component: string) {
    metrics.errorsTotal.inc({ type, component });
  },

  // Business metrics
  recordDocumentProcessed() {
    metrics.documentsProcessedTotal.inc();
  },

  recordSummaryGenerated() {
    metrics.summariesGeneratedTotal.inc();
  },

  setEvaluationScore(metricType: string, score: number) {
    metrics.evaluationScore.set({ metric_type: metricType }, score);
  },

  // OCR metrics
  recordOcrRequest(provider: string, status: 'success' | 'error', duration: number) {
    metrics.ocrRequestsTotal.inc({ provider, status });
    metrics.ocrProcessingDuration.observe({ provider }, duration / 1000);
  },

  // WebSocket metrics
  recordWebSocketConnection(status: 'connected' | 'disconnected' | 'error') {
    metrics.websocketConnectionsTotal.inc({ status });
    if (status === 'connected') {
      metrics.websocketConnectionsActive.inc();
    } else if (status === 'disconnected') {
      metrics.websocketConnectionsActive.dec();
    }
  },

  recordWebSocketMessage(type: string, direction: 'sent' | 'received') {
    metrics.websocketMessagesTotal.inc({ type, direction });
  },

  recordWebSocketConnectionDuration(durationSeconds: number) {
    metrics.websocketConnectionDuration.observe({}, durationSeconds);
  },

  recordProgressUpdate(stage: string, documentId: string, timeSinceLastUpdate?: number) {
    metrics.progressUpdatesTotal.inc({ stage, document_id: documentId });
    if (timeSinceLastUpdate !== undefined) {
      metrics.progressUpdateDuration.observe({ stage }, timeSinceLastUpdate / 1000);
    }
  },
};

export { register };
