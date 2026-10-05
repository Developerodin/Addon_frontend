import * as XLSX from "xlsx";
import {
  whmsWarehouseClients,
  type WarehouseClient,
} from "@/shared/services/whmsWarehouseClientService";
import {
  warehouseOrderFlowStatusLabel,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";
import {
  whmsScanning,
  type ScanSession,
  type ScanSessionItem,
} from "@/shared/services/whmsFulfilmentService";

/** Display fields pulled from a warehouse client, with order name as fallback. */
interface ClientExcelFields {
  name: string;
  type: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
}

/**
 * Format an ISO date for the Excel sheet. Blank when missing or invalid.
 * @param raw - ISO timestamp from the order or scan session
 */
function formatWhen(raw?: string): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

/**
 * Pick the client fields warehouse staff use to verify who the order is for.
 * Store clients keep address/GST on storeProfile; other types use the root fields.
 * @param client - Warehouse client, when the lookup succeeded
 * @param order - Order the drawer is showing
 */
function clientFields(client: WarehouseClient | null, order: WarehouseOrder): ClientExcelFields {
  const store = client?.storeProfile;
  const address = [client?.address || store?.address || "", client?.locality || ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");

  return {
    name:
      client?.retailerName?.trim() ||
      store?.brand?.trim() ||
      store?.billCode?.trim() ||
      order.clientName ||
      "",
    type: client?.type || order.clientType || "",
    contact: client?.contactPerson || store?.smName || "",
    phone: client?.mobilePhone || client?.phone1 || store?.smContact || store?.storeLandlineNo || "",
    email: client?.email || store?.storeMailId || "",
    address,
    city: client?.city || store?.city || "",
    state: client?.state || store?.state || "",
    pincode: client?.zipCode || store?.pincode || "",
    gstin: client?.gstin || store?.gst || "",
  };
}

/**
 * Lines that were actually scanned. Zero-qty rows are left out so the sheet is only scanned qty.
 * @param session - Latest scan session for the order
 */
function scannedLines(session: ScanSession | null): ScanSessionItem[] {
  return (session?.items || [])
    .filter((item) => Number(item.scannedQty) > 0)
    .sort((a, b) => {
      const byStyle = a.styleCode.localeCompare(b.styleCode);
      if (byStyle !== 0) return byStyle;
      return (a.size || "").localeCompare(b.size || "");
    });
}

/**
 * Order GET populates clientId with the client document. Fall back to a string id fetch.
 * @param order - Order the drawer is showing
 */
function embeddedClient(order: WarehouseOrder): { client: WarehouseClient | null; clientId: string } {
  const raw = order.clientId as unknown;
  if (raw && typeof raw === "object") {
    const doc = raw as WarehouseClient & { _id?: string };
    return { client: doc, clientId: String(doc.id || doc._id || "") };
  }
  return { client: null, clientId: typeof raw === "string" ? raw : "" };
}

/**
 * Load the order's client. A failed lookup is recorded on the sheet instead of blocking the download.
 * @param order - Order the drawer is showing
 */
async function loadClient(order: WarehouseOrder): Promise<{ client: WarehouseClient | null; note: string }> {
  const embedded = embeddedClient(order);
  if (embedded.client?.retailerName || embedded.client?.storeProfile || embedded.client?.type) {
    return { client: embedded.client, note: "" };
  }
  if (!embedded.clientId) return { client: null, note: "" };
  try {
    const client = await whmsWarehouseClients.get(embedded.clientId);
    return { client, note: "" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load client";
    return { client: null, note: message };
  }
}

/**
 * Order + client block. Ends before the scanned-style table for this order only.
 * @param order - Warehouse order
 * @param client - Resolved client, if any
 * @param clientNote - Lookup failure text
 * @param session - Latest scan session
 */
function detailRows(
  order: WarehouseOrder,
  client: WarehouseClient | null,
  clientNote: string,
  session: ScanSession | null,
): (string | number)[][] {
  const fields = clientFields(client, order);
  const rows: (string | number)[][] = [
    ["Order Details"],
    ["Order Number", order.orderNumber || order.id],
    ["Addon Order ID", order.addonOrderId || ""],
    ["Order Date", formatWhen(order.date)],
    ["Status", warehouseOrderFlowStatusLabel(order.flowStatus || order.status)],
    ["Scan Status", session?.status || "No scan session"],
    ["Started By", session?.startedByName || ""],
    ["Completed By", session?.completedByName || ""],
    ["Completed At", formatWhen(session?.completedAt)],
    [],
    ["Client Details"],
    ["Client Name", fields.name],
    ["Client Type", fields.type],
    ["Contact", fields.contact],
    ["Phone", fields.phone],
    ["Email", fields.email],
    ["Address", fields.address],
    ["City", fields.city],
    ["State", fields.state],
    ["Pincode", fields.pincode],
    ["GSTIN", fields.gstin],
  ];
  if (clientNote) rows.push(["Client lookup", clientNote]);
  return rows;
}

/**
 * Scanned style-code rows. Quantity is scanned qty only, and the sheet ends on this order's total.
 * @param order - Warehouse order (used on the total row)
 * @param lines - Items with scanned qty greater than zero
 */
function scanRows(order: WarehouseOrder, lines: ScanSessionItem[]): (string | number)[][] {
  const header: (string | number)[][] = [
    [],
    ["Scanned Style Codes"],
    ["Sr No", "Style Code", "Size", "Shade", "Scanned Qty"],
  ];
  if (!lines.length) {
    return [...header, ["", "No scanned quantity on this order", "", "", 0]];
  }
  const body = lines.map((item, index) => [
    index + 1,
    item.styleCode,
    item.size || "",
    item.shade || "",
    Number(item.scannedQty) || 0,
  ]);
  const total = lines.reduce((sum, item) => sum + (Number(item.scannedQty) || 0), 0);
  body.push(["", `Total — ${order.orderNumber || order.id}`, "", "", total]);
  return [...header, ...body];
}

/**
 * Download one workbook for the open order: order details, client details, then scanned style qty.
 * Expected / order quantity is not included.
 * @param order - Order currently open in the journey drawer
 * @returns Count of style lines that had a scanned quantity
 */
export async function downloadOrderJourneyScanExcel(order: WarehouseOrder): Promise<number> {
  const [{ client, note }, session] = await Promise.all([
    loadClient(order),
    whmsScanning.getLatestScanSessionForOrder(order.id),
  ]);
  const lines = scannedLines(session);
  const sheet = XLSX.utils.aoa_to_sheet([
    ...detailRows(order, client, note, session),
    ...scanRows(order, lines),
  ]);
  sheet["!cols"] = [{ wch: 18 }, { wch: 36 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Scanned Qty");

  const safeName = (order.orderNumber || order.id).replace(/[^\w-]+/g, "_").slice(0, 60);
  XLSX.writeFile(workbook, `${safeName || "order"}-scanned-qty.xlsx`);
  return lines.length;
}
