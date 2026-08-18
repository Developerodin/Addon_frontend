"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import supplierService, { type Supplier } from "@/shared/services/supplierService";

interface SupplierAutocompleteProps {
  selected: Supplier | null;
  onSelect: (supplier: Supplier | null) => void;
  disabled?: boolean;
}

/**
 * Yarn supplier typeahead matching PurchaseForm (brand / contact / city).
 */
const SupplierAutocomplete: React.FC<SupplierAutocompleteProps> = ({
  selected,
  onSelect,
  disabled = false,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [query, setQuery] = useState(selected?.brandName || "");
  const [suggestions, setSuggestions] = useState<Supplier[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    /**
     * Loads active yarn suppliers for local filtering.
     */
    const load = async () => {
      try {
        const res = await supplierService.getSuppliers({ status: "active", limit: 1000, page: 1 });
        setSuppliers(res.results || []);
      } catch (error) {
        console.error("Failed to load suppliers:", error);
        toast.error("Failed to load suppliers");
      }
    };
    void load();
  }, []);

  useEffect(() => {
    setQuery(selected?.brandName || "");
  }, [selected?.brandName]);

  useEffect(() => {
    /**
     * Closes the listbox on outside click.
     */
    const onDocClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /**
   * Filters active suppliers by brand, contact, email, or city.
   * @param value Search string
   */
  const filterSuppliers = useCallback(
    (value: string): Supplier[] => {
      if (!value.trim()) return [];
      const q = value.trim().toLowerCase();
      return suppliers
        .filter((s) => {
          const brand = s.brandName?.toLowerCase() || "";
          const contact = s.contactPersonName?.toLowerCase() || "";
          const email = s.email?.toLowerCase() || "";
          const city = s.city?.toLowerCase() || "";
          return brand.includes(q) || contact.includes(q) || email.includes(q) || city.includes(q);
        })
        .sort((a, b) => {
          const aBrand = a.brandName?.toLowerCase() || "";
          const bBrand = b.brandName?.toLowerCase() || "";
          const aStarts = aBrand.startsWith(q);
          const bStarts = bBrand.startsWith(q);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return aBrand.localeCompare(bBrand);
        })
        .slice(0, 12);
    },
    [suppliers]
  );

  /**
   * Updates query and suggestion list.
   * @param value Input value
   */
  const handleInput = (value: string) => {
    const next = filterSuppliers(value);
    setQuery(value);
    setSuggestions(next);
    setShowSuggestions(next.length > 0);
    if (!selected || selected.brandName !== value) {
      onSelect(null);
    }
  };

  /**
   * Commits a supplier from the listbox.
   * @param supplier Chosen supplier
   */
  const selectSupplier = (supplier: Supplier) => {
    onSelect(supplier);
    setQuery(supplier.brandName);
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor="yarn-to-vendor-supplier">
        Vendor (supplier) <span className="text-red-500">*</span>
      </label>
      <input
        id="yarn-to-vendor-supplier"
        type="text"
        value={query}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => handleInput(e.target.value)}
        onFocus={(e) => {
          const value = e.target.value;
          if (value.trim()) {
            const next = filterSuppliers(value);
            setSuggestions(next);
            setShowSuggestions(next.length > 0);
          }
        }}
        className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs focus:border-purple-300 focus:ring-0"
        placeholder="Type to search supplier..."
        required
        aria-autocomplete="list"
        aria-expanded={showSuggestions}
        aria-controls="yarn-to-vendor-supplier-list"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          id="yarn-to-vendor-supplier-list"
          role="listbox"
          aria-label="Supplier suggestions"
          className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg"
        >
          {suggestions.map((supplier) => (
            <div
              key={supplier.id}
              role="option"
              tabIndex={0}
              aria-selected={selected?.id === supplier.id}
              onClick={() => selectSupplier(supplier)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectSupplier(supplier);
                }
              }}
              className="cursor-pointer border-b border-gray-100 px-3 py-1.5 last:border-b-0 hover:bg-gray-100"
            >
              <div className="text-xs font-medium text-gray-900">{supplier.brandName}</div>
              {(supplier.contactPersonName || supplier.city) && (
                <div className="text-[10px] text-gray-500">
                  {supplier.contactPersonName && <span>{supplier.contactPersonName}</span>}
                  {supplier.city && (
                    <span className={supplier.contactPersonName ? "ml-2" : ""}>{supplier.city}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierAutocomplete;
