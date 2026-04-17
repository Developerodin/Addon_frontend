"use client";
import React, { useEffect, useState } from "react";
import { InventoryAlert } from "../types";

const ALERTS_PER_PAGE = 20;

interface InventoryAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: InventoryAlert[];
  loading?: boolean;
}

const InventoryAlertsModal: React.FC<InventoryAlertsModalProps> = ({
  isOpen,
  onClose,
  alerts,
  loading = false,
}) => {
  const [visibleCount, setVisibleCount] = useState(ALERTS_PER_PAGE);

  // Reset visible count when modal opens or alerts change
  useEffect(() => {
    if (isOpen) {
      setVisibleCount(ALERTS_PER_PAGE);
    }
  }, [isOpen, alerts]);

  const visibleAlerts = alerts.slice(0, visibleCount);
  const hasMore = visibleCount < alerts.length;
  const remainingCount = alerts.length - visibleCount;

  /**
   * Load more alerts - adds ALERTS_PER_PAGE more items to visible list
   */
  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + ALERTS_PER_PAGE, alerts.length));
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const getAlertStyles = (severity: string) => {
    if (severity === "high") {
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        badge: "bg-red-100 text-red-800",
        icon: "text-red-600",
      };
    } else if (severity === "medium") {
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        badge: "bg-yellow-100 text-yellow-800",
        icon: "text-yellow-600",
      };
    } else {
      return {
        bg: "bg-orange-50",
        border: "border-orange-200",
        badge: "bg-orange-100 text-orange-800",
        icon: "text-orange-600",
      };
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "Out of Stock":
        return "ri-error-warning-line";
      case "Overblocked":
        return "ri-alert-line";
      case "Low Stock":
        return "ri-information-line";
      default:
        return "ri-notification-line";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 rounded-lg">
                <i className="ri-notification-3-line text-lg text-red-600"></i>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Inventory Alerts
                </h2>
                {loading ? (
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-0.5"></div>
                ) : (
                  <p className="text-xs text-gray-600">
                    {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200 group"
              aria-label="Close modal"
            >
              <i className="ri-close-line text-lg text-gray-500 group-hover:text-gray-900 transition-colors"></i>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mb-3"></div>
                <p className="text-xs text-gray-500">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="p-3 bg-gray-100 rounded-full mb-3">
                  <i className="ri-checkbox-circle-line text-2xl text-gray-400"></i>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  No Alerts
                </h3>
                <p className="text-xs text-gray-500">
                  All inventory levels are within normal range.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleAlerts.map((alert) => {
                  const styles = getAlertStyles(alert.severity);
                  return (
                    <div
                      key={alert.id}
                      className={`${styles.bg} ${styles.border} border rounded-lg p-3 hover:shadow-sm transition-all duration-200`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`${styles.icon} p-1.5 bg-white rounded-md shadow-sm flex-shrink-0`}
                        >
                          <i
                            className={`${getAlertIcon(alert.alertType)} text-sm`}
                          ></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                              {alert.yarnName}
                            </h4>
                            <span
                              className={`${styles.badge} px-2 py-0.5 text-[10px] font-semibold rounded-full whitespace-nowrap flex-shrink-0`}
                            >
                              {alert.alertType}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 mb-1.5 leading-snug">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500">
                            <i className="ri-time-line"></i>
                            <span>
                              {new Date(alert.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {hasMore && (
                  <button
                    type="button"
                    onClick={handleShowMore}
                    className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    <i className="ri-arrow-down-line text-base"></i>
                    Show More ({remainingCount} remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InventoryAlertsModal;

