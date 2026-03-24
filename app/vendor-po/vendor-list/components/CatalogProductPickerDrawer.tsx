"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { listProducts, type ProductListItem } from "@/shared/services/productService";
import { CRM } from "../crmUiClasses";

export type CatalogProductPick = {
  id: string;
  name: string;
  factoryCode?: string;
  vendorCode?: string;
};

interface CatalogProductPickerDrawerProps {
  open: boolean;
  onClose: () => void;
  value: CatalogProductPick[];
  onApply: (next: CatalogProductPick[]) => void;
}

const PAGE_SIZE = 10;

function categoryLabel(c: ProductListItem["category"]): string {
  if (c == null || c === "") return "—";
  if (typeof c === "object" && c !== null && "name" in c) return String((c as { name?: string }).name ?? "—");
  return String(c);
}

const CatalogProductPickerDrawer: React.FC<CatalogProductPickerDrawerProps> = ({
  open,
  onClose,
  value,
  onApply,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [pickMap, setPickMap] = useState<Map<string, CatalogProductPick>>(new Map());
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const m = new Map<string, CatalogProductPick>();
      value.forEach((v) => m.set(v.id, { ...v }));
      setPickMap(m);
      setSearchInput("");
      setDebouncedSearch("");
      setPage(1);
    }
    wasOpenRef.current = open;
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listProducts({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined })
      .then((res) => {
        if (cancelled) return;
        setRows(res.results ?? []);
        setTotalPages(Math.max(1, res.totalPages));
        setTotalResults(res.totalResults);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Failed to load products");
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, page, debouncedSearch]);

  const toggleRow = (p: ProductListItem) => {
    if (!p.id) return;
    setPickMap((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.set(p.id, {
          id: p.id,
          name: p.name ?? "",
          factoryCode: p.factoryCode,
          vendorCode: p.vendorCode,
        });
      }
      return next;
    });
  };

  const handleApply = () => {
    onApply(Array.from(pickMap.values()));
    onClose();
  };

  const selectedCount = pickMap.size;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} aria-hidden="true" />
      <div
        className={CRM.drawerPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-picker-title"
      >
        <div className={CRM.drawerHeader}>
          <div>
            <h2 id="catalog-picker-title" className={CRM.drawerTitle}>
              Add products from catalog
            </h2>
            <p className="text-[11px] text-[#7987A1] mt-1">
              Same list as{" "}
              <Link
                href="/catalog/items"
                target="_blank"
                rel="noopener noreferrer"
                className={CRM.linkAccent}
              >
                Catalog → Items
              </Link>
              . Search and select rows, then apply.
            </p>
          </div>
          <button
            type="button"
            className="ti-btn ti-btn-light shrink-0 w-9 h-9 p-0 inline-flex items-center justify-center"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ri-close-line text-lg text-gray-500" />
          </button>
        </div>

        <div className="flex-shrink-0 p-[10px] border-b border-gray-200 bg-white">
          <div className="relative">
            <input
              type="search"
              className={CRM.inputSearch}
              placeholder="Search name, code…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-[10px]">
          {loading ? (
            <div className={CRM.loadingWrap}>
              <div className={CRM.spinner} />
              <p className={CRM.loadingLabel}>Loading Data</p>
            </div>
          ) : rows.length === 0 ? (
            <div className={`${CRM.emptyWrap} py-12`}>
              <p className={CRM.emptySub}>No products match this search.</p>
            </div>
          ) : (
            <div className={CRM.tableWrap}>
              <table className={CRM.table}>
                <thead>
                  <tr className={CRM.theadTr}>
                    <th className={`${CRM.th} w-10`} />
                    <th className={CRM.th}>Item</th>
                    <th className={CRM.th}>Factory code</th>
                    <th className={CRM.th}>Vendor code</th>
                    <th className={CRM.th}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const checked = p.id ? pickMap.has(p.id) : false;
                    return (
                      <tr key={p.id} className={`${CRM.tbodyTr} cursor-pointer`} onClick={() => toggleRow(p)}>
                        <td className={CRM.td} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                            checked={checked}
                            onChange={() => toggleRow(p)}
                          />
                        </td>
                        <td className={`${CRM.td} font-medium`}>{p.name ?? "—"}</td>
                        <td className={`${CRM.td} ${CRM.tdMuted} font-mono text-[11px]`}>{p.factoryCode ?? "—"}</td>
                        <td className={`${CRM.td} ${CRM.tdMuted} font-mono text-[11px]`}>{p.vendorCode ?? "—"}</td>
                        <td className={`${CRM.td} text-[11px]`}>{categoryLabel(p.category)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 px-[10px] py-2 flex items-center justify-between gap-2 bg-white">
          <span className="text-[11px] font-medium text-[#495057]">
            Page {page} / {totalPages} · {totalResults} items
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              className={CRM.pageNavBtn}
              disabled={page <= 1}
              onClick={() => setPage((x) => Math.max(1, x - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className={CRM.pageNavBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((x) => Math.min(totalPages, x + 1))}
            >
              Next
            </button>
          </div>
        </div>

        <div className={CRM.drawerFooter}>
          <span className="text-[11px] font-medium text-[#495057] mr-auto self-center">
            {selectedCount} selected
          </span>
          <button type="button" className={CRM.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={CRM.btnPrimary} onClick={handleApply}>
            Apply to vendor
          </button>
        </div>
      </div>
    </>
  );
};

export default CatalogProductPickerDrawer;
