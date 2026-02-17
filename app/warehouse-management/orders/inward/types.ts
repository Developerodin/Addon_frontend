// Inward receiving types for WHMS Orders workflow

export type InwardStatus = "pending" | "partial" | "received" | "qc-pending" | "completed";

export interface InwardItem {
  sku: string;
  name: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unit?: string;
}

export interface InwardRecord {
  id: string;
  grnNumber: string;
  reference?: string;
  date: string;
  supplier: string;
  status: InwardStatus;
  items: InwardItem[];
  totalItems: number;
  notes?: string;
}
