import type {
  ReceivedDataRow,
  VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";

/**
 * Units still on dispatch that may be moved to the warehouse.
 * Always computed as `received − transferred` (pipeline semantics) to guard against
 * stale/incorrect `remaining` values from the API.
 */
export function getDispatchTransferableRemaining(
  flow: VendorProductionFlow | null | undefined,
): number {
  const disp = flow?.floorQuantities?.dispatch;
  if (!disp) return 0;
  const received = disp.received ?? 0;
  const transferred = disp.transferred ?? 0;
  return Math.max(0, received - transferred);
}

/**
 * Style/brand lines eligible for dispatch→warehouse splits: prefer dispatch `receivedData`, else FC inbound.
 */
export function dispatchStyleInboundReceivedData(
  flow: VendorProductionFlow | null | undefined,
): ReceivedDataRow[] {
  const fromDispatch = flow?.floorQuantities?.dispatch?.receivedData;
  if (fromDispatch?.length) return fromDispatch;
  return flow?.floorQuantities?.finalChecking?.receivedData ?? [];
}
