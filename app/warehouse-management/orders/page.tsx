"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Order, OrderFilters, OrderStatus } from './types';
import { useOrders } from '@/shared/hooks/useOrders';
import { Order as ApiOrder } from '@/shared/services/orderService';
import OrderFiltersPanel from './components/OrderFilters';
import OrderDetailsModal from './components/OrderDetailsModal';
import OrderTable from './components/OrderTable';
import NotificationsSection from './components/NotificationsSection';

// Transform API order to UI order format
const transformApiOrderToUiOrder = (apiOrder: ApiOrder): Order => {
  // Calculate total quantity and value from items
  const totalQuantity = apiOrder.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = apiOrder.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  // Map API status to UI status
  const statusMap: Record<string, OrderStatus> = {
    'pending': 'pending',
    'processing': 'in-progress',
    'completed': 'dispatched',
    'cancelled': 'cancelled',
    'refunded': 'cancelled',
    'in-progress': 'in-progress',
    'packed': 'packed',
    'dispatched': 'dispatched',
  };

  // Map source to channel
  const channelMap: Record<string, string> = {
    'Website': 'online',
    'Amazon': 'marketplace',
    'Flipkart': 'marketplace',
    'Blinkit': 'marketplace',
    'Mobile App': 'online',
    'Retail': 'retail',
    'Wholesale': 'wholesale',
    'Direct': 'direct',
  };

  return {
    id: apiOrder.id,
    orderNumber: apiOrder.externalOrderId,
    date: apiOrder.createdAt || apiOrder.timestamps?.createdAt || new Date().toISOString(),
    status: statusMap[apiOrder.orderStatus] || 'pending',
    channel: (channelMap[apiOrder.source] || 'online') as any,
    customer: {
      name: apiOrder.customer.name,
      email: apiOrder.customer.email,
      phone: apiOrder.customer.phone,
      address: {
        street: apiOrder.customer.address.street || apiOrder.customer.address.addressLine1,
        city: apiOrder.customer.address.city,
        state: apiOrder.customer.address.state,
        zipCode: apiOrder.customer.address.zipCode,
        country: apiOrder.customer.address.country,
      },
    },
    items: apiOrder.items.map(item => ({
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.quantity * item.price,
      stockAvailable: true, // Default to true, can be enhanced later
      stockQuantity: undefined, // Can be added from inventory API later
    })),
    packingInstructions: {
      fragile: false,
      packagingType: 'standard',
      notes: apiOrder.meta?.notes || '',
    },
    dispatchMode: 'standard',
    totalValue,
    totalQuantity,
    priority: 'medium', // Default priority, can be enhanced
    estimatedDispatchDate: apiOrder.logistics?.status === 'ready-to-ship' ? apiOrder.updatedAt : undefined,
    actualDispatchDate: apiOrder.logistics?.status === 'shipped' || apiOrder.logistics?.status === 'delivered' ? apiOrder.updatedAt : undefined,
    // Pass through API fields
    source: apiOrder.source,
    payment: apiOrder.payment,
    logistics: apiOrder.logistics,
    meta: apiOrder.meta,
  };
};

const OrdersPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [filters, setFilters] = useState<OrderFilters>({});
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use API hook
  const { orders: apiOrders, loading, error, pagination, fetchOrders, deleteOrder } = useOrders();

  // Transform API orders to UI format
  const allOrders = useMemo(() => {
    return apiOrders.map(transformApiOrderToUiOrder);
  }, [apiOrders]);

  // Generate notifications from orders
  const notifications = useMemo(() => {
    const notifs: any[] = [];
    allOrders.forEach(order => {
      order.items.forEach(item => {
        if (!item.stockAvailable) {
          notifs.push({
            id: `unavailable-${order.id}-${item.sku}`,
            type: 'unavailable' as const,
            severity: 'error' as const,
            message: `SKU ${item.sku} is unavailable for order ${order.orderNumber}`,
            sku: item.sku,
            orderId: order.id,
            timestamp: order.date,
          });
        } else if (item.stockQuantity !== undefined && item.stockQuantity < item.quantity) {
          notifs.push({
            id: `low-stock-${order.id}-${item.sku}`,
            type: 'low-stock' as const,
            severity: 'warning' as const,
            message: `Low stock for SKU ${item.sku} in order ${order.orderNumber}`,
            sku: item.sku,
            orderId: order.id,
            timestamp: order.date,
          });
        }
      });
    });
    return notifs;
  }, [allOrders]);

  // Fetch orders on mount and when filters/tab change
  useEffect(() => {
    const apiFilters: any = {
      page: 1,
      limit: 100, // Get more orders for filtering
      sortBy: 'createdAt:desc',
    };

    // Map UI filters to API filters
    if (activeTab !== 'all') {
      const statusMap: Record<OrderStatus, string> = {
        'pending': 'pending',
        'in-progress': 'processing',
        'packed': 'processing',
        'dispatched': 'completed',
        'cancelled': 'cancelled',
      };
      apiFilters.orderStatus = statusMap[activeTab] || activeTab;
    }

    if (filters.status) {
      const statusMap: Record<OrderStatus, string> = {
        'pending': 'pending',
        'in-progress': 'processing',
        'packed': 'processing',
        'dispatched': 'completed',
        'cancelled': 'cancelled',
      };
      apiFilters.orderStatus = statusMap[filters.status] || filters.status;
    }

    if (filters.channel) {
      const sourceMap: Record<string, string> = {
        'online': 'Website',
        'marketplace': 'Amazon',
        'retail': 'Retail',
        'wholesale': 'Wholesale',
        'direct': 'Direct',
      };
      apiFilters.source = sourceMap[filters.channel] || filters.channel;
    }

    if (filters.dateFrom) {
      apiFilters.dateFrom = filters.dateFrom;
    }

    if (filters.dateTo) {
      apiFilters.dateTo = filters.dateTo;
    }

    fetchOrders(apiFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters]);

  // Show error toast if API fails
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Client-side filtering for additional filters not supported by API
  const filteredOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Filter by SKU (client-side)
    if (filters.sku) {
      filtered = filtered.filter(order =>
        order.items.some(item => item.sku.toLowerCase().includes(filters.sku!.toLowerCase()))
      );
    }

    // Filter by quantity range (client-side)
    if (filters.minQuantity !== undefined) {
      filtered = filtered.filter(order => order.totalQuantity >= filters.minQuantity!);
    }
    if (filters.maxQuantity !== undefined) {
      filtered = filtered.filter(order => order.totalQuantity <= filters.maxQuantity!);
    }

    // Filter by order value range (client-side)
    if (filters.minOrderValue !== undefined) {
      filtered = filtered.filter(order => order.totalValue >= filters.minOrderValue!);
    }
    if (filters.maxOrderValue !== undefined) {
      filtered = filtered.filter(order => order.totalValue <= filters.maxOrderValue!);
    }

    // Filter by search (client-side)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customer.name.toLowerCase().includes(searchLower) ||
        order.items.some(item => item.sku.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [allOrders, filters]);

  // Get order counts by status
  const orderCounts = useMemo(() => {
    const counts = {
      all: allOrders.length,
      pending: allOrders.filter(o => o.status === 'pending').length,
      'in-progress': allOrders.filter(o => o.status === 'in-progress').length,
      packed: allOrders.filter(o => o.status === 'packed').length,
      dispatched: allOrders.filter(o => o.status === 'dispatched').length,
      cancelled: allOrders.filter(o => o.status === 'cancelled').length,
    };
    return counts;
  }, [allOrders]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleApplyFilters = (newFilters: OrderFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleGeneratePickPackList = () => {
    if (selectedOrders.length === 0) {
      alert('Please select at least one order');
      return;
    }
    alert(`Generating Pick & Pack list for ${selectedOrders.length} order(s)`);
    // TODO: Implement actual Pick & Pack list generation
  };

  const handleEditOrder = (orderId: string) => {
    router.push(`/warehouse-management/orders/edit/${orderId}`);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteOrder(orderId);
        toast.success('Order deleted successfully');
        // Refetch orders
        const apiFilters: any = {
          page: 1,
          limit: 100,
          sortBy: 'createdAt:desc',
        };
        if (activeTab !== 'all') {
          const statusMap: Record<OrderStatus, string> = {
            'pending': 'pending',
            'in-progress': 'processing',
            'packed': 'processing',
            'dispatched': 'completed',
            'cancelled': 'cancelled',
          };
          apiFilters.orderStatus = statusMap[activeTab] || activeTab;
        }
        fetchOrders(apiFilters);
      } catch (error) {
        toast.error('Failed to delete order');
      }
    }
  };

  const tabs: Array<{ key: OrderStatus | 'all'; label: string }> = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'in-progress', label: 'In-Progress' },
    { key: 'packed', label: 'Packed' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="main-content">
      <Seo title="Order Receiving & Consolidation" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex items-center justify-between">
              <div>
                <h1 className="box-title text-2xl font-semibold">Order Receiving & Consolidation</h1>
                <p className="text-gray-600 mt-2">
                  Manage all incoming orders from multiple sales channels.
                </p>
              </div>
              <Link href="/warehouse-management/orders/add" className="ti-btn ti-btn-primary-full">
                <i className="ri-add-line me-2"></i>
                Add New Order
              </Link>
            </div>
          </div>

          {/* Notifications Section */}
          <NotificationsSection notifications={notifications} />

          {/* Order Dashboard with Tabs */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Order Dashboard</h3>
            </div>
            <div className="box-body">
              {/* Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <nav className="flex space-x-2" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        activeTab === tab.key
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                      {orderCounts[tab.key] > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                          activeTab === tab.key
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {orderCounts[tab.key]}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-blue-600">{orderCounts.all}</p>
                    </div>
                    <i className="ri-file-list-line text-3xl text-blue-400"></i>
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{orderCounts.pending}</p>
                    </div>
                    <i className="ri-time-line text-3xl text-yellow-400"></i>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Packed</p>
                      <p className="text-2xl font-bold text-purple-600">{orderCounts.packed}</p>
                    </div>
                    <i className="ri-box-line text-3xl text-purple-400"></i>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Dispatched</p>
                      <p className="text-2xl font-bold text-green-600">{orderCounts.dispatched}</p>
                    </div>
                    <i className="ri-truck-line text-3xl text-green-400"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <OrderFiltersPanel
            filters={filters}
            onApplyFilters={handleApplyFilters}
            onReset={handleResetFilters}
          />

          {/* Bulk Actions Panel */}
          {selectedOrders.length > 0 && (
            <div className="box bg-primary/5 border-primary/20">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <i className="ri-checkbox-multiple-line text-primary text-xl"></i>
                    <span className="font-medium">
                      {selectedOrders.length} order(s) selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGeneratePickPackList}
                      className="ti-btn ti-btn-primary"
                    >
                      <i className="ri-file-list-3-line me-2"></i>
                      Generate Pick & Pack List
                    </button>
                    <button
                      onClick={() => setSelectedOrders([])}
                      className="ti-btn ti-btn-secondary"
                    >
                      <i className="ri-close-line me-2"></i>
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Orders Table */}
          {loading ? (
            <div className="box">
              <div className="box-body text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
            </div>
          ) : (
            <OrderTable
              orders={filteredOrders}
              onOrderClick={handleOrderClick}
              selectedOrders={selectedOrders}
              onSelectOrder={handleSelectOrder}
              onSelectAll={handleSelectAll}
              onEdit={handleEditOrder}
              onDelete={handleDeleteOrder}
            />
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />
    </div>
  );
};

export default OrdersPage;
