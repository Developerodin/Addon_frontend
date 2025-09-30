"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { productionService, ProductionOrder } from "@/shared/services/productionService";
import ArticleLogsModal from "./ArticleLogsModal";

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
  _id?: string;
  id?: string;
  action: string;
  fromFloor?: string;
  toFloor?: string;
  quantity?: number;
  remarks?: string;
  previousValue?: any;
  newValue?: any;
  changeReason?: string;
  qualityStatus?: string;
  userId?: string;
  floorSupervisorId?: string;
  timestamp?: string;
  createdAt?: string;
}

const OrderViewModal: React.FC<OrderViewModalProps> = ({ order, onClose }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'logs'>('articles');
  const [articleLogs, setArticleLogs] = useState<ArticleLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedLogsArticle, setSelectedLogsArticle] = useState<Article | null>(null);
  const [showArticleLogsModal, setShowArticleLogsModal] = useState(false);

  const loadArticleLogs = async (articleId: string) => {
    setIsLoadingLogs(true);
    try {
      console.log('Loading logs for article ID:', articleId);
      const response = await productionService.getArticleLogs(articleId);
      
      console.log('Article logs response:', response);
      
      if (response.success) {
        console.log('Article logs data:', response.data);
        setArticleLogs(response.data.results || []);
      } else {
        console.error('Failed to load article logs:', response.error);
        toast.error('Failed to load article logs');
        setArticleLogs([]);
      }
    } catch (error: any) {
      console.error('Error loading article logs:', error);
      toast.error(error.message || 'Failed to load article logs');
      setArticleLogs([]);
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

  const handleLogsArticleSelect = (article: Article) => {
    setSelectedLogsArticle(article);
    // Use _id for logs API, fallback to id if _id is not available
    const articleId = article._id || article.id;
    loadArticleLogs(articleId);
  };

  const handleViewArticleLogs = (article: Article) => {
    setSelectedArticle(article);
    setShowArticleLogsModal(true);
  };

  const closeArticleLogsModal = () => {
    setShowArticleLogsModal(false);
    setSelectedArticle(null);
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
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
              {/* Article Selection Tabs */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Article to View Logs</h3>
                <div className="flex flex-wrap gap-2">
                  {order.articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleLogsArticleSelect(article)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedLogsArticle?.id === article.id
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{article.articleNumber || 'Unknown Article'}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${
                          article.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          article.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          article.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {article.status || 'Unknown'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logs Content */}
              {selectedLogsArticle ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      Logs for Article: {selectedLogsArticle.articleNumber}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {articleLogs.length > 0 && `${articleLogs.length} log${articleLogs.length > 1 ? 's' : ''} found`}
                      </span>
                    </div>
                  </div>
                  
                  {isLoadingLogs ? (
                    <div className="flex justify-center py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm">Loading logs...</p>
                      </div>
                    </div>
                  ) : articleLogs.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {articleLogs.map((log, index) => (
                        <div key={log._id || log.id || index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                log.action === 'Quality Inspection' ? 'bg-yellow-100 text-yellow-800' :
                                log.action === 'Transferred to Branding' ? 'bg-purple-100 text-purple-800' :
                                log.action === 'Transferred to Washing' ? 'bg-blue-100 text-blue-800' :
                                log.action === 'M1 Quantity Updated' ? 'bg-green-100 text-green-800' :
                                log.action === 'M2 Quantity Updated' ? 'bg-orange-100 text-orange-800' :
                                log.action === 'M3 Quantity Updated' ? 'bg-red-100 text-red-800' :
                                log.action === 'M4 Quantity Updated' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.action || 'ACTION'}
                              </span>
                              {log.fromFloor && log.toFloor && (
                                <span className="text-sm text-gray-600">
                                  {log.fromFloor} → {log.toFloor}
                                </span>
                              )}
                              {log.quantity && log.quantity > 0 && (
                                <span className="text-sm text-gray-600">
                                  Qty: {log.quantity}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : 
                               log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Unknown time'}
                            </span>
                          </div>
                          
                          {log.remarks && (
                            <div className="text-sm text-gray-700 mb-2">
                              {log.remarks}
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            {log.previousValue && (
                              <div>
                                <strong>Previous:</strong> {log.previousValue}
                              </div>
                            )}
                            {log.newValue && (
                              <div>
                                <strong>New:</strong> {log.newValue}
                              </div>
                            )}
                            {log.changeReason && (
                              <div className="col-span-2">
                                <strong>Reason:</strong> {log.changeReason}
                              </div>
                            )}
                            {log.qualityStatus && (
                              <div className="col-span-2">
                                <strong>Quality Status:</strong> {log.qualityStatus}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500 mt-2 flex justify-between">
                            <div>
                              <i className="ri-user-line me-1"></i>
                              {log.userId || 'System'}
                            </div>
                            {log.floorSupervisorId && (
                              <div>
                                <i className="ri-user-settings-line me-1"></i>
                                Supervisor: {log.floorSupervisorId}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <i className="ri-file-list-line text-3xl"></i>
                      </div>
                      <p className="text-gray-600">No logs found for this article</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <i className="ri-file-list-line text-3xl"></i>
                  </div>
                  <p className="text-gray-600">Select an article above to view its logs</p>
                </div>
              )}
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

      {/* Article Logs Modal */}
      {showArticleLogsModal && selectedArticle && (
        <ArticleLogsModal 
          articleId={selectedArticle._id || selectedArticle.id}
          articleNumber={selectedArticle.articleNumber}
          isOpen={showArticleLogsModal}
          onClose={closeArticleLogsModal}
        />
      )}
    </div>
  );
};

export default OrderViewModal;