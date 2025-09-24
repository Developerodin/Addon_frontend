"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { productionService } from "@/shared/services/productionService";

interface ArticleLogsModalProps {
  articleId: string;
  articleNumber?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  action: string;
  timestamp: string;
  user?: string;
  details?: any;
  fromFloor?: string;
  toFloor?: string;
  quantity?: number;
  remarks?: string;
  metadata?: any;
}

const ArticleLogsModal: React.FC<ArticleLogsModalProps> = ({
  articleId,
  articleNumber,
  isOpen,
  onClose
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    dateFrom: '',
    dateTo: '',
    floor: '',
    sortBy: 'timestamp:desc'
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const response = await productionService.getArticleLogs(articleId, {
        ...filters,
        limit: 1000 // Load all logs
      });

      if (response.success) {
        setLogs(response.data.results);
      } else {
        toast.error('Failed to load logs');
      }
    } catch (error: any) {
      console.error('Error loading logs:', error);
      toast.error(error.message || 'Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      dateFrom: '',
      dateTo: '',
      floor: '',
      sortBy: 'timestamp:desc'
    });
  };

  const getActionIcon = (action: string) => {
    const actionIcons: { [key: string]: string } = {
      'created': 'ri-add-line',
      'updated': 'ri-edit-line',
      'deleted': 'ri-delete-bin-line',
      'transferred': 'ri-arrow-right-line',
      'quality_check': 'ri-checkbox-circle-line',
      'status_change': 'ri-refresh-line',
      'floor_transfer': 'ri-building-line',
      'work_status_change': 'ri-tools-line',
      'user_action': 'ri-user-line',
      'system_event': 'ri-computer-line',
      'progress_update': 'ri-progress-1-line',
      'quantity_update': 'ri-number-1-line',
      'repair_status': 'ri-tools-line',
      'quality_confirmed': 'ri-check-double-line'
    };
    return actionIcons[action.toLowerCase()] || 'ri-file-text-line';
  };

  const getActionColor = (action: string) => {
    const actionColors: { [key: string]: string } = {
      'created': 'text-green-600',
      'updated': 'text-blue-600',
      'deleted': 'text-red-600',
      'transferred': 'text-purple-600',
      'quality_check': 'text-yellow-600',
      'status_change': 'text-indigo-600',
      'floor_transfer': 'text-orange-600',
      'work_status_change': 'text-pink-600',
      'user_action': 'text-cyan-600',
      'system_event': 'text-gray-600',
      'progress_update': 'text-emerald-600',
      'quantity_update': 'text-teal-600',
      'repair_status': 'text-rose-600',
      'quality_confirmed': 'text-lime-600'
    };
    return actionColors[action.toLowerCase()] || 'text-gray-600';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '' && value !== 'timestamp:desc');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Article Logs
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {articleNumber ? `Article: ${articleNumber}` : `Article ID: ${articleId}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              className={`ti-btn ${showFilters ? 'ti-btn-primary' : 'ti-btn-secondary'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <i className="ri-filter-3-line me-2"></i>
              Filters {hasActiveFilters && <span className="badge bg-white text-primary ml-1">●</span>}
            </button>
            
            {hasActiveFilters && (
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={clearFilters}
              >
                <i className="ri-close-line me-1"></i>
                Clear Filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="form-label text-sm font-medium">Action</label>
                <select
                  className="form-select"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">All Actions</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="deleted">Deleted</option>
                  <option value="transferred">Transferred</option>
                  <option value="quality_check">Quality Check</option>
                  <option value="status_change">Status Change</option>
                  <option value="floor_transfer">Floor Transfer</option>
                  <option value="work_status_change">Work Status Change</option>
                  <option value="progress_update">Progress Update</option>
                  <option value="quantity_update">Quantity Update</option>
                  <option value="repair_status">Repair Status</option>
                  <option value="quality_confirmed">Quality Confirmed</option>
                  <option value="user_action">User Action</option>
                  <option value="system_event">System Event</option>
                </select>
              </div>

              <div>
                <label className="form-label text-sm font-medium">Date From</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label text-sm font-medium">Date To</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label text-sm font-medium">Floor</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter by floor..."
                  value={filters.floor}
                  onChange={(e) => handleFilterChange('floor', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label text-sm font-medium">Sort By</label>
                <select
                  className="form-select"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                >
                  <option value="timestamp:desc">Newest First</option>
                  <option value="timestamp:asc">Oldest First</option>
                  <option value="action:asc">Action A-Z</option>
                  <option value="action:desc">Action Z-A</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading logs...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <i className="ri-file-list-line text-6xl"></i>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
              <p className="text-gray-500">
                {hasActiveFilters 
                  ? 'Try adjusting your filters' 
                  : 'No activity recorded for this article yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Showing {logs.length} log{logs.length !== 1 ? 's' : ''}
              </div>
              {logs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center ${getActionColor(log.action)}`}>
                      <i className={`${getActionIcon(log.action)} text-lg`}></i>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 capitalize">
                          {log.action.replace(/_/g, ' ')}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      
                      {log.user && (
                        <p className="text-sm text-gray-600 mt-1">
                          <i className="ri-user-line me-1"></i>
                          {log.user}
                        </p>
                      )}
                      
                      {(log.fromFloor || log.toFloor) && (
                        <div className="flex items-center space-x-2 mt-2">
                          {log.fromFloor && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              From: {log.fromFloor}
                            </span>
                          )}
                          {log.toFloor && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              To: {log.toFloor}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {log.quantity && (
                        <p className="text-sm text-gray-600 mt-1">
                          <i className="ri-number-1 me-1"></i>
                          Quantity: {log.quantity.toLocaleString()}
                        </p>
                      )}
                      
                      {log.remarks && (
                        <p className="text-sm text-gray-600 mt-1">
                          <i className="ri-message-3-line me-1"></i>
                          {log.remarks}
                        </p>
                      )}
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                            <i className="ri-information-line me-1"></i>
                            View Details
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                            <pre className="whitespace-pre-wrap text-gray-700">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleLogsModal;
