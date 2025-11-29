import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Document, ProcessingStage } from '../types/api';

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
  error: string | null;
  uploadProgress: Record<string, number>;
  processingStage: Record<string, ProcessingStage>;
}

interface DocumentActions {
  // Document management
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  setCurrentDocument: (document: Document | null) => void;

  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Progress tracking
  setUploadProgress: (documentId: string, progress: number) => void;
  setProcessingStage: (documentId: string, stage: ProcessingStage) => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  isLoading: false,
  error: null,
  uploadProgress: {},
  processingStage: {},
};

export const useDocumentStore = create<DocumentState & DocumentActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setDocuments: (documents) =>
        set({ documents }, false, 'setDocuments'),

      addDocument: (document) =>
        set((state) => ({
          documents: [document, ...state.documents],
        }), false, 'addDocument'),

      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === id ? { ...doc, ...updates } : doc
          ),
          currentDocument: state.currentDocument?.id === id
            ? { ...state.currentDocument, ...updates }
            : state.currentDocument,
        }), false, 'updateDocument'),

      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id),
          currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
        }), false, 'removeDocument'),

      setCurrentDocument: (document) =>
        set({ currentDocument: document }, false, 'setCurrentDocument'),

      setLoading: (isLoading) =>
        set({ isLoading }, false, 'setLoading'),

      setError: (error) =>
        set({ error, isLoading: false }, false, 'setError'),

      setUploadProgress: (documentId, progress) =>
        set((state) => ({
          uploadProgress: {
            ...state.uploadProgress,
            [documentId]: progress,
          },
        }), false, 'setUploadProgress'),

      setProcessingStage: (documentId, stage) =>
        set((state) => ({
          processingStage: {
            ...state.processingStage,
            [documentId]: stage,
          },
        }), false, 'setProcessingStage'),

      clearError: () =>
        set({ error: null }, false, 'clearError'),

      reset: () =>
        set(initialState, false, 'reset'),
    }),
    {
      name: 'document-store',
    }
  )
);
