"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Order, OrderFilters, OrderStatus, DispatchTracking } from './types';
import { useWhmsOrders } from '@/shared/hooks/useWhmsOrders';
import OrderFiltersPanel from './components/OrderFilters';
import OrderDetailsModal from './components/OrderDetailsModal';
import OrderTable from './components/OrderTable';
import NotificationsSection from './components/NotificationsSection';
import OrderStatusUpdateModal from './components/OrderStatusUpdateModal';

const OrdersPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [filters, setFilters] = useState<OrderFilters>({});
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [orderOverlay, setOrderOverlay] = useState<Record<string, Partial<Order>>>({});

  // WHMS API hook (uses your existing Node.js /v1/whms endpoints)
  const {
    orders: whmsOrderList,
    loading,
    error,
    pagination,
    fetchOrders,
    deleteOrder,
    saveTracking: saveTrackingApi,
  } = useWhmsOrders();

  const allOrders = useMemo(() => whmsOrderList, [whmsOrderList]);

  const ordersWithOverlay = useMemo(() => {
    return allOrders.map((o) => ({ ...o, ...orderOverlay[o.id] }));
  }, [allOrders, orderOverlay]);

  // Generate notifications from orders
  const notifications = useMemo(() => {
    const notifs: any[] = [];
    ordersWithOverlay.forEach(order => {
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
  }, [ordersWithOverlay]);

  const buildApiFilters = useCallback(() => {
    const apiFilters: Record<string, string | number> = {
      page: 1,
      limit: 100,
    };
    if (activeTab !== 'all') apiFilters.status = activeTab;
    if (filters.status) apiFilters.status = filters.status;
    if (filters.channel) apiFilters.channel = filters.channel;
    if (filters.dateFrom) apiFilters.dateFrom = filters.dateFrom;
    if (filters.dateTo) apiFilters.dateTo = filters.dateTo;
    return apiFilters;
  }, [activeTab, filters]);

  // Fetch orders on mount and when filters/tab change
  useEffect(() => {
    const apiFilters = buildApiFilters();
    fetchOrders(apiFilters);
  }, [buildApiFilters, fetchOrders]);

  // Show error toast if API fails
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Client-side filtering for additional filters not supported by API
  const filteredOrders = useMemo(() => {
    let filtered = [...ordersWithOverlay];

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
  }, [ordersWithOverlay, filters]);

  // Get order counts by status
  const orderCounts = useMemo(() => {
    const counts = {
      all: ordersWithOverlay.length,
      pending: ordersWithOverlay.filter(o => o.status === 'pending').length,
      'in-progress': ordersWithOverlay.filter(o => o.status === 'in-progress').length,
      packed: ordersWithOverlay.filter(o => o.status === 'packed').length,
      dispatched: ordersWithOverlay.filter(o => o.status === 'dispatched').length,
      cancelled: ordersWithOverlay.filter(o => o.status === 'cancelled').length,
    };
    return counts;
  }, [ordersWithOverlay]);

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
        const apiFilters = buildApiFilters();
        fetchOrders(apiFilters);
      } catch (error) {
        toast.error('Failed to delete order');
      }
    }
  };

  const handleOpenStatusModal = (order: Order) => {
    if (order.source !== 'Website') {
      return;
    }
    setStatusModalOrder(order);
    setIsStatusModalOpen(true);
  };

  const handleCloseStatusModal = () => {
    setStatusModalOrder(null);
    setIsStatusModalOpen(false);
  };

  const handleTrackingSave = async (orderId: string, tracking: DispatchTracking) => {
    try {
      await saveTrackingApi(orderId, tracking);
      setOrderOverlay((prev) => ({
        ...prev,
        [orderId]: {
          ...prev[orderId],
          tracking,
          status: 'dispatched',
          lifecycleStatus: 'dispatched',
          stockBlockStatus: 'available',
        },
      }));
      toast.success('Tracking saved. Order marked as Dispatched.');
    } catch {
      toast.error('Failed to save tracking.');
    }
  };

  const modalOrder = selectedOrder ? filteredOrders.find((o) => o.id === selectedOrder.id) ?? selectedOrder : null;

  const handleWebsiteStatusUpdate = async (action: 'cancel' | 'complete' | 'archive') => {
    if (!statusModalOrder) return;
    const { orderService } = await import('@/shared/services/orderService');
    setStatusUpdating(true);
    try {
      await orderService.updateWebsiteOrderStatus(statusModalOrder.orderNumber, action);
      toast.success(`Order ${statusModalOrder.orderNumber} updated successfully`);
      await fetchOrders(buildApiFilters());
      handleCloseStatusModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update order status';
      toast.error(message);
      throw new Error(message);
    } finally {
      setStatusUpdating(false);
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
    <>
      <Seo title="Order Receiving & Consolidation" />

      {/* Actions in Orders tab */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
            {filteredOrders.length}
          </span>
        </div>
        <Link 
          href="/warehouse-management/orders/add" 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
        >
          <i className="ri-add-line text-xs"></i>
          New Order
        </Link>
      </div>

      {/* Notifications Section */}
      <NotificationsSection notifications={notifications} />

          {/* Order Dashboard with Tabs */}
          <div className="mb-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 mb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${
                    activeTab === tab.key
                      ? 'text-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {orderCounts[tab.key] > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${
                      activeTab === tab.key
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {orderCounts[tab.key]}
                    </span>
                  )}
                  {activeTab === tab.key && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>
                  )}
                </button>
              ))}
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
          

      {/* Filters Panel */}
      <OrderFiltersPanel
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Bulk Actions Panel */}
      {selectedOrders.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="ri-checkbox-multiple-line text-purple-600 text-lg"></i>
              <span className="text-[12px] font-bold text-gray-800">
                {selectedOrders.length} order(s) selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGeneratePickPackList}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-file-list-3-line text-xs"></i>
                Generate Pick & Pack List
              </button>
              <button
                onClick={() => setSelectedOrders([])}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-close-line text-xs"></i>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
          <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
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
          onUpdateWebsiteStatus={handleOpenStatusModal}
        />
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedOrder(null);
        }}
        order={modalOrder}
        onTrackingSave={handleTrackingSave}
      />

      <OrderStatusUpdateModal
        isOpen={isStatusModalOpen}
        order={statusModalOrder}
        isSubmitting={statusUpdating}
        onClose={handleCloseStatusModal}
        onSubmit={handleWebsiteStatusUpdate}
      />
    </>
  );
};

export default OrdersPage;
