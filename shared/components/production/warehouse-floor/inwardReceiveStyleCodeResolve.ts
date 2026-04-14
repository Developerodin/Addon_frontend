import { getProductByCode, getStyleCodesByVendorCode } from "@/shared/services/productService";
import type { WhmsInwardReceiveRow } from "@/shared/services/whmsService";

const MONGO_OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

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

/**
 * Builds StyleCode document id → master `styleCode` string for the current inward-receive page.
 * Uses GET /products/by-code per distinct article (factory) code, then GET /products/style-codes-by-vendor-code for remaining ids.
 */
export async function resolveInwardReceiveStyleCodeMasterMap(rows: WhmsInwardReceiveRow[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const needId = new Set<string>();
  for (const r of rows) {
    const sc = r.styleCode?.trim();
    if (sc && isMongoObjectIdString(sc)) needId.add(sc);
  }
  if (needId.size === 0) return map;

  const articles = [...new Set(rows.map((r) => r.articleNumber?.trim()).filter(Boolean))] as string[];
  await Promise.all(
    articles.map(async (factoryCode) => {
      const product = await getProductByCode(factoryCode);
      for (const sc of product?.styleCodes ?? []) {
        const id = String(sc.id ?? (sc as { _id?: string })._id ?? "").trim();
        const code = typeof sc.styleCode === "string" ? sc.styleCode.trim() : "";
        if (id && code) map[id] = code;
      }
    }),
  );

  const stillMissing = [...needId].filter((id) => !map[id]);
  if (stillMissing.length === 0) return map;

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
          if (id && code) map[id] = code;
        }
      } catch {
        /* partial map — UI falls back to em dash for unresolved ids */
      }
    }),
  );

  return map;
}

/**
 * Human-readable style code for tables and drawers.
 */
export function inwardReceiveDisplayStyleCode(row: WhmsInwardReceiveRow, idToMaster: Record<string, string>): string {
  const raw = row.styleCode?.trim() ?? "";
  if (!raw) return "—";
  if (!isMongoObjectIdString(raw)) return raw;
  return idToMaster[raw] ?? "—";
}

/**
 * Value to send as `styleCode` on PATCH /whms/inward-receive/:id when accepting (API validates the master code string).
 */
export function inwardReceivePatchStyleCode(row: WhmsInwardReceiveRow, idToMaster: Record<string, string>): string | undefined {
  const raw = row.styleCode?.trim();
  if (!raw) return undefined;
  if (!isMongoObjectIdString(raw)) return raw;
  const master = idToMaster[raw];
  return master?.trim() || undefined;
}

/**
 * Rewrites API messages that quote a style ObjectId so operators see the master code when known.
 */
export function humanizeInwardReceiveStyleError(message: string, row: WhmsInwardReceiveRow, idToMaster: Record<string, string>): string {
  const raw = row.styleCode?.trim();
  if (!raw || !isMongoObjectIdString(raw)) return message;
  const master = idToMaster[raw];
  if (!master) return message;
  return message.split(`"${raw}"`).join(`"${master}"`);
}
