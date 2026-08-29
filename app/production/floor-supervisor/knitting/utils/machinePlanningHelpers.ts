import {
  OrderStatus,
  type MachineOrderAssignment,
  type OrderStatusType,
  type ProductionOrderItem,
} from "@/shared/services/machineOrderAssignmentService";

/** Article + rem/prod pair shown in one plan column group. */
export interface PlanSlot {
  articleNumber: string;
  qty: string;
  remaining?: number;
  planned?: number;
}

/** One machine row for Advanced Planning (running + remaining queue). */
export interface AdvancedPlanningRow {
  machineId: string;
  machineCode: string;
  season: string;
  type: string;
  needle: string;
  runningPlan: PlanSlot;
  otherPlans: PlanSlot[];
}

const EMPTY_SLOT: PlanSlot = { articleNumber: "-", qty: "-" };

/**
 * Statuses that should not occupy Advanced Planning queue columns.
 */
export function isInactivePlanStatus(status: OrderStatusType | undefined): boolean {
  return (
    status === OrderStatus.ON_HOLD ||
    status === OrderStatus.SHORT_CLOSE ||
    status === OrderStatus.COMPLETED ||
    status === OrderStatus.CANCELLED
  );
}

/**
 * Resolves a machine Mongo id from an assignment's machine field.
 */
export function getAssignmentMachineId(assignment: MachineOrderAssignment): string | undefined {
  const machine = assignment.machine;
  if (typeof machine === "object" && machine) {
    return (machine as { id?: string }).id ?? (machine as { _id?: string })._id;
  }
  return machine ? String(machine) : undefined;
}

/**
 * Prioritized, non-terminal queue items for a machine, sorted by priority.
 */
export function getQueuedPlanItems(assignment: MachineOrderAssignment): ProductionOrderItem[] {
  return (assignment.productionOrderItems ?? [])
    .filter((item) => item.priority != null && !isInactivePlanStatus(item.status))
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
}

/**
 * Every non-terminal queue item on a machine, regardless of priority.
 *
 * Unlike {@link getQueuedPlanItems} this does not require `priority`, so
 * quantity reports do not silently drop unprioritised items.
 */
export function getPendingQueueItems(assignment: MachineOrderAssignment): ProductionOrderItem[] {
  return (assignment.productionOrderItems ?? []).filter((item) => !isInactivePlanStatus(item.status));
}

/**
 * Formats remaining / planned quantity as "Rem / Prod", or "-" when missing.
 */
export function formatPlanQty(item: ProductionOrderItem | undefined): string {
  if (!item) return "-";
  const prod = item.plannedQuantity;
  if (prod == null) return "-";
  const rem = item.knittingRemaining ?? prod;
  return `${(rem ?? prod).toLocaleString()} / ${prod.toLocaleString()}`;
}

/**
 * Article / factory code for a plan cell, or "-" when missing.
 */
export function formatPlanArticle(item: ProductionOrderItem | undefined): string {
  const code = item?.articleNumber?.trim();
  return code || "-";
}

/**
 * Builds a display slot from a queue item.
 */
export function toPlanSlot(item: ProductionOrderItem | undefined): PlanSlot {
  if (!item) return { ...EMPTY_SLOT };
  const planned = item.plannedQuantity;
  return {
    articleNumber: formatPlanArticle(item),
    qty: formatPlanQty(item),
    remaining: planned == null ? undefined : (item.knittingRemaining ?? planned),
    planned: planned ?? undefined,
  };
}

/**
 * Sums remaining and planned qty across the given plan slots.
 */
function sumSlotQty(slots: PlanSlot[]): { remaining: number; planned: number; hasAny: boolean } {
  let remaining = 0;
  let planned = 0;
  let hasAny = false;
  for (const slot of slots) {
    if (slot.planned == null) continue;
    hasAny = true;
    planned += slot.planned;
    remaining += slot.remaining ?? slot.planned;
  }
  return { remaining, planned, hasAny };
}

/**
 * Formats remaining / planned as "Rem / Prod", or "-" when none of the slots have qty.
 */
function formatSlotQtySum(slots: PlanSlot[]): string {
  const { remaining, planned, hasAny } = sumSlotQty(slots);
  if (!hasAny) return "-";
  return `${remaining.toLocaleString()} / ${planned.toLocaleString()}`;
}

