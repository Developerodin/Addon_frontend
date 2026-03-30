"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import { whmsWarehouseClients, type WarehouseClient } from "@/shared/services/whmsWarehouseClientService";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="col-span-12 sm:col-span-6 border border-gray-200 rounded px-3 py-2 bg-white">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-[12px] font-medium text-gray-800 break-words">{value ?? "—"}</div>
    </div>
  );
}

export default function ViewWarehouseClientPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = (params?.clientId as string) || "";
  const { hasSubPermission } = useNavigation();
  const [client, setClient] = useState<WarehouseClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  if (!client) return null;

  const sp = client.storeProfile;

  return (
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title={`Client: ${client.retailerName || client.id}`} />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-[10px] border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-800">Client details</h1>
            <span
              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                client.status === "active" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
              }`}
            >
              {client.status || "—"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/warehouse-management/clients/edit/${clientId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 shadow-sm"
            >
              <i className="ri-pencil-line text-xs" /> Edit
            </Link>
            <Link
              href="/warehouse-management/clients"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 shadow-sm"
            >
              <i className="ri-arrow-left-line text-xs" /> List
            </Link>
          </div>
        </div>

        <div className="p-[10px] sm:p-4 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
              <h2 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">General</h2>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <Row label="Type" value={client.type} />
              <Row label="Sl. no." value={client.slNo ?? "—"} />
              <Row label="Retailer" value={client.retailerName} />
              <Row label="Distributor" value={client.distributorName} />
              <Row label="Parent key code" value={client.parentKeyCode} />
              <Row label="Outlet" value={client.outlet} />
              <Row label="Contact" value={client.contactPerson} />
              <Row label="Mobile" value={client.mobilePhone} />
              <Row label="Phone" value={client.phone1} />
              <Row label="Email" value={client.email} />
              <Row label="GSTIN" value={client.gstin} />
              <Row label="Locality" value={client.locality} />
              <Row label="City" value={client.city} />
              <Row label="ZIP" value={client.zipCode} />
              <Row label="State" value={client.state} />
              <Row label="RSM" value={client.rsm} />
              <Row label="ASM" value={client.asm} />
              <Row label="SE" value={client.se} />
              <Row label="DSO" value={client.dso} />
              <div className="col-span-12 border border-gray-200 rounded px-3 py-2 bg-white">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Address</div>
                <div className="text-[12px] font-medium text-gray-800 whitespace-pre-wrap">{client.address?.trim() || "—"}</div>
              </div>
              <div className="col-span-12 border border-gray-200 rounded px-3 py-2 bg-white">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Remarks</div>
                <div className="text-[12px] font-medium text-gray-800 whitespace-pre-wrap">{client.remarks?.trim() || "—"}</div>
              </div>
            </div>
          </div>

          {client.type === "Store" && sp && Object.keys(sp).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
                <h2 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Store profile</h2>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <Row label="Bill code" value={sp.billCode} />
                <Row label="SAP code" value={sp.sapCode} />
                <Row label="Retek code" value={sp.retekCode} />
                <Row label="Classification" value={sp.classification} />
                <Row label="City" value={sp.city} />
                <Row label="State" value={sp.state} />
                <Row label="Brand" value={sp.brand} />
                <Row label="Brand sub" value={sp.brandSub} />
                <Row label="Opening date" value={sp.openingDate ? new Date(sp.openingDate).toLocaleDateString() : "—"} />
                <Row label="GST" value={sp.gst} />
                <Row label="Store landline" value={sp.storeLandlineNo} />
                <Row label="SM name & contact" value={sp.smNameAndContact} />
                <Row label="Store mail" value={sp.storeMailId} />
                <div className="col-span-12 border border-gray-200 rounded px-3 py-2 bg-white">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Address</div>
                  <div className="text-[12px] font-medium text-gray-800 whitespace-pre-wrap">{sp.address?.trim() || "—"}</div>
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-gray-400 font-medium">
            {client.createdAt && (
              <span className="me-4">Created {new Date(client.createdAt).toLocaleString()}</span>
            )}
            {client.updatedAt && <span>Updated {new Date(client.updatedAt).toLocaleString()}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
