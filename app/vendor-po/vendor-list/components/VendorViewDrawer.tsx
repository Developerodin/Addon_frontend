"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Vendor, VendorContactPerson } from "../types";
import { getVendor } from "@/shared/services/vendorManagementService";
import { mapVendorDocToVendor } from "../vendorMappers";
import { enrichCatalogPicks, mapDocProductsToCatalogPicks } from "../vendorFormUtils";
import type { CatalogProductPick } from "./CatalogProductPickerDrawer";
import { CRM } from "../crmUiClasses";

interface VendorViewDrawerProps {
  vendor: Vendor | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (vendor: Vendor) => void;
}

/** Two-column bordered sheet (compact, spreadsheet-like). */
function DetailSheet({
  rows,
}: {
  rows: { label: string; value: React.ReactNode }[];
}) {
  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className={`${CRM.table} text-[11px]`}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={CRM.tbodyTr}>
              <td
                className={`${CRM.td} w-[38%] max-w-[140px] bg-gray-50/90 font-bold text-[#495057] align-top`}
              >
                {r.label}
              </td>
              <td className={`${CRM.td} text-[#323251] align-top`}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const VendorViewDrawer: React.FC<VendorViewDrawerProps> = ({ vendor, open, onClose, onEdit }) => {
  const [detail, setDetail] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<CatalogProductPick[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !vendor) {
      setDetail(null);
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDetail(vendor);
    setProducts([]);
    (async () => {
      try {
        const doc = await getVendor(vendor.id, { populate: "products" });
        if (cancelled) return;
        setDetail(mapVendorDocToVendor(doc));
        const picks = mapDocProductsToCatalogPicks(doc);
        setProducts(await enrichCatalogPicks(picks));
      } catch {
        if (!cancelled) {
          setDetail(vendor);
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, vendor?.id]);

  if (!open || !vendor) return null;

  const d = detail ?? vendor;

  const contacts: VendorContactPerson[] =
    d.contactPersons && d.contactPersons.length > 0
      ? d.contactPersons
      : d.contactPerson || d.phone
        ? [{ contactName: d.contactPerson, phone: d.phone, email: d.email }]
        : [];

  const headerRows: { label: string; value: React.ReactNode }[] = [
    { label: "Vendor code", value: <span className="font-mono">{d.vendorCode}</span> },
    { label: "Vendor name", value: d.vendorName },
    {
      label: "Status",
      value: (
        <span className={d.status === "active" ? CRM.badgeActive : CRM.badgeInactive}>
          {d.status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
    ...(d.gstin ? [{ label: "GSTIN", value: <span className="font-mono">{d.gstin}</span> }] : []),
    ...(d.city ? [{ label: "City", value: d.city }] : []),
    ...(d.state ? [{ label: "State", value: d.state }] : []),
    ...(d.notes
      ? [{ label: "Notes", value: <span className="whitespace-pre-wrap">{d.notes}</span> }]
      : []),
    ...(d.address ? [{ label: "Address", value: d.address }] : []),
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} aria-hidden="true" />
      <div
        className={CRM.drawerPanelWide}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-view-drawer-title"
      >
        <div className={CRM.drawerHeader}>
          <div className="min-w-0">
            <h2 id="vendor-view-drawer-title" className={CRM.drawerTitle}>
              Vendor details
            </h2>
            <p className="text-[11px] text-[#7987A1] mt-0.5 truncate">
              <span className="font-mono">{d.vendorCode}</span>
              {d.vendorName ? ` · ${d.vendorName}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button type="button" className={CRM.btnPrimary} onClick={() => onEdit(d)}>
                <i className="ri-edit-line text-xs" />
                <span>Edit</span>
              </button>
            )}
            <button type="button" className={CRM.btnSecondary} onClick={onClose} aria-label="Close">
              <i className="ri-close-line text-xs" />
              <span>Close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-[10px] space-y-4 bg-gray-50/50">
          {loading && (
            <div className="flex items-center gap-2 text-[11px] text-[#7987A1]">
              <div className="h-3.5 w-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading catalog items…</span>
            </div>
          )}

          <section>
            <h3 className="text-[11px] font-bold text-[#495057] uppercase tracking-wide mb-2">
              Summary
            </h3>
            <DetailSheet rows={headerRows} />
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-[#495057] uppercase tracking-wide mb-2">
              Contacts
            </h3>
            {contacts.length === 0 ? (
              <p className="text-[11px] text-[#7987A1] py-2">No contacts.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-gray-200">
                <table className={`${CRM.table} text-[11px]`}>
                  <thead>
                    <tr className={CRM.theadTr}>
                      <th className={`${CRM.th} w-10`}>#</th>
                      <th className={CRM.th}>Name</th>
                      <th className={CRM.th}>Phone</th>
                      <th className={CRM.th}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c, i) => (
                      <tr key={`${c.phone}-${i}`} className={CRM.tbodyTr}>
                        <td className={`${CRM.td} ${CRM.tdMuted} text-center font-mono`}>{i + 1}</td>
                        <td className={CRM.td}>{c.contactName || "—"}</td>
                        <td className={`${CRM.td} ${CRM.tdMuted} font-mono`}>{c.phone || "—"}</td>
                        <td className={`${CRM.td} ${CRM.tdMuted}`}>{c.email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <h3 className="text-[11px] font-bold text-[#495057] uppercase tracking-wide">
                Catalog items
              </h3>
              <Link
                href="/catalog/items"
                target="_blank"
                rel="noopener noreferrer"
                className={`${CRM.linkAccent} text-[11px] font-medium`}
              >
                Open catalog → Items
              </Link>
            </div>
            {products.length === 0 && !loading ? (
              <p className="text-[11px] text-[#7987A1] py-2">No catalog products linked.</p>
            ) : products.length > 0 ? (
              <div className="overflow-x-auto rounded border border-gray-200">
                <table className={`${CRM.table} text-[11px]`}>
                  <thead>
                    <tr className={CRM.theadTr}>
                      <th className={`${CRM.th} w-10`}>#</th>
                      <th className={CRM.th}>Name</th>
                      <th className={CRM.th}>Factory code</th>
                      <th className={CRM.th}>Vendor code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={p.id} className={CRM.tbodyTr}>
                        <td className={`${CRM.td} ${CRM.tdMuted} text-center font-mono`}>{i + 1}</td>
                        <td className={`${CRM.td} font-medium`}>{p.name}</td>
                        <td className={`${CRM.td} ${CRM.tdMuted} font-mono`}>{p.factoryCode ?? "—"}</td>
                        <td className={`${CRM.td} ${CRM.tdMuted} font-mono`}>{p.vendorCode ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </div>

        <div className={CRM.drawerFooter}>
          {onEdit && (
            <button type="button" className={CRM.btnPrimary} onClick={() => onEdit(d)}>
              <i className="ri-edit-line text-xs" />
              <span>Edit vendor</span>
            </button>
          )}
          <button type="button" className={CRM.btnSecondary} onClick={onClose}>
            <span>Close</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default VendorViewDrawer;
