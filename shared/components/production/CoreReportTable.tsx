"use client";

import React from "react";
import type { CoreReportMetrics, CoreReportRow } from "@/shared/services/productionService";
import type { CoreReportColumnKey } from "./coreReportFormulas";

export interface CoreReportTableProps {
  rows: CoreReportRow[];
  pageTotals: CoreReportMetrics;
  totals: CoreReportMetrics;
  total: number;
  vendorColumns: string[];
  onOpenFormula: (key: CoreReportColumnKey) => void;
}

const NUM_CELL = "px-1.5 py-2.5 text-right text-[12px] border border-gray-300 tabular-nums";
const YELLOW = "bg-yellow-100";
const TH =
  "px-1.5 py-2 text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 align-bottom";

/**
 * Formats a qty; negatives keep their sign so a broken WIP stays visible.
 * @param n Quantity
 */
function fmtQty(n: number): string {
  return (n ?? 0).toLocaleString();
}

/**
 * Header cell with a formula info button.
 */
function FormulaHeader({
  label,
  columnKey,
  align = "right",
  rowSpan,
  className = "",
  onOpen,
}: {
  label: string;
  columnKey: CoreReportColumnKey;
  align?: "left" | "right";
  rowSpan?: number;
  className?: string;
  onOpen: (key: CoreReportColumnKey) => void;
}) {
  return (
    <th
      rowSpan={rowSpan}
      scope="col"
      className={`${TH} ${align === "right" ? "text-right" : "text-left"} ${className}`}
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

/**
 * Group header spanning several qty columns.
 */
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
 * Identity column header (rowSpan 2).
 */
function IdentityHeader({
  label,
  columnKey,
  onOpen,
}: {
  label: string;
  columnKey: CoreReportColumnKey;
  onOpen: (key: CoreReportColumnKey) => void;
}) {
  return <FormulaHeader label={label} columnKey={columnKey} align="left" rowSpan={2} onOpen={onOpen} />;
}

/**
 * Core Report grid: one row per factory code, grouped warehouse / vendor / factory headers.
 */
export default function CoreReportTable({
  rows,
  pageTotals,
  totals,
  total,
  vendorColumns,
  onOpenFormula,
}: CoreReportTableProps) {
  const vendorSpan = Math.max(vendorColumns.length, 1);

  /**
   * Numeric cells for a footer row.
   * @param m Metrics
   * @param label Footer label
   */
  const footerRow = (m: CoreReportMetrics, label: string) => (
    <tr className="bg-gray-50 font-bold">
      <td colSpan={6} className="pl-[10px] pr-1 py-2.5 text-[11px] border border-gray-300 text-[#495057]">
        {label}
      </td>
      <td className={`${NUM_CELL} ${YELLOW}`}>{fmtQty(m.sapStock)}</td>
      <td className={`${NUM_CELL} ${YELLOW}`}>{fmtQty(m.inwardPending)}</td>
      <td className={`${NUM_CELL} ${YELLOW}`}>{fmtQty(m.inTransit)}</td>
      <td className={`${NUM_CELL} ${YELLOW}`}>{fmtQty(m.wip)}</td>
      <td className={NUM_CELL}>{fmtQty(m.runningOnMachine)}</td>
      <td className={NUM_CELL}>{fmtQty(m.productionPlanning)}</td>
      <td className={`${NUM_CELL} ${YELLOW}`}>{fmtQty(m.totalInhand)}</td>
      {vendorColumns.length === 0 ? (
        <td className={`${NUM_CELL} text-gray-400`}>—</td>
      ) : (
        vendorColumns.map((vendor) => (
          <td key={vendor} className={NUM_CELL}>
            {fmtQty(m.vendorPending?.[vendor] ?? 0)}
          </td>
        ))
      )}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 [border-spacing:0]" aria-label="Core Report">
        <caption className="sr-only">
          One row per factory code. SAP stock, inward pending and WIP add up to total inhand stock. Vendor columns are
          open PO pending by vendor.
        </caption>
        <thead>
          <tr className="bg-gray-50/80">
            <IdentityHeader label="Brand" columnKey="brand" onOpen={onOpenFormula} />
            <IdentityHeader label="Vendor Code / Internal Code" columnKey="vendorCode" onOpen={onOpenFormula} />
            <IdentityHeader label="Factory Code" columnKey="factoryCode" onOpen={onOpenFormula} />
            <IdentityHeader label="Color" columnKey="color" onOpen={onOpenFormula} />
            <IdentityHeader label="Type" columnKey="type" onOpen={onOpenFormula} />
            <IdentityHeader label="Design" columnKey="design" onOpen={onOpenFormula} />
            <GroupHeader label="WH" span={1} tone="bg-amber-50/80 text-amber-900" />
            <GroupHeader label="Vendor Quantity" span={2} tone="bg-sky-50/80 text-sky-900" />
            <GroupHeader label="Factory" span={3} tone="bg-violet-50/80 text-violet-900" />
            <FormulaHeader
              label="Total Inhand Stock"
              columnKey="totalInhand"
              rowSpan={2}
              className={YELLOW}
              onOpen={onOpenFormula}
            />
            <GroupHeader
              label="Vendorwise PO Pending Quantity"
              span={vendorSpan}
              tone="bg-emerald-50/80 text-emerald-900"
            />
          </tr>
          <tr className="bg-gray-50/80">
            <FormulaHeader label="SAP Stock" columnKey="sapStock" className={YELLOW} onOpen={onOpenFormula} />
            <FormulaHeader
              label="Inward Pending Quantity"
              columnKey="inwardPending"
              className={YELLOW}
              onOpen={onOpenFormula}
            />
            <FormulaHeader label="In Transit Quantity" columnKey="inTransit" className={YELLOW} onOpen={onOpenFormula} />
            <FormulaHeader label="WIP" columnKey="wip" className={YELLOW} onOpen={onOpenFormula} />
            <FormulaHeader label="Running on Machine" columnKey="runningOnMachine" onOpen={onOpenFormula} />
            <FormulaHeader label="Production Planning" columnKey="productionPlanning" onOpen={onOpenFormula} />
            {vendorColumns.length === 0 ? (
              <th scope="col" className={`${TH} text-right text-gray-400`}>
                No open vendors
              </th>
            ) : (
              vendorColumns.map((vendor) => (
                <FormulaHeader
                  key={vendor}
                  label={vendor}
                  columnKey="vendorPending"
                  onOpen={onOpenFormula}
                />
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.productId} className="hover:bg-gray-50/50">
              <td className="pl-[10px] pr-1 py-2.5 text-[12px] border border-gray-300 font-medium text-gray-800">
                {row.brand || "—"}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-300 font-medium text-gray-800">
                {row.vendorCode || "—"}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-300 font-bold text-gray-900">
                {row.factoryCode || "—"}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-300 text-gray-700">{row.color || "—"}</td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-300 text-gray-700">{row.type || "—"}</td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-300 text-gray-700">{row.design || "—"}</td>
              <td className={`${NUM_CELL} ${YELLOW}`}>{fmtQty(row.sapStock)}</td>
              <td className={`${NUM_CELL} ${YELLOW}`}>{fmtQty(row.inwardPending)}</td>
              <td className={`${NUM_CELL} ${YELLOW}`}>{fmtQty(row.inTransit)}</td>
              <td className={`${NUM_CELL} ${YELLOW} ${row.wip < 0 ? "text-red-700" : ""}`}>{fmtQty(row.wip)}</td>
              <td className={NUM_CELL}>{fmtQty(row.runningOnMachine)}</td>
              <td className={NUM_CELL}>{fmtQty(row.productionPlanning)}</td>
              <td className={`${NUM_CELL} ${YELLOW} font-bold`}>{fmtQty(row.totalInhand)}</td>
              {vendorColumns.length === 0 ? (
                <td className={`${NUM_CELL} text-gray-400`}>—</td>
              ) : (
                vendorColumns.map((vendor) => (
                  <td key={vendor} className={NUM_CELL}>
                    {fmtQty(row.vendorPending?.[vendor] ?? 0)}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {footerRow(pageTotals, `Page total (${rows.length.toLocaleString()} rows)`)}
          {footerRow(totals, `All matching (${total.toLocaleString()} rows)`)}
        </tfoot>
      </table>
    </div>
  );
}
