"use client";

import React from "react";
import FormulaDrawer from "./FormulaDrawer";
import {
  ORDER_SUMMARY_COLUMN_FORMULAS,
  ORDER_SUMMARY_IDENTITY,
  ORDER_SUMMARY_IDENTITY_EXAMPLE,
  type OrderSummaryColumnKey,
} from "./productionOrderSummaryFormulas";

export interface ProductionOrderSummaryFormulaDrawerProps {
  columnKey: OrderSummaryColumnKey | null;
  onClose: () => void;
}

/**
 * Right-side drawer showing the exact formula and a worked example for one
 * order summary column.
 */
export default function ProductionOrderSummaryFormulaDrawer({
  columnKey,
  onClose,
}: ProductionOrderSummaryFormulaDrawerProps) {
  return (
    <FormulaDrawer
      info={columnKey ? ORDER_SUMMARY_COLUMN_FORMULAS[columnKey] : null}
      onClose={onClose}
      titleId="order-summary-formula-title"
      identity={{ formula: ORDER_SUMMARY_IDENTITY, example: ORDER_SUMMARY_IDENTITY_EXAMPLE }}
    />
  );
}
