import type { StyleCode } from "@/shared/services/styleCodeService";
import type { StyleCodePair } from "@/shared/services/styleCodePairsService";
import type {
  WarehouseOrderStyleCodeMultiPairRow,
  WarehouseOrderStyleCodeSinglePairRow,
} from "@/shared/services/whmsWarehouseOrderService";
import { resolveArticleColourPattern } from "@/shared/services/productService";

/** Map catalog style code → warehouse order single-pair line (IDs + display fields). */
export function mapStyleCodeToSingleRow(
  sc: StyleCode,
  keepQty: number,
  articleAttrs?: { colour?: string; pattern?: string },
): WarehouseOrderStyleCodeSinglePairRow {
  return {
    styleCodeId: sc.id,
    styleCode: sc.styleCode,
    pack: sc.pack ?? "",
    colour: articleAttrs?.colour ?? "",
    type: sc.brand ?? "",
    pattern: articleAttrs?.pattern ?? "",
    quantity: keepQty,
  };
}

/**
 * Fetch the article linked to a style-code and return resolved colour + pattern.
 * Safe to call in fire-and-forget fashion; returns empty strings on failure.
 */
export async function fetchArticleAttrsForStyleCode(
  styleCodeId: string,
  styleCodeStr: string,
): Promise<{ colour: string; pattern: string }> {
  return resolveArticleColourPattern(styleCodeId, styleCodeStr);
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
