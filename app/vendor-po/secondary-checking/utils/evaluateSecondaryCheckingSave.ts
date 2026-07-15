import type { QualityFloorQuantity } from "@/shared/services/vendorProductionFlowService";
import type { VendorSecondaryCheckingProcessData } from "../components/VendorSecondaryCheckingProcessDrawer";
import {
  buildSecondaryCheckingFloorPatch,
  type SecondaryCheckingFloorPatchBody,
} from "./buildSecondaryCheckingPatch";

export type SecondaryCheckingSaveRoute = "immediate" | "m1Staging";

export type SecondaryCheckingSaveOk = {
  ok: true;
  body: SecondaryCheckingFloorPatchBody;
  displayTotals: { m1: number; m2: number; m3: number; vm4: number };
  /** immediate = PATCH now; m1Staging = open container modal (PATCH applied inside modal flow). */
  route: SecondaryCheckingSaveRoute;
};

export type SecondaryCheckingSaveResult =
  | SecondaryCheckingSaveOk
  | { ok: false; error: string };

/**
 * Validates a single qty field when the operator entered a value (blank = skip field).
 * @param raw - Form field value
 */
function validateEnteredDelta(raw: unknown): boolean {
  if (raw === undefined || raw === null) return true;
  if (typeof raw === "number" && !Number.isFinite(raw)) return false;
  const n = Math.round(Number(raw));
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
}

/**
 * Validates process drawer input and decides direct PATCH vs M1 staging modal.
 * - **M1 included in PATCH** (user entered a value &gt; 0) → M1 staging modal; PATCH runs there with optional container + auto-transfer.
 * - **No M1 in PATCH** (M2/M3/VM4 and/or repair only) → immediate API.
 *
 * @param plannedQuantity — kept for call-site compatibility; unused (over-count allowed on SC).
 */
export function evaluateSecondaryCheckingSave(
  currentSc: QualityFloorQuantity,
  processingData: VendorSecondaryCheckingProcessData,
  plannedQuantity?: number,
): SecondaryCheckingSaveResult {
  void plannedQuantity;

  if (
    !validateEnteredDelta(processingData.m1Quantity) ||
    !validateEnteredDelta(processingData.m2Quantity) ||
    !validateEnteredDelta(processingData.m3Quantity) ||
    !validateEnteredDelta(processingData.vm4Quantity)
  ) {
    return {
      ok: false,
      error:
        "M1, M2, M3, and VM4 must be whole numbers ≥ 0 when entered (leave blank to skip)",
    };
  }

  const { body, displayTotals, noop } = buildSecondaryCheckingFloorPatch(
    currentSc,
    processingData,
  );

  if (noop) {
    return {
      ok: false,
      error:
        "No changes to save — enter qty for this container or update repair fields",
    };
  }

  const hasM1InPatch = body.m1Quantity !== undefined;

  /** Any explicit M1 save goes through the staging modal so operators always attach a container when M1 is written. */
  const route: SecondaryCheckingSaveRoute = hasM1InPatch
    ? "m1Staging"
    : "immediate";

  return { ok: true, body, displayTotals, route };
}
