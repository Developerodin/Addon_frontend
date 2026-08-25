"use client";

import React from "react";
import type { OrderSummaryMetrics, OrderSummaryRow } from "@/shared/services/productionService";
import type { OrderSummaryColumnKey } from "./productionOrderSummaryFormulas";

export interface ProductionOrderSummaryTableProps {
  rows: OrderSummaryRow[];
  pageTotals: OrderSummaryMetrics;
  totals: OrderSummaryMetrics;
  total: number;
  /** Shows the pre-bucket pending column for comparison during rollout. */
  showLegacy: boolean;
  onOpenFormula: (key: OrderSummaryColumnKey) => void;
}

const NUM_CELL = "px-1.5 py-2.5 text-right text-[12px] border border-gray-300 tabular-nums";

/**
 * Formats a qty; negatives keep their sign so a broken WIP stays visible.
 * @param n Quantity
 */
function fmtQty(n: number): string {
  return (n ?? 0).toLocaleString();
}

/**
 * Tailwind badge classes for order priority.
 * @param priority Priority label
 */
function priorityBadge(priority: string): string {
  const map: Record<string, string> = {
    Urgent: "bg-red-100 text-red-800",
    High: "bg-orange-100 text-orange-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800",
  };
  return map[priority] || "bg-gray-100 text-gray-800";
}

