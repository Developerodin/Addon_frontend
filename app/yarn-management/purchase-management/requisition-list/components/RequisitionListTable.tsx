"use client";

import React from "react";
import type { Supplier } from "@/shared/services/supplierService";
import {
  workflowStageLabel,
  type CriticalRow,
} from "../hooks/useCriticalRequisitionList";
import { formatStockKg } from "../utils/formatStockKg";
import { vendorsForCriticalRow } from "../utils/vendorsForCriticalRow";

const SNAPSHOT_HEADER =
  "Qty stored on the requisition record when it was created or last recalculated — may differ from live inventory.";
const LIVE_HEADER =
  "Current stock computed from inventory boxes and cones. Available = LT + ST − blocked (unallocated is separate).";

interface RequisitionListTableProps {
  rows: CriticalRow[];
  loading: boolean;
  supplierOptions: Supplier[];
  sortConfig: { key: keyof CriticalRow; direction: "asc" | "desc" } | null;
  onSort: (key: keyof CriticalRow) => void;
  onSendToDraft: (row: CriticalRow) => void;
  onDismiss: (id: string, yarnLabel: string) => void;
  onVendorChange: (rowId: string, supplierId: string) => void;
  canStageRow: (row: CriticalRow) => boolean;
  canDismissRow: (row: CriticalRow) => boolean;
}

/**
 * Renders status badges from snapshot qty fields (requisition doc).
 * @param yarn - Table row
 */
function getStatusBadges(yarn: CriticalRow) {
  const badges: { label: string; className: string }[] = [];
  if (yarn.availableQty < yarn.minimumQty) {
    badges.push({
      label: "Below Minimum",
      className: "border border-red-200 bg-red-100 text-red-800",
    });
  }
  if (yarn.blockedQty > yarn.availableQty) {
    badges.push({
      label: "Overblocked",
      className: "border border-amber-200 bg-amber-100 text-amber-800",
    });
  }
  if (badges.length === 0) {
    badges.push({
      label: "Healthy",
      className: "border border-emerald-200 bg-emerald-100 text-emerald-800",
    });
  }
  return badges;
}

/** Workflow badge color classes. */
function workflowTone(workflow: CriticalRow["workflowStage"]) {
  switch (workflow) {
    case "in_requisition":
      return "border border-slate-200 bg-slate-50 text-slate-800";
    case "sent_to_draft":
      return "border border-amber-200 bg-amber-50 text-amber-950";
    case "order_placed":
      return "border border-emerald-200 bg-emerald-50 text-emerald-900";
    case "dismissed":
    default:
      return "border border-gray-200 bg-gray-50 text-gray-600";
  }
}

/** Compact stock cell for live or snapshot columns. */
function StockCell({
  value,
  tone = "default",
  title,
}: {
  value: number;
  tone?: "default" | "green" | "orange" | "blue" | "slate";
  title?: string;
}) {
  const toneClass =
    tone === "green"
      ? "text-green-700"
      : tone === "orange"
        ? "text-orange-600"
        : tone === "blue"
          ? "text-blue-700"
          : tone === "slate"
            ? "text-slate-700"
            : "text-gray-900";
  return (
    <span className={`font-semibold tabular-nums ${toneClass}`} title={title}>
      {formatStockKg(value)}
    </span>
  );
}

/**
 * Single cell showing Unalloc / LT / ST kg with inline labels.
 */
function StorageBreakdownCell({
  unallocatedKg,
  longTermKg,
  shortTermKg,
}: {
  unallocatedKg: number;
  longTermKg: number;
  shortTermKg: number;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 text-[11px] leading-tight"
      title="Unalloc: QC-approved, not in LT/ST · LT: long-term slots · ST: short-term slots"
    >
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] font-bold uppercase text-slate-500 w-10 shrink-0">UN</span>
        <StockCell value={unallocatedKg} tone="slate" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] font-bold uppercase text-slate-500 w-10 shrink-0">LT</span>
        <StockCell value={longTermKg} tone="blue" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] font-bold uppercase text-slate-500 w-10 shrink-0">ST</span>
        <StockCell value={shortTermKg} tone="blue" />
      </div>
    </div>
  );
}

