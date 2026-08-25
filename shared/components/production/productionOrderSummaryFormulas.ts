import type { ColumnFormula } from "./formulaTypes";

export type OrderSummaryColumnKey =
  | "order"
  | "totalQty"
  | "holdQty"
  | "knitPendingWithHold"
  | "knitPendingWithoutHold"
  | "wipQty"
  | "transferQty";

export interface OrderSummaryColumnFormula extends ColumnFormula {
  key: OrderSummaryColumnKey;
}

const EXAMPLE_GIVEN = [
  "Order ORD-000042 · 3 articles · planned 400 + 300 + 300",
  "Art A remaining 200 (not short close)",
  "Art B remaining 100 (machine item Short Close)",
  "Art C remaining 0, dispatch.transferred 300",
];

/** Column formulas used by the Production order summary report (locked). */
export const ORDER_SUMMARY_COLUMN_FORMULAS: Record<OrderSummaryColumnKey, OrderSummaryColumnFormula> = {
  order: {
    key: "order",
    title: "Order",
    formula: "orderNumber + orderNote + priority + COUNT(articles)",
    meaning: "Identity of the production order. Name is orderNote (there is no separate orderName field).",
    fields: ["orderNumber", "orderNote", "priority", "articles.length"],
    example: {
      given: ["orderNumber = ORD-000042", "orderNote = Winter pack", "priority = High", "3 article documents on the order"],
      result: "ORD-000042 · Winter pack · High · 3 articles",
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
      result: "400 + 300 + 300 = 1,000",
    },
  },
  holdQty: {
    key: "holdQty",
    title: "Hold qty",
    formula: "SUM(knittingRemaining) WHERE machine item status = Short Close",
    meaning:
      "Short-close leftover: knitting remaining on articles whose current machine-queue item is Short Close.",
    fields: [
      "floorQuantities.knitting.remaining (fallback planned − knitting.completed)",
      "MachineOrderAssignment.productionOrderItems.status = Short Close",
    ],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art B remaining 100 = 100",
    },
    caveat:
      "After yarn return completes, the Short Close queue item is removed. Hold then drops to 0 and leftover remaining counts as knit pending without hold.",
  },
  knitPendingWithHold: {
    key: "knitPendingWithHold",
    title: "Knit pending (with hold)",
    formula: "SUM(knittingRemaining) for all articles on the order",
    meaning: "All knitting still remaining, including short-close leftover (hold).",
    fields: ["floorQuantities.knitting.remaining"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "200 + 100 + 0 = 300  (without hold 200 + hold 100)",
    },
  },
  knitPendingWithoutHold: {
    key: "knitPendingWithoutHold",
    title: "Knit pending (no hold)",
    formula: "SUM(knittingRemaining) WHERE article is NOT Short Close",
    meaning: "Knitting still to do, excluding short-close leftover. Equals (with hold − hold).",
    fields: ["floorQuantities.knitting.remaining", "not in Short Close article set"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art A remaining 200 = 200",
    },
  },
  wipQty: {
    key: "wipQty",
    title: "WIP qty",
    formula: "Total qty − Knit pending without hold − Transfer qty − Hold qty",
    meaning:
      "Knitted qty that has left knitting and has not yet been dispatched to warehouse. Hold is excluded from WIP.",
    fields: ["totalQty", "knitPendingWithoutHold", "transferQty", "holdQty"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "1,000 − 200 − 300 − 100 = 400",
    },
  },
  transferQty: {
    key: "transferQty",
    title: "Transfer qty",
    formula: "SUM(floorQuantities.dispatch.transferred)",
    meaning: "Qty already sent from Dispatch to Warehouse.",
    fields: ["articles[].floorQuantities.dispatch.transferred"],
    example: {
      given: EXAMPLE_GIVEN,
      result: "Art C dispatch.transferred 300 = 300",
    },
  },
};

/** Identity check shown in every formula drawer. */
export const ORDER_SUMMARY_IDENTITY =
  "Total qty = Hold + Knit pending (no hold) + WIP + Transfer";

export const ORDER_SUMMARY_IDENTITY_EXAMPLE = "1,000 = 100 + 200 + 400 + 300";
