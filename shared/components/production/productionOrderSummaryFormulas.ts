import type { ColumnFormula } from "./formulaTypes";

export type OrderSummaryColumnKey =
  | "order"
  | "totalQty"
  | "holdQty"
  | "knitPendingWithHold"
  | "knitPendingWithoutHold"
  | "knitPendingQty"
  | "knitPendingOnMachine"
  | "knitPendingUnplanned"
  | "closedOnMachineQty"
  | "onHoldQty"
  | "wipQty"
  | "transferQty";

export interface OrderSummaryColumnFormula extends ColumnFormula {
  key: OrderSummaryColumnKey;
}

const EXAMPLE_GIVEN = [
  "Order ORD-000042 · 5 articles · planned 400 + 300 + 200 + 100 + 50",
  "Art A remaining 200, live on machine M-12",
  "Art B remaining 100, machine row Short Close",
  "Art C remaining 80, machine row Completed (balance never knitted)",
  "Art D remaining 50, never assigned to any machine",
  "Art E remaining 0, dispatch.transferred 300",
];

/** Where remaining knitting sits. Only on-machine + unplanned count as pending. */
const BUCKET_NOTE =
  "Every article's remaining knitting lands in exactly one bucket: on machine, unplanned, short closed, closed on machine, or on hold. The five buckets always add up to Knit pending (with hold), so nothing is silently dropped.";

