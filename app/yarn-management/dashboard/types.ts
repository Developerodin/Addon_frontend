export interface YarnInventory {
  id: string;
  yarnName: string;
  weight: number; // in kg
  conesLongTerm: number; // number of cones in long-term storage
  conesShortTerm: number; // number of cones in short-term storage
  blockedQty: number; // blocked quantity for production
  availableQty: number; // available quantity (weight - blocked)
  unitOfMeasurement: string;
  ratePerUnit: number;
  totalValue: number;
  lastUpdated: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  supplier: string;
  lotNo?: string;
}

export interface InventorySummary {
  totalStock: number; // total weight in kg
  purchaseYarn: number; // total purchase yarn quantity
  pendingDeliveries: number; // number of pending deliveries
  inventoryAlerts: number; // number of alerts
  inventoryValue: number; // total value of inventory
}

export interface PendingDelivery {
  id: string;
  yarnName: string;
  quantity: number;
  expectedDate: string;
  supplier: string;
  poNumber: string;
}

export interface InventoryAlert {
  id: string;
  yarnId: string;
  yarnName: string;
  alertType: 'Low Stock' | 'Out of Stock' | 'Overblocked';
  message: string;
  createdAt: string;
  severity: 'low' | 'medium' | 'high';
}

