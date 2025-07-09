import React from 'react';
import { ImportProgress as ImportProgressType } from '@/shared/services/salesImportService';

interface ImportProgressProps {
  progress: ImportProgressType | null;
  onClose?: () => void;
}

const ImportProgress: React.FC<ImportProgressProps> = ({ progress, onClose }) => {
  if (!progress) return null;

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'processing':
        return 'ri-loader-4-line animate-spin';
      case 'completed':
        return 'ri-check-line text-green-600';
      case 'failed':
        return 'ri-close-line text-red-600';
      default:
        return 'ri-information-line';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'processing':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Import Progress</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={progress.status === 'processing'}
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status */}
          <div className={`flex items-center mb-4 p-3 rounded-lg border ${getStatusColor()}`}>
            <i className={`${getStatusIcon()} text-xl me-3`}></i>
            <div>
              <div className="font-medium">
                {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
              </div>
              {progress.message && (
                <div className="text-sm mt-1">{progress.message}</div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  progress.status === 'completed' ? 'bg-green-500' :
                  progress.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {progress.current} of {progress.total} records
            </div>
          </div>

          {/* Errors */}
          {progress.errors && progress.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-red-700 mb-2">Errors:</h4>
              <div className="max-h-32 overflow-y-auto">
                {progress.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 mb-1 p-2 bg-red-50 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end mt-6 space-x-3">
            {progress.status === 'completed' && (
              <button
                onClick={onClose}
                className="ti-btn ti-btn-success"
              >
                <i className="ri-check-line me-2"></i>
                Done
              </button>
            )}
            {progress.status === 'failed' && (
              <button
                onClick={onClose}
                className="ti-btn ti-btn-secondary"
              >
                <i className="ri-close-line me-2"></i>
                Close
              </button>
            )}
            {progress.status === 'processing' && (
              <div className="text-sm text-gray-500">
                Please wait while we process your data...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportProgress; 