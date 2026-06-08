import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";
import yarnBoxService, { type YarnBox } from "@/shared/services/yarnBoxService";

const PENDING_LOT_STATUSES = new Set(["lot_pending", "lot_qc_pending"]);

export interface YarnQcHistoryMediaItem {
  key: string;
  url: string;
  type: "image" | "video";
}

export interface YarnQcLotHistoryRecord {
  lotNumber: string;
  lotStatus: string;
  qcStatus: string;
  qcBy: string;
  qcDate: string;
  remarks: string;
  boxCount: number;
  media: YarnQcHistoryMediaItem[];
}

export interface YarnQcHistoryOrderSummary {
  id: string;
  orderNumber: string;
  supplier: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  qcLotCount: number;
  lastQcDate: string | null;
}

export interface FetchYarnQcHistoryParams {
  startDate?: string;
  endDate?: string;
}

/** Default history window: 12 months (main QC list only uses 1 month). */
export function getDefaultQcHistoryStartDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date.toISOString().split("T")[0];
}

/** Today's date as YYYY-MM-DD for history end filter. */
export function getDefaultQcHistoryEndDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Maps raw API mediaUrl object to typed attachment list.
 */
export function parseQcMediaUrls(mediaUrl?: Record<string, string> | null): YarnQcHistoryMediaItem[] {
  if (!mediaUrl || typeof mediaUrl !== "object") return [];
  return Object.entries(mediaUrl)
    .filter(([, url]) => typeof url === "string" && url.trim().length > 0)
    .map(([key, url]) => ({
      key,
      url: url.trim(),
      type: key.toLowerCase().startsWith("video") ? "video" : "image",
    }));
}

/**
 * Extracts display PO number from a raw API order object.
 */
function extractOrderNumber(apiOrder: Record<string, unknown>): string {
  return (
    String(
      apiOrder.poNumber ??
        apiOrder.orderNumber ??
        apiOrder.order_number ??
        apiOrder.po_number ??
        ""
    ).trim() || "—"
  );
}

/**
 * Extracts supplier label from a raw API order object.
 */
function extractSupplier(apiOrder: Record<string, unknown>): string {
  const supplier = apiOrder.supplier;
  return (
    String(
      apiOrder.supplierName ??
        (typeof supplier === "object" && supplier !== null
          ? (supplier as { brandName?: string; name?: string }).brandName ??
            (supplier as { name?: string }).name
          : supplier) ??
        ""
    ).trim() || "—"
  );
}

/**
 * Maps a raw API order into a history summary row.
 */
function mapOrderToSummary(
  apiOrder: Record<string, unknown>,
  qcLotCount: number
): YarnQcHistoryOrderSummary {
  return {
    id: String(apiOrder._id ?? apiOrder.id ?? ""),
    orderNumber: extractOrderNumber(apiOrder),
    supplier: extractSupplier(apiOrder),
    orderDate: String(
      apiOrder.createDate ??
        apiOrder.orderDate ??
        apiOrder.order_date ??
        apiOrder.createdAt ??
        ""
    ),
    status: String(apiOrder.currentStatus ?? apiOrder.status ?? apiOrder.status_code ?? ""),
    totalAmount: Number(apiOrder.total ?? apiOrder.totalAmount ?? apiOrder.grandTotal ?? 0),
    qcLotCount,
    lastQcDate: null,
  };
}

/**
 * True when the PO has at least one lot past pending QC, or boxes already carry qcData.
 */
function evaluatePoQcHistory(
  apiOrder: Record<string, unknown>,
  orderNumber: string,
  poNumbersWithBoxQc: Set<string>
): { hasHistory: boolean; qcLotCount: number } {
  const lots =
    (apiOrder.receivedLotDetails as Array<{ status?: string }> | undefined) || [];

  const completedLots = lots.filter((lot) => {
    const status = String(lot.status ?? "").trim();
    return status.length > 0 && !PENDING_LOT_STATUSES.has(status);
  });

  if (completedLots.length > 0) {
    return { hasHistory: true, qcLotCount: completedLots.length };
  }

  if (orderNumber !== "—" && poNumbersWithBoxQc.has(orderNumber)) {
    return { hasHistory: true, qcLotCount: Math.max(lots.length, 1) };
  }

  return { hasHistory: false, qcLotCount: 0 };
}

/**
 * Maps PO lot status to box QC status label.
 */
function lotStatusToQcStatus(lotStatus: string): string {
  if (lotStatus === "lot_accepted") return "qc_approved";
  if (lotStatus === "lot_rejected" || lotStatus === "lot_returned_to_vendor") {
    return "qc_rejected";
  }
  return "";
}

/**
 * Builds per-lot QC history from yarn boxes (all boxes in a lot share the same qcData).
 */
