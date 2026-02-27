"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";
import { VendorPO, VendorPOStatus, VendorPOLineItem } from "../../../raise/types";
import { getStoredOrders, setStoredOrders } from "../../../raise/data";
import { MOCK_VENDOR_POS } from "../../../raise/data";
import { addToCheckingQueue } from "../../../checking/data";

const DRAFT_KEY_PREFIX = "vendor-po-receipt-draft-";

interface LineReceiptInput {
  receiveQty: number;
  lineRemarks: string;
}

const VendorPOReceiveProcessPage = () => {
  const params = useParams();
  const router = useRouter();
  const user = useSelector((state: any) => state.auth?.user);
  const orderId = params?.orderId as string;

  const [po, setPo] = useState<VendorPO | null>(null);
  const [receiveDateTime, setReceiveDateTime] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lineInputs, setLineInputs] = useState<Record<string, LineReceiptInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const list = getStoredOrders() ?? MOCK_VENDOR_POS;
    const found = list.find((o) => o.id === orderId) ?? null;
    setPo(found);
    const now = new Date();
    setReceiveDateTime(now.toISOString().slice(0, 16));
    const draftRaw = typeof window !== "undefined" ? sessionStorage.getItem(DRAFT_KEY_PREFIX + orderId) : null;
    if (draftRaw && found) {
      try {
        const draft = JSON.parse(draftRaw) as { receiveDateTime?: string; remarks?: string; lineInputs?: Record<string, LineReceiptInput> };
        if (draft.receiveDateTime) setReceiveDateTime(draft.receiveDateTime);
        if (draft.remarks != null) setRemarks(draft.remarks);
        if (draft.lineInputs) setLineInputs(draft.lineInputs);
      } catch (_) {}
    }
  }, [orderId]);

  const pendingLines = useMemo(() => {
    if (!po?.lineItems?.length) return [];
    return po.lineItems.filter((li) => {
      const received = li.receivedQty ?? 0;
      return li.orderedQty - received > 0;
    });
  }, [po]);

  const receivedBy = user?.name || user?.username || user?.email || "Current User";

  const setLineReceiveQty = (lineId: string, receiveQty: number) => {
    setLineInputs((prev) => ({
      ...prev,
      [lineId]: { ...(prev[lineId] ?? { receiveQty: 0, lineRemarks: "" }), receiveQty },
    }));
  };

  const setLineRemarks = (lineId: string, lineRemarks: string) => {
    setLineInputs((prev) => ({
      ...prev,
      [lineId]: { ...(prev[lineId] ?? { receiveQty: 0, lineRemarks: "" }), lineRemarks },
    }));
  };

  const validate = (): boolean => {
    let hasQty = false;
    for (const line of pendingLines) {
      const input = lineInputs[line.id] ?? { receiveQty: 0, lineRemarks: "" };
      const pending = line.orderedQty - (line.receivedQty ?? 0);
      if (input.receiveQty > 0) hasQty = true;
      if (input.receiveQty > pending) {
        toast.error(`${line.articleName}: Receive Qty cannot exceed Pending Qty (${pending})`);
        return false;
      }
    }
    if (!hasQty) {
      toast.error("Enter Receive Qty > 0 for at least one line.");
      return false;
    }
    return true;
  };

  const saveDraft = () => {
    const draft = {
      receiveDateTime,
      remarks,
      lineInputs,
    };
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DRAFT_KEY_PREFIX + orderId, JSON.stringify(draft));
    }
    toast.success("Draft saved.");
  };

  const confirmReceipt = () => {
    if (!po) return;
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const list = getStoredOrders() ?? MOCK_VENDOR_POS;
      const updatedLineItems: VendorPOLineItem[] = (po.lineItems ?? []).map((li) => {
        const input = lineInputs[li.id] ?? { receiveQty: 0, lineRemarks: "" };
        const prevReceived = li.receivedQty ?? 0;
        const newReceived = prevReceived + input.receiveQty;
        return { ...li, receivedQty: newReceived };
      });
      const newTotalReceived = updatedLineItems.reduce((s, li) => s + (li.receivedQty ?? 0), 0);
      const newStatus: VendorPOStatus =
        newTotalReceived >= po.totalQty ? "Fully Received" : "Partially Received";
      const updated: VendorPO = {
        ...po,
        lineItems: updatedLineItems,
        receivedQty: newTotalReceived,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      const next = list.map((o) => (o.id === orderId ? updated : o));
      setStoredOrders(next);

      const articlesReceived = pendingLines
        .map((line) => {
          const input = lineInputs[line.id] ?? { receiveQty: 0, lineRemarks: "" };
          if (input.receiveQty <= 0) return null;
          return {
            articleId: line.articleId,
            articleCode: line.articleCode,
            articleName: line.articleName,
            receivedQty: input.receiveQty,
            notes: input.lineRemarks || undefined,
          };
        })
        .filter(Boolean) as { articleId: string; articleCode: string; articleName: string; receivedQty: number; notes?: string }[];
      const totalReceivedThisBatch = articlesReceived.reduce((s, a) => s + a.receivedQty, 0);
      if (articlesReceived.length > 0) {
        addToCheckingQueue({
          poId: po.id,
          poNo: po.poNo,
          vendorName: po.vendorName,
          priority: po.priority,
          receiveDate: receiveDateTime || new Date().toISOString(),
          articles: articlesReceived,
          totalReceivedQty: totalReceivedThisBatch,
        });
      }

      if (typeof window !== "undefined") {
        sessionStorage.removeItem(DRAFT_KEY_PREFIX + orderId);
      }
      toast.success("Receipt confirmed and sent to Checking Queue.");
      router.push("/vendor-po/receive");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to confirm receipt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancel = () => {
    router.push("/vendor-po/receive");
  };

  if (!po) {
    return (
      <div className="main-content">
        <Seo title="Vendor PO Receive" />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-600 mb-4">PO not found.</p>
            <Link
              href="/vendor-po/receive"
              className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
            >
              <i className="ri-arrow-left-line me-2"></i>
              Back to Receiving
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title={`Receive - ${po.poNo}`} />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Header - same pattern as Purchase Order Received process */}
          <div className="box mb-6">
            <div className="box-header flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link
                  href="/vendor-po/receive"
                  className="text-gray-500 hover:text-gray-700"
                  title="Back to receiving"
                >
                  <i className="ri-arrow-left-line text-lg"></i>
                </Link>
                <h3 className="box-title text-base">
                  <i className="ri-file-text-line me-2"></i>
                  Receive Against PO
                </h3>
              </div>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label text-sm font-medium text-gray-600">PO No</label>
                  <div className="mt-1 text-sm font-medium text-gray-900">{po.poNo}</div>
                </div>
                <div>
                  <label className="form-label text-sm font-medium text-gray-600">Vendor</label>
                  <div className="mt-1 text-sm text-gray-900">{po.vendorName}</div>
                </div>
                <div>
                  <label className="form-label text-sm font-medium text-gray-600">Receive Date / Time</label>
                  <input
                    type="datetime-local"
                    className="form-control mt-1"
                    value={receiveDateTime}
                    onChange={(e) => setReceiveDateTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label text-sm font-medium text-gray-600">Received By</label>
                  <div className="mt-1 text-sm text-gray-900">{receivedBy}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label text-sm font-medium text-gray-600">Remarks</label>
                  <textarea
                    className="form-control mt-1"
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items grid - only pending lines */}
          <div className="box mb-6">
            <div className="box-header">
              <h3 className="box-title">Items (pending only)</h3>
            </div>
            <div className="box-body p-0">
              {pendingLines.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  No pending quantities to receive for this PO.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Article
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                          Ordered Qty
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                          Already Received
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                          Pending Qty
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">
                          Receive Qty <span className="text-danger">*</span>
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Line Remarks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {pendingLines.map((line) => {
                        const alreadyReceived = line.receivedQty ?? 0;
                        const pending = line.orderedQty - alreadyReceived;
                        const input = lineInputs[line.id] ?? { receiveQty: 0, lineRemarks: "" };
                        return (
                          <tr key={line.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                              {line.articleCode} – {line.articleName}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">
                              {line.orderedQty}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">
                              {alreadyReceived}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 text-right">
                              {pending}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <input
                                type="number"
                                min={0}
                                max={pending}
                                className="form-control form-control-sm text-right"
                                value={input.receiveQty || ""}
                                onChange={(e) =>
                                  setLineReceiveQty(
                                    line.id,
                                    e.target.value === "" ? 0 : Math.min(pending, Number(e.target.value))
                                  )
                                }
                              />
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Optional"
                                value={input.lineRemarks}
                                onChange={(e) => setLineRemarks(line.id, e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Buttons - vendor button style */}
          <div className="box">
            <div className="box-body flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSubmitting}
                className="ti-btn ti-btn-primary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={confirmReceipt}
                disabled={isSubmitting || pendingLines.length === 0}
                className="ti-btn ti-btn-success inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Confirming…" : "Confirm Receipt & Send to Checking"}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={isSubmitting}
                className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPOReceiveProcessPage;
