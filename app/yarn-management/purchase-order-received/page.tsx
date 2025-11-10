"use client";
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface ReceivedOrder {
  id: string;
  orderNumber: string;
  purchaseOrderNumber: string;
  supplier: string;
  receivedDate: string;
  receivedBy: string;
  status: 'Partial' | 'Complete' | 'Pending Inspection';
  totalAmount: number;
  items: ReceivedItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ReceivedItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  qualityStatus: 'Approved' | 'Rejected' | 'Pending';
}

const PurchaseOrderReceivedPage = () => {
  const { hasSubPermission } = useNavigation();
  
  // Static received orders data
  const staticReceivedOrders: ReceivedOrder[] = [
    {
      id: "1",
      orderNumber: "RCP-2024-001",
      purchaseOrderNumber: "PO-2024-001",
      supplier: "Reliance Industries",
      receivedDate: "2024-01-25T10:30:00Z",
      receivedBy: "John Doe",
      status: "Complete",
      totalAmount: 125000,
      items: [
        {
          id: "1",
          yarnCode: "CT40-001",
          yarnName: "Cotton Count 40",
          orderedQuantity: 200,
          receivedQuantity: 200,
          unitPrice: 450,
          totalPrice: 90000,
          qualityStatus: "Approved"
        },
        {
          id: "2",
          yarnCode: "CT60-004",
          yarnName: "Cotton Count 60",
          orderedQuantity: 100,
          receivedQuantity: 100,
          unitPrice: 520,
          totalPrice: 52000,
          qualityStatus: "Approved"
        }
      ],
      notes: "All items received in good condition",
      createdAt: "2024-01-25T10:30:00Z",
      updatedAt: "2024-01-25T10:30:00Z"
    },
    {
      id: "2",
      orderNumber: "RCP-2024-002",
      purchaseOrderNumber: "PO-2024-002",
      supplier: "Aditya Birla Group",
      receivedDate: "2024-01-20T14:30:00Z",
      receivedBy: "Jane Smith",
      status: "Partial",
      totalAmount: 48000,
      items: [
        {
          id: "3",
          yarnCode: "PE150-002",
          yarnName: "Polyester DTY 150",
          orderedQuantity: 150,
          receivedQuantity: 120,
          unitPrice: 320,
          totalPrice: 38400,
          qualityStatus: "Approved"
        },
        {
          id: "4",
          yarnCode: "PE100-007",
          yarnName: "Polyester POY 100",
          orderedQuantity: 200,
          receivedQuantity: 0,
          unitPrice: 290,
          totalPrice: 0,
          qualityStatus: "Pending"
        }
      ],
      notes: "Partial delivery, remaining items expected next week",
      createdAt: "2024-01-20T14:30:00Z",
      updatedAt: "2024-01-20T14:30:00Z"
    },
    {
      id: "3",
      orderNumber: "RCP-2024-003",
      purchaseOrderNumber: "PO-2024-003",
      supplier: "Grasim Industries",
      receivedDate: "2024-01-22T09:15:00Z",
      receivedBy: "Mike Johnson",
      status: "Pending Inspection",
      totalAmount: 95000,
      items: [
        {
          id: "5",
          yarnCode: "VR30-003",
          yarnName: "Viscose Rayon 30",
          orderedQuantity: 180,
          receivedQuantity: 180,
          unitPrice: 380,
          totalPrice: 68400,
          qualityStatus: "Pending"
        },
        {
          id: "6",
          yarnCode: "VR40-008",
          yarnName: "Viscose Rayon 40",
          orderedQuantity: 100,
          receivedQuantity: 100,
          unitPrice: 400,
          totalPrice: 40000,
          qualityStatus: "Pending"
        }
      ],
      notes: "Awaiting quality inspection",
      createdAt: "2024-01-22T09:15:00Z",
      updatedAt: "2024-01-22T09:15:00Z"
    }
  ];

  const [receivedOrders, setReceivedOrders] = useState<ReceivedOrder[]>(staticReceivedOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management', 'Purchase Order Received');

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Purchase Order Received.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdateReceivedOrder = async (orderData: ReceivedOrder) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to update received order
      setReceivedOrders(prev => prev.map(order => 
        order.id === orderData.id ? { ...orderData, updatedAt: new Date().toISOString() } : order
      ));
      toast.success('Received order updated successfully');
    } catch (error) {
      console.error('Failed to update received order:', error);
      toast.error('Failed to update received order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReceivedOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this received order?')) return;
    
    try {
      // TODO: Implement API call to delete received order
      setReceivedOrders(prev => prev.filter(order => order.id !== orderId));
      toast.success('Received order deleted successfully');
    } catch (error) {
      console.error('Failed to delete received order:', error);
      toast.error('Failed to delete received order');
    }
  };

  const filteredOrders = receivedOrders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.purchaseOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      case 'Complete': return 'bg-green-100 text-green-800';
      case 'Pending Inspection': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="main-content">
      <Seo title="Purchase Order Received" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Purchase Order Received</h1>
                <p className="text-gray-600 mt-1">Track and manage received purchase orders</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-order-received/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  Record Receipt
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
                    placeholder="Search by order number, PO number or supplier..."
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
                    <option value="Partial">Partial</option>
                    <option value="Complete">Complete</option>
                    <option value="Pending Inspection">Pending Inspection</option>
                  </select>
                  <button className="ti-btn ti-btn-light">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Received Orders Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Received Orders ({filteredOrders.length})</h3>
            </div>
            <div className="box-body">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-inbox-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Received Orders</h3>
                  <p className="text-gray-500 mb-4">Start by recording your first order receipt.</p>
                  <Link 
                    href="/yarn-management/purchase-order-received/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Record First Receipt
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Receipt Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          PO Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Received Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Received By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <Link 
                              href={`/yarn-management/purchase/${order.purchaseOrderNumber}`}
                              className="text-primary hover:underline"
                            >
                              {order.purchaseOrderNumber}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.receivedDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.receivedBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{order.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  // TODO: Implement view details modal
                                  toast.info('View details functionality coming soon');
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Details"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteReceivedOrder(order.id)}
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

export default PurchaseOrderReceivedPage;

