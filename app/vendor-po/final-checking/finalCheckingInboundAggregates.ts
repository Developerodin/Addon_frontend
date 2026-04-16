import type {
  FinalCheckingFloorQuantity,
  ReceivedDataRow,
} from "@/shared/services/vendorProductionFlowService";
import type { TransferredStyleRowDraft } from "../utils/transferredStyleRows";
import { rowsFromTransferredApi } from "../utils/transferredStyleRows";

/** One logical style bucket after summing inbound receipt lines. */
export type InboundStyleAggregate = {
  key: string;
  styleCodeId: string;
  brand: string;
  receivedSum: number;
};

const KEY_SEP = "\u0000";

export function styleBrandKey(styleCodeId: string, brand: string): string {
  return `${styleCodeId.trim()}${KEY_SEP}${brand.trim()}`;
}

/** Inverse of `styleBrandKey` for delta rows when a style bucket was removed from the form. */
export function parseStyleBrandKey(key: string): { styleCode: string; brand: string } {
  const i = key.indexOf(KEY_SEP);
  if (i < 0) return { styleCode: key.trim(), brand: "" };
  return { styleCode: key.slice(0, i).trim(), brand: key.slice(i + KEY_SEP.length).trim() };
}

/**
 * Sums `receivedData` lines per (styleCode, brand) — matches how operators think about caps per style.
 */
export function aggregateInboundByStyle(
  receivedData: ReceivedDataRow[] | undefined,
): InboundStyleAggregate[] {
  if (!receivedData?.length) return [];
  const map = new Map<string, InboundStyleAggregate>();
  for (const row of receivedData) {
    const styleCodeId = String(row.styleCode ?? "").trim();
    const brand = String(row.brand ?? "").trim();
    const key = styleBrandKey(styleCodeId, brand);
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
    });
  }
  return Array.from(map.values());
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
 * Prefer saved `transferredData`; if empty, seed one row per inbound style bucket so the user only fills qty.
 */
export function initialFinalCheckingStyleRows(
  fc: FinalCheckingFloorQuantity,
): TransferredStyleRowDraft[] {
  const td = fc.transferredData;
  if (td?.length) {
    return rowsFromTransferredApi(td);
  }
  const agg = aggregateInboundByStyle(fc.receivedData);
  if (!agg.length) {
    return [{ styleCodeId: "", brand: "", transferred: 0 }];
  }
  return agg.map((a) => ({
    styleCodeId: a.styleCodeId,
    brand: a.brand,
    transferred: 0,
  }));
}

/**
 * Validates that per-style totals in `rows` do not exceed inbound sums (when inbound exists).
 */
export function validateRowsAgainstInbound(
  rows: TransferredStyleRowDraft[],
  aggregates: InboundStyleAggregate[],
): { ok: true } | { ok: false; message: string } {
  if (!aggregates.length) return { ok: true };
  const sums = new Map<string, number>();
  for (const r of rows) {
    const sid = r.styleCodeId.trim();
    const b = r.brand.trim();
    if (!sid) continue;
    const k = styleBrandKey(sid, b);
    const add = Math.max(0, Number(r.transferred) || 0);
    sums.set(k, (sums.get(k) ?? 0) + add);
  }
  for (const a of aggregates) {
    const entered = sums.get(a.key) ?? 0;
    if (entered > a.receivedSum + 1e-6) {
      return {
        ok: false,
        message: `Style total (${entered.toLocaleString()}) exceeds inbound for that style (${a.receivedSum.toLocaleString()}). Reduce line qty or split rows.`,
      };
    }
  }
  return { ok: true };
}
