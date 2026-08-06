"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import BarcodeScanner from "../BarcodeScanner";
import yarnBoxService from "@/shared/services/yarnBoxService";
import yarnConeService from "@/shared/services/yarnConeService";

export type RelocateKind = "box" | "cone";

interface RelocateModalProps {
  isOpen: boolean;
  kind: RelocateKind;
  /** Box business id (BOX-...) or cone Mongo id */
  itemId: string;
  /** Display / API barcode */
  itemBarcode: string;
  fromLocation: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

/**
 * Lightweight modal: scan destination rack and relocate a stored box or cone.
 */
const RelocateModal: React.FC<RelocateModalProps> = ({
  isOpen,
  kind,
  itemId,
  itemBarcode,
  fromLocation,
  onClose,
  onSuccess,
}) => {
  const [destRack, setDestRack] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  /**
   * Capture scanned destination rack barcode.
   * @param barcode - Slot barcode
   */
  const handleRackScan = async (barcode: string): Promise<boolean> => {
    const trimmed = barcode.trim();
    if (!trimmed) {
      toast.error("Please scan a destination rack barcode");
      return false;
    }
    if (trimmed === fromLocation.trim()) {
      toast.error("Destination must be a different rack");
      return false;
    }
    setDestRack(trimmed);
    toast.success(`Destination: ${trimmed}`);
    return true;
  };

  /**
   * Submit relocate API for the current item.
   */
  const handleConfirm = async () => {
    const toStorageLocation = destRack.trim();
    if (!toStorageLocation) {
      toast.error("Scan a destination rack first");
      return;
    }
    if (toStorageLocation === fromLocation.trim()) {
      toast.error("Destination must be a different rack");
      return;
    }

    setIsSubmitting(true);
    try {
      if (kind === "box") {
        await yarnBoxService.transferBoxes({
          boxIds: [itemId],
          toStorageLocation,
        });
      } else {
        await yarnConeService.relocateCone({
          coneId: itemId || undefined,
          coneBarcode: itemBarcode || undefined,
          toStorageLocation,
        });
      }
      toast.success(`Relocated from ${fromLocation} to ${toStorageLocation}`);
      setDestRack("");
      await onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Relocate failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Close modal and clear local state.
   */
  const handleClose = () => {
    if (isSubmitting) return;
    setDestRack("");
    onClose();
  };

  const title = kind === "box" ? "Relocate box" : "Relocate cone";
  const itemLabel = kind === "box" ? itemId : itemBarcode;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="relocate-modal-title"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 id="relocate-modal-title" className="text-sm font-bold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="ti-btn ti-btn-light ti-btn-sm"
            aria-label="Close relocate modal"
            disabled={isSubmitting}
          >
            <i className="ri-close-line" aria-hidden />
          </button>
        </div>

        <div className="text-xs space-y-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p>
            <span className="text-gray-500">Item:</span>{" "}
            <span className="font-mono font-medium text-gray-900">{itemLabel}</span>
          </p>
          <p>
            <span className="text-gray-500">From rack:</span>{" "}
            <span className="font-mono font-medium text-gray-900">{fromLocation}</span>
          </p>
          <p>
            <span className="text-gray-500">To rack:</span>{" "}
            <span className="font-mono font-medium text-gray-900">
              {destRack || "— scan below —"}
            </span>
          </p>
        </div>

        <BarcodeScanner
          label="Destination rack barcode"
          placeholder="Scan or enter destination rack"
          onScan={handleRackScan}
          disabled={isSubmitting}
          invalidMessage="Invalid destination rack"
          autoFocus
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ti-btn ti-btn-light text-xs"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary text-xs"
            onClick={handleConfirm}
            disabled={isSubmitting || !destRack}
            aria-label={`Confirm relocate ${kind}`}
          >
            {isSubmitting ? "Relocating…" : "Confirm relocate"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelocateModal;
