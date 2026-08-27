"use client";
import React, { useCallback, useState } from "react";
import type { VendorInvoiceReportRow } from "@/shared/services/vendorInvoiceReportService";
import {
  formatInvoiceValue,
  formatQty,
  formatSheetDate,
  formatShortExc,
  invoiceReportTdCenter,
  invoiceReportTdLeft,
} from "../vendorInvoiceReportColumns";
import {
  getInvoiceReportColumnInfo,
  type InvoiceReportColumnId,
  type InvoiceReportColumnInfo,
} from "../invoiceReportColumnInfo";
import InvoiceReportColumnInfoDrawer from "./InvoiceReportColumnInfoDrawer";
import InvoiceReportTh from "./InvoiceReportTh";

type VendorInvoiceReportTableProps = {
  loading: boolean;
  rows: VendorInvoiceReportRow[];
  hasFilters: boolean;
};

/**
 * Two-row yellow header table for the vendor invoice reconciliation report.
 */
const VendorInvoiceReportTable = ({ loading, rows, hasFilters }: VendorInvoiceReportTableProps) => {
  const [columnInfo, setColumnInfo] = useState<InvoiceReportColumnInfo | null>(null);

  /** Open the right drawer for a column. */
  const openColumnInfo = useCallback((id: InvoiceReportColumnId) => {
    setColumnInfo(getInvoiceReportColumnInfo(id));
  }, []);

  return (
    <>
    <div className="overflow-x-auto min-h-[300px]">
      <table className="w-full border-collapse border border-gray-200" aria-label="Vendor invoice report">
        <thead>
          <tr>
            <InvoiceReportTh columnId="vendorName" rowSpan={2} onInfo={openColumnInfo}>
              Vendor Name
            </InvoiceReportTh>
            <InvoiceReportTh columnId="poNumber" rowSpan={2} onInfo={openColumnInfo}>
              PO Number
            </InvoiceReportTh>
            <InvoiceReportTh columnId="poDate" rowSpan={2} onInfo={openColumnInfo}>
              PO Date
            </InvoiceReportTh>
            <InvoiceReportTh columnId="invoiceNo" rowSpan={2} onInfo={openColumnInfo}>
              Invoice No
            </InvoiceReportTh>
            <InvoiceReportTh columnId="invDate" rowSpan={2} onInfo={openColumnInfo}>
              Inv Date
            </InvoiceReportTh>
            <InvoiceReportTh columnId="recdDt" rowSpan={2} onInfo={openColumnInfo}>
              Recd Dt
            </InvoiceReportTh>
            <InvoiceReportTh columnId="invoiceValue" rowSpan={2} onInfo={openColumnInfo}>
              Invoice Value
            </InvoiceReportTh>
            <InvoiceReportTh columnId="noOfBox" rowSpan={2} onInfo={openColumnInfo}>
              No of Box
            </InvoiceReportTh>
            <InvoiceReportTh columnId="invoiceQty" rowSpan={2} onInfo={openColumnInfo}>
              Invoice Qty
            </InvoiceReportTh>
            <InvoiceReportTh columnId="stnQty" onInfo={openColumnInfo}>
              WH Transfer Qty
            </InvoiceReportTh>
            <InvoiceReportTh columnId="m1" rowSpan={2} onInfo={openColumnInfo}>
              M1
            </InvoiceReportTh>
            <InvoiceReportTh columnId="m2" rowSpan={2} onInfo={openColumnInfo}>
              M2
            </InvoiceReportTh>
            <InvoiceReportTh columnId="m3" rowSpan={2} onInfo={openColumnInfo}>
              M3
            </InvoiceReportTh>
            <InvoiceReportTh columnId="m4" rowSpan={2} onInfo={openColumnInfo}>
              M4
            </InvoiceReportTh>
            <InvoiceReportTh columnId="vm4" rowSpan={2} onInfo={openColumnInfo}>
              VM4/PR
            </InvoiceReportTh>
            <InvoiceReportTh columnId="shortExc" rowSpan={2} onInfo={openColumnInfo}>
              SHORT/EXC
            </InvoiceReportTh>
            <InvoiceReportTh columnId="pendingInward" rowSpan={2} onInfo={openColumnInfo}>
              PENDING INWARD
            </InvoiceReportTh>
          </tr>
          <tr>
            <InvoiceReportTh columnId="stnQty" onInfo={openColumnInfo}>
              STN Qty
            </InvoiceReportTh>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={17} className="px-1.5 py-10 border border-gray-200">
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
              <td colSpan={17} className="px-1.5 py-10 border border-gray-200">
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
                <td className={invoiceReportTdCenter}>{formatQty(row.m1)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.m2)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.m3)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.m4)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.vm4)}</td>
                <td className={invoiceReportTdCenter}>{formatShortExc(row.shortExc)}</td>
                <td className={invoiceReportTdCenter}>{formatQty(row.pendingInward)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
      <InvoiceReportColumnInfoDrawer info={columnInfo} onClose={() => setColumnInfo(null)} />
    </>
  );
};

export default VendorInvoiceReportTable;
