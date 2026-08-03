"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import { whmsInvoices, type WhmsInvoice } from "@/shared/services/whmsFulfilmentService";
import BillingLineItemsTable from "../../components/BillingLineItemsTable";
import { billingLineTotals, buildInvoiceDetailLines, type BillingLineRow } from "../../billingLineItemsUtils";
import { printInvoiceDocument } from "../../billingPrintUtils";

/**
 * Invoice detail page — full line-item view matching the print layout.
 */
export default function BillingInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = String(params?.invoiceId || "");

  const [invoice, setInvoice] = useState<WhmsInvoice | null>(null);
  const [lines, setLines] = useState<BillingLineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await whmsInvoices.get(invoiceId);
      setInvoice(data);
      setLines(buildInvoiceDetailLines(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = billingLineTotals(lines);

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      const payload = await whmsInvoices.printPayload(invoice.id);
      printInvoiceDocument(payload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoice for print");
    }
  };

  return (
    <>
      <Seo title={invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : "Invoice Detail"} />
      <Toaster position="top-right" />

      <div className="box">
        <div className="box-header flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/warehouse-management/billing" className="ti-btn ti-btn-light text-[12px] font-semibold">
              <i className="ri-arrow-left-line" aria-hidden /> Back
            </Link>
            <div>
              <h3 className="box-title mb-0">
                Invoice {invoice?.invoiceNumber || "—"}
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Full billing details — same data as print.
              </p>
            </div>
          </div>

          {invoice ? (
            <button
              type="button"
              onClick={() => void handlePrint()}
              className="ti-btn ti-btn-light text-[12px] font-semibold"
              aria-label={`Print invoice ${invoice.invoiceNumber}`}
            >
              <i className="ri-printer-line" aria-hidden /> Print
            </button>
          ) : null}
        </div>

        <div className="box-body">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 py-8 text-center" role="alert">{error}</p>
          ) : invoice ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Invoice #</p>
                  <p className="text-[14px] font-bold text-gray-900 mt-1">{invoice.invoiceNumber}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Order #</p>
                  <p className="text-[14px] font-semibold text-gray-900 mt-1">{invoice.orderNumber || "—"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Client</p>
                  <p className="text-[14px] font-semibold text-gray-900 mt-1">{invoice.clientName || "—"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Status</p>
                  <p className="text-[13px] font-semibold mt-1">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[11px] ${
                        invoice.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-[12px] text-gray-700 border border-gray-200 rounded-lg px-4 py-3 bg-white">
                <span><strong>Total qty:</strong> {invoice.totalQuantity ?? totals.billQty}</span>
                {invoice.totalAmount ? <span><strong>Total amount:</strong> {invoice.totalAmount}</span> : null}
                {invoice.createdByName ? <span><strong>Billed by:</strong> {invoice.createdByName}</span> : null}
                {invoice.createdAt ? (
                  <span><strong>Created:</strong> {new Date(invoice.createdAt).toLocaleString()}</span>
                ) : null}
                {invoice.addonOrderId?.trim() ? (
                  <span><strong>Addon order ID:</strong> {invoice.addonOrderId}</span>
                ) : null}
              </div>

              <BillingLineItemsTable lines={lines} mode="invoice" />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
