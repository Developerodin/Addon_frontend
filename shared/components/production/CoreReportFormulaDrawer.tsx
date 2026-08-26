"use client";

import React from "react";
import FormulaDrawer from "./FormulaDrawer";
import {
  CORE_REPORT_COLUMN_FORMULAS,
  CORE_REPORT_IDENTITY,
  type CoreReportColumnKey,
} from "./coreReportFormulas";

export interface CoreReportFormulaDrawerProps {
  columnKey: CoreReportColumnKey | null;
  onClose: () => void;
}

/**
 * Right-side drawer showing the exact formula for one Core Report column.
 */
export default function CoreReportFormulaDrawer({ columnKey, onClose }: CoreReportFormulaDrawerProps) {
  return (
    <FormulaDrawer
      info={columnKey ? CORE_REPORT_COLUMN_FORMULAS[columnKey] : null}
      onClose={onClose}
      titleId="core-report-formula-title"
      identity={CORE_REPORT_IDENTITY}
    />
  );
}
