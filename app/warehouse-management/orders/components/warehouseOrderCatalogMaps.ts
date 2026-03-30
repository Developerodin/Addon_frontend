import type { StyleCode } from "@/shared/services/styleCodeService";
import type { StyleCodePair } from "@/shared/services/styleCodePairsService";
import type {
  WarehouseOrderStyleCodeMultiPairRow,
  WarehouseOrderStyleCodeSinglePairRow,
} from "@/shared/services/whmsWarehouseOrderService";

/** Map catalog style code → warehouse order single-pair line (IDs + display fields). */
export function mapStyleCodeToSingleRow(
  sc: StyleCode,
  keepQty: number,
): WarehouseOrderStyleCodeSinglePairRow {
  return {
    styleCodeId: sc.id,
    styleCode: sc.styleCode,
    pack: sc.pack ?? "",
    colour: "",
    type: sc.brand ?? "",
    pattern: "",
    quantity: keepQty,
  };
}

export function getStyleCodePairId(p: StyleCodePair): string {
  return p.id ?? p._id ?? "";
}

/** Map catalog style-code pair → warehouse order multi-pair line. */
export function mapStyleCodePairToMultiRow(
  p: StyleCodePair,
  keepQty: number,
): WarehouseOrderStyleCodeMultiPairRow {
  const id = getStyleCodePairId(p);
  return {
    styleCodeMultiPairId: id,
    styleCode: p.pairStyleCode,
    pack: p.pack != null ? String(p.pack) : "",
    colour: "",
    type: "",
    pattern: "",
    quantity: keepQty,
  };
}
