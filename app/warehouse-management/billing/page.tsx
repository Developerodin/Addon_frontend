"use client";

import React, { useMemo, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  WarehouseOrder,
  warehouseOrderFlowStatusLabel,
  type PaginatedWarehouseOrders,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsInvoices, WhmsInvoice } from "@/shared/services/whmsFulfilmentService";
import { useWhmsPaginatedList } from "@/shared/hooks/useWhmsPaginatedList";
import {
  WhmsListPagination,
  WhmsListToolbar,
  WhmsOrderJourneyDrawer,
} from "@/shared/components/whms";

/** Open a minimal print window for an invoice payload. */
function printInvoice(invoice: WhmsInvoice & { generatedAt?: string }) {
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    toast.error("Popup blocked — allow popups to print");
    return;
  }
  const rows = (invoice.items || [])
    .map(
      (item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.styleCode}</td>
        <td>${item.size || ""}</td>
        <td>${item.shade || ""}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">${item.rate ?? ""}</td>
        <td style="text-align:right">${item.amount ?? ""}</td>
      </tr>`
    )
    .join("");
  win.document.write(`<!doctype html><html><head><title>${invoice.invoiceNumber}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; padding: 24px; }
      h2 { margin-bottom: 2px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #999; padding: 5px 8px; }
      th { background: #f2f2f2; text-align: left; }
      .meta { color: #444; margin: 2px 0; }
      .totals { margin-top: 10px; font-weight: bold; }
    </style></head><body>
    <h2>Invoice ${invoice.invoiceNumber}</h2>
    <p class="meta">Order: ${invoice.orderNumber || ""}</p>
    <p class="meta">Client: ${invoice.clientName || ""}</p>
    <table>
      <thead><tr><th>#</th><th>Style Code</th><th>Size</th><th>Shade</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="totals">Total Quantity: ${invoice.totalQuantity}</p>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
  win.document.close();
}

const PENDING_BILLING_BASE = { flowStatusIn: "scanning-done,sent-to-billing", sortBy: "createdAt:desc" };

const fetchPendingOrders = (params: { flowStatusIn: string; sortBy: string; page: number; limit: number; q?: string }) =>
  whmsWarehouseOrders.list(params) as Promise<PaginatedWarehouseOrders>;

const fetchInvoices = (params: { status?: string; sortBy: string; page: number; limit: number; q?: string }) =>
  whmsInvoices.list({ ...params, sortBy: "createdAt:desc" });

/**
 * Billing workboard: paginated pending queue + invoice history with operator attribution.
 */
export default function BillingPage() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [journeyOrderId, setJourneyOrderId] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState("");

  const pending = useWhmsPaginatedList<WarehouseOrder, { flowStatusIn: string; sortBy: string }>({
    fetchFn: fetchPendingOrders,
    baseParams: PENDING_BILLING_BASE,
  });

  const invoiceBaseParams = useMemo(
    () => ({
      sortBy: "createdAt:desc",
      ...(invoiceStatus ? { status: invoiceStatus } : {}),
    }),
    [invoiceStatus]
  );

  const invoices = useWhmsPaginatedList<WhmsInvoice, { status?: string; sortBy: string }>({
    fetchFn: fetchInvoices,
    baseParams: invoiceBaseParams,
  });

  const handleSendToBilling = async (order: WarehouseOrder) => {
    setBusyId(order.id);
    try {
      await whmsWarehouseOrders.transitionFlowStatus(order.id, "sent-to-billing");
      toast.success(`${order.orderNumber || order.id} sent to billing`);
      void pending.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send to billing");
    } finally {
      setBusyId(null);
    }
  };

  const handleGenerate = async (order: WarehouseOrder) => {
    setBusyId(order.id);
    try {
      const invoice = await whmsInvoices.createFromOrder(order.id);
      toast.success(`Invoice ${invoice.invoiceNumber} generated`);
      void pending.refresh();
      void invoices.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invoice generation failed");
    } finally {
      setBusyId(null);
    }
  };

  const handlePrint = async (invoice: WhmsInvoice) => {
    try {
      const payload = await whmsInvoices.printPayload(invoice.id);
      printInvoice(payload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoice");
    }
  };

  const handleCancel = async (invoice: WhmsInvoice) => {
    const reason = window.prompt(`Cancel invoice ${invoice.invoiceNumber}? Enter a reason:`);
    if (reason === null) return;
    setBusyId(invoice.id);
    try {
      await whmsInvoices.cancel(invoice.id, reason);
      toast.success("Invoice cancelled");
      void pending.refresh();
      void invoices.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Seo title="Billing" />
      <Toaster position="top-right" />

      <div className="box mb-4">
        <div className="box-header flex items-center justify-between">
          <h3 className="box-title">Orders Ready for Billing</h3>
          <button type="button" onClick={() => void pending.refresh()} className="ti-btn ti-btn-light text-[12px]">
            <i className="ri-refresh-line"></i> Refresh
          </button>
        </div>
        <div className="box-body">
          <p className="text-xs text-gray-500 mb-3">
            Scanning → Billing → Dispatch. After scan completes, generate invoice here; then ship from Dispatch.
          </p>
          <WhmsListToolbar
            search={pending.q}
            onSearchChange={pending.setQ}
            dateFrom={pending.dateFrom}
            dateTo={pending.dateTo}
            onDateFromChange={pending.setDateFrom}
            onDateToChange={pending.setDateTo}
            limit={pending.limit}
            onLimitChange={pending.setLimit}
          />
          {pending.error ? <p className="text-sm text-red-600 mb-3">{pending.error}</p> : null}
          {pending.loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            </div>
          ) : pending.results.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No orders waiting for billing. Complete scanning first — orders land here as Scanning Done or Sent to Billing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Order #</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Client</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Stage</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Date</th>
                    <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.results.map((order) => {
                    const needsSendToBilling = order.flowStatus === "scanning-done";
                    return (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">{order.orderNumber || order.id}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{order.clientName || "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${needsSendToBilling ? "bg-amber-100 text-amber-800" : "bg-violet-100 text-violet-800"}`}>
                          {warehouseOrderFlowStatusLabel(order.flowStatus)}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{order.date ? new Date(order.date).toLocaleDateString() : "—"}</td>
                      <td className="px-1.5 py-2.5 text-right border border-gray-200 whitespace-nowrap">
                        <button type="button" onClick={() => setJourneyOrderId(order.id)} className="ti-btn ti-btn-light px-2 py-1.5 text-[10px] font-semibold mr-1">View</button>
                        {needsSendToBilling ? (
                          <button type="button" disabled={busyId !== null} onClick={() => void handleSendToBilling(order)} className="ti-btn ti-btn-primary px-3 py-2 text-[11px] font-semibold">
                            {busyId === order.id ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-arrow-right-line"></i>} Send to Billing
                          </button>
                        ) : (
                          <button type="button" disabled={busyId !== null} onClick={() => void handleGenerate(order)} className="ti-btn ti-btn-primary px-3 py-2 text-[11px] font-semibold">
                            {busyId === order.id ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-bill-line"></i>} Generate Invoice
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <WhmsListPagination page={pending.page} totalPages={pending.totalPages} totalResults={pending.totalResults} onPageChange={pending.setPage} itemLabel="orders" />
        </div>
      </div>

      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Invoice History</h3>
        </div>
        <div className="box-body">
          <WhmsListToolbar
            search={invoices.q}
            onSearchChange={invoices.setQ}
            dateFrom={invoices.dateFrom}
            dateTo={invoices.dateTo}
            onDateFromChange={invoices.setDateFrom}
            onDateToChange={invoices.setDateTo}
            limit={invoices.limit}
            onLimitChange={invoices.setLimit}
            statusFilter={invoiceStatus}
            onStatusFilterChange={(v) => {
              setInvoiceStatus(v);
              invoices.setPage(1);
            }}
            statusOptions={[
              { value: "", label: "All statuses" },
              { value: "final", label: "Final" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          {invoices.error ? <p className="text-sm text-red-600 mb-3">{invoices.error}</p> : null}
          {invoices.loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50" />
            </div>
          ) : invoices.results.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Invoice #</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Order #</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Client</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Billed by</th>
                    <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Qty</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Status</th>
                    <th className="px-1.5 py-3 text-left text-[11px] font-bold uppercase border border-gray-200">Created</th>
                    <th className="px-1.5 py-3 text-right text-[11px] font-bold uppercase border border-gray-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.results.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50/50">
                      <td className="px-1.5 py-2.5 text-[12px] font-bold border border-gray-200">{invoice.invoiceNumber}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{invoice.orderNumber || "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{invoice.clientName || "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{invoice.createdByName || "—"}</td>
                      <td className="px-1.5 py-2.5 text-[12px] text-right border border-gray-200">{invoice.totalQuantity}</td>
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${invoice.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 text-[12px] border border-gray-200">{invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="px-1.5 py-2.5 text-right border border-gray-200 whitespace-nowrap">
                        <button type="button" onClick={() => setJourneyOrderId(String(invoice.orderId))} className="ti-btn ti-btn-light px-2 py-1.5 text-[10px] font-semibold mr-1">Journey</button>
                        <button type="button" onClick={() => void handlePrint(invoice)} className="ti-btn ti-btn-light px-2 py-1.5 text-[10px] font-semibold mr-1"><i className="ri-printer-line"></i> Print</button>
                        {invoice.status !== "cancelled" ? (
                          <button type="button" disabled={busyId !== null} onClick={() => void handleCancel(invoice)} className="ti-btn ti-btn-danger px-2 py-1.5 text-[10px] font-semibold">Cancel</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <WhmsListPagination page={invoices.page} totalPages={invoices.totalPages} totalResults={invoices.totalResults} onPageChange={invoices.setPage} itemLabel="invoices" />
        </div>
      </div>

      {journeyOrderId ? (
        <WhmsOrderJourneyDrawer orderId={journeyOrderId} onClose={() => setJourneyOrderId(null)} />
      ) : null}
    </>
  );
}
