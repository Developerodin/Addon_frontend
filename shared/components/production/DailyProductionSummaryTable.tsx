"use client";

import React from "react";
import type { DailyProductionSummaryResponse } from "@/shared/services/productionService";
import {
  formatDateHeader,
  formatQtyCell,
  getQualifiedRowLabel,
  getRowSourceDescription,
  isNestedDefectRow,
} from "./dailyProductionSummaryRows";

export interface DailyProductionSummaryTableProps {
  /** Loaded report payload. */
  report: DailyProductionSummaryResponse;
  /** Period label such as "August 2026", used for the table caption. */
  periodLabel: string;
}

const HEAD_CELL =
  "px-1.5 py-2 text-right text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 whitespace-nowrap";

const BODY_CELL = "px-1.5 py-1.5 text-right text-[11px] tabular-nums border border-gray-300";

/**
 * Details × date matrix of daily production quantities.
 *
 * The first column is sticky so Details labels stay visible while the month's date columns
 * scroll horizontally. Today's column is tinted, and future dates render as an em dash.
 */
export default function DailyProductionSummaryTable({
  report,
  periodLabel,
}: DailyProductionSummaryTableProps) {
  const { dates, rows, columnTotals, grandTotal, todayKey } = report;

  return (
    <table className="w-max min-w-full border-collapse border border-gray-300 [border-spacing:0]">
      <caption className="sr-only">
        Daily production summary for {periodLabel}: quantity produced per floor for each
        calendar date, in India Standard Time.
      </caption>
      <thead>
        <tr className="bg-gray-50/80">
          <th
            scope="col"
            className="sticky left-0 z-20 bg-gray-50 px-2 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-300 whitespace-nowrap"
          >
            Details
          </th>
          {dates.map((date) => (
            <th
              key={date}
              scope="col"
              className={`${HEAD_CELL} ${date === todayKey ? "bg-purple-50 text-purple-700" : ""}`}
            >
              {formatDateHeader(date)}
            </th>
          ))}
          <th scope="col" className={`${HEAD_CELL} bg-gray-100`}>
            Total
          </th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          const nested = isNestedDefectRow(row);
          return (
            <tr key={row.key} className={nested ? "bg-amber-50/40" : "bg-white"}>
              <th
                scope="row"
                title={getRowSourceDescription(row)}
                className={`sticky left-0 z-10 py-1.5 text-left text-[11px] border border-gray-300 whitespace-nowrap ${
                  nested
                    ? "bg-amber-50/70 pl-5 pr-2 font-medium text-amber-800"
                    : "bg-white px-2 font-bold text-[#495057]"
                }`}
              >
                <span className="sr-only">{getQualifiedRowLabel(row)}</span>
                <span aria-hidden="true">{row.label}</span>
              </th>

              {dates.map((date) => {
                const value = row.values[date];
                return (
                  <td
                    key={date}
                    className={`${BODY_CELL} ${
                      value == null
                        ? "text-gray-300"
                        : value === 0
                          ? "text-gray-300"
                          : "text-gray-800"
                    } ${date === todayKey ? "bg-purple-50/50" : ""}`}
                  >
                    {formatQtyCell(value)}
                  </td>
                );
              })}

              <td className={`${BODY_CELL} bg-gray-50 font-bold text-gray-800`}>
                {formatQtyCell(row.total)}
              </td>
            </tr>
          );
        })}
      </tbody>

      <tfoot>
        <tr className="bg-gray-100">
          <th
            scope="row"
            className="sticky left-0 z-10 bg-gray-100 px-2 py-1.5 text-left text-[11px] font-bold text-[#495057] border border-gray-300 whitespace-nowrap"
          >
            Total
          </th>
          {dates.map((date) => (
            <td
              key={date}
              className={`${BODY_CELL} font-bold ${
                columnTotals[date] == null ? "text-gray-300" : "text-gray-800"
              }`}
            >
              {formatQtyCell(columnTotals[date])}
            </td>
          ))}
          <td className={`${BODY_CELL} font-bold text-gray-900`}>
            {formatQtyCell(grandTotal)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
