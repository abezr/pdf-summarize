import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UploadForm } from './components/UploadForm';
import { ProgressTracker } from './components/ProgressTracker';
import { SummaryViewer } from './components/SummaryViewer';
import { DocumentList } from './components/DocumentList';
import { useWebSocket } from './hooks/useWebSocket';
import { useDocumentStore } from './stores/documentStore';
import { Document } from './types/api';
import { FileText, Upload, BarChart3 } from 'lucide-react';
import { cn } from './lib/utils';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type ViewMode = 'upload' | 'progress' | 'summary' | 'list';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const { currentDocument } = useDocumentStore();

  // Initialize WebSocket for current document
  useWebSocket(currentDocument?.id);

  const handleUploadSuccess = (documentId: string) => {
    // Find the document and set it as current
    const { documents, setCurrentDocument } = useDocumentStore.getState();
    const document = documents.find(d => d.id === documentId);
    if (document) {
      setCurrentDocument(document);
      setSelectedDocument(document);
      setViewMode('progress');
    }
  };

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
    const { setCurrentDocument } = useDocumentStore.getState();
    setCurrentDocument(document);

    if (document.status === 'completed' && document.summary) {
      setViewMode('summary');
    } else if (document.status === 'processing') {
      setViewMode('progress');
    } else {
      setViewMode('upload');
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'upload':
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                PDF Summary AI
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Transform your documents into intelligent summaries using advanced AI.
                Upload PDFs, extract insights, and get comprehensive analysis in minutes.
              </p>
            </div>
            <UploadForm onUploadSuccess={handleUploadSuccess} />
          </div>
        );

      case 'progress':
        return selectedDocument ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Document
              </h2>
              <p className="text-gray-600">
                {selectedDocument.originalName}
              </p>
            </div>
            <ProgressTracker documentId={selectedDocument.id} />
          </div>
        ) : null;

      case 'summary':
        return selectedDocument ? (
          <SummaryViewer document={selectedDocument} />
        ) : null;

      case 'list':
        return (
          <DocumentList
            onDocumentSelect={handleDocumentSelect}
            selectedDocumentId={selectedDocument?.id}
          />
        );

      default:
        return null;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  PDF Summary AI
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setViewMode('upload')}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'upload'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload</span>
                </button>

                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    viewMode === 'list'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span>Documents</span>
                </button>

                {selectedDocument && (
                  <>
                    {selectedDocument.status === 'processing' && (
                      <button
                        onClick={() => setViewMode('progress')}
                        className={cn(
                          'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          viewMode === 'progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        )}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Progress</span>
                      </button>
                    )}

                    {selectedDocument.status === 'completed' && selectedDocument.summary && (
                      <button
                        onClick={() => setViewMode('summary')}
                        className={cn(
                          'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          viewMode === 'summary'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        )}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Summary</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="text-center text-sm text-gray-500">
              <p>PDF Summary AI - Powered by Multi-LLM Architecture</p>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;
