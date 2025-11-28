/**
 * WebSocket Service
 * Manages real-time progress updates for document processing and summarization
 */

import { WebSocketServer, WebSocket as WS } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { metricHelpers } from '../observability/metrics/metrics';
import {
  WebSocketMessage,
  WebSocketConnection,
  ProgressTracker,
  WebSocketServiceConfig,
  ProcessingStage,
  ProgressMessage,
  SummaryCompleteMessage,
  ErrorMessage,
  ConnectionMessage,
} from './websocket.types';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private progressTrackers: Map<string, ProgressTracker> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<WebSocketServiceConfig>;

  constructor(config: WebSocketServiceConfig = {}) {
    this.config = {
      port: config.port || 8080,
      path: config.path || '/ws',
      maxConnections: config.maxConnections || 1000,
      connectionTimeout: config.connectionTimeout || 30000, // 30 seconds
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
    };
  }

  /**
   * Initialize WebSocket server
   */
  public initialize(server: any): void {
    try {
      this.wss = new WebSocketServer({
        server,
        path: this.config.path,
        maxPayload: 1024 * 1024, // 1MB max payload
      });

      this.wss.on('connection', this.handleConnection.bind(this));
      this.wss.on('error', this.handleServerError.bind(this));

      // Start heartbeat to keep connections alive
      this.startHeartbeat();

      // Clean up stale connections periodically
      setInterval(() => this.cleanupStaleConnections(), 60000); // Every minute

      logger.info('WebSocket server initialized', {
        path: this.config.path,
        maxConnections: this.config.maxConnections,
      });
    } catch (error: any) {
      logger.error('Failed to initialize WebSocket server', {
        error: error.message,
      });
      throw new AppError('WebSocket server initialization failed', 500);
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WS, request: IncomingMessage): void {
    try {
      const url = new URL(request.url || '', 'http://localhost');
      const documentId = url.pathname.split('/').pop();

      if (!documentId) {
        logger.warn('WebSocket connection rejected: missing document ID');
        ws.close(1008, 'Missing document ID');
        return;
      }

      // Check connection limits
      if (this.connections.size >= this.config.maxConnections) {
        logger.warn('WebSocket connection rejected: max connections reached', {
          currentConnections: this.connections.size,
          maxConnections: this.config.maxConnections,
        });
        ws.close(1013, 'Server is at capacity');
        return;
      }

      const connectionId = uuidv4();
      const userId = this.extractUserId(request);

      const connection: WebSocketConnection = {
        id: connectionId,
        documentId,
        ws,
        connectedAt: new Date(),
        lastActivity: new Date(),
        userId,
      };

      this.connections.set(connectionId, connection);

      // Record connection metric
      metricHelpers.recordWebSocketConnection('connected');

      logger.info('WebSocket connection established', {
        connectionId,
        documentId,
        userId,
        totalConnections: this.connections.size,
      });

      // Send connection confirmation
      const connectionMessage: ConnectionMessage = {
        type: 'connection_established',
        documentId,
        status: 'connected',
        timestamp: new Date().toISOString(),
      };

      this.sendToConnection(connection, connectionMessage);
      metricHelpers.recordWebSocketMessage('connection_established', 'sent');

      // Set up connection event handlers
      ws.on('message', (data) => this.handleMessage(connection, data));
      ws.on('close', () => this.handleDisconnection(connection));
      ws.on('error', (error) => this.handleConnectionError(connection, error));
      ws.on('pong', () => {
        connection.lastActivity = new Date();
      });

      // Set connection timeout
      setTimeout(() => {
        if (this.connections.has(connectionId) && !this.isConnectionActive(connection)) {
          logger.warn('WebSocket connection timed out', { connectionId, documentId });
          ws.close(1000, 'Connection timeout');
        }
      }, this.config.connectionTimeout);

    } catch (error: any) {
      logger.error('Error handling WebSocket connection', {
        error: error.message,
      });
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Send progress update to all connections for a document
   */
  public sendProgressUpdate(
    documentId: string,
    stage: ProcessingStage,
    progress: number,
    message?: string,
    metadata?: Record<string, any>
  ): void {
    const progressMessage: ProgressMessage = {
      type: 'progress',
      documentId,
      stage,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // Update progress tracker
    const existingTracker = this.progressTrackers.get(documentId);
    const timeSinceLastUpdate = existingTracker ?
      Date.now() - existingTracker.lastUpdate.getTime() : undefined;

    this.updateProgressTracker(documentId, stage, progress, metadata);

    // Record progress update metric
    metricHelpers.recordProgressUpdate(stage, documentId, timeSinceLastUpdate);

    // Send to all connections for this document
    this.broadcastToDocument(documentId, progressMessage);
    metricHelpers.recordWebSocketMessage('progress', 'sent');

    logger.debug('Progress update sent', {
      documentId,
      stage,
      progress,
      connections: this.getDocumentConnectionCount(documentId),
    });
  }

  /**
   * Send summary completion message
   */
  public sendSummaryComplete(documentId: string, summaryData: any, evaluationData?: any): void {
    const message: SummaryCompleteMessage = {
      type: 'summary_complete',
      documentId,
      summary: summaryData,
      evaluation: evaluationData,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToDocument(documentId, message);
    metricHelpers.recordWebSocketMessage('summary_complete', 'sent');

    // Clean up progress tracker
    this.progressTrackers.delete(documentId);

    logger.info('Summary completion sent', {
      documentId,
      connections: this.getDocumentConnectionCount(documentId),
    });
  }

  /**
   * Send error message to document connections
   */
  public sendError(documentId: string, error: { code: string; message: string }, stage?: ProcessingStage): void {
    const errorMessage: ErrorMessage = {
      type: 'error',
      documentId,
      error: {
        code: error.code,
        message: error.message,
        stage,
      },
      timestamp: new Date().toISOString(),
    };

    this.broadcastToDocument(documentId, errorMessage);
    metricHelpers.recordWebSocketMessage('error', 'sent');

    // Clean up progress tracker
    this.progressTrackers.delete(documentId);

    logger.error('Error message sent', {
      documentId,
      errorCode: error.code,
      stage,
      connections: this.getDocumentConnectionCount(documentId),
    });
  }

  /**
   * Get progress tracker for a document
   */
  public getProgressTracker(documentId: string): ProgressTracker | undefined {
    return this.progressTrackers.get(documentId);
  }

  /**
   * Get connection count for a document
   */
  public getDocumentConnectionCount(documentId: string): number {
    return Array.from(this.connections.values())
      .filter(conn => conn.documentId === documentId)
      .length;
  }

  /**
   * Get total connection count
   */
  public getTotalConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Shutdown WebSocket server
   */
  public shutdown(): void {
    logger.info('Shutting down WebSocket service');

    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.wss) {
        this.wss.close((error) => {
          if (error) {
            logger.error('Error closing WebSocket server', { error: error.message });
          }
        });
        this.wss = null;
      }

      // Close all connections gracefully
      const closePromises: Promise<void>[] = [];
      for (const connection of Array.from(this.connections.values())) {
        if (connection.ws.readyState === WebSocket.OPEN) {
          closePromises.push(new Promise((resolve) => {
            connection.ws.close(1000, 'Server shutdown');
            connection.ws.on('close', () => resolve());
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
          }));
        }
      }

      // Wait for connections to close (with timeout)
      if (closePromises.length > 0) {
        Promise.allSettled(closePromises).then(() => {
          logger.info('All WebSocket connections closed');
        }).catch((error) => {
          logger.error('Error waiting for connections to close', { error: error.message });
        });
      }

      this.connections.clear();
      this.progressTrackers.clear();

      logger.info('WebSocket service shut down successfully');
    } catch (error: any) {
      logger.error('Error during WebSocket service shutdown', {
        error: error.message,
      });
      // Force cleanup even if there are errors
      this.connections.clear();
      this.progressTrackers.clear();
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(connection: WebSocketConnection, data: any): void {
    try {
      connection.lastActivity = new Date();

      // Parse message (if needed for future extensions)
      const message = data.toString();

      // Record received message metric
      metricHelpers.recordWebSocketMessage('received', 'received');

      logger.debug('WebSocket message received', {
        connectionId: connection.id,
        documentId: connection.documentId,
        messageLength: message.length,
      });

      // Validate message format (basic validation)
      if (message.length > 1024 * 1024) { // 1MB limit
        logger.warn('WebSocket message too large, ignoring', {
          connectionId: connection.id,
          messageLength: message.length,
        });
        return;
      }

    } catch (error: any) {
      logger.error('Error handling WebSocket message', {
        connectionId: connection.id,
        error: error.message,
      });

      // Close connection on persistent errors
      try {
        connection.ws.close(1003, 'Message processing error');
      } catch (closeError: any) {
        logger.error('Error closing connection after message error', {
          connectionId: connection.id,
          error: closeError.message,
        });
      }
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  private handleDisconnection(connection: WebSocketConnection): void {
    const durationSeconds = (Date.now() - connection.connectedAt.getTime()) / 1000;

    // Record disconnection metrics
    metricHelpers.recordWebSocketConnection('disconnected');
    metricHelpers.recordWebSocketConnectionDuration(durationSeconds);

    logger.info('WebSocket connection closed', {
      connectionId: connection.id,
      documentId: connection.documentId,
      duration: durationSeconds,
    });

    this.connections.delete(connection.id);
  }

  /**
   * Handle WebSocket connection error
   */
  private handleConnectionError(connection: WebSocketConnection, error: Error): void {
    // Record error metric
    metricHelpers.recordWebSocketConnection('error');

    logger.error('WebSocket connection error', {
      connectionId: connection.id,
      documentId: connection.documentId,
      error: error.message,
    });

    this.connections.delete(connection.id);
  }

  /**
   * Handle WebSocket server error
   */
  private handleServerError(error: Error): void {
    logger.error('WebSocket server error', {
      error: error.message,
    });
  }

  /**
   * Extract user ID from request headers
   */
  private extractUserId(request: IncomingMessage): string | undefined {
    return request.headers['x-user-id'] as string ||
           request.headers['user-id'] as string;
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connection: WebSocketConnection, message: WebSocketMessage): void {
    if (connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
        connection.lastActivity = new Date();
      } catch (error: any) {
        logger.error('Failed to send message to connection', {
          connectionId: connection.id,
          error: error.message,
        });
        this.connections.delete(connection.id);
      }
    }
  }

  /**
   * Broadcast message to all connections for a document
   */
  private broadcastToDocument(documentId: string, message: WebSocketMessage): void {
    const connections = Array.from(this.connections.values())
      .filter(conn => conn.documentId === documentId);

    let sentCount = 0;
    let errorCount = 0;

    for (const connection of connections) {
      try {
        this.sendToConnection(connection, message);
        sentCount++;
      } catch (error: any) {
        logger.error('Failed to broadcast to connection', {
          connectionId: connection.id,
          documentId,
          error: error.message,
        });
        errorCount++;

        // Clean up failed connection
        this.connections.delete(connection.id);
        metricHelpers.recordWebSocketConnection('error');
      }
    }

    if (sentCount === 0) {
      logger.debug('No active connections for document', { documentId });
    }

    if (errorCount > 0) {
      logger.warn('Broadcast completed with errors', {
        documentId,
        sentCount,
        errorCount,
      });
    }
  }

  /**
   * Update progress tracker
   */
  private updateProgressTracker(
    documentId: string,
    stage: ProcessingStage,
    progress: number,
    metadata?: Record<string, any>
  ): void {
    const existing = this.progressTrackers.get(documentId);

    if (existing) {
      existing.stage = stage;
      existing.progress = progress;
      existing.lastUpdate = new Date();
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
    } else {
      this.progressTrackers.set(documentId, {
        documentId,
        stage,
        progress,
        startTime: new Date(),
        lastUpdate: new Date(),
        metadata,
      });
    }
  }

  /**
   * Check if connection is active
   */
  private isConnectionActive(connection: WebSocketConnection): boolean {
    return connection.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const connection of Array.from(this.connections.values())) {
        if (this.isConnectionActive(connection)) {
          try {
            connection.ws.ping();
          } catch (error: any) {
            logger.error('Failed to ping connection', {
              connectionId: connection.id,
              error: error.message,
            });
          }
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const timeoutMs = this.config.connectionTimeout;
    let cleanedCount = 0;
    let errorCount = 0;

    for (const [connectionId, connection] of Array.from(this.connections.entries())) {
      try {
        // Check if connection is stale
        if (now - connection.lastActivity.getTime() > timeoutMs) {
          logger.warn('Cleaning up stale connection', {
            connectionId,
            documentId: connection.documentId,
            lastActivity: connection.lastActivity,
            age: Math.round((now - connection.lastActivity.getTime()) / 1000),
          });

          // Check if WebSocket is still open before closing
          if (connection.ws.readyState === WebSocket.OPEN) {
            try {
              connection.ws.close(1000, 'Connection timeout');
            } catch (closeError: any) {
              logger.error('Error closing stale connection', {
                connectionId,
                error: closeError.message,
              });
              errorCount++;
            }
          }

          this.connections.delete(connectionId);
          metricHelpers.recordWebSocketConnection('disconnected');
          cleanedCount++;
        }
        // Also check for connections that appear closed but weren't cleaned up
        else if (connection.ws.readyState === WebSocket.CLOSED ||
                 connection.ws.readyState === WebSocket.CLOSING) {
          logger.warn('Cleaning up closed connection', {
            connectionId,
            documentId: connection.documentId,
            readyState: connection.ws.readyState,
          });

          this.connections.delete(connectionId);
          metricHelpers.recordWebSocketConnection('disconnected');
          cleanedCount++;
        }
      } catch (error: any) {
        logger.error('Error during connection cleanup', {
          connectionId,
          error: error.message,
        });
        errorCount++;

        // Force removal of problematic connection
        this.connections.delete(connectionId);
        metricHelpers.recordWebSocketConnection('error');
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up connections', { cleanedCount, errorCount });
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
