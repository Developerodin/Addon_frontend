"use client";
import React, { useEffect, useRef } from "react";
import {
  storageInputClass,
  storageSelectClass,
  selectChevronBgStyle,
} from "./storageUiClasses";

export type OccupancyFilter = "all" | "empty" | "occupied";

export interface RackFilters {
  yarnName: string;
  occupancy: OccupancyFilter;
  sectionCode: string; // 'all' | section code
  qcStatus: "all" | "approved" | "pending"; // QC of contained boxes
}

export const DEFAULT_RACK_FILTERS: RackFilters = {
  yarnName: "",
  occupancy: "all",
  sectionCode: "all",
  qcStatus: "all",
};

/**
 * Returns the count of non-default filter values; used to show a badge on the filter button.
 */
export const countActiveFilters = (filters: RackFilters): number => {
  let n = 0;
  if (filters.yarnName.trim()) n += 1;
  if (filters.occupancy !== "all") n += 1;
  if (filters.sectionCode !== "all") n += 1;
  if (filters.qcStatus !== "all") n += 1;
  return n;
};

interface RackFilterPanelProps {
  open: boolean;
  filters: RackFilters;
  sections: string[];
  /** Result count for the "showing X of Y" status row. */
  filteredCount?: number;
  totalCount?: number;
  isLoading?: boolean;
  onChange: (next: RackFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

/**
 * Collapsible filter surface for storage grids: yarn substring, occupancy, section, box QC.
 * Layout uses a 12-column grid on large screens so controls align on one baseline row.
 */
const RackFilterPanel: React.FC<RackFilterPanelProps> = ({
  open,
  filters,
  sections,
  filteredCount,
  totalCount,
  isLoading,
  onChange,
  onClear,
  onClose,
}) => {
  const yarnInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => yarnInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const update = (patch: Partial<RackFilters>) =>
    onChange({ ...filters, ...patch });

  const activeCount = countActiveFilters(filters);

  return (
    <div
      className="mt-3 rounded-lg border border-gray-200 bg-white shadow-sm ring-1 ring-black/5"
      role="region"
      aria-label="Rack filters"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-700">
            <i className="ri-filter-3-line text-base" aria-hidden />
          </span>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-gray-900">
              Filter racks
            </span>
            {activeCount > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {activeCount} active
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline"
            >
              Clear all
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close filters"
          >
            <i className="ri-close-line" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end lg:gap-x-4 lg:gap-y-3">
          <div className="lg:col-span-4">
            <label
              htmlFor="rack-filter-yarn"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Yarn name
            </label>
            <div className="relative">
              <i
                className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400"
                aria-hidden
              />
              <input
                id="rack-filter-yarn"
                ref={yarnInputRef}
                type="text"
                value={filters.yarnName}
                onChange={(e) => update({ yarnName: e.target.value })}
                placeholder="Substring match on boxes / cones…"
                className={`${storageInputClass} w-full pl-8 pr-8`}
              />
              {filters.yarnName ? (
                <button
                  type="button"
                  onClick={() => update({ yarnName: "" })}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Clear yarn search"
                >
                  <i className="ri-close-line text-sm" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-3">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Occupancy
            </span>
            <div className="flex rounded-md border border-gray-300 bg-white p-0.5 shadow-sm">
              {(
                [
                  {
                    value: "all" as const,
                    label: "All",
                    icon: "ri-layout-grid-line",
                  },
                  {
                    value: "empty" as const,
                    label: "Empty",
                    icon: "ri-inbox-line",
                  },
                  {
                    value: "occupied" as const,
                    label: "Occupied",
                    icon: "ri-archive-line",
                  },
                ] as const
              ).map((opt) => {
                const active = filters.occupancy === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ occupancy: opt.value })}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    aria-pressed={active}
                  >
                    <i className={`${opt.icon} text-sm`} aria-hidden />
                    <span className="hidden sm:inline">{opt.label}</span>
                    <span className="sm:hidden">{opt.label.slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="rack-filter-section"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Section
            </label>
            <select
              id="rack-filter-section"
              value={filters.sectionCode}
              onChange={(e) => update({ sectionCode: e.target.value })}
              className={`${storageSelectClass} w-full`}
              style={selectChevronBgStyle}
            >
              <option value="all">All sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="rack-filter-qc"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Box QC
            </label>
            <select
              id="rack-filter-qc"
              value={filters.qcStatus}
              onChange={(e) =>
                update({ qcStatus: e.target.value as RackFilters["qcStatus"] })
              }
              className={`${storageSelectClass} w-full disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500`}
              style={selectChevronBgStyle}
              disabled={filters.occupancy === "empty"}
              title={
                filters.occupancy === "empty"
                  ? "Not used for empty racks"
                  : undefined
              }
            >
              <option value="all">Any</option>
              <option value="approved">QC approved</option>
              <option value="pending">Not approved</option>
            </select>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-snug text-gray-500">
          Matches yarn name on boxes (and cones in short-term). Filters search the
          whole zone; results paginate below.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-[11px] text-gray-600">
          {isLoading ? (
            <span className="inline-flex items-center gap-2 font-medium text-gray-700">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              Loading rack contents…
            </span>
          ) : activeCount === 0 ? (
            <span>
              No filters applied — the grid below uses normal zone pagination.
            </span>
          ) : typeof filteredCount === "number" ? (
            <span>
              <span className="font-semibold text-gray-900">
                {filteredCount.toLocaleString()}
              </span>
              {typeof totalCount === "number" ? (
                <>
                  {" "}
                  matching of{" "}
                  <span className="font-semibold text-gray-900">
                    {totalCount.toLocaleString()}
                  </span>{" "}
                  slots
                </>
              ) : (
                " matching slots"
              )}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default RackFilterPanel;
