"use client";
import React, { useEffect, useMemo, useState } from "react";
import yarnBoxService, { YarnBox } from "@/shared/services/yarnBoxService";

interface UnallocatedPosDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  yarnName: string | null;
  /** Total unallocated weight (kg) shown in the inventory row — used for header summary. */
  expectedTotalKg: number;
}

/**
 * Aggregated bucket of unallocated boxes that share the same purchase order.
 * Built client-side from the boxes list returned by GET /yarn-boxes/without-storage-location.
 */
interface PoGroup {
  poNumber: string;
  totalWeight: number;
  totalGross: number;
  totalCones: number;
  boxes: YarnBox[];
  supplierName?: string;
  earliestReceivedAt?: string;
}

const fmtKg = (n: number): string =>
  `${(Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString()} kg`;

const fmtDate = (value?: string | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Group boxes by PO number and aggregate weights/cone count per PO.
 * Pure helper — exported for testability via re-import.
 */
const groupBoxesByPo = (boxes: YarnBox[]): PoGroup[] => {
  const map = new Map<string, PoGroup>();

  for (const box of boxes) {
    const poNumber = (box.poNumber || "—").trim() || "—";
    if (!map.has(poNumber)) {
      map.set(poNumber, {
        poNumber,
        totalWeight: 0,
        totalGross: 0,
        totalCones: 0,
        boxes: [],
        supplierName:
          box.supplierName || box.supplier?.brandName || box.supplier?.name,
        earliestReceivedAt: box.receivedDate || box.createdAt,
      });
    }
    const group = map.get(poNumber)!;
    group.boxes.push(box);
    group.totalWeight += Number(box.boxWeight || 0);
    group.totalGross += Number(box.grossWeight || 0);
    group.totalCones += Number(box.numberOfCones || 0);
    if (!group.supplierName) {
      group.supplierName =
        box.supplierName || box.supplier?.brandName || box.supplier?.name;
    }
    const candidate = box.receivedDate || box.createdAt;
    if (
      candidate &&
      (!group.earliestReceivedAt ||
        new Date(candidate).getTime() <
          new Date(group.earliestReceivedAt).getTime())
    ) {
      group.earliestReceivedAt = candidate;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalWeight - a.totalWeight
  );
};

const UnallocatedPosDrawer: React.FC<UnallocatedPosDrawerProps> = ({
  isOpen,
  onClose,
  yarnName,
  expectedTotalKg,
}) => {
  const [boxes, setBoxes] = useState<YarnBox[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPo, setExpandedPo] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !yarnName) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpandedPo(null);

    yarnBoxService
      .getBoxesWithoutStorageLocation({ yarnName })
      .then((res) => {
        if (cancelled) return;
        setBoxes(res || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load unallocated boxes"
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, yarnName]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const poGroups = useMemo(() => groupBoxesByPo(boxes), [boxes]);

  const totals = useMemo(
    () =>
      poGroups.reduce(
        (acc, g) => {
          acc.weight += g.totalWeight;
          acc.boxes += g.boxes.length;
          acc.cones += g.totalCones;
          return acc;
        },
        { weight: 0, boxes: 0, cones: 0 }
      ),
    [poGroups]
  );

  const mismatch =
    !loading &&
    !error &&
    Math.abs(totals.weight - (expectedTotalKg || 0)) > 0.5;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label="Unallocated POs"
    >
      <button
        type="button"
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <aside className="w-full md:w-[640px] bg-white shadow-2xl flex flex-col">
        <header className="flex items-start justify-between border-b border-gray-100 px-5 py-3 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Unallocated Stock
            </p>
            <h2 className="text-sm font-bold text-gray-800 truncate">
              {yarnName || "—"}
            </h2>
            <p className="text-[11px] text-gray-600 mt-0.5">
              Boxes received but not yet placed in any storage slot
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/70 rounded-lg transition-colors"
            aria-label="Close"
          >
            <i className="ri-close-line text-xl text-gray-500" />
          </button>
        </header>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/40">
          <SummaryStat
            label="POs"
            value={loading ? "…" : poGroups.length.toLocaleString()}
            tone="purple"
          />
          <SummaryStat
            label="Boxes"
            value={loading ? "…" : totals.boxes.toLocaleString()}
            tone="indigo"
          />
          <SummaryStat
            label="Total Weight"
            value={loading ? "…" : fmtKg(totals.weight)}
            tone="green"
            note={
              mismatch
                ? `Row shows ${fmtKg(expectedTotalKg)} — diff ${fmtKg(
                    Math.abs(totals.weight - expectedTotalKg)
                  )}`
                : undefined
            }
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3" />
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                Loading unallocated boxes…
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <i className="ri-error-warning-line text-3xl text-red-400 mb-2" />
              <p className="text-[12px] text-gray-700 mb-1">
                Couldn&apos;t load unallocated boxes
              </p>
              <p className="text-[11px] text-gray-500">{error}</p>
            </div>
          ) : poGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <i className="ri-inbox-line text-3xl text-gray-300 mb-2" />
              <p className="text-[12px] text-gray-700 mb-1">
                No unallocated boxes
              </p>
              <p className="text-[11px] text-gray-500">
                Every box for {yarnName || "this yarn"} has a storage location.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {poGroups.map((group) => {
                const isExpanded = expandedPo === group.poNumber;
                return (
                  <li key={group.poNumber}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPo(isExpanded ? null : group.poNumber)
                      }
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors text-left"
                      aria-expanded={isExpanded}
                      aria-controls={`po-panel-${group.poNumber}`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center rounded bg-purple-100 text-purple-700 flex-shrink-0">
                        <i className="ri-file-list-3-line text-base" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-gray-900 truncate">
                            {group.poNumber}
                          </span>
                          {group.supplierName && (
                            <span className="text-[10px] text-gray-500 truncate">
                              · {group.supplierName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-500">
                            {group.boxes.length}{" "}
                            {group.boxes.length === 1 ? "box" : "boxes"}
                          </span>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-500">
                            {group.totalCones} cones
                          </span>
                          {group.earliestReceivedAt && (
                            <>
                              <span className="text-[10px] text-gray-300">·</span>
                              <span className="text-[10px] text-gray-500">
                                {fmtDate(group.earliestReceivedAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[12px] font-bold text-purple-600">
                          {fmtKg(group.totalWeight)}
                        </div>
                      </div>
                      <i
                        className={`ri-arrow-down-s-line text-lg text-gray-400 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div
                        id={`po-panel-${group.poNumber}`}
                        className="px-5 pb-3 bg-gray-50/40"
                      >
                        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                  Box ID
                                </th>
                                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                  Lot
                                </th>
                                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                  Shade
                                </th>
                                <th className="px-2 py-2 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                  Cones
                                </th>
                                <th className="px-2 py-2 text-right text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                  Weight
                                </th>
                                <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                  QC
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.boxes.map((box) => (
                                <tr
                                  key={box._id || box.boxId}
                                  className="border-b border-gray-100 last:border-b-0"
                                >
                                  <td className="px-2 py-1.5 text-[11px] font-medium text-gray-800">
                                    {box.boxId}
                                  </td>
                                  <td className="px-2 py-1.5 text-[11px] text-gray-700">
                                    {box.lotNumber || "—"}
                                  </td>
                                  <td className="px-2 py-1.5 text-[11px] text-gray-700">
                                    {box.shadeCode || "—"}
                                  </td>
                                  <td className="px-2 py-1.5 text-[11px] text-gray-700 text-right">
                                    {box.numberOfCones ?? "—"}
                                  </td>
                                  <td className="px-2 py-1.5 text-[11px] font-semibold text-gray-900 text-right">
                                    {fmtKg(box.boxWeight || 0)}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <QcBadge status={box.qcData?.status} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="border-t border-gray-100 px-5 py-3 flex justify-end bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[11px] font-bold text-gray-700 border border-gray-200 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </footer>
      </aside>
    </div>
  );
};

interface SummaryStatProps {
  label: string;
  value: string;
  tone: "purple" | "indigo" | "green";
  note?: string;
}

const SummaryStat: React.FC<SummaryStatProps> = ({
  label,
  value,
  tone,
  note,
}) => {
  const toneClass =
    tone === "purple"
      ? "text-purple-700"
      : tone === "indigo"
        ? "text-indigo-700"
        : "text-green-700";
  return (
    <div className="bg-white border border-gray-200 rounded p-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`text-[13px] font-bold ${toneClass}`}>{value}</p>
      {note && <p className="text-[9px] text-amber-600 mt-0.5">{note}</p>}
    </div>
  );
};

const QcBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) {
    return (
      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded bg-gray-100 text-gray-600 uppercase">
        Pending
      </span>
    );
  }
  const isApproved = status === "qc_approved";
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
        isApproved
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {isApproved ? "Approved" : "Rejected"}
    </span>
  );
};

export default UnallocatedPosDrawer;
