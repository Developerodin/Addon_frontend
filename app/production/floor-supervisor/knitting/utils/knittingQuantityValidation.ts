/** Allowed overproduction above planned quantity (15% buffer). */
export const KNITTING_OVERPRODUCTION_BUFFER_RATIO = 0.15;

/**
 * Maximum knitting quantity allowed for an article (planned + 15% buffer).
 */
export function getMaxAllowedKnittingQuantity(plannedQuantity: number): number {
  if (!Number.isFinite(plannedQuantity) || plannedQuantity <= 0) return 0;
  return plannedQuantity * (1 + KNITTING_OVERPRODUCTION_BUFFER_RATIO);
}

export type KnittingQuantityBufferCheck = {
  plannedQuantity: number;
  maxAllowed: number;
  knitDoneIncrement: number;
  currentTransferred: number;
  currentCompleted: number;
  projectedTransfer: number;
  projectedCompleted: number;
  exceedsTransferBuffer: boolean;
  exceedsCompletedBuffer: boolean;
  exceedsBuffer: boolean;
};

/**
 * Validates whether a knit-done increment would exceed the planned + 15% buffer
 * for cumulative transfer or completed quantities.
 */
export function checkKnittingQuantityBuffer(
  plannedQuantity: number,
  currentTransferred: number,
  currentCompleted: number,
  knitDoneIncrement: number
): KnittingQuantityBufferCheck {
  const maxAllowed = getMaxAllowedKnittingQuantity(plannedQuantity);
  const increment = Math.max(0, knitDoneIncrement || 0);
  const projectedTransfer = currentTransferred + increment;
  const projectedCompleted = currentCompleted + increment;
  const exceedsTransferBuffer = increment > 0 && projectedTransfer > maxAllowed;
  const exceedsCompletedBuffer = increment > 0 && projectedCompleted > maxAllowed;

  return {
    plannedQuantity,
    maxAllowed,
    knitDoneIncrement: increment,
    currentTransferred,
    currentCompleted,
    projectedTransfer,
    projectedCompleted,
    exceedsTransferBuffer,
    exceedsCompletedBuffer,
    exceedsBuffer: exceedsTransferBuffer || exceedsCompletedBuffer,
  };
}
