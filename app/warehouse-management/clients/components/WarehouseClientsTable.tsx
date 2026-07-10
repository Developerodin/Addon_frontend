"use client";

import React from "react";
import Link from "next/link";
import type { WarehouseClient, WarehouseClientType } from "@/shared/services/whmsWarehouseClientService";
import {
  getIncompleteTradeFields,
  isWebAutoCreatedClient,
} from "./tradeClientCompleteness";

const th = "px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";
const thFirst = "pl-[10px] pr-1 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";
const thLast =
  "px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";
const td = "px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200";
const tdBold = "pl-[10px] pr-1 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200";

function brandLabel(sp: WarehouseClient["storeProfile"]): string {
  if (!sp) return "—";
  const b = sp.brand?.trim();
  const sub = sp.brandSub?.trim();
  if (b && sub) return `${b} / ${sub}`;
  if (b) return b;
  if (sub) return sub;
  return "—";
}

function openingLabel(sp: WarehouseClient["storeProfile"]): string {
  const raw = sp?.openingDate;
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleDateString();
  } catch {
    return "—";
  }
}

function smDisplay(sp: WarehouseClient["storeProfile"]): string {
  if (!sp) return "—";
  const name = sp.smName?.trim();
  const contact = sp.smContact?.trim();
  if (name && contact) return `${name} / ${contact}`;
  if (name) return name;
  if (contact) return contact;
  return sp.smNameAndContact?.trim() || "—";
}

type Props = {
  activeTypeTab: WarehouseClientType;
  rows: WarehouseClient[];
  isDeleting: boolean;
  deleteId: string | null;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
};

/**
 * Store rows only persist `storeProfile` (+ status); other tabs use root retailer/contact fields.
 */
export default function WarehouseClientsTable({
  activeTypeTab,
  rows,
  isDeleting,
  deleteId,
  onDelete,
  onView,
}: Props) {
  const actions = (c: WarehouseClient) => (
    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={() => onView(c.id)}
        className="w-7 h-7 flex items-center justify-center bg-sky-50 text-sky-500 border border-sky-100 rounded hover:bg-sky-100 transition-colors"
        title="View"
      >
        <i className="ri-eye-line text-xs" />
      </button>
      <Link
        href={`/warehouse-management/clients/edit/${c.id}`}
        className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
        title="Edit"
      >
        <i className="ri-pencil-line text-xs" />
      </Link>
      <button
        type="button"
        onClick={() => onDelete(c.id)}
        className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors"
        title="Delete"
        disabled={isDeleting && deleteId === c.id}
      >
        {isDeleting && deleteId === c.id ? (
          <i className="ri-loader-4-line text-xs animate-spin" />
        ) : (
          <i className="ri-delete-bin-line text-xs" />
        )}
      </button>
    </div>
  );

  const statusCell = (c: WarehouseClient) => (
    <span
      className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${
        c.status === "active" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {c.status || "—"}
    </span>
  );

  if (activeTypeTab === "Store") {
    return (
      <table className="w-full border-collapse border border-gray-200 min-w-[1080px]">
        <thead>
          <tr className="bg-gray-50/30">
            <th className={thFirst}>Bill code</th>
            <th className={th}>SAP code</th>
            <th className={th}>Retek code</th>
            <th className={th}>Class.</th>
            <th className={th}>Brand</th>
            <th className={th}>City</th>
            <th className={th}>Pincode</th>
            <th className={th}>State</th>
            <th className={th}>SM</th>
            <th className={th}>Store email</th>
            <th className={th}>Opening</th>
            <th className={th}>Status</th>
            <th className={thLast}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const sp = c.storeProfile;
            return (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className={tdBold}>{sp?.billCode?.trim() || "—"}</td>
                <td className={td}>{sp?.sapCode?.trim() || "—"}</td>
                <td className={td}>{sp?.retekCode?.trim() || "—"}</td>
                <td className={td}>{sp?.classification?.trim() || "—"}</td>
                <td className={td}>{brandLabel(sp)}</td>
                <td className={td}>{sp?.city?.trim() || "—"}</td>
                <td className={td}>{sp?.pincode?.trim() || "—"}</td>
                <td className={td}>{sp?.state?.trim() || "—"}</td>
                <td className={td}>{smDisplay(sp)}</td>
                <td className={`${td} max-w-[140px] truncate`} title={sp?.storeMailId ?? ""}>
                  {sp?.storeMailId?.trim() || "—"}
                </td>
                <td className={td}>{openingLabel(sp)}</td>
                <td className={`${td} border border-gray-200`}>{statusCell(c)}</td>
                <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">{actions(c)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <table className="w-full border-collapse border border-gray-200">
      <thead>
        <tr className="bg-gray-50/30">
          <th className={thFirst}>Party name</th>
          <th className={th}>SAP code</th>
          <th className={th}>City</th>
          <th className={th}>Pincode</th>
          <th className={th}>State</th>
          <th className={th}>Contact</th>
          <th className={th}>Contact number</th>
          <th className={th}>Status</th>
          <th className={thLast}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => {
          const incomplete = getIncompleteTradeFields(c);
          const fromWeb = isWebAutoCreatedClient(c);
          return (
          <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
            <td className={tdBold}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span>{c.retailerName?.trim() || "—"}</span>
                {fromWeb && (
                  <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-sky-100 text-sky-800 uppercase tracking-tight">
                    Web
                  </span>
                )}
                {incomplete.length > 0 && (
                  <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 uppercase tracking-tight">
                    Incomplete
                  </span>
                )}
              </div>
            </td>
            <td className={td}>{c.parentKeyCode?.trim() || "—"}</td>
            <td className={td}>{c.city?.trim() || "—"}</td>
            <td className={td}>{c.zipCode?.trim() || "—"}</td>
            <td className={td}>{c.state?.trim() || "—"}</td>
            <td className={td}>{c.contactPerson?.trim() || "—"}</td>
            <td className={td}>{c.mobilePhone?.trim() || "—"}</td>
            <td className={`${td} border border-gray-200`}>{statusCell(c)}</td>
            <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">{actions(c)}</td>
          </tr>
        );
        })}
      </tbody>
    </table>
  );
}
