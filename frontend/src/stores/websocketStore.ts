import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ProgressMessage, SummaryCompleteMessage, ErrorMessage, ProcessingStage } from '../types/api';

interface WebSocketState {
  connections: Record<string, WebSocket>;
  isConnected: Record<string, boolean>;
  lastMessage: Record<string, any>;
  reconnectAttempts: Record<string, number>;
}

interface WebSocketActions {
  // Connection management
  connect: (documentId: string, url: string) => void;
  disconnect: (documentId: string) => void;
  setConnected: (documentId: string, connected: boolean) => void;

  // Message handling
  handleProgress: (message: ProgressMessage) => void;
  handleSummaryComplete: (message: SummaryCompleteMessage) => void;
  handleError: (message: ErrorMessage) => void;

  // Reconnection
  incrementReconnectAttempts: (documentId: string) => void;
  resetReconnectAttempts: (documentId: string) => void;

  // Utility
  getConnection: (documentId: string) => WebSocket | null;
  isDocumentConnected: (documentId: string) => boolean;
  cleanup: () => void;
}

const initialState: WebSocketState = {
  connections: {},
  isConnected: {},
  lastMessage: {},
  reconnectAttempts: {},
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

export const useWebSocketStore = create<WebSocketState & WebSocketActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      connect: (documentId, url) => {
        // Clean up existing connection
        get().disconnect(documentId);

        try {
          const ws = new WebSocket(url);

          ws.onopen = () => {
            console.log(`WebSocket connected for document ${documentId}`);
            set((state) => ({
              connections: { ...state.connections, [documentId]: ws },
              isConnected: { ...state.isConnected, [documentId]: true },
            }));
            get().resetReconnectAttempts(documentId);
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              set((state) => ({
                lastMessage: { ...state.lastMessage, [documentId]: message },
              }));

              // Handle different message types
              switch (message.type) {
                case 'progress':
                  get().handleProgress(message);
                  break;
                case 'summary_complete':
                  get().handleSummaryComplete(message);
                  break;
                case 'error':
                  get().handleError(message);
                  break;
                default:
                  console.warn('Unknown WebSocket message type:', message.type);
              }
            } catch (error) {
              console.error('Failed to parse WebSocket message:', error);
            }
          };

          ws.onclose = (event) => {
            console.log(`WebSocket closed for document ${documentId}`, event.code, event.reason);
            set((state) => ({
              isConnected: { ...state.isConnected, [documentId]: false },
            }));

            // Attempt reconnection if not a clean close
            if (event.code !== 1000 && get().reconnectAttempts[documentId] < MAX_RECONNECT_ATTEMPTS) {
              setTimeout(() => {
                get().incrementReconnectAttempts(documentId);
                get().connect(documentId, url);
              }, RECONNECT_DELAY);
            }
          };

          ws.onerror = (error) => {
            console.error(`WebSocket error for document ${documentId}:`, error);
          };

        } catch (error) {
          console.error(`Failed to create WebSocket connection for document ${documentId}:`, error);
        }
      },

      disconnect: (documentId) => {
        const connection = get().connections[documentId];
        if (connection) {
          connection.close(1000, 'Client disconnect');
          set((state) => {
            const newConnections = { ...state.connections };
            const newIsConnected = { ...state.isConnected };
            delete newConnections[documentId];
            delete newIsConnected[documentId];
            return {
              connections: newConnections,
              isConnected: newIsConnected,
            };
          });
        }
      },

      setConnected: (documentId, connected) =>
        set((state) => ({
          isConnected: { ...state.isConnected, [documentId]: connected },
        }), false, 'setConnected'),

      handleProgress: (message) => {
        // Update document store with progress
        const { updateDocument, setProcessingStage } = useDocumentStore.getState();
        updateDocument(message.documentId, { status: 'processing' });
        setProcessingStage(message.documentId, message.stage);
      },

      handleSummaryComplete: (message) => {
        // Update document store with summary
        const { updateDocument } = useDocumentStore.getState();
        updateDocument(message.documentId, {
          status: 'completed',
          summary: message.summary,
          evaluation: message.evaluation,
        });
      },

      handleError: (message) => {
        // Update document store with error
        const { updateDocument, setError } = useDocumentStore.getState();
        updateDocument(message.documentId, { status: 'failed' });
        setError(`Processing failed: ${message.error}`);
      },

      incrementReconnectAttempts: (documentId) =>
        set((state) => ({
          reconnectAttempts: {
            ...state.reconnectAttempts,
            [documentId]: (state.reconnectAttempts[documentId] || 0) + 1,
          },
        }), false, 'incrementReconnectAttempts'),

      resetReconnectAttempts: (documentId) =>
        set((state) => ({
          reconnectAttempts: {
            ...state.reconnectAttempts,
            [documentId]: 0,
          },
        }), false, 'resetReconnectAttempts'),

      getConnection: (documentId) => get().connections[documentId] || null,

      isDocumentConnected: (documentId) => get().isConnected[documentId] || false,

      cleanup: () => {
        Object.keys(get().connections).forEach((documentId) => {
          get().disconnect(documentId);
        });
        set(initialState, false, 'cleanup');
      },
    }),
    {
      name: 'websocket-store',
    }
  )
);
