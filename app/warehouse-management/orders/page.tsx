"use client";

import React, { useState, useMemo } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { Order, OrderFilters, OrderStatus } from './types';
import { generateDummyOrders, generateDummyNotifications } from './dummyData';
import OrderFiltersPanel from './components/OrderFilters';
import OrderDetailsModal from './components/OrderDetailsModal';
import OrderTable from './components/OrderTable';
import NotificationsSection from './components/NotificationsSection';

const OrdersPage = () => {
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [filters, setFilters] = useState<OrderFilters>({});
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate dummy data
  const allOrders = useMemo(() => generateDummyOrders(), []);
  const notifications = useMemo(() => generateDummyNotifications(allOrders), [allOrders]);

  // Filter orders based on active tab and filters
  const filteredOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(order => order.status === activeTab);
    }

    // Filter by date range
    if (filters.dateFrom) {
      filtered = filtered.filter(order => order.date >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(order => order.date <= filters.dateTo!);
    }

    // Filter by channel
    if (filters.channel) {
      filtered = filtered.filter(order => order.channel === filters.channel);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Filter by SKU
    if (filters.sku) {
      filtered = filtered.filter(order =>
        order.items.some(item => item.sku.toLowerCase().includes(filters.sku!.toLowerCase()))
      );
    }

    // Filter by quantity range
    if (filters.minQuantity !== undefined) {
      filtered = filtered.filter(order => order.totalQuantity >= filters.minQuantity!);
    }
    if (filters.maxQuantity !== undefined) {
      filtered = filtered.filter(order => order.totalQuantity <= filters.maxQuantity!);
    }

    // Filter by order value range
    if (filters.minOrderValue !== undefined) {
      filtered = filtered.filter(order => order.totalValue >= filters.minOrderValue!);
    }
    if (filters.maxOrderValue !== undefined) {
      filtered = filtered.filter(order => order.totalValue <= filters.maxOrderValue!);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customer.name.toLowerCase().includes(searchLower) ||
        order.items.some(item => item.sku.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [allOrders, activeTab, filters]);

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
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Order Receiving & Consolidation</h1>
              <p className="text-gray-600 mt-2">
                Manage all incoming orders from multiple sales channels.
              </p>
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
          <OrderTable
            orders={filteredOrders}
            onOrderClick={handleOrderClick}
            selectedOrders={selectedOrders}
            onSelectOrder={handleSelectOrder}
            onSelectAll={handleSelectAll}
          />
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
