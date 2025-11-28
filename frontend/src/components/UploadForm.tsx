import React, { useCallback, useState } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { cn } from '../lib/utils';

interface UploadFormProps {
  onUploadSuccess?: (documentId: string) => void;
  className?: string;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  onUploadSuccess,
  className
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { uploadDocument, isUploading, uploadError } = useDocuments();

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a PDF, TXT, DOC, or DOCX file';
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 50MB';
    }

    return null;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) {
      setError('Please upload only one file at a time');
      return;
    }

    const file = files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;

    uploadDocument(
      { file: selectedFile },
      {
        onSuccess: (data) => {
          if (data.success && data.data) {
            onUploadSuccess?.(data.data.id);
            setSelectedFile(null);
            setError(null);
          }
        },
        onError: (error: any) => {
          setError(error.response?.data?.error || 'Upload failed');
        },
      }
    );
  }, [selectedFile, uploadDocument, onUploadSuccess]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <div className={cn('w-full max-w-2xl mx-auto', className)}>
      <div className="space-y-4">
        {/* Upload Area */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            isDragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400',
            isUploading && 'opacity-50 pointer-events-none'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 text-gray-400">
              <Upload className="w-full h-full" />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your document here, or{' '}
                <span className="text-blue-600 hover:text-blue-500 cursor-pointer">
                  browse
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Supports PDF, TXT, DOC, DOCX files up to 50MB
              </p>
            </div>
          </div>
        </div>

        {/* Selected File Preview */}
        {selectedFile && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              <File className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className={cn(
                  'px-4 py-2 rounded-md text-white font-medium transition-colors',
                  isUploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>

              <button
                onClick={clearFile}
                disabled={isUploading}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {(error || uploadError) && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              {error || (uploadError as any)?.message || 'An error occurred'}
            </p>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Uploading...</span>
              <span>Please wait</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
