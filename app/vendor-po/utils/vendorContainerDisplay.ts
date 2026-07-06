import type {
  ContainerActiveItem,
  ContainerMaster,
} from "@/shared/services/containersMasterService";
import { getVendorActiveItems } from "./vendorContainerItems";

/** Display row for a vendor-pipeline line on a scanned container. */
export type VendorContainerLineDisplay = {
  qty: number;
  vpoNumber: string;
  vendorName: string;
  vendorCode: string;
  productName: string;
  referenceCode: string;
};

type PopulatedVendorFlow = {
  referenceCode?: string;
  vendor?: {
    header?: { vendorName?: string; vendorCode?: string };
    vendorName?: string;
    vendorCode?: string;
  };
  vendorPurchaseOrder?: { vpoNumber?: string; vendorName?: string } | string;
  product?: { name?: string; vendorCode?: string; factoryCode?: string };
};

/**
 * Resolve vendor display name from a populated production flow on a container item.
 * @param flow - Populated vendor production flow (partial)
 */
function resolveVendorName(flow: PopulatedVendorFlow | null): string {
  if (!flow) return "—";
  const vendor = flow.vendor;
  if (vendor && typeof vendor === "object") {
    const fromHeader = vendor.header?.vendorName?.trim();
    if (fromHeader) return fromHeader;
    const flat = vendor.vendorName?.trim();
    if (flat) return flat;
  }
  const vpo = flow.vendorPurchaseOrder;
  if (vpo && typeof vpo === "object") {
    const fromVpo = vpo.vendorName?.trim();
    if (fromVpo) return fromVpo;
  }
  return "—";
}

/**
 * Resolve article vendor code from populated product / vendor on a container flow line.
 * @param flow - Populated vendor production flow (partial)
 */
function resolveVendorCode(flow: PopulatedVendorFlow | null): string {
  if (!flow) return "—";
  const product = flow.product;
  if (product && typeof product === "object") {
    const fromProduct = product.vendorCode?.trim() || product.factoryCode?.trim();
    if (fromProduct) return fromProduct;
  }
  const vendor = flow.vendor;
  if (vendor && typeof vendor === "object") {
    const fromHeader = vendor.header?.vendorCode?.trim();
    if (fromHeader) return fromHeader;
    const flat = vendor.vendorCode?.trim();
    if (flat) return flat;
  }
  return "—";
}

/**
 * Resolve VPO number from populated flow on a container item.
 * @param flow - Populated vendor production flow (partial)
 */
function resolveVpoNumber(flow: PopulatedVendorFlow | null): string {
  if (!flow) return "—";
  const vpo = flow.vendorPurchaseOrder;
  if (vpo && typeof vpo === "object") {
    return vpo.vpoNumber?.trim() || "—";
  }
  return "—";
}

/**
 * Resolve product label from populated flow on a container item.
 * @param flow - Populated vendor production flow (partial)
 */
function resolveProductName(flow: PopulatedVendorFlow | null): string {
  if (!flow) return "—";
  const product = flow.product;
  if (product && typeof product === "object") {
    return product.name?.trim() || "—";
  }
  return "—";
}

/**
 * Build display rows for vendor-pipeline activeItems on a container.
 * @param container - Container from barcode / with-articles API
 */
export function getVendorContainerLineDisplays(
  container: ContainerMaster | null | undefined,
): VendorContainerLineDisplay[] {
  return getVendorActiveItems(container).map((item) =>
    mapActiveItemToDisplay(item),
  );
}

/**
 * Map one vendor activeItems row to a display row.
 * @param item - Container active item
 */
export function mapActiveItemToDisplay(
  item: ContainerActiveItem,
): VendorContainerLineDisplay {
  const flow =
    item.vendorProductionFlow && typeof item.vendorProductionFlow === "object"
      ? (item.vendorProductionFlow as PopulatedVendorFlow)
      : null;

  return {
    qty: item.quantity ?? 0,
    vpoNumber: resolveVpoNumber(flow),
    vendorName: resolveVendorName(flow),
    vendorCode: resolveVendorCode(flow),
    productName: resolveProductName(flow),
    referenceCode: flow?.referenceCode?.trim() || "—",
  };
}
