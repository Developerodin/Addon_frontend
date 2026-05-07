"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

export interface PickerItem {
  id: string;
  label: string;
  subtitle?: string;
}

export interface SearchPickerDrawerProps {
  open: boolean;
  title: string;
  icon: string;
  selectedId: string | null;
  onSelect: (item: PickerItem | null) => void;
  onClose: () => void;
  fetchItems: (params: {
    search: string;
    page: number;
    limit: number;
  }) => Promise<{
    items: PickerItem[];
    totalPages: number;
    totalResults: number;
    page: number;
  }>;
}

export function SearchPickerDrawer({
  open,
  title,
  icon,
  selectedId,
  onSelect,
  onClose,
  fetchItems,
}: SearchPickerDrawerProps) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const PAGE_SIZE = 20;

  const load = useCallback(
    async (searchTerm: string, targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchItems({
          search: searchTerm,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setItems(res.items);
        setTotalPages(res.totalPages);
        setTotalResults(res.totalResults);
        setPage(res.page);
      } catch (err) {
        console.error("SearchPickerDrawer fetch:", err);
        setError(err instanceof Error ? err.message : "Failed to load items");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchItems]
  );

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setPage(1);
    load("", 1);
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(search, 1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const goPage = (p: number) => {
    load(search, p);
  };

  const handleSelect = (item: PickerItem) => {
    onSelect(item);
    onClose();
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/40 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600 flex-shrink-0">
              <i className={`${icon} text-sm`} aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{title}</h2>
              {totalResults > 0 && (
                <p className="text-[10px] text-gray-500">
                  {totalResults} total
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full text-[12px] py-2.5 pl-9 pr-8 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none shadow-sm"
              aria-label={`Search ${title.toLowerCase()}`}
            />
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <i className="ri-close-circle-fill text-sm" aria-hidden />
              </button>
            )}
          </div>
          {selectedId && (
            <button
              type="button"
              onClick={handleClear}
              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
            >
              <i className="ri-close-line" aria-hidden />
              Clear selection (show all)
            </button>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 m-4 bg-red-50 rounded-lg border border-red-100" role="alert">
              <i className="ri-error-warning-line text-red-500" aria-hidden />
              <p className="text-[11px] text-red-700 font-medium">{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mb-3" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Searching…
              </p>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <i className="ri-search-line text-xl text-gray-400" aria-hidden />
              </div>
              <p className="text-xs font-bold text-gray-400">No results found</p>
              {search && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Try a different search term
                </p>
              )}
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="p-2 space-y-1">
              {items.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? "bg-purple-50 border border-purple-200 shadow-sm"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isSelected ? (
                        <i className="ri-check-line text-sm" aria-hidden />
                      ) : (
                        <span className="text-[10px] font-bold">
                          {item.label.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[12px] font-bold truncate ${
                          isSelected ? "text-purple-700" : "text-gray-800"
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.subtitle && (
                        <p className="text-[10px] text-gray-500 truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="flex-shrink-0 text-[9px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0 bg-gray-50/50">
            <span className="text-[10px] text-gray-500 font-medium">
              Page {page} of {totalPages} ({totalResults} total)
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => goPage(page - 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="ri-arrow-left-s-line" aria-hidden />
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => goPage(page + 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <i className="ri-arrow-right-s-line" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
