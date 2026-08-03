import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";

/**
 * Resolves catalog factory code (article number) from a populated vendor production flow product.
 * @param flow - Vendor production flow with optional populated product
 */
export function getVendorFlowProductFactoryCode(
  flow: Pick<VendorProductionFlow, "product"> | null | undefined,
): string {
  const product = flow?.product;
  if (!product || typeof product !== "object") return "";
  const fc = product.factoryCode?.trim();
  return fc && fc !== "—" ? fc : "";
}

/**
 * Resolves catalog factory code from a vendor M2/M3/M4 management row.
 * @param row - Row with optional productFactoryCode
 */
export function getVendorRowProductFactoryCode(row: {
  productFactoryCode?: string | null;
}): string {
  const fc = row.productFactoryCode?.trim();
  return fc && fc !== "—" ? fc : "";
}
