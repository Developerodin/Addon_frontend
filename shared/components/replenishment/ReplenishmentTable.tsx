import React, { useState } from 'react';
import { Forecast, Replenishment } from '@/shared/services/replenishmentService';

interface ReplenishmentTableProps {
  forecasts: Forecast[];
  replenishments: Replenishment[];
  loading: boolean;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onPageChange: (page: number) => void;
  onUpdateForecast: (forecastId: string, actualQty: number) => Promise<void>;
  onDeleteForecast?: (forecastId: string) => Promise<void>;
  formatMonth: (month: string) => string;
  calculateDeviation: (predictedQty: number, actualQty?: number) => number | null;
  getAccuracyColor: (accuracy: number) => string;
  getDeviationColor: (deviation: number) => string;
}

export const ReplenishmentTable: React.FC<ReplenishmentTableProps> = ({
  forecasts,
  replenishments,
  loading,
  pagination,
  onPageChange,
  onUpdateForecast,
  onDeleteForecast,
  formatMonth,
  calculateDeviation,
  getAccuracyColor,
  getDeviationColor
}) => {
  const [editingForecast, setEditingForecast] = useState<string | null>(null);
  const [actualQty, setActualQty] = useState<number>(0);
  const [sortField, setSortField] = useState<keyof Forecast>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Forecast) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedForecasts = [...forecasts].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleUpdateClick = (forecast: Forecast) => {
    setEditingForecast(forecast.id);
    setActualQty(forecast.actual_quantity || 0);
  };

  const handleUpdateSubmit = async () => {
    if (editingForecast) {
      try {
        await onUpdateForecast(editingForecast, actualQty);
        setEditingForecast(null);
        setActualQty(0);
      } catch (error) {
        console.error('Failed to update forecast:', error);
      }
    }
  };

  const handleDeleteClick = async (forecastId: string) => {
    if (onDeleteForecast && confirm('Are you sure you want to delete this forecast?')) {
      try {
        await onDeleteForecast(forecastId);
      } catch (error) {
        console.error('Failed to delete forecast:', error);
      }
    }
  };

  const SortIcon = ({ field }: { field: keyof Forecast }) => {
    if (sortField !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400"></i>;
    }
    return sortDirection === 'asc' 
      ? <i className="ri-arrow-up-line text-primary"></i>
      : <i className="ri-arrow-down-line text-primary"></i>;
  };

  if (loading) {
    return (
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Forecast Predictions</h3>
        </div>
        <div className="box-body">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-12 bg-gray-200 rounded mb-2"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="box">
      <div className="box-header">
        <h3 className="box-title">Forecast Predictions</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalResults)} of {pagination.totalResults} predictions
          </span>
        </div>
      </div>
      
      <div className="box-body p-0">
        <div className="overflow-x-auto">
          <table className="table table-hover w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('store_id')}
                  >
                    Store ID
                    <SortIcon field="store_id" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('product_id')}
                  >
                    Product ID
                    <SortIcon field="product_id" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('forecast_month')}
                  >
                    Forecast Month
                    <SortIcon field="forecast_month" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('predicted_quantity')}
                  >
                    Predicted Qty
                    <SortIcon field="predicted_quantity" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Actual Qty</th>
                <th className="px-4 py-3 text-left">Accuracy</th>
                <th className="px-4 py-3 text-left">Deviation</th>
                <th className="px-4 py-3 text-left">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    Created
                    <SortIcon field="created_at" />
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedForecasts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="text-gray-500">
                      <i className="ri-inbox-line text-4xl mb-2"></i>
                      <p>No forecasts found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedForecasts.map((forecast) => (
                  <tr key={forecast.id} className="hover:bg-gray-50 transition-colors border-b">
                    <td className="px-4 py-3">
                      <div className="font-medium">{forecast.store_id}</div>
                      {forecast.store && (
                        <div className="text-sm text-gray-500">{forecast.store.storeName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{forecast.product_id}</div>
                      {forecast.product && (
                        <div className="text-sm text-gray-500">{forecast.product.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium">
                        {formatMonth(forecast.forecast_month)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">
                        {forecast.predicted_quantity.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingForecast === forecast.id ? (
                        <input
                          type="number"
                          value={actualQty}
                          onChange={(e) => setActualQty(parseInt(e.target.value) || 0)}
                          className="form-input w-20 text-sm"
                          min="0"
                        />
                      ) : (
                        <span className="font-medium">
                          {forecast.actual_quantity?.toLocaleString() || '-'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {forecast.accuracy !== null ? (
                        <span className={`font-medium ${getAccuracyColor(forecast.accuracy)}`}>
                          {forecast.accuracy.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const deviation = calculateDeviation(forecast.predicted_quantity, forecast.actual_quantity);
                        if (deviation === null) return <span className="text-gray-400">-</span>;
                        return (
                          <span className={`font-medium ${getDeviationColor(deviation)}`}>
                            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {new Date(forecast.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {editingForecast === forecast.id ? (
                          <>
                            <button
                              onClick={handleUpdateSubmit}
                              className="ti-btn ti-btn-sm ti-btn-success"
                              title="Save"
                            >
                              <i className="ri-check-line"></i>
                            </button>
                            <button
                              onClick={() => setEditingForecast(null)}
                              className="ti-btn ti-btn-sm ti-btn-outline-secondary"
                              title="Cancel"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdateClick(forecast)}
                              className="ti-btn ti-btn-sm ti-btn-outline-primary"
                              title="Update Actual Quantity"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            {onDeleteForecast && (
                              <button
                                onClick={() => handleDeleteClick(forecast.id)}
                                className="ti-btn ti-btn-sm ti-btn-outline-danger"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="box-footer border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className="ti-btn ti-btn-sm ti-btn-outline-secondary disabled:opacity-50"
              >
                <i className="ri-arrow-left-line"></i>
                Previous
              </button>
              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="ti-btn ti-btn-sm ti-btn-outline-secondary disabled:opacity-50"
              >
                Next
                <i className="ri-arrow-right-line"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 