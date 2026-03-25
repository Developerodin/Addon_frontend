"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { FileUploadService } from "@/shared/services/fileUploadService";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import type { VendorPackListEntry } from "@/shared/services/vendorPurchaseOrderService";
import {
  defaultRow,
  normalizeExistingPacklist,
  type PacklistRow,
} from "./vendorPacklistHelpers";
import { VendorPacklistOrderSummary } from "./VendorPacklistOrderSummary";
import { VendorPacklistShipmentRow } from "./VendorPacklistShipmentRow";

export interface VendorPacklistModalProps {
  isOpen: boolean;
  purchaseOrder: VendorPurchaseOrder | null;
  existingPacklistData?: VendorPackListEntry | VendorPackListEntry[] | null;
  /** ISO or date-only string from list row when API omits `createdAt` on the PO document. */
  orderDateFallback?: string;
  onClose: () => void;
  onSubmit: (entries: VendorPackListEntry[]) => void | Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Yarn-style packlist: right slide-over, multiple entries, PO line checkboxes, file uploads.
 */
export function VendorPacklistModal({
  isOpen,
  purchaseOrder,
  existingPacklistData,
  orderDateFallback,
  onClose,
  onSubmit,
  isSubmitting = false,
}: VendorPacklistModalProps) {
  const [rows, setRows] = useState<PacklistRow[]>([defaultRow(null)]);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !purchaseOrder) return;
    const normalized = normalizeExistingPacklist(existingPacklistData, purchaseOrder);
    setRows(
      normalized.length > 0
        ? normalized.map((r) => ({ ...r, files: r.files || [] }))
        : [defaultRow(purchaseOrder)]
    );
  }, [isOpen, purchaseOrder, existingPacklistData]);

  if (!isOpen) return null;

  const po = purchaseOrder;
  if (!po) return null;

  const setField = (index: number, patch: Partial<PacklistRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const togglePoItem = (index: number, lineId: string, checked: boolean) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const cur = row.poItems || [];
        const next = checked ? [...cur, lineId] : cur.filter((id) => id !== lineId);
        return { ...row, poItems: next };
      })
    );
  };

  const addRow = () => setRows((prev) => [...prev, defaultRow(po)]);

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      toast.error("At least one packlist entry is required");
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (entryIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const key = `${entryIndex}-${Date.now()}`;
    setUploadingFiles((u) => ({ ...u, [key]: true }));
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const u = await FileUploadService.uploadFile(file);
          return {
            url: u.url,
            key: u.key,
            originalName: u.originalName,
            mimeType: u.mimeType,
            size: u.size,
          };
        })
      );
      setRows((prev) =>
        prev.map((row, i) =>
          i === entryIndex ? { ...row, files: [...(row.files || []), ...uploaded] } : row
        )
      );
      toast.success(`${uploaded.length} file(s) uploaded`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingFiles((u) => {
        const n = { ...u };
        delete n[key];
        return n;
      });
      event.target.value = "";
    }
  };

  const removeFile = (entryIndex: number, fileKey: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === entryIndex ? { ...row, files: (row.files || []).filter((f) => f.key !== fileKey) } : row
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.packingNumber?.trim()) {
        toast.error(`Packing number is required for entry ${i + 1}`);
        return;
      }
      if (!r.courierName?.trim()) {
        toast.error(`Courier name is required for entry ${i + 1}`);
        return;
      }
      if (!r.dispatchDate) {
        toast.error(`Dispatch date is required for entry ${i + 1}`);
        return;
      }
      if (!r.estimatedDeliveryDate) {
        toast.error(`Estimated delivery date is required for entry ${i + 1}`);
        return;
      }
      if (!r.numberOfBoxes || r.numberOfBoxes < 1) {
        toast.error(`Number of boxes must be greater than 0 for entry ${i + 1}`);
        return;
      }
      if (!r.totalWeight || r.totalWeight <= 0) {
        toast.error(`Total weight must be greater than 0 for entry ${i + 1}`);
        return;
      }
      if (!r.poItems?.length) {
        toast.error(`Select at least one PO line for entry ${i + 1}`);
        return;
      }
    }

    const payload: VendorPackListEntry[] = rows.map((r) => ({
      packingNumber: r.packingNumber,
      courierName: r.courierName,
      courierNumber: r.courierNumber || "",
      vehicleNumber: r.vehicleNumber || "",
      challanNumber: r.challanNumber || "",
      dispatchDate: r.dispatchDate,
      estimatedDeliveryDate: r.estimatedDeliveryDate,
      numberOfBoxes: Number(r.numberOfBoxes),
      totalWeight: Number(r.totalWeight),
      notes: r.notes || "",
      poItems: r.poItems || [],
      files: r.files || [],
    }));

    await onSubmit(payload);
  };

  const footerLabel =
    po.currentStatus === "submitted_to_vendor" ? "Update to in transit" : "Update packlist";

  const anyUploading = Object.values(uploadingFiles).some(Boolean);

  return (
    <div className={`fixed inset-0 z-[60] overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}>
      <div
        className={`fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="bg-primary text-white px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Mark order as in transit</h3>
                <p className="text-xs text-white/80 mt-0.5">{po.vpoNumber}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
                disabled={isSubmitting}
                aria-label="Close"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            <VendorPacklistOrderSummary po={po} orderDateFallback={orderDateFallback} />
            <p className="text-xs text-gray-600 mb-3">
              One row per shipment. Each row needs packing ref, courier, dates, weights, and which PO lines ship together.
            </p>
            <div className="space-y-4">
              {rows.map((entry, entryIndex) => (
                <VendorPacklistShipmentRow
                  key={entryIndex}
                  entryIndex={entryIndex}
                  entry={entry}
                  po={po}
                  canRemove={rows.length > 1}
                  isSubmitting={isSubmitting}
                  uploading={anyUploading}
                  onRemove={() => removeRow(entryIndex)}
                  onFieldChange={(patch) => setField(entryIndex, patch)}
                  onPoItemToggle={(lineId, checked) => togglePoItem(entryIndex, lineId, checked)}
                  onFileChange={(e) => void handleFileUpload(entryIndex, e)}
                  onFileRemove={(fileKey) => removeFile(entryIndex, fileKey)}
                />
              ))}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-600 text-[11px] font-bold rounded border border-purple-200 hover:bg-purple-50 transition-colors shadow-sm"
                  disabled={isSubmitting}
                >
                  <i className="ri-add-line text-xs" />
                  Add another entry
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 flex-shrink-0 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs" />
                  Updating…
                </>
              ) : (
                <>
                  <i className="ri-check-line text-xs" />
                  {footerLabel}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
