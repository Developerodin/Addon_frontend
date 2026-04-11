import type {
  QualityFloorQuantity,
  RepairStatus,
} from "@/shared/services/vendorProductionFlowService";
import type { VendorSecondaryCheckingProcessData } from "../components/VendorSecondaryCheckingProcessDrawer";

/**
 * Backend PATCH .../floors/secondaryChecking: send **absolute** m1/m2/m4 for fields the user filled
 * in the drawer (blank = omit — server keeps existing). Optional: repairStatus / repairRemarks /
 * autoTransfer + existingContainerBarcode. Do not send mode, completed, remaining, m1Remaining, m2Remaining.
 */
export type SecondaryCheckingFloorPatchBody = {
  m1Quantity?: number;
  m2Quantity?: number;
  m4Quantity?: number;
  repairStatus?: string;
  repairRemarks?: string;
  existingContainerBarcode?: string;
  autoTransferToNextFloor?: boolean;
};

/** Map stored enum-style values to API display strings (see vendor / production API docs). */
export function repairStatusToApi(status: RepairStatus): string {
  const map: Record<RepairStatus, string> = {
    NOT_REQUIRED: "Not Required",
    REQUIRED: "Required",
    IN_PROGRESS: "In Progress",
    REPAIRED: "Repaired",
  };
  return map[status] ?? status;
}

function numOr0(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** User-entered total from the drawer; blank / NaN → keep `current`. */
function totalFromForm(raw: unknown, current: number): number {
  if (raw === undefined || raw === null) return current;
  if (typeof raw === "number" && !Number.isFinite(raw)) return current;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 0) return current;
  return n;
}

export function buildSecondaryCheckingFloorPatch(
  currentSc: QualityFloorQuantity,
  processingData: VendorSecondaryCheckingProcessData,
): {
  body: SecondaryCheckingFloorPatchBody;
  displayTotals: { m1: number; m2: number; m4: number };
  noop: boolean;
} {
  const currentM1 = Math.max(0, Math.round(numOr0(currentSc.m1Quantity)));
  const currentM2 = Math.max(0, Math.round(numOr0(currentSc.m2Quantity)));
  const currentM4 = Math.max(0, Math.round(numOr0(currentSc.m4Quantity)));

  const m1 =
    processingData.m1Quantity !== undefined && processingData.m1Quantity !== null
      ? totalFromForm(processingData.m1Quantity, currentM1)
      : currentM1;
  const m2 =
    processingData.m2Quantity !== undefined && processingData.m2Quantity !== null
      ? totalFromForm(processingData.m2Quantity, currentM2)
      : currentM2;
  const m4 =
    processingData.m4Quantity !== undefined && processingData.m4Quantity !== null
      ? totalFromForm(processingData.m4Quantity, currentM4)
      : currentM4;

  const repairStatus: RepairStatus =
    (processingData.repairStatus as RepairStatus | undefined) ??
    currentSc.repairStatus ??
    "NOT_REQUIRED";
  const remarks = processingData.repairRemarks ?? "";

  const body: SecondaryCheckingFloorPatchBody = {};
  if (processingData.m1Quantity !== undefined && processingData.m1Quantity !== null) {
    body.m1Quantity = m1;
  }
  if (processingData.m2Quantity !== undefined && processingData.m2Quantity !== null) {
    body.m2Quantity = m2;
  }
  if (processingData.m4Quantity !== undefined && processingData.m4Quantity !== null) {
    body.m4Quantity = m4;
  }

  const repairChanged =
    repairStatus !== currentSc.repairStatus ||
    remarks !== (currentSc.repairRemarks ?? "");

  if (repairChanged) {
    body.repairStatus = repairStatusToApi(repairStatus);
    body.repairRemarks = remarks;
  }

  const noop = Object.keys(body).length === 0;

  return {
    body,
    displayTotals: { m1, m2, m4 },
    noop,
  };
}
