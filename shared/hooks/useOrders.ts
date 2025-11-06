import { useState, useEffect, useCallback } from 'react';
import { 
  orderService, 
  Order, 
  OrderFilters, 
  CreateOrderData, 
  UpdateOrderData,
  PaginatedResponse 
} from '@/shared/services/orderService';

interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  fetchOrders: (filters?: OrderFilters) => Promise<void>;
  createOrder: (orderData: CreateOrderData) => Promise<Order>;
  updateOrder: (orderId: string, updateData: UpdateOrderData) => Promise<Order>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrder: (orderId: string) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: string) => Promise<Order>;
  clearError: () => void;
}

export const useOrders = (initialFilters?: OrderFilters): UseOrdersReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchOrders = useCallback(async (filters: OrderFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const data: PaginatedResponse<Order> = await orderService.getOrders(filters);
      setOrders(data.results);
      setPagination({
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
        totalResults: data.totalResults,
        hasNextPage: data.hasNextPage,
        hasPrevPage: data.hasPrevPage
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (orderData: CreateOrderData): Promise<Order> => {
    setLoading(true);
    setError(null);
    
    try {
      const newOrder = await orderService.createOrder(orderData);
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrder = useCallback(async (orderId: string, updateData: UpdateOrderData): Promise<Order> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedOrder = await orderService.updateOrder(orderId, updateData);
      setOrders(prev => prev.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
      return updatedOrder;
    } catch (err: any) {
      setError(err.message || 'Failed to update order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await orderService.deleteOrder(orderId);
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrder = useCallback(async (orderId: string): Promise<Order> => {
    setLoading(true);
    setError(null);
    
    try {
      const order = await orderService.getOrder(orderId);
      return order;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = useCallback(async (orderId: string, status: string): Promise<Order> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedOrder = await orderService.updateOrderStatus(orderId, status);
      setOrders(prev => prev.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
      return updatedOrder;
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch with provided filters
  useEffect(() => {
    if (initialFilters) {
      fetchOrders(initialFilters);
    }
  }, [fetchOrders, initialFilters]);

  return {
    orders,
    loading,
    error,
    pagination,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrder,
    updateOrderStatus,
    clearError
  };
};

