import type { VendorPOArticle } from "../types";

/** Maps API attribute keys (e.g. Product, Color, Pattern) to PO line fields `type`, `color`, `pattern`. */
function extractTypeColorPattern(attrs: Record<string, string> | undefined | null) {
  if (!attrs) return { type: "", color: "", pattern: "" };
  return {
    type: String(attrs["Product"] ?? attrs["Type"] ?? "").trim(),
    color: String(attrs["Color"] ?? "").trim(),
    pattern: String(attrs["Pattern"] ?? "").trim(),
  };
}

/**
 * Build a picker row from an embedded product or GET /products/:id body.
 * Prefer `vendorCode` for display/code (catalog and vendor populate return it).
 */
export function productRecordToVendorPOArticle(
  raw: Record<string, unknown> | null | undefined,
  idFallback?: string
): VendorPOArticle | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw._id ?? idFallback ?? "").trim();
  if (!id) return null;
  const attrs = raw.attributes as Record<string, string> | undefined;
  const { type, color, pattern } = extractTypeColorPattern(attrs);
  const vendorCode = String(raw.vendorCode ?? "").trim();
  const internalRaw = String(raw.internalCode ?? "").trim();
  /** Display/search code is vendor code only (no factory/internal fallback). */
  const code = vendorCode;
  const name = String(raw.name ?? "").trim();
  if (!name) return null;
  return {
    id,
    code,
    vendorCode: vendorCode || undefined,
    name,
    internalCode: internalRaw || undefined,
    type: type || undefined,
    color: color || undefined,
    pattern: pattern || undefined,
  };
}
