"use client";
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface Requisition {
  id: string;
  requisitionNumber: string;
  requestedBy: string;
  requestDate: string;
  requiredDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'In Process' | 'Completed';
  items: RequisitionItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface RequisitionItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  quantity: number;
  unit: string;
  purpose: string;
}

const RequisitionListPage = () => {
  const { hasSubPermission } = useNavigation();
  
  // Static requisitions data
  const staticRequisitions: Requisition[] = [
    {
      id: "1",
      requisitionNumber: "REQ-2024-001",
      requestedBy: "John Doe",
      requestDate: "2024-01-15T10:30:00Z",
      requiredDate: "2024-01-25T10:30:00Z",
      status: "Approved",
      items: [
        {
          id: "1",
          yarnCode: "CT40-001",
          yarnName: "Cotton Count 40",
          quantity: 200,
          unit: "kg",
          purpose: "Production order #1234"
        }
      ],
      notes: "Urgent requirement for production",
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-16T09:15:00Z"
    },
    {
      id: "2",
      requisitionNumber: "REQ-2024-002",
      requestedBy: "Jane Smith",
      requestDate: "2024-01-16T09:15:00Z",
      requiredDate: "2024-01-26T09:15:00Z",
      status: "Pending",
      items: [
        {
          id: "2",
          yarnCode: "PE150-002",
          yarnName: "Polyester DTY 150",
          quantity: 150,
          unit: "kg",
          purpose: "New product line"
        }
      ],
      notes: "Standard requisition",
      createdAt: "2024-01-16T09:15:00Z",
      updatedAt: "2024-01-16T09:15:00Z"
    },
    {
      id: "3",
      requisitionNumber: "REQ-2024-003",
      requestedBy: "Mike Johnson",
      requestDate: "2024-01-17T14:20:00Z",
      requiredDate: "2024-01-27T14:20:00Z",
      status: "In Process",
      items: [
        {
          id: "3",
          yarnCode: "VR30-003",
          yarnName: "Viscose Rayon 30",
          quantity: 180,
          unit: "kg",
          purpose: "Replacement stock"
        }
      ],
      notes: "Processing purchase order",
      createdAt: "2024-01-17T14:20:00Z",
      updatedAt: "2024-01-18T10:15:00Z"
    }
  ];

  const [requisitions, setRequisitions] = useState<Requisition[]>(staticRequisitions);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Requisition list');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Requisition list.</p>
          <Link href="/yarn-management/purchase-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Management
          </Link>
        </div>
      </div>
    );
  }

  const filteredRequisitions = requisitions.filter(req => {
    const matchesSearch = 
      req.requisitionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'In Process': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="main-content">
      <Seo title="Requisition list" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Requisition list</h1>
                <p className="text-gray-600 mt-1">Manage yarn requisition requests</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/requisition-list/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  New Requisition
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
                    placeholder="Search by requisition number or requester..."
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
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="In Process">In Process</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Requisitions Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Requisitions ({filteredRequisitions.length})</h3>
            </div>
            <div className="box-body">
              {filteredRequisitions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-file-list-3-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Requisitions</h3>
                  <p className="text-gray-500 mb-4">Start by creating your first requisition.</p>
                  <Link 
                    href="/yarn-management/purchase-management/requisition-list/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Create First Requisition
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requisition Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requested By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Request Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Required Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRequisitions.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {req.requisitionNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {req.requestedBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(req.requestDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(req.requiredDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(req.status)}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {req.items.length} item(s)
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

export default RequisitionListPage;

