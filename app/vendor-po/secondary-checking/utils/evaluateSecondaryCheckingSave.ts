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
  displayTotals: { m1: number; m2: number; m3: number; m4: number };
  /** immediate = PATCH now; m1Staging = open container modal (PATCH applied inside modal flow). */
  route: SecondaryCheckingSaveRoute;
};

export type SecondaryCheckingSaveResult =
  | SecondaryCheckingSaveOk
  | { ok: false; error: string };

function numOr0(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Blank field = keep current saved total (same as patch builder). */
function resolveQty(raw: unknown, cur: number): number | null {
  if (raw === undefined || raw === null) return cur;
  if (typeof raw === "number" && !Number.isFinite(raw)) return cur;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

/**
 * Validates process drawer input and decides direct PATCH vs M1 staging modal.
 * - **M1 included in PATCH** (user entered a value) → M1 staging modal; PATCH runs there with optional container + auto-transfer.
 * - **No M1 in PATCH** (M2/M3/M4 and/or repair only) → immediate API.
 *
 * @param plannedQuantity — used when `secondaryChecking.received` is 0/missing so M2/M4-only saves are not blocked.
 */
export function evaluateSecondaryCheckingSave(
  currentSc: QualityFloorQuantity,
  processingData: VendorSecondaryCheckingProcessData,
  plannedQuantity?: number,
): SecondaryCheckingSaveResult {
  const received = numOr0(currentSc.received);
  const planned = numOr0(plannedQuantity);
  /** If API leaves received at 0, fall back to planned batch size for the M1+M2+M3+M4 cap. */
  const quantityCap = received > 0 ? received : planned > 0 ? planned : null;
  const currentM1 = numOr0(currentSc.m1Quantity);
  const currentM2 = numOr0(currentSc.m2Quantity);
  const currentM3 = numOr0(currentSc.m3Quantity);
  const currentM4 = numOr0(currentSc.m4Quantity);

  const m1Quantity = resolveQty(processingData.m1Quantity, currentM1);
  const m2Quantity = resolveQty(processingData.m2Quantity, currentM2);
  const m3Quantity = resolveQty(processingData.m3Quantity, currentM3);
  const m4Quantity = resolveQty(processingData.m4Quantity, currentM4);
  if (
    m1Quantity === null ||
    m2Quantity === null ||
    m3Quantity === null ||
    m4Quantity === null
  ) {
    return {
      ok: false,
      error:
        "M1, M2, M3, and M4 must be whole numbers ≥ 0 when entered (leave blank to keep saved value)",
    };
  }

  const splitSum = m1Quantity + m2Quantity + m3Quantity + m4Quantity;
  if (
    quantityCap !== null &&
    Number.isFinite(quantityCap) &&
    splitSum > quantityCap
  ) {
    return {
      ok: false,
      error: `M1 + M2 + M3 + M4 cannot exceed batch quantity (${quantityCap.toLocaleString()})`,
    };
  }

  const { body, displayTotals, noop } = buildSecondaryCheckingFloorPatch(
    currentSc,
    processingData,
  );

  if (noop) {
    return {
      ok: false,
      error: "No changes to save — enter a new total or update repair fields",
    };
  }

  const hasM1InPatch = body.m1Quantity !== undefined;

  if (hasM1InPatch && quantityCap !== null && m1Quantity > quantityCap) {
    return {
      ok: false,
      error: `M1 cannot exceed batch quantity (${quantityCap.toLocaleString()})`,
    };
  }

  /** Any explicit M1 save goes through the staging modal so operators always attach a container when M1 is written. */
  const route: SecondaryCheckingSaveRoute = hasM1InPatch
    ? "m1Staging"
    : "immediate";

  return { ok: true, body, displayTotals, route };
}
