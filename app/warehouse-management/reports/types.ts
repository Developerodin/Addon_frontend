export interface StockFlowRecord {
  id: string;
  date: string;
  time: string;
  type: 'stock-in' | 'stock-out';
  sku: string;
  productName: string;
  quantity: number;
  location: string;
  rackId: string;
  zone: string;
  reason: string;
  operator: string;
  documentNumber: string;
}

export interface OrderFulfilmentMetrics {
  date: string;
  totalOrders: number;
  fulfilledOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  fulfillmentRate: number;
  avgFulfillmentTime: number; // in hours
  onTimeDeliveryRate: number;
  totalValue: number;
  byChannel: {
    online: number;
    offline: number;
    wholesale: number;
  };
}

export interface RackUtilizationData {
  rackId: string;
  rackName: string;
  zone: string;
  row: number;
  position: number;
  capacity: number;
  currentItems: number;
  utilization: number;
  items: Array<{
    sku: string;
    productName: string;
    quantity: number;
    lastUpdated: string;
  }>;
}

export interface ShrinkageRecord {
  id: string;
  date: string;
  time: string;
  type: 'damage' | 'theft' | 'expiry' | 'error' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sku: string;
  productName: string;
  quantity: number;
  value: number;
  location: string;
  rackId: string;
  reportedBy: string;
  description: string;
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  userRole: string;
  entityType: 'order' | 'stock' | 'rack' | 'system' | 'user';
  entityId: string;
  entityName: string;
  changes?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
  ipAddress: string;
  location: string;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  zone?: string;
  rackId?: string;
  sku?: string;
  type?: string;
  severity?: string;
  status?: string;
  user?: string;
}

