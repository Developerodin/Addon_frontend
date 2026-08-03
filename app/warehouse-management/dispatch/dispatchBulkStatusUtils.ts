import {
  effectiveWarehouseOrderFlowStatus,
  warehouseOrderFlowStatusLabel,
  type WarehouseOrder,
  type WarehouseOrderFlowStatus,
} from "@/shared/services/whmsWarehouseOrderService";

/** Dispatch endpoint modes — also valid from `billed` (auto-promotes to ready-to-dispatch). */
export const DISPATCH_MODES = ["dispatched", "partial-dispatched", "ready-for-pickup"] as const;

export type DispatchBulkMode = (typeof DISPATCH_MODES)[number];

/**
 * Mirror of backend `ALLOWED_TRANSITIONS` in orderFlow.service.js for dispatch-relevant stages.
 * Dispatch modes from `billed` / `ready-to-dispatch` are handled via POST /dispatch.
 */
const ALLOWED_TRANSITIONS: Record<string, WarehouseOrderFlowStatus[]> = {
  billed: ["ready-to-dispatch", "cancelled"],
  "ready-to-dispatch": ["dispatched", "partial-dispatched", "ready-for-pickup", "cancelled"],
  dispatched: ["delivered"],
  "partial-dispatched": ["dispatched", "delivered"],
  "ready-for-pickup": ["dispatched", "delivered"],
  delivered: [],
};

export type DispatchBulkTarget =
  | "ready-to-dispatch"
  | DispatchBulkMode
  | "delivered";

/** Status options shown on the Needs Action tab bulk bar. */
export const ACTIVE_TAB_BULK_TARGETS: DispatchBulkTarget[] = [
  "ready-to-dispatch",
  "dispatched",
  "partial-dispatched",
  "ready-for-pickup",
];

/** Status options shown on the Shipped / History tab bulk bar. */
export const SHIPPED_TAB_BULK_TARGETS: DispatchBulkTarget[] = ["dispatched", "delivered"];

export type BulkTransitionCheck = {
  orderId: string;
  orderNumber: string;
  fromStatus: WarehouseOrderFlowStatus;
  eligible: boolean;
  reason?: string;
};

export type BulkTransitionValidation = {
  targetStatus: DispatchBulkTarget;
  checks: BulkTransitionCheck[];
  allEligible: boolean;
  ineligibleCount: number;
  disabledReason: string | null;
};

/**
 * Returns whether an order may transition to the given dispatch bulk target.
 * @param fromStatus - Current effective flow status
 * @param targetStatus - Desired bulk target status
 */
export function canBulkTransitionTo(
  fromStatus: WarehouseOrderFlowStatus,
  targetStatus: DispatchBulkTarget,
): { eligible: boolean; reason?: string } {
  if (fromStatus === targetStatus) {
    return {
      eligible: false,
      reason: `Already ${warehouseOrderFlowStatusLabel(fromStatus)}`,
    };
  }

  if (DISPATCH_MODES.includes(targetStatus as DispatchBulkMode)) {
    if (fromStatus === "billed" || fromStatus === "ready-to-dispatch") {
      return { eligible: true };
    }
    if (targetStatus === "dispatched" && (fromStatus === "partial-dispatched" || fromStatus === "ready-for-pickup")) {
      return { eligible: true };
    }
    return {
      eligible: false,
      reason: `Cannot mark ${warehouseOrderFlowStatusLabel(fromStatus)} as ${warehouseOrderFlowStatusLabel(targetStatus)}`,
    };
  }

  if (targetStatus === "delivered") {
    if (fromStatus === "dispatched" || fromStatus === "partial-dispatched" || fromStatus === "ready-for-pickup") {
      return { eligible: true };
    }
    return {
      eligible: false,
      reason: `Only shipped orders can be marked Delivered (current: ${warehouseOrderFlowStatusLabel(fromStatus)})`,
    };
  }

  if (targetStatus === "ready-to-dispatch") {
    if (fromStatus === "billed") return { eligible: true };
    return {
      eligible: false,
      reason:
        fromStatus === "dispatched" || fromStatus === "partial-dispatched" || fromStatus === "ready-for-pickup"
          ? `Order already past dispatch — cannot revert to Ready to Dispatch`
          : `Only Billed orders can move to Ready to Dispatch (current: ${warehouseOrderFlowStatusLabel(fromStatus)})`,
    };
  }

  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (allowed.includes(targetStatus)) {
    return { eligible: true };
  }

  return {
    eligible: false,
    reason: `Invalid transition: ${warehouseOrderFlowStatusLabel(fromStatus)} → ${warehouseOrderFlowStatusLabel(targetStatus)}`,
  };
}

/**
 * Validates bulk status change for selected orders against a target status.
 * @param orders - Selected warehouse orders (full row objects)
 * @param targetStatus - Desired bulk target status
 */
export function validateBulkDispatchTransition(
  orders: WarehouseOrder[],
  targetStatus: DispatchBulkTarget,
): BulkTransitionValidation {
  const checks: BulkTransitionCheck[] = orders.map((order) => {
    const fromStatus = effectiveWarehouseOrderFlowStatus(order);
    const { eligible, reason } = canBulkTransitionTo(fromStatus, targetStatus);
    return {
      orderId: order.id,
      orderNumber: order.orderNumber || order.id,
      fromStatus,
      eligible,
      reason,
    };
  });

  const ineligible = checks.filter((c) => !c.eligible);
  const ineligibleCount = ineligible.length;
  const allEligible = ineligibleCount === 0 && checks.length > 0;

  let disabledReason: string | null = null;
  if (checks.length === 0) {
    disabledReason = "Select at least one order";
  } else if (ineligibleCount > 0) {
    const samples = ineligible.slice(0, 3).map((c) => `${c.orderNumber}: ${c.reason}`);
    const suffix = ineligibleCount > 3 ? ` (+${ineligibleCount - 3} more)` : "";
    disabledReason = `${ineligibleCount} order${ineligibleCount === 1 ? "" : "s"} cannot move to ${warehouseOrderFlowStatusLabel(targetStatus)} — ${samples.join("; ")}${suffix}`;
  }

  return {
    targetStatus,
    checks,
    allEligible,
    ineligibleCount,
    disabledReason,
  };
}

/**
 * Whether a row on the dispatch page can be selected for bulk status updates.
 * Delivered orders on the shipped tab have no forward transitions.
 * @param order - Warehouse order row
 */
export function isOrderSelectableForBulkStatus(order: WarehouseOrder): boolean {
  const status = effectiveWarehouseOrderFlowStatus(order);
  return status !== "delivered" && status !== "cancelled";
}
