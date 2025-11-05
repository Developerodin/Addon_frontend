"use client";

import React, { useMemo } from 'react';
import SafeChart from '@/shared/components/SafeChart';
import { Rack, SKUMovement, MaintenanceNotification, RackUtilization } from '../types';

interface AnalyticsDashboardProps {
  racks: Rack[];
  skuMovements: SKUMovement[];
  maintenanceNotifications: MaintenanceNotification[];
  rackUtilization: RackUtilization[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  racks,
  skuMovements,
  maintenanceNotifications,
  rackUtilization
}) => {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalRacks = racks.length;
    const activeRacks = racks.filter(r => r.status === 'active').length;
    const maintenanceRacks = racks.filter(r => r.status === 'maintenance').length;
    const blockedRacks = racks.filter(r => r.status === 'blocked').length;
    
    const totalItems = racks.reduce((sum, rack) => 
      sum + rack.shelves.reduce((sSum, shelf) => 
        sSum + shelf.baskets.reduce((bSum, basket) => bSum + basket.items.length, 0), 0
      ), 0
    );
    
    const avgUtilization = racks.reduce((sum, r) => sum + r.utilization, 0) / racks.length;
    
    const fastMoving = skuMovements.filter(m => m.movementType === 'fast').length;
    const slowMoving = skuMovements.filter(m => m.movementType === 'slow').length;
    
    return {
      totalRacks,
      activeRacks,
      maintenanceRacks,
      blockedRacks,
      totalItems,
      avgUtilization: Math.round(avgUtilization),
      fastMoving,
      slowMoving
    };
  }, [racks, skuMovements]);

  // Rack utilization heatmap data
  const heatmapData = useMemo(() => {
    const zones = ['A', 'B', 'C', 'D'];
    const data: { x: string; y: number; value: number }[] = [];
    
    zones.forEach(zone => {
      const zoneRacks = racks.filter(r => r.zone === zone);
      zoneRacks.forEach(rack => {
        data.push({
          x: `${zone}-R${rack.row}`,
          y: rack.position,
          value: rack.utilization
        });
      });
    });
    
    return data;
  }, [racks]);

  // Utilization distribution chart
  const utilizationDistribution = useMemo(() => {
    const ranges = [
      { label: '0-25%', count: 0 },
      { label: '25-50%', count: 0 },
      { label: '50-75%', count: 0 },
      { label: '75-100%', count: 0 }
    ];
    
    racks.forEach(rack => {
      if (rack.utilization < 25) ranges[0].count++;
      else if (rack.utilization < 50) ranges[1].count++;
      else if (rack.utilization < 75) ranges[2].count++;
      else ranges[3].count++;
    });
    
    return {
      labels: ranges.map(r => r.label),
      series: ranges.map(r => r.count)
    };
  }, [racks]);

  // SKU movement chart
  const skuMovementData = useMemo(() => {
    const fast = skuMovements.filter(m => m.movementType === 'fast').length;
    const medium = skuMovements.filter(m => m.movementType === 'medium').length;
    const slow = skuMovements.filter(m => m.movementType === 'slow').length;
    
    return {
      labels: ['Fast Moving', 'Medium Moving', 'Slow Moving'],
      series: [fast, medium, slow]
    };
  }, [skuMovements]);

  // Top racks by utilization
  const topRacks = useMemo(() => {
    return [...rackUtilization]
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 10);
  }, [rackUtilization]);

  const heatmapOptions = {
    chart: {
      type: 'heatmap',
      toolbar: { show: false }
    },
    dataLabels: { enabled: true },
    colors: ['#008FFB'],
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        colorScale: {
          ranges: [
            { from: 0, to: 25, color: '#E3F2FD' },
            { from: 25, to: 50, color: '#90CAF9' },
            { from: 50, to: 75, color: '#42A5F5' },
            { from: 75, to: 100, color: '#1E88E5' }
          ]
        }
      }
    },
    xaxis: {
      type: 'category',
      labels: { rotate: -45 }
    },
    title: {
      text: 'Rack Utilization Heatmap',
      style: { fontSize: '16px', fontWeight: 600 }
    }
  };

  const utilizationChartOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false }
    },
    plotOptions: {
      bar: { horizontal: true }
    },
    dataLabels: { enabled: true },
    xaxis: {
      categories: utilizationDistribution.labels
    },
    colors: ['#008FFB'],
    title: {
      text: 'Utilization Distribution',
      style: { fontSize: '16px', fontWeight: 600 }
    }
  };

  const skuMovementChartOptions = {
    chart: {
      type: 'donut',
      toolbar: { show: false }
    },
    labels: skuMovementData.labels,
    colors: ['#00E396', '#FEB019', '#FF4560'],
    legend: {
      position: 'bottom'
    },
    title: {
      text: 'SKU Movement Types',
      style: { fontSize: '16px', fontWeight: 600 }
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Racks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRacks}</p>
              </div>
              <div className="text-3xl text-blue-500">
                <i className="ri-stack-line"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Racks</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeRacks}</p>
              </div>
              <div className="text-3xl text-green-500">
                <i className="ri-checkbox-circle-line"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Utilization</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{stats.avgUtilization}%</p>
              </div>
              <div className="text-3xl text-purple-500">
                <i className="ri-bar-chart-line"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="box">
          <div className="box-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.totalItems}</p>
              </div>
              <div className="text-3xl text-orange-500">
                <i className="ri-shopping-bag-line"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="box">
          <div className="box-body">
            <SafeChart
              type="heatmap"
              height={350}
              series={[{
                name: 'Utilization',
                data: heatmapData.map(d => ({
                  x: d.x,
                  y: d.y,
                  value: d.value
                }))
              }]}
              options={heatmapOptions}
              chartTitle="Rack Utilization Heatmap"
            />
          </div>
        </div>

        <div className="box">
          <div className="box-body">
            <SafeChart
              type="bar"
              height={350}
              series={[{ data: utilizationDistribution.series }]}
              options={utilizationChartOptions}
              chartTitle="Utilization Distribution"
            />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="box">
          <div className="box-body">
            <SafeChart
              type="donut"
              height={350}
              series={skuMovementData.series}
              options={skuMovementChartOptions}
              chartTitle="SKU Movement Types"
            />
          </div>
        </div>

        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Top Racks by Utilization</h3>
          </div>
          <div className="box-body">
            <div className="space-y-3">
              {topRacks.map((rack, index) => (
                <div key={rack.rackId} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{rack.rackName}</span>
                      <span className="text-sm font-semibold text-gray-700">{rack.utilization}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${rack.utilization}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {rack.totalItems} items / {rack.capacity} capacity
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Notifications */}
      {maintenanceNotifications.length > 0 && (
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Maintenance & Blocked Rack Notifications</h3>
          </div>
          <div className="box-body">
            <div className="space-y-3">
              {maintenanceNotifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    notif.type === 'maintenance' 
                      ? 'bg-yellow-50 border-yellow-500' 
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          notif.type === 'maintenance' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {notif.type.toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">{notif.rackName}</span>
                      </div>
                      <p className="text-sm text-gray-600">{notif.reason}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reported: {new Date(notif.reportedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      notif.status === 'active' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {notif.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fast vs Slow Moving SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Fast Moving SKUs</h3>
          </div>
          <div className="box-body">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {skuMovements
                .filter(m => m.movementType === 'fast')
                .slice(0, 20)
                .map((movement, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{movement.name}</span>
                      <span className="text-sm font-semibold text-green-600">Qty: {movement.quantity}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      SKU: {movement.sku} • Rack: {movement.rackId}
                    </div>
                  </div>
                ))}
              {skuMovements.filter(m => m.movementType === 'fast').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No fast moving SKUs</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Slow Moving SKUs</h3>
          </div>
          <div className="box-body">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {skuMovements
                .filter(m => m.movementType === 'slow')
                .slice(0, 20)
                .map((movement, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{movement.name}</span>
                      <span className="text-sm font-semibold text-red-600">Qty: {movement.quantity}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      SKU: {movement.sku} • Rack: {movement.rackId}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      Last moved: {new Date(movement.lastMovement).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              {skuMovements.filter(m => m.movementType === 'slow').length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No slow moving SKUs</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

