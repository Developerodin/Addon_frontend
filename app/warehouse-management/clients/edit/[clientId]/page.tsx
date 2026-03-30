"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import {
  whmsWarehouseClients,
  type CreateWarehouseClientBody,
  type UpdateWarehouseClientBody,
  type WarehouseClient,
} from "@/shared/services/whmsWarehouseClientService";
import WarehouseClientForm from "../../components/WarehouseClientForm";

export default function EditWarehouseClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = (params?.clientId as string) || "";
  const { hasSubPermission } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [client, setClient] = useState<WarehouseClient | null>(null);
  const hasPermission = hasSubPermission("/warehouse-management", "Clients");

  useEffect(() => {
    if (!clientId || !hasPermission) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await whmsWarehouseClients.get(clientId);
        if (!cancelled) setClient(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load client");
        router.push("/warehouse-management/clients");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, hasPermission, router]);

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

  if (isLoading) {
    return (
      <div className="main-content !p-[10px] flex flex-col items-center justify-center min-h-[40vh]">
        <i className="ri-loader-4-line animate-spin text-3xl text-purple-500 mb-3" />
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Loading</p>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  const handleSubmit = async (body: CreateWarehouseClientBody | UpdateWarehouseClientBody) => {
    setIsSubmitting(true);
    try {
      await whmsWarehouseClients.update(clientId, body as UpdateWarehouseClientBody);
      toast.success("Client updated");
      router.push("/warehouse-management/clients");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title={`Edit client: ${client.retailerName || client.id}`} />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-800">Edit warehouse client</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/warehouse-management/clients?view=${encodeURIComponent(clientId)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 border border-sky-100 text-[11px] font-bold rounded hover:bg-sky-100 shadow-sm"
            >
              <i className="ri-eye-line text-xs" /> View
            </Link>
            <Link
              href="/warehouse-management/clients"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm"
            >
              <i className="ri-arrow-left-line text-xs" /> Back to list
            </Link>
          </div>
        </div>
        <div className="p-[10px] sm:p-4">
          <WarehouseClientForm
            mode="edit"
            initialClient={client}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/warehouse-management/clients")}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
