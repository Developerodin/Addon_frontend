import type { ColumnFormula } from "@/shared/components/production/formulaTypes";
import { DEFAULT_DAILY_RATE_PER_MACHINE, OVERLOAD_DAYS_THRESHOLD } from "./needleWiseProduction";

export type NeedleWiseColumnKey =
  | "needle"
  | "inactiveMachines"
  | "activeMachines"
  | "pendingQty"
  | "daysRequired"
  | "remark";

/** Shared scenario so every column's example describes the same needle. */
const EXAMPLE_GIVEN = [
  "Needle 168",
  "26 machines have activeNeedle = 168 with an active assignment",
  "0 machines on 168 are switched off or Under Maintenance",
  "Their live queues total 92,517 pcs still to knit",
  `Daily rate = ${DEFAULT_DAILY_RATE_PER_MACHINE} pcs per machine per day`,
];

/** Formula, source fields and a worked example for each Needle Wise column. */
export const NEEDLE_WISE_COLUMN_FORMULAS: Record<NeedleWiseColumnKey, ColumnFormula> = {
  needle: {
    title: "Machine Needle",
    formula: "UNIQUE(machine.needleSizeConfig[].needleSize)",
    meaning:
      "Every needle size the factory is configured for, collected from all machines. A needle appears even when no machine is currently running it, so you can see unused capacity. Machines whose assignment has no active needle are grouped into a final 'Not set' row.",
    fields: ["Machine.needleSizeConfig[].needleSize", "MachineOrderAssignment.activeNeedle"],
    example: {
      given: [
        "Machine A supports 144 and 168",
        "Machine B supports 168",
        "Machine C supports 200",
        "No machine is configured for 84",
      ],
      result: "Rows: 144, 168, 200 (84 only appears if some machine lists it)",
    },
    caveat:
      "Rows are sorted numerically, so 84 comes before 108 even though needle sizes are stored as text.",
  },

  inactiveMachines: {
    title: "Inactive Machine",
    formula: "COUNT(machines on this needle WHERE assignment is not active OR machine is Under Maintenance)",
    meaning:
      "Machines on this needle that are not running: no machine order assignment, an assignment switched off, or a machine explicitly marked Under Maintenance in the catalog. These are excluded from the No of days calculation because they produce nothing.",
    fields: [
      "MachineOrderAssignment.isActive",
      "Machine.status = 'Under Maintenance'",
      "MachineOrderAssignment.activeNeedle",
    ],
    example: {
      given: [
        "9 machines have activeNeedle = 144",
        "8 have an active assignment",
        "1 assignment is switched off",
      ],
      result: "Inactive Machine = 1",
    },
  },

  activeMachines: {
    title: "Active Machine",
    formula: "COUNT(machines on this needle WHERE assignment.isActive AND machine is not Under Maintenance)",
    meaning:
      "Machines currently running this needle. This uses the same Active / Inactive rule as the Status column on the Machine view tab, so the two screens always agree. Each machine is counted exactly once, under the activeNeedle on its assignment, so Inactive + Active across all rows equals your total machine count.",
    fields: [
      "MachineOrderAssignment.isActive",
      "Machine.status = 'Under Maintenance'",
      "MachineOrderAssignment.activeNeedle",
    ],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Active Machine = 26",
    },
    caveat:
      "The catalog Machine.status field is not used to decide Active, because it defaults to Idle on import and is not kept up to date. It is only read to pull a machine out of the active count when it is explicitly Under Maintenance. A machine can support several needle sizes, but is only counted under the one it is set to right now.",
  },

  pendingQty: {
    title: "Pending on Machines",
    formula: "SUM(knittingRemaining) for every live queue row on this needle",
    meaning:
      "Pieces still to be knitted on machines currently set to this needle. This is only the work already loaded onto a machine — it is not the factory's whole knitting backlog. Work with no machine yet has no needle, so it cannot appear in this table and is reported as Unplanned in the reconciliation below.",
    fields: [
      "MachineOrderAssignment.productionOrderItems[]",
      "Article.floorQuantities.knitting.remaining",
      "item.status not in (Completed, Cancelled, Short Close, On Hold)",
    ],
    example: {
      given: [
        "Machine M-12 on needle 168, queue: Art A remaining 40,000, Art B remaining 30,000",
        "Machine M-13 on needle 168, queue: Art C remaining 22,517",
        "Machine M-14 on needle 168, queue: Art D Completed (ignored)",
      ],
      result: "40,000 + 30,000 + 22,517 = 92,517",
    },
    caveat:
      "Supplied by the same backend calculation that feeds the Production Order Summary, so the two screens cannot drift. An article queued on two machines is counted once. Items without a priority are still counted, unlike the Advanced Planning table.",
  },

  daysRequired: {
    title: "No of days",
    formula: "Row: ceil(Pending on Machines / (Daily rate x Active Machine)). Footer: sum of every row.",
    meaning:
      "Working days needed to clear this needle's pending quantity, assuming every active machine runs at the daily rate. Rounded up to a whole day. The daily rate is editable at the top of the tab so you can match it to real output.",
    fields: ["Pending on Machines", "Active Machine", "Daily rate per machine (tab input)"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "ceil(92,517 / (150 x 26)) = ceil(23.72) = 24 days",
    },
    caveat:
      "Shows a dash when there is pending work but no active machine, since the queue would never clear. Inactive machines are never included in the divisor. Unplanned work is not in this figure. The Total days footer sums the row days; needles run in parallel, so that number is capacity-days, not calendar days to clear the factory.",
  },

  remark: {
    title: "Remark",
    formula: "Auto flags derived from Active Machine, Inactive Machine, Pending on Machines and No of days",
    meaning:
      "Read-only status flags. Nothing is saved to the database. Order of precedence: pending work with no active machine, then overloaded, then idle capacity, then on track. A separate grey flag is added whenever machines on the needle are down.",
    fields: ["Active Machine", "Inactive Machine", "Pending on Machines", "No of days"],
    example: {
      given: [
        "Needle 200: pending 103,175, active 20, inactive 1",
        `Days = ceil(103,175 / (150 x 20)) = 35, which is over the ${OVERLOAD_DAYS_THRESHOLD} day threshold`,
      ],
      result: "Overloaded - 35 days, add capacity  ·  1 machine down",
    },
  },
};

/** Reconciliation check shown at the bottom of every Needle Wise formula drawer. */
export const NEEDLE_WISE_IDENTITY =
  "SUM(Inactive) + SUM(Active) = total machines  ·  Pending on Machines + Unplanned = Order Summary knit pending";

export const NEEDLE_WISE_IDENTITY_EXAMPLE = "2 + 54 = 56 machines  ·  75,912 + 14,371 = 90,283 pcs";
