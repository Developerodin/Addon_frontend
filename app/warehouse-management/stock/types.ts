// Stock In & Stock Out types

export type StockInStatus = 'pending' | 'received' | 'inspected' | 'assigned' | 'completed';
export type StockOutStatus = 'pending' | 'picked' | 'quality-checked' | 'packed' | 'dispatched';
export type DocumentType = 'GRN' | 'Delivery Challan' | 'Purchase Order';
export type QualityStatus = 'passed' | 'failed' | 'pending';
export type CourierService = 'FedEx' | 'UPS' | 'DHL' | 'BlueDart' | 'DTDC' | 'Custom';

export interface StockInItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  status: StockInStatus;
}

export interface StockInDocument {
  id: string;
  documentNumber: string;
  documentType: DocumentType;
  supplierName: string;
  supplierCode: string;
  date: string;
  items: StockInItem[];
  totalValue: number;
  status: StockInStatus;
  scannedFile?: string;
  uploadedFile?: File;
}

export interface LocationSuggestion {
  rackId: string;
  zone: string;
  shelf: string;
  position: string;
  capacity: number;
  availableSpace: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface StockAssignment {
  itemId: string;
  sku: string;
  quantity: number;
  location: {
    rackId: string;
    zone: string;
    shelf: string;
    position: string;
  };
  assignedBy: string;
  assignedAt: string;
}

export interface StockOutItem {
  id: string;
  sku: string;
  name: string;
  requestedQuantity: number;
  pickedQuantity: number;
  location: string;
  qualityStatus: QualityStatus;
  batchNumber?: string;
}

export interface PickPackList {
  id: string;
  orderNumber: string;
  date: string;
  items: StockOutItem[];
  status: StockOutStatus;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
}

export interface QualityCheck {
  id: string;
  itemId: string;
  sku: string;
  quantity: number;
  status: QualityStatus;
  checkedBy: string;
  checkedAt: string;
  notes?: string;
  defects?: string[];
}

export interface DispatchItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  batchNumber?: string;
}

export interface DispatchSummary {
  id: string;
  dispatchNumber: string;
  date: string;
  items: DispatchItem[];
  customerDetails: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  };
  courierService?: CourierService;
  trackingNumber?: string;
  shippingManifest: ShippingManifest;
  status: StockOutStatus;
}

export interface ShippingManifest {
  totalItems: number;
  totalWeight: number;
  totalValue: number;
  packageCount: number;
  specialInstructions?: string;
}

export interface CourierIntegration {
  id: string;
  serviceName: CourierService;
  apiKey?: string;
  isConfigured: boolean;
  isActive: boolean;
  lastSync?: string;
}