/** Column formulas used by the Production order summary report. */
export const ORDER_SUMMARY_COLUMN_FORMULAS: Record<OrderSummaryColumnKey, OrderSummaryColumnFormula> = {
  order: {
    key: "order",
    title: "Order",
    formula: "orderNumber + orderNote + priority + COUNT(articles)",
    meaning: "Identity of the production order. Name is orderNote (there is no separate orderName field).",
    fields: ["orderNumber", "orderNote", "priority", "articles.length"],
    example: {
      given: ["orderNumber = ORD-000042", "orderNote = Winter pack", "priority = High", "5 article documents on the order"],
      result: "ORD-000042 · Winter pack · High · 5 articles",
    },
  },
  totalQty: {
    key: "totalQty",
    title: "Total qty",
    formula: "SUM(article.plannedQuantity)",
    meaning: "Original planned quantity of every article on the order (qty at create / current planned).",
    fields: ["articles[].plannedQuantity"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "400 + 300 + 200 + 100 + 50 = 1,050",
    },
  },
  knitPendingQty: {
    key: "knitPendingQty",
    title: "Knit pending",
    formula: "On machine + Unplanned",
    meaning:
      "Knitting the factory still owes: work sitting on a live machine queue plus work that has no machine yet. Balances the machine closed as Completed or Cancelled are excluded, because that machine is finished with the row.",
    fields: ["knitPendingOnMachine", "knitPendingUnplanned"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art A 200 (on machine) + Art D 50 (unplanned) = 250",
    },
    caveat: BUCKET_NOTE,
  },
  knitPendingOnMachine: {
    key: "knitPendingOnMachine",
    title: "On machine",
    formula: "SUM(knittingRemaining) WHERE the article has a live machine-queue row",
    meaning:
      "Pending knitting already loaded onto a machine. This is the number the Needle Wise Production Planning tab shows, so the two screens reconcile.",
    fields: [
      "floorQuantities.knitting.remaining",
      "MachineOrderAssignment.productionOrderItems.status not in (Completed, Cancelled, Short Close, On Hold)",
    ],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art A remaining 200 = 200",
    },
    caveat:
      "An article queued on two machines is counted once, and attributed to the first of its live needles, so needle totals never double count.",
  },
  knitPendingUnplanned: {
    key: "knitPendingUnplanned",
    title: "Unplanned",
    formula: "SUM(knittingRemaining) WHERE the article has no machine-queue row at all",
    meaning:
      "Pending knitting that has never been assigned to a machine. Real work that needs planning. It cannot appear in the Needle Wise table because it has no needle yet, which is why that tab reads lower than this report.",
    fields: ["floorQuantities.knitting.remaining", "article absent from every MachineOrderAssignment queue"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art D remaining 50 = 50",
    },
  },
  holdQty: {
    key: "holdQty",
    title: "Short close",
    formula: "SUM(knittingRemaining) WHERE every machine row is terminal and one is Short Close",
    meaning:
      "Short-close leftover: quantity deliberately abandoned because the order was closed early. Excluded from pending.",
    fields: [
      "floorQuantities.knitting.remaining",
      "MachineOrderAssignment.productionOrderItems.status = Short Close",
    ],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art B remaining 100 = 100",
    },
    caveat:
      "This column was previously labelled Hold, but it only ever counted Short Close. Genuinely On Hold work now has its own column. After yarn return completes the Short Close queue row is removed, so the article becomes Unplanned and its leftover returns to pending.",
  },
  closedOnMachineQty: {
    key: "closedOnMachineQty",
    title: "Closed on machine",
    formula: "SUM(knittingRemaining) WHERE every machine row is Completed or Cancelled",
    meaning:
      "Unknit balance on rows the machine already closed. The operator marked the job Completed or Cancelled while quantity was still outstanding, so it is not counted as pending.",
    fields: [
      "floorQuantities.knitting.remaining",
      "MachineOrderAssignment.productionOrderItems.status in (Completed, Cancelled)",
    ],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art C remaining 80 = 80",
    },
    caveat:
      "If the order still needs this quantity, re-queue the article on a machine. It then moves back into On machine and counts as pending again.",
  },
  onHoldQty: {
    key: "onHoldQty",
    title: "On hold",
    formula: "SUM(knittingRemaining) WHERE every machine row is On Hold",
    meaning: "Pending knitting paused on the machine. Excluded from pending until it resumes.",
    fields: ["floorQuantities.knitting.remaining", "MachineOrderAssignment.productionOrderItems.status = On Hold"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "No On Hold article in this example = 0",
    },
  },
  knitPendingWithHold: {
    key: "knitPendingWithHold",
    title: "All remaining",
    formula: "SUM(knittingRemaining) for every article on the order",
    meaning:
      "Arithmetic total of knitting remaining, ignoring machine status. Equals the five buckets added together, so use it to check that nothing is lost.",
    fields: ["floorQuantities.knitting.remaining"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "200 + 100 + 80 + 50 + 0 = 430  (pending 250 + short close 100 + closed 80)",
    },
  },
  knitPendingWithoutHold: {
    key: "knitPendingWithoutHold",
    title: "Knit pending (legacy)",
    formula: "All remaining − Short close",
    meaning:
      "The pending figure this report showed before closed-on-machine and on-hold balances were separated out. Kept visible during rollout so the change in the headline number is traceable.",
    fields: ["knitPendingWithHold", "holdQty"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "430 − 100 = 330  (vs new Knit pending 250)",
    },
    caveat:
      "This column double counts work the machine has already closed. Prefer Knit pending. It will be removed once the new number is signed off.",
  },
  wipQty: {
    key: "wipQty",
    title: "WIP qty",
    formula: "Total qty − Knit pending − Short close − Closed on machine − On hold − Transfer qty",
    meaning:
      "Knitted qty that has left knitting and has not yet been dispatched to warehouse. Everything not pending, not abandoned and not dispatched.",
    fields: ["totalQty", "knitPendingQty", "holdQty", "closedOnMachineQty", "onHoldQty", "transferQty"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "1,050 − 250 − 100 − 80 − 0 − 300 = 320",
    },
    caveat:
      "Shown in red when negative, which means a downstream floor reported more than was planned. Investigate the floor quantities rather than this column.",
  },
  transferQty: {
    key: "transferQty",
    title: "Transfer qty",
    formula: "SUM(floorQuantities.dispatch.transferred)",
    meaning: "Qty already sent from Dispatch to Warehouse.",
    fields: ["articles[].floorQuantities.dispatch.transferred"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art E dispatch.transferred 300 = 300",
    },
  },
};

/** Identity check shown in every formula drawer. */
export const ORDER_SUMMARY_IDENTITY =
  "Total qty = Knit pending + Short close + Closed on machine + On hold + WIP + Transfer";

export const ORDER_SUMMARY_IDENTITY_EXAMPLE = "1,050 = 250 + 100 + 80 + 0 + 320 + 300";
