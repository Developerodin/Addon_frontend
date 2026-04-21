// Pick & Pack types for warehouse management (UI state only)

export type PickListStatus = 'generated' | 'picking-in-progress' | 'picking-done';
export type PickItemStatus = 'pending' | 'partial' | 'picked' | 'verified' | 'skipped';

export type PackListStatus = 'generated' | 'packing-in-progress' | 'packing-done' | 'ready-for-dispatch';
export type PackBatchStatus = 'ready' | 'packing' | 'packed' | 'dispatch-ready';
export type PackOrderStatus = 'ready' | 'packing' | 'packed' | 'dispatch-ready';
export type PackItemStatus = 'pending' | 'partial' | 'packed' | 'verified' | 'damaged' | 'missing';

export type BarcodeLabelType = 'item' | 'carton' | 'order';

export interface RackLocation {
  zone: string; // Zone
  row: string; // Row
  column: string; // Column
  bin: string; // Bin
}

export interface PickItem {
  id: string;
  sku: string;
  styleCode?: string;
  name: string;
  shade?: string;
  orderNumber?: string;
  imageUrl?: string;
  pathIndex: number;
  rackLocation?: RackLocation;
  requiredQty: number;
  pickedQty: number;
  unit: string;
  status: PickItemStatus;
  linkedOrderIds: string[];
  batchId?: string;
}

export interface PickList {
  id: string;
  pickBatchId: string;
  createdAt: string;
  status: PickListStatus;
  items: PickItem[];
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PackItem {
  id: string;
  sku: string;
  name: string;
  pickedQty: number;
  packedQty: number;
  status: PackItemStatus;
  // Barcodes are generated at PACK stage only (never at pick/inward)
  itemBarcode?: string;
}

export interface PackOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: PackOrderStatus;
  priority: 'low' | 'medium' | 'high';
  items: PackItem[];
}

export interface PackCarton {
  id: string;
  cartonBarcode?: string;
  createdAt: string;
}

export interface PackBatch {
  id: string; // Pack Batch ID
  orderIds: string[];
  status: PackBatchStatus;
  orders: PackOrder[];
  cartons: PackCarton[];
  createdAt: string;
}

export interface PackList {
  id: string;
  createdAt: string;
  status: PackListStatus;
  batches: PackBatch[];
  assignedTo?: string;
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

export interface BarcodeGenerateRequest {
  types: BarcodeLabelType[];
  quantity: number;
}

export interface BarcodeGenerateResult {
  type: BarcodeLabelType;
  quantity: number;
  previewText: string;
}

// ─── Order-wise pick list types ──────────────────────────────────────────────

export interface PickListOrderItem {
  id: string;
  skuCode: string;
  styleCode: string;
  shade: string;
  size: string;
  quantity: number;
  pickupQuantity: number;
  status: 'pending' | 'partial' | 'picked';
}

export interface PickListOrderGroup {
  orderId: string;
  orderNumber: string;
  clientName: string;
  order?: Record<string, unknown>;
  items: PickListOrderItem[];
  totalQuantity: number;
  totalPickupQuantity: number;
  totalItems: number;
  pendingCount: number;
  partialCount: number;
  pickedCount: number;
  overallStatus: 'pending' | 'partial' | 'picked';
}

export interface PickListOrderWiseSummary {
  total: number;
  pending: number;
  partial: number;
  picked: number;
}

export interface PickListOrderWiseResponse {
  results: PickListOrderGroup[];
  summary: PickListOrderWiseSummary;
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

