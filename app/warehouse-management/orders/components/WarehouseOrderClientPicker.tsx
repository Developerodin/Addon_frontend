"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  whmsWarehouseClients,
  type WarehouseClient,
  type WarehouseClientType,
} from "@/shared/services/whmsWarehouseClientService";

const labelClass = "block text-[11px] font-bold text-[#495057] mb-1";
const inputClass =
  "w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-[11px] font-medium text-gray-800 focus:ring-0 focus:border-purple-300 placeholder:text-gray-400";
const selectClass = `${inputClass} appearance-none cursor-pointer pr-8`;

type Props = {
  clientType: WarehouseClientType;
  onClientTypeChange: (t: WarehouseClientType) => void;
  clientId: string;
  onClientIdChange: (id: string, client?: WarehouseClient | null) => void;
  disabled?: boolean;
  /** When editing, show this if the client API record is not loaded yet. */
  clientNameFallback?: string;
};

/** Display name only (no id) — same clients as /warehouse-management/clients. */
export function warehouseClientDisplayName(c: WarehouseClient | null | undefined): string {
  if (!c) return "";
  // Store rows persist names/codes under storeProfile; root retailer/distributor are often empty.
  if (c.type === "Store") {
    const sp = c.storeProfile;
    const bill = sp?.billCode?.trim();
    if (bill) return bill;
    const sap = sp?.sapCode?.trim();
    if (sap) return sap;
    const retek = sp?.retekCode?.trim();
    if (retek) return retek;
    const b = sp?.brand?.trim();
    const sub = sp?.brandSub?.trim();
    if (b && sub) return `${b} / ${sub}`;
    if (b) return b;
    if (sub) return sub;
    const city = sp?.city?.trim();
    if (city) return city;
  }
  const name =
    c.retailerName?.trim() ||
    c.parentKeyCode?.trim() ||
    "";
  return name || "—";
}

/**
 * Searchable client picker backed by WHMS warehouse-clients (same data as /warehouse-management/clients).
 */
export default function WarehouseOrderClientPicker({
  clientType,
  onClientTypeChange,
  clientId,
  onClientIdChange,
  disabled,
  clientNameFallback,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<WarehouseClient[]>([]);
  const [resolved, setResolved] = useState<WarehouseClient | null>(null);

  useEffect(() => {
    if (!clientId) {
      setResolved(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const c = await whmsWarehouseClients.get(clientId);
        if (!cancelled) setResolved(c);
      } catch {
        if (!cancelled) setResolved(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (disabled) return;
    const t = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const res = await whmsWarehouseClients.listByType(clientType, {
            search: search.trim() || undefined,
            page: 1,
            limit: 80,
            sortBy: "createdAt:desc",
          });
          setOptions(res.results || []);
        } catch {
          setOptions([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [clientType, search, disabled]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="grid grid-cols-12 gap-3">
      <input type="hidden" name="_warehouseClientId" value={clientId} required={!disabled} />

      <div className="col-span-12 sm:col-span-4">
        <label className={labelClass}>
          Client type <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            className={selectClass}
            value={clientType}
            onChange={(e) => {
              onClientTypeChange(e.target.value as WarehouseClientType);
              onClientIdChange("", null);
              setSearch("");
              setResolved(null);
            }}
            required
            disabled={disabled}
            title={disabled ? "Cannot change after create" : undefined}
          >
            <option value="Store">Store</option>
            <option value="Trade">Trade</option>
            <option value="Departmental">Departmental</option>
            <option value="Ecom">Ecom</option>
          </select>
          <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
        </div>
      </div>

      <div className="col-span-12 sm:col-span-8 relative" ref={wrapRef}>
        <div className="flex items-end justify-between gap-2 mb-1">
          <label className={labelClass + " mb-0"}>
            Client name <span className="text-red-500">*</span>
          </label>
          <Link
            href="/warehouse-management/clients"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-purple-600 hover:text-purple-800 whitespace-nowrap"
          >
            Open clients list <i className="ri-external-link-line text-xs" />
          </Link>
        </div>
        {disabled ? (
          <input
            className={inputClass}
            value={
              resolved
                ? warehouseClientDisplayName(resolved)
                : clientNameFallback?.trim() || "—"
            }
            readOnly
            title="Client cannot be changed"
          />
        ) : (
          <>
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs z-[1]" />
              <input
                className={`${inputClass} pl-8`}
                placeholder="Search name or city, then pick a client"
                value={open ? search : resolved ? warehouseClientDisplayName(resolved) : search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpen(true);
                  if (clientId) onClientIdChange("", null);
                }}
                onFocus={() => {
                  setOpen(true);
                  if (resolved) setSearch("");
                }}
                autoComplete="off"
              />
              {loading && (
                <i className="ri-loader-4-line animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              )}
            </div>
            {open && options.length > 0 && (
              <ul className="absolute z-20 mt-0.5 w-full max-h-52 overflow-auto bg-white border border-gray-200 rounded shadow-lg text-[11px]">
                {options.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-purple-50 text-gray-800 font-medium border-b border-gray-50 last:border-0"
                      onClick={() => {
                        onClientIdChange(c.id, c);
                        setResolved(c);
                        setSearch("");
                        setOpen(false);
                      }}
                    >
                      {warehouseClientDisplayName(c)}
                      {c.city ? (
                        <span className="block text-[10px] text-gray-500 font-normal">{c.city}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
