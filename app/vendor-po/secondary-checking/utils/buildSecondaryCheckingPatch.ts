import type {
  QualityFloorQuantity,
  RepairStatus,
} from "@/shared/services/vendorProductionFlowService";
import type { VendorSecondaryCheckingProcessData } from "../components/VendorSecondaryCheckingProcessDrawer";

/**
 * Backend PATCH .../floors/secondaryChecking without `setSplitTotals`: `m1Quantity` etc. are
 * converted to `*Delta` and **added** to stored totals. Send only fields the operator entered
 * for this container/session.
 */
export type SecondaryCheckingFloorPatchBody = {
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

/**
 * User-entered qty for this container entry; blank / invalid → not sent.
 * @param raw - Form field value
 */
function deltaFromForm(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number" && !Number.isFinite(raw)) return null;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function savedVm4(sc: QualityFloorQuantity): number {
  return Math.max(0, Math.round(numOr0(sc.vm4Quantity ?? (sc as { m4Quantity?: number }).m4Quantity)));
}

/**
 * Builds an incremental PATCH body for secondary checking. Entered M1–VM4 values accumulate
 * across containers; only touched fields are sent.
 */
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

  const m1Delta = deltaFromForm(processingData.m1Quantity);
  const m2Delta = deltaFromForm(processingData.m2Quantity);
  const m3Delta = deltaFromForm(processingData.m3Quantity);
  const vm4Delta = deltaFromForm(processingData.vm4Quantity);

  const repairStatus: RepairStatus =
    (processingData.repairStatus as RepairStatus | undefined) ??
    currentSc.repairStatus ??
    "NOT_REQUIRED";
  const remarks = processingData.repairRemarks ?? "";

  const body: SecondaryCheckingFloorPatchBody = {};

  if (m1Delta !== null && m1Delta > 0) body.m1Quantity = m1Delta;
  if (m2Delta !== null && m2Delta > 0) body.m2Quantity = m2Delta;
  if (m3Delta !== null && m3Delta > 0) body.m3Quantity = m3Delta;
  if (vm4Delta !== null && vm4Delta > 0) body.vm4Quantity = vm4Delta;

  const repairChanged =
    repairStatus !== currentSc.repairStatus ||
    remarks !== (currentSc.repairRemarks ?? "");

  if (repairChanged) {
    body.repairStatus = repairStatusToApi(repairStatus);
    body.repairRemarks = remarks;
  }

  const noop = Object.keys(body).length === 0;

  const displayTotals = {
    m1: currentM1 + (body.m1Quantity ?? 0),
    m2: currentM2 + (body.m2Quantity ?? 0),
    m3: currentM3 + (body.m3Quantity ?? 0),
    vm4: currentVm4 + (body.vm4Quantity ?? 0),
  };

  return {
    body,
    displayTotals,
    noop,
  };
}
