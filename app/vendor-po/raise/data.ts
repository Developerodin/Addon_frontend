import type { Vendor } from "../vendor-list/types";
import type { VendorPOArticle, VendorPO } from "./types";

/** Base vendor list – matches vendor-list mock. Merge with sessionStorage new vendor when available. */
export const MOCK_VENDORS: Vendor[] = [
  { id: "1", vendorCode: "VND001", vendorName: "ABC Textiles Ltd", contactPerson: "Raj Kumar", phone: "+91 98765 43210", city: "Coimbatore", status: "active", email: "raj@abctextiles.com", address: "123 Industrial Area, Coimbatore" },
  { id: "2", vendorCode: "VND002", vendorName: "Premier Yarn Co", contactPerson: "Sita Devi", phone: "+91 87654 32109", city: "Tiruppur", status: "active", email: "sita@premieryarn.com" },
  { id: "3", vendorCode: "VND003", vendorName: "Global Fibres Inc", contactPerson: "Amit Shah", phone: "+91 76543 21098", city: "Chennai", status: "inactive" },
];

/** Articles for dropdown/search – replace with API when ready */
export const MOCK_ARTICLES: VendorPOArticle[] = [
  { id: "art1", code: "FAB-A", name: "Fabric A" },
  { id: "art2", code: "FAB-B", name: "Fabric B" },
  { id: "art3", code: "AR-X", name: "Article X" },
  { id: "art4", code: "AR-Y", name: "Article Y" },
  { id: "art5", code: "THR-Z", name: "Thread Z" },
  { id: "art6", code: "LIN-01", name: "Lining Cotton" },
  { id: "art7", code: "EL-01", name: "Elastic Band" },
];

const STORAGE_KEY_NEW_VENDOR = "vendor-po-new-vendor";
const STORAGE_KEY_ORDERS = "vendor-po-orders";

/** Default list when no sessionStorage data – replace with API later */
export const MOCK_VENDOR_POS: VendorPO[] = [
  {
    id: "1",
    poNo: "VPO-2026-001",
    poDate: "2026-01-15",
    vendorId: "1",
    vendorName: "ABC Textiles Ltd",
    priority: "High",
    totalQty: 500,
    receivedQty: 0,
    status: "Approved",
    articleSummary: "Article A, Article B",
    remarks: "Initial fabric PO for season launch",
    lineItems: [
      { id: "li-1a", articleId: "art1", articleCode: "FAB-A", articleName: "Fabric A", orderedQty: 300, receivedQty: 0 },
      { id: "li-1b", articleId: "art2", articleCode: "FAB-B", articleName: "Fabric B", orderedQty: 200, receivedQty: 0 },
    ],
    createdAt: "2024-01-10T09:15:00.000Z",
    updatedAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "2",
    poNo: "VPO-2026-002",
    poDate: "2026-01-18",
    vendorId: "2",
    vendorName: "Premier Yarn Co",
    priority: "Medium",
    totalQty: 1200,
    receivedQty: 600,
    status: "Partially Received",
    articleSummary: "Article X, Article Y",
    remarks: "Yarn replenishment for knitting lines",
    lineItems: [
      { id: "li-2a", articleId: "art3", articleCode: "YRN-X", articleName: "Yarn X", orderedQty: 600, receivedQty: 600 },
      { id: "li-2b", articleId: "art4", articleCode: "YRN-Y", articleName: "Yarn Y", orderedQty: 600, receivedQty: 0 },
    ],
    createdAt: "2024-01-16T11:30:00.000Z",
    updatedAt: "2024-01-20T08:45:00.000Z",
  },
  {
    id: "3",
    poNo: "VPO-2026-003",
    poDate: "2026-01-10",
    vendorId: "3",
    vendorName: "Global Fibres Inc",
    priority: "Urgent",
    totalQty: 800,
    receivedQty: 800,
    status: "Fully Received",
    articleSummary: "Article Z",
    remarks: "Urgent thread requirement for export order",
    lineItems: [
      { id: "li-3a", articleId: "art5", articleCode: "THR-Z", articleName: "Thread Z", orderedQty: 800, receivedQty: 800 },
    ],
    createdAt: "2024-01-08T07:20:00.000Z",
    updatedAt: "2024-01-12T14:10:00.000Z",
  },
  {
    id: "4",
    poNo: "VPO-2026-004",
    poDate: "2026-01-22",
    vendorId: "1",
    vendorName: "ABC Textiles Ltd",
    priority: "Low",
    totalQty: 950,
    receivedQty: 150,
    status: "Approved",
    articleSummary: "Article X, Article Y",
    remarks: "Accessories PO for upcoming styles",
    lineItems: [
      { id: "li-4a", articleId: "art6", articleCode: "LIN-01", articleName: "Lining Cotton", orderedQty: 700, receivedQty: 150 },
      { id: "li-4b", articleId: "art7", articleCode: "EL-01", articleName: "Elastic Band", orderedQty: 250, receivedQty: 0 },
    ],
    createdAt: "2024-01-21T10:05:00.000Z",
    updatedAt: "2024-01-23T09:40:00.000Z",
  },
];

/** Get vendors list: merge sessionStorage new vendor with base list (for use in PO form). */
export function getVendors(): Vendor[] {
  if (typeof window === "undefined") return MOCK_VENDORS;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_NEW_VENDOR);
    if (!raw) return MOCK_VENDORS;
    const newVendor = JSON.parse(raw) as Vendor;
    const exists = MOCK_VENDORS.some((v) => v.id === newVendor.id || v.vendorCode === newVendor.vendorCode);
    if (!exists) return [newVendor, ...MOCK_VENDORS];
  } catch (_) {}
  return MOCK_VENDORS;
}

/** Get stored POs from sessionStorage (used by list and edit). */
export function getStoredOrders(): VendorPO[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_ORDERS);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Save POs to sessionStorage. */
export function setStoredOrders(orders: VendorPO[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
}
