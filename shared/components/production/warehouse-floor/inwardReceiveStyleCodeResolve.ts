import { getProductByCode, getStyleCodesByVendorCode } from "@/shared/services/productService";
import type { WhmsInwardReceiveRow } from "@/shared/services/whmsService";

const MONGO_OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/** StyleCode ObjectId → master code, plus brand fallback per factory article when DB stores brand-only rows. */
export type InwardReceiveStyleCodeMaps = {
  idToMaster: Record<string, string>;
  /** factoryCode → normalized brand key → master styleCode */
  brandFallbackByArticle: Record<string, Record<string, string>>;
};

/**
 * Normalizes brand for lookup (matches backend brandKey).
 */
function brandKey(brand: string | undefined | null): string {
  return String(brand ?? "").trim().toLowerCase();
}

/**
 * Returns true when `s` looks like a MongoDB ObjectId (24 hex chars).
 * Vendor / WHMS payloads often store StyleCode references this way while the master uses a human code.
 */
export function isMongoObjectIdString(s: string | undefined | null): boolean {
  return Boolean(s && MONGO_OBJECT_ID_RE.test(s.trim()));
}

/**
 * Reads optional vendor code from loosely-typed `orderData` on inward-receive rows.
 */
function pickVendorCodeFromOrderData(orderData: Record<string, unknown> | undefined): string | null {
  if (!orderData || typeof orderData !== "object") return null;
  const direct = orderData.vendorCode ?? orderData.productVendorCode;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const product = orderData.product;
  if (product && typeof product === "object" && "vendorCode" in product) {
    const vc = (product as { vendorCode?: string }).vendorCode;
    if (typeof vc === "string" && vc.trim()) return vc.trim();
  }
  return null;
}

const EMPTY_MAPS: InwardReceiveStyleCodeMaps = { idToMaster: {}, brandFallbackByArticle: {} };

/**
 * Builds StyleCode document id → master `styleCode` string for the current inward-receive page.
 * Uses GET /products/by-code per distinct article (factory) code, then GET /products/style-codes-by-vendor-code for remaining ids.
 */
export async function resolveInwardReceiveStyleCodeMaps(rows: WhmsInwardReceiveRow[]): Promise<InwardReceiveStyleCodeMaps> {
  const idToMaster: Record<string, string> = {};
  const brandFallbackByArticle: Record<string, Record<string, string>> = {};
  const needId = new Set<string>();
  const articlesForBrandFallback = new Set<string>();

  for (const r of rows) {
    const sc = r.styleCode?.trim();
    if (sc && isMongoObjectIdString(sc)) needId.add(sc);
    if (!sc && r.brand?.trim() && r.articleNumber?.trim()) {
      articlesForBrandFallback.add(r.articleNumber.trim());
    }
  }

  const articles = [
    ...new Set([
      ...rows.map((r) => r.articleNumber?.trim()).filter(Boolean) as string[],
      ...articlesForBrandFallback,
    ]),
  ];

  if (articles.length === 0 && needId.size === 0) return EMPTY_MAPS;

  await Promise.all(
    articles.map(async (factoryCode) => {
      const product = await getProductByCode(factoryCode);
      const byBrand: Record<string, string> = {};
      for (const sc of product?.styleCodes ?? []) {
        const id = String(sc.id ?? (sc as { _id?: string })._id ?? "").trim();
        const code = typeof sc.styleCode === "string" ? sc.styleCode.trim() : "";
        if (id && code) idToMaster[id] = code;
        const brand = typeof sc.brand === "string" ? sc.brand.trim() : "";
        const key = brandKey(brand);
        if (key && code && !byBrand[key]) byBrand[key] = code;
      }
      if (Object.keys(byBrand).length > 0) {
        brandFallbackByArticle[factoryCode] = byBrand;
      }
    }),
  );

  const stillMissing = [...needId].filter((id) => !idToMaster[id]);
  if (stillMissing.length > 0) {
    const vendorCodes = new Set<string>();
    for (const r of rows) {
      const sc = r.styleCode?.trim();
      if (!sc || !stillMissing.includes(sc)) continue;
      const vc = pickVendorCodeFromOrderData(r.orderData as Record<string, unknown> | undefined);
      if (vc) vendorCodes.add(vc);
    }

    await Promise.all(
      [...vendorCodes].map(async (vendorCode) => {
        try {
          const res = await getStyleCodesByVendorCode(vendorCode);
          for (const row of res.styleCodes ?? []) {
            const id = String(row.id ?? row._id ?? "").trim();
            const code = row.styleCode?.trim();
            if (id && code) idToMaster[id] = code;
          }
        } catch {
          /* partial map — UI falls back to em dash for unresolved ids */
        }
      }),
    );
  }

  return { idToMaster, brandFallbackByArticle };
}

