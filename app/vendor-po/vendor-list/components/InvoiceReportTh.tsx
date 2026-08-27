"use client";

import React from "react";
import { invoiceReportThClass } from "../vendorInvoiceReportColumns";
import type { InvoiceReportColumnId } from "../invoiceReportColumnInfo";

type InvoiceReportThProps = {
  columnId: InvoiceReportColumnId;
  children: string;
  rowSpan?: number;
  onInfo: (id: InvoiceReportColumnId) => void;
};

/**
 * Yellow header cell with an info button that opens column-help.
 */
export default function InvoiceReportTh({
  columnId,
  children,
  rowSpan,
  onInfo,
}: InvoiceReportThProps) {
  return (
    <th rowSpan={rowSpan} className={invoiceReportThClass}>
      <span className="inline-flex items-center justify-center gap-0.5">
        {children}
        <button
          type="button"
          className="inline-flex items-center justify-center w-4 h-4 rounded text-gray-700 hover:text-purple-800 hover:bg-yellow-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
          aria-label={`How ${children} is calculated`}
          onClick={(event) => {
            event.stopPropagation();
            onInfo(columnId);
          }}
        >
          <i className="ri-information-line text-[11px]" aria-hidden />
        </button>
      </span>
    </th>
  );
}
