import type { MachineOrderAssignment, ProductionOrderItem } from "@/shared/services/machineOrderAssignmentService";
import type { Machine } from "@/shared/services/machinesService";
import { getAssignmentMachineId, getPendingQueueItems } from "./machinePlanningHelpers";

/** Default pieces one machine is expected to knit per day. Editable in the tab toolbar. */
export const DEFAULT_DAILY_RATE_PER_MACHINE = 150;

/** Above this many days to clear, a needle is flagged as overloaded. */
export const OVERLOAD_DAYS_THRESHOLD = 30;

/** Bucket label for machines whose assignment has no active needle set. */
export const UNASSIGNED_NEEDLE_LABEL = "Not set";

export type RemarkTone = "danger" | "warning" | "info" | "success" | "neutral";

export interface NeedleRemark {
  text: string;
  tone: RemarkTone;
}

/** One needle size row of the Needle Wise Production Planning table. */
export interface NeedleWiseRow {
  /** Needle size, or {@link UNASSIGNED_NEEDLE_LABEL}. Also used as the React key. */
  needle: string;
  /** True for the catch-all row of machines with no active needle. */
  isUnassigned: boolean;
  inactiveMachines: number;
  activeMachines: number;
  pendingQty: number;
  /** Days to clear the queue, or null when it cannot be computed. */
  daysRequired: number | null;
  remarks: NeedleRemark[];
}

/** Footer totals so the table reconciles against the machine master. */
export interface NeedleWiseTotals {
  needleCount: number;
  inactiveMachines: number;
  activeMachines: number;
  pendingQty: number;
  /** Sum of each needle row's days. */
  daysRequired: number | null;
}

/**
 * Pending knitting that cannot appear in the needle table because it has no
 * needle yet. Reported alongside the table so this tab reconciles against the
 * Production Order Summary instead of silently reading lower.
 */
export interface NeedleWiseReconciliation {
  /** Sum of the needle rows. Work already loaded onto a machine. */
  onMachineQty: number;
  /** Pending work with no machine assigned. Needs planning. */
  unplannedQty: number;
  /** onMachineQty + unplannedQty. Matches Order Summary "Knit pending". */
  totalPendingQty: number;
  /** How many articles make up {@link unplannedQty}. */
  unplannedArticleCount: number;
  /** False when the buckets endpoint failed, so unplanned qty is unknown. */
  hasUnplannedData: boolean;
}

export interface NeedleWiseReport {
  rows: NeedleWiseRow[];
  totals: NeedleWiseTotals;
  reconciliation: NeedleWiseReconciliation;
}

/** Backend-supplied pending, so both reports read from one calculation. */
export interface NeedleWisePendingSource {
  /** Needle size -> on-machine pending qty, from the buckets endpoint. */
  onMachineByNeedle: Record<string, number>;
  unplannedQty: number;
  unplannedArticleCount: number;
}

/** Mutable accumulator used while bucketing machines and assignments. */
interface NeedleBucket {
  inactiveMachines: number;
  activeMachines: number;
  pendingQty: number;
}

/** True when the machine catalog explicitly marks a machine as under maintenance. */
function isUnderMaintenance(machine: Pick<Machine, "status">): boolean {
  return String(machine.status ?? "").trim().toLowerCase() === "under maintenance";
}

/**
 * Whether a machine counts as active on its needle.
 *
 * This deliberately mirrors the Status badge on the Machine view tab, which
 * reads the assignment's `isActive` flag rather than `Machine.status`. The
 * catalog `status` field is not maintained (the bulk importer defaults it to
 * `Idle`), so it cannot decide this on its own; it is only used to pull a
 * machine out of the active count when it is explicitly under maintenance.
 */
export function resolveMachineActivity(
  machine: Pick<Machine, "status">,
  assignment: MachineOrderAssignment | undefined,
): "active" | "inactive" {
  if (!assignment?.isActive) return "inactive";
  return isUnderMaintenance(machine) ? "inactive" : "active";
}

/** Reads a finite, non-negative number, falling back to 0. */
function toPositiveNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Knitting pending for one queue item: Article View Rem, never planned qty. */
function resolveItemPending(item: ProductionOrderItem): number {
  return toPositiveNumber(item.knittingRemaining);
}

