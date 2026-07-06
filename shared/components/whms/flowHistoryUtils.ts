import type { WarehouseOrderFlowHistoryEntry } from '@/shared/services/whmsWarehouseOrderService';

const DISPATCH_STAGES = new Set([
  'dispatched',
  'partial-dispatched',
  'ready-for-pickup',
  'delivered',
]);

/**
 * Find the flow-history actor who moved the order into a dispatch-related stage.
 */
export function getDispatchActorFromHistory(
  history: WarehouseOrderFlowHistoryEntry[] | undefined
): { byName?: string; at?: string; stage?: string } | null {
  if (!history?.length) return null;
  const entry = [...history].reverse().find((h) => DISPATCH_STAGES.has(String(h.to || '')));
  if (!entry) return null;
  return { byName: entry.byName, at: entry.at, stage: entry.to };
}

/**
 * Find who moved the order to a specific flow stage (last occurrence).
 */
export function getActorForStage(
  history: WarehouseOrderFlowHistoryEntry[] | undefined,
  stage: string
): { byName?: string; at?: string } | null {
  if (!history?.length) return null;
  const entry = [...history].reverse().find((h) => h.to === stage);
  if (!entry) return null;
  return { byName: entry.byName, at: entry.at };
}
