"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import HelpIcon from "@/shared/components/HelpIcon";
import { API_BASE_URL } from "@/shared/data/utilities/api";

interface Machine {
  _id?: string;
  id?: string;
  machineCode: string;
  machineNumber: string;
  needleSize: string;
  model: string;
  floor: string;
  installationDate: string;
  maintenanceRequirement: string;
  capacityPerShift?: number;
  capacityPerDay?: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  assignedSupervisor?: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'Active' | 'Under Maintenance' | 'Idle';
  isActive: boolean;
  maintenanceNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface MachineUsageAnalytics {
  machine: {
    id: string;
    machineCode: string;
    machineNumber: string;
    model: string;
    floor: string;
    status: string;
    capacityPerShift: number;
    capacityPerDay: number;
  };
  usage: {
    totalArticles: number;
    totalOrders: number;
    totalPlannedQuantity: number;
    totalCompletedQuantity: number;
    averageProgress: number;
  };
  capacity: {
    dailyCapacity: number;
    shiftCapacity: number;
    dailyUtilization: number;
    shiftUtilization: number;
  };
  orders: Array<{
    articleId: string;
    articleNumber: string;
    plannedQuantity: number;
    progress: number;
    status: string;
    priority: string;
    startedAt: string;
  }>;
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

interface MachineCurrentStatus {
  machine: {
    id: string;
    machineCode: string;
    machineNumber: string;
    model: string;
    floor: string;
    status: string;
    capacityPerShift: number;
    capacityPerDay: number;
    installationDate: string;
    lastMaintenanceDate: string;
    nextMaintenanceDate: string;
    needsMaintenance: boolean;
  };
  currentWorkload: {
    activeArticles: number;
    totalPlannedQuantity: number;
    capacityUtilization: number;
  };
  activeArticles: Array<{
    articleId: string;
    articleNumber: string;
    orderId: string;
    orderNumber: string;
    plannedQuantity: number;
    progress: number;
    priority: string;
    startedAt: string;
    currentFloor: string;
  }>;
  recentActivity: {
    totalArticles: number;
    completedArticles: number;
    averageProgress: number;
  };
  lastUpdated: string;
}

interface MachineWorkload {
  machine: {
    id: string;
    machineCode: string;
    machineNumber: string;
    floor: string;
    capacityPerShift: number;
    capacityPerDay: number;
  };
  date: string;
  workload: {
    totalArticles: number;
    totalPlannedQuantity: number;
    totalCompletedQuantity: number;
    remainingQuantity: number;
    completionRate: number;
  };
  capacity: {
    dailyCapacity: number;
    shiftCapacity: number;
    dailyUtilization: number;
    shiftUtilization: number;
    capacityAvailable: number;
  };
  articles: Array<{
    articleId: string;
    articleNumber: string;
    orderId: string;
    orderNumber: string;
    plannedQuantity: number;
    progress: number;
    priority: string;
    status: string;
  }>;
}

interface MachinePerformanceMetrics {
  machine: {
    id: string;
    machineCode: string;
    machineNumber: string;
    floor: string;
    capacityPerShift: number;
    capacityPerDay: number;
  };
  period: {
    startDate: string;
    endDate: string;
    duration: number;
  };
  performance: {
    totalArticles: number;
    completedArticles: number;
    completionRate: number;
    totalPlannedQuantity: number;
    totalCompletedQuantity: number;
    throughput: number;
    averageProcessingTime: number;
    averageProgress: number;
  };
  efficiency: {
    dailyCapacity: number;
    shiftCapacity: number;
    dailyUtilization: number;
    shiftUtilization: number;
    capacityEfficiency: number;
  };
  quality: {
    totalDefects: number;
    defectRate: number;
  };
}

const MachineFloorPage = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [machineAnalytics, setMachineAnalytics] = useState<MachineUsageAnalytics | null>(null);
  const [machineStatus, setMachineStatus] = useState<MachineCurrentStatus | null>(null);
  const [machineWorkload, setMachineWorkload] = useState<MachineWorkload | null>(null);
  const [machinePerformance, setMachinePerformance] = useState<MachinePerformanceMetrics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Helper function to get machine ID
  const getMachineId = (machine: Machine): string => {
    return machine._id || machine.id || '';
  };

  // Fetch machines from API
  const fetchMachines = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/machines?page=1&limit=1000`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch machines');
      }
      
      const data = await response.json();
      const machinesArray = Array.isArray(data.results) ? data.results : [];
      setMachines(machinesArray);
    } catch (error) {
      console.error('Error fetching machines:', error);
      toast.error('Failed to load machines');
      setMachines([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch machine analytics
  const fetchMachineAnalytics = async (machineId: string) => {
    try {
      setAnalyticsLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      const endDate = new Date();
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        period: 'daily'
      });

      const url = `${API_BASE_URL}/machines/${machineId}/usage-analytics?${params}`;
      console.log('Fetching analytics from:', url);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Analytics data received:', data);
        setMachineAnalytics(data);
      } else {
        console.error('Analytics API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching machine analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch machine current status
  const fetchMachineStatus = async (machineId: string) => {
    try {
      const url = `${API_BASE_URL}/machines/${machineId}/current-status`;
      console.log('Fetching status from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Status data received:', data);
        setMachineStatus(data);
      } else {
        console.error('Status API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching machine status:', error);
    }
  };

  // Fetch machine workload
  const fetchMachineWorkload = async (machineId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const url = `${API_BASE_URL}/machines/${machineId}/workload?date=${today}`;
      console.log('Fetching workload from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Workload data received:', data);
        setMachineWorkload(data);
      } else {
        console.error('Workload API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching machine workload:', error);
    }
  };

  // Fetch machine performance metrics
  const fetchMachinePerformance = async (machineId: string) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      const url = `${API_BASE_URL}/machines/${machineId}/performance-metrics?${params}`;
      console.log('Fetching performance from:', url);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Performance data received:', data);
        setMachinePerformance(data);
      } else {
        console.error('Performance API error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching machine performance:', error);
    }
  };

  // Handle machine details view
  const handleViewMachineDetails = async (machine: Machine) => {
    console.log('Opening machine details for:', machine);
    setSelectedMachine(machine);
    setShowDetailsModal(true);
    
    const machineId = getMachineId(machine);
    console.log('Machine ID:', machineId);
    
    // Fetch all related data
    await Promise.all([
      fetchMachineAnalytics(machineId),
      fetchMachineStatus(machineId),
      fetchMachineWorkload(machineId),
      fetchMachinePerformance(machineId)
    ]);
  };

  // Load machines on component mount
  useEffect(() => {
    fetchMachines();
  }, []);

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = machine.machineCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         machine.machineNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         machine.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         machine.floor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || machine.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      'Active': 'bg-green-100 text-green-800',
      'Idle': 'bg-yellow-100 text-yellow-800',
      'Under Maintenance': 'bg-orange-100 text-orange-800',
      'Offline': 'bg-red-100 text-red-800'
    };
    return statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600';
    if (efficiency >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedMachine(null);
    setMachineAnalytics(null);
    setMachineStatus(null);
    setMachineWorkload(null);
    setMachinePerformance(null);
  };

  return (
    <div className="main-content">
      <Seo title="Machine Floor Dashboard"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Machine Dashboard</h1>
                <HelpIcon
                  title="Machine Floor Dashboard"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This is the Machine Floor Dashboard where you can monitor and manage all production machines on the floor.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Monitor Machines:</strong> View real-time status of all machines</li>
                          <li><strong>Track Efficiency:</strong> Monitor machine performance and efficiency</li>
                          <li><strong>Maintenance Schedule:</strong> View maintenance schedules and history</li>
                          <li><strong>Current Orders:</strong> See which machines are processing which orders</li>
                          <li><strong>Filter & Search:</strong> Use filters and search to find specific machines</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="box-tools flex items-center space-x-2">
                <button 
                  type="button" 
                  className="ti-btn ti-btn-light"
                  onClick={() => window.location.reload()}
                  disabled={isLoading}
                  title="Refresh Data"
                >
                  <i className={`ri-refresh-line me-2 ${isLoading ? 'animate-spin' : ''}`}></i> Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="box bg-gradient-to-r from-green-500 to-green-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Active Machines</p>
                    <p className="text-2xl font-bold text-white">
                      {machines.filter(m => m.status === 'Active').length}
                    </p>
                  </div>
                  <div className="text-green-200">
                    <i className="ri-cog-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="box bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">Idle Machines</p>
                    <p className="text-2xl font-bold text-white">
                      {machines.filter(m => m.status === 'Idle').length}
                    </p>
                  </div>
                  <div className="text-yellow-200">
                    <i className="ri-pause-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="box bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Under Maintenance</p>
                    <p className="text-2xl font-bold text-white">
                      {machines.filter(m => m.status === 'Maintenance').length}
                    </p>
                  </div>
                  <div className="text-orange-200">
                    <i className="ri-tools-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="box bg-gradient-to-r from-red-500 to-red-600 text-white">
              <div className="box-body p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Offline Machines</p>
                    <p className="text-2xl font-bold text-white">
                      {machines.filter(m => m.status === 'Offline').length}
                    </p>
                  </div>
                  <div className="text-red-200">
                    <i className="ri-error-warning-line text-3xl"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search and Filters Header */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* Search Bar */}
                  <div className="w-full sm:w-80 lg:w-96">
                    <div className="relative">
                      <input
                        type="text"
                        className="form-control py-3 pl-10 pr-4 w-full"
                        placeholder="Search machines by name, type, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <i className="ri-search-line text-lg absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Status:</label>
                    <select
                      className="form-select form-select-sm w-32"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Idle">Idle</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Offline">Offline</option>
                    </select>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading machines...</p>
                  </div>
                </div>
              ) : filteredMachines.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-cog-line text-6xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No machines found</h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery || statusFilter 
                      ? 'Try adjusting your search terms or filters' 
                      : 'No machines available on the floor'
                    }
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Machine</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Floor</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Status</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Supervisor</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Last Maintenance</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Next Maintenance</th>
                        <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMachines.map((machine) => (
                        <tr 
                          key={getMachineId(machine)}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">
                                {machine.machineCode}
                              </div>
                              <div className="text-sm text-gray-600">
                                {machine.machineNumber} - {machine.model}
                              </div>
                              <div className="text-xs text-gray-500">
                                Needle: {machine.needleSize}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">{machine.floor}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(machine.status)}`}>
                              {machine.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">
                              {machine.assignedSupervisor?.name || 'Not Assigned'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">
                              {machine.lastMaintenanceDate ? new Date(machine.lastMaintenanceDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm text-gray-900">
                              {machine.nextMaintenanceDate ? new Date(machine.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button 
                              className="ti-btn ti-btn-primary ti-btn-sm"
                              onClick={() => handleViewMachineDetails(machine)}
                              title="View Analytics & Details"
                            >
                              <i className="ri-bar-chart-line"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Machine Details Modal */}
      {showDetailsModal && selectedMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Machine Analytics - {selectedMachine.machineCode}</h3>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Machine Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-600">Machine Details</label>
                <div className="mt-1 space-y-1">
                  <div className="text-sm text-gray-900">
                    <strong>Code:</strong> {selectedMachine.machineCode}
                  </div>
                  <div className="text-sm text-gray-900">
                    <strong>Number:</strong> {selectedMachine.machineNumber}
                  </div>
                  <div className="text-sm text-gray-900">
                    <strong>Model:</strong> {selectedMachine.model}
                  </div>
                  <div className="text-sm text-gray-900">
                    <strong>Floor:</strong> {selectedMachine.floor}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status & Maintenance</label>
                <div className="mt-1 space-y-1">
                  <div className="text-sm text-gray-900">
                    <strong>Status:</strong> 
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedMachine.status)}`}>
                      {selectedMachine.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-900">
                    <strong>Supervisor:</strong> {selectedMachine.assignedSupervisor?.name || 'Not Assigned'}
                  </div>
                  <div className="text-sm text-gray-900">
                    <strong>Last Maintenance:</strong> {selectedMachine.lastMaintenanceDate ? new Date(selectedMachine.lastMaintenanceDate).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-900">
                    <strong>Next Maintenance:</strong> {selectedMachine.nextMaintenanceDate ? new Date(selectedMachine.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Tabs */}
            <div className="space-y-6">
              {/* Current Status */}
              {machineStatus && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Current Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{machineStatus.machine.status}</div>
                      <div className="text-sm text-gray-600">Current Status</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{machineStatus.currentWorkload.activeArticles}</div>
                      <div className="text-sm text-gray-600">Active Articles</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{machineStatus.recentActivity.averageProgress}%</div>
                      <div className="text-sm text-gray-600">Avg Progress</div>
                    </div>
                  </div>
                  
                  {/* Active Articles */}
                  {machineStatus.activeArticles && machineStatus.activeArticles.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Active Articles</h5>
                      <div className="space-y-2">
                        {machineStatus.activeArticles.map((article, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-900">{article.articleNumber}</div>
                                <div className="text-sm text-gray-600">Order: {article.orderNumber}</div>
                                <div className="text-sm text-gray-600">Qty: {article.plannedQuantity.toLocaleString()}</div>
                                {/* Note: M4 quantity would need to be added to the machine status API response */}
                              </div>
                              <div className="text-right">
                                <div className={`text-xs px-2 py-1 rounded mb-1 ${
                                  article.priority === 'High' ? 'bg-red-100 text-red-800' :
                                  article.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {article.priority}
                                </div>
                                <div className="text-sm font-medium text-blue-600">{article.progress}%</div>
                                <div className="text-xs text-gray-500">{article.currentFloor}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4 text-xs text-gray-500">
                    Last Updated: {new Date(machineStatus.lastUpdated).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              {machinePerformance && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics (Last 30 Days)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">{machinePerformance.performance.completionRate}%</div>
                      <div className="text-sm text-gray-600">Completion Rate</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">{machinePerformance.performance.totalCompletedQuantity.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Total Production</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-xl font-bold text-orange-600">{machinePerformance.efficiency.capacityEfficiency}%</div>
                      <div className="text-sm text-gray-600">Capacity Efficiency</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-xl font-bold text-purple-600">{machinePerformance.quality.defectRate}%</div>
                      <div className="text-sm text-gray-600">Defect Rate</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">Throughput</div>
                      <div className="text-lg font-bold text-gray-900">{machinePerformance.performance.throughput.toLocaleString()} units</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">Total Defects</div>
                      <div className="text-lg font-bold text-gray-900">{machinePerformance.quality.totalDefects.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workload */}
              {machineWorkload && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Today's Workload</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <div className="text-xl font-bold text-indigo-600">{machineWorkload.workload.totalArticles}</div>
                      <div className="text-sm text-gray-600">Total Articles</div>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-lg">
                      <div className="text-xl font-bold text-teal-600">{machineWorkload.workload.completionRate}%</div>
                      <div className="text-sm text-gray-600">Completion Rate</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">{machineWorkload.workload.totalPlannedQuantity.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Planned Qty</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{machineWorkload.workload.totalCompletedQuantity.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Completed Qty</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{machineWorkload.workload.remainingQuantity.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Remaining Qty</div>
                    </div>
                  </div>
                  
                  {machineWorkload.articles && machineWorkload.articles.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Articles</h5>
                      <div className="space-y-2">
                        {machineWorkload.articles.map((article, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-gray-900">{article.articleNumber}</div>
                              <div className="text-sm text-gray-600">Order: {article.orderNumber}</div>
                              <div className="text-sm text-gray-600">Qty: {article.plannedQuantity.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xs px-2 py-1 rounded mb-1 ${
                                article.priority === 'High' ? 'bg-red-100 text-red-800' :
                                article.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {article.priority}
                              </div>
                              <div className="text-sm font-medium text-blue-600">{article.progress}%</div>
                              <div className="text-xs text-gray-500">{article.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Usage Analytics */}
              {machineAnalytics && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Usage Analytics (Last 30 Days)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">{machineAnalytics.usage.totalArticles}</div>
                      <div className="text-sm text-gray-600">Total Articles</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">{machineAnalytics.usage.totalOrders}</div>
                      <div className="text-sm text-gray-600">Total Orders</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-xl font-bold text-purple-600">{machineAnalytics.usage.averageProgress}%</div>
                      <div className="text-sm text-gray-600">Avg Progress</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-indigo-50 rounded-lg">
                      <div className="text-lg font-bold text-indigo-600">{machineAnalytics.usage.totalPlannedQuantity.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Planned Quantity</div>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-lg">
                      <div className="text-lg font-bold text-teal-600">{machineAnalytics.usage.totalCompletedQuantity.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">Completed Quantity</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{machineAnalytics.capacity.dailyUtilization}%</div>
                      <div className="text-sm text-gray-600">Daily Utilization</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-lg font-bold text-red-600">{machineAnalytics.capacity.shiftUtilization}%</div>
                      <div className="text-sm text-gray-600">Shift Utilization</div>
                    </div>
                  </div>
                  
                  {machineAnalytics.orders && machineAnalytics.orders.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Recent Orders</h5>
                      <div className="space-y-2">
                        {machineAnalytics.orders.map((order, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-gray-900">{order.articleNumber}</div>
                              <div className="text-sm text-gray-600">Qty: {order.plannedQuantity.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                              <div className={`text-xs px-2 py-1 rounded mb-1 ${
                                order.priority === 'High' ? 'bg-red-100 text-red-800' :
                                order.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {order.priority}
                              </div>
                              <div className="text-sm font-medium text-blue-600">{order.progress}%</div>
                              <div className="text-xs text-gray-500">{order.status}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {analyticsLoading && (
                <div className="flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Loading analytics...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
              <button
                onClick={closeDetailsModal}
                className="ti-btn ti-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineFloorPage;
