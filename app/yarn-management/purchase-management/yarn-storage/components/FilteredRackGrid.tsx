"use client";
import React, { useMemo } from "react";
import {
  SlotWithContents,
  BoxInSlot,
  ConeInSlot,
} from "@/shared/services/storageSlotService";

export type FilteredRackZone = "LT" | "ST";

interface FilteredRackGridProps {
  isLoading: boolean;
  error: string | null;
  slots: SlotWithContents[];
  yarnQuery: string;
  onSlotClick: (slot: SlotWithContents) => void;
  /** LT: boxes only in tiles. ST: boxes + cones (yarn search matches either). */
  zone?: FilteredRackZone;
}

interface YarnAggregate {
  yarnName: string;
  totalWeight: number;
  boxCount: number;
  matchesQuery: boolean;
}

/**
 * Roll up boxes within a slot into one row per yarn so the tile can summarize what's stored.
 * Returns rows ordered with query-matches first, then by weight desc.
 */
const aggregateBoxesByYarn = (
  boxes: BoxInSlot[],
  yarnQuery: string
): YarnAggregate[] => {
  const q = yarnQuery.trim().toLowerCase();
  const map = new Map<string, YarnAggregate>();

  for (const box of boxes || []) {
    const yarnName = (box.yarnName || "Unknown").trim() || "Unknown";
    if (!map.has(yarnName)) {
      map.set(yarnName, {
        yarnName,
        totalWeight: 0,
        boxCount: 0,
        matchesQuery: q ? yarnName.toLowerCase().includes(q) : false,
      });
    }
    const row = map.get(yarnName)!;
    row.totalWeight += Number(box.boxWeight || 0);
    row.boxCount += 1;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.matchesQuery !== b.matchesQuery) return a.matchesQuery ? -1 : 1;
    return b.totalWeight - a.totalWeight;
  });
};

interface MergedStYarnRow {
  yarnName: string;
  boxKg: number;
  coneNetKg: number;
  boxes: number;
  cones: number;
  matchesQuery: boolean;
}

/**
 * Merge box and cone aggregates by yarn name for short-term slot cards.
 */
const mergeStYarnRows = (
  boxes: BoxInSlot[],
  cones: ConeInSlot[],
  yarnQuery: string
): MergedStYarnRow[] => {
  const q = yarnQuery.trim().toLowerCase();
  const map = new Map<string, MergedStYarnRow>();

  const touch = (yarnName: string) => {
    const n = (yarnName || "Unknown").trim() || "Unknown";
    if (!map.has(n)) {
      map.set(n, {
        yarnName: n,
        boxKg: 0,
        coneNetKg: 0,
        boxes: 0,
        cones: 0,
        matchesQuery: q ? n.toLowerCase().includes(q) : false,
      });
    }
    return map.get(n)!;
  };

  for (const box of boxes || []) {
    const r = touch(box.yarnName || "Unknown");
    r.boxKg += Number(box.boxWeight || 0);
    r.boxes += 1;
    if (q && r.yarnName.toLowerCase().includes(q)) r.matchesQuery = true;
  }
  for (const cone of cones || []) {
    const r = touch(cone.yarnName || "Unknown");
    r.coneNetKg += Math.max(
      0,
      Number(cone.coneWeight || 0) - Number(cone.tearWeight || 0)
    );
    r.cones += 1;
    if (q && r.yarnName.toLowerCase().includes(q)) r.matchesQuery = true;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.matchesQuery !== b.matchesQuery) return a.matchesQuery ? -1 : 1;
    return b.boxKg + b.coneNetKg - (a.boxKg + a.coneNetKg);
  });
};

const fmtKg = (n: number): string =>
  `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString()} kg`;

/**
 * Renders the filtered storage grid: empty state, loading, error, or a card per slot
 * with yarn-aware contents preview. Cards highlight yarns matching the active query.
 */
const FilteredRackGrid: React.FC<FilteredRackGridProps> = ({
  isLoading,
  error,
  slots,
  yarnQuery,
  onSlotClick,
  zone = "LT",
}) => {
  const sortedSlots = useMemo(() => {
    return [...slots].sort((a, b) => {
      const sa = (a.sectionCode || "").localeCompare(b.sectionCode || "");
      if (sa !== 0) return sa;
      if (a.shelfNumber !== b.shelfNumber) return a.shelfNumber - b.shelfNumber;
      return a.floorNumber - b.floorNumber;
    });
  }, [slots]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading rack contents…</p>
          <p className="text-[11px] text-gray-400 mt-1">
            Searching the entire {zone === "ST" ? "ST" : "LT"} zone, not just
            this screen.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-gray-500">
        <i className="ri-error-warning-line text-3xl text-red-400 mb-2 block" />
        <p className="text-sm text-gray-700 mb-1">Couldn&apos;t load filters</p>
        <p className="text-xs text-gray-500">{error}</p>
      </div>
    );
  }

  if (sortedSlots.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <i className="ri-filter-off-line text-3xl mb-2 block" />
        <p className="text-sm">No racks match the current filters.</p>
        <p className="text-[11px] mt-1">
          Try widening the section, clearing the yarn name, or switching
          occupancy to &quot;All&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <div
        className="grid gap-3 p-4 w-full"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        }}
      >
        {sortedSlots.map((slot) => (
          <SlotCard
            key={slot._id}
            slot={slot}
            yarnQuery={yarnQuery}
            zone={zone}
            onClick={() => onSlotClick(slot)}
          />
        ))}
      </div>
    </div>
  );
};

interface SlotCardProps {
  slot: SlotWithContents;
  yarnQuery: string;
  zone: FilteredRackZone;
  onClick: () => void;
}

