import type { StyleCode } from "@/shared/services/styleCodeService";
import type { StyleCodePair } from "@/shared/services/styleCodePairsService";
import { styleCodePairsService } from "@/shared/services/styleCodePairsService";
import type {
  WarehouseOrderStyleCodeMultiPairRow,
  WarehouseOrderStyleCodeSinglePairRow,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsWarehouseOrders } from "@/shared/services/whmsWarehouseOrderService";

/** Prefer user-entered value; fall back to catalogue default. */
export function coalesceLineField(userValue: string | undefined, catalogValue: string | undefined): string {
  const user = String(userValue ?? "").trim();
  if (user) return user;
  return String(catalogValue ?? "").trim();
}

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
    eanCode: sc.eanCode ?? "",
    quantity: keepQty,
  };
}

/**
 * Fetch catalogue colour + pattern for a style-code id via WHMS API.
 * @param styleCodeId - StyleCode Mongo id
 */
export async function fetchArticleAttrsForStyleCode(
  styleCodeId: string,
  _styleCodeStr?: string,
): Promise<{ colour: string; pattern: string }> {
  if (!styleCodeId?.trim()) return { colour: "", pattern: "" };
  try {
    const attrs = await whmsWarehouseOrders.getCatalogueAttrs([styleCodeId]);
    return attrs[styleCodeId] ?? { colour: "", pattern: "" };
  } catch {
    return { colour: "", pattern: "" };
  }
}

/**
 * Resolve colour/pattern for a multi-pair row from the first linked child style code.
 * @param pairId - StyleCodePairs Mongo id
 */
export async function fetchArticleAttrsForStyleCodePair(
  pairId: string,
): Promise<{ colour: string; pattern: string }> {
  if (!pairId?.trim()) return { colour: "", pattern: "" };
  try {
    const pair = await styleCodePairsService.get(pairId);
    const firstChild = pair.styleCodes?.[0];
    const childId =
      typeof firstChild === "string"
        ? firstChild
        : String(firstChild?.id ?? (firstChild as { _id?: string })?._id ?? "").trim();
    if (!childId) return { colour: "", pattern: "" };
    return fetchArticleAttrsForStyleCode(childId);
  } catch {
    return { colour: "", pattern: "" };
  }
}

/**
 * Batch-hydrate single-pair rows with catalogue colour/pattern (edit load).
 * @param rows - Current form single-pair rows
 */
export async function hydrateSingleRowsFromCatalog(
  rows: WarehouseOrderStyleCodeSinglePairRow[],
): Promise<WarehouseOrderStyleCodeSinglePairRow[]> {
  const ids = rows.map((r) => r.styleCodeId).filter(Boolean);
  if (!ids.length) return rows;
  try {
    const attrsMap = await whmsWarehouseOrders.getCatalogueAttrs(ids);
    return rows.map((row) => {
      const attrs = attrsMap[row.styleCodeId] ?? { colour: "", pattern: "" };
      return {
        ...row,
        colour: coalesceLineField(row.colour, attrs.colour),
        pattern: coalesceLineField(row.pattern, attrs.pattern),
      };
    });
  } catch {
    return rows;
  }
}

/**
 * Hydrate multi-pair rows with catalogue colour/pattern from first child style code.
 * @param rows - Current form multi-pair rows
 */
export async function hydrateMultiRowsFromCatalog(
  rows: WarehouseOrderStyleCodeMultiPairRow[],
): Promise<WarehouseOrderStyleCodeMultiPairRow[]> {
  const hydrated = await Promise.all(
    rows.map(async (row) => {
      if (!row.styleCodeMultiPairId) return row;
      if (row.colour?.trim() && row.pattern?.trim()) return row;
      const attrs = await fetchArticleAttrsForStyleCodePair(row.styleCodeMultiPairId);
      return {
        ...row,
        colour: coalesceLineField(row.colour, attrs.colour),
        pattern: coalesceLineField(row.pattern, attrs.pattern),
      };
    }),
  );
  return hydrated;
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
    eanCode: p.eanCode ?? "",
    quantity: keepQty,
  };
}
