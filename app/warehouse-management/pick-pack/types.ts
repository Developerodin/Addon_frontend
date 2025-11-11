// Pick & Pack types for warehouse management

export type PickStatus = 'pending' | 'picking' | 'picked' | 'verified';
export type PackStatus = 'pending' | 'packing' | 'packed' | 'verified';

export type PickItemStatus = 'pending' | 'picked' | 'verified' | 'skipped';
export type PackItemStatus = 'pending' | 'packed' | 'verified' | 'damaged' | 'missing';

export interface RackLocation {
  row: string;
  column: string;
  basketNo: string;
  zone: string;
}

export interface PickItem {
  id: string;
  sku: string;
  name: string;
  totalQuantity: number;
  pickedQuantity: number;
  rackLocation: RackLocation;
  pickingPath: number; // Order in the optimized picking path
  status: PickItemStatus;
  orders: string[]; // Order IDs that require this SKU
  unit: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PackItem {
  id: string;
  orderId: string;
  orderNumber: string;
  sku: string;
  name: string;
  quantity: number;
  packedQuantity: number;
  status: PackItemStatus;
  labelPrinted: boolean;
  customerName: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PickList {
  id: string;
  batchId: string;
  createdAt: string;
  status: PickStatus;
  items: PickItem[];
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PackList {
  id: string;
  batchId: string;
  createdAt: string;
  status: PackStatus;
  orders: PackOrder[];
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PackOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  items: PackItem[];
  totalItems: number;
  packedItems: number;
  status: PackItemStatus;
  labelPrinted: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface DamageMissingReport {
  id: string;
  orderId: string;
  orderNumber: string;
  sku: string;
  itemName: string;
  type: 'damage' | 'missing';
  quantity: number;
  reason: string;
  reportedBy: string;
  reportedAt: string;
  images?: string[];
  notes?: string;
}

export interface QRScanResult {
  type: 'pick' | 'pack';
  sku?: string;
  orderId?: string;
  rackLocation?: RackLocation;
  timestamp: string;
  success: boolean;
  message?: string;
}


