import React, { useState } from 'react';
import { FileText, Download, Trash2, Eye, MoreVertical, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { Document } from '../types/api';
import { formatFileSize, formatDate, cn } from '../lib/utils';

interface DocumentListProps {
  onDocumentSelect?: (document: Document) => void;
  selectedDocumentId?: string;
  className?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  onDocumentSelect,
  selectedDocumentId,
  className
}) => {
  const {
    documents,
    isLoadingDocuments,
    deleteDocument,
    isDeleting
  } = useDocuments();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      setDeletingId(documentId);
      try {
        deleteDocument(documentId, {
          onSuccess: () => {
            setDeletingId(null);
          },
          onError: () => {
            setDeletingId(null);
          }
        });
      } catch (error) {
        setDeletingId(null);
      }
    }
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      case 'processing':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  if (isLoadingDocuments) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <Loader className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No documents uploaded yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a document to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Documents ({documents.length})
        </h3>
      </div>

      <div className="space-y-2">
        {documents.map((document) => (
          <div
            key={document.id}
            className={cn(
              'group relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md',
              selectedDocumentId === document.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300',
              deletingId === document.id && 'opacity-50 pointer-events-none'
            )}
            onClick={() => onDocumentSelect?.(document)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                {/* File Icon */}
                <div className="flex-shrink-0 mt-1">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>

                {/* Document Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {document.originalName}
                    </h4>
                    {getStatusIcon(document.status)}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                    <span>{formatFileSize(document.size)}</span>
                    <span>{formatDate(document.uploadedAt)}</span>
                  </div>

                  {/* Status Badge */}
                  <div className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    getStatusColor(document.status)
                  )}>
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                  </div>

                  {/* Summary Preview */}
                  {document.summary && (
                    <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {document.summary.sections[0]?.content.substring(0, 100)}...
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {document.status === 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement download functionality
                      console.log('Download document:', document.id);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => handleDelete(document.id, e)}
                  disabled={isDeleting}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  {deletingId === document.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>

                <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Processing Progress Bar */}
            {document.status === 'processing' && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full animate-pulse w-2/3"></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Processing document...</p>
              </div>
            )}

            {/* Evaluation Score */}
            {document.evaluation && (
              <div className="mt-3 flex items-center space-x-2">
                <div className="text-xs text-gray-500">Quality Score:</div>
                <div className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  document.evaluation.overallScore >= 0.8 ? 'bg-green-100 text-green-700' :
                  document.evaluation.overallScore >= 0.6 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {Math.round(document.evaluation.overallScore * 100)}%
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
