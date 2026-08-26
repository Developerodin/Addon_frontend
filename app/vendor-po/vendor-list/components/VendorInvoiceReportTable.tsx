"use client";
import React from "react";
import type { VendorInvoiceReportRow } from "@/shared/services/vendorInvoiceReportService";
import {
  formatInvoiceValue,
  formatQty,
  formatSheetDate,
  formatShortExc,
  invoiceReportTdCenter,
  invoiceReportTdLeft,
  invoiceReportThClass,
} from "../vendorInvoiceReportColumns";

type VendorInvoiceReportTableProps = {
  loading: boolean;
  rows: VendorInvoiceReportRow[];
  hasFilters: boolean;
};

/**
 * Two-row yellow header table for the vendor invoice reconciliation report.
 */
const VendorInvoiceReportTable = ({ loading, rows, hasFilters }: VendorInvoiceReportTableProps) => {
  return (
    <div className="overflow-x-auto min-h-[300px]">
      <table className="w-full border-collapse border border-gray-200" aria-label="Vendor invoice report">
        <thead>
          <tr>
            <th rowSpan={2} className={invoiceReportThClass}>
              Vendor Name
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              PO Number
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              PO Date
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              Invoice No
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              Inv Date
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              Recd Dt
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              Invoice Value
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              No of Box
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              Invoice Qty
            </th>
            <th className={invoiceReportThClass}>WH Transfer Qty</th>
            <th rowSpan={2} className={invoiceReportThClass}>
              M3
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              M4
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              PR
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              SHORT/EXC
            </th>
            <th rowSpan={2} className={invoiceReportThClass}>
              PENDING INWARD
            </th>
          </tr>
          <tr>
            <th className={invoiceReportThClass}>STN Qty</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={15} className="px-1.5 py-10 border border-gray-200">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" />
                  <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
                    Loading Data
                  </p>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={15} className="px-1.5 py-10 border border-gray-200">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <i className="ri-file-list-3-line text-xl text-gray-300" />
                  </div>
                  <h3 className="text-xs font-bold text-gray-500 mb-1">NO INVOICE ROWS</h3>
                  <p className="text-[11px] text-gray-500">
                    {hasFilters
                      ? "Try adjusting search or PO date range"
                      : "Rows appear after goods are received (lot / invoice on the PO)"}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={`${row.poNumber}-${row.invoiceNo}-${index}`}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className={invoiceReportTdLeft}>{row.vendorName}</td>
                <td className={invoiceReportTdCenter}>{row.poNumber}</td>
                <td className={invoiceReportTdCenter}>{formatSheetDate(row.poDate)}</td>
                <td className={invoiceReportTdLeft}>{row.invoiceNo}</td>
                <td className={invoiceReportTdCenter}>{formatSheetDate(row.invDate)}</td>
                <td className={invoiceReportTdCenter}>{formatSheetDate(row.recdDt)}</td>
                <td className={invoiceReportTdCenter}>{formatInvoiceValue(row.invoiceValue)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.noOfBox)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.invoiceQty)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.stnQty)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.m3)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.m4)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.pr)}</td>
                <td className={invoiceReportTdCenter}>{formatShortExc(row.shortExc)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.pendingInward)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VendorInvoiceReportTable;
