import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useDocumentStore } from '../stores/documentStore';
import { Document, ApiResponse, PaginatedResponse, UploadRequest, SummarizeRequest } from '../types/api';
import { config } from '../config/env';

const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth if needed
api.interceptors.request.use((config) => {
  // Add auth headers here if needed
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { setError } = useDocumentStore.getState();
    if (error.response?.data?.error) {
      setError(error.response.data.error);
    } else {
      setError('An unexpected error occurred');
    }
    return Promise.reject(error);
  }
);

export const useDocuments = () => {
  const queryClient = useQueryClient();
  const { setDocuments, addDocument, updateDocument, setLoading, setError } = useDocumentStore();

  // Fetch all documents
  const {
    data: documentsData,
    isLoading: isLoadingDocuments,
    error: documentsError,
  } = useQuery({
    queryKey: ['documents'],
    queryFn: async (): Promise<PaginatedResponse<Document>> => {
      const response = await api.get('/documents');
      return response.data;
    },
    onSuccess: (data) => {
      setDocuments(data.items);
    },
  });

  // Upload document
  const uploadMutation = useMutation({
    mutationFn: async ({ file }: UploadRequest): Promise<ApiResponse<Document>> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          // Progress is handled by WebSocket for processing, but we could track upload progress here
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        addDocument(data.data);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      }
    },
  });

  // Generate summary
  const summarizeMutation = useMutation({
    mutationFn: async ({ documentId, options }: SummarizeRequest): Promise<ApiResponse<Document>> => {
      const response = await api.post(`/documents/${documentId}/summarize`, { options });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        updateDocument(data.data.id, data.data);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
      }
    },
  });

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string): Promise<ApiResponse<void>> => {
      const response = await api.delete(`/documents/${documentId}`);
      return response.data;
    },
    onSuccess: (_, documentId) => {
      // Remove from local state
      const { removeDocument } = useDocumentStore.getState();
      removeDocument(documentId);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  // Get single document
  const useDocument = (documentId: string) => {
    return useQuery({
      queryKey: ['document', documentId],
      queryFn: async (): Promise<Document> => {
        const response = await api.get(`/documents/${documentId}`);
        return response.data.data;
      },
      enabled: !!documentId,
    });
  };

  return {
    // Data
    documents: documentsData?.items || [],
    totalDocuments: documentsData?.total || 0,

    // Loading states
    isLoadingDocuments,
    isUploading: uploadMutation.isPending,
    isSummarizing: summarizeMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Errors
    documentsError,
    uploadError: uploadMutation.error,
    summarizeError: summarizeMutation.error,
    deleteError: deleteMutation.error,

    // Actions
    uploadDocument: uploadMutation.mutate,
    summarizeDocument: summarizeMutation.mutate,
    deleteDocument: deleteMutation.mutate,

    // Hooks
    useDocument,

    // Utilities
    clearError: () => setError(null),
  };
};
