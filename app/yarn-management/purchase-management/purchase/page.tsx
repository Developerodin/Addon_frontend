"use client";
import React, { useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'Pending' | 'Confirmed' | 'In Transit' | 'Delivered' | 'Cancelled';
  totalAmount: number;
  items: PurchaseItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseItem {
  id: string;
  yarnCode: string;
  yarnName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number;
}

const PurchasePage = () => {
  const { hasSubPermission, isLoading } = useNavigation();
  
  // Static purchase orders data
  const staticOrders: PurchaseOrder[] = [
    {
      id: "1",
      orderNumber: "PO-2024-001",
      supplier: "Reliance Industries",
      orderDate: "2024-01-15T10:30:00Z",
      expectedDelivery: "2024-01-25T10:30:00Z",
      status: "Delivered",
      totalAmount: 125000,
      items: [
        {
          id: "1",
          yarnCode: "CT40-001",
          yarnName: "Cotton Count 40",
          quantity: 200,
          unitPrice: 450,
          totalPrice: 90000,
          receivedQuantity: 200
        },
        {
          id: "2",
          yarnCode: "CT60-004",
          yarnName: "Cotton Count 60",
          quantity: 100,
          unitPrice: 520,
          totalPrice: 52000,
          receivedQuantity: 100
        }
      ],
      notes: "Priority order for production",
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-25T10:30:00Z"
    },
    {
      id: "2",
      orderNumber: "PO-2024-002",
      supplier: "Aditya Birla Group",
      orderDate: "2024-01-16T09:15:00Z",
      expectedDelivery: "2024-01-26T09:15:00Z",
      status: "In Transit",
      totalAmount: 85000,
      items: [
        {
          id: "3",
          yarnCode: "PE150-002",
          yarnName: "Polyester DTY 150",
          quantity: 150,
          unitPrice: 320,
          totalPrice: 48000,
          receivedQuantity: 0
        },
        {
          id: "4",
          yarnCode: "PE100-007",
          yarnName: "Polyester POY 100",
          quantity: 200,
          unitPrice: 290,
          totalPrice: 58000,
          receivedQuantity: 0
        }
      ],
      notes: "Standard delivery",
      createdAt: "2024-01-16T09:15:00Z",
      updatedAt: "2024-01-20T14:30:00Z"
    },
    {
      id: "3",
      orderNumber: "PO-2024-003",
      supplier: "Grasim Industries",
      orderDate: "2024-01-17T14:20:00Z",
      expectedDelivery: "2024-01-27T14:20:00Z",
      status: "Confirmed",
      totalAmount: 95000,
      items: [
        {
          id: "5",
          yarnCode: "VR30-003",
          yarnName: "Viscose Rayon 30",
          quantity: 180,
          unitPrice: 380,
          totalPrice: 68400,
          receivedQuantity: 0
        },
        {
          id: "6",
          yarnCode: "VR40-008",
          yarnName: "Viscose Rayon 40",
          quantity: 100,
          unitPrice: 400,
          totalPrice: 40000,
          receivedQuantity: 0
        }
      ],
      notes: "Quality check required",
      createdAt: "2024-01-17T14:20:00Z",
      updatedAt: "2024-01-18T10:15:00Z"
    },
    {
      id: "4",
      orderNumber: "PO-2024-004",
      supplier: "SRF Limited",
      orderDate: "2024-01-19T16:30:00Z",
      expectedDelivery: "2024-01-29T16:30:00Z",
      status: "Pending",
      totalAmount: 42000,
      items: [
        {
          id: "7",
          yarnCode: "NY70-005",
          yarnName: "Nylon FDY 70",
          quantity: 150,
          unitPrice: 280,
          totalPrice: 42000,
          receivedQuantity: 0
        }
      ],
      notes: "Awaiting approval",
      createdAt: "2024-01-19T16:30:00Z",
      updatedAt: "2024-01-19T16:30:00Z"
    },
    {
      id: "5",
      orderNumber: "PO-2024-005",
      supplier: "Welspun India",
      orderDate: "2024-01-20T08:15:00Z",
      expectedDelivery: "2024-01-30T08:15:00Z",
      status: "Cancelled",
      totalAmount: 76000,
      items: [
        {
          id: "8",
          yarnCode: "CT20-006",
          yarnName: "Cotton Count 20",
          quantity: 200,
          unitPrice: 380,
          totalPrice: 76000,
          receivedQuantity: 0
        }
      ],
      notes: "Cancelled due to quality issues",
      createdAt: "2024-01-20T08:15:00Z",
      updatedAt: "2024-01-22T11:45:00Z"
    },
    {
      id: "6",
      orderNumber: "PO-2024-006",
      supplier: "Reliance Industries",
      orderDate: "2024-01-23T15:40:00Z",
      expectedDelivery: "2024-02-02T15:40:00Z",
      status: "Confirmed",
      totalAmount: 136000,
      items: [
        {
          id: "9",
          yarnCode: "CT80-009",
          yarnName: "Cotton Count 80",
          quantity: 200,
          unitPrice: 680,
          totalPrice: 136000,
          receivedQuantity: 0
        }
      ],
      notes: "Premium quality required",
      createdAt: "2024-01-23T15:40:00Z",
      updatedAt: "2024-01-24T09:20:00Z"
    },
    {
      id: "7",
      orderNumber: "PO-2024-007",
      supplier: "Aditya Birla Group",
      orderDate: "2024-01-24T12:55:00Z",
      expectedDelivery: "2024-02-03T12:55:00Z",
      status: "Pending",
      totalAmount: 70000,
      items: [
        {
          id: "10",
          yarnCode: "PE200-010",
          yarnName: "Polyester DTY 200",
          quantity: 200,
          unitPrice: 350,
          totalPrice: 70000,
          receivedQuantity: 0
        }
      ],
      notes: "Bulk order discount applied",
      createdAt: "2024-01-24T12:55:00Z",
      updatedAt: "2024-01-24T12:55:00Z"
    }
  ];

  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>(staticOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

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
          <p className="text-gray-500 mb-4">You don't have permission to access Purchase Order.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }


  const handleUpdateOrder = async (orderData: PurchaseOrder) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement API call to update purchase order
      setOrders(prev => prev.map(order => 
        order.id === orderData.id ? { ...orderData, updatedAt: new Date().toISOString() } : order
      ));
      setEditingOrder(null);
      toast.success('Purchase order updated successfully');
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      toast.error('Failed to update purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;
    
    try {
      // TODO: Implement API call to delete purchase order
      setOrders(prev => prev.filter(order => order.id !== orderId));
      toast.success('Purchase order deleted successfully');
    } catch (error) {
      console.error('Failed to delete purchase order:', error);
      toast.error('Failed to delete purchase order');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed': return 'bg-blue-100 text-blue-800';
      case 'In Transit': return 'bg-purple-100 text-purple-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="main-content">
      <Seo title="Purchase Order" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Purchase Order</h1>
                <p className="text-gray-600 mt-1">Manage yarn procurement and purchase orders</p>
              </div>
              <div className="box-tools">
               
                <Link 
                  href="/yarn-management/purchase-management/purchase/add"
                  className="ti-btn ti-btn-primary  "
                >
                  <i className="ri-add-line me-1"></i>
                  New Order
                </Link>
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
                    placeholder="Search by order number or supplier..."
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
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <button className="ti-btn ti-btn-light  ">
                    <i className="ri-download-line me-1"></i>
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Purchase Orders ({filteredOrders.length})</h3>
            </div>
            <div className="box-body">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-shopping-cart-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Orders</h3>
                  <p className="text-gray-500 mb-4">Start by creating your first purchase order.</p>
                  <Link 
                    href="/yarn-management/purchase-management/purchase/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Create First Order
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supplier
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Expected Delivery
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
                            {order.supplier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.orderDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(order.expectedDelivery).toLocaleDateString()}
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
                                onClick={() => setEditingOrder(order)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <i className="ri-edit-line"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
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

export default PurchasePage;
