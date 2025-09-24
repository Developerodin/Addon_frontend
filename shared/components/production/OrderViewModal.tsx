"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { productionService, ProductionOrder } from "@/shared/services/productionService";

interface Article {
  id: string;
  _id?: string;
  articleNumber: string;
  plannedQuantity: number;
  completedQuantity?: number;
  linkingType: string;
  priority: string;
  status: string;
  progress: number;
  currentFloor: string;
  finalQualityConfirmed?: boolean;
  remarks?: string;
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  startedAt?: string;
  floorQuantities?: {
    [key: string]: {
      received?: number;
      completed?: number;
      remaining?: number;
      transferred?: number;
      m1Quantity?: number;
      m2Quantity?: number;
      m3Quantity?: number;
      m4Quantity?: number;
      repairStatus?: string;
      repairRemarks?: string;
    };
  };
}

interface ProductionOrder {
  id: string;
  orderNumber?: string;
  priority: string;
  status: string;
  articles: Article[];
  currentFloor?: string;
  floor?: string;
  orderNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface OrderViewModalProps {
  order: ProductionOrder;
  onClose: () => void;
}

interface ArticleLog {
  id: string;
  action: string;
  details: any;
  timestamp: string;
  userId: string;
}

const OrderViewModal: React.FC<OrderViewModalProps> = ({ order, onClose }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'logs' | 'timeline'>('articles');
  const [articleLogs, setArticleLogs] = useState<ArticleLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const loadArticleLogs = async (articleId: string) => {
    setIsLoadingLogs(true);
    try {
      const response = await productionService.getArticleLogs(articleId, {
        limit: 50,
        offset: 0
      });
      
      if (response.success) {
        setArticleLogs(response.data.logs || []);
      }
    } catch (error: any) {
      console.error('Error loading article logs:', error);
      toast.error('Failed to load article logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleArticleClick = (article: Article) => {
    setSelectedArticle(article);
    // Use _id for logs API, fallback to id if _id is not available
    const articleId = article._id || article.id;
    loadArticleLogs(articleId);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'On Hold': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      'Urgent': 'bg-red-100 text-red-800',
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return priorityClasses[priority as keyof typeof priorityClasses] || 'bg-gray-100 text-gray-800';
  };

  const getFloorBadge = (floor: string) => {
    const floorClasses = {
      'Knitting': 'bg-blue-100 text-blue-800',
      'Linking': 'bg-purple-100 text-purple-800',
      'Checking': 'bg-yellow-100 text-yellow-800',
      'Washing': 'bg-cyan-100 text-cyan-800',
      'Boarding': 'bg-orange-100 text-orange-800',
      'Branding': 'bg-pink-100 text-pink-800',
      'Final Checking': 'bg-indigo-100 text-indigo-800',
      'finalChecking': 'bg-indigo-100 text-indigo-800',
      'Warehouse': 'bg-green-100 text-green-800'
    };
    return floorClasses[floor as keyof typeof floorClasses] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString?: string) => {
    return dateString ? new Date(dateString).toLocaleString() : 'N/A';
  };

  const calculateProgress = (article: Article) => {
    // Use the progress field from API data if available, otherwise calculate from completed/planned
    if (article.progress !== undefined) {
      return article.progress;
    }
    if (!article.plannedQuantity || article.plannedQuantity === 0) return 0;
    return Math.round(((article.completedQuantity || 0) / article.plannedQuantity) * 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
            <p className="text-gray-600">Order Number: {order.orderNumber || order.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        {/* Order Info */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(order.priority)}`}>
                  {order.priority}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Current Floor</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFloorBadge(order.currentFloor || order.floor || 'Unknown')}`}>
                  {order.currentFloor || order.floor || 'Unknown'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Articles</label>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {order.articles.length}
              </div>
            </div>
          </div>
          
          {order.orderNote && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Order Note</label>
              <p className="mt-1 text-gray-900">{order.orderNote}</p>
            </div>
          )}

        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('articles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'articles'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Articles ({order.articles.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logs
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'timeline'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Timeline
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'articles' && (
            <div className="space-y-4">
              {order.articles.map((article, index) => (
                <div
                  key={article.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedArticle?.id === article.id
                      ? 'border-primary bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleArticleClick(article)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {article.articleNumber || 'Unknown Article'}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(article.priority || 'Unknown')}`}>
                          {article.priority || 'Unknown'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(article.status || 'Unknown')}`}>
                          {article.status || 'Unknown'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFloorBadge(article.currentFloor || 'Unknown')}`}>
                          {article.currentFloor || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Planned:</span>
                          <span className="ml-1 font-medium">{(article.plannedQuantity || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Completed:</span>
                          <span className="ml-1 font-medium">{(article.completedQuantity || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Linking Type:</span>
                          <span className="ml-1 font-medium">{article.linkingType || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Progress:</span>
                          <span className="ml-1 font-medium">{calculateProgress(article)}%</span>
                        </div>
                      </div>
                      
                      {/* Article Dates */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(article.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">Started:</span> {formatDate(article.startedAt)}
                        </div>
                        <div>
                          <span className="font-medium">Completed:</span> {formatDate(article.completedAt)}
                        </div>
                      </div>
                      
                      {/* Final Quality Status */}
                      {article.finalQualityConfirmed !== undefined && (
                        <div className="mt-2 text-xs">
                          <span className="font-medium text-gray-600">Final Quality:</span>
                          <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                            article.finalQualityConfirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {article.finalQualityConfirmed ? 'Confirmed' : 'Pending'}
                          </span>
                        </div>
                      )}

                      {/* Overall Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Overall Progress</span>
                          <span>{calculateProgress(article)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${calculateProgress(article)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Floor-wise Progress */}
                      {article.floorQuantities && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Floor-wise Progress</h4>
                          <div className="space-y-3">
                            {Object.entries(article.floorQuantities).map(([floor, data]) => {
                              const floorName = floor.replace(/([A-Z])/g, ' $1').trim();
                              const received = data.received || 0;
                              const completed = data.completed || 0;
                              const remaining = data.remaining || 0;
                              const transferred = data.transferred || 0;
                              const completionPercentage = received > 0 ? Math.round((completed / received) * 100) : 0;
                              
                              return (
                                <div key={floor} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-medium text-gray-700 capitalize">
                                      {floorName}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {completed.toLocaleString()} / {received.toLocaleString()} ({completionPercentage}%)
                                    </span>
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${completionPercentage}%` }}
                                    ></div>
                                  </div>
                                  
                                  {/* Quantities Grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div className="text-center">
                                      <div className="font-medium text-blue-600">Received</div>
                                      <div className="text-gray-600">{received.toLocaleString()}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium text-green-600">Completed</div>
                                      <div className="text-gray-600">{completed.toLocaleString()}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium text-yellow-600">Remaining</div>
                                      <div className="text-gray-600">{remaining.toLocaleString()}</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-medium text-purple-600">Transferred</div>
                                      <div className="text-gray-600">{transferred.toLocaleString()}</div>
                                    </div>
                                  </div>
                                  
                                  {/* Quality Categories for Checking floors */}
                                  {(floor === 'checking' || floor === 'finalChecking') && (
                                    <div className="mt-3 pt-3 border-t border-gray-300">
                                      <div className="text-xs font-medium text-gray-600 mb-2">Quality Categories:</div>
                                      <div className="grid grid-cols-4 gap-2 text-xs">
                                        <div className="text-center">
                                          <div className="font-medium text-green-600">M1</div>
                                          <div className="text-gray-600">{data.m1Quantity || 0}</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-medium text-yellow-600">M2</div>
                                          <div className="text-gray-600">{data.m2Quantity || 0}</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-medium text-orange-600">M3</div>
                                          <div className="text-gray-600">{data.m3Quantity || 0}</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-medium text-red-600">M4</div>
                                          <div className="text-gray-600">{data.m4Quantity || 0}</div>
                                        </div>
                                      </div>
                                      {data.repairStatus && (
                                        <div className="mt-2 text-xs">
                                          <span className="font-medium text-gray-600">Repair Status:</span>
                                          <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                                            data.repairStatus === 'Required' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                          }`}>
                                            {data.repairStatus}
                                          </span>
                                        </div>
                                      )}
                                      {data.repairRemarks && (
                                        <div className="mt-1 text-xs text-gray-600">
                                          <span className="font-medium">Repair Remarks:</span> {data.repairRemarks}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}


                      {article.remarks && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Remarks:</span> {article.remarks}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              {selectedArticle ? (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Logs for Article: {selectedArticle.articleNumber}
                  </h3>
                  
                  {isLoadingLogs ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : articleLogs.length > 0 ? (
                    <div className="space-y-3">
                      {articleLogs.map((log) => (
                        <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="font-medium text-gray-900">{log.action}</span>
                                <span className="text-sm text-gray-500">
                                  {formatDate(log.timestamp)}
                                </span>
                              </div>
                              {log.details && (
                                <div className="text-sm text-gray-600">
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No logs found for this article
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select an article to view its logs
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                Timeline view - Coming soon
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="ti-btn ti-btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderViewModal;