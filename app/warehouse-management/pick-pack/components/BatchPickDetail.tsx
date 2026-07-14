"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  whmsPickListBatches,
  type PickListBatchDetail,
  type PickListBatchItem,
} from "@/shared/services/whmsPickListBatchService";
import { printBatchBarcodes, printStyleBatchBarcodes } from "./BatchBarcodePrint";
import { printBatchPickList } from "./batchPickListPrint";
import BatchBarcodePrintModal, { type BarcodePrintMode } from "./BatchBarcodePrintModal";

function itemStatusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-orange-50 text-orange-700 border-orange-200",
    picked: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const cls = map[status] || map.pending;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${cls}`}>
      {status}
    </span>
  );
}

export interface BatchPickDetailProps {
  batch: PickListBatchDetail;
  onBatchUpdated: (batch: PickListBatchDetail) => void;
}

/**
 * Inner page for pick-list batch: enter picks, print barcodes, send to scanning.
 */
export default function BatchPickDetail({ batch, onBatchUpdated }: BatchPickDetailProps) {
  const router = useRouter();
  const [pickerName, setPickerName] = useState(batch.pickerName || "");
  const [draftPicks, setDraftPicks] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    (batch.items || []).forEach((i) => {
      init[i.itemKey] = i.pickedQty;
    });
    return init;
  });
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeModalStyle, setBarcodeModalStyle] = useState<string | undefined>(undefined);
  const [barcodePrintBusy, setBarcodePrintBusy] = useState(false);
  const [pickErrors, setPickErrors] = useState<Record<string, string>>({});

  const isEditable = batch.status === "picking";
  const totalPicked = useMemo(
    () => Object.values(draftPicks).reduce((s, n) => s + (Number(n) || 0), 0),
    [draftPicks],
  );

  const barcodeModalMaxQty = useMemo(() => {
    if (barcodeModalStyle) {
      const item = (batch.items || []).find((i) => i.styleCode === barcodeModalStyle);
      return Number(draftPicks[item?.itemKey ?? ""] ?? item?.pickedQty ?? 0);
    }
    return totalPicked;
  }, [barcodeModalStyle, batch.items, draftPicks, totalPicked]);

  const openBarcodeModal = (styleCode?: string) => {
    setBarcodeModalStyle(styleCode);
    setBarcodeModalOpen(true);
  };

  const handleBarcodePrintConfirm = async (mode: BarcodePrintMode, customQty?: number) => {
    setBarcodePrintBusy(true);
    try {
      if (barcodeModalStyle) {
        await printStyleBatchBarcodes(batch.id, barcodeModalStyle, mode, customQty);
      } else {
        await printBatchBarcodes(batch.id, mode, customQty);
      }
      setBarcodeModalOpen(false);
    } finally {
      setBarcodePrintBusy(false);
    }
  };

  const handlePickChange = (itemKey: string, rawValue: string, max: number, styleCode: string) => {
    const trimmed = rawValue.trim();
    if (trimmed === "") {
      setDraftPicks((prev) => ({ ...prev, [itemKey]: 0 }));
      setPickErrors((prev) => {
        const next = { ...prev };
        delete next[itemKey];
        return next;
      });
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setPickErrors((prev) => ({
        ...prev,
        [itemKey]: "Enter a valid quantity (0 or more)",
      }));
      return;
    }

    const rounded = Math.floor(parsed);
    if (rounded > max) {
      setPickErrors((prev) => ({
        ...prev,
        [itemKey]: `Cannot exceed required qty (${max})`,
      }));
      setDraftPicks((prev) => ({ ...prev, [itemKey]: max }));
      toast.error(`Max picked qty for ${styleCode} is ${max}`);
      return;
    }

    setPickErrors((prev) => {
      const next = { ...prev };
      delete next[itemKey];
      return next;
    });
    setDraftPicks((prev) => ({ ...prev, [itemKey]: rounded }));
  };

  /** Validate all draft picks before save; returns false if any exceed required. */
  const validateDraftPicks = (): boolean => {
    const errors: Record<string, string> = {};
    for (const item of batch.items || []) {
      const picked = Number(draftPicks[item.itemKey] ?? item.pickedQty ?? 0);
      const max = Number(item.requiredQty || 0);
      if (picked > max) {
        errors[item.itemKey] = `Cannot exceed required qty (${max})`;
      }
    }
    setPickErrors(errors);
    if (Object.keys(errors).length) {
      toast.error("Fix picked quantities — none can exceed required qty");
      return false;
    }
    return true;
  };

  const handleSavePicks = useCallback(async () => {
    if (!validateDraftPicks()) return;
    setBusy(true);
    try {
      const picks = Object.entries(draftPicks).map(([itemKey, pickedQty]) => ({
        itemKey,
        pickedQty: Number(pickedQty) || 0,
      }));
      const updated = await whmsPickListBatches.savePicks(batch.id, picks);
      onBatchUpdated(updated);
      toast.success("Pick quantities saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save picks");
    } finally {
      setBusy(false);
    }
  }, [batch.id, draftPicks, onBatchUpdated, batch.items]);

  const handleSavePicker = async () => {
    const name = pickerName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await whmsPickListBatches.setPicker(batch.id, name);
      toast.success("Picker name saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save picker");
    } finally {
      setBusy(false);
    }
  };

  const handleSendToScanning = async () => {
    if (!validateDraftPicks()) return;
    if (!window.confirm("Save picks and send this pick list to the scanning team?")) return;
    setBusy(true);
    try {
      const picks = Object.entries(draftPicks).map(([itemKey, pickedQty]) => ({
        itemKey,
        pickedQty: Number(pickedQty) || 0,
      }));
      await whmsPickListBatches.savePicks(batch.id, picks);
      await whmsPickListBatches.sendToScanning(batch.id);
      toast.success("Sent to scanning");
      router.push("/warehouse-management/scanning");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send to scanning");
    } finally {
      setBusy(false);
    }
  };

  const renderAllocationBreakdown = (item: PickListBatchItem) => (
    <ul className="text-[11px] text-gray-600 space-y-0.5 mt-2 pl-2 border-l-2 border-purple-100">
      {(item.allocations || []).map((a) => (
        <li key={`${a.orderId}-${a.pickListId}`}>
          <span className="font-semibold text-gray-800">{a.orderNumber || a.orderId}</span>: req{" "}
          {a.requiredQty}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/warehouse-management/pick-pack"
            className="text-[11px] text-purple-600 hover:underline font-medium inline-flex items-center gap-1 mb-2"
          >
            <i className="ri-arrow-left-line" aria-hidden /> Back to pick lists
          </Link>
          <h1 className="text-lg font-bold text-gray-900">{batch.batchNumber}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                batch.type === "combined" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"
              }`}
            >
              {batch.type === "combined" ? "Combined order pick list" : "Single order pick list"}
            </span>
            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
              {batch.status.replace(/-/g, " ")}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {(batch.orderNumbers || []).map((num) => (
              <span
                key={num}
                className="inline-flex px-2 py-1 rounded-full bg-purple-50 text-purple-800 text-[11px] font-semibold border border-purple-100"
              >
                {num}
              </span>
            ))}
          </div>
        </div>

        {isEditable && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => printBatchPickList(batch)}
              disabled={busy}
              className="px-3 py-1.5 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 disabled:opacity-40 flex items-center gap-1.5"
              aria-label="Print pick list for warehouse"
            >
              <i className="ri-printer-line" aria-hidden />
              Print Pick List
            </button>
            <label htmlFor="picker-name" className="sr-only">
              Picker name
            </label>
            <input
              id="picker-name"
              type="text"
              value={pickerName}
              onChange={(e) => setPickerName(e.target.value)}
              placeholder="Picker name"
              className="border border-gray-200 rounded px-3 py-1.5 text-sm min-w-[160px]"
            />
            <button
              type="button"
              onClick={() => void handleSavePicker()}
              disabled={busy || !pickerName.trim()}
              className="px-3 py-1.5 text-[11px] font-bold border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              Save picker
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">Style code</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">Size / Shade</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">Required</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">Stock</th>
              <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">Picked</th>
              <th className="px-3 py-2 text-left text-[11px] font-bold text-gray-600 uppercase">Status</th>
              {isEditable && (
                <th className="px-3 py-2 text-right text-[11px] font-bold text-gray-600 uppercase">Print</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(batch.items || []).map((item) => {
              const picked = draftPicks[item.itemKey] ?? item.pickedQty;
              const isExpanded = expandedKey === item.itemKey;
              const status =
                picked <= 0 ? "pending" : picked < item.requiredQty ? "partial" : "picked";
              return (
                <React.Fragment key={item.itemKey}>
                  <tr
                    className="border-t border-gray-100 hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => setExpandedKey(isExpanded ? null : item.itemKey)}
                  >
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{item.styleCode}</td>
                    <td className="px-3 py-2.5 text-[12px] text-gray-600">
                      {[item.size, item.shade].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{item.requiredQty}</td>
                    <td className="px-3 py-2.5 text-right text-gray-500">{item.availableStock ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {isEditable ? (
                        <div className="inline-flex flex-col items-end gap-0.5">
                          <input
                            type="number"
                            min={0}
                            max={item.requiredQty}
                            step={1}
                            value={picked}
                            onChange={(e) =>
                              handlePickChange(
                                item.itemKey,
                                e.target.value,
                                item.requiredQty,
                                item.styleCode,
                              )
                            }
                            onBlur={(e) =>
                              handlePickChange(
                                item.itemKey,
                                e.target.value,
                                item.requiredQty,
                                item.styleCode,
                              )
                            }
                            className={`w-20 border rounded px-2 py-1 text-right text-sm ${
                              pickErrors[item.itemKey]
                                ? "border-red-400 bg-red-50 focus:ring-red-300"
                                : "border-gray-200"
                            }`}
                            aria-label={`Picked quantity for ${item.styleCode}`}
                            aria-invalid={Boolean(pickErrors[item.itemKey])}
                            aria-describedby={
                              pickErrors[item.itemKey] ? `pick-error-${item.itemKey}` : undefined
                            }
                          />
                          {pickErrors[item.itemKey] ? (
                            <span
                              id={`pick-error-${item.itemKey}`}
                              className="text-[10px] font-semibold text-red-600 max-w-[120px] text-right"
                            >
                              {pickErrors[item.itemKey]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Max {item.requiredQty}</span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{item.pickedQty}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{itemStatusBadge(status)}</td>
                    {isEditable && (
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={picked <= 0 || busy}
                          onClick={() => openBarcodeModal(item.styleCode)}
                          className="text-[11px] font-bold text-purple-600 hover:text-purple-800 disabled:opacity-40"
                        >
                          Print
                        </button>
                      </td>
                    )}
                  </tr>
                  {isExpanded && batch.type === "combined" && (
                    <tr className="bg-purple-50/30">
                      <td colSpan={isEditable ? 7 : 6} className="px-3 py-2">
                        {renderAllocationBreakdown(item)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {isEditable && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => printBatchPickList(batch)}
            disabled={busy}
            className="px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5"
            aria-label="Print pick list for warehouse picking"
          >
            <i className="ri-printer-line" aria-hidden />
            Print Pick List
          </button>
          <button
            type="button"
            onClick={() => void handleSavePicks()}
            disabled={busy}
            className="px-4 py-2 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 disabled:opacity-50"
          >
            Save Picks
          </button>
          <button
            type="button"
            onClick={() => openBarcodeModal()}
            disabled={busy || totalPicked <= 0}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5"
          >
            <i className="ri-barcode-line" aria-hidden />
            Print Barcodes
          </button>
          <button
            type="button"
            onClick={() => void handleSendToScanning()}
            disabled={busy || totalPicked <= 0}
            className="px-4 py-2 bg-indigo-600 text-white text-[11px] font-bold rounded hover:bg-indigo-700 disabled:opacity-40"
          >
            Send to Scanning
          </button>

        </div>
      )}

      <BatchBarcodePrintModal
        open={barcodeModalOpen}
        batchNumber={batch.batchNumber}
        styleCode={barcodeModalStyle}
        maxQty={barcodeModalMaxQty}
        busy={barcodePrintBusy}
        onClose={() => setBarcodeModalOpen(false)}
        onConfirm={handleBarcodePrintConfirm}
      />

      {!isEditable && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => printBatchPickList(batch)}
            className="px-4 py-2 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 flex items-center gap-1.5"
            aria-label="Reprint pick list"
          >
            <i className="ri-printer-line" aria-hidden />
            Print Pick List
          </button>
        </div>
      )}

      {batch.status === "sent-to-scanning" && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-900">
          This pick list has been sent to scanning.{" "}
          <Link href="/warehouse-management/scanning" className="font-bold underline">
            Open scanning queue
          </Link>
        </div>
      )}
    </div>
  );
}
