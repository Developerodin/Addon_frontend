"use client";
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface StorageLocation {
  id: string;
  locationCode: string;
  locationName: string;
  warehouse: string;
  capacity: number;
  currentStock: number;
  status: 'Active' | 'Full' | 'Maintenance' | 'Inactive';
  items: StorageItem[];
  createdAt: string;
  updatedAt: string;
}

interface StorageItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  storedDate: string;
  expiryDate?: string;
  condition: 'Good' | 'Fair' | 'Poor';
}

const YarnStoragePage = () => {
  const { hasSubPermission } = useNavigation();
  
  // Static storage locations data
  const staticStorageLocations: StorageLocation[] = [
    {
      id: "1",
      locationCode: "WH-A-001",
      locationName: "Warehouse A - Section 1",
      warehouse: "Main Warehouse",
      capacity: 10000,
      currentStock: 7500,
      status: "Active",
      items: [
        {
          id: "1",
          yarnCode: "CT40-001",
          yarnName: "Cotton Count 40",
          batchNumber: "BATCH-001",
          quantity: 200,
          unit: "kg",
          storedDate: "2024-01-25T10:30:00Z",
          condition: "Good"
        }
      ],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-25T10:30:00Z"
    },
    {
      id: "2",
      locationCode: "WH-A-002",
      locationName: "Warehouse A - Section 2",
      warehouse: "Main Warehouse",
      capacity: 8000,
      currentStock: 8000,
      status: "Full",
      items: [
        {
          id: "2",
          yarnCode: "PE150-002",
          yarnName: "Polyester DTY 150",
          batchNumber: "BATCH-002",
          quantity: 150,
          unit: "kg",
          storedDate: "2024-01-20T14:30:00Z",
          condition: "Good"
        }
      ],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-20T14:30:00Z"
    },
    {
      id: "3",
      locationCode: "WH-B-001",
      locationName: "Warehouse B - Section 1",
      warehouse: "Secondary Warehouse",
      capacity: 5000,
      currentStock: 3200,
      status: "Active",
      items: [
        {
          id: "3",
          yarnCode: "VR30-003",
          yarnName: "Viscose Rayon 30",
          batchNumber: "BATCH-003",
          quantity: 180,
          unit: "kg",
          storedDate: "2024-01-22T09:15:00Z",
          condition: "Fair"
        }
      ],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-22T09:15:00Z"
    }
  ];

  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(staticStorageLocations);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Yarn Storage');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn Storage.</p>
          <Link href="/yarn-management/purchase-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Management
          </Link>
        </div>
      </div>
    );
  }

  const filteredLocations = storageLocations.filter(location => {
    const matchesSearch = 
      location.locationCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.warehouse.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || location.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Full': return 'bg-yellow-100 text-yellow-800';
      case 'Maintenance': return 'bg-orange-100 text-orange-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCapacityPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  return (
    <div className="main-content">
      <Seo title="Yarn Storage" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn Storage</h1>
                <p className="text-gray-600 mt-1">Manage yarn storage locations and inventory</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/yarn-storage/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  New Storage Location
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by location code, name or warehouse..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Full">Full</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Locations Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Storage Locations ({filteredLocations.length})</h3>
            </div>
            <div className="box-body">
              {filteredLocations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-stack-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Storage Locations</h3>
                  <p className="text-gray-500 mb-4">Start by creating your first storage location.</p>
                  <Link 
                    href="/yarn-management/purchase-management/yarn-storage/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Create First Location
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Warehouse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredLocations.map((location) => (
                        <tr key={location.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {location.locationCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.locationName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.warehouse}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {location.capacity.toLocaleString()} kg
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1">
                                <div className="text-sm text-gray-900">
                                  {location.currentStock.toLocaleString()} kg
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      getCapacityPercentage(location.currentStock, location.capacity) > 90 
                                        ? 'bg-red-500' 
                                        : getCapacityPercentage(location.currentStock, location.capacity) > 70 
                                        ? 'bg-yellow-500' 
                                        : 'bg-green-500'
                                    }`}
                                    style={{ width: `${getCapacityPercentage(location.currentStock, location.capacity)}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {getCapacityPercentage(location.currentStock, location.capacity)}% full
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(location.status)}`}>
                              {location.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  toast.info('View details functionality coming soon');
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Details"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <button
                                onClick={() => {
                                  toast.info('Edit functionality coming soon');
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Edit"
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YarnStoragePage;