export function buildLotQcRecordsFromBoxes(
  boxes: YarnBox[],
  lotStatuses: Record<string, string>
): YarnQcLotHistoryRecord[] {
  const byLot = new Map<string, { boxes: YarnBox[]; qcBox?: YarnBox }>();

  for (const box of boxes) {
    const lot = String(box.lotNumber ?? "").trim();
    if (!lot) continue;
    const entry = byLot.get(lot) ?? { boxes: [], qcBox: undefined };
    entry.boxes.push(box);
    if (box.qcData?.status && !entry.qcBox) {
      entry.qcBox = box;
    }
    byLot.set(lot, entry);
  }

  const records: YarnQcLotHistoryRecord[] = [];

  for (const [lotNumber, { boxes: lotBoxes, qcBox }] of byLot.entries()) {
    const qc = qcBox?.qcData;
    if (!qc?.status) continue;

    records.push({
      lotNumber,
      lotStatus: lotStatuses[lotNumber] ?? "—",
      qcStatus: qc.status,
      qcBy: qc.username || "—",
      qcDate: qc.date ? new Date(qc.date).toISOString() : "",
      remarks: qc.remarks?.trim() || "—",
      boxCount: lotBoxes.length,
      media: parseQcMediaUrls(qc.mediaUrl),
    });
  }

  return sortLotQcRecords(records);
}

/**
 * Sorts lot QC records newest first.
 */
function sortLotQcRecords(records: YarnQcLotHistoryRecord[]): YarnQcLotHistoryRecord[] {
  return records.sort((a, b) => {
    const aTime = a.qcDate ? new Date(a.qcDate).getTime() : 0;
    const bTime = b.qcDate ? new Date(b.qcDate).getTime() : 0;
    return bTime - aTime;
  });
}

type PoLotWithQc = {
  lotNumber?: string;
  status?: string;
  numberOfBoxes?: number;
  qcData?: {
    username?: string;
    date?: string;
    remarks?: string;
    status?: string;
    mediaUrl?: Record<string, string>;
  };
};

/**
 * Maps stored qcData.mediaUrl keys to display rows for the QC process page.
 */
export function qcMediaUrlToDisplayItems(
  mediaUrl?: Record<string, string> | null
): YarnQcHistoryMediaItem[] {
  return parseQcMediaUrls(mediaUrl);
}

/**
 * Merges box qcData with PO lot qcData; PO lot is canonical when box media is missing.
 */
export function mergeLotQcRecordsFromPoAndBoxes(
  apiOrder: Record<string, unknown>,
  boxes: YarnBox[]
): YarnQcLotHistoryRecord[] {
  const lots = (apiOrder.receivedLotDetails as PoLotWithQc[]) || [];
  const lotStatuses: Record<string, string> = {};

  for (const lot of lots) {
    const ln = String(lot.lotNumber ?? "").trim();
    if (ln) lotStatuses[ln] = String(lot.status ?? "");
  }

  const byLot = new Map<string, YarnQcLotHistoryRecord>();
  for (const record of buildLotQcRecordsFromBoxes(boxes, lotStatuses)) {
    byLot.set(record.lotNumber, record);
  }

  const receivedBy = apiOrder.receivedBy as
    | { username?: string; receivedAt?: string }
    | undefined;
  const updatedBy = apiOrder.updatedBy as { username?: string; email?: string } | undefined;
  const defaultQcBy =
    receivedBy?.username?.trim() ||
    updatedBy?.username?.trim() ||
    updatedBy?.email?.trim() ||
    "—";
  const defaultQcDateRaw =
    receivedBy?.receivedAt ||
    apiOrder.goodsReceivedDate ||
    apiOrder.lastUpdateDate ||
    apiOrder.updatedAt;
  const defaultQcDate = defaultQcDateRaw
    ? new Date(String(defaultQcDateRaw)).toISOString()
    : "";

  for (const lot of lots) {
    const lotNumber = String(lot.lotNumber ?? "").trim();
    const lotStatus = String(lot.status ?? "").trim();
    const lotQc = lot.qcData;
    if (!lotNumber || PENDING_LOT_STATUSES.has(lotStatus)) continue;

    const poLotMedia = parseQcMediaUrls(lotQc?.mediaUrl);

    if (byLot.has(lotNumber)) {
      const existing = byLot.get(lotNumber)!;
      if (existing.media.length === 0 && poLotMedia.length > 0) {
        existing.media = poLotMedia;
      }
      if (
        (existing.remarks === "—" || !existing.remarks) &&
        lotQc?.remarks?.trim()
      ) {
        existing.remarks = lotQc.remarks.trim();
      }
      if (existing.qcBy === "—" && lotQc?.username?.trim()) {
        existing.qcBy = lotQc.username.trim();
      }
      continue;
    }

    if (lotQc?.status) {
      byLot.set(lotNumber, {
        lotNumber,
        lotStatus,
        qcStatus: lotQc.status,
        qcBy: lotQc.username?.trim() || defaultQcBy,
        qcDate: lotQc.date ? new Date(String(lotQc.date)).toISOString() : defaultQcDate,
        remarks: lotQc.remarks?.trim() || "—",
        boxCount: Number(lot.numberOfBoxes ?? 0) || 0,
        media: poLotMedia,
      });
      continue;
    }

    const qcStatus = lotStatusToQcStatus(lotStatus);
    if (!qcStatus) continue;

    byLot.set(lotNumber, {
      lotNumber,
      lotStatus,
      qcStatus,
      qcBy: defaultQcBy,
      qcDate: defaultQcDate,
      remarks: "—",
      boxCount: Number(lot.numberOfBoxes ?? 0) || 0,
      media: [],
    });
  }

  return sortLotQcRecords([...byLot.values()]);
}

