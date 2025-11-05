"use client";

import React, { useState, useMemo } from 'react';
import SafeChart from '@/shared/components/SafeChart';
import { StockFlowRecord, ReportFilters } from '../types';

interface DailyStockFlowReportProps {
  records: StockFlowRecord[];
}

const DailyStockFlowReport: React.FC<DailyStockFlowReportProps> = ({ records }) => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Filter records
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    if (dateRange.from) {
      filtered = filtered.filter(r => r.date >= dateRange.from);
    }
    if (dateRange.to) {
      filtered = filtered.filter(r => r.date <= dateRange.to);
    }
    if (filters.zone) {
      filtered = filtered.filter(r => r.zone === filters.zone);
    }
    if (filters.rackId) {
      filtered = filtered.filter(r => r.rackId === filters.rackId);
    }
    if (filters.sku) {
      filtered = filtered.filter(r => r.sku.toLowerCase().includes(filters.sku!.toLowerCase()));
    }
    if (filters.type) {
      filtered = filtered.filter(r => r.type === filters.type);
    }

    return filtered;
  }, [records, dateRange, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const stockIn = filteredRecords.filter(r => r.type === 'stock-in');
    const stockOut = filteredRecords.filter(r => r.type === 'stock-out');
    const totalIn = stockIn.reduce((sum, r) => sum + r.quantity, 0);
    const totalOut = stockOut.reduce((sum, r) => sum + r.quantity, 0);
    const netFlow = totalIn - totalOut;

    // Group by date
    const dailyFlow = filteredRecords.reduce((acc, r) => {
      if (!acc[r.date]) {
        acc[r.date] = { in: 0, out: 0 };
      }
      if (r.type === 'stock-in') {
        acc[r.date].in += r.quantity;
      } else {
        acc[r.date].out += r.quantity;
      }
      return acc;
    }, {} as Record<string, { in: number; out: number }>);

    const sortedDates = Object.keys(dailyFlow).sort();
    const chartData = {
      dates: sortedDates,
      stockIn: sortedDates.map(d => dailyFlow[d].in),
      stockOut: sortedDates.map(d => dailyFlow[d].out),
      net: sortedDates.map(d => dailyFlow[d].in - dailyFlow[d].out)
    };

    return {
      totalIn,
      totalOut,
      netFlow,
      totalTransactions: filteredRecords.length,
      chartData
    };
  }, [filteredRecords]);

  // Chart options
  const flowChartOptions = {
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
      categories: stats.chartData.dates,
      labels: {
        rotate: -45,
        style: { fontSize: '11px' }
      }
    },
    yaxis: {
      title: { text: 'Quantity' }
    },
    legend: {
      position: 'top'
    },
    colors: ['#00E396', '#FF4560', '#008FFB'],
    tooltip: {
      shared: true,
      intersect: false
    }
  };

  const flowChartSeries = [
    { name: 'Stock In', data: stats.chartData.stockIn },
    { name: 'Stock Out', data: stats.chartData.stockOut },
    { name: 'Net Flow', data: stats.chartData.net }
  ];

  // Top products by movement
  const topProducts = useMemo(() => {
    const productMap = filteredRecords.reduce((acc, r) => {
      if (!acc[r.sku]) {
        acc[r.sku] = { name: r.productName, in: 0, out: 0 };
      }
      if (r.type === 'stock-in') {
        acc[r.sku].in += r.quantity;
      } else {
        acc[r.sku].out += r.quantity;
      }
      return acc;
    }, {} as Record<string, { name: string; in: number; out: number }>);

    return Object.entries(productMap)
      .map(([sku, data]) => ({
        sku,
        name: data.name,
        total: data.in + data.out,
        in: data.in,
        out: data.out
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Filters</h3>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <label className="form-label">Zone</label>
              <select
                className="form-control"
                value={filters.zone || ''}
                onChange={(e) => setFilters({ ...filters, zone: e.target.value || undefined })}
              >
                <option value="">All Zones</option>
                <option value="A">Zone A</option>
                <option value="B">Zone B</option>
                <option value="C">Zone C</option>
                <option value="D">Zone D</option>
              </select>
            </div>
            <div>
              <label className="form-label">Type</label>
              <select
                className="form-control"
                value={filters.type || ''}
                onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
              >
                <option value="">All Types</option>
                <option value="stock-in">Stock In</option>
                <option value="stock-out">Stock Out</option>
              </select>
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
                <p className="text-sm text-gray-600">Total Stock In</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalIn.toLocaleString()}</p>
              </div>
              <i className="ri-arrow-down-line text-3xl text-green-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock Out</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.totalOut.toLocaleString()}</p>
              </div>
              <i className="ri-arrow-up-line text-3xl text-red-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Flow</p>
                <p className={`text-2xl font-bold mt-1 ${stats.netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {stats.netFlow >= 0 ? '+' : ''}{stats.netFlow.toLocaleString()}
                </p>
              </div>
              <i className="ri-exchange-line text-3xl text-blue-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalTransactions.toLocaleString()}</p>
              </div>
              <i className="ri-file-list-line text-3xl text-purple-500"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Daily Stock Flow Trend</h3>
        </div>
        <div className="box-body">
          <SafeChart
            type="line"
            height={400}
            series={flowChartSeries}
            options={flowChartOptions}
            chartTitle="Daily Stock Flow"
          />
        </div>
      </div>

      {/* Top Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Top Products by Movement</h3>
          </div>
          <div className="box-body">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">In</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Out</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.map((product, index) => (
                    <tr key={product.sku} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-gray-500 text-xs">{product.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600">{product.in.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600">{product.out.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{product.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Recent Transactions</h3>
          </div>
          <div className="box-body">
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredRecords.slice(0, 20).map((record) => (
                <div
                  key={record.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    record.type === 'stock-in'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{record.productName}</span>
                    <span className={`text-sm font-semibold ${
                      record.type === 'stock-in' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {record.type === 'stock-in' ? '+' : '-'}{record.quantity}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {record.date} {record.time} • {record.location} • {record.reason}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {record.operator} • {record.documentNumber}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyStockFlowReport;

