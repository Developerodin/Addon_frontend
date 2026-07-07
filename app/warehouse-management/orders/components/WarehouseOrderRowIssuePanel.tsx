"use client";

import React from "react";
import type { WarehouseOrderRowDiagnostics, WarehouseOrderRowField } from "./warehouseOrderRowValidation";

const errorInputClass = "border-red-400 bg-red-50/40 focus:border-red-500";
const warningInputClass = "border-amber-400 bg-amber-50/40 focus:border-amber-500";

/**
 * Returns Tailwind classes for a field that failed row validation.
 * @param field - Column key
 * @param diagnostics - Row diagnostics from {@link diagnoseSinglePairRow}
 */
export function warehouseOrderFieldClass(
  field: WarehouseOrderRowField,
  diagnostics?: WarehouseOrderRowDiagnostics,
): string {
  if (!diagnostics?.invalidFields.has(field)) return "";
  const hasError = diagnostics.issues.some((i) => i.field === field && i.severity === "error");
  return hasError ? errorInputClass : warningInputClass;
}

type Props = {
  diagnostics?: WarehouseOrderRowDiagnostics;
};

/**
 * Inline issue list shown below a warehouse order line row.
 */
export default function WarehouseOrderRowIssuePanel({ diagnostics }: Props) {
  if (!diagnostics?.issues.length) return null;

  return (
    <div
      className="col-span-12 mt-2 rounded border border-red-200 bg-red-50/60 px-3 py-2 space-y-1"
      role="alert"
      aria-live="polite"
    >
      {diagnostics.issues.map((issue, i) => (
        <p
          key={`${issue.field ?? "row"}-${i}`}
          className={`text-[10px] font-medium leading-snug ${
            issue.severity === "error" ? "text-red-800" : "text-amber-800"
          }`}
        >
          <i
            className={`mr-1 ${
              issue.severity === "error" ? "ri-error-warning-fill" : "ri-alert-line"
            }`}
            aria-hidden
          />
          {issue.message}
        </p>
      ))}
    </div>
  );
}
