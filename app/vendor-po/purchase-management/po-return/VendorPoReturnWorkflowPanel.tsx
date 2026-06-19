"use client";

import Link from "next/link";
import React from "react";
import type {
  VendorPoReturnArticleCandidate,
  VendorPoReturnArticleBox,
} from "@/shared/services/vendorPoReturnService";
import type { PendingArticleQtyRow, PendingBoxRow, VpoOption } from "./vendorPoReturnHelpers";
import { sumPendingReturnUnits } from "./vendorPoReturnHelpers";

type VendorPoReturnWorkflowPanelProps = {
  workflowError?: string | null;
  onDismissWorkflowError?: () => void;
  poSearch: string;
  onPoSearchChange: (v: string) => void;
  poLoading: boolean;
  filteredPoOptions: VpoOption[];
  selectedPo: VpoOption | null;
  onSelectPo: (po: VpoOption | null) => void;
  remark: string;
  onRemarkChange: (v: string) => void;
  cancellationIntent: "partial" | "full_vpo";
  onCancellationIntentChange: (v: "partial" | "full_vpo") => void;
  sessionBusy: boolean;
  sessionId: string | null;
  onStartSession: () => void;
  onClearSessionLocal: () => void;
  barcodeInput: string;
  onBarcodeInputChange: (v: string) => void;
  onAddBarcode: () => void;
  pendingBoxes: PendingBoxRow[];
  pendingArticleQtyLines: PendingArticleQtyRow[];
  onRemoveBox: (barcode: string) => void;
  onRemoveArticleQty: (flowId: string) => void;
  onFinalize: () => void;
  articleCandidates: VendorPoReturnArticleCandidate[];
  articleCandidatesLoading: boolean;
  articleDraftFlowId: string;
  onArticleDraftFlowIdChange: (v: string) => void;
  articleDraftQty: string;
  onArticleDraftQtyChange: (v: string) => void;
  onAddArticleQtyLine: () => void;
  articleBoxes: VendorPoReturnArticleBox[];
  articleBoxesLoading: boolean;
  stagedBarcodes: string[];
  onToggleArticleBox: (box: VendorPoReturnArticleBox, selected: boolean) => void;
};

/**
 * VPO picker, session controls, box scan table, M4 staging, and finalize.
 */
export function VendorPoReturnWorkflowPanel({
  workflowError,
  onDismissWorkflowError,
  poSearch,
  onPoSearchChange,
  poLoading,
  filteredPoOptions,
  selectedPo,
  onSelectPo,
  remark,
  onRemarkChange,
  cancellationIntent,
  onCancellationIntentChange,
  sessionBusy,
  sessionId,
  onStartSession,
  onClearSessionLocal,
  barcodeInput,
  onBarcodeInputChange,
  onAddBarcode,
  pendingBoxes,
  pendingArticleQtyLines,
  onRemoveBox,
  onRemoveArticleQty,
  onFinalize,
  articleCandidates,
  articleCandidatesLoading,
  articleDraftFlowId,
  onArticleDraftFlowIdChange,
  articleDraftQty,
  onArticleDraftQtyChange,
  onAddArticleQtyLine,
  articleBoxes,
  articleBoxesLoading,
  stagedBarcodes,
  onToggleArticleBox,
}: VendorPoReturnWorkflowPanelProps) {
  const totals = sumPendingReturnUnits(pendingBoxes, pendingArticleQtyLines);
  const canFinalize = pendingBoxes.length > 0 || pendingArticleQtyLines.length > 0;
  const selectedCandidate = articleCandidates.find((c) => c.flowId === articleDraftFlowId);
  const stagedBarcodeSet = new Set(stagedBarcodes);

  return (
    <div className="space-y-4">
      <nav className="text-[11px] text-gray-500" aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-1 items-center">
          <li>
            <Link href="/vendor-po" className="hover:text-purple-600">
              Vendor PO
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/vendor-po/purchase-management" className="hover:text-purple-600">
              Purchase Management
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-800 font-medium">PO Return</li>
        </ol>
      </nav>

      <div className="box border border-gray-100 shadow-sm">
        <div className="box-header border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <h1 className="text-sm font-bold text-gray-900">Return boxes or article quantity to vendor</h1>
          <p className="text-[11px] text-gray-500 mt-1 max-w-3xl">
            Select a vendor PO with received lots, start a session, scan garment boxes or enter
            article-wise verified quantity (M1+M2+M3+M4 from secondary checking). Finalize to issue
            a VPRC return challan.
          </p>
        </div>
        <div className="box-body px-4 py-4 space-y-4">
          <div className="space-y-1 max-w-xl">
            <label htmlFor="vpo-return-search" className="text-[11px] font-semibold text-gray-700">
              Find VPO
            </label>
            <input
              id="vpo-return-search"
              type="search"
              value={poSearch}
              onChange={(e) => onPoSearchChange(e.target.value)}
              placeholder="Filter by VPO number or vendor…"
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
            />
            <select
              id="vpo-return-select"
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs mt-1"
              value={selectedPo?.id ?? ""}
              onChange={(e) => {
                const opt = filteredPoOptions.find((p) => p.id === e.target.value);
                onSelectPo(opt ?? null);
              }}
              disabled={poLoading || filteredPoOptions.length === 0}
              aria-label="Vendor purchase order"
            >
              <option value="">{poLoading ? "Loading…" : "Select a VPO with received lots"}</option>
              {filteredPoOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.vpoNumber} — {p.vendorLabel} ({p.currentStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div className="space-y-1">
              <label htmlFor="vpo-return-remark" className="text-[11px] font-semibold text-gray-700">
                Remark (issue / reason)
              </label>
              <textarea
                id="vpo-return-remark"
                value={remark}
                onChange={(e) => onRemarkChange(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
                placeholder="e.g. shade mismatch — return to vendor"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="vpo-return-intent" className="text-[11px] font-semibold text-gray-700">
                Return intent
              </label>
              <select
                id="vpo-return-intent"
                value={cancellationIntent}
                onChange={(e) => onCancellationIntentChange(e.target.value as "partial" | "full_vpo")}
                className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-xs"
                aria-label="Return intent"
              >
                <option value="partial">Partial return</option>
                <option value="full_vpo">Full VPO return</option>
              </select>
            </div>
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
              <button type="button" onClick={onClearSessionLocal} className="text-xs text-gray-600 underline">
                Clear session
              </button>
            )}
          </div>

          {sessionId && (
            <div className="rounded-md border border-gray-100 p-3 space-y-4 bg-gray-50/50">
              <p className="text-[11px] text-gray-600 font-mono">Session: {sessionId}</p>
              {workflowError?.trim() && (
                <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                  {workflowError}
                  {onDismissWorkflowError && (
                    <button
                      type="button"
                      onClick={onDismissWorkflowError}
                      className="ml-2 underline text-red-700"
                      aria-label="Dismiss error"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="vpo-return-barcode" className="text-[11px] font-semibold text-gray-700">
                  Scan box barcode
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="vpo-return-barcode"
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => onBarcodeInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void onAddBarcode();
                      }
                    }}
                    placeholder="Scan or type box barcode"
                    className="flex-1 min-w-[200px] rounded-md border border-gray-200 px-3 py-1.5 text-xs font-mono"
                    aria-label="Box barcode"
                  />
                  <button
                    type="button"
                    onClick={() => void onAddBarcode()}
                    disabled={sessionBusy || !barcodeInput.trim()}
                    className="px-3 py-1.5 rounded-md bg-gray-900 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    Add box
                  </button>
                </div>
              </div>

              {pendingBoxes.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs" aria-label="Staged boxes">
                    <thead className="bg-white text-[10px] uppercase text-gray-600">
                      <tr>
                        <th className="px-2 py-1.5">Barcode</th>
                        <th className="px-2 py-1.5">Lot</th>
                        <th className="px-2 py-1.5">Product</th>
                        <th className="px-2 py-1.5">Vendor Code</th>
                        <th className="px-2 py-1.5 text-right">Units</th>
                        <th className="px-2 py-1.5 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingBoxes.map((row) => (
                        <tr key={row.barcode} className="border-t border-gray-100 bg-white">
                          <td className="px-2 py-1.5 font-mono">{row.barcode}</td>
                          <td className="px-2 py-1.5">{row.lotNumber || "—"}</td>
                          <td className="px-2 py-1.5">{row.productName || "—"}</td>
                          <td className="px-2 py-1.5">{row.vendorCode || "—"}</td>
                          <td className="px-2 py-1.5 text-right">{row.numberOfUnits ?? 0}</td>
                          <td className="px-2 py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => void onRemoveBox(row.barcode)}
                              className="text-red-600 underline text-[10px]"
                              aria-label={`Remove ${row.barcode}`}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <h3 className="text-[11px] font-bold text-gray-800">Article quantity return</h3>
                {articleCandidatesLoading ? (
                  <p className="text-[11px] text-gray-500">Loading articles…</p>
                ) : articleCandidates.length === 0 ? (
                  <p className="text-[11px] text-gray-500">No verified quantity available on this VPO.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1 min-w-[240px]">
                      <label htmlFor="article-flow-select" className="text-[10px] font-semibold text-gray-600">
                        Article
                      </label>
                      <select
                        id="article-flow-select"
                        value={articleDraftFlowId}
                        onChange={(e) => onArticleDraftFlowIdChange(e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                        aria-label="Article production flow"
                      >
                        <option value="">Select article</option>
                        {articleCandidates.map((c) => (
                          <option key={c.flowId} value={c.flowId}>
                            {c.productName || c.referenceCode} ({c.vendorCode}) — avail: {c.verifiedAvailable}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 w-24">
                      <label htmlFor="article-qty-input" className="text-[10px] font-semibold text-gray-600">
                        Qty
                      </label>
                      <input
                        id="article-qty-input"
                        type="number"
                        min={1}
                        max={selectedCandidate?.verifiedAvailable}
                        value={articleDraftQty}
                        onChange={(e) => onArticleDraftQtyChange(e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs"
                        aria-label="Article return quantity"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void onAddArticleQtyLine()}
                      disabled={sessionBusy || !articleDraftFlowId || !articleDraftQty.trim()}
                      className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
                    >
                      Stage qty
                    </button>
                  </div>
                )}
                {selectedCandidate && (
                  <p className="text-[10px] text-gray-500">
                    Available: {selectedCandidate.verifiedAvailable} (M1: {selectedCandidate.breakdown.m1}, M2:{" "}
                    {selectedCandidate.breakdown.m2}, M3: {selectedCandidate.breakdown.m3}, VM4:{" "}
                    {selectedCandidate.breakdown.m4})
                  </p>
                )}

                {articleDraftFlowId && (
                  <div className="mt-2 rounded-md border border-gray-200 bg-white p-2 space-y-2">
                    <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                      Select boxes to return
                    </h4>
                    {articleBoxesLoading ? (
                      <p className="text-[11px] text-gray-500">Loading boxes…</p>
                    ) : articleBoxes.length === 0 ? (
                      <p className="text-[11px] text-gray-500">No returnable boxes for this article.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs" aria-label="Article boxes">
                          <thead className="bg-gray-50 text-[10px] uppercase text-gray-600">
                            <tr>
                              <th className="px-2 py-1.5">Return</th>
                              <th className="px-2 py-1.5">Box Number</th>
                              <th className="px-2 py-1.5">Lot</th>
                              <th className="px-2 py-1.5 text-right">Box Weight (KG)</th>
                              <th className="px-2 py-1.5 text-right">Quantity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {articleBoxes.map((box) => {
                              const checked = stagedBarcodeSet.has(box.barcode);
                              return (
                                <tr key={box.barcode} className="border-t border-gray-100">
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={sessionBusy}
                                      onChange={(e) => onToggleArticleBox(box, e.target.checked)}
                                      aria-label={`Return box ${box.boxId}`}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 font-mono">{box.boxId}</td>
                                  <td className="px-2 py-1.5">{box.lotNumber || "—"}</td>
                                  <td className="px-2 py-1.5 text-right">{box.boxWeight || 0}</td>
                                  <td className="px-2 py-1.5 text-right">{box.numberOfUnits || 0}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {pendingArticleQtyLines.length > 0 && (
                  <div className="overflow-x-auto mt-2">
                    <table className="min-w-full text-left text-xs" aria-label="Staged article quantity lines">
                      <thead className="bg-white text-[10px] uppercase text-gray-600">
                        <tr>
                          <th className="px-2 py-1.5">Article</th>
                          <th className="px-2 py-1.5">Vendor Code</th>
                          <th className="px-2 py-1.5">Lot</th>
                          <th className="px-2 py-1.5 text-right">Qty</th>
                          <th className="px-2 py-1.5 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingArticleQtyLines.map((row) => (
                          <tr key={row.vendorProductionFlowId} className="border-t border-gray-100 bg-white">
                            <td className="px-2 py-1.5">{row.productName || row.referenceCode || "—"}</td>
                            <td className="px-2 py-1.5">{row.vendorCode || "—"}</td>
                            <td className="px-2 py-1.5">{row.lotNumber || "—"}</td>
                            <td className="px-2 py-1.5 text-right">{row.quantity}</td>
                            <td className="px-2 py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => void onRemoveArticleQty(row.vendorProductionFlowId)}
                                className="text-red-600 underline text-[10px]"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200">
                <p className="text-[11px] text-gray-600">
                  Staged: <strong>{totals.boxCount}</strong> box(es),{" "}
                  <strong>{totals.boxUnits}</strong> box units, <strong>{totals.articleQtyUnits}</strong> article
                  units
                </p>
                <button
                  type="button"
                  onClick={() => void onFinalize()}
                  disabled={sessionBusy || !canFinalize}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  Finalize &amp; issue challan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
