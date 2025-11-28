import { useEffect, useCallback } from 'react';
import { useWebSocketStore } from '../stores/websocketStore';
import { config } from '../config/env';

export const useWebSocket = (documentId: string | null) => {
  const {
    connect,
    disconnect,
    isDocumentConnected,
    getConnection,
    handleProgress,
    handleSummaryComplete,
    handleError,
  } = useWebSocketStore();

  const connectToDocument = useCallback((docId: string) => {
    const wsUrl = `${config.wsUrl}/progress/${docId}`;
    connect(docId, wsUrl);
  }, [connect]);

  const disconnectFromDocument = useCallback((docId: string) => {
    disconnect(docId);
  }, [disconnect]);

  // Auto-connect when documentId changes
  useEffect(() => {
    if (documentId) {
      connectToDocument(documentId);
    }

    return () => {
      if (documentId) {
        disconnectFromDocument(documentId);
      }
    };
  }, [documentId, connectToDocument, disconnectFromDocument]);

  return {
    isConnected: documentId ? isDocumentConnected(documentId) : false,
    connection: documentId ? getConnection(documentId) : null,
    connect: connectToDocument,
    disconnect: disconnectFromDocument,
  };
};
