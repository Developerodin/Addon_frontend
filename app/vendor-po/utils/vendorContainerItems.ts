import type {
  ContainerActiveItem,
  ContainerMaster,
} from "@/shared/services/containersMasterService";

/**
 * Whether an activeItems row belongs to the vendor PO pipeline (not factory article).
 * @param item - Container active item from API
 */
export function isVendorContainerActiveItem(
  item: ContainerActiveItem | null | undefined,
): boolean {
  if (!item) return false;
  if (item.vendorProductionFlowId?.trim()) return true;
  const vpf = item.vendorProductionFlow;
  if (!vpf) return false;
  if (typeof vpf === "string") return vpf.trim().length > 0;
  const id = (vpf as { _id?: string; id?: string })._id ?? (vpf as { id?: string }).id;
  return Boolean(id && String(id).trim());
}

/**
 * Returns only vendor-pipeline activeItems rows from a container.
 * @param container - Container master document
 */
export function getVendorActiveItems(
  container: ContainerMaster | null | undefined,
): ContainerActiveItem[] {
  if (!container?.activeItems?.length) return [];
  return container.activeItems.filter(isVendorContainerActiveItem);
}

/**
 * Whether a container has at least one vendor-pipeline active item.
 * @param container - Container master document
 */
export function isVendorPipelineContainer(
  container: ContainerMaster | null | undefined,
): boolean {
  return getVendorActiveItems(container).length > 0;
}
