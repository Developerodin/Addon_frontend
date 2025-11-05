"use client";

import React, { useState, useMemo } from 'react';
import SafeChart from '@/shared/components/SafeChart';
import { OrderFulfilmentMetrics, ReportFilters } from '../types';

interface OrderFulfilmentReportProps {
  metrics: OrderFulfilmentMetrics[];
}

const OrderFulfilmentReport: React.FC<OrderFulfilmentReportProps> = ({ metrics }) => {
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Filter metrics
  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => {
      if (dateRange.from && m.date < dateRange.from) return false;
      if (dateRange.to && m.date > dateRange.to) return false;
      return true;
    });
  }, [metrics, dateRange]);

  // Calculate aggregated stats
  const aggregatedStats = useMemo(() => {
    const total = filteredMetrics.reduce((acc, m) => ({
      totalOrders: acc.totalOrders + m.totalOrders,
      fulfilledOrders: acc.fulfilledOrders + m.fulfilledOrders,
      pendingOrders: acc.pendingOrders + m.pendingOrders,
      cancelledOrders: acc.cancelledOrders + m.cancelledOrders,
      totalValue: acc.totalValue + m.totalValue,
      totalFulfillmentTime: acc.totalFulfillmentTime + (m.avgFulfillmentTime * m.fulfilledOrders),
      totalOnTime: acc.totalOnTime + (m.onTimeDeliveryRate * m.fulfilledOrders),
      totalFulfilled: acc.totalFulfilled + m.fulfilledOrders
    }), {
      totalOrders: 0,
      fulfilledOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      totalValue: 0,
      totalFulfillmentTime: 0,
      totalOnTime: 0,
      totalFulfilled: 0
    });

    const avgFulfillmentTime = total.totalFulfilled > 0
      ? total.totalFulfillmentTime / total.totalFulfilled
      : 0;
    const onTimeRate = total.totalFulfilled > 0
      ? total.totalOnTime / total.totalFulfilled
      : 0;
    const fulfillmentRate = total.totalOrders > 0
      ? (total.fulfilledOrders / total.totalOrders) * 100
      : 0;

    return {
      ...total,
      avgFulfillmentTime: Math.round(avgFulfillmentTime * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      fulfillmentRate: Math.round(fulfillmentRate * 10) / 10
    };
  }, [filteredMetrics]);

  // Chart data
  const chartData = useMemo(() => {
    const sorted = [...filteredMetrics].sort((a, b) => a.date.localeCompare(b.date));
    return {
      dates: sorted.map(m => m.date),
      totalOrders: sorted.map(m => m.totalOrders),
      fulfilledOrders: sorted.map(m => m.fulfilledOrders),
      pendingOrders: sorted.map(m => m.pendingOrders),
      fulfillmentRate: sorted.map(m => m.fulfillmentRate),
      onTimeRate: sorted.map(m => m.onTimeDeliveryRate)
    };
  }, [filteredMetrics]);

  // Channel distribution
  const channelData = useMemo(() => {
    const total = filteredMetrics.reduce((acc, m) => ({
      online: acc.online + m.byChannel.online,
      offline: acc.offline + m.byChannel.offline,
      wholesale: acc.wholesale + m.byChannel.wholesale
    }), { online: 0, offline: 0, wholesale: 0 });

    const totalOrders = total.online + total.offline + total.wholesale;
    return {
      labels: ['Online', 'Offline', 'Wholesale'],
      series: totalOrders > 0
        ? [
            (total.online / totalOrders) * 100,
            (total.offline / totalOrders) * 100,
            (total.wholesale / totalOrders) * 100
          ]
        : [0, 0, 0],
      counts: [total.online, total.offline, total.wholesale]
    };
  }, [filteredMetrics]);

  // Chart options
  const trendChartOptions = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: true }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    markers: {
      size: 4
    },
    xaxis: {
      categories: chartData.dates,
      labels: {
        rotate: -45,
        style: { fontSize: '11px' }
      }
    },
    yaxis: {
      title: { text: 'Number of Orders' }
    },
    legend: {
      position: 'top'
    },
    colors: ['#008FFB', '#00E396', '#FFB020', '#FF4560'],
    tooltip: {
      shared: true,
      intersect: false
    }
  };

  const trendChartSeries = [
    { name: 'Total Orders', data: chartData.totalOrders },
    { name: 'Fulfilled', data: chartData.fulfilledOrders },
    { name: 'Pending', data: chartData.pendingOrders }
  ];

  const rateChartOptions = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: true }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    markers: {
      size: 4
    },
    xaxis: {
      categories: chartData.dates,
      labels: {
        rotate: -45,
        style: { fontSize: '11px' }
      }
    },
    yaxis: {
      title: { text: 'Percentage (%)' },
      min: 0,
      max: 100
    },
    legend: {
      position: 'top'
    },
    colors: ['#00E396', '#008FFB'],
    tooltip: {
      shared: true,
      intersect: false
    }
  };

  const rateChartSeries = [
    { name: 'Fulfillment Rate', data: chartData.fulfillmentRate },
    { name: 'On-Time Delivery Rate', data: chartData.onTimeRate }
  ];

  const channelChartOptions = {
    chart: {
      type: 'donut',
      toolbar: { show: false }
    },
    labels: channelData.labels,
    colors: ['#008FFB', '#00E396', '#FFB020'],
    legend: {
      position: 'bottom'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Filters</h3>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Date From</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Date To</label>
              <input
                type="date"
                className="form-control"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{aggregatedStats.totalOrders.toLocaleString()}</p>
              </div>
              <i className="ri-file-list-line text-3xl text-blue-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fulfillment Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{aggregatedStats.fulfillmentRate.toFixed(1)}%</p>
              </div>
              <i className="ri-checkbox-circle-line text-3xl text-green-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Fulfillment Time</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{aggregatedStats.avgFulfillmentTime.toFixed(1)}h</p>
              </div>
              <i className="ri-time-line text-3xl text-purple-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On-Time Delivery</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{aggregatedStats.onTimeRate.toFixed(1)}%</p>
              </div>
              <i className="ri-truck-line text-3xl text-orange-500"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Order Trends</h3>
          </div>
          <div className="box-body">
            <SafeChart
              type="line"
              height={350}
              series={trendChartSeries}
              options={trendChartOptions}
              chartTitle="Order Trends"
            />
          </div>
        </div>

        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Performance Rates</h3>
          </div>
          <div className="box-body">
            <SafeChart
              type="line"
              height={350}
              series={rateChartSeries}
              options={rateChartOptions}
              chartTitle="Performance Rates"
            />
          </div>
        </div>
      </div>

      {/* Channel Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Orders by Channel</h3>
          </div>
          <div className="box-body">
            <SafeChart
              type="donut"
              height={350}
              series={channelData.series}
              options={channelChartOptions}
              chartTitle="Channel Distribution"
            />
          </div>
        </div>

        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Channel Statistics</h3>
          </div>
          <div className="box-body">
            <div className="space-y-4">
              {channelData.labels.map((label, index) => (
                <div key={label} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                    <span className="text-lg font-bold text-gray-900">
                      {channelData.counts[index].toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${channelData.series[index]}%`,
                        backgroundColor: channelChartOptions.colors[index]
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {channelData.series[index].toFixed(1)}% of total orders
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Metrics Table */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Daily Fulfillment Metrics</h3>
        </div>
        <div className="box-body">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fulfilled</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMetrics.slice(0, 30).map((metric) => (
                  <tr key={metric.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{metric.date}</td>
                    <td className="px-4 py-3 text-sm text-right">{metric.totalOrders}</td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">{metric.fulfilledOrders}</td>
                    <td className="px-4 py-3 text-sm text-right text-yellow-600">{metric.pendingOrders}</td>
                    <td className="px-4 py-3 text-sm text-right">{metric.fulfillmentRate.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm text-right">{metric.avgFulfillmentTime.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-sm text-right">₹{metric.totalValue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderFulfilmentReport;

