import type {
  FinalCheckingFloorQuantity,
  ReceivedDataRow,
  TransferredDataRow,
  VendorBrandingType,
  VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import type { TransferredStyleRowDraft } from "../utils/transferredStyleRows";

/** One logical style bucket after summing inbound receipt lines (per channel). */
export type InboundStyleAggregate = {
  key: string;
  styleCodeId: string;
  brand: string;
  receivedSum: number;
  /** Heat Transfer vs Embroidery when present on receivedData lines. */
  brandingType?: "Heat Transfer" | "Embroidery";
};

/** Brand-level inbound bucket — all channels combined for one style+brand. */
export type InboundBrandAggregate = {
  key: string;
  styleCodeId: string;
  brand: string;
  receivedSum: number;
};

/** Brand option for M1 row picker (one row per style+brand). */
export type InboundBrandOption = {
  key: string;
  styleCodeId: string;
  brand: string;
  receivedSum: number;
  label: string;
};

const KEY_SEP = "\u0000";

/** Normalize branding type from a line. */
function normalizeBrandingType(bt?: string | null): VendorBrandingType | undefined {
  const s = String(bt ?? "").trim();
  if (s === "Heat Transfer" || s === "Embroidery") return s;
  return undefined;
}

/**
 * Build HT (branding) and Embroidery (re-boarding) outbound maps toward final checking.
 * @param flow - Vendor production flow with floor quantities
 */
export function buildFinalCheckingOutboundMaps(flow: VendorProductionFlow): {
  htOutbound: Map<string, number>;
  rbOutbound: Map<string, number>;
} {
  const branding = flow.floorQuantities?.branding;
  const reBoarding = flow.floorQuantities?.reBoarding;
  const htOutbound = new Map<string, number>();
  const rbOutbound = new Map<string, number>();

  for (const row of branding?.transferredData ?? []) {
    const bt = normalizeBrandingType(row.brandingType) ?? "Heat Transfer";
    if (bt !== "Heat Transfer") continue;
    const k = styleBrandKey(String(row.styleCode ?? "").trim(), String(row.brand ?? "").trim());
    const t = Math.max(0, Number(row.transferred) || 0);
    if (t > 0) htOutbound.set(k, (htOutbound.get(k) ?? 0) + t);
  }

  for (const row of reBoarding?.transferredData ?? []) {
    const k = styleBrandKey(String(row.styleCode ?? "").trim(), String(row.brand ?? "").trim());
    const t = Math.max(0, Number(row.transferred) || 0);
    if (t > 0) rbOutbound.set(k, (rbOutbound.get(k) ?? 0) + t);
  }

  return { htOutbound, rbOutbound };
}

/**
 * Infer brandingType on legacy receivedData lines using upstream outbound ledgers.
 * @param receivedData - Raw receivedData from API
 * @param htOutbound - Branding HT outbound per style+brand key
 * @param rbOutbound - Re-boarding outbound per style+brand key
 */
export function inferFinalCheckingReceivedDataBrandingTypes(
  receivedData: ReceivedDataRow[] | undefined,
  htOutbound: Map<string, number>,
  rbOutbound: Map<string, number>,
): ReceivedDataRow[] {
  if (!receivedData?.length) return [];

  const htAssigned = new Map<string, number>();
  const rbAssigned = new Map<string, number>();

  for (const r of receivedData) {
    const bt = normalizeBrandingType(r.brandingType);
    if (!bt) continue;
    const k = styleBrandKey(String(r.styleCode ?? "").trim(), String(r.brand ?? "").trim());
    const qty = Math.max(0, Number(r.transferred) || 0);
    if (bt === "Heat Transfer") htAssigned.set(k, (htAssigned.get(k) ?? 0) + qty);
    if (bt === "Embroidery") rbAssigned.set(k, (rbAssigned.get(k) ?? 0) + qty);
  }

  return receivedData.map((r) => {
    const bt = normalizeBrandingType(r.brandingType);
    if (bt) return { ...r, brandingType: bt };

    const k = styleBrandKey(String(r.styleCode ?? "").trim(), String(r.brand ?? "").trim());
    const qty = Math.max(0, Number(r.transferred) || 0);
    const htCap = htOutbound.get(k) ?? 0;
    const rbCap = rbOutbound.get(k) ?? 0;
    const htUsed = htAssigned.get(k) ?? 0;
    const rbUsed = rbAssigned.get(k) ?? 0;
    const htRemain = Math.max(0, htCap - htUsed);
    const rbRemain = Math.max(0, rbCap - rbUsed);

    let inferred: VendorBrandingType | undefined;
    if (htRemain > 0 && htCap > 0 && (rbRemain <= 0 || htRemain >= qty || rbRemain < qty)) {
      inferred = "Heat Transfer";
      htAssigned.set(k, htUsed + qty);
    } else if (rbRemain > 0 && rbCap > 0) {
      inferred = "Embroidery";
      rbAssigned.set(k, rbUsed + qty);
    } else if (htCap > htUsed && htCap > 0) {
      inferred = "Heat Transfer";
      htAssigned.set(k, htUsed + qty);
    }

    return inferred ? { ...r, brandingType: inferred } : { ...r };
  });
}

/**
 * Enrich receivedData with inferred brandingType when flow context is available.
 * @param receivedData - Raw receivedData from API
 * @param flow - Optional flow for outbound ledger inference
 */
export function enrichReceivedDataForDisplay(
  receivedData: ReceivedDataRow[] | undefined,
  flow?: VendorProductionFlow | null,
): ReceivedDataRow[] {
  if (!receivedData?.length) return [];
  if (!flow) return receivedData;
  const { htOutbound, rbOutbound } = buildFinalCheckingOutboundMaps(flow);
  return inferFinalCheckingReceivedDataBrandingTypes(receivedData, htOutbound, rbOutbound);
}

export function styleBrandKey(styleCodeId: string, brand: string): string {
  return `${styleCodeId.trim()}${KEY_SEP}${brand.trim()}`;
}

/** Key including branding channel for mixed HT + Embroidery on the same style. */
export function styleBrandChannelKey(
  styleCodeId: string,
  brand: string,
  brandingType?: string,
): string {
  const bt = String(brandingType ?? "").trim();
  return `${styleBrandKey(styleCodeId, brand)}${KEY_SEP}${bt || "unspecified"}`;
}

/** Inverse of `styleBrandKey` for delta rows when a style bucket was removed from the form. */
export function parseStyleBrandKey(key: string): { styleCode: string; brand: string } {
  const i = key.indexOf(KEY_SEP);
  if (i < 0) return { styleCode: key.trim(), brand: "" };
  return { styleCode: key.slice(0, i).trim(), brand: key.slice(i + KEY_SEP.length).trim() };
}

/**
 * Inverse of `styleBrandChannelKey` — extracts style, brand, and channel label.
 * @param key - Channel merge key from `styleBrandChannelKey`
 */
export function parseStyleBrandChannelKey(key: string): {
  styleCode: string;
  brand: string;
  brandingType?: VendorBrandingType;
} {
  const lastSep = key.lastIndexOf(KEY_SEP);
  if (lastSep < 0) {
    return { styleCode: key.trim(), brand: "" };
  }
  const channel = key.slice(lastSep + KEY_SEP.length).trim();
  const { styleCode, brand } = parseStyleBrandKey(key.slice(0, lastSep));
  if (channel === "Heat Transfer" || channel === "Embroidery") {
    return { styleCode, brand, brandingType: channel };
  }
  return { styleCode, brand };
}

/**
 * Sums `receivedData` lines per (styleCode, brand, brandingType) — supports mixed HT + Embroidery.
 * Legacy lines without brandingType are inferred as HT when branding HT outbound exists on `flow`.
 * @param receivedData - Raw receivedData from API
 * @param flow - Optional flow for legacy channel inference
 */
export function aggregateInboundByStyle(
  receivedData: ReceivedDataRow[] | undefined,
  flow?: VendorProductionFlow | null,
): InboundStyleAggregate[] {
  const enriched = enrichReceivedDataForDisplay(receivedData, flow);
  if (!enriched.length) return [];
  const map = new Map<string, InboundStyleAggregate>();
  for (const row of enriched) {
    const styleCodeId = String(row.styleCode ?? "").trim();
    const brand = String(row.brand ?? "").trim();
    const bt = row.brandingType;
    const key = styleBrandChannelKey(styleCodeId, brand, bt);
    const t = Math.max(0, Number(row.transferred) || 0);
    const prev = map.get(key);
    if (prev) {
      prev.receivedSum += t;
      continue;
    }
    map.set(key, {
      key,
      styleCodeId,
      brand,
      receivedSum: t,
      ...(bt ? { brandingType: bt } : {}),
    });
  }
  return Array.from(map.values());
}

/**
 * Sums inbound `receivedData` per (styleCode, brand) — all channels combined.
 * @param receivedData - Raw receivedData from API
 * @param flow - Optional flow for legacy channel inference
 */
export function aggregateInboundByBrand(
  receivedData: ReceivedDataRow[] | undefined,
  flow?: VendorProductionFlow | null,
): InboundBrandAggregate[] {
  const byChannel = aggregateInboundByStyle(receivedData, flow);
  const map = new Map<string, InboundBrandAggregate>();
  for (const a of byChannel) {
    const key = styleBrandKey(a.styleCodeId, a.brand);
    const prev = map.get(key);
    if (prev) {
      prev.receivedSum += a.receivedSum;
      continue;
    }
    map.set(key, {
      key,
      styleCodeId: a.styleCodeId,
      brand: a.brand,
      receivedSum: a.receivedSum,
    });
  }
  return Array.from(map.values());
}

/**
 * Build brand select options from inbound aggregates (one option per style+brand).
 * @param aggregates - Brand-level inbound buckets from `aggregateInboundByBrand`
 */
export function buildInboundBrandOptions(aggregates: InboundBrandAggregate[]): InboundBrandOption[] {
  return aggregates
    .map((a) => ({
      key: a.key,
      styleCodeId: a.styleCodeId,
      brand: a.brand,
      receivedSum: a.receivedSum,
      label: a.brand,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Unique style ids that appeared on inbound (for restricting the style dropdown).
 */
export function allowedStyleCodeIdsFromInbound(
  receivedData: ReceivedDataRow[] | undefined,
): Set<string> {
  const ids = new Set<string>();
  if (!receivedData?.length) return ids;
  for (const row of receivedData) {
    const id = String(row.styleCode ?? "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * Collapse per-channel `transferredData` lines into one row per style+brand.
 * @param data - Raw transferredData from API (may include HT + Emb split)
 * @param opts - When `markRowsFromServer`, rows are read-only in the drawer
 */
export function consolidateTransferredRowsByBrand(
  data: TransferredDataRow[] | undefined,
  opts?: { markRowsFromServer?: boolean },
): TransferredStyleRowDraft[] {
  if (!data?.length) return [{ styleCodeId: "", brand: "", transferred: 0 }];
  const mark = opts?.markRowsFromServer ?? false;
  const map = new Map<string, TransferredStyleRowDraft>();

  for (const r of data) {
    const styleCodeId = String(r.styleCode ?? "").trim();
    const brand = String(r.brand ?? "").trim();
    const qty = Math.max(0, Number(r.transferred) || 0);
    if (!styleCodeId) continue;
    const key = styleBrandKey(styleCodeId, brand);
    const prev = map.get(key);
    if (prev) {
      prev.transferred += qty;
      continue;
    }
    map.set(key, {
      styleCodeId,
      brand,
      transferred: qty,
      ...(mark ? { fromServer: true as const } : {}),
    });
  }

  const rows = Array.from(map.values());
  return rows.length ? rows : [{ styleCodeId: "", brand: "", transferred: 0 }];
}

/**
 * Prefer saved `transferredData` (consolidated by brand); if empty, seed one row per inbound brand.
 * @param fc - Final checking floor snapshot
 * @param flow - Optional full flow for legacy channel inference on inbound seed rows
 */
export function initialFinalCheckingStyleRows(
  fc: FinalCheckingFloorQuantity,
  flow?: VendorProductionFlow | null,
): TransferredStyleRowDraft[] {
  const td = fc.transferredData;
  if (td?.length) {
    return consolidateTransferredRowsByBrand(td, { markRowsFromServer: true });
  }
  const agg = aggregateInboundByBrand(fc.receivedData, flow);
  if (!agg.length) {
    return [{ styleCodeId: "", brand: "", transferred: 0 }];
  }
  return agg.map((a) => ({
    styleCodeId: a.styleCodeId,
    brand: a.brand,
    transferred: 0,
  }));
}

/** Per-brand inbound cap map keyed by `styleBrandKey`. */
export function inboundCapByBrandKey(aggregates: InboundBrandAggregate[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of aggregates) {
    m.set(a.key, a.receivedSum);
  }
  return m;
}

/** Sum M1 qty on draft rows per brand key. */
function draftQtyByBrandKey(rows: TransferredStyleRowDraft[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const sid = r.styleCodeId.trim();
    if (!sid) continue;
    const k = styleBrandKey(sid, r.brand);
    m.set(k, (m.get(k) ?? 0) + Math.max(0, Number(r.transferred) || 0));
  }
  return m;
}

/**
 * Validates that per-brand totals in `rows` do not exceed total inbound received per brand.
 */
export function validateRowsAgainstInbound(
  rows: TransferredStyleRowDraft[],
  aggregates: InboundBrandAggregate[],
): { ok: true } | { ok: false; message: string } {
  if (!aggregates.length) return { ok: true };

  const inboundByBrand = inboundCapByBrandKey(aggregates);
  const brandSums = draftQtyByBrandKey(rows);

  for (const [k, entered] of brandSums) {
    const cap = inboundByBrand.get(k) ?? 0;
    if (entered > cap + 1e-6) {
      const { brand } = parseStyleBrandKey(k);
      return {
        ok: false,
        message: `${brand || "Style"} M1 (${entered.toLocaleString()}) exceeds total inbound received (${cap.toLocaleString()}).`,
      };
    }
  }

  return { ok: true };
}

/**
 * Max M1 qty allowed on one editable row given other rows and per-brand inbound caps.
 * @param rows - Drawer breakdown rows
 * @param rowIndex - Editable row index
 * @param aggregates - Inbound brand buckets
 */
export function getFinalCheckingRowQtyCap(
  rows: TransferredStyleRowDraft[],
  rowIndex: number,
  aggregates: InboundBrandAggregate[],
): number {
  const row = rows[rowIndex];
  if (!row || row.fromServer) return 0;

  const sid = row.styleCodeId.trim();
  if (!sid || !aggregates.length) return Number.MAX_SAFE_INTEGER;

  const brandKey = styleBrandKey(sid, row.brand);
  const inboundByBrand = inboundCapByBrandKey(aggregates);
  const brandCap = inboundByBrand.get(brandKey) ?? 0;

  const otherOnBrand = rows.reduce((sum, r, i) => {
    if (i === rowIndex || r.fromServer) return sum;
    const rsid = r.styleCodeId.trim();
    if (!rsid) return sum;
    if (styleBrandKey(rsid, r.brand) !== brandKey) return sum;
    return sum + Math.max(0, Number(r.transferred) || 0);
  }, 0);

  return Math.max(0, brandCap - otherOnBrand);
}

/**
 * Inline qty error for one editable M1 row — null when within per-brand cap.
 * @param rows - Drawer breakdown rows
 * @param rowIndex - Editable row index
 * @param aggregates - Inbound brand buckets
 */
export function getFinalCheckingRowQtyError(
  rows: TransferredStyleRowDraft[],
  rowIndex: number,
  aggregates: InboundBrandAggregate[],
): string | null {
  const row = rows[rowIndex];
  if (!row || row.fromServer) return null;

  const qty = Math.max(0, Number(row.transferred) || 0);
  if (qty <= 0) return null;

  const cap = getFinalCheckingRowQtyCap(rows, rowIndex, aggregates);
  if (qty <= cap) return null;

  return `Max ${cap.toLocaleString()} for total inbound`;
}
