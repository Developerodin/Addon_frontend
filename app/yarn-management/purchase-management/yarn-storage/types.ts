// Yarn Storage Types

export interface RackLocation {
  id: string;
  rackCode: string;
  row: number;
  column: number;
  shelf?: number;
  /** Section code (e.g. B7-G-02) so grid can show multiple sections */
  sectionCode?: string;
  barcode: string;
  capacity: number;
  currentBoxes: number;
  status: 'Available' | 'Occupied' | 'Reserved' | 'Maintenance';
}

export interface PackedBox {
  id: string;
  boxBarcode: string;
  yarnId: string;
  yarnName: string;
  batchNumber: string;
  weight: number; // in kg
  numberOfCones: number;
  qcApproved: boolean;
  qcApprovedDate?: string;
  rackLocation?: RackLocation;
  storedDate?: string;
  status: 'QC_Pending' | 'QC_Approved' | 'Stored' | 'Issued';
  /** PO number from yarn-box API (e.g. PO-2026-415) */
  poNumber?: string;
  /** Supplier name from yarn-box API (for barcode print) */
  supplierName?: string;
}

export interface Cone {
  id: string;
  coneBarcode: string;
  boxId: string;
  boxBarcode: string;
  yarnId: string;
  yarnName: string;
  weight: number; // in kg
  status: 'In_Box' | 'Transferred' | 'Issued';
  transferredDate?: string;
  issuedDate?: string;
}

export interface ShortTermInventory {
  id: string;
  yarnId: string;
  yarnName: string;
  batchNumber: string;
  totalCones: number;
  totalWeight: number; // in kg
  cones: Cone[];
  lastUpdated: string;
}

export interface StoragePreferences {
  layoutView: 'grid' | 'list';
  showEmptySlots: boolean;
  gridColumns: number;
  gridRows: number;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
}

export interface InternalTransferData {
  boxBarcode: string;
  boxId: string;
  yarnId: string;
  yarnName: string;
  numberOfCones: number;
  totalWeight: number;
  cones: Cone[];
}