/**
 * Total knitting pending across a machine's live queue.
 *
 * Completed, Short Close, On Hold and Cancelled items are excluded by
 * {@link getPendingQueueItems}.
 */
export function sumAssignmentPending(assignment: MachineOrderAssignment): number {
  return getPendingQueueItems(assignment).reduce((sum, item) => sum + resolveItemPending(item), 0);
}

/**
 * Days needed to clear `pendingQty` at `dailyRate` per active machine.
 *
 * Returns null when there is pending work but nothing to run it on, or when
 * the rate is not a usable number, so the caller can render a dash instead of
 * Infinity or NaN.
 */
export function computeDaysRequired(
  pendingQty: number,
  activeMachines: number,
  dailyRate: number,
): number | null {
  if (pendingQty <= 0) return 0;
  if (activeMachines <= 0) return null;
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) return null;
  return Math.ceil(pendingQty / (dailyRate * activeMachines));
}

/** "1 machine" / "2 machines" */
function pluralizeMachines(count: number): string {
  return `${count} machine${count === 1 ? "" : "s"}`;
}

/**
 * Auto-generated status flags for one needle row. Read-only; nothing is persisted.
 */
export function buildRemarks(row: Omit<NeedleWiseRow, "remarks">): NeedleRemark[] {
  const { activeMachines, inactiveMachines, pendingQty, daysRequired, isUnassigned } = row;
  const remarks: NeedleRemark[] = [];

  if (isUnassigned && activeMachines + inactiveMachines > 0) {
    remarks.push({ text: "Active needle not set on assignment", tone: "warning" });
  }

  if (pendingQty > 0 && activeMachines === 0) {
    remarks.push({ text: "No active machine on this needle", tone: "danger" });
  } else if (daysRequired !== null && daysRequired > OVERLOAD_DAYS_THRESHOLD) {
    remarks.push({ text: `Overloaded - ${daysRequired} days, add capacity`, tone: "warning" });
  } else if (pendingQty === 0 && activeMachines > 0) {
    remarks.push({ text: `Idle capacity - ${pluralizeMachines(activeMachines)} free`, tone: "info" });
  } else if (daysRequired !== null && daysRequired > 0) {
    remarks.push({ text: "On track", tone: "success" });
  }

  if (inactiveMachines > 0) {
    remarks.push({ text: `${pluralizeMachines(inactiveMachines)} down`, tone: "neutral" });
  }

  return remarks;
}

/** Creates an empty bucket, registering the needle key on first use. */
function getBucket(buckets: Map<string, NeedleBucket>, key: string): NeedleBucket {
  const existing = buckets.get(key);
  if (existing) return existing;
  const created: NeedleBucket = { inactiveMachines: 0, activeMachines: 0, pendingQty: 0 };
  buckets.set(key, created);
  return created;
}

/** Needle key for an assignment, or the unassigned bucket when blank. */
function resolveNeedleKey(assignment: MachineOrderAssignment | undefined): string {
  const needle = assignment?.activeNeedle?.trim();
  return needle || UNASSIGNED_NEEDLE_LABEL;
}