/**
 * Sums remaining and planned qty across running + queued plans on a machine.
 */
export function formatMachineTotalQty(row: AdvancedPlanningRow): string {
  return formatSlotQtySum([row.runningPlan, ...row.otherPlans]);
}

/**
 * Grand remaining / planned qty of every machine's currently running (In Progress) plan.
 */
export function formatRunningPlanTotals(rows: AdvancedPlanningRow[]): string {
  return formatSlotQtySum(rows.map((row) => row.runningPlan));
}

/**
 * Splits queued items into the running In Progress item and remaining plans.
 */
export function splitRunningAndOtherPlans(items: ProductionOrderItem[]): {
  running: ProductionOrderItem | undefined;
  other: ProductionOrderItem[];
} {
  const runningIndex = items.findIndex((item) => item.status === OrderStatus.IN_PROGRESS);
  if (runningIndex < 0) {
    return { running: undefined, other: items };
  }
  return {
    running: items[runningIndex],
    other: [...items.slice(0, runningIndex), ...items.slice(runningIndex + 1)],
  };
}

/**
 * Collects unique factory codes from queued items for catalog lookup.
 */
export function collectPlanFactoryCodes(items: ProductionOrderItem[]): string[] {
  const codes = new Set<string>();
  for (const item of items) {
    const code = item.articleNumber?.trim();
    if (code) codes.add(code);
  }
  return Array.from(codes);
}

/**
 * Pads other-plan slots so every row has `count` columns.
 */
export function padOtherPlans(otherPlans: PlanSlot[], count: number): PlanSlot[] {
  const padded = otherPlans.slice(0, count);
  while (padded.length < count) {
    padded.push({ ...EMPTY_SLOT });
  }
  return padded;
}

/**
 * Max other-plan count across rows (0 when no machine has a queued next plan).
 */
export function getMaxOtherPlanCount(rows: AdvancedPlanningRow[]): number {
  return rows.reduce((max, row) => Math.max(max, row.otherPlans.length), 0);
}

/**
 * Opens a print window with the advanced planning table (running + Plan 1..N).
 */
export function printAdvancedPlanningTable(rows: AdvancedPlanningRow[], maxOtherPlans: number): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup blocked. Allow popups to print.");
  }

  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const otherGroupHeaders = Array.from({ length: maxOtherPlans }, (_, i) => {
    return `<th colspan="2" style="text-align:center">PLAN ${i + 1}</th>`;
  }).join("");
  const otherSubHeaders = Array.from({ length: maxOtherPlans }, (_, i) => {
    return `<th>Plan ${i + 1}</th><th>Rem / Prod</th>`;
  }).join("");
  const bodyRows = rows
    .map((row) => {
      const others = padOtherPlans(row.otherPlans, maxOtherPlans);
      const otherCells = others
        .map((slot) => `<td>${slot.articleNumber}</td><td>${slot.qty}</td>`)
        .join("");
      return `<tr>
        <td>${row.season}</td>
        <td>${row.type}</td>
        <td>${row.needle}</td>
        <td>${row.machineCode}</td>
        <td>${formatMachineTotalQty(row)}</td>
        <td>${row.runningPlan.articleNumber}</td>
        <td>${row.runningPlan.qty}</td>
        ${otherCells}
      </tr>`;
    })
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Advanced Planning - ${dateStr}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: system-ui, sans-serif; font-size: 9px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          h1 { margin: 0; font-size: 13px; font-weight: bold; }
          .date { font-size: 10px; color: #444; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #333; padding: 2px 4px; text-align: left; white-space: nowrap; }
          th { background: #f0f0f0; font-weight: bold; font-size: 8px; }
          tr:nth-child(even) { background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Advanced Planning</h1>
          <span class="date">${dateStr}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Season</th>
              <th>Type</th>
              <th>Needle</th>
              <th>M/c No.</th>
              <th>Total</th>
              <th colspan="2" style="text-align:center">RUNNING PLAN<br/>${formatRunningPlanTotals(rows)}</th>
              ${otherGroupHeaders}
            </tr>
            <tr>
              <th></th><th></th><th></th><th></th>
              <th>Rem / Prod</th>
              <th>Existing Plan</th><th>Rem / Prod</th>
              ${otherSubHeaders}
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
