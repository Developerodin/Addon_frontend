"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseOrders,
  type CreateWarehouseOrderBody,
  type UpdateWarehouseOrderBody,
} from "@/shared/services/whmsWarehouseOrderService";
import WarehouseOrderForm from "../components/WarehouseOrderForm";

export default function AddWarehouseOrderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (body: CreateWarehouseOrderBody | UpdateWarehouseOrderBody) => {
    setSubmitting(true);
    try {
      await whmsWarehouseOrders.create(body as CreateWarehouseOrderBody);
      toast.success("Order created");
      router.push("/warehouse-management/orders");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Add Warehouse Order" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-800">Add warehouse order</h1>
          </div>
          <Link
            href="/warehouse-management/orders"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm"
          >
            <i className="ri-arrow-left-line text-xs" /> Back to list
          </Link>
        </div>
        <div className="p-[10px] sm:p-4">
          <WarehouseOrderForm
            mode="create"
            onSubmit={onSubmit}
            onCancel={() => router.push("/warehouse-management/orders")}
            isSubmitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}

