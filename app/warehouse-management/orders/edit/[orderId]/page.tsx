"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  type CreateWarehouseOrderBody,
  type UpdateWarehouseOrderBody,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";
import WarehouseOrderForm from "../../components/WarehouseOrderForm";
import WebsiteSyncPanel from "../../components/WebsiteSyncPanel";

function isWebsiteOrder(order: WarehouseOrder): boolean {
  const meta = (order.meta || {}) as Record<string, unknown>;
  if (meta.source === "addonweb") return true;
  return /^WEB-\d+$/i.test(String(order.addonOrderId || "").trim());
}

export default function EditWarehouseOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = (params?.orderId as string) || "";
  const [order, setOrder] = useState<WarehouseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await whmsWarehouseOrders.get(orderId);
        if (!cancelled) setOrder(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load order");
        router.push("/warehouse-management/orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, router]);

  const onSubmit = async (body: CreateWarehouseOrderBody | UpdateWarehouseOrderBody) => {
    setSubmitting(true);
    try {
      const updated = await whmsWarehouseOrders.update(orderId, body as UpdateWarehouseOrderBody);
      const syncErr = String(
        ((updated.meta || {}) as Record<string, unknown>).lastWebsitePushError || "",
      ).trim();
      if (isWebsiteOrder(updated) && syncErr) {
        toast.error(`Order saved but website sync failed: ${syncErr}`);
      } else if (isWebsiteOrder(updated) && body.status === "cancelled") {
        toast.success("Order cancelled and website notified");
      } else {
        toast.success("Order updated");
      }
      setOrder(updated);
      if (!syncErr) router.push("/warehouse-management/orders");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content !p-[10px] flex flex-col items-center justify-center min-h-[40vh]">
        <i className="ri-loader-4-line animate-spin text-3xl text-purple-500 mb-3" />
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Loading</p>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title={`Edit warehouse order: ${order.orderNumber || order.id}`} />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-800">Edit warehouse order</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/warehouse-management/orders"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm"
            >
              <i className="ri-arrow-left-line text-xs" /> Back to list
            </Link>
          </div>
        </div>
        <div className="p-[10px] sm:p-4">
          {isWebsiteOrder(order) && (
            <div className="mb-4">
              <WebsiteSyncPanel order={order} onSynced={() => void whmsWarehouseOrders.get(orderId).then(setOrder)} />
            </div>
          )}
          <WarehouseOrderForm
            mode="edit"
            initialOrder={order}
            onSubmit={onSubmit}
            onCancel={() => router.push("/warehouse-management/orders")}
            isSubmitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}