/**
 * Fetches purchase orders that have completed QC (by lot status and/or box qcData).
 */
export async function fetchYarnQcHistoryOrders(
  params: FetchYarnQcHistoryParams = {}
): Promise<YarnQcHistoryOrderSummary[]> {
  const startDate = params.startDate || getDefaultQcHistoryStartDate();
  const endDate = params.endDate || getDefaultQcHistoryEndDate();

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const [poListResponse, boxResponse] = await Promise.all([
    yarnPurchaseOrderService.getPurchaseOrders({
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    }),
    yarnBoxService.getYarnBoxes({ limit: 2000, include_inactive: true }),
  ]);

  const poNumbersWithBoxQc = new Set<string>();
  for (const box of boxResponse.results || []) {
    if (box.qcData?.status && box.poNumber) {
      poNumbersWithBoxQc.add(String(box.poNumber).trim());
    }
  }

  const allOrders: Record<string, unknown>[] = Array.isArray(poListResponse)
    ? poListResponse
    : poListResponse.results || [];

  const uniqueOrders = allOrders.filter(
    (order, index, self) =>
      index ===
      self.findIndex((o) => String(o._id ?? o.id) === String(order._id ?? order.id))
  );

  const summaries: YarnQcHistoryOrderSummary[] = [];
  const includedPoNumbers = new Set<string>();

  for (const apiOrder of uniqueOrders) {
    const orderNumber = extractOrderNumber(apiOrder);
    const { hasHistory, qcLotCount } = evaluatePoQcHistory(
      apiOrder,
      orderNumber,
      poNumbersWithBoxQc
    );
    if (!hasHistory) continue;

    summaries.push(mapOrderToSummary(apiOrder, qcLotCount));
    if (orderNumber !== "—") includedPoNumbers.add(orderNumber);
  }

  // POs with box qcData but outside date range or missing completed lot flags on list payload
  const orphanPoNumbers = [...poNumbersWithBoxQc].filter((po) => !includedPoNumbers.has(po));
  const orphanFetches = orphanPoNumbers.slice(0, 40).map(async (poNumber) => {
    try {
      const apiOrder = await yarnPurchaseOrderService.getPurchaseOrderByNumber(poNumber);
      if (!apiOrder || typeof apiOrder !== "object") return null;

      const created = new Date(
        String(
          apiOrder.createDate ??
            apiOrder.orderDate ??
            apiOrder.order_date ??
            apiOrder.createdAt ??
            ""
        )
      );
      if (!Number.isNaN(created.getTime()) && (created < start || created > end)) {
        return null;
      }

      return mapOrderToSummary(apiOrder as Record<string, unknown>, 1);
    } catch {
      return null;
    }
  });

  const orphanSummaries = (await Promise.all(orphanFetches)).filter(
    (row): row is YarnQcHistoryOrderSummary => row !== null
  );

  const merged = [...summaries, ...orphanSummaries].filter(
    (order, index, self) =>
      index === self.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber)
  );

  return merged.sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );
}

/**
 * Loads lot-level QC records (inspector, remarks, attachments) for one PO.
 */
export async function fetchYarnQcLotHistoryForPo(
  orderId: string,
  poNumber: string
): Promise<YarnQcLotHistoryRecord[]> {
  const [apiOrder, boxResponse] = await Promise.all([
    yarnPurchaseOrderService.getPurchaseOrderById(orderId),
    yarnBoxService.getYarnBoxes({
      po_number: poNumber,
      limit: 500,
      include_inactive: true,
    }),
  ]);

  const boxes = boxResponse.results || [];
  return mergeLotQcRecordsFromPoAndBoxes(
    apiOrder as unknown as Record<string, unknown>,
    boxes
  );
}
