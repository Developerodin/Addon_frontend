"use client";

import Link from "next/link";
import React from "react";
import type { PendingRow, PoOption } from "./poReturnHelpers";
import { sumPendingNetKg } from "./poReturnHelpers";

type PoReturnWorkflowPanelProps = {
  poSearch: string;
  onPoSearchChange: (v: string) => void;
  poLoading: boolean;
  filteredPoOptions: PoOption[];
  selectedPo: PoOption | null;
  onSelectPo: (po: PoOption | null) => void;
  remark: string;
  onRemarkChange: (v: string) => void;
  sessionBusy: boolean;
  sessionId: string | null;
  onStartSession: () => void;
  onClearSessionLocal: () => void;
  barcodeInput: string;
  onBarcodeInputChange: (v: string) => void;
  onAddBarcode: () => void;
  pendingRows: PendingRow[];
  onRemoveRow: (barcode: string) => void;
  onFinalize: () => void;
};

/**
 * PO picker, session controls, scan table, and finalize action.
 */
export function PoReturnWorkflowPanel({
  poSearch,
  onPoSearchChange,
  poLoading,
  filteredPoOptions,
  selectedPo,
  onSelectPo,
  remark,
  onRemarkChange,
  sessionBusy,
  sessionId,
  onStartSession,
  onClearSessionLocal,
  barcodeInput,
  onBarcodeInputChange,
  onAddBarcode,
  pendingRows,
  onRemoveRow,
  onFinalize,
}: PoReturnWorkflowPanelProps) {
  const totalNetKg = sumPendingNetKg(pendingRows);

  return (
    <div className="space-y-4">
      <nav className="text-[11px] text-gray-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-1 items-center">
          <li>
            <Link href="/yarn-management" className="hover:text-purple-600">
              Yarn Management
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/yarn-management/purchase-management" className="hover:text-purple-600">
              Purchase Management
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-800 font-medium">PO Return</li>
        </ol>
      </nav>

      <div className="box border border-gray-100 shadow-sm">
        <div className="box-header border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <h1 className="text-sm font-bold text-gray-900">Scan-based vendor return</h1>
          <p className="text-[11px] text-gray-500 mt-1 max-w-3xl">
            Select a PO with received lots, start a session, scan <strong>short-term</strong> cones that
            match this PO. Cones are archived (returned to vendor), removed from storage slots, and excluded
            from active stock. Complete ERP cancellation separately when required.
          </p>
        </div>
        <div className="box-body px-4 py-4 space-y-4">
          <div className="space-y-1 max-w-xl">
            <label htmlFor="po-return-search" className="text-[11px] font-semibold text-gray-700">
              Find PO
            </label>
            <input
              id="po-return-search"
              type="search"
              value={poSearch}
              onChange={(e) => onPoSearchChange(e.target.value)}
              placeholder="Filter by PO number or supplier…"
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
            />
            <select
              id="po-return-select"
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs mt-1"
              value={selectedPo?.id ?? ""}
              onChange={(e) => {
                const opt = filteredPoOptions.find((p) => p.id === e.target.value);
                onSelectPo(opt ?? null);
              }}
              disabled={poLoading || filteredPoOptions.length === 0}
              aria-label="Purchase order"
            >
              <option value="">{poLoading ? "Loading…" : "Select a PO with received lots"}</option>
              {filteredPoOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.poNumber} — {p.supplierLabel} ({p.currentStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="po-return-remark" className="text-[11px] font-semibold text-gray-700">
              Remark (issue / reason)
            </label>
            <textarea
              id="po-return-remark"
              value={remark}
              onChange={(e) => onRemarkChange(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
              placeholder="e.g. shade mismatch — return to supplier"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => void onStartSession()}
              disabled={sessionBusy || !selectedPo || Boolean(sessionId)}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              Start session
            </button>
            {sessionId && (
              <button
                type="button"
                onClick={onClearSessionLocal}
                className="text-xs text-gray-600 underline"
              >
                Clear session
              </button>
            )}
          </div>

          {sessionId && (
            <div className="rounded-md border border-gray-100 p-3 space-y-3 bg-gray-50/50">
              <p className="text-[11px] text-gray-600 font-mono">Session: {sessionId}</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor="po-return-barcode" className="sr-only">
                    Cone barcode
                  </label>
                  <input
                    id="po-return-barcode"
                    value={barcodeInput}
                    onChange={(e) => onBarcodeInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onAddBarcode();
                      }
                    }}
                    placeholder="Scan or type cone barcode…"
                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void onAddBarcode()}
                  disabled={sessionBusy}
                  className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-semibold bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Add cone
                </button>
              </div>

              <div className="overflow-x-auto rounded border border-gray-100 bg-white">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-600">
                    <tr>
                      <th className="px-2 py-1.5">Barcode</th>
                      <th className="px-2 py-1.5">Yarn</th>
                      <th className="px-2 py-1.5">Lot</th>
                      <th className="px-2 py-1.5">Box</th>
                      <th className="px-2 py-1.5 text-right">Gross kg</th>
                      <th className="px-2 py-1.5 text-right">Net kg</th>
                      <th className="px-2 py-1.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-2 py-6 text-center text-gray-500">
                          No cones scanned yet.
                        </td>
                      </tr>
                    ) : (
                      pendingRows.map((r) => {
                        const net = Math.max(
                          0,
                          (Number(r.coneWeight) || 0) - (Number(r.tearWeight) || 0)
                        );
                        return (
                          <tr key={r.barcode} className="border-t border-gray-100">
                            <td className="px-2 py-1.5 font-mono">{r.barcode}</td>
                            <td className="px-2 py-1.5">{r.yarnName}</td>
                            <td className="px-2 py-1.5">{r.lotNumber}</td>
                            <td className="px-2 py-1.5 font-mono text-[10px]">{r.boxId}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{r.coneWeight}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{net.toFixed(3)}</td>
                            <td className="px-2 py-1.5 text-right">
                              <button
                                type="button"
                                className="text-red-600 font-semibold hover:underline"
                                onClick={() => void onRemoveRow(r.barcode)}
                                disabled={sessionBusy}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {pendingRows.length > 0 && (
                <p className="text-[11px] text-gray-700" aria-live="polite">
                  <span className="font-semibold">{pendingRows.length}</span> cone(s) ·{" "}
                  <span className="font-semibold tabular-nums">{totalNetKg.toFixed(3)}</span> kg net
                </p>
              )}

              <button
                type="button"
                onClick={() => void onFinalize()}
                disabled={sessionBusy || pendingRows.length === 0}
                className="inline-flex items-center px-4 py-2 rounded-md bg-red-600 text-white text-xs font-bold disabled:opacity-50"
              >
                Finalize vendor return
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
