"use client";

import React, { useState, useMemo } from 'react';
import SafeChart from '@/shared/components/SafeChart';
import { RackUtilizationData, ReportFilters } from '../types';

interface RackUtilizationReportProps {
  data: RackUtilizationData[];
}

const RackUtilizationReport: React.FC<RackUtilizationReportProps> = ({ data }) => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [sortBy, setSortBy] = useState<'utilization' | 'capacity' | 'items'>('utilization');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (filters.zone) {
      filtered = filtered.filter(r => r.zone === filters.zone);
    }
    if (filters.rackId) {
      filtered = filtered.filter(r => r.rackId === filters.rackId);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      switch (sortBy) {
        case 'utilization':
          aValue = a.utilization;
          bValue = b.utilization;
          break;
        case 'capacity':
          aValue = a.capacity;
          bValue = b.capacity;
          break;
        case 'items':
          aValue = a.currentItems;
          bValue = b.currentItems;
          break;
        default:
          return 0;
      }
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [data, filters, sortBy, sortOrder]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = filteredData.reduce((acc, r) => ({
      totalRacks: acc.totalRacks + 1,
      totalCapacity: acc.totalCapacity + r.capacity,
      totalItems: acc.totalItems + r.currentItems,
      utilization: acc.utilization + r.utilization
    }), {
      totalRacks: 0,
      totalCapacity: 0,
      totalItems: 0,
      utilization: 0
    });

    const avgUtilization = total.totalRacks > 0 ? total.utilization / total.totalRacks : 0;
    const overallUtilization = total.totalCapacity > 0
      ? (total.totalItems / total.totalCapacity) * 100
      : 0;

    // Utilization distribution
    const distribution = {
      low: filteredData.filter(r => r.utilization < 50).length,
      medium: filteredData.filter(r => r.utilization >= 50 && r.utilization < 75).length,
      high: filteredData.filter(r => r.utilization >= 75 && r.utilization < 90).length,
      critical: filteredData.filter(r => r.utilization >= 90).length
    };

    // By zone
    const byZone = filteredData.reduce((acc, r) => {
      if (!acc[r.zone]) {
        acc[r.zone] = { racks: 0, capacity: 0, items: 0, utilization: 0 };
      }
      acc[r.zone].racks += 1;
      acc[r.zone].capacity += r.capacity;
      acc[r.zone].items += r.currentItems;
      acc[r.zone].utilization += r.utilization;
      return acc;
    }, {} as Record<string, { racks: number; capacity: number; items: number; utilization: number }>);

    Object.keys(byZone).forEach(zone => {
      byZone[zone].utilization = byZone[zone].racks > 0
        ? byZone[zone].utilization / byZone[zone].racks
        : 0;
    });

    return {
      ...total,
      avgUtilization: Math.round(avgUtilization * 10) / 10,
      overallUtilization: Math.round(overallUtilization * 10) / 10,
      distribution,
      byZone
    };
  }, [filteredData]);

  // Chart data
  const distributionChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false }
    },
    plotOptions: {
      bar: { horizontal: true }
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: ['Low (0-50%)', 'Medium (50-75%)', 'High (75-90%)', 'Critical (90-100%)']
    },
    colors: ['#00E396', '#FEB019', '#FF9800', '#FF4560'],
    title: {
      text: 'Rack Utilization Distribution',
      style: { fontSize: '16px', fontWeight: 600 }
    }
  };

  const distributionChartSeries = [{
    data: [
      stats.distribution.low,
      stats.distribution.medium,
      stats.distribution.high,
      stats.distribution.critical
    ]
  }];

  const zoneChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false }
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: Object.keys(stats.byZone)
    },
    yaxis: {
      title: { text: 'Average Utilization (%)' },
      min: 0,
      max: 100
    },
    colors: ['#008FFB'],
    title: {
      text: 'Utilization by Zone',
      style: { fontSize: '16px', fontWeight: 600 }
    }
  };

  const zoneChartSeries = [{
    name: 'Utilization',
    data: Object.keys(stats.byZone).map(zone => Math.round(stats.byZone[zone].utilization * 10) / 10)
  }];

  // Top racks
  const topRacks = useMemo(() => {
    return [...filteredData]
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 10);
  }, [filteredData]);

  // Low utilization racks
  const lowUtilizationRacks = useMemo(() => {
    return [...filteredData]
      .filter(r => r.utilization < 30)
      .sort((a, b) => a.utilization - b.utilization)
      .slice(0, 10);
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Filters & Sort</h3>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="form-label">Sort By</label>
              <select
                className="form-control"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="utilization">Utilization</option>
                <option value="capacity">Capacity</option>
                <option value="items">Items</option>
              </select>
            </div>
            <div>
              <label className="form-label">Order</label>
              <select
                className="form-control"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="ti-btn ti-btn-secondary w-full"
              >
                <i className="ri-refresh-line me-2"></i>
                Reset Filters
              </button>
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
                <p className="text-sm text-gray-600">Total Racks</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalRacks}</p>
              </div>
              <i className="ri-stack-line text-3xl text-blue-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Capacity</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalCapacity.toLocaleString()}</p>
              </div>
              <i className="ri-database-line text-3xl text-purple-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.totalItems.toLocaleString()}</p>
              </div>
              <i className="ri-shopping-bag-line text-3xl text-green-500"></i>
            </div>
          </div>
        </div>
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.avgUtilization.toFixed(1)}%</p>
              </div>
              <i className="ri-bar-chart-line text-3xl text-orange-500"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Utilization Distribution</h3>
          </div>
          <div className="box-body">
            <SafeChart
              type="bar"
              height={350}
              series={distributionChartSeries}
              options={distributionChartOptions}
              chartTitle="Utilization Distribution"
            />
          </div>
        </div>

        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Utilization by Zone</h3>
          </div>
          <div className="box-body">
            <SafeChart
              type="bar"
              height={350}
              series={zoneChartSeries}
              options={zoneChartOptions}
              chartTitle="Zone Utilization"
            />
          </div>
        </div>
      </div>

      {/* Top Racks & Low Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Top 10 Racks by Utilization</h3>
          </div>
          <div className="box-body">
            <div className="space-y-3">
              {topRacks.map((rack, index) => (
                <div key={rack.rackId} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{rack.rackName}</div>
                        <div className="text-xs text-gray-500">{rack.zone} • Row {rack.row}, Pos {rack.position}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{rack.utilization.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">{rack.currentItems}/{rack.capacity}</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        rack.utilization >= 90 ? 'bg-red-500' :
                        rack.utilization >= 75 ? 'bg-orange-500' :
                        rack.utilization >= 50 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${rack.utilization}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Low Utilization Racks (Less than 30%)</h3>
          </div>
          <div className="box-body">
            <div className="space-y-3">
              {lowUtilizationRacks.length > 0 ? (
                lowUtilizationRacks.map((rack) => (
                  <div key={rack.rackId} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{rack.rackName}</div>
                        <div className="text-xs text-gray-500">{rack.zone} • Row {rack.row}, Pos {rack.position}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-yellow-600">{rack.utilization.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">{rack.currentItems}/{rack.capacity}</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${rack.utilization}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <i className="ri-checkbox-circle-line text-4xl mb-2"></i>
                  <p>No low utilization racks found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rack Details Table */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">All Racks</h3>
        </div>
        <div className="box-body">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rack</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Capacity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((rack) => (
                  <tr key={rack.rackId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{rack.rackName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rack.zone}</td>
                    <td className="px-4 py-3 text-sm text-right">{rack.currentItems}</td>
                    <td className="px-4 py-3 text-sm text-right">{rack.capacity}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`font-semibold ${
                          rack.utilization >= 90 ? 'text-red-600' :
                          rack.utilization >= 75 ? 'text-orange-600' :
                          rack.utilization >= 50 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {rack.utilization.toFixed(1)}%
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              rack.utilization >= 90 ? 'bg-red-500' :
                              rack.utilization >= 75 ? 'bg-orange-500' :
                              rack.utilization >= 50 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${rack.utilization}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rack.utilization >= 90 ? 'bg-red-100 text-red-800' :
                        rack.utilization >= 75 ? 'bg-orange-100 text-orange-800' :
                        rack.utilization >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {rack.utilization >= 90 ? 'Critical' :
                         rack.utilization >= 75 ? 'High' :
                         rack.utilization >= 50 ? 'Medium' : 'Low'}
                      </span>
                    </td>
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

export default RackUtilizationReport;

