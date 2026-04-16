const STORAGE_KEY = "whms_vendor_bag_flow_v1";

/**
 * Remember which vendor production flow id was last used with a bag barcode (dispatch receive or
 * dispatch→warehouse transfer) so WHMS UIs can pre-fill search when helpful.
 */
export function rememberVendorBagProductionFlow(barcode: string, vendorProductionFlowId: string): void {
  if (typeof window === "undefined") return;
  const b = barcode.trim();
  const id = vendorProductionFlowId.trim();
  if (!b || !id) return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const map: Record<string, string> = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[b] = id;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Looks up vendor production flow id saved for a bag barcode (dispatch receive or dispatch→warehouse transfer).
 */
export function lookupVendorBagProductionFlow(barcode: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const b = barcode.trim();
  if (!b) return undefined;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const map = JSON.parse(raw) as Record<string, string>;
    const id = map[b]?.trim();
    return id || undefined;
  } catch {
    return undefined;
  }
}
