import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDocumentStore } from '../stores/documentStore';
import { ProcessingStage } from '../types/api';
import { getProcessingStageLabel, cn } from '../lib/utils';

interface ProgressTrackerProps {
  documentId: string;
  className?: string;
}

const STAGE_ORDER: ProcessingStage[] = [
  ProcessingStage.UPLOAD,
  ProcessingStage.GRAPH_BUILD,
  ProcessingStage.EMBEDDING,
  ProcessingStage.EXTRACTION,
  ProcessingStage.ANALYSIS,
  ProcessingStage.SUMMARIZATION,
  ProcessingStage.EVALUATION,
  ProcessingStage.COMPLETE,
];

const STAGE_ESTIMATES: Record<ProcessingStage, number> = {
  [ProcessingStage.UPLOAD]: 10,
  [ProcessingStage.GRAPH_BUILD]: 20,
  [ProcessingStage.EMBEDDING]: 15,
  [ProcessingStage.EXTRACTION]: 15,
  [ProcessingStage.ANALYSIS]: 20,
  [ProcessingStage.SUMMARIZATION]: 15,
  [ProcessingStage.EVALUATION]: 5,
  [ProcessingStage.COMPLETE]: 0,
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  documentId,
  className
}) => {
  const { isConnected } = useWebSocket(documentId);
  const { processingStage, documents } = useDocumentStore();

  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<ProcessingStage>(ProcessingStage.UPLOAD);

  const document = documents.find(d => d.id === documentId);
  const currentProcessingStage = processingStage[documentId] || ProcessingStage.UPLOAD;

  useEffect(() => {
    setCurrentStage(currentProcessingStage);
  }, [currentProcessingStage]);

  useEffect(() => {
    // Calculate overall progress based on current stage
    const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
    const baseProgress = STAGE_ORDER
      .slice(0, currentStageIndex)
      .reduce((sum, stage) => sum + STAGE_ESTIMATES[stage], 0);

    // Add some progress within current stage
    const stageProgress = currentProgress || 0;
    const totalProgress = Math.min(baseProgress + stageProgress, 100);

    setCurrentProgress(totalProgress);
  }, [currentStage, currentProgress]);

  const getStageIcon = (stage: ProcessingStage, index: number) => {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const stageIndex = STAGE_ORDER.indexOf(stage);

    if (stageIndex < currentIndex) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (stageIndex === currentIndex) {
      if (document?.status === 'completed') {
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      } else if (document?.status === 'failed') {
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      } else {
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      }
    } else {
      return <Clock className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStageStatus = (stage: ProcessingStage) => {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    const stageIndex = STAGE_ORDER.indexOf(stage);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) {
      if (document?.status === 'completed') return 'completed';
      if (document?.status === 'failed') return 'failed';
      return 'active';
    }
    return 'pending';
  };

  if (!document) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <p className="text-gray-500">Document not found</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Processing Document
          </h3>
          <div className="flex items-center space-x-2">
            {!isConnected && (
              <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                Offline
              </span>
            )}
            <span className="text-sm font-medium text-gray-600">
              {Math.round(currentProgress)}%
            </span>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={cn(
              'h-3 rounded-full transition-all duration-300 ease-out',
              document.status === 'completed'
                ? 'bg-green-500'
                : document.status === 'failed'
                ? 'bg-red-500'
                : 'bg-blue-500'
            )}
            style={{ width: `${currentProgress}%` }}
          />
        </div>

        <p className="text-sm text-gray-600">
          {getProcessingStageLabel(currentStage)}
          {document.status === 'failed' && ' - Failed'}
          {document.status === 'completed' && ' - Complete'}
        </p>
      </div>

      {/* Stage Details */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Processing Stages</h4>

        <div className="space-y-2">
          {STAGE_ORDER.map((stage, index) => {
            const status = getStageStatus(stage);
            const isLastStage = index === STAGE_ORDER.length - 1;

            return (
              <div
                key={stage}
                className={cn(
                  'flex items-center space-x-3 p-3 rounded-lg transition-colors',
                  status === 'completed' && 'bg-green-50 border border-green-200',
                  status === 'active' && 'bg-blue-50 border border-blue-200',
                  status === 'failed' && 'bg-red-50 border border-red-200',
                  status === 'pending' && 'bg-gray-50 border border-gray-200',
                  !isLastStage && 'relative'
                )}
              >
                {/* Connector line (except for last item) */}
                {!isLastStage && (
                  <div
                    className={cn(
                      'absolute left-6 top-12 w-0.5 h-6',
                      status === 'completed' ? 'bg-green-300' : 'bg-gray-200'
                    )}
                  />
                )}

                {/* Stage icon */}
                <div className="flex-shrink-0">
                  {getStageIcon(stage, index)}
                </div>

                {/* Stage info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium',
                    status === 'completed' && 'text-green-800',
                    status === 'active' && 'text-blue-800',
                    status === 'failed' && 'text-red-800',
                    status === 'pending' && 'text-gray-600'
                  )}>
                    {getProcessingStageLabel(stage)}
                  </p>

                  {status === 'active' && (
                    <p className="text-sm text-blue-600 mt-1">
                      In progress...
                    </p>
                  )}

                  {status === 'failed' && (
                    <p className="text-sm text-red-600 mt-1">
                      Failed to complete
                    </p>
                  )}
                </div>

                {/* Stage progress */}
                <div className="flex-shrink-0 text-right">
                  <span className="text-xs text-gray-500">
                    {STAGE_ESTIMATES[stage]}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Messages */}
      {document.status === 'completed' && (
        <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-sm text-green-800">
            Document processing completed successfully!
          </p>
        </div>
      )}

      {document.status === 'failed' && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-800">
            Document processing failed. Please try again.
          </p>
        </div>
      )}
    </div>
  );
};
