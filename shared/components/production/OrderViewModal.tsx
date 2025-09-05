"use client";
import React, { useState } from "react";

interface FloorQuantity {
  floor: string;
  completed: number;
  pending: number;
  status: "Pending" | "In Progress" | "Completed" | "On Hold";
}

interface Article {
  id: string;
  articleNumber: string;
  plannedQuantity: number;
  completedQuantity: number;
  linkingType: "Auto Linking" | "Rosso Linking" | "Hand Linking";
  priority: "High" | "Medium" | "Low" | "Urgent";
  status: "Pending" | "In Progress" | "Completed" | "On Hold";
  progress: number;
  currentFloor: string;
  floorQuantities: FloorQuantity[];
}

interface ProductionOrder {
  id: string;
  priority: "High" | "Medium" | "Low" | "Urgent";
  status: "Pending" | "In Progress" | "Completed" | "On Hold";
  articles: Article[];
  floor: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderViewModalProps {
  order: ProductionOrder;
  onClose: () => void;
}

const getStatusBadge = (status: string) => {
  const statusClasses = {
    Pending: "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
    "On Hold": "bg-red-100 text-red-800",
  } as const;
  return statusClasses[status as keyof typeof statusClasses] || "bg-gray-100 text-gray-800";
};

const getPriorityBadge = (priority: string) => {
  const priorityClasses = {
    Urgent: "bg-red-100 text-red-800",
    High: "bg-orange-100 text-orange-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800",
  } as const;
  return priorityClasses[priority as keyof typeof priorityClasses] || "bg-gray-100 text-gray-800";
};

const OrderViewModal: React.FC<OrderViewModalProps> = ({ order, onClose }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [showLogs, setShowLogs] = useState(false);

  const articles = order.articles;
  const activeArticle = articles[activeTabIndex];

  // Fixed "today" as requested: 1-Sep-2025
  const BASE_TODAY = new Date('2025-09-01T00:00:00');

  const formatDate = (base: Date, offsetDays: number) => {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + offsetDays);
    const day = d.getDate();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    return `${day}-${mon}-${yr}`; // e.g., 1-Sep-2025
  };

  const buildArticleLogs = (article?: Article): string[] => {
    if (!article) return [];
    const logs: string[] = [];
    // Initial allocation to first floor (if present)
    if (article.floorQuantities && article.floorQuantities.length > 0) {
      const firstFloor = article.floorQuantities[0]?.floor || 'Knitting';
      logs.push(`Production allocated ${article.plannedQuantity} to ${firstFloor} on ${formatDate(BASE_TODAY, 0)}`);
    }
    // Transfers between consecutive floors (based on next floor's completed qty)
    for (let i = 0; i < (article.floorQuantities?.length || 0) - 1; i++) {
      const cur = article.floorQuantities[i];
      const nxt = article.floorQuantities[i + 1];
      if (!cur || !nxt) continue;
      const transferred = Math.max(0, nxt.completed);
      if (transferred > 0) {
        logs.push(`${cur.floor} transferred ${transferred} to ${nxt.floor} on ${formatDate(BASE_TODAY, i + 1)}`);
      }
    }
    return logs;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Order Details - {order.id}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Order Summary (removed Main Floor) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-600">Priority</label>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(order.priority)}`}>
                {order.priority}
              </span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Status</label>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Articles Tabs as blue buttons */}
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {articles.map((article, idx) => (
              <button
                key={article.id}
                className={`px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap focus:outline-none ${
                  idx === activeTabIndex
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
                onClick={() => setActiveTabIndex(idx)}
                title={article.articleNumber}
              >
                {article.articleNumber || `Article ${idx + 1}`}
              </button>
            ))}
          </div>
        </div>

        {/* Active Article Content */}
        {activeArticle && (
          <div className="space-y-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h5 className="text-md font-medium text-gray-900">
                  {activeArticle.articleNumber}
                </h5>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Linking Type:</span> {activeArticle.linkingType}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(activeArticle.priority)}`}>
                  {activeArticle.priority}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 mb-3 block">Floor Progression</label>
              <div className="space-y-3">
                {activeArticle.floorQuantities.map((floorData) => (
                  <div key={floorData.floor} className="flex items-center space-x-4">
                    <div className="w-24 flex-shrink-0">
                      <div
                        className={`text-sm font-medium px-2 py-1 rounded ${
                          floorData.status === "Completed"
                            ? "bg-green-100 text-green-800"
                            : floorData.status === "In Progress"
                            ? "bg-blue-100 text-blue-800"
                            : floorData.status === "On Hold"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {floorData.floor}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              floorData.status === "Completed"
                                ? "bg-green-500"
                                : floorData.status === "In Progress"
                                ? "bg-blue-500"
                                : floorData.status === "On Hold"
                                ? "bg-red-500"
                                : "bg-gray-300"
                            }`}
                            style={{
                              width: `${
                                activeArticle.plannedQuantity > 0
                                  ? (floorData.completed / activeArticle.plannedQuantity) * 100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 w-16 text-right">
                          {floorData.completed}/{activeArticle.plannedQuantity}
                        </div>
                      </div>
                    </div>

                    <div className="w-20 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          floorData.status === "Completed"
                            ? "bg-green-100 text-green-800"
                            : floorData.status === "In Progress"
                            ? "bg-blue-100 text-blue-800"
                            : floorData.status === "On Hold"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {floorData.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md-grid-cols-3 md:grid-cols-3 gap-4 mb-2">
              <div>
                <label className="text-sm font-medium text-gray-600">Planned Quantity</label>
                <div className="text-lg font-semibold text-gray-900">
                  {activeArticle.plannedQuantity.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Completed Quantity</label>
                <div className="text-lg font-semibold text-green-600">
                  {activeArticle.completedQuantity.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Current Floor</label>
                <div className="text-sm text-gray-900">{activeArticle.currentFloor}</div>
              </div>
            </div>

            {/* Article Logs Toggle and Panel */}
            <div className="mb-4">
              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
                onClick={() => setShowLogs(!showLogs)}
                title="View Article Logs"
                type="button"
              >
                <i className="ri-file-list-3-line"></i>
                {showLogs ? 'Hide Logs' : 'View Logs'}
              </button>
              {showLogs && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded max-w-full overflow-x-auto">
                  <ul className="list-disc list-inside text-sm text-blue-900 space-y-1 break-words">
                    {buildArticleLogs(activeArticle).map((log, i) => (
                      <li key={i}>{log}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-600">Progress</label>
                <span className="text-sm font-medium text-gray-900">{activeArticle.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${activeArticle.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(activeArticle.status)}`}>
                  {activeArticle.status}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {activeArticle.completedQuantity} of {activeArticle.plannedQuantity} completed
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button onClick={onClose} className="ti-btn ti-btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderViewModal;