/**
 * Single cell showing snapshot Avail / Blocked kg with inline labels.
 */
function SnapshotBreakdownCell({
  availableQty,
  blockedQty,
}: {
  availableQty: number;
  blockedQty: number;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 text-[11px] leading-tight"
      title={SNAPSHOT_HEADER}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] font-bold uppercase text-slate-500 w-12 shrink-0">Avail</span>
        <StockCell value={availableQty} tone="green" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[9px] font-bold uppercase text-slate-500 w-12 shrink-0">Blocked</span>
        <StockCell value={blockedQty} tone="orange" />
      </div>
    </div>
  );
}

/**
 * Main requisition list table with snapshot vs live stock column groups.
 */
export function RequisitionListTable({
  rows,
  loading,
  supplierOptions,
  sortConfig,
  onSort,
  onSendToDraft,
  onDismiss,
  onVendorChange,
  canStageRow,
  canDismissRow,
}: RequisitionListTableProps) {
  const SortIcon = ({ field }: { field: keyof CriticalRow }) => {
    if (sortConfig?.key !== field) {
      return <i className="ri-arrow-up-down-line text-gray-400 text-sm" aria-hidden />;
    }
    return sortConfig.direction === "asc" ? (
      <i className="ri-arrow-up-line text-purple-600 text-sm" aria-hidden />
    ) : (
      <i className="ri-arrow-down-line text-purple-600 text-sm" aria-hidden />
    );
  };

  const thBase =
    "px-1.5 py-2 text-left text-[10px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200";
  const thSort =
    "cursor-pointer hover:bg-gray-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400";

  return (
    <table
      className="w-full border-collapse border border-gray-200 min-w-[1100px]"
      aria-busy={loading}
      aria-label="Critical yarn requisitions"
    >
      <thead>
        <tr className="bg-gray-50/30">
          <th rowSpan={2} className={`pl-[10px] pr-1.5 ${thBase} ${thSort}`} onClick={() => onSort("yarnName")}>
            <div className="flex items-center gap-1.5">
              Yarn Name
              <SortIcon field="yarnName" />
            </div>
          </th>
          <th rowSpan={2} className={`${thBase} ${thSort}`} onClick={() => onSort("minimumQty")}>
            <div className="flex items-center gap-1.5">
              Min Qty
              <SortIcon field="minimumQty" />
            </div>
          </th>
          <th
            colSpan={1}
            className={`${thBase} bg-slate-50 text-center text-[9px] normal-case tracking-normal`}
            title={SNAPSHOT_HEADER}
          >
            Snapshot (stored on requisition)
          </th>
          <th
            colSpan={4}
            className={`${thBase} bg-sky-50/80 text-center text-[9px] normal-case tracking-normal`}
            title={LIVE_HEADER}
          >
            Live inventory (now)
          </th>
          <th rowSpan={2} className={thBase} title="Quantity on linked draft PO line (kg)">
            Draft PO qty
          </th>
          <th rowSpan={2} className={thBase}>
            Alert Status
          </th>
          <th rowSpan={2} className={thBase}>
            Status
          </th>
          <th rowSpan={2} className={thBase}>
            Vendor
          </th>
          <th rowSpan={2} className={`${thBase} ${thSort}`} onClick={() => onSort("lastUpdated")}>
            <div className="flex items-center gap-1.5">
              Last Updated
              <SortIcon field="lastUpdated" />
            </div>
          </th>
          <th rowSpan={2} className={`${thBase} text-right pr-[10px]`}>
            Actions
          </th>
        </tr>
        <tr className="bg-gray-50/30">
          <th
            className={`${thBase} bg-slate-50/60 ${thSort}`}
            title={SNAPSHOT_HEADER}
            onClick={() => onSort("availableQty")}
          >
            <div className="flex items-center gap-1">
              @ Create
              <SortIcon field="availableQty" />
            </div>
          </th>
          <th
            className={`${thBase} bg-sky-50/40`}
            title="Unalloc: QC-approved not in slot · LT: long-term · ST: short-term"
          >
            Storage
          </th>
          <th className={`${thBase} bg-sky-50/40`} title="LT + ST in storage locations">
            Total
          </th>
          <th className={`${thBase} bg-sky-50/40`} title="LT + ST − blocked (excludes unallocated)">
            Avail
          </th>
          <th className={`${thBase} bg-sky-50/40`} title="Issued cones (blocked for production)">
            Blocked
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((yarn) => {
          const live = yarn.liveStock;
          return (
            <tr key={yarn.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="pl-[10px] pr-1.5 py-2.5 border border-gray-200">
                <span className="text-[12px] font-bold text-gray-900">{yarn.yarnName}</span>
              </td>
              <td className="px-1.5 py-2.5 text-[12px] text-gray-900 border border-gray-200 tabular-nums">
                {yarn.minimumQty.toLocaleString()}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-200 bg-slate-50/30 whitespace-nowrap">
                <SnapshotBreakdownCell
                  availableQty={yarn.availableQty}
                  blockedQty={yarn.blockedQty}
                />
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-200 bg-sky-50/20 whitespace-nowrap">
                {live ? (
                  <StorageBreakdownCell
                    unallocatedKg={live.unallocatedKg}
                    longTermKg={live.longTermKg}
                    shortTermKg={live.shortTermKg}
                  />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-200 bg-sky-50/20">
                {live ? (
                  <StockCell value={live.totalStockKg} title="LT + ST" />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-200 bg-sky-50/20">
                {live ? (
                  <StockCell value={live.availableKg} tone="green" title="LT + ST − blocked" />
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-200 bg-sky-50/20">
                {live ? <StockCell value={live.blockedKg} tone="orange" /> : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] border border-gray-200" title="Staged quantity on draft PO (kg)">
                {yarn.draftPoQuantity != null ? (
                  <span className="text-amber-700 font-semibold tabular-nums">
                    {formatStockKg(yarn.draftPoQuantity)}
                  </span>
                ) : (
                  <span className="text-gray-400 font-medium">—</span>
                )}
              </td>
              <td className="px-1.5 py-2.5 border border-gray-200">
                <div className="flex flex-wrap gap-1.5">
                  {getStatusBadges(yarn).map((badge) => (
                    <span
                      key={badge.label}
                      className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-1.5 py-2.5 border border-gray-200">
                <span
                  className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded capitalize ${workflowTone(
                    yarn.workflowStage
                  )}`}
                >
                  {workflowStageLabel(yarn.workflowStage)}
                </span>
              </td>
              <td className="px-1.5 py-2.5 border border-gray-200 min-w-[170px]">
                <select
                  className="w-full bg-white border border-gray-200 text-[11px] font-medium rounded px-2 py-1 focus:ring-0 focus:border-purple-300 disabled:bg-gray-100"
                  value={yarn.preferredSupplierId ?? ""}
                  disabled={yarn.workflowStage !== "in_requisition" || loading}
                  onChange={(e) => void onVendorChange(yarn.id, e.target.value)}
                  aria-label={`Preferred vendor for ${yarn.yarnName}`}
                >
                  <option value="">Select vendor…</option>
                  {vendorsForCriticalRow(yarn, supplierOptions).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.brandName}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                {new Date(yarn.lastUpdated).toLocaleString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                <div className="inline-flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => onSendToDraft(yarn)}
                    disabled={loading || !canStageRow(yarn) || !yarn.preferredSupplierId}
                    title={
                      !yarn.preferredSupplierId
                        ? "Select a vendor for this row before sending to draft PO."
                        : undefined
                    }
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-purple-200 text-purple-700 text-[11px] font-bold rounded hover:bg-purple-50 transition-colors disabled:opacity-50"
                    aria-label={`Send ${yarn.yarnName} to PO draft`}
                  >
                    <i className="ri-draft-line text-sm" aria-hidden />
                    Send to draft PO
                  </button>
                  {canDismissRow(yarn) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Dismiss requirement for "${yarn.yarnName}"?`)) {
                          void onDismiss(yarn.id, yarn.yarnName);
                        }
                      }}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-red-100 text-red-700 text-[11px] font-bold rounded hover:bg-red-50 disabled:opacity-50"
                      aria-label={`Dismiss ${yarn.yarnName}`}
                    >
                      <i className="ri-delete-bin-line text-sm" aria-hidden />
                      Dismiss
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
