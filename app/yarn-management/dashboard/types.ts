export interface YarnInventory {
  id: string;
  yarnName: string;
  weight: number; // in kg (total from LTS + STS)
  conesLongTerm: number; // number of cones in long-term storage
  conesShortTerm: number; // number of cones in short-term storage
  blockedQty: number; // blocked quantity for production
  availableQty: number; // available quantity (net weight - blocked)
  unitOfMeasurement: string;
  ratePerUnit: number;
  totalValue: number;
  lastUpdated: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  supplier: string;
  lotNo?: string;
  // API fields
  yarnId?: string;
  inventoryStatus?: 'in_stock' | 'low_stock' | 'soon_to_be_low';
  overbooked?: boolean;
}

export interface InventorySummary {
  totalStock: number; // total weight in kg
  purchaseYarn: number; // total purchase yarn quantity
  pendingDeliveries: number; // number of pending deliveries
  inventoryAlerts: number; // number of alerts
  inventoryValue: number; // total value of inventory
}

export interface POYarnItem {
  yarnName: string;
  quantity: number;
  ratePerUnit: number;
  totalValue: number;
}

export interface PendingDelivery {
  id: string;
  yarnName: string; // Keep for backward compatibility in table display
  quantity: number; // Total quantity for display
  expectedDate: string;
  supplier: string;
  poNumber: string;
  yarns?: POYarnItem[]; // Multiple yarns in the PO
}

export interface InventoryAlert {
  id: string;
  yarnId: string;
  yarnName: string;
  alertType: 'Low Stock' | 'Out of Stock' | 'Overblocked';
  message: string;
  createdAt: string;
  severity: 'low' | 'medium' | 'high';
  // API fields from requisitions
  minQty?: number;
  availableQty?: number;
  blockedQty?: number;
  alertStatus?: 'below_minimum' | 'overbooked' | null;
}

