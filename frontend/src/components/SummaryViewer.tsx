import React, { useState } from 'react';
import { FileText, Star, Clock, DollarSign, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Document, SummaryData, EvaluationData } from '../types/api';
import { formatDate, cn } from '../lib/utils';

interface SummaryViewerProps {
  document: Document;
  className?: string;
}

export const SummaryViewer: React.FC<SummaryViewerProps> = ({
  document,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const summary = document.summary;
  const evaluation = document.evaluation;

  if (!summary) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No summary available yet</p>
        <p className="text-sm text-gray-400 mt-1">
          The document is still being processed
        </p>
      </div>
    );
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const renderMetricBar = (label: string, value: number, color: string) => (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{Math.round(value * 100)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-500', color)}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100';
    if (score >= 0.6) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Document Summary
            </h2>
            <p className="text-gray-600">
              Generated on {formatDate(summary.generatedAt)}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{summary.tokensUsed.toLocaleString()} tokens</span>
            </div>
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4" />
              <span>${summary.cost.toFixed(4)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-medium text-gray-700">{summary.model}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Metrics */}
      {evaluation && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quality Evaluation</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Score</span>
                <div className={cn(
                  'flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium',
                  getScoreBgColor(evaluation.overallScore)
                )}>
                  <Star className={cn('w-4 h-4', getScoreColor(evaluation.overallScore))} />
                  <span className={getScoreColor(evaluation.overallScore)}>
                    {Math.round(evaluation.overallScore * 100)}%
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600">{evaluation.feedback}</p>
            </div>

            {/* Individual Metrics */}
            <div className="space-y-3">
              {renderMetricBar('Accuracy', evaluation.metrics.accuracy, 'bg-green-500')}
              {renderMetricBar('Completeness', evaluation.metrics.completeness, 'bg-blue-500')}
              {renderMetricBar('Coherence', evaluation.metrics.coherence, 'bg-purple-500')}
              {renderMetricBar('Relevance', evaluation.metrics.relevance, 'bg-orange-500')}
            </div>
          </div>
        </div>
      )}

      {/* Summary Content */}
      <div className="space-y-4">
        {summary.sections.map((section, index) => (
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(section.title.toLowerCase().replace(/\s+/g, '-'))}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h4 className="text-lg font-semibold text-gray-900">{section.title}</h4>
              {expandedSections.has(section.title.toLowerCase().replace(/\s+/g, '-')) ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.has(section.title.toLowerCase().replace(/\s+/g, '-')) && (
              <div className="p-4 bg-white">
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-500 border-t border-gray-200 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="font-medium">Document:</span>
            <br />
            {document.originalName}
          </div>
          <div>
            <span className="font-medium">Size:</span>
            <br />
            {(document.size / 1024 / 1024).toFixed(2)} MB
          </div>
          <div>
            <span className="font-medium">Uploaded:</span>
            <br />
            {formatDate(document.uploadedAt)}
          </div>
          <div>
            <span className="font-medium">Status:</span>
            <br />
            <span className={cn(
              'capitalize',
              document.status === 'completed' && 'text-green-600',
              document.status === 'failed' && 'text-red-600',
              document.status === 'processing' && 'text-blue-600'
            )}>
              {document.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
