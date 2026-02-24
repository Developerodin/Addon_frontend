/**
 * Hook for warehouse Orders tab: fetches and mutates via WHMS API.
 * Transforms WHMS order shape to UI Order type used by Orders page.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  whmsOrders,
  WhmsOrder,
  WhmsPaginated,
  WhmsTrackingBody,
} from '@/shared/services/whmsService';
import type {
  Order,
  OrderFilters,
  OrderStatus,
  StockBlockStatus,
  OrderLifecycleStatus,
  DispatchTracking,
} from '@/app/warehouse-management/orders/types';

function transformWhmsOrderToUiOrder(w: WhmsOrder): Order {
  const statusMap: Record<string, OrderStatus> = {
    pending: 'pending',
    processing: 'in-progress',
    'in-progress': 'in-progress',
    packed: 'packed',
    completed: 'dispatched',
    dispatched: 'dispatched',
    cancelled: 'cancelled',
  };
  const status = (statusMap[w.status] || 'pending') as OrderStatus;
  const stockBlockStatus: StockBlockStatus =
    status === 'dispatched' || status === 'cancelled'
      ? 'available'
      : status === 'in-progress' || status === 'packed'
        ? 'pick-block'
        : 'tentative-block';
  const lifecycleStatus: OrderLifecycleStatus =
    status === 'dispatched'
      ? 'dispatched'
      : status === 'packed'
        ? 'billing-done-dispatch-pending'
        : status === 'in-progress'
          ? 'picking-done'
          : 'order-received';

  const addr = w.customer?.address || {};
  const street =
    typeof addr === 'object' && addr !== null && 'street' in addr
      ? (addr as { street?: string }).street
      : '';
  const totalQuantity = w.items?.reduce((s, i) => s + (i.quantity || 0), 0) ?? 0;
  const totalValue =
    w.totalValue ??
    w.items?.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0) ??
    0;

  return {
    id: w.id,
    orderNumber: w.orderNumber,
    date: w.date,
    status,
    stockBlockStatus,
    lifecycleStatus,
    channel: (w.channel || 'online') as Order['channel'],
    customer: {
      name: w.customer?.name ?? '',
      email: (w.customer as { email?: string })?.email ?? '',
      phone: (w.customer as { phone?: string })?.phone ?? '',
      address: {
        street: (street || (addr as { addressLine1?: string })?.addressLine1) ?? '',
        city: (addr as { city?: string })?.city ?? '',
        state: (addr as { state?: string })?.state ?? '',
        zipCode: (addr as { zipCode?: string })?.zipCode ?? '',
        country: (addr as { country?: string })?.country ?? '',
      },
    },
    items: (w.items || []).map((i) => ({
      sku: i.sku,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice ?? 0,
      totalPrice: i.totalPrice ?? i.quantity * (i.unitPrice ?? 0),
      stockAvailable: i.stockAvailable ?? true,
      stockQuantity: i.stockQuantity ?? undefined,
    })),
    packingInstructions: {
      fragile: false,
      packagingType: 'standard',
      notes: '',
    },
    dispatchMode: 'standard',
    totalValue: Number(totalValue),
    totalQuantity,
    priority: (w.priority as Order['priority']) || 'medium',
    estimatedDispatchDate: w.estimatedDispatchDate ?? undefined,
    actualDispatchDate: w.actualDispatchDate ?? undefined,
    tracking: w.tracking
      ? {
          courierName: w.tracking.courierName ?? '',
          trackingNumber: w.tracking.trackingNumber ?? '',
          dispatchDate: w.tracking.dispatchDate ?? '',
          vehicleAwb: w.tracking.vehicleAwb ?? '',
          remarks: w.tracking.remarks ?? '',
        }
      : undefined,
    source: w.source ?? undefined,
    payment: w.payment as Order['payment'],
    logistics: w.logistics as Order['logistics'],
    meta: w.meta as Order['meta'],
  };
}

export interface UseWhmsOrdersFilters extends OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  channel?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UseWhmsOrdersReturn {
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
  fetchOrders: (filters?: UseWhmsOrdersFilters) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  saveTracking: (orderId: string, tracking: DispatchTracking) => Promise<void>;
  clearError: () => void;
}

export function useWhmsOrders(initialFilters?: UseWhmsOrdersFilters): UseWhmsOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const clearError = useCallback(() => setError(null), []);

  const fetchOrders = useCallback(async (filters: UseWhmsOrdersFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const statusMap: Record<string, string> = {
        pending: 'pending',
        'in-progress': 'processing',
        packed: 'packed',
        dispatched: 'dispatched',
        cancelled: 'cancelled',
      };
      const params: Record<string, string | number | undefined> = {
        page: filters.page ?? 1,
        limit: filters.limit ?? 100,
      };
      if (filters.status) params.status = statusMap[filters.status] || filters.status;
      if (filters.channel) params.channel = filters.channel;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const data: WhmsPaginated<WhmsOrder> = await whmsOrders.list(params);
      setOrders((data.results || []).map(transformWhmsOrderToUiOrder));
      setPagination({
        page: data.page ?? 1,
        limit: data.limit ?? 10,
        totalPages: data.totalPages ?? 1,
        totalResults: data.totalResults ?? 0,
        hasNextPage: (data.page ?? 1) < (data.totalPages ?? 1),
        hasPrevPage: (data.page ?? 1) > 1,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('WHMS orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);
    try {
      await whmsOrders.delete(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete order');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTracking = useCallback(
    async (orderId: string, tracking: DispatchTracking) => {
      setError(null);
      const body: WhmsTrackingBody = {
        courierName: tracking.courierName,
        trackingNumber: tracking.trackingNumber,
        dispatchDate: tracking.dispatchDate,
        vehicleAwb: tracking.vehicleAwb,
        remarks: tracking.remarks,
      };
      try {
        const updated = await whmsOrders.saveTracking(orderId, body);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? transformWhmsOrderToUiOrder(updated) : o))
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to save tracking');
        throw err;
      }
    },
    []
  );

  useEffect(() => {
    if (initialFilters) fetchOrders(initialFilters);
  }, [fetchOrders, initialFilters]);

  return {
    orders,
    loading,
    error,
    pagination,
    fetchOrders,
    deleteOrder,
    saveTracking,
    clearError,
  };
}
