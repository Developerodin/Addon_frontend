"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseClients,
  type CreateWarehouseClientBody,
  type UpdateWarehouseClientBody,
} from "@/shared/services/whmsWarehouseClientService";
import WarehouseClientForm from "../components/WarehouseClientForm";

export default function AddWarehouseClientPage() {
  const router = useRouter();
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasPermission = hasSubPermission("/warehouse-management", "Clients");

  if (!hasPermission) {
    return (
      <div className="main-content !p-[10px]">
        <div className="bg-white shadow-sm border border-gray-100 rounded p-6 text-center max-w-md mx-auto mt-8">
          <i className="ri-lock-line text-4xl text-gray-300 mb-3" />
          <h3 className="text-sm font-bold text-gray-800 mb-2">Access Restricted</h3>
          <Link
            href="/warehouse-management/clients"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 shadow-sm"
          >
            <i className="ri-arrow-left-line text-xs" /> Back
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (body: CreateWarehouseClientBody | UpdateWarehouseClientBody) => {
    setIsSubmitting(true);
    try {
      await whmsWarehouseClients.create(body as CreateWarehouseClientBody);
      toast.success("Client created");
      router.push("/warehouse-management/clients");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Add Warehouse Client" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-800">Add warehouse client</h1>
          </div>
          <Link
            href="/warehouse-management/clients"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm"
          >
            <i className="ri-arrow-left-line text-xs" /> Back to list
          </Link>
        </div>
        <div className="p-[10px] sm:p-4">
          <p className="text-[11px] text-gray-500 mb-4">
            <span className="text-red-500">*</span> Type is required. For <strong className="font-bold text-gray-700">Store</strong>, only
            store profile fields are shown and saved (no retailer / distributor / contact block).
          </p>
          <WarehouseClientForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={() => router.push("/warehouse-management/clients")}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
