// Order types for warehouse management

export type OrderStatus = 'pending' | 'in-progress' | 'packed' | 'dispatched' | 'cancelled';

export type SalesChannel = 'online' | 'retail' | 'wholesale' | 'marketplace' | 'direct';

export type DispatchMode = 'standard' | 'express' | 'overnight' | 'pickup';

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  stockAvailable: boolean;
  stockQuantity?: number;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface PackingInstruction {
  fragile: boolean;
  specialHandling?: string;
  packagingType: 'standard' | 'gift' | 'bulk';
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  channel: SalesChannel;
  customer: CustomerDetails;
  items: OrderItem[];
  packingInstructions: PackingInstruction;
  dispatchMode: DispatchMode;
  totalValue: number;
  totalQuantity: number;
  priority: 'low' | 'medium' | 'high';
  estimatedDispatchDate?: string;
  actualDispatchDate?: string;
}

export interface OrderFilters {
  dateFrom?: string;
  dateTo?: string;
  channel?: SalesChannel | '';
  status?: OrderStatus | '';
  sku?: string;
  minQuantity?: number;
  maxQuantity?: number;
  minOrderValue?: number;
  maxOrderValue?: number;
  search?: string;
}

export interface Notification {
  id: string;
  type: 'low-stock' | 'unavailable' | 'alert';
  severity: 'warning' | 'error' | 'info';
  message: string;
  sku?: string;
  orderId?: string;
  timestamp: string;
}

