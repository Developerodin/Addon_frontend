'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { whmsWarehouseClients, type WarehouseClient } from '@/shared/services/whmsWarehouseClientService';

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`border border-gray-200 rounded px-3 py-2 bg-white ${
        wide ? 'col-span-12' : 'col-span-12 sm:col-span-6'
      }`}
    >
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-[12px] font-medium text-gray-800 break-words">{value ?? '—'}</div>
    </div>
  );
}

type Props = {
  clientId: string | null;
  open: boolean;
  onClose: () => void;
};

/**
 * Side drawer: full client GET. Store type emphasizes `storeProfile`; other types show root fields.
 */
export default function WarehouseClientDetailDrawer({ clientId, open, onClose }: Props) {
  const [client, setClient] = useState<WarehouseClient | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !clientId) {
      setClient(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await whmsWarehouseClients.get(clientId);
        if (!cancelled) setClient(data);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Failed to load client');
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const sp = client?.storeProfile;
  const isStore = client?.type === 'Store';
  const title =
    isStore && sp?.billCode?.trim()
      ? sp.billCode.trim()
      : isStore && sp?.sapCode?.trim()
        ? sp.sapCode.trim()
        : client?.retailerName?.trim() || client?.parentKeyCode?.trim() || 'Client';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-xl z-50 flex flex-col border-l border-gray-200">
        <div className="flex justify-between items-start gap-2 p-[10px] border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-800 truncate">Client details</h3>
            <p className="text-[11px] font-medium text-gray-600 truncate mt-0.5">{title}</p>
            {client && (
              <span
                className={`inline-flex mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {client.status || '—'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {clientId && (
              <Link
                href={`/warehouse-management/clients/edit/${clientId}`}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700"
                onClick={onClose}
              >
                <i className="ri-pencil-line text-xs" /> Edit
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100"
              aria-label="Close"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-[10px] text-[11px]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <i className="ri-loader-4-line animate-spin text-2xl mb-2" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Loading</span>
            </div>
          )}
          {!loading && client && isStore && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
                <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Store profile</h4>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <Field label="Bill code" value={sp?.billCode} />
                <Field label="SAP code" value={sp?.sapCode} />
                <Field label="Retek code" value={sp?.retekCode} />
                <Field label="Classification" value={sp?.classification} />
                <Field label="Brand" value={sp?.brand} />
                <Field label="Brand sub" value={sp?.brandSub} />
                <Field label="City" value={sp?.city} />
                <Field label="State" value={sp?.state} />
                <Field
                  label="Opening date"
                  value={sp?.openingDate ? new Date(sp.openingDate).toLocaleString() : '—'}
                />
                <Field label="GST" value={sp?.gst} />
                <Field label="Store landline" value={sp?.storeLandlineNo} />
                <Field label="SM name & contact" value={sp?.smNameAndContact} />
                <Field label="Store mail" value={sp?.storeMailId} />
                <Field label="ABM name & contact" value={sp?.abmNameAndContact} />
                <Field label="ABM mail" value={sp?.abmMailId} />
                <Field label="Address" value={sp?.address?.trim() || '—'} wide />
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <Field label="Type" value={client.type} />
                <Field label="Remarks" value={client.remarks?.trim() || '—'} wide />
                <div className="text-[10px] text-gray-400 font-medium px-1">
                  {client.createdAt && (
                    <span className="me-3">Created {new Date(client.createdAt).toLocaleString()}</span>
                  )}
                  {client.updatedAt && <span>Updated {new Date(client.updatedAt).toLocaleString()}</span>}
                </div>
              </div>
            </div>
          )}

          {!loading && client && !isStore && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
                <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">General</h4>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <Field label="Type" value={client.type} />
                <Field label="Sl. no." value={client.slNo ?? '—'} />
                <Field label="Retailer" value={client.retailerName} />
                <Field label="Distributor" value={client.distributorName} />
                <Field label="Parent key code" value={client.parentKeyCode} />
                <Field label="Outlet" value={client.outlet} />
                <Field label="Contact" value={client.contactPerson} />
                <Field label="Mobile" value={client.mobilePhone} />
                <Field label="Phone" value={client.phone1} />
                <Field label="Email" value={client.email} />
                <Field label="GSTIN" value={client.gstin} />
                <Field label="Locality" value={client.locality} />
                <Field label="City" value={client.city} />
                <Field label="ZIP" value={client.zipCode} />
                <Field label="State" value={client.state} />
                <Field label="RSM" value={client.rsm} />
                <Field label="ASM" value={client.asm} />
                <Field label="SE" value={client.se} />
                <Field label="DSO" value={client.dso} />
                <Field label="Address" value={client.address?.trim() || '—'} wide />
                <Field label="Remarks" value={client.remarks?.trim() || '—'} wide />
              </div>
              {sp && Object.keys(sp).length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="w-[3px] h-4 bg-purple-600 rounded-full" />
                    <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Store profile</h4>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <Field label="Bill code" value={sp.billCode} />
                    <Field label="SAP code" value={sp.sapCode} />
                    <Field label="Retek code" value={sp.retekCode} />
                    <Field label="Classification" value={sp.classification} />
                    <Field label="City" value={sp.city} />
                    <Field label="State" value={sp.state} />
                    <Field label="Brand" value={sp.brand} />
                    <Field label="Brand sub" value={sp.brandSub} />
                    <Field
                      label="Opening date"
                      value={sp.openingDate ? new Date(sp.openingDate).toLocaleString() : '—'}
                    />
                    <Field label="GST" value={sp.gst} />
                    <Field label="Store landline" value={sp.storeLandlineNo} />
                    <Field label="SM name & contact" value={sp.smNameAndContact} />
                    <Field label="Store mail" value={sp.storeMailId} />
                    <Field label="ABM name & contact" value={sp.abmNameAndContact} />
                    <Field label="ABM mail" value={sp.abmMailId} />
                    <Field label="Address" value={sp.address?.trim() || '—'} wide />
                  </div>
                </>
              )}
              <div className="text-[10px] text-gray-400 font-medium pt-2 border-t border-gray-100">
                {client.createdAt && (
                  <span className="me-3">Created {new Date(client.createdAt).toLocaleString()}</span>
                )}
                {client.updatedAt && <span>Updated {new Date(client.updatedAt).toLocaleString()}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
