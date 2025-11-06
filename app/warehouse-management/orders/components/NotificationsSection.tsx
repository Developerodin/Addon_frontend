"use client";

import React, { useState } from 'react';
import { Notification } from '../types';

interface NotificationsSectionProps {
  notifications: Notification[];
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({ notifications }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'ri-error-warning-line text-red-500';
      case 'warning':
        return 'ri-alert-line text-yellow-500';
      case 'info':
        return 'ri-information-line text-blue-500';
      default:
        return 'ri-notification-line text-gray-500';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const handleDismissAll = () => {
    setDismissedIds(new Set(notifications.map(n => n.id)));
  };

  if (visibleNotifications.length === 0) {
    return (
      <div className="box">
        <div className="box-header">
          <div className="flex items-center justify-between">
            <h3 className="box-title flex items-center">
              <i className="ri-notification-line me-2 text-lg"></i>
              Notifications
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ti-btn ti-btn-sm ti-btn-light"
            >
              <i className={`ri-${isExpanded ? 'arrow-up' : 'arrow-down'}-s-line text-lg`}></i>
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="box-body">
            <div className="text-center py-8 text-gray-500">
              <i className="ri-checkbox-circle-line text-3xl mb-2"></i>
              <p>No notifications</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="box">
      <div className="box-header">
        <div className="flex items-center justify-between">
          <h3 className="box-title flex items-center">
            <i className="ri-notification-line me-2 text-lg"></i>
            Notifications
            {visibleNotifications.length > 0 && (
              <span className="badge bg-danger ms-2">{visibleNotifications.length}</span>
            )}
          </h3>
          <div className="flex gap-3 items-center">
            {visibleNotifications.length > 0 && (
              <button
                onClick={handleDismissAll}
                className="ti-btn ti-btn-sm ti-btn-light ml-2"
                title="Dismiss All"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ti-btn ti-btn-sm ti-btn-light"
            >
              <i className={`ri-${isExpanded ? 'arrow-up' : 'arrow-down'}-s-line text-lg`}></i>
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="box-body">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {visibleNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${getSeverityBg(notification.severity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      <i className={`${getSeverityIcon(notification.severity)} text-lg`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {notification.sku && (
                          <span className="bg-white px-2 py-0.5 rounded">
                            SKU: {notification.sku}
                          </span>
                        )}
                        {notification.orderId && (
                          <span className="bg-white px-2 py-0.5 rounded">
                            Order: {notification.orderId}
                          </span>
                        )}
                        <span>
                          {new Date(notification.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDismiss(notification.id, e)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Dismiss"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;