/** @deprecated Use resolveInwardReceiveStyleCodeMaps — kept for callers that only need ObjectId resolution. */
export async function resolveInwardReceiveStyleCodeMasterMap(rows: WhmsInwardReceiveRow[]): Promise<Record<string, string>> {
  const maps = await resolveInwardReceiveStyleCodeMaps(rows);
  return maps.idToMaster;
}

/**
 * Resolves brand-only inward rows from product catalog (production floor drops styleCode on transfer).
 */
function inwardReceiveBrandFallbackStyleCode(row: WhmsInwardReceiveRow, maps: InwardReceiveStyleCodeMaps): string {
  const article = row.articleNumber?.trim();
  const brand = row.brand?.trim();
  if (!article || !brand) return "";
  const byBrand = maps.brandFallbackByArticle[article];
  return byBrand?.[brandKey(brand)] ?? "";
}

/**
 * Human-readable style code for tables and drawers.
 */
export function inwardReceiveDisplayStyleCode(
  row: WhmsInwardReceiveRow,
  maps: InwardReceiveStyleCodeMaps | Record<string, string>,
): string {
  const idToMaster = "idToMaster" in maps ? maps.idToMaster : maps;
  const brandMaps = "brandFallbackByArticle" in maps ? maps : EMPTY_MAPS;

  const raw = row.styleCode?.trim() ?? "";
  if (!raw) {
    const fallback = inwardReceiveBrandFallbackStyleCode(row, brandMaps);
    return fallback || "—";
  }
  if (!isMongoObjectIdString(raw)) return raw;
  const resolved = idToMaster[raw] ?? inwardReceiveBrandFallbackStyleCode(row, brandMaps);
  return resolved || "—";
}

/**
 * Value to send as `styleCode` on PATCH /whms/inward-receive/:id when accepting (API validates the master code string).
 */
export function inwardReceivePatchStyleCode(
  row: WhmsInwardReceiveRow,
  maps: InwardReceiveStyleCodeMaps | Record<string, string>,
): string | undefined {
  const idToMaster = "idToMaster" in maps ? maps.idToMaster : maps;
  const brandMaps = "brandFallbackByArticle" in maps ? maps : EMPTY_MAPS;

  const raw = row.styleCode?.trim();
  if (!raw) {
    const fallback = inwardReceiveBrandFallbackStyleCode(row, brandMaps);
    return fallback || undefined;
  }
  if (!isMongoObjectIdString(raw)) return raw;
  const master = idToMaster[raw];
  return master?.trim() || inwardReceiveBrandFallbackStyleCode(row, brandMaps) || undefined;
}

/**
 * Rewrites API messages that quote a style ObjectId so operators see the master code when known.
 */
export function humanizeInwardReceiveStyleError(
  message: string,
  row: WhmsInwardReceiveRow,
  maps: InwardReceiveStyleCodeMaps | Record<string, string>,
): string {
  const idToMaster = "idToMaster" in maps ? maps.idToMaster : maps;
  const raw = row.styleCode?.trim();
  if (!raw || !isMongoObjectIdString(raw)) return message;
  const master = idToMaster[raw];
  if (!master) return message;
  return message.split(`"${raw}"`).join(`"${master}"`);
}
