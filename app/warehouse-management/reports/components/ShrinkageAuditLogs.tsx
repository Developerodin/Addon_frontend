"use client";

import React, { useState, useMemo } from 'react';
import SafeChart from '@/shared/components/SafeChart';
import { ShrinkageRecord, AuditLog, ReportFilters } from '../types';

interface ShrinkageAuditLogsProps {
  shrinkageRecords: ShrinkageRecord[];
  auditLogs: AuditLog[];
}

const ShrinkageAuditLogs: React.FC<ShrinkageAuditLogsProps> = ({
  shrinkageRecords,
  auditLogs
}) => {
  const [activeTab, setActiveTab] = useState<'shrinkage' | 'audit'>('shrinkage');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Filter shrinkage records
  const filteredShrinkage = useMemo(() => {
    let filtered = [...shrinkageRecords];

    if (dateRange.from) {
      filtered = filtered.filter(r => r.date >= dateRange.from);
    }
    if (dateRange.to) {
      filtered = filtered.filter(r => r.date <= dateRange.to);
    }
    if (filters.type) {
      filtered = filtered.filter(r => r.type === filters.type);
    }
    if (filters.severity) {
      filtered = filtered.filter(r => r.severity === filters.severity);
    }
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.sku) {
      filtered = filtered.filter(r => r.sku.toLowerCase().includes(filters.sku!.toLowerCase()));
    }

    return filtered;
  }, [shrinkageRecords, dateRange, filters]);

  // Filter audit logs
  const filteredAuditLogs = useMemo(() => {
    let filtered = [...auditLogs];

    const fromDate = dateRange.from ? new Date(dateRange.from).toISOString() : '';
    const toDate = dateRange.to ? new Date(dateRange.to + 'T23:59:59').toISOString() : '';

    if (fromDate) {
      filtered = filtered.filter(log => log.timestamp >= fromDate);
    }
    if (toDate) {
      filtered = filtered.filter(log => log.timestamp <= toDate);
    }
    if (filters.user) {
      filtered = filtered.filter(log => log.user.toLowerCase().includes(filters.user!.toLowerCase()));
    }
    if (filters.type) {
      filtered = filtered.filter(log => log.entityType === filters.type);
    }

    return filtered;
  }, [auditLogs, dateRange, filters]);

  // Shrinkage statistics
  const shrinkageStats = useMemo(() => {
    const byType = filteredShrinkage.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = filteredShrinkage.reduce((acc, r) => {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = filteredShrinkage.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = filteredShrinkage.reduce((sum, r) => sum + r.value, 0);
    const totalQuantity = filteredShrinkage.reduce((sum, r) => sum + r.quantity, 0);

    // Daily trend
    const dailyTrend = filteredShrinkage.reduce((acc, r) => {
      if (!acc[r.date]) {
        acc[r.date] = { count: 0, value: 0 };
      }
      acc[r.date].count += 1;
      acc[r.date].value += r.value;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const sortedDates = Object.keys(dailyTrend).sort();
    const trendData = {
      dates: sortedDates,
      counts: sortedDates.map(d => dailyTrend[d].count),
      values: sortedDates.map(d => dailyTrend[d].value)
    };

    return {
      total: filteredShrinkage.length,
      totalValue,
      totalQuantity,
      byType,
      bySeverity,
      byStatus,
      trendData
    };
  }, [filteredShrinkage]);

  // Audit log statistics
  const auditStats = useMemo(() => {
    const byUser = filteredAuditLogs.reduce((acc, log) => {
      acc[log.user] = (acc[log.user] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byEntityType = filteredAuditLogs.reduce((acc, log) => {
      acc[log.entityType] = (acc[log.entityType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byAction = filteredAuditLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily trend
    const dailyTrend = filteredAuditLogs.reduce((acc, log) => {
      const date = log.timestamp.split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedDates = Object.keys(dailyTrend).sort();
    const trendData = {
      dates: sortedDates,
      counts: sortedDates.map(d => dailyTrend[d])
    };

    return {
      total: filteredAuditLogs.length,
      byUser,
      byEntityType,
      byAction,
      trendData
    };
  }, [filteredAuditLogs]);

  // Chart options for shrinkage
  const shrinkageTypeChartOptions = {
    chart: {
      type: 'donut',
      toolbar: { show: false }
    },
    labels: Object.keys(shrinkageStats.byType),
    colors: ['#FF4560', '#FF9800', '#FEB019', '#00E396', '#008FFB'],
    legend: {
      position: 'bottom'
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`
    }
  };

  const shrinkageTypeChartSeries = Object.values(shrinkageStats.byType);

  const shrinkageTrendChartOptions = {
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
      categories: shrinkageStats.trendData.dates,
      labels: {
        rotate: -45,
        style: { fontSize: '11px' }
      }
    },
    yaxis: {
      title: { text: 'Count' }
    },
    colors: ['#FF4560'],
    tooltip: {
      shared: true,
      intersect: false
    }
  };

  const shrinkageTrendChartSeries = [{
    name: 'Shrinkage Events',
    data: shrinkageStats.trendData.counts
  }];

  // Chart options for audit logs
  const auditTrendChartOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: true }
    },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3
      }
    },
    xaxis: {
      categories: auditStats.trendData.dates,
      labels: {
        rotate: -45,
        style: { fontSize: '11px' }
      }
    },
    yaxis: {
      title: { text: 'Number of Actions' }
    },
    colors: ['#008FFB'],
    tooltip: {
      shared: true,
      intersect: false
    }
  };

  const auditTrendChartSeries = [{
    name: 'Audit Actions',
    data: auditStats.trendData.counts
  }];

  const auditEntityChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false }
    },
    plotOptions: {
      bar: { horizontal: true }
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: Object.keys(auditStats.byEntityType)
    },
    colors: ['#00E396']
  };

  const auditEntityChartSeries = [{
    data: Object.values(auditStats.byEntityType)
  }];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="box">
        <div className="box-body p-0">
          <div className="border-b border-gray-200">
            <nav className="flex" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('shrinkage')}
                className={`flex-1 px-6 py-4 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'shrinkage'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <i className="ri-alert-line text-xl"></i>
                  <div>
                    <div className="font-semibold">Shrinkage</div>
                    <div className="text-xs text-gray-500">{shrinkageStats.total} records</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex-1 px-6 py-4 text-center border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'audit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <i className="ri-file-list-3-line text-xl"></i>
                  <div>
                    <div className="font-semibold">Audit Logs</div>
                    <div className="text-xs text-gray-500">{auditStats.total} records</div>
                  </div>
                </div>
              </button>
            </nav>
          </div>
        </div>
      </div>

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
            {activeTab === 'shrinkage' ? (
              <>
                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-control"
                    value={filters.type || ''}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
                  >
                    <option value="">All Types</option>
                    <option value="damage">Damage</option>
                    <option value="theft">Theft</option>
                    <option value="expiry">Expiry</option>
                    <option value="error">Error</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Severity</label>
                  <select
                    className="form-control"
                    value={filters.severity || ''}
                    onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
                  >
                    <option value="">All Severities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="form-label">User</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search user..."
                    value={filters.user || ''}
                    onChange={(e) => setFilters({ ...filters, user: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label className="form-label">Entity Type</label>
                  <select
                    className="form-control"
                    value={filters.type || ''}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
                  >
                    <option value="">All Types</option>
                    <option value="order">Order</option>
                    <option value="stock">Stock</option>
                    <option value="rack">Rack</option>
                    <option value="system">System</option>
                    <option value="user">User</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Shrinkage Tab Content */}
      {activeTab === 'shrinkage' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Events</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{shrinkageStats.total}</p>
                  </div>
                  <i className="ri-alert-line text-3xl text-red-500"></i>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">₹{shrinkageStats.totalValue.toLocaleString()}</p>
                  </div>
                  <i className="ri-money-rupee-circle-line text-3xl text-orange-500"></i>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Quantity</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{shrinkageStats.totalQuantity.toLocaleString()}</p>
                  </div>
                  <i className="ri-shopping-bag-line text-3xl text-purple-500"></i>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Resolved</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {shrinkageStats.byStatus.resolved || 0} / {shrinkageStats.total}
                    </p>
                  </div>
                  <i className="ri-checkbox-circle-line text-3xl text-green-500"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="box">
              <div className="box-header">
                <h3 className="box-title">Shrinkage by Type</h3>
              </div>
              <div className="box-body">
                <SafeChart
                  type="donut"
                  height={350}
                  series={shrinkageTypeChartSeries}
                  options={shrinkageTypeChartOptions}
                  chartTitle="Shrinkage by Type"
                />
              </div>
            </div>

            <div className="box">
              <div className="box-header">
                <h3 className="box-title">Shrinkage Trend</h3>
              </div>
              <div className="box-body">
                <SafeChart
                  type="line"
                  height={350}
                  series={shrinkageTrendChartSeries}
                  options={shrinkageTrendChartOptions}
                  chartTitle="Shrinkage Trend"
                />
              </div>
            </div>
          </div>

          {/* Shrinkage Records Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Shrinkage Records</h3>
            </div>
            <div className="box-body">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredShrinkage.slice(0, 50).map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div>{record.date}</div>
                          <div className="text-xs text-gray-500">{record.time}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{record.productName}</div>
                          <div className="text-xs text-gray-500">{record.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {record.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            record.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            record.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {record.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">{record.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">₹{record.value.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.location}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            record.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            record.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Audit Logs Tab Content */}
      {activeTab === 'audit' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Actions</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{auditStats.total.toLocaleString()}</p>
                  </div>
                  <i className="ri-file-list-3-line text-3xl text-blue-500"></i>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unique Users</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{Object.keys(auditStats.byUser).length}</p>
                  </div>
                  <i className="ri-user-line text-3xl text-green-500"></i>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Entity Types</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{Object.keys(auditStats.byEntityType).length}</p>
                  </div>
                  <i className="ri-folder-line text-3xl text-purple-500"></i>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Action Types</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{Object.keys(auditStats.byAction).length}</p>
                  </div>
                  <i className="ri-settings-3-line text-3xl text-orange-500"></i>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="box">
              <div className="box-header">
                <h3 className="box-title">Audit Actions Trend</h3>
              </div>
              <div className="box-body">
                <SafeChart
                  type="area"
                  height={350}
                  series={auditTrendChartSeries}
                  options={auditTrendChartOptions}
                  chartTitle="Audit Actions Trend"
                />
              </div>
            </div>

            <div className="box">
              <div className="box-header">
                <h3 className="box-title">Actions by Entity Type</h3>
              </div>
              <div className="box-body">
                <SafeChart
                  type="bar"
                  height={350}
                  series={auditEntityChartSeries}
                  options={auditEntityChartOptions}
                  chartTitle="Actions by Entity"
                />
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Audit Logs</h3>
            </div>
            <div className="box-body">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAuditLogs.slice(0, 100).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{log.user}</div>
                          <div className="text-xs text-gray-500">{log.userRole}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{log.entityName}</div>
                          <div className="text-xs text-gray-500">{log.entityType} • {log.entityId}</div>
                          {log.changes && log.changes.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {log.changes.length} change(s)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.ipAddress}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShrinkageAuditLogs;

