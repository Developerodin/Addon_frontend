"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface YarnReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  floor: string;
  issueNumber?: string;
  productionOrder?: string;
  status: 'Pending' | 'Received' | 'Verified' | 'Rejected' | 'Cancelled';
  items: ReturnItem[];
  returnedBy: string;
  receivedBy?: string;
  verifiedBy?: string;
  reason: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ReturnItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  yarnType: string;
  issuedQuantity: number;
  returnedQuantity: number;
  condition: 'Good' | 'Damaged' | 'Waste';
  unitPrice: number;
  totalValue: number;
  remarks?: string;
}

const YarnReturnPage = () => {
  const { hasSubPermission, isLoading } = useNavigation();
  const [returns, setReturns] = useState<YarnReturn[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [floorFilter, setFloorFilter] = useState<string>("all");

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

  const returnReasons = [
    'Excess Quantity',
    'Quality Issue',
    'Wrong Yarn Type',
    'Production Cancelled',
    'Damaged Material',
    'Other'
  ];

  // Sample data for demonstration
  useEffect(() => {
    const sampleReturns: YarnReturn[] = [
      {
        id: "1",
        returnNumber: "YR-2024-001",
        returnDate: "2024-01-20",
        floor: "Knitting Floor",
        issueNumber: "YI-2024-001",
        productionOrder: "PO-2024-001",
        status: "Received",
        items: [
          {
            id: "1",
            yarnCode: "COT-001",
            yarnName: "Cotton Yarn Premium",
            yarnType: "Cotton",
            issuedQuantity: 100,
            returnedQuantity: 5,
            condition: "Good",
            unitPrice: 250,
            totalValue: 1250,
            remarks: "Excess quantity returned"
          }
        ],
        returnedBy: "Jane Smith",
        receivedBy: "John Doe",
        reason: "Excess Quantity",
        notes: "Returned unused excess yarn",
        createdAt: "2024-01-20T10:00:00Z",
        updatedAt: "2024-01-20T10:30:00Z"
      },
      {
        id: "2",
        returnNumber: "YR-2024-002",
        returnDate: "2024-01-19",
        floor: "Linking Floor",
        issueNumber: "YI-2024-002",
        productionOrder: "PO-2024-002",
        status: "Pending",
        items: [
          {
            id: "2",
            yarnCode: "POL-002",
            yarnName: "Polyester Blend",
            yarnType: "Polyester",
            issuedQuantity: 50,
            returnedQuantity: 10,
            condition: "Damaged",
            unitPrice: 180,
            totalValue: 1800,
            remarks: "Damaged during production"
          }
        ],
        returnedBy: "Mike Johnson",
        reason: "Damaged Material",
        notes: "Material damaged during production process",
        createdAt: "2024-01-19T14:30:00Z",
        updatedAt: "2024-01-19T14:30:00Z"
      },
      {
        id: "3",
        returnNumber: "YR-2024-003",
        returnDate: "2024-01-18",
        floor: "Checking Floor",
        issueNumber: "YI-2024-003",
        status: "Verified",
        items: [
          {
            id: "3",
            yarnCode: "VR-003",
            yarnName: "Viscose Rayon",
            yarnType: "Viscose",
            issuedQuantity: 75,
            returnedQuantity: 20,
            condition: "Good",
            unitPrice: 320,
            totalValue: 6400,
            remarks: "Quality issue - wrong shade"
          }
        ],
        returnedBy: "Sarah Wilson",
        receivedBy: "John Doe",
        verifiedBy: "Quality Team",
        reason: "Quality Issue",
        notes: "Wrong shade received, returned for replacement",
        createdAt: "2024-01-18T09:15:00Z",
        updatedAt: "2024-01-18T16:45:00Z"
      }
    ];
    setReturns(sampleReturns);
  }, []);

  // Check permission (after all hooks)
  const hasPermission = hasSubPermission('/yarn-management', 'Yarn Return');

  // Show loading state while permissions are being loaded
  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn Return.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const handleDeleteReturn = async (returnId: string) => {
    if (!confirm('Are you sure you want to delete this yarn return?')) return;
    
    try {
      // TODO: Implement API call to delete yarn return
      setReturns(prev => prev.filter(ret => ret.id !== returnId));
      toast.success('Yarn return deleted successfully');
    } catch (error) {
      console.error('Failed to delete yarn return:', error);
      toast.error('Failed to delete yarn return');
    }
  };

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = 
      ret.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.floor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ret.issueNumber && ret.issueNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ret.productionOrder && ret.productionOrder.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || ret.status === statusFilter;
    const matchesFloor = floorFilter === "all" || ret.floor === floorFilter;
    
    return matchesSearch && matchesStatus && matchesFloor;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Received': return 'bg-blue-100 text-blue-800';
      case 'Verified': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Good': return 'bg-green-100 text-green-800';
      case 'Damaged': return 'bg-red-100 text-red-800';
      case 'Waste': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalReturnedValue = returns.reduce((sum, ret) => 
    sum + ret.items.reduce((itemSum, item) => itemSum + item.totalValue, 0), 0
  );

  return (
    <div className="main-content">
      <Seo title="Yarn Return" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn Return</h1>
                <p className="text-gray-600 mt-1">Manage yarn returns from production floors</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/yarn-return/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  New Return
                </Link>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="box">
              <div className="box-body text-center">
                <div className="text-2xl font-bold text-blue-600">{returns.length}</div>
                <div className="text-sm text-gray-600">Total Returns</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {returns.filter(r => r.status === 'Pending').length}
                </div>
                <div className="text-sm text-gray-600">Pending Returns</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-2xl font-bold text-green-600">
                  {returns.filter(r => r.status === 'Verified').length}
                </div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
            </div>
            <div className="box">
              <div className="box-body text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ₹{totalReturnedValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Value</div>
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
                    placeholder="Search by return number, floor, issue number, or production order..."
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
                    <option value="Received">Received</option>
                    <option value="Verified">Verified</option>
                    <option value="Rejected">Rejected</option>
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
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Returns Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Yarn Returns ({filteredReturns.length})</h3>
            </div>
            <div className="box-body">
              {filteredReturns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-arrow-go-back-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Yarn Returns</h3>
                  <p className="text-gray-500 mb-4">Start by creating your first yarn return.</p>
                  <Link 
                    href="/yarn-management/yarn-return/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Create First Return
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Floor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Issue Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Return Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
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
                      {filteredReturns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {ret.returnNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ret.floor}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ret.issueNumber ? (
                              <Link 
                                href={`/yarn-management/yarn-issue/${ret.issueNumber}`}
                                className="text-primary hover:underline"
                              >
                                {ret.issueNumber}
                              </Link>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(ret.returnDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ret.status)}`}>
                              {ret.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ret.reason}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {ret.items.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{ret.items.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link
                                href={`/yarn-management/yarn-return/edit/${ret.id}`}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <i className="ri-edit-line"></i>
                              </Link>
                              <button
                                onClick={() => handleDeleteReturn(ret.id)}
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

export default YarnReturnPage;

