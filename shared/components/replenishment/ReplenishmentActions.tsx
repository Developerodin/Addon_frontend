import React, { useState } from 'react';

interface ReplenishmentActionsProps {
  onGenerateForecast: (data: {
    store_id: string;
    product_id: string;
    forecast_month: string;
    historical_months?: number;
  }) => Promise<any>;
  onCalculateReplenishment: (data: {
    store_id: string;
    product_id: string;
    forecast_month: string;
    current_stock: number;
    safety_stock: number;
  }) => Promise<any>;
  loading: boolean;
}

export const ReplenishmentActions: React.FC<ReplenishmentActionsProps> = ({
  onGenerateForecast,
  onCalculateReplenishment,
  loading
}) => {
  const [showForecastModal, setShowForecastModal] = useState(false);
  const [showReplenishmentModal, setShowReplenishmentModal] = useState(false);
  const [forecastForm, setForecastForm] = useState({
    store_id: '',
    product_id: '',
    forecast_month: '',
    historical_months: 12
  });
  const [replenishmentForm, setReplenishmentForm] = useState({
    store_id: '',
    product_id: '',
    forecast_month: '',
    current_stock: 0,
    safety_stock: 0
  });

  const handleForecastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onGenerateForecast(forecastForm);
      setShowForecastModal(false);
      setForecastForm({ store_id: '', product_id: '', forecast_month: '', historical_months: 12 });
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    }
  };

  const handleReplenishmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onCalculateReplenishment(replenishmentForm);
      setShowReplenishmentModal(false);
      setReplenishmentForm({ store_id: '', product_id: '', forecast_month: '', current_stock: 0, safety_stock: 0 });
    } catch (error) {
      console.error('Failed to calculate replenishment:', error);
    }
  };

  return (
    <>
      <div className="box mb-6">
        <div className="box-header">
          <h3 className="box-title">Quick Actions</h3>
        </div>
        <div className="box-body">
          <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setShowForecastModal(true)}
          disabled={loading}
              className="ti-btn ti-btn-primary flex items-center gap-2 hover:scale-105 transition-transform"
        >
              <i className="ri-magic-line"></i>
          Generate Forecast
        </button>
            
        <button
          onClick={() => setShowReplenishmentModal(true)}
          disabled={loading}
              className="ti-btn ti-btn-warning flex items-center gap-2 hover:scale-105 transition-transform"
        >
              <i className="ri-calculator-line"></i>
          Calculate Replenishment
        </button>
          </div>
        </div>
      </div>

      {/* Forecast Modal */}
      {showForecastModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Generate New Forecast</h3>
              <button
                onClick={() => setShowForecastModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleForecastSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
                  <input
                    type="text"
                    value={forecastForm.store_id}
                    onChange={(e) => setForecastForm(prev => ({ ...prev, store_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter store ID"
                    required
                  />
                </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input
                    type="text"
                    value={forecastForm.product_id}
                    onChange={(e) => setForecastForm(prev => ({ ...prev, product_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter product ID"
                    required
                  />
                </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Month</label>
                <input
                  type="month"
                    value={forecastForm.forecast_month}
                    onChange={(e) => setForecastForm(prev => ({ ...prev, forecast_month: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                />
              </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Historical Months</label>
                <select
                    value={forecastForm.historical_months}
                    onChange={(e) => setForecastForm(prev => ({ ...prev, historical_months: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                    <option value={18}>18 months</option>
                    <option value={24}>24 months</option>
                </select>
              </div>
            </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Forecast'}
                </button>
              <button
                type="button"
                onClick={() => setShowForecastModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* Replenishment Modal */}
      {showReplenishmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Calculate Replenishment</h3>
              <button
                onClick={() => setShowReplenishmentModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleReplenishmentSubmit} className="p-4">
            <div className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store ID</label>
                  <input
                    type="text"
                    value={replenishmentForm.store_id}
                    onChange={(e) => setReplenishmentForm(prev => ({ ...prev, store_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter store ID"
                    required
                  />
                </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input
                    type="text"
                    value={replenishmentForm.product_id}
                    onChange={(e) => setReplenishmentForm(prev => ({ ...prev, product_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter product ID"
                    required
                  />
                </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Month</label>
                <input
                  type="month"
                    value={replenishmentForm.forecast_month}
                    onChange={(e) => setReplenishmentForm(prev => ({ ...prev, forecast_month: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                />
              </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                <input
                  type="number"
                    value={replenishmentForm.current_stock}
                    onChange={(e) => setReplenishmentForm(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter current stock"
                  min="0"
                    required
                />
              </div>
                
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safety Stock</label>
                  <input
                    type="number"
                    value={replenishmentForm.safety_stock}
                    onChange={(e) => setReplenishmentForm(prev => ({ ...prev, safety_stock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter safety stock"
                    min="0"
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-warning text-white px-4 py-2 rounded-md hover:bg-warning/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Calculating...' : 'Calculate Replenishment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReplenishmentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};