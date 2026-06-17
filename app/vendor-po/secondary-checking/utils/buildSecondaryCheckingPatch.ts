import type {
  QualityFloorQuantity,
  RepairStatus,
} from "@/shared/services/vendorProductionFlowService";
import type { VendorSecondaryCheckingProcessData } from "../components/VendorSecondaryCheckingProcessDrawer";

/**
 * Backend PATCH .../floors/secondaryChecking with `setSplitTotals: true`: send **absolute**
 * m1/m2/m3/vm4 totals. Blank fields in the drawer = keep current server value.
 */
export type SecondaryCheckingFloorPatchBody = {
  setSplitTotals?: boolean;
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  vm4Quantity?: number;
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

function savedVm4(sc: QualityFloorQuantity): number {
  return Math.max(0, Math.round(numOr0(sc.vm4Quantity ?? (sc as { m4Quantity?: number }).m4Quantity)));
}

export function buildSecondaryCheckingFloorPatch(
  currentSc: QualityFloorQuantity,
  processingData: VendorSecondaryCheckingProcessData,
): {
  body: SecondaryCheckingFloorPatchBody;
  displayTotals: { m1: number; m2: number; m3: number; vm4: number };
  noop: boolean;
} {
  const currentM1 = Math.max(0, Math.round(numOr0(currentSc.m1Quantity)));
  const currentM2 = Math.max(0, Math.round(numOr0(currentSc.m2Quantity)));
  const currentM3 = Math.max(0, Math.round(numOr0(currentSc.m3Quantity)));
  const currentVm4 = savedVm4(currentSc);

  const m1 =
    processingData.m1Quantity !== undefined && processingData.m1Quantity !== null
      ? totalFromForm(processingData.m1Quantity, currentM1)
      : currentM1;
  const m2 =
    processingData.m2Quantity !== undefined && processingData.m2Quantity !== null
      ? totalFromForm(processingData.m2Quantity, currentM2)
      : currentM2;
  const m3 =
    processingData.m3Quantity !== undefined && processingData.m3Quantity !== null
      ? totalFromForm(processingData.m3Quantity, currentM3)
      : currentM3;
  const vm4 =
    processingData.vm4Quantity !== undefined && processingData.vm4Quantity !== null
      ? totalFromForm(processingData.vm4Quantity, currentVm4)
      : currentVm4;

  const repairStatus: RepairStatus =
    (processingData.repairStatus as RepairStatus | undefined) ??
    currentSc.repairStatus ??
    "NOT_REQUIRED";
  const remarks = processingData.repairRemarks ?? "";

  const body: SecondaryCheckingFloorPatchBody = {};
  const qtyTouched =
    (processingData.m1Quantity !== undefined && processingData.m1Quantity !== null) ||
    (processingData.m2Quantity !== undefined && processingData.m2Quantity !== null) ||
    (processingData.m3Quantity !== undefined && processingData.m3Quantity !== null) ||
    (processingData.vm4Quantity !== undefined && processingData.vm4Quantity !== null);

  if (qtyTouched) {
    body.setSplitTotals = true;
    body.m1Quantity = m1;
    body.m2Quantity = m2;
    body.m3Quantity = m3;
    body.vm4Quantity = vm4;
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
    displayTotals: { m1, m2, m3, vm4 },
    noop,
  };
}
