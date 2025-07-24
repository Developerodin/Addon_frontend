import React from 'react';
import { ForecastTrends, ForecastAccuracy, ModelInfo, Forecast } from '@/shared/services/replenishmentService';
import SafeChart from '@/shared/components/SafeChart';

interface ReplenishmentChartsProps {
  trends: ForecastTrends | null;
  accuracy: ForecastAccuracy | null;
  modelInfo: ModelInfo | null;
  loading: boolean;
  forecasts?: Forecast[]; // Add forecasts prop
}

export const ReplenishmentCharts: React.FC<ReplenishmentChartsProps> = ({
  trends,
  accuracy,
  modelInfo,
  loading,
  forecasts = []
}) => {
  // Generate chart data from forecasts if trends data is not available
  const generateChartDataFromForecasts = () => {
    if (!forecasts.length) return { accuracyData: [], predictionsData: [], categories: [] };

    // Group forecasts by month
    const monthlyData = forecasts.reduce((acc, forecast) => {
      const monthKey = new Date(forecast.forecast_month).toISOString().slice(0, 7); // YYYY-MM format
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: forecast.forecast_month,
          predictions: 0,
          totalAccuracy: 0,
          count: 0
        };
      }
      acc[monthKey].predictions += 1;
      acc[monthKey].totalAccuracy += forecast.accuracy || 0;
      acc[monthKey].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Convert to chart format
    const chartData = Object.values(monthlyData).map((item: any) => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      accuracy: item.count > 0 ? item.totalAccuracy / item.count : 0,
      predictions: item.predictions
    }));

    return {
      accuracyData: chartData,
      predictionsData: chartData.map(item => item.predictions),
      categories: chartData.map(item => item.month)
    };
  };

  // Use trends data if available, otherwise generate from forecasts
  const chartData = trends?.monthly_trends?.length > 0 
    ? {
        accuracyData: trends.monthly_trends.map(item => ({
          month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          accuracy: item.accuracy,
          predictions: item.total_predictions
        })),
        predictionsData: trends.monthly_trends.map(item => item.total_predictions),
        categories: trends.monthly_trends.map(item => 
          new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        )
      }
    : generateChartDataFromForecasts();

  const accuracyChartOptions = {
    chart: {
      type: 'line' as const,
      height: 300,
      toolbar: {
        show: false
      }
    },
    series: [
      {
        name: 'Accuracy %',
        data: chartData.accuracyData.map(item => Number(item.accuracy.toFixed(2)))
      }
    ],
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: '#6b7280'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Accuracy (%)',
        style: {
          color: '#6b7280'
        }
      },
      labels: {
        style: {
          colors: '#6b7280'
        },
        formatter: (value: number) => value.toFixed(2)
      }
    },
    colors: ['#3b82f6'],
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 100]
      }
    },
    markers: {
      size: 6,
      colors: ['#3b82f6'],
      strokeColors: '#ffffff',
      strokeWidth: 2
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 5
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (value: number) => `${value.toFixed(2)}%`
      }
    }
  };

  // Predictions Volume Chart
  const predictionsChartOptions = {
    chart: {
      type: 'bar' as const,
      height: 300,
      toolbar: {
        show: false
      }
    },
    series: [
      {
        name: 'Predictions',
        data: chartData.predictionsData
      }
    ],
    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: '#6b7280'
        }
      }
    },
    yaxis: {
      title: {
        text: 'Number of Predictions',
        style: {
          color: '#6b7280'
        }
      },
      labels: {
        style: {
          colors: '#6b7280'
        }
      }
    },
    colors: ['#10b981'],
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '60%',
        distributed: false
      }
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 5
    },
    tooltip: {
      theme: 'light'
    }
  };

  // Model Performance Chart
  const modelPerformanceData = modelInfo ? [
    { name: 'MAE', value: modelInfo.metrics.mae },
    { name: 'MAPE', value: modelInfo.metrics.mape },
    { name: 'RMSE', value: modelInfo.metrics.rmse },
    { name: 'R² Score', value: modelInfo.metrics.r2_score }
  ] : [];

  const modelPerformanceOptions = {
    chart: {
      type: 'radar' as const,
      height: 300,
      toolbar: {
        show: false
      }
    },
    series: [
      {
        name: 'Model Metrics',
        data: modelPerformanceData.map(item => item.value)
      }
    ],
    labels: modelPerformanceData.map(item => item.name),
    colors: ['#8b5cf6'],
    stroke: {
      width: 2
    },
    fill: {
      opacity: 0.3
    },
    markers: {
      size: 4
    },
    yaxis: {
      labels: {
        style: {
          colors: '#6b7280'
        }
      }
    }
  };

  // Feature Importance Chart
  const featureImportanceData = modelInfo?.feature_importance?.slice(0, 10) || [];

  const featureImportanceOptions = {
    chart: {
      type: 'bar' as const,
      height: 300,
      toolbar: {
        show: false
      }
    },
    series: [
      {
        name: 'Importance',
        data: featureImportanceData.map(item => item.importance_score)
      }
    ],
    xaxis: {
      categories: featureImportanceData.map(item => item.feature_name),
      labels: {
        style: {
          colors: '#6b7280'
        },
        rotate: -45,
        rotateAlways: false
      }
    },
    yaxis: {
      title: {
        text: 'Feature Importance',
        style: {
          color: '#6b7280'
        }
      },
      labels: {
        style: {
          colors: '#6b7280'
        }
      }
    },
    colors: ['#f59e0b'],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4
      }
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 5
    },
    tooltip: {
      theme: 'light'
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="box animate-pulse">
            <div className="box-header">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            </div>
            <div className="box-body">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Accuracy Trends */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Forecast Accuracy Trends</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Overall Accuracy: {accuracy?.overall_accuracy?.toFixed(1) || 0}%
            </span>
            </div>
        </div>
        <div className="box-body">
          {chartData.accuracyData.length > 0 ? (
              <SafeChart
              options={accuracyChartOptions}
              series={accuracyChartOptions.series}
                type="line"
              height={300}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <i className="ri-bar-chart-line text-4xl mb-2"></i>
              <p>No accuracy data available</p>
              <p className="text-sm mt-1">Generate some forecasts to see trends</p>
            </div>
          )}
        </div>
      </div>

      {/* Predictions Volume */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Predictions Volume</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Total Predictions: {accuracy?.total_predictions || 0}
            </span>
          </div>
        </div>
        <div className="box-body">
          {chartData.predictionsData.length > 0 ? (
              <SafeChart
              options={predictionsChartOptions}
              series={predictionsChartOptions.series}
              type="bar"
              height={300}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <i className="ri-bar-chart-line text-4xl mb-2"></i>
              <p>No predictions data available</p>
              <p className="text-sm mt-1">Generate some forecasts to see volume trends</p>
            </div>
          )}
        </div>
      </div>

      {/* Model Performance and Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance */}
      <div className="box">
        <div className="box-header">
            <h3 className="box-title">Model Performance Metrics</h3>
            {modelInfo && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  Version: {modelInfo.model_version}
                </span>
                <span className="text-sm text-gray-500">
                  Features: {modelInfo.features_count}
                </span>
                <span className="text-sm text-gray-500">
                  Samples: {modelInfo.training_samples}
                </span>
            </div>
          )}
        </div>
        <div className="box-body">
            {modelPerformanceData.length > 0 ? (
              <SafeChart
                options={modelPerformanceOptions}
                series={modelPerformanceOptions.series}
                type="radar"
                height={300}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="ri-radar-line text-4xl mb-2"></i>
                <p>No model metrics available</p>
                <p className="text-sm mt-1">Model information not loaded</p>
              </div>
            )}
          </div>
                </div>

        {/* Feature Importance */}
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Top Feature Importance</h3>
            {modelInfo && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Trained: {new Date(modelInfo.training_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          <div className="box-body">
            {featureImportanceData.length > 0 ? (
              <SafeChart
                options={featureImportanceOptions}
                series={featureImportanceOptions.series}
                type="bar"
                height={300}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <i className="ri-bar-chart-horizontal-line text-4xl mb-2"></i>
                <p>No feature importance data available</p>
                <p className="text-sm mt-1">Model information not loaded</p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Top Performing Stores and Products */}
      {(trends?.top_performing_stores?.length > 0 || trends?.top_performing_products?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Stores */}
          {trends?.top_performing_stores?.length > 0 && (
          <div className="box">
              <div className="box-header">
                <h3 className="box-title">Top Performing Stores</h3>
              </div>
              <div className="box-body">
                <div className="space-y-3">
                  {trends.top_performing_stores.slice(0, 5).map((store, index) => (
                    <div key={store.store_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{store.store_name}</div>
                          <div className="text-sm text-gray-500">{store.store_id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-success">{store.accuracy.toFixed(1)}%</div>
                        <div className="text-sm text-gray-500">{store.total_predictions} predictions</div>
            </div>
          </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Performing Products */}
          {trends?.top_performing_products?.length > 0 && (
          <div className="box">
              <div className="box-header">
                <h3 className="box-title">Top Performing Products</h3>
              </div>
              <div className="box-body">
                <div className="space-y-3">
                  {trends.top_performing_products.slice(0, 5).map((product, index) => (
                    <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-warning">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{product.product_name}</div>
                          <div className="text-sm text-gray-500">{product.product_id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-success">{product.accuracy.toFixed(1)}%</div>
                        <div className="text-sm text-gray-500">{product.total_predictions} predictions</div>
            </div>
          </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};