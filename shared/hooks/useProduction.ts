import { useState, useEffect, useCallback } from 'react';
import { productionService, ProductionOrder, OrderFilters } from '@/shared/services/productionService';
import { toast } from 'react-hot-toast';

interface UseProductionOptions {
  initialFilters?: OrderFilters;
  autoLoad?: boolean;
}

export const useProduction = (options: UseProductionOptions = {}) => {
  const { initialFilters = {}, autoLoad = true } = options;
  
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);

  const loadOrders = useCallback(async (customFilters?: Partial<OrderFilters>) => {
    setIsLoading(true);
    try {
      const apiFilters: OrderFilters = {
        page: currentPage,
        limit: itemsPerPage,
        ...filters,
        ...customFilters
      };

      const response = await productionService.getOrders(apiFilters);
      
      if (response.success) {
        setOrders(response.data.results);
        setTotalPages(response.data.totalPages);
        setTotalResults(response.data.totalResults);
        return response.data;
      } else {
        toast.error('Failed to load orders');
        return null;
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error(error.message || 'Failed to load orders');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, filters]);

  const createOrder = useCallback(async (orderData: any) => {
    try {
      const response = await productionService.createOrder(orderData);
      if (response.success) {
        toast.success('Order created successfully');
        loadOrders(); // Reload orders
        return response.data;
      } else {
        toast.error(response.error?.message || 'Failed to create order');
        return null;
      }
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
      return null;
    }
  }, [loadOrders]);

  const updateOrder = useCallback(async (orderId: string, updateData: any) => {
    try {
      const response = await productionService.updateOrder(orderId, updateData);
      if (response.success) {
        toast.success('Order updated successfully');
        loadOrders(); // Reload orders
        return response.data;
      } else {
        toast.error(response.error?.message || 'Failed to update order');
        return null;
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order');
      return null;
    }
  }, [loadOrders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      const response = await productionService.deleteOrder(orderId);
      if (response.success) {
        toast.success('Order deleted successfully');
        loadOrders(); // Reload orders
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to delete order');
        return false;
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast.error(error.message || 'Failed to delete order');
      return false;
    }
  }, [loadOrders]);

  const updateFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const updatePagination = useCallback((page: number, perPage?: number) => {
    setCurrentPage(page);
    if (perPage !== undefined) {
      setItemsPerPage(perPage);
    }
  }, []);

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    if (autoLoad) {
      loadOrders();
    }
  }, [loadOrders, autoLoad]);

  return {
    orders,
    isLoading,
    currentPage,
    itemsPerPage,
    totalPages,
    totalResults,
    filters,
    loadOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    updateFilters,
    updatePagination
  };
};
