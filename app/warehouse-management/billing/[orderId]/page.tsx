"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  warehouseOrderFlowStatusLabel,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsInvoices, whmsScanning, type ScanSession } from "@/shared/services/whmsFulfilmentService";
import BillingLineItemsTable from "../components/BillingLineItemsTable";
import {
  billingLineTotals,
  buildBillingPreviewLines,
  type BillingLineRow,
} from "../billingLineItemsUtils";

/**
 * Pre-invoice billing detail page — review order, scan, and projected bill lines
 * before generating an invoice.
 */
export default function BillingOrderPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = String(params?.orderId || "");

  const [order, setOrder] = useState<WarehouseOrder | null>(null);
  const [scanSession, setScanSession] = useState<ScanSession | null>(null);
  const [lines, setLines] = useState<BillingLineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const [orderData, session] = await Promise.all([
        whmsWarehouseOrders.get(orderId),
        whmsScanning.getLatestScanSessionForOrder(orderId).catch(() => null),
      ]);

      if (orderData.invoiceId) {
        router.replace(`/warehouse-management/billing/invoice/${orderData.invoiceId}`);
        return;
      }

      setOrder(orderData);
      setScanSession(session);
      setLines(buildBillingPreviewLines(orderData, session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing preview");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = billingLineTotals(lines);
  const needsSendToBilling = order?.flowStatus === "scanning-done";
  const canGenerate = order?.flowStatus === "sent-to-billing" && totals.billQty > 0;

  const handleSendToBilling = async () => {
    if (!order) return;
    setBusy(true);
    try {
      await whmsWarehouseOrders.transitionFlowStatus(order.id, "sent-to-billing");
      toast.success(`${order.orderNumber || order.id} sent to billing`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send to billing");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!order) return;
    setBusy(true);
    try {
      const invoice = await whmsInvoices.createFromOrder(order.id);
      toast.success(`Invoice ${invoice.invoiceNumber} generated`);
      router.push(`/warehouse-management/billing/invoice/${invoice.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invoice generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Seo title={order?.orderNumber ? `Billing — ${order.orderNumber}` : "Billing Preview"} />
      <Toaster position="top-right" />

      <div className="box">
        <div className="box-header flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/warehouse-management/billing" className="ti-btn ti-btn-light text-[12px] font-semibold">
              <i className="ri-arrow-left-line" aria-hidden /> Back
            </Link>
            <div>
              <h3 className="box-title mb-0">Billing Preview</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Review scanned quantities before generating the invoice.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {needsSendToBilling ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSendToBilling()}
                className="ti-btn ti-btn-primary text-[12px] font-semibold"
              >
                {busy ? <i className="ri-loader-4-line animate-spin" aria-hidden /> : <i className="ri-arrow-right-line" aria-hidden />}
                {" "}Send to Billing
              </button>
            ) : null}
            {canGenerate ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleGenerate()}
                className="ti-btn ti-btn-primary text-[12px] font-semibold"
              >
                {busy ? <i className="ri-loader-4-line animate-spin" aria-hidden /> : <i className="ri-bill-line" aria-hidden />}
                {" "}Generate Invoice
              </button>
            ) : null}
          </div>
        </div>

        <div className="box-body">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600 py-8 text-center" role="alert">{error}</p>
          ) : order ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Order #</p>
                  <p className="text-[14px] font-bold text-gray-900 mt-1">{order.orderNumber || order.id}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Client</p>
                  <p className="text-[14px] font-semibold text-gray-900 mt-1">{order.clientName || "—"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Stage</p>
                  <p className="text-[13px] font-semibold text-violet-800 mt-1">
                    {warehouseOrderFlowStatusLabel(order.flowStatus)}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                  <p className="text-[10px] font-bold uppercase text-gray-500">Scan Session</p>
                  <p className="text-[13px] font-semibold text-gray-900 mt-1">
                    {scanSession?.status || "—"}
                    {scanSession?.completedAt ? (
                      <span className="block text-[11px] font-normal text-gray-500 mt-0.5">
                        {new Date(scanSession.completedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-[12px] text-gray-700 border border-gray-200 rounded-lg px-4 py-3 bg-white">
                <span><strong>Order qty:</strong> {totals.orderQty}</span>
                <span><strong>Scanned qty:</strong> {totals.scannedQty}</span>
                <span><strong>Bill qty:</strong> {totals.billQty}</span>
                {order.addonOrderId?.trim() ? (
                  <span><strong>Addon order ID:</strong> {order.addonOrderId}</span>
                ) : null}
              </div>

              {!scanSession || scanSession.status !== "completed" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900" role="alert">
                  A completed scan session is required before billing. Finish scanning first.
                </div>
              ) : null}

              {totals.billQty <= 0 && scanSession?.status === "completed" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800" role="alert">
                  Scan session has no scanned quantities to bill.
                </div>
              ) : null}

              <BillingLineItemsTable lines={lines} mode="preview" />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
