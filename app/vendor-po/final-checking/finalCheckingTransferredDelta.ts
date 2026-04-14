import type {
  FinalCheckingFloorQuantity,
  TransferredDataRow,
} from "@/shared/services/vendorProductionFlowService";
import {
  initialFinalCheckingStyleRows,
  parseStyleBrandKey,
  styleBrandKey,
} from "./finalCheckingInboundAggregates";
import type { TransferredStyleRowDraft } from "../utils/transferredStyleRows";

/** Per (styleCodeId, brand) totals using draft row keys — stable across style catalog load. */
function draftQtyByKey(rows: TransferredStyleRowDraft[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const sid = r.styleCodeId.trim();
    if (!sid) continue;
    const k = styleBrandKey(sid, r.brand);
    m.set(k, (m.get(k) ?? 0) + Math.max(0, Number(r.transferred) || 0));
  }
  return m;
}

/** Snapshot when the drawer opens — do not re-send unchanged `transferredData` (server merges adds). */
export function finalCheckingTransferredBaselineDraft(
  fc: FinalCheckingFloorQuantity,
): Map<string, number> {
  return draftQtyByKey(initialFinalCheckingStyleRows(fc));
}

/**
 * Delta lines for `PATCH .../floors/finalChecking`. Only changed buckets vs drawer-open snapshot.
 */
export function buildFinalCheckingTransferredDeltaDraft(
  rows: TransferredStyleRowDraft[],
  baseline: Map<string, number>,
): TransferredDataRow[] {
  const current = draftQtyByKey(rows);
  const keys = new Set<string>([
    ...Array.from(current.keys()),
    ...Array.from(baseline.keys()),
  ]);
  const out: TransferredDataRow[] = [];

  keys.forEach((k) => {
    const d = (current.get(k) ?? 0) - (baseline.get(k) ?? 0);
    if (d === 0) return;
    const { styleCode, brand } = parseStyleBrandKey(k);
    if (!styleCode) return;
    out.push({ transferred: d, styleCode, brand });
  });

  return out;
}
