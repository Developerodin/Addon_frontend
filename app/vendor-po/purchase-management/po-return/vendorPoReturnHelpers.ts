import type { VendorPurchaseOrder } from '@/shared/services/vendorPurchaseOrderService';
import type {
  VendorPoReturnBoxPreview,
  VendorPoReturnPendingArticleQtyLine,
} from '@/shared/services/vendorPoReturnService';

export type VpoOption = {
  id: string;
  vpoNumber: string;
  vendorLabel: string;
  currentStatus: string;
  hasReceivedLots: boolean;
};

export type PendingBoxRow = VendorPoReturnBoxPreview;
export type PendingArticleQtyRow = VendorPoReturnPendingArticleQtyLine;

/**
 * Extracts a readable error message from unknown errors.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Default date bounds for VPO list (last 180 days).
 */
export function getVpoQueryDateBounds(): { start_date: string; end_date: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 180);
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { start_date: fmt(start), end_date: fmt(end) };
}

/**
 * Maps API VPO rows to picker options (only POs with received lots).
 */
export function mapToVpoOptions(orders: VendorPurchaseOrder[]): VpoOption[] {
  return orders
    .filter((o) => (o.receivedLotDetails?.length ?? 0) > 0)
    .map((o) => {
      const vendor = o.vendor;
      const vendorLabel =
        typeof vendor === 'object'
          ? vendor?.header?.vendorName || vendor?.header?.vendorCode || 'Vendor'
          : 'Vendor';
      return {
        id: o.id,
        vpoNumber: o.vpoNumber,
        vendorLabel,
        currentStatus: o.currentStatus,
        hasReceivedLots: true,
      };
    });
}

/**
 * Sum staged box units and article qty for finalize confirmation.
 */
export function sumPendingReturnUnits(
  boxes: PendingBoxRow[],
  articleQtyLines: PendingArticleQtyRow[]
): { boxCount: number; boxUnits: number; articleQtyUnits: number } {
  const boxCount = boxes.length;
  const boxUnits = boxes.reduce((s, r) => s + (Number(r.numberOfUnits) || 0), 0);
  const articleQtyUnits = articleQtyLines.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  return { boxCount, boxUnits, articleQtyUnits };
}
