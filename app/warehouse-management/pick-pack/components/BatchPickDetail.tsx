"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  whmsPickListBatches,
  type PickListBatchDetail,
} from "@/shared/services/whmsPickListBatchService";
import { printBatchBarcodes } from "./BatchBarcodePrint";
import { printBatchPickList } from "./batchPickListPrint";
import BatchBarcodePrintModal, {
  type BarcodePrintMode,
  type BatchBarcodeStyleOption,
} from "./BatchBarcodePrintModal";
import BarcodePrintHistory from "./BarcodePrintHistory";
import BatchPickListPanel from "./BatchPickListPanel";

type BatchDetailTab = "picking" | "barcode-history";

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
  const [barcodeAllowStyleSelection, setBarcodeAllowStyleSelection] = useState(false);
  const [barcodePrintBusy, setBarcodePrintBusy] = useState(false);
  const [pickErrors, setPickErrors] = useState<Record<string, string>>({});
  const [savingPicks, setSavingPicks] = useState(false);
  const [activeTab, setActiveTab] = useState<BatchDetailTab>("picking");

  const isEditable = batch.status === "picking";
  const totalPicked = useMemo(
    () => Object.values(draftPicks).reduce((s, n) => s + (Number(n) || 0), 0),
    [draftPicks],
  );

  const hasUnsavedPicks = useMemo(
    () =>
      (batch.items || []).some((item) => {
        const draft = Number(draftPicks[item.itemKey] ?? item.pickedQty ?? 0);
        const saved = Number(item.pickedQty ?? 0);
        return draft !== saved;
      }),
    [batch.items, draftPicks],
  );

  const savedPickerName = (batch.pickerName || "").trim();
  const hasUnsavedPickerName = pickerName.trim() !== savedPickerName;
  const canPrintPickList = Boolean(savedPickerName) && !hasUnsavedPickerName;

  const styleOptions = useMemo<BatchBarcodeStyleOption[]>(
    () =>
      (batch.items || []).map((item) => ({
        styleCode: item.styleCode,
        size: item.size,
        shade: item.shade,
        pickedQty: Number(draftPicks[item.itemKey] ?? item.pickedQty ?? 0),
      })),
    [batch.items, draftPicks],
  );

  const printedQtyByStyle = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of batch.barcodePrintHistory || []) {
      if (entry.styleCode) {
        map.set(entry.styleCode, (map.get(entry.styleCode) || 0) + Number(entry.quantity || 0));
      } else {
        for (const label of entry.labels || []) {
          if (!label.styleCode) continue;
          map.set(label.styleCode, (map.get(label.styleCode) || 0) + Number(label.quantity || 0));
        }
      }
    }
    return map;
  }, [batch.barcodePrintHistory]);

  const barcodeModalMaxQty = useMemo(() => {
    if (barcodeModalStyle) {
      const item = (batch.items || []).find((i) => i.styleCode === barcodeModalStyle);
      return Number(draftPicks[item?.itemKey ?? ""] ?? item?.pickedQty ?? 0);
    }
    return totalPicked;
  }, [barcodeModalStyle, batch.items, draftPicks, totalPicked]);

  const openBarcodeModal = (styleCode?: string) => {
    if (hasUnsavedPicks) {
      toast.error("Save picks before printing barcodes");
      return;
    }
    setBarcodeModalStyle(styleCode);
    setBarcodeAllowStyleSelection(!styleCode);
    setBarcodeModalOpen(true);
  };

  const handleBarcodePrintConfirm = async (
    mode: BarcodePrintMode,
    customQty?: number,
    selectedStyleCode?: string,
  ) => {
    setBarcodePrintBusy(true);
    try {
      const result = await printBatchBarcodes(batch.id, mode, customQty, selectedStyleCode);
      if (!result) return;

      const refreshed = await whmsPickListBatches.get(batch.id);
      onBatchUpdated(refreshed);
      toast.success(
        `Printed ${result.quantity} barcode label${result.quantity === 1 ? "" : "s"}${
          selectedStyleCode ? ` for ${selectedStyleCode}` : ""
        }`,
      );
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
    setSavingPicks(true);
    setBusy(true);
    try {
      const picks = Object.entries(draftPicks).map(([itemKey, pickedQty]) => ({
        itemKey,
        pickedQty: Number(pickedQty) || 0,
      }));
      const updated = await whmsPickListBatches.savePicks(batch.id, picks);
      onBatchUpdated(updated);
      const synced: Record<string, number> = {};
      (updated.items || []).forEach((item) => {
        synced[item.itemKey] = item.pickedQty;
      });
      setDraftPicks(synced);
      toast.success("Pick quantities saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save picks");
    } finally {
      setSavingPicks(false);
      setBusy(false);
    }
  }, [batch.id, draftPicks, onBatchUpdated, batch.items]);

  const handleSavePicker = async () => {
    const name = pickerName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await whmsPickListBatches.setPicker(batch.id, name);
      const refreshed = await whmsPickListBatches.get(batch.id);
      onBatchUpdated(refreshed);
      setPickerName(refreshed.pickerName || name);
      toast.success("Picker name saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save picker");
    } finally {
      setBusy(false);
    }
  };

  const handlePrintPickList = () => {
    if (isEditable && !canPrintPickList) {
      toast.error(
        savedPickerName
          ? "Save picker name before printing the pick list"
          : "Enter and save picker name before printing the pick list",
      );
      return;
    }
    printBatchPickList(batch);
  };

  const handleSendToScanning = async () => {
    if (hasUnsavedPicks) {
      toast.error("Save picks before sending to scanning");
      return;
    }
    if (!validateDraftPicks()) return;
    if (!window.confirm("Send this pick list to the scanning team?")) return;
    setBusy(true);
    try {
      await whmsPickListBatches.sendToScanning(batch.id);
      toast.success("Sent to scanning");
      router.push("/warehouse-management/scanning");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send to scanning");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href="/warehouse-management/pick-pack"
              className="text-[11px] text-purple-600 hover:underline font-medium inline-flex items-center gap-0.5 shrink-0"
            >
              <i className="ri-arrow-left-line" aria-hidden /> Back
            </Link>
            <span className="text-gray-300 hidden sm:inline" aria-hidden>
              |
            </span>
            <h1 className="text-base font-bold text-gray-900 truncate">{batch.batchNumber}</h1>
            <span
              className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                batch.type === "combined" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"
              }`}
            >
              {batch.type === "combined" ? "Combined" : "Single"}
            </span>
            <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gray-100 text-gray-700 shrink-0">
              {batch.status.replace(/-/g, " ")}
            </span>
          </div>
          {(batch.orderNumbers || []).length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <span className="text-[10px] font-semibold text-gray-500 uppercase shrink-0">Orders:</span>
              {(batch.orderNumbers || []).map((num) => (
                <span
                  key={num}
                  className="inline-flex px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] font-semibold border border-purple-100"
                >
                  {num}
                </span>
              ))}
            </div>
          )}
        </div>

      <div
        className="flex gap-2 border-b border-gray-100 pb-2"
        role="tablist"
        aria-label="Pick list batch views"
      >
        <button
          type="button"
          role="tab"
          id="batch-tab-picking"
          aria-selected={activeTab === "picking"}
          aria-controls="batch-panel-picking"
          onClick={() => setActiveTab("picking")}
          className={`px-3 py-1.5 text-[12px] font-semibold rounded ${
            activeTab === "picking" ? "bg-violet-100 text-violet-800" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Pick list
        </button>
        <button
          type="button"
          role="tab"
          id="batch-tab-barcode-history"
          aria-selected={activeTab === "barcode-history"}
          aria-controls="batch-panel-barcode-history"
          onClick={() => setActiveTab("barcode-history")}
          className={`px-3 py-1.5 text-[12px] font-semibold rounded ${
            activeTab === "barcode-history"
              ? "bg-violet-100 text-violet-800"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Barcode print history
        </button>
      </div>

      <div
        role="tabpanel"
        id="batch-panel-picking"
        aria-labelledby="batch-tab-picking"
        hidden={activeTab !== "picking"}
      >
        {activeTab === "picking" && (
          <BatchPickListPanel
            batch={batch}
            isEditable={isEditable}
            draftPicks={draftPicks}
            pickErrors={pickErrors}
            expandedKey={expandedKey}
            setExpandedKey={setExpandedKey}
            printedQtyByStyle={printedQtyByStyle}
            busy={busy}
            savingPicks={savingPicks}
            totalPicked={totalPicked}
            hasUnsavedPicks={hasUnsavedPicks}
            canPrintPickList={canPrintPickList}
            pickerName={pickerName}
            hasUnsavedPickerName={hasUnsavedPickerName}
            onPickChange={handlePickChange}
            onSavePicks={() => void handleSavePicks()}
            onSavePicker={() => void handleSavePicker()}
            onPickerNameChange={setPickerName}
            onSendToScanning={() => void handleSendToScanning()}
            onOpenBarcodeModal={openBarcodeModal}
            onPrintPickList={handlePrintPickList}
          />
        )}
      </div>

      <div
        role="tabpanel"
        id="batch-panel-barcode-history"
        aria-labelledby="batch-tab-barcode-history"
        hidden={activeTab !== "barcode-history"}
      >
        {activeTab === "barcode-history" && (
          <BarcodePrintHistory
            history={batch.barcodePrintHistory}
            summary={batch.barcodePrintSummary}
          />
        )}
      </div>

      <BatchBarcodePrintModal
        open={barcodeModalOpen}
        batchNumber={batch.batchNumber}
        styleCode={barcodeModalStyle}
        styleOptions={styleOptions}
        allowStyleSelection={barcodeAllowStyleSelection}
        maxQty={barcodeModalMaxQty}
        busy={barcodePrintBusy}
        onClose={() => setBarcodeModalOpen(false)}
        onConfirm={handleBarcodePrintConfirm}
      />

    </div>
  );
}
