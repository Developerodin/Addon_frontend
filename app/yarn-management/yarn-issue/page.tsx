"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface YarnIssue {
  id: string;
  issueNumber: string;
  issueDate: string;
  floor: string;
  productionOrder?: string;
  status: 'Pending' | 'Issued' | 'Received' | 'Cancelled';
  items: IssueItem[];
  issuedBy: string;
  receivedBy?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface IssueItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  yarnType: string;
  bomQuantity: number;
  requestedQuantity: number;
  issuedQuantity: number;
  unitPrice: number;
  totalValue: number;
  remarks?: string;
}

const YarnIssuePage = () => {
  const { hasSubPermission } = useNavigation();
  const [issues, setIssues] = useState<YarnIssue[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [floorFilter, setFloorFilter] = useState<string>("all");

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management', 'Yarn Issue');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn Issue.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const floors = [
    'Knitting Floor',
    'Linking Floor', 
    'Checking Floor',
    'Washing Floor',
    'Boarding Floor',
    'Branding Floor',
    'Final Checking Floor',
    'Machine Floor',
    'Warehouse Floor'
  ];

  // Sample data for demonstration
  useEffect(() => {
    const sampleIssues: YarnIssue[] = [
      {
        id: "1",
        issueNumber: "YI-2024-001",
        issueDate: "2024-01-15",
        floor: "Knitting Floor",
        productionOrder: "PO-2024-001",
        status: "Issued",
        items: [
          {
            id: "1",
            yarnCode: "COT-001",
            yarnName: "Cotton Yarn Premium",
            yarnType: "Cotton",
            bomQuantity: 100,
            requestedQuantity: 100,
            issuedQuantity: 95,
            unitPrice: 250,
            totalValue: 23750,
            remarks: "High quality cotton"
          }
        ],
        issuedBy: "John Doe",
        receivedBy: "Jane Smith",
        notes: "Urgent production requirement",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z"
      },
      {
        id: "2",
        issueNumber: "YI-2024-002",
        issueDate: "2024-01-14",
        floor: "Linking Floor",
        productionOrder: "PO-2024-002",
        status: "Pending",
        items: [
          {
            id: "2",
            yarnCode: "POL-002",
            yarnName: "Polyester Blend",
            yarnType: "Polyester",
            bomQuantity: 50,
            requestedQuantity: 50,
            issuedQuantity: 0,
            unitPrice: 180,
            totalValue: 0,
            remarks: "Durable polyester"
          }
        ],
        issuedBy: "Mike Johnson",
        notes: "Standard production order",
        createdAt: "2024-01-14T14:30:00Z",
        updatedAt: "2024-01-14T14:30:00Z"
      }
    ];
    setIssues(sampleIssues);
  }, []);

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm('Are you sure you want to delete this yarn issue?')) return;
    
    try {
      // TODO: Implement API call to delete yarn issue
      setIssues(prev => prev.filter(issue => issue.id !== issueId));
      toast.success('Yarn issue deleted successfully');
    } catch (error) {
      console.error('Failed to delete yarn issue:', error);
      toast.error('Failed to delete yarn issue');
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = 
      issue.issueNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.floor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.productionOrder && issue.productionOrder.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    const matchesFloor = floorFilter === "all" || issue.floor === floorFilter;
    
    return matchesSearch && matchesStatus && matchesFloor;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Issued': return 'bg-blue-100 text-blue-800';
      case 'Received': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalIssuedValue = issues.reduce((sum, issue) => 
    sum + issue.items.reduce((itemSum, item) => itemSum + item.totalValue, 0), 0
  );

  return (
    <div className="main-content">
      <Seo title="Yarn Issue" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn Issue</h1>
                <p className="text-gray-600 mt-1">Issue yarn to production floors</p>
              </div>
              <div className="box-tools">
              
                <Link 
                  href="/yarn-management/yarn-issue/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  New Issue
                </Link>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="box">
              <div className="box-body text-center">
                <div className="text-2xl font-bold text-blue-600">{issues.length}</div>
                <div className="text-sm text-gray-600">Total Issues</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {issues.filter(i => i.status === 'Pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending Issues</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-2xl font-bold text-green-600">
                  {issues.filter(i => i.status === 'Issued').length}
                </div>
                <div className="text-sm text-gray-600">Issued</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ₹{totalIssuedValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-col md:flex-row gap-4">
                <div >
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by issue number, floor, or production order..."
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
                    <option value="Issued">Issued</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <select
                    className="form-select"
                    value={floorFilter}
                    onChange={(e) => setFloorFilter(e.target.value)}
                  >
                    <option value="all">All Floors</option>
                    {floors.map(floor => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                  <button className="ti-btn ti-btn-light ">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Issues Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Yarn Issues ({filteredIssues.length})</h3>
            </div>
            <div className="box-body">
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-send-plane-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Yarn Issues</h3>
                  <p className="text-gray-500 mb-4">Start by creating your first yarn issue.</p>
                  <Link 
                    href="/yarn-management/yarn-issue/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Create First Issue
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Issue Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Floor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Production Order
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Issue Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          BOM Qty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredIssues.map((issue) => (
                        <tr key={issue.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {issue.issueNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.floor}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.productionOrder || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(issue.issueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                              {issue.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.items.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {issue.items.reduce((sum, item) => sum + item.bomQuantity, 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{issue.items.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link
                                href={`/yarn-management/yarn-issue/edit/${issue.id}`}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <button
                                onClick={() => handleDeleteIssue(issue.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line"></i>
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

export default YarnIssuePage;
