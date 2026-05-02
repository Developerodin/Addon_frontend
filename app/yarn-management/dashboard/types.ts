export interface YarnInventory {
  id: string;
  yarnName: string;
  weight: number; // in kg (total from LTS + STS)
  longTermWeight: number; // total weight in long-term storage (boxes in LT)
  shortTermWeight: number; // total weight in short-term storage (cones only)
  unallocatedWeight: number; // boxes without storage location
  conesLongTerm: number; // number of cones in long-term storage (always 0)
  conesShortTerm: number; // number of cones in short-term storage
  blockedQty: number; // blocked quantity for production (issued cones)
  availableQty: number; // available quantity (LT net + ST net - blocked)
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
  /** LT + ST + unallocated (net kg on hand); from GET /yarn-inventories/summary */
  totalStock: number;
  purchaseYarn: number; // total purchase yarn quantity
  pendingDeliveries: number; // number of pending deliveries
  inventoryAlerts: number; // number of alerts
  inventoryValue: number; // total value of inventory
  /** Net kg in long-term storage (LTS) */
  longTermKg: number;
  /** Net kg in short-term storage (STS) */
  shortTermKg: number;
  /** Net kg QC-approved without a storage slot */
  unallocatedKg: number;
  /** Issued / blocked for production (kg) */
  blockedKg: number;
  /** LT + ST only (excludes unallocated) */
  ltPlusShortKg: number;
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

