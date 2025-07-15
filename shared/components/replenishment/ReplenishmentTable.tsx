import React, { useState } from 'react';
import { Replenishment, Forecast } from '@/shared/services/replenishmentService';

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
  formatMonth: (month: string) => string;
  calculateDeviation: (forecastQty: number, actualQty?: number) => number | null;
  getAccuracyColor: (accuracy: number) => string;
  getDeviationColor: (deviation: number) => string;
}

const ReplenishmentTable: React.FC<ReplenishmentTableProps> = ({
  forecasts,
  replenishments,
  loading,
  pagination,
  onPageChange,
  onUpdateForecast,
  formatMonth,
  calculateDeviation,
  getAccuracyColor,
  getDeviationColor
}) => {
  const [editingForecast, setEditingForecast] = useState<string | null>(null);
  const [actualQtyInputs, setActualQtyInputs] = useState<Record<string, string>>({});

  // Combine forecasts and replenishments data
  const combinedData = forecasts.map(forecast => {
    const replenishment = replenishments.find(r => 
      r.store.id === forecast.store.id && 
      r.product.id === forecast.product.id && 
      r.month === forecast.month
    );

    return {
      forecast,
      replenishment,
      deviation: calculateDeviation(forecast.forecastQty, forecast.actualQty)
    };
  });

  const handleUpdateForecast = async (forecastId: string) => {
    const actualQty = parseInt(actualQtyInputs[forecastId] || '');
    if (isNaN(actualQty) || actualQty < 0) {
      alert('Please enter a valid quantity');
      return;
    }

    try {
      console.log('Updating forecast:', forecastId, 'with actual qty:', actualQty);
      await onUpdateForecast(forecastId, actualQty);
      setEditingForecast(null);
      setActualQtyInputs(prev => {
        const newState = { ...prev };
        delete newState[forecastId];
        return newState;
      });
    } catch (error) {
      console.error('Failed to update forecast:', error);
    }
  };

  const handleEditClick = (forecastId: string, currentActualQty?: number) => {
    console.log('Edit clicked for forecast:', forecastId, 'current qty:', currentActualQty);
    setEditingForecast(forecastId);
    setActualQtyInputs(prev => ({
      ...prev,
      [forecastId]: currentActualQty?.toString() || ''
    }));
  };

  if (loading) {
    return (
      <div className="box">
        <div className="box-body">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (combinedData.length === 0) {
    return (
      <div className="box">
        <div className="box-body">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="ri-database-2-line text-2xl text-gray-400"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
            <p className="text-gray-500">No replenishment data available for the selected filters.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="box">
      <div className="box-header">
        <h3 className="box-title">Replenishment Data</h3>
        <div className="box-tools">
          <span className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalResults)} of{' '}
            {pagination.totalResults} results
          </span>
        </div>
      </div>
      <div className="box-body">
        <div className="overflow-x-auto">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Store</th>
                <th>Product</th>
                <th>Month</th>
                <th>Forecast Qty</th>
                <th>Actual Sales Qty</th>
                <th>Current Stock</th>
                <th>Replenishment Qty</th>
                <th>Deviation</th>
                <th>Accuracy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {combinedData.map(({ forecast, replenishment, deviation }) => (
                <tr key={forecast.id}>
                  <td>
                    <div>
                      <div className="font-medium">{forecast.store.storeName}</div>
                      <div className="text-sm text-gray-500">{forecast.store.storeId}</div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <div className="font-medium">{forecast.product.name}</div>
                      <div className="text-sm text-gray-500">{forecast.product.styleCode}</div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-primary/10 text-primary">
                      {formatMonth(forecast.month)}
                    </span>
                  </td>
                  <td>
                    <span className="font-medium">{forecast.forecastQty.toLocaleString()}</span>
                  </td>
                  <td>
                    {editingForecast === forecast.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          className="form-control w-20"
                          value={actualQtyInputs[forecast.id] || ''}
                          onChange={(e) => setActualQtyInputs(prev => ({
                            ...prev,
                            [forecast.id]: e.target.value
                          }))}
                          min="0"
                        />
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-success"
                          onClick={() => handleUpdateForecast(forecast.id)}
                        >
                          <i className="ri-check-line"></i>
                        </button>
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-secondary"
                          onClick={() => {
                            setEditingForecast(null);
                            setActualQtyInputs(prev => {
                              const newState = { ...prev };
                              delete newState[forecast.id];
                              return newState;
                            });
                          }}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {forecast.actualQty ? forecast.actualQty.toLocaleString() : 'N/A'}
                        </span>
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-outline-primary"
                          onClick={() => handleEditClick(forecast.id, forecast.actualQty)}
                        >
                          <i className="ri-edit-line"></i>
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="font-medium">
                      {replenishment?.currentStock?.toLocaleString() || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span className="font-medium text-warning">
                      {replenishment?.replenishmentQty?.toLocaleString() || 'N/A'}
                    </span>
                  </td>
                  <td>
                    {deviation !== null ? (
                      <span className={`font-medium ${getDeviationColor(deviation)}`}>
                        {deviation === 0 ? '0.0%' : 
                         deviation > 0 ? `+${deviation.toFixed(1)}%` : 
                         `${deviation.toFixed(1)}%`}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td>
                    {forecast.accuracy ? (
                      <span className={`font-medium ${getAccuracyColor(forecast.accuracy)}`}>
                        {forecast.accuracy.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        className="ti-btn ti-btn-sm ti-btn-outline-secondary"
                        onClick={() => handleEditClick(forecast.id, forecast.actualQty)}
                        title="Update Actual Sales"
                      >
                        <i className="ri-edit-line"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="ti-btn ti-btn-sm ti-btn-outline-secondary"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
              >
                <i className="ri-arrow-left-s-line"></i>
                Previous
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-sm ti-btn-outline-secondary"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
                <i className="ri-arrow-right-s-line"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplenishmentTable; 