/** Numeric-aware sort so "84" comes before "108" even though both are strings. */
function compareNeedles(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Aggregates machines and their queues into one row per needle size.
 *
 * Rows come from the union of every machine's `needleSizeConfig`, so a needle
 * nobody currently runs still appears with zero counts. Each machine is counted
 * exactly once, under the `activeNeedle` of its assignment.
 */
export function buildNeedleWiseRows(
  machines: Machine[],
  assignments: MachineOrderAssignment[],
  dailyRate: number,
  pendingSource?: NeedleWisePendingSource,
): NeedleWiseReport {
  const assignmentByMachineId = new Map<string, MachineOrderAssignment>();
  for (const assignment of assignments) {
    const machineId = getAssignmentMachineId(assignment);
    if (machineId) assignmentByMachineId.set(String(machineId), assignment);
  }

  const buckets = new Map<string, NeedleBucket>();

  // Seed every configurable needle so unused sizes still render as a row.
  for (const machine of machines) {
    for (const config of machine.needleSizeConfig ?? []) {
      const needle = config?.needleSize?.trim();
      if (needle) getBucket(buckets, needle);
    }
  }

  for (const machine of machines) {
    const machineId = String(machine.id ?? "");
    if (!machineId) continue;
    const assignment = assignmentByMachineId.get(machineId);
    const bucket = getBucket(buckets, resolveNeedleKey(assignment));
    if (resolveMachineActivity(machine, assignment) === "active") {
      bucket.activeMachines += 1;
    } else {
      bucket.inactiveMachines += 1;
    }
  }

  // Prefer the backend buckets: the Order Summary is computed from the same
  // numbers, so the two screens cannot drift. Fall back to summing the queues
  // locally only when that endpoint is unavailable.
  if (pendingSource) {
    for (const [needle, qty] of Object.entries(pendingSource.onMachineByNeedle)) {
      if (qty > 0) getBucket(buckets, needle).pendingQty += qty;
    }
  } else {
    for (const assignment of assignments) {
      const pending = sumAssignmentPending(assignment);
      if (pending <= 0) continue;
      getBucket(buckets, resolveNeedleKey(assignment)).pendingQty += pending;
    }
  }

  const needleKeys = Array.from(buckets.keys())
    .filter((key) => key !== UNASSIGNED_NEEDLE_LABEL)
    .sort(compareNeedles);

  const unassigned = buckets.get(UNASSIGNED_NEEDLE_LABEL);
  const hasUnassigned =
    unassigned != null &&
    unassigned.activeMachines + unassigned.inactiveMachines + unassigned.pendingQty > 0;
  if (hasUnassigned) needleKeys.push(UNASSIGNED_NEEDLE_LABEL);

  const rows: NeedleWiseRow[] = needleKeys.map((needle) => {
    const bucket = buckets.get(needle) as NeedleBucket;
    const base: Omit<NeedleWiseRow, "remarks"> = {
      needle,
      isUnassigned: needle === UNASSIGNED_NEEDLE_LABEL,
      inactiveMachines: bucket.inactiveMachines,
      activeMachines: bucket.activeMachines,
      pendingQty: bucket.pendingQty,
      daysRequired: computeDaysRequired(bucket.pendingQty, bucket.activeMachines, dailyRate),
    };
    return { ...base, remarks: buildRemarks(base) };
  });

  const totals = buildTotalsRow(rows);
  return {
    rows,
    totals,
    reconciliation: buildReconciliation(totals.pendingQty, pendingSource),
  };
}

/**
 * Ties the needle table back to the Production Order Summary.
 * @param onMachineQty Sum of the needle rows
 * @param pendingSource Backend buckets, when available
 */
export function buildReconciliation(
  onMachineQty: number,
  pendingSource?: NeedleWisePendingSource,
): NeedleWiseReconciliation {
  const unplannedQty = pendingSource?.unplannedQty ?? 0;
  return {
    onMachineQty,
    unplannedQty,
    totalPendingQty: onMachineQty + unplannedQty,
    unplannedArticleCount: pendingSource?.unplannedArticleCount ?? 0,
    hasUnplannedData: pendingSource != null,
  };
}

/**
 * Sums per-needle days. Null (pending with no active machine) is skipped so a
 * dash on one needle does not wipe the factory total.
 * @param rows Needle rows already given a daysRequired
 */
export function sumDaysRequired(rows: NeedleWiseRow[]): number | null {
  let sum = 0;
  let hasValue = false;
  for (const row of rows) {
    if (row.daysRequired == null) continue;
    hasValue = true;
    sum += row.daysRequired;
  }
  return hasValue ? sum : null;
}

/**
 * Sums every needle row. Footer days are the sum of row days.
 */
export function buildTotalsRow(rows: NeedleWiseRow[]): NeedleWiseTotals {
  const totals = rows.reduce(
    (acc, row) => ({
      inactiveMachines: acc.inactiveMachines + row.inactiveMachines,
      activeMachines: acc.activeMachines + row.activeMachines,
      pendingQty: acc.pendingQty + row.pendingQty,
    }),
    { inactiveMachines: 0, activeMachines: 0, pendingQty: 0 },
  );

  return {
    ...totals,
    needleCount: rows.length,
    daysRequired: sumDaysRequired(rows),
  };
}
