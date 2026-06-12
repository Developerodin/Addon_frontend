import { normalizeProductionQty } from '@/shared/utils/halfStepQuantity';

/** QC floor keys in article.floorQuantities */
export type QcFloorKey = 'checking' | 'secondaryChecking' | 'finalChecking';

/** Floor quantity snapshot for QC update drawers */
export interface QcCumulativeQty {
  received: number;
  transferred: number;
  m1Transferred: number;
  m1Quantity: number;
  m2: number;
  m3: number;
  m4: number;
  remaining: number;
}

/** Per-save deltas entered in the update drawer */
export interface QcSaveDeltas {
  m1?: number;
  m2?: number;
  m3?: number;
  m4?: number;
}

type FloorQuantitiesArticle = {
  floorQuantities?: Partial<
    Record<
      QcFloorKey,
      {
        received?: number;
        transferred?: number;
        remaining?: number;
        m1Quantity?: number;
        m1Transferred?: number;
        m2Quantity?: number;
        m3Quantity?: number;
        m4Quantity?: number;
      }
    >
  >;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
};

/** QC floor data bucket from article.floorQuantities */
export type QcFloorData = {
  received?: number;
  transferred?: number;
  remaining?: number;
  m1Quantity?: number;
  m1Transferred?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
};

/**
 * M1 transferred qty for QC floor table display.
 * @param floorData - QC floor bucket
 */
export function getQcTrfQty(floorData?: QcFloorData | null): number {
  if (!floorData) return 0;
  const m1Transferred = floorData.m1Transferred ?? floorData.transferred ?? 0;
  return normalizeProductionQty(m1Transferred);
}

/**
 * Remaining qty for QC floor table display.
 * @param floorData - QC floor bucket
 * @param articleFallback - Optional article-level m2/m3/m4 fallbacks
 */
export function getQcRemaining(
  floorData?: QcFloorData | null,
  articleFallback?: { m2Quantity?: number; m3Quantity?: number; m4Quantity?: number }
): number {
  if (!floorData) return 0;
  if (typeof floorData.remaining === "number") {
    return normalizeProductionQty(floorData.remaining);
  }
  const received = normalizeProductionQty(floorData.received ?? 0);
  const m1Transferred = normalizeProductionQty(floorData.m1Transferred ?? floorData.transferred ?? 0);
  const m2 = normalizeProductionQty(floorData.m2Quantity ?? articleFallback?.m2Quantity ?? 0);
  const m3 = normalizeProductionQty(floorData.m3Quantity ?? articleFallback?.m3Quantity ?? 0);
  const m4 = normalizeProductionQty(floorData.m4Quantity ?? articleFallback?.m4Quantity ?? 0);
  return getRemainingFallback(received, m1Transferred, m2, m3, m4);
}

/**
 * Fallback remaining when API omits `remaining`: received − m1Transferred − m2 − m3 − m4.
 */
export function getRemainingFallback(
  received: number,
  m1Transferred: number,
  m2: number,
  m3: number,
  m4: number
): number {
  return Math.max(0, normalizeProductionQty(received - m1Transferred - m2 - m3 - m4));
}

/**
 * Read cumulative QC floor quantities from an article.
 * @param article - Article with floorQuantities
 * @param floorKey - checking | secondaryChecking | finalChecking
 */
export function getCumulativeQty(article: FloorQuantitiesArticle, floorKey: QcFloorKey): QcCumulativeQty {
  const data = article.floorQuantities?.[floorKey];
  const received = normalizeProductionQty(data?.received ?? 0);
  const transferred = normalizeProductionQty(data?.transferred ?? 0);
  const m1Transferred = normalizeProductionQty(data?.m1Transferred ?? transferred);
  const m1Quantity = normalizeProductionQty(data?.m1Quantity ?? 0);
  const m2 = normalizeProductionQty(data?.m2Quantity ?? article.m2Quantity ?? 0);
  const m3 = normalizeProductionQty(data?.m3Quantity ?? article.m3Quantity ?? 0);
  const m4 = normalizeProductionQty(data?.m4Quantity ?? article.m4Quantity ?? 0);
  const remaining =
    typeof data?.remaining === 'number'
      ? normalizeProductionQty(data.remaining)
      : getRemainingFallback(received, m1Transferred, m2, m3, m4);

  return { received, transferred, m1Transferred, m1Quantity, m2, m3, m4, remaining };
}

/**
 * Max qty user can still assign on this save (remaining minus pending deltas).
 * @param cumulative - Current on-floor totals from API
 * @param deltas - This-save inputs (optional)
 */
export function getAvailableRemaining(cumulative: QcCumulativeQty, deltas: QcSaveDeltas = {}): number {
  const pending =
    normalizeProductionQty(deltas.m1 ?? 0) +
    normalizeProductionQty(deltas.m2 ?? 0) +
    normalizeProductionQty(deltas.m3 ?? 0) +
    normalizeProductionQty(deltas.m4 ?? 0);
  return Math.max(0, normalizeProductionQty(cumulative.remaining - pending));
}

/**
 * Remaining after this save completes (on-floor remaining minus all deltas).
 */
export function getRemainingAfterSave(cumulative: QcCumulativeQty, deltas: QcSaveDeltas): number {
  return getAvailableRemaining(cumulative, deltas);
}

/**
 * Max M1 transfer allowed for this save (remaining minus M2/M3/M4 deltas only).
 */
export function getMaxM1ForSave(cumulative: QcCumulativeQty, deltas: QcSaveDeltas = {}): number {
  const nonM1Pending =
    normalizeProductionQty(deltas.m2 ?? 0) +
    normalizeProductionQty(deltas.m3 ?? 0) +
    normalizeProductionQty(deltas.m4 ?? 0);
  return Math.max(0, normalizeProductionQty(cumulative.remaining - nonM1Pending));
}