const SlotCard: React.FC<SlotCardProps> = ({ slot, yarnQuery, zone, onClick }) => {
  const boxRows = useMemo(
    () => aggregateBoxesByYarn(slot.boxes || [], yarnQuery),
    [slot.boxes, yarnQuery]
  );
  const stMerged = useMemo(
    () =>
      mergeStYarnRows(slot.boxes || [], slot.cones || [], yarnQuery),
    [slot.boxes, slot.cones, yarnQuery]
  );

  const hasBoxes = (slot.boxes?.length ?? 0) > 0;
  const hasCones =
    (slot.cones?.length ?? 0) > 0 || (slot.coneCount ?? 0) > 0;

  const isEmptyLt =
    zone === "LT" &&
    (slot.boxCount || 0) === 0 &&
    boxRows.length === 0;
  const isEmptySt = zone === "ST" && !hasBoxes && !hasCones;
  const isEmpty = zone === "ST" ? isEmptySt : isEmptyLt;

  const totalWeightLt = (slot.boxes || []).reduce(
    (sum, b) => sum + Number(b.boxWeight || 0),
    0
  );
  const totalWeightSt =
    (slot.boxes || []).reduce((s, b) => s + Number(b.boxWeight || 0), 0) +
    (slot.cones || []).reduce(
      (s, c) =>
        s +
        Math.max(0, Number(c.coneWeight || 0) - Number(c.tearWeight || 0)),
      0
    );

  const tone = isEmpty
    ? "bg-green-50 border-green-200 hover:border-green-400"
    : "bg-blue-50 border-blue-200 hover:border-blue-400";

  const badge =
    zone === "ST" ? (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-200 text-blue-800">
        {hasBoxes ? `${slot.boxCount ?? slot.boxes?.length ?? 0} box` : null}
        {hasBoxes && hasCones ? " · " : null}
        {hasCones
          ? `${slot.coneCount ?? slot.cones?.length ?? 0} cone${(slot.coneCount ?? slot.cones?.length ?? 0) === 1 ? "" : "s"}`
          : null}
        {!hasBoxes && !hasCones ? "0" : null}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-200 text-blue-800">
        {slot.boxCount} {slot.boxCount === 1 ? "box" : "boxes"}
      </span>
    );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left border-2 rounded-xl p-3 transition-all hover:shadow-md ${tone}`}
      title={slot.barcode}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-900 truncate">
            {slot.label}
          </div>
          <div className="text-[10px] text-gray-500">
            {slot.sectionCode || "—"} · Shelf {slot.shelfNumber} · Floor{" "}
            {slot.floorNumber}
          </div>
        </div>
        {isEmpty ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green-200 text-green-800">
            <i className="ri-checkbox-blank-circle-line text-[10px]" /> Empty
          </span>
        ) : (
          badge
        )}
      </div>

      {!isEmpty && zone === "LT" && (
        <>
          <ul className="space-y-1 mb-2">
            {boxRows.slice(0, 3).map((row) => (
              <li
                key={row.yarnName}
                className={`flex items-center justify-between gap-2 text-[11px] rounded px-1.5 py-0.5 ${
                  row.matchesQuery
                    ? "bg-yellow-100 text-yellow-900 font-semibold"
                    : "text-gray-700"
                }`}
              >
                <span className="truncate" title={row.yarnName}>
                  {row.yarnName}
                </span>
                <span className="text-[10px] font-mono whitespace-nowrap">
                  {fmtKg(row.totalWeight)} · {row.boxCount}b
                </span>
              </li>
            ))}
            {boxRows.length > 3 && (
              <li className="text-[10px] text-gray-500 italic px-1.5">
                + {boxRows.length - 3} more yarn
                {boxRows.length - 3 > 1 ? "s" : ""}
              </li>
            )}
          </ul>
          <div className="text-[10px] text-gray-500 border-t border-gray-200/70 pt-1.5">
            Total:{" "}
            <span className="font-bold text-gray-700">
              {fmtKg(totalWeightLt)}
            </span>
            {slot.coneCount > 0 && (
              <>
                {" "}
                · {slot.coneCount} cones
              </>
            )}
          </div>
        </>
      )}

      {!isEmpty && zone === "ST" && (
        <>
          <ul className="space-y-1 mb-2">
            {stMerged.slice(0, 3).map((row) => (
              <li
                key={row.yarnName}
                className={`flex items-center justify-between gap-2 text-[11px] rounded px-1.5 py-0.5 ${
                  row.matchesQuery
                    ? "bg-yellow-100 text-yellow-900 font-semibold"
                    : "text-gray-700"
                }`}
              >
                <span className="truncate" title={row.yarnName}>
                  {row.yarnName}
                </span>
                <span className="text-[10px] font-mono whitespace-nowrap text-right">
                  {fmtKg(row.boxKg + row.coneNetKg)}
                  {row.boxes > 0 || row.cones > 0 ? (
                    <span className="text-gray-500">
                      {row.boxes > 0 ? ` · ${row.boxes}b` : ""}
                      {row.cones > 0 ? ` · ${row.cones}c` : ""}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
            {stMerged.length > 3 && (
              <li className="text-[10px] text-gray-500 italic px-1.5">
                + {stMerged.length - 3} more yarn
                {stMerged.length - 3 > 1 ? "s" : ""}
              </li>
            )}
          </ul>
          <div className="text-[10px] text-gray-500 border-t border-gray-200/70 pt-1.5">
            Total:{" "}
            <span className="font-bold text-gray-700">
              {fmtKg(totalWeightSt)}
            </span>
          </div>
        </>
      )}
    </button>
  );
};

export default FilteredRackGrid;
