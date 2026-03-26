import { getProductById } from "@/shared/services/productService";
import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";

/**
 * Resolves Product.vendorCode for style-code lookup (GET …/style-codes-by-vendor-code).
 * Tries populated product, then GET /products/:id, then vendor header.
 */
export async function resolveVendorCodeForStyleLookup(
  flow: VendorProductionFlow
): Promise<string | null> {
  const product = flow.product;
  if (typeof product === "object" && product) {
    const vc = (product as { vendorCode?: string }).vendorCode;
    if (vc?.trim()) return vc.trim();
    const pid =
      (product as { id?: string }).id ||
      (product as { _id?: string })._id;
    if (pid) {
      const p = await getProductById(pid);
      const fromApi = p?.vendorCode;
      if (typeof fromApi === "string" && fromApi.trim()) return fromApi.trim();
    }
  } else if (typeof product === "string" && product.trim()) {
    const p = await getProductById(product.trim());
    const fromApi = p?.vendorCode;
    if (typeof fromApi === "string" && fromApi.trim()) return fromApi.trim();
  }

  const vendor = flow.vendor;
  if (typeof vendor === "object" && vendor?.header) {
    const h = vendor.header as { vendorCode?: string };
    if (h.vendorCode?.trim()) return h.vendorCode.trim();
  }
  return null;
}
