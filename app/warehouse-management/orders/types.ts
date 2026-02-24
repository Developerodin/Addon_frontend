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

// Order process lifecycle (pipeline buckets)
export type OrderLifecycleStatus =
  | 'order-received'
  | 'picking-done'
  | 'ready-for-barcode'
  | 'ready-for-scanning'
  | 'scanning-done'
  | 'billing-done-dispatch-pending'
  | 'dispatched';

// Order-level stock block status
export type StockBlockStatus = 'available' | 'tentative-block' | 'pick-block';

// Dispatch tracking entry
export interface DispatchTracking {
  courierName: string;
  trackingNumber: string;
  dispatchDate: string;
  vehicleAwb: string;
  remarks: string;
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
  // Stock blocking (order-level)
  stockBlockStatus?: StockBlockStatus;
  // Order process pipeline
  lifecycleStatus?: OrderLifecycleStatus;
  // Dispatch tracking (when dispatched)
  tracking?: DispatchTracking;
  // Additional API fields
  source?: string;
  payment?: {
    method: string;
    status: string;
    amount: number;
  };
  logistics?: {
    status: string;
    trackingId: string;
    warehouse: string;
    picker: string;
  };
  meta?: {
    notes: string;
  };
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

// Gap report row (stock vs orders shortage)
export interface GapReportRow {
  styleCode: string;
  itemName: string;
  currentStock: number;
  ordersQty: number;
  requiredQty: number;
  shortage: number;
  factoryDispatchDate: string;
}

// Dispatch approval record (Sales/Accounts must approve)
export interface DispatchApprovalRecord {
  id: string;
  orderId: string;
  channel: string;
  requestedBy: string;
  pendingApprover: 'sales' | 'accounts' | 'both';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
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