/** Header cell with a formula info button that opens the side drawer. */
function FormulaHeader({
  label,
  columnKey,
  align = "right",
  rowSpan,
  className = "",
  onOpen,
}: {
  label: string;
  columnKey: OrderSummaryColumnKey;
  align?: "left" | "right";
  rowSpan?: number;
  className?: string;
  onOpen: (key: OrderSummaryColumnKey) => void;
}) {
  return (
    <th
      rowSpan={rowSpan}
      scope="col"
      className={`px-1.5 py-2 text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 align-bottom ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      <span className={`inline-flex items-center gap-0.5 ${align === "right" ? "justify-end w-full" : ""}`}>
        {label}
        <button
          type="button"
          className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          aria-label={`How ${label} is calculated`}
          title={`How ${label} is calculated`}
          onClick={() => onOpen(columnKey)}
        >
          <i className="ri-information-line text-xs" aria-hidden="true" />
        </button>
      </span>
    </th>
  );
}

/** Group header spanning several qty columns. */
function GroupHeader({ label, span, tone }: { label: string; span: number; tone: string }) {
  return (
    <th
      colSpan={span}
      scope="colgroup"
      className={`px-1.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider border border-gray-300 ${tone}`}
    >
      {label}
    </th>
  );
}

/**
 * Order summary grid: one row per order, with knitting pending split into the
 * buckets that actually count as pending versus the ones that do not.
 */
export default function ProductionOrderSummaryTable({
  rows,
  pageTotals,
  totals,
  total,
  showLegacy,
  onOpenFormula,
}: ProductionOrderSummaryTableProps) {
  /** Renders the numeric cells of a footer row so both footers stay identical. */
  const footerCells = (m: OrderSummaryMetrics, tone: string) => (
    <>
      <td className={`${NUM_CELL} ${tone}`}>{fmtQty(m.totalQty)}</td>
      <td className={`${NUM_CELL} text-gray-600`}>{fmtQty(m.knitPendingWithHold)}</td>
      <td className={`${NUM_CELL} text-gray-800`}>{fmtQty(m.knitPendingOnMachine)}</td>
      <td className={`${NUM_CELL} text-indigo-800`}>{fmtQty(m.knitPendingUnplanned)}</td>
      <td className={`${NUM_CELL} text-amber-800 font-bold`}>{fmtQty(m.knitPendingQty)}</td>
      {showLegacy ? <td className={`${NUM_CELL} text-gray-400`}>{fmtQty(m.knitPendingWithoutHold)}</td> : null}
      <td className={`${NUM_CELL} text-orange-800`}>{fmtQty(m.holdQty)}</td>
      <td className={`${NUM_CELL} text-rose-800`}>{fmtQty(m.closedOnMachineQty)}</td>
      <td className={`${NUM_CELL} text-slate-600`}>{fmtQty(m.onHoldQty)}</td>
      <td className={`${NUM_CELL} ${m.wipQty < 0 ? "text-red-700" : "text-blue-900"}`}>{fmtQty(m.wipQty)}</td>
      <td className={`${NUM_CELL} text-emerald-900`}>{fmtQty(m.transferQty)}</td>
    </>
  );

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse border border-gray-300 [border-spacing:0]"
        aria-label="Production order summary"
      >
        <caption className="sr-only">
          One row per production order. Knit pending counts work on a machine plus work with no machine
          yet. Short close, closed on machine and on hold balances are reported separately and are not
          pending.
        </caption>
        <thead>
          <tr className="bg-gray-50/80">
            <th
              rowSpan={2}
              scope="col"
              className="pl-[10px] pr-1 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 align-bottom"
            >
              <span className="inline-flex items-center gap-0.5">
                Order
                <button
                  type="button"
                  className="p-0.5 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-label="How Order is calculated"
                  title="How Order is calculated"
                  onClick={() => onOpenFormula("order")}
                >
                  <i className="ri-information-line text-xs" aria-hidden="true" />
                </button>
              </span>
            </th>
            <GroupHeader label="Qty" span={2} tone="bg-gray-100/70 text-[#495057]" />
            <GroupHeader
              label="Knit pending"
              span={showLegacy ? 4 : 3}
              tone="bg-amber-50/80 text-amber-900"
            />
            <GroupHeader label="Not pending" span={3} tone="bg-rose-50/70 text-rose-900" />
            <FormulaHeader label="WIP" columnKey="wipQty" rowSpan={2} onOpen={onOpenFormula} />
            <FormulaHeader label="Transfer" columnKey="transferQty" rowSpan={2} onOpen={onOpenFormula} />
          </tr>
          <tr className="bg-gray-50/80">
            <FormulaHeader label="Total" columnKey="totalQty" onOpen={onOpenFormula} />
            <FormulaHeader label="All remaining" columnKey="knitPendingWithHold" onOpen={onOpenFormula} />
            <FormulaHeader label="On machine" columnKey="knitPendingOnMachine" onOpen={onOpenFormula} />
            <FormulaHeader label="Unplanned" columnKey="knitPendingUnplanned" onOpen={onOpenFormula} />
            <FormulaHeader
              label="Pending"
              columnKey="knitPendingQty"
              className="bg-amber-50/60"
              onOpen={onOpenFormula}
            />
            {showLegacy ? (
              <FormulaHeader
                label="Legacy"
                columnKey="knitPendingWithoutHold"
                className="text-gray-400"
                onOpen={onOpenFormula}
              />
            ) : null}
            <FormulaHeader label="Short close" columnKey="holdQty" onOpen={onOpenFormula} />
            <FormulaHeader label="Closed on m/c" columnKey="closedOnMachineQty" onOpen={onOpenFormula} />
            <FormulaHeader label="On hold" columnKey="onHoldQty" onOpen={onOpenFormula} />
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.orderId} className="hover:bg-gray-50/50">
              <td className="pl-[10px] pr-1 py-2.5 border border-gray-300">
                <div className="text-[12px] font-bold text-gray-900">{row.orderNumber || row.orderId}</div>
                {row.orderNote ? (
                  <div
                    className="text-[11px] text-gray-600 font-medium truncate max-w-[220px]"
                    title={row.orderNote}
                  >
                    {row.orderNote}
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityBadge(row.priority)}`}
                  >
                    {row.priority || "—"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {row.articleCount} article{row.articleCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </td>
              <td className={`${NUM_CELL} font-medium text-gray-800`}>{fmtQty(row.totalQty)}</td>
              <td className={`${NUM_CELL} text-gray-500`}>{fmtQty(row.knitPendingWithHold)}</td>
              <td className={`${NUM_CELL} font-medium text-gray-800`}>{fmtQty(row.knitPendingOnMachine)}</td>
              <td className={`${NUM_CELL} font-medium text-indigo-700`}>{fmtQty(row.knitPendingUnplanned)}</td>
              <td className={`${NUM_CELL} font-bold text-amber-800 bg-amber-50/40`}>
                {fmtQty(row.knitPendingQty)}
              </td>
              {showLegacy ? (
                <td className={`${NUM_CELL} text-gray-400`}>{fmtQty(row.knitPendingWithoutHold)}</td>
              ) : null}
              <td className={`${NUM_CELL} font-medium text-orange-700`}>{fmtQty(row.holdQty)}</td>
              <td className={`${NUM_CELL} font-medium text-rose-700`}>{fmtQty(row.closedOnMachineQty)}</td>
              <td className={`${NUM_CELL} font-medium text-slate-500`}>{fmtQty(row.onHoldQty)}</td>
              <td
                className={`${NUM_CELL} font-semibold ${row.wipQty < 0 ? "text-red-700" : "text-blue-800"}`}
              >
                {fmtQty(row.wipQty)}
              </td>
              <td className={`${NUM_CELL} font-medium text-emerald-800`}>{fmtQty(row.transferQty)}</td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="bg-gray-50 font-bold">
            <th
              scope="row"
              className="pl-[10px] pr-1 py-2.5 text-left text-[11px] text-gray-700 border border-gray-300"
            >
              Page ({rows.length} order{rows.length !== 1 ? "s" : ""})
            </th>
            {footerCells(pageTotals, "text-gray-900")}
          </tr>
          <tr className="bg-purple-50 font-bold">
            <th
              scope="row"
              className="pl-[10px] pr-1 py-2.5 text-left text-[11px] text-purple-900 border border-gray-300"
            >
              All matching ({total.toLocaleString()} order{total !== 1 ? "s" : ""} ·{" "}
              {fmtQty(totals.articleCount)} articles)
            </th>
            {footerCells(totals, "text-purple-900")}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